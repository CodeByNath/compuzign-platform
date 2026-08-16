<?php

/*
 * FILE INDEX
 *
 * MANAGER_SHAPE          Defaults and persisted manager sanitization
 * MANAGER_COMMIT         Configuration validation and commit projection
 * SOURCE_RECONCILIATION  Pool source resolution and item reconciliation
 * MANAGER_READ_MODEL     Provenance, health, and consumer projections
 * RATE_SHEET_PROJECTION  Tier Rate Sheet reference projection
 *
 * Search: SECTION: MANAGER_SHAPE
 *         SECTION: MANAGER_COMMIT
 *         SECTION: SOURCE_RECONCILIATION
 *         SECTION: MANAGER_READ_MODEL
 *         SECTION: RATE_SHEET_PROJECTION
 */

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;

/**
 * PackageManagerSchema — Package Station Manager, Phase A/B.
 *
 * Sibling to PackageSchema.php (not folded into it — same reasoning that
 * kept PricingPreview.php separate: a structurally distinct concern gets its
 * own file rather than growing PackageSchema.php further).
 *
 * Storage location (corrected in Phase B — see the Phase A audit): this is
 * NOT stored under cz_package (that meta belongs to the legacy
 * cz_surface_package post type, which ServiceTierStep/getPackageStation do
 * not read). It is a top-level `package_manager` key on the Service post's
 * `cz_service_package_station` meta — the live Package Station used
 * everywhere else (tiers, popular_tier, bundle). Delegated from
 * PackageStationController's station-default array and read/write paths, not
 * from PackageSchema at all.
 *

 * Scope: storage shape, deterministic provisional identity, pure in-memory
 * reconciliation against the Service inclusion/FAQ pools, atomic explicit-
 * decision commits, the pure read-model builder, and consumer projections.
 * Nothing here performs I/O; callers own fetching postmeta/pools and pass
 * plain arrays in. There is no Manager-wide lifecycle or draft/revert flow.
 *
 * Presentation boundary (locked, corrected post-Phase-A-audit): this class
 * emits OPERATIONAL FACTS ONLY — module_transition, disabled, missing,
 * platform_status, resolved source content, consumer eligibility. It must
 * never compute or emit a presentation status (active/pending-full/
 * pending-dim/disabled-as-presentation) or ModuleNote-shaped notes — that
 * truth table and its notes belong exclusively to the existing frontend
 * engine (moduleNotifications.ts's evaluateModule → moduleStatus.tsx →
 * ModuleStatusPill/ReadBlock), wired up in Phase B as packageManagerItemModule
 * (operational) + packageManagerSummaryModule (presentation-only aggregate).
 * A prior draft of this file computed presentation status in PHP as a second,
 * independent encoding of that same truth table — removed as duplication.
 *
 * Ownership boundary (locked): the Package Station Manager decorates,
 * groups, orders, and enables/disables Service-owned children — it never
 * creates or deletes source children (Service owns cz_service_inclusions /
 * cz_service_faqs exclusively) and never writes into tier.price.
 */
final class PackageManagerSchema
{
    // ===================================================================
    // SECTION: MANAGER_SHAPE
    // ===================================================================
    public const ALLOWED_SOURCE_TYPES       = ['inclusion', 'faq'];
    public const ALLOWED_MODULE_TRANSITIONS = ['not-configured', 'pending', 'settled'];
    public const OPERATIONAL_STATES         = ['connected_available', 'connected_unavailable', 'source_missing', 'ambiguous'];
    public const ALLOWED_RATE_SHEET_STATUSES = ['active', 'archived'];

    /**
     * The units every Package Manager understands without being told. They are
     * always offered and can never be removed, so a sheet is never left with a
     * vocabulary of nothing.
     */
    public const BUILT_IN_RATE_SHEET_UNITS = [
        'Per VM', 'Per GB', 'Per TB', 'Per vCPU', 'Per user', 'Per month', 'Per item',
    ];

    /** A curated unit is a label, not a sentence. */
    private const MAX_RATE_SHEET_UNIT_LENGTH = 32;

    /**
     * Deterministic identity assigned to the ONE legacy singleton Rate Sheet
     * when it is lifted into the rate_sheets[] collection. This is the only
     * id ever minted during read-time sanitisation; all other sheet ids are
     * minted on the write path (commitConfiguration). Tier occupants that
     * carry selections but no rate_sheet_id default to this id.
     */
    public const PRIMARY_RATE_SHEET_ID      = 'rs_primary';

    // ── Storage sanitizers ──────────────────────────────────────────────────

    /**
     * Sanitise inbound package_manager data. Returns a fully-shaped array
     * regardless of input quality. Items here are PERSISTED rows only — an
     * item that has never been saved/settled has no row here at all; it is
     * synthesized provisionally by reconcileItems() at read time instead
     * (Option A from the accepted Phase A audit: no write-on-read).
     *
     * @param  mixed $data
     * @return array{sources: array<int, array>, groups: array<int, array>, category_groups: array<int, array>, items: array<int, array>, rate_sheets: array<int, array>}
     */
    public static function sanitize(mixed $data): array
    {
        if (!is_array($data)) {
            $data = [];
        }

        $groups   = self::sanitizeGroups($data['groups'] ?? []);
        $groupIds = array_column($groups, 'group_id');

        $categoryGroups = PackageCategoryGroups::sanitizeAll($data['category_groups'] ?? []);
        $categoryGroupIds = PackageCategoryGroups::idSet($categoryGroups);

        // A source assignment must reference a live Package Family;
        // an unknown id is reassigned to null (unassigned), never dropped —
        // the same reassign-not-delete rule the decorative groups use.
        $sources = PackageStationSchema::sanitizeSourceRelationships($data['sources'] ?? []);
        foreach ($sources as &$source) {
            if ($source['category_group_id'] !== null && !isset($categoryGroupIds[$source['category_group_id']])) {
                $source['category_group_id'] = null;
            }
        }
        unset($source);

        // The unit vocabulary is curated Manager configuration, so it is resolved
        // BEFORE the sheets that are validated against it. A row may only carry a
        // unit this vocabulary knows; it can never introduce one by using it.
        $rateSheetUnits = self::sanitizeRateSheetUnits($data['rate_sheet_units'] ?? []);

        return [
            'sources' => $sources,
            'groups' => $groups,
            'category_groups' => $categoryGroups,
            'items'  => self::sanitizeItems($data['items'] ?? [], $groupIds),
            'rate_sheet_units' => $rateSheetUnits,
            // Identified sibling collection. The legacy singular `rate_sheet` is
            // still accepted as a one-time migration source but never re-emitted.
            'rate_sheets' => self::sanitizeRateSheets(
                $data['rate_sheets'] ?? null,
                $data['rate_sheet'] ?? null,
                self::allowedRateSheetUnits($rateSheetUnits)
            ),
        ];
    }

    /**
     * Curated unit labels, beyond the built-in seven. Blank, over-long and
     * duplicate entries are dropped, and an entry that merely restates a
     * built-in is dropped rather than stored twice — comparison is
     * case-insensitive so `per vm` cannot shadow `Per VM`.
     *
     * @param  mixed $units
     * @return array<int, string>
     */
    public static function sanitizeRateSheetUnits(mixed $units): array
    {
        if (!is_array($units)) {
            return [];
        }
        $seen = [];
        foreach (self::BUILT_IN_RATE_SHEET_UNITS as $builtIn) {
            $seen[mb_strtolower($builtIn)] = true;
        }
        $out = [];
        foreach ($units as $unit) {
            // A unit is a label. A number or a structure is malformed input, not
            // a label that happens to stringify, so it is dropped rather than cast.
            if (!is_string($unit)) {
                continue;
            }
            $label = trim(sanitize_text_field($unit));
            if ($label === '' || mb_strlen($label) > self::MAX_RATE_SHEET_UNIT_LENGTH) {
                continue;
            }
            $key = mb_strtolower($label);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = $label;
        }
        return $out;
    }

    /**
     * The full vocabulary a row's `per` is validated against.
     *
     * @param  array<int, string> $customUnits
     * @return array<int, string>
     */
    public static function allowedRateSheetUnits(array $customUnits): array
    {
        return array_merge(self::BUILT_IN_RATE_SHEET_UNITS, $customUnits);
    }

    /** @return array{sources: array, groups: array, category_groups: array, items: array, rate_sheet_units: array, rate_sheets: array} */
    public static function defaultManager(): array
    {
        return [
            'sources' => [],
            'groups' => [],
            'category_groups' => [],
            'items' => [],
            'rate_sheet_units' => [],
            'rate_sheets' => [],
        ];
    }

    /**
     * Whether the stored Manager contains any Manager-owned configuration.
     * Reconciled source rows are deliberately not considered: they are
     * provisional read-model material and do not exist in $storedManager.
     */
    public static function hasConfiguration(array $storedManager): bool
    {
        return !empty($storedManager['sources']) || !empty($storedManager['groups']) || !empty($storedManager['category_groups']) || !empty($storedManager['items']) || !empty($storedManager['rate_sheet_units']) || !empty($storedManager['rate_sheets']);
    }

    /**
     * The identified Rate Sheet collection. Each sheet is
     * {rate_sheet_id, title, status, groups[], items[]} — the singular
     * {title, groups, items} core wrapped with a stable id and lifecycle status.
     *
     * MIGRATION (Refinement 1): this NEVER mints an id. Sheets in $plural keep
     * their stored rate_sheet_id and any that arrive id-less are dropped
     * (id-less sheets only originate from the Tool's create/duplicate and are
     * minted on the write path in commitConfiguration). When $plural is absent,
     * the legacy singleton $legacySingle is lifted once to the deterministic
     * PRIMARY_RATE_SHEET_ID — the single read-time id assignment.
     *
     * @return array<int, array{rate_sheet_id:string,title:string,status:string,groups:array,items:array}>
     */
    public static function sanitizeRateSheets(
        mixed $plural,
        mixed $legacySingle = null,
        ?array $allowedUnits = null
    ): array {
        $out  = [];
        $seen = [];
        $allowedUnits ??= self::BUILT_IN_RATE_SHEET_UNITS;

        if (is_array($plural)) {
            foreach ($plural as $sheet) {
                if (!is_array($sheet)) { continue; }
                $id = sanitize_text_field((string) ($sheet['rate_sheet_id'] ?? ''));
                if ($id === '' || isset($seen[$id])) { continue; }
                $core = self::sanitizeRateSheet($sheet, $allowedUnits);
                if ($core === null) { continue; }
                $seen[$id] = true;
                $out[] = [
                    'rate_sheet_id' => $id,
                    'cz_platform_id'=> sanitize_text_field((string) ($sheet['cz_platform_id'] ?? '')),
                    'title'         => $core['title'],
                    'status'        => self::sanitizeRateSheetStatus($sheet['status'] ?? null),
                    'groups'        => $core['groups'],
                    'items'         => $core['items'],
                    'bundles'       => $core['bundles'],
                ];
            }
            return $out;
        }

        // Legacy-singleton migration: one deterministic id assignment.
        $core = self::sanitizeRateSheet($legacySingle, $allowedUnits);
        if ($core !== null) {
            $out[] = [
                'rate_sheet_id' => self::PRIMARY_RATE_SHEET_ID,
                'cz_platform_id'=> sanitize_text_field((string) ($legacySingle['cz_platform_id'] ?? '')),
                'title'         => $core['title'],
                'status'        => 'active',
                'groups'        => $core['groups'],
                'items'         => $core['items'],
                'bundles'       => $core['bundles'],
            ];
        }
        return $out;
    }

    private static function sanitizeRateSheetStatus(mixed $status): string
    {
        $status = sanitize_text_field((string) $status);
        return in_array($status, self::ALLOWED_RATE_SHEET_STATUSES, true) ? $status : 'active';
    }

    /**
     * Canonical Rate Sheet row identity — a pure function of the supplying
     * Manager item's source_item_id. The same source always maps to the same
     * row id within a sheet; identical ids may recur across sheets, resolved
     * only in the sheet the Tier's rate_sheet_id names.
     */
    public static function deriveRateItemId(string $sourceItemId): string
    {
        return 'rate_' . substr(hash('sha256', $sourceItemId), 0, 16);
    }

    /**
     * Stable native id for one Bundle membership. The second input is the
     * referenced Rate Sheet-row address for new memberships; legacy callers
     * may still supply their former Manager source key. Stored ids are never
     * recomputed, so existing CZPRCBII bindings remain intact during adoption.
     */
    public static function deriveBundleRateItemId(string $bundleId, string $sourceItemId): string
    {
        return 'rate_' . substr(hash('sha256', $bundleId . ':' . $sourceItemId), 0, 16);
    }

    /** Mint a fresh Rate Sheet identity. Write-path only (commitConfiguration). */
    private static function mintRateSheetId(): string
    {
        return 'rs_' . bin2hex(random_bytes(6));
    }

    /**
     * Mint a fresh Rate Sheet Bundle identity. Write-path only
     * (commitConfiguration), exactly like mintRateSheetId() — a Bundle is an
     * admin-created composition space with no external source to derive from,
     * so it is minted fresh rather than hashed, and never derived from its
     * editable title.
     */
    private static function mintBundleId(): string
    {
        return 'rsb_' . bin2hex(random_bytes(6));
    }

    /**
     * Mint a fresh Price Option identity. Write-path only (commitConfiguration),
     * exactly like mintRateSheetId() — an option has no stable external source
     * to derive from the way item_id derives from source_item_id, so it is
     * minted fresh rather than hashed. Never derived from the editable label.
     */
    private static function mintOptionId(): string
    {
        return 'opt_' . bin2hex(random_bytes(6));
    }

    /**
     * The upstream row id of a Bundle — an ordinary Rate Sheet row id, derived
     * purely from the Bundle it represents. Same `rate_` grammar and digest as
     * every other row, because upstream this IS just another priced row.
     */
    public static function deriveBundleRowId(string $bundleId): string
    {
        return 'rate_' . substr(hash('sha256', 'bundle:' . $bundleId), 0, 16);
    }

    /**
     * What a Rate Sheet offers upstream: its own priced rows, plus ONE priced
     * row per Bundle carrying that Bundle's own commercial price.
     *
     * `buildReadModel` puts the result straight into the sheet's `items` — the
     * rows every consumer already reads — so a Bundle needs no new field and no
     * consumer needs changing. The authoring tool cannot round-trip the Bundle's
     * row back into storage: it carries no `source_item_id`, and both
     * `toEditorRows()` (frontend) and `sanitizeRateRows()` (here) already drop a
     * row without one.
     *
     * This is where the Bundle stops being a Bundle. A consumer receives a flat
     * list of Rate Sheet rows and can neither tell nor care which of them a
     * Bundle produced — selecting Chef's Soup's row charges the Bundle's $75
     * once, exactly as selecting the carrot's row charges $20.
     *
     * A Bundle's memberships are deliberately not offered here. They are the
     * ingredients of that one commercial row (carried as `includes` for
     * presentation), not separately chargeable rows of the same selection; the
     * sheet's own rows are what remains individually sellable. An archived
     * Bundle offers nothing, mirroring an archived sheet.
     *
     * @param  array $rateSheet one stored/projected sheet
     * @return array<int, array> priced rows, in offer order
     */
    public static function consumableRateSheetRows(array $rateSheet): array
    {
        $rows = [];
        foreach (is_array($rateSheet['items'] ?? null) ? $rateSheet['items'] : [] as $item) {
            if (is_array($item)) { $rows[] = $item; }
        }
        foreach (is_array($rateSheet['bundles'] ?? null) ? $rateSheet['bundles'] : [] as $bundle) {
            if (!is_array($bundle)) { continue; }
            $bundleId = (string) ($bundle['bundle_id'] ?? '');
            $members = is_array($bundle['items'] ?? null) ? $bundle['items'] : [];
            if ($bundleId === '' || $members === [] || (string) ($bundle['status'] ?? 'active') !== 'active') { continue; }
            $rows[] = self::bundleConsumableRow($bundle, $bundleId);
        }
        return $rows;
    }

    /**
     * One Bundle as the single priced row it presents upstream.
     *
     * A Bundle row carries its own label and resolved operational facts because
     * no Manager source stands behind the combination. The empty
     * `source_item_id` remains solely an authoring guard: shared consumers read
     * the same compiled row contract as they do for every other offered row.
     */
    private static function bundleConsumableRow(array $bundle, string $bundleId): array
    {
        $includes = [];
        foreach (is_array($bundle['items'] ?? null) ? $bundle['items'] : [] as $component) {
            if (!is_array($component)) { continue; }
            $includes[] = [
                'item_id'        => (string) ($component['item_id'] ?? ''),
                'cz_platform_id' => (string) ($component['cz_platform_id'] ?? ''),
                'rate_sheet_id'  => (string) ($component['rate_sheet_id'] ?? ''),
                'rate_sheet_item_id' => (string) ($component['rate_sheet_item_id'] ?? ''),
                'rate_sheet_item_platform_id' => (string) ($component['rate_sheet_item_cz_platform_id'] ?? ($component['rate_sheet_item_platform_id'] ?? '')),
                'source_item_id' => (string) ($component['source_item_id'] ?? ''),
                'label'          => (string) ($component['label'] ?? ''),
                'quantity'       => (int) ($component['quantity'] ?? 1),
            ];
        }

        return [
            'item_id'        => self::deriveBundleRowId($bundleId),
            // The compiled output is a normal Rate Sheet Item with its own
            // durable CZPRCI. The Bundle's CZPRCB remains solely on its
            // authoring record.
            'cz_platform_id' => (string) ($bundle['compiled_item_cz_platform_id'] ?? ($bundle['compiled_item_platform_id'] ?? '')),
            // No supplied content stands behind a combination.
            'source_item_id' => '',
            'label'          => (string) ($bundle['title'] ?? ''),
            'resolved_label' => (string) ($bundle['title'] ?? ''),
            'source_type'    => null,
            'source_id'      => null,
            'connection_resolved' => true,
            'available'      => true,
            'operational_state' => 'connected_available',
            'health_reasons' => [],
            'unit_price'     => (float) ($bundle['unit_price'] ?? 0),
            'per'            => (string) ($bundle['per'] ?? ''),
            // The Bundle's OWN quantity and group, in the ordinary row
            // positions. A sheet stored before Bundles carried either field
            // falls back to the same defaults this projection used to hardcode.
            'quantity'       => max(1, (int) ($bundle['quantity'] ?? 1)),
            'group_id'       => ($bundle['group_id'] ?? null) === null || ($bundle['group_id'] ?? '') === ''
                ? null
                : (string) $bundle['group_id'],
            'sort_order'     => (int) ($bundle['sort_order'] ?? 0),
            'price_options'  => is_array($bundle['price_options'] ?? null) ? $bundle['price_options'] : [],
            // A combination names its own default price exactly like any other
            // priced row, so the row it presents upstream carries that name.
            'default_price_label' => (string) ($bundle['default_price_label'] ?? ''),
            // The ingredients, for the "Includes:" presentation only — never a
            // second set of chargeable lines.
            'includes'       => $includes,
        ];
    }

    /**
     * Select one sheet from the collection by id. Returns null for a null,
     * empty, or unknown id — the caller resolves nothing rather than scanning
     * other sheets (row identity is always (rate_sheet_id, item_id)).
     *
     * @param array<int, array> $rateSheets
     */
    public static function findRateSheet(array $rateSheets, ?string $rateSheetId): ?array
    {
        if ($rateSheetId === null || $rateSheetId === '') { return null; }
        foreach ($rateSheets as $sheet) {
            if (is_array($sheet) && (string) ($sheet['rate_sheet_id'] ?? '') === $rateSheetId) {
                return $sheet;
            }
        }
        return null;
    }

    /**
     * Rate Sheet groups are catalogue-owned and deliberately separate from
     * relationship Groups. Option identity points at a canonical reconciled
     * Package Manager item; the Rate Sheet never copies source labels.
     */
    private static function sanitizeRateSheet(mixed $rateSheet, ?array $allowedUnits = null): ?array
    {
        if (!is_array($rateSheet)) {
            return null;
        }

        $title = sanitize_text_field((string) ($rateSheet['title'] ?? ''));
        $groups = self::sanitizeGroups($rateSheet['groups'] ?? [], true);
        $groupIds = array_column($groups, 'group_id');
        $allowedUnits ??= self::BUILT_IN_RATE_SHEET_UNITS;

        $items = self::sanitizeRateRows($rateSheet['items'] ?? [], $groupIds, $allowedUnits, false);
        // Bundles are validated against the SAME groups and the SAME unit
        // vocabulary as the sheet's own rows — a Bundle is a composition space
        // inside this sheet, not a second catalogue with rules of its own.
        $bundles = self::sanitizeRateSheetBundles($rateSheet['bundles'] ?? [], $groupIds, $allowedUnits);

        if ($title === '' && $groups === [] && $items === [] && $bundles === []) {
            return null;
        }
        return ['title' => $title, 'groups' => $groups, 'items' => $items, 'bundles' => $bundles];
    }

    /**
     * Priced Rate Sheet rows. ONE implementation for both consumers with the
     * same semantic responsibility: a sheet's own `items[]` and a Bundle's own
     * `items[]`. With `$withLabel`, the same field sanitizer serves a Bundle
     * membership while retaining the exact referenced Rate Sheet-row address.
     * Its `item_id`/CZPRCBII identify membership, never replace the referenced
     * row's own `(rate_sheet_id, item_id)`/CZPRCI.
     *
     * `$bundleScopeId` selects the membership-id derivation. The compiled
     * commercial row has its own independent `deriveBundleRowId()` identity.
     * Passing null keeps `deriveRateItemId`, the sheet's own derivation,
     * byte-for-byte. A Bundle whose id is minted later in this same request
     * leaves its rows' ids blank here; the write path derives them once the
     * Bundle has its id.
     *
     * @param  string[] $groupIds
     * @param  array<int, string> $allowedUnits
     * @return array<int, array>
     */
    private static function sanitizeRateRows(
        mixed $items,
        array $groupIds,
        array $allowedUnits,
        bool $withLabel,
        ?string $bundleScopeId = null
    ): array {
        $out  = [];
        $seen = [];
        foreach (is_array($items) ? $items : [] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $sourceItemId = sanitize_text_field((string) ($item['source_item_id'] ?? ''));
            $itemId = sanitize_text_field((string) ($item['item_id'] ?? ''));
            // A stored row KEEPS its id — Platform identity is bound to it, so
            // it is never recomputed. Only a row curated by the Tool, which
            // carries its source but no id, is derived here (the backend
            // derives, never the Tool). A Bundle membership derives from its
            // Bundle and exact referenced row; a Bundle minted later in this
            // same request leaves the membership id blank for the write path.
            $memberRateSheetId = $withLabel ? sanitize_text_field((string) ($item['rate_sheet_id'] ?? '')) : '';
            $memberRateSheetItemId = $withLabel ? sanitize_text_field((string) ($item['rate_sheet_item_id'] ?? '')) : '';
            $memberReference = $memberRateSheetId !== '' && $memberRateSheetItemId !== ''
                ? $memberRateSheetId . ':' . $memberRateSheetItemId
                : $sourceItemId;
            if ($itemId === '' && $sourceItemId !== '' && $bundleScopeId !== '') {
                $itemId = $bundleScopeId === null
                    ? self::deriveRateItemId($sourceItemId)
                    : self::deriveBundleRateItemId($bundleScopeId, $memberReference);
            }
            if ($sourceItemId === '') {
                continue; // no source — nothing to price, and no identity to derive
            }
            // One identity per row in normal scope, or per exact row reference
            // in Bundle scope. Existing stored ids remain authoritative.
            $seenKey = $itemId !== '' ? $itemId : 'src:' . $memberReference;
            if (isset($seen[$seenKey])) {
                continue;
            }
            $seen[$seenKey] = true;
            $unit = sanitize_text_field((string) ($item['per'] ?? ''));
            if (!in_array($unit, $allowedUnits, true)) {
                $unit = '';
            }
            $groupId = sanitize_text_field((string) ($item['group_id'] ?? ''));
            if ($groupId === '' || !in_array($groupId, $groupIds, true)) {
                $groupId = null;
            }
            $row = [
                'item_id'       => $itemId,
                'cz_platform_id'=> sanitize_text_field((string) ($item['cz_platform_id'] ?? '')),
                'source_item_id'=> $sourceItemId,
                'unit_price'    => max(0, (float) ($item['unit_price'] ?? 0)),
                'per'           => $unit,
                'quantity'      => max(1, (int) ($item['quantity'] ?? 1)),
                'group_id'      => $groupId,
                'sort_order'    => (int) ($item['sort_order'] ?? 0),
                'price_options' => self::sanitizePriceOptions($item['price_options'] ?? []),
                // What this row's own `unit_price` is CALLED. Display
                // configuration for the price already stored above — it mints
                // no identity, is never a `price_options[]` entry, and never
                // changes how a Tier selects that price (still the absence of
                // a `price_option_id`). Blank means the built-in name.
                'default_price_label' => sanitize_text_field((string) ($item['default_price_label'] ?? '')),
            ];
            if ($withLabel) {
                $row['label'] = sanitize_text_field((string) ($item['label'] ?? ''));
                $row['rate_sheet_id'] = $memberRateSheetId;
                $row['rate_sheet_item_id'] = $memberRateSheetItemId;
                $row['rate_sheet_item_cz_platform_id'] = sanitize_text_field((string) ($item['rate_sheet_item_cz_platform_id'] ?? ''));
            }
            $out[] = $row;
        }
        return $out;
    }

    /**
     * A sheet's Bundles — compositions whose `CZPRCBII` memberships wrap exact
     * existing Rate Sheet rows without replacing their CZPRCI identities.
     *
     * A Bundle is NOT a second Rate Sheet: it stores no groups and no unit
     * vocabulary of its own, and its rows validate against the owning sheet's.
     * `bundle_id` is passed through as submitted — blank when the Tool has just
     * created one — and minted on the write path only (commitConfiguration),
     * exactly like a price option's `option_id`. This helper serves both the
     * read and write paths, so it must never mint here.
     *
     * @param  string[] $groupIds
     * @param  array<int, string> $allowedUnits
     * @return array<int, array{bundle_id:string,cz_platform_id:string,title:string,status:string,sort_order:int,quantity:int,group_id:?string,items:array}>
     */
    private static function sanitizeRateSheetBundles(
        mixed $bundles,
        array $groupIds,
        array $allowedUnits
    ): array {
        if (!is_array($bundles)) {
            return [];
        }
        $out  = [];
        $seen = [];
        foreach ($bundles as $index => $bundle) {
            if (!is_array($bundle)) {
                continue;
            }
            $bundleId = sanitize_text_field((string) ($bundle['bundle_id'] ?? ''));
            if ($bundleId !== '' && isset($seen[$bundleId])) {
                continue;
            }
            if ($bundleId !== '') {
                $seen[$bundleId] = true;
            }
            $title = sanitize_text_field((string) ($bundle['title'] ?? ''));
            // The Bundle's own id scopes membership identity. Blank means
            // "minted later in this request", and the write path finishes the
            // membership derivation.
            $items = self::sanitizeRateRows($bundle['items'] ?? [], $groupIds, $allowedUnits, true, $bundleId);
            // An entirely empty Bundle carries nothing to identify or price, so
            // it is dropped rather than persisted — the same rule that drops an
            // entirely empty sheet.
            if ($bundleId === '' && $title === '' && $items === []) {
                continue;
            }
            // The Bundle's OWN commercial price for consuming this combination
            // together — deliberately independent of what its referenced rows
            // sum to (Chef's Soup is $75 whatever the carrot costs). Same
            // fields, same vocabulary, same Price Option shape as any priced
            // Rate Sheet row, because that is exactly what it becomes upstream.
            $unit = sanitize_text_field((string) ($bundle['per'] ?? ''));
            if (!in_array($unit, $allowedUnits, true)) {
                $unit = '';
            }
            // A Bundle's own quantity and group, clamped and validated by the
            // SAME rules `sanitizeRateRows` applies to a row's — the Bundle IS
            // the row it presents upstream, so it carries the row's complete
            // field set rather than defaulting two of them at projection time.
            $bundleGroupId = sanitize_text_field((string) ($bundle['group_id'] ?? ''));
            if ($bundleGroupId === '' || !in_array($bundleGroupId, $groupIds, true)) {
                $bundleGroupId = null;
            }
            $out[] = [
                'bundle_id'     => $bundleId,
                'cz_platform_id'=> sanitize_text_field((string) ($bundle['cz_platform_id'] ?? '')),
                'bundle_item_cz_platform_id' => sanitize_text_field((string) ($bundle['bundle_item_cz_platform_id'] ?? '')),
                'compiled_item_cz_platform_id' => sanitize_text_field((string) ($bundle['compiled_item_cz_platform_id'] ?? '')),
                'title'         => $title,
                'status'        => self::sanitizeRateSheetStatus($bundle['status'] ?? null),
                'sort_order'    => (int) ($bundle['sort_order'] ?? $index),
                'unit_price'    => max(0, (float) ($bundle['unit_price'] ?? 0)),
                'per'           => $unit,
                'quantity'      => max(1, (int) ($bundle['quantity'] ?? 1)),
                'group_id'      => $bundleGroupId,
                'price_options' => self::sanitizePriceOptions($bundle['price_options'] ?? []),
                // The Bundle's own default price is named the same display-only
                // way a row's is.
                'default_price_label' => sanitize_text_field((string) ($bundle['default_price_label'] ?? '')),
                'items'         => $items,
            ];
        }
        usort($out, static fn(array $a, array $b): int => $a['sort_order'] <=> $b['sort_order']);
        return $out;
    }

    /**
     * A row's optional alternative-price children. Never a second row, never
     * Rate-Sheet-wide, never touching quantity/cycle/commitment. `option_id`
     * is passed through as submitted — never derived from `label` — and left
     * blank when not yet minted; `commitConfiguration` mints a fresh one on
     * the write path only, mirroring `mintRateSheetId()`. This helper serves
     * both the read (sanitize()) and write (commitConfiguration()) paths, so
     * it must never mint here — read-time minting would invent identity for
     * data no save request ever produced.
     *
     * @return array<int, array{option_id:string,cz_platform_id:string,label:string,unit_price:float}>
     */
    private static function sanitizePriceOptions(mixed $options): array
    {
        if (!is_array($options)) {
            return [];
        }
        $out = [];
        $seen = [];
        foreach ($options as $option) {
            if (!is_array($option)) {
                continue;
            }
            $optionId = sanitize_text_field((string) ($option['option_id'] ?? ''));
            if ($optionId !== '' && isset($seen[$optionId])) {
                continue;
            }
            if ($optionId !== '') {
                $seen[$optionId] = true;
            }
            $out[] = [
                'option_id'      => $optionId,
                'cz_platform_id' => sanitize_text_field((string) ($option['cz_platform_id'] ?? '')),
                'label'          => sanitize_text_field((string) ($option['label'] ?? '')),
                'unit_price'     => max(0, (float) ($option['unit_price'] ?? 0)),
            ];
        }
        return $out;
    }

    /**
     * Groups are pure admin-created organisation, no external source of
     * truth. A group without an id, or a duplicate id (first occurrence
     * wins — mirrors sanitizePromotionTiers's id-required-dedup rule), is
     * dropped; there is nothing else to reassign it to.
     *
     * @param  mixed $groups
     * @return array<int, array{group_id: string, label: string, sort_order: int}>
     */
    private static function sanitizeGroups(mixed $groups, bool $withPlatformIdentity = false): array
    {
        if (!is_array($groups)) {
            return [];
        }

        $out  = [];
        $seen = [];
        foreach ($groups as $g) {
            if (!is_array($g)) {
                continue;
            }
            $id = sanitize_text_field((string) ($g['group_id'] ?? ''));
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $group = [
                'group_id'   => $id,
                'label'      => sanitize_text_field((string) ($g['label'] ?? '')),
                'sort_order' => (int) ($g['sort_order'] ?? 0),
            ];
            if ($withPlatformIdentity) {
                $group['cz_platform_id'] = sanitize_text_field((string) ($g['cz_platform_id'] ?? ''));
            }
            $out[] = $group;
        }
        return $out;
    }

    /**
     * Persisted item rows. A row whose source_type is not one of
     * ALLOWED_SOURCE_TYPES, or whose source_id sanitises to empty, is
     * dropped — item_id is a pure function of (source_type, source_id), so
     * without both there is no identity to preserve the row under. A
     * duplicate (source_type, source_id) pair collapses to its first
     * occurrence (same dedup rule as groups). A group_id that doesn't match
     * a live group is reassigned to null (ungrouped), never dropped — same
     * reassign-not-delete rule already used when a group itself is deleted.
     *
     * @param  mixed $items
     * @param  string[] $validGroupIds
     * @return array<int, array>
     */
    private static function sanitizeItems(mixed $items, array $validGroupIds): array
    {
        if (!is_array($items)) {
            return [];
        }

        $out  = [];
        $seen = [];
        foreach ($items as $it) {
            if (!is_array($it)) {
                continue;
            }

            $sourceType = sanitize_text_field((string) ($it['source_type'] ?? ''));
            if (!in_array($sourceType, self::ALLOWED_SOURCE_TYPES, true)) {
                continue; // unknown source_type — identity underivable, row dropped
            }

            $sourceId = sanitize_text_field((string) ($it['source_id'] ?? ''));
            if ($sourceId === '') {
                continue; // empty source_id — identity underivable, row dropped
            }

            // item_id is always re-derived, never trusted from input — a pure
            // function of (source_type, source_id), so a client-supplied
            // item_id can never desync from its own identity fields.
            $itemId = self::deriveItemId($sourceType, $sourceId);
            if (isset($seen[$itemId])) {
                continue; // duplicate (source_type, source_id) — first occurrence wins
            }
            $seen[$itemId] = true;

            $groupId = sanitize_text_field((string) ($it['group_id'] ?? ''));
            if ($groupId === '' || !in_array($groupId, $validGroupIds, true)) {
                $groupId = null;
            }

            $transition = sanitize_text_field((string) ($it['module_transition'] ?? ''));
            if (!in_array($transition, self::ALLOWED_MODULE_TRANSITIONS, true)) {
                $transition = 'not-configured';
            }

            $decoratedLabel = null;
            if (isset($it['decorated_label']) && $it['decorated_label'] !== null && $it['decorated_label'] !== '') {
                $decoratedLabel = sanitize_text_field((string) $it['decorated_label']);
            }

            $out[] = [
                'item_id'           => $itemId,
                'source_type'       => $sourceType,
                'source_id'         => $sourceId,
                'group_id'          => $groupId,
                'sort_order'        => (int) ($it['sort_order'] ?? 0),
                'disabled'          => (bool) ($it['disabled'] ?? false),
                'decorated_label'   => $decoratedLabel,
                'draft'             => self::sanitizeItemDraft($it['draft'] ?? null, $validGroupIds),
                'module_transition' => $transition,
            ];
        }
        return $out;
    }

    /**
     * A draft carries only the fields actually being changed (partial patch,
     * mirrors the tier/promotion module draft shape). Absent keys are
     * omitted, not defaulted — the settle step (Phase D) is what decides how
     * an absent key falls back to the settled value. Returns null for a
     * structurally empty/invalid draft so `draft: null` stays the one
     * canonical "no pending edit" representation.
     *
     * @param  mixed $draft
     * @param  string[] $validGroupIds
     * @return array|null
     */
    private static function sanitizeItemDraft(mixed $draft, array $validGroupIds): ?array
    {
        if (!is_array($draft)) {
            return null;
        }

        $out = [];
        if (array_key_exists('group_id', $draft)) {
            $g = sanitize_text_field((string) ($draft['group_id'] ?? ''));
            $out['group_id'] = ($g === '' || !in_array($g, $validGroupIds, true)) ? null : $g;
        }
        if (array_key_exists('sort_order', $draft)) {
            $out['sort_order'] = (int) $draft['sort_order'];
        }
        if (array_key_exists('disabled', $draft)) {
            $out['disabled'] = (bool) $draft['disabled'];
        }
        if (array_key_exists('decorated_label', $draft)) {
            $l = $draft['decorated_label'];
            $out['decorated_label'] = ($l === null || $l === '') ? null : sanitize_text_field((string) $l);
        }

        return $out === [] ? null : $out;
    }

    // ── Atomic configuration commit ────────────────────────────────────────

    /**
     * Replace the complete ordered group configuration and upsert only the
     * item decisions explicitly submitted by the administrator. Omitted
     * persisted decisions are preserved; provisional source items remain
     * absent from storage and therefore not-configured in the next read.
     *
     * A submitted identity must either resolve in the current source pools or
     * already exist as a persisted (possibly stale) decision. This prevents a
     * client from manufacturing source children while still allowing a stale
     * persisted decision to be reorganised or disabled.
     *
     * @throws \InvalidArgumentException for malformed/unknown identities
     */
    // ===================================================================
    // SECTION: MANAGER_COMMIT
    // ===================================================================
    public static function commitConfiguration(
        array $storedManager,
        mixed $submittedGroups,
        mixed $submittedDecisions,
        array $inclusionPool,
        array $faqPool,
        mixed $submittedRateSheets = null,
        mixed $submittedSources = null,
        mixed $rateSheetDeletions = null,
        mixed $submittedRateSheetUnits = null
    ): array {
        if ($submittedSources === null) { $submittedSources = self::sanitize($storedManager)['sources']; }
        if (!is_array($submittedSources) || !is_array($submittedGroups) || !is_array($submittedDecisions)) {
            throw new \InvalidArgumentException('Sources, groups and item decisions must be arrays.');
        }

        $groups   = self::sanitizeGroups($submittedGroups);
        $groupIds = array_column($groups, 'group_id');
        $stored   = self::sanitize($storedManager);

        $persistedById = [];
        foreach ($stored['items'] as $item) {
            $persistedById[$item['item_id']] = $item;
        }

        $liveIds = [];
        foreach ([['inclusion', $inclusionPool], ['faq', $faqPool]] as [$sourceType, $pool]) {
            foreach ($pool as $source) {
                if (!is_array($source)) {
                    continue;
                }
                $sourceId = sanitize_text_field((string) ($source['id'] ?? ''));
                if ($sourceId !== '') {
                    $liveIds[self::deriveItemId($sourceType, $sourceId)] = true;
                }
            }
        }

        foreach ($submittedDecisions as $decision) {
            if (!is_array($decision)) {
                throw new \InvalidArgumentException('Each item decision must be an object.');
            }

            $sourceType = sanitize_text_field((string) ($decision['source_type'] ?? ''));
            $sourceId   = sanitize_text_field((string) ($decision['source_id'] ?? ''));
            if (!in_array($sourceType, self::ALLOWED_SOURCE_TYPES, true) || $sourceId === '') {
                throw new \InvalidArgumentException('Each item decision requires a valid source identity.');
            }

            $itemId = self::deriveItemId($sourceType, $sourceId);
            $claimedId = sanitize_text_field((string) ($decision['item_id'] ?? ''));
            if ($claimedId !== '' && $claimedId !== $itemId) {
                throw new \InvalidArgumentException('Item identity does not match its source identity.');
            }
            if (!isset($liveIds[$itemId]) && !isset($persistedById[$itemId])) {
                throw new \InvalidArgumentException('Item decision does not reference a current or persisted source.');
            }

            $existing = $persistedById[$itemId] ?? [
                'item_id'           => $itemId,
                'source_type'       => $sourceType,
                'source_id'         => $sourceId,
                'group_id'          => null,
                'sort_order'        => 0,
                'disabled'          => false,
                'decorated_label'   => null,
                'draft'             => null,
                'module_transition' => 'not-configured',
            ];

            $groupId = array_key_exists('group_id', $decision)
                ? sanitize_text_field((string) ($decision['group_id'] ?? ''))
                : (string) ($existing['group_id'] ?? '');
            if ($groupId === '' || !in_array($groupId, $groupIds, true)) {
                $groupId = null;
            }

            $decoratedLabel = $existing['decorated_label'] ?? null;
            if (array_key_exists('decorated_label', $decision)) {
                $label = $decision['decorated_label'];
                $decoratedLabel = ($label === null || $label === '')
                    ? null
                    : sanitize_text_field((string) $label);
            }

            $persistedById[$itemId] = [
                'item_id'           => $itemId,
                'source_type'       => $sourceType,
                'source_id'         => $sourceId,
                'group_id'          => $groupId,
                'sort_order'        => array_key_exists('sort_order', $decision)
                    ? (int) $decision['sort_order']
                    : (int) ($existing['sort_order'] ?? 0),
                'disabled'          => array_key_exists('disabled', $decision)
                    ? (bool) $decision['disabled']
                    : (bool) ($existing['disabled'] ?? false),
                'decorated_label'   => $decoratedLabel,
                'draft'             => null,
                'module_transition' => 'settled',
            ];
        }

        // A complete group submission may remove a group. Normalize every
        // preserved decision against the new group set without deleting it.
        $items = [];
        foreach ($persistedById as $item) {
            if ($item['group_id'] !== null && !in_array($item['group_id'], $groupIds, true)) {
                $item['group_id'] = null;
            }
            $items[] = $item;
        }

        // Rate Sheets — partial upsert by id + explicit deletions. Independent
        // curation: NO blanket auto-onboard of live sources; each sheet holds
        // only the rows the admin curated. Sheets in neither list are preserved.
        // A submitted vocabulary replaces the stored one; an absent one keeps it,
        // so a caller that does not author units cannot silently erase them.
        $rateSheetUnits = $submittedRateSheetUnits === null
            ? $stored['rate_sheet_units']
            : self::sanitizeRateSheetUnits($submittedRateSheetUnits);
        $allowedUnits = self::allowedRateSheetUnits($rateSheetUnits);

        $sheetsById = [];
        foreach ($stored['rate_sheets'] as $sheet) {
            $sheetsById[$sheet['rate_sheet_id']] = $sheet;
        }
        foreach (is_array($submittedRateSheets) ? $submittedRateSheets : [] as $submitted) {
            if (!is_array($submitted)) { continue; }
            $core = self::sanitizeRateSheet($submitted, $allowedUnits);
            if ($core === null) { continue; }
            // Write-path mint: an option with no id is one the Tool just
            // created (mirrors the sheet's own blank-id mint just below).
            foreach ($core['items'] as &$coreItem) {
                foreach ($coreItem['price_options'] as &$coreOption) {
                    if ($coreOption['option_id'] === '') { $coreOption['option_id'] = self::mintOptionId(); }
                }
                unset($coreOption);
            }
            unset($coreItem);
            // Same write-path mint for a Bundle the Tool just created and for
            // its membership-owned price options.
            foreach ($core['bundles'] as &$coreBundle) {
                if ($coreBundle['bundle_id'] === '') { $coreBundle['bundle_id'] = self::mintBundleId(); }
                // The Bundle's own commercial Price Options mint exactly like a
                // row's — write path only, never derived from the label.
                foreach ($coreBundle['price_options'] as &$coreBundleOwnOption) {
                    if ($coreBundleOwnOption['option_id'] === '') { $coreBundleOwnOption['option_id'] = self::mintOptionId(); }
                }
                unset($coreBundleOwnOption);
                foreach ($coreBundle['items'] as &$coreBundleItem) {
                    // A row of a Bundle minted in THIS request could not derive
                    // its id at sanitize time — the scope did not exist yet.
                    // Finish it here, with the same pure derivation, so every
                    // stored membership has its own durable native identity.
                    if ($coreBundleItem['item_id'] === '') {
                        $memberReference = (string) ($coreBundleItem['rate_sheet_id'] ?? '') !== ''
                            && (string) ($coreBundleItem['rate_sheet_item_id'] ?? '') !== ''
                            ? (string) $coreBundleItem['rate_sheet_id'] . ':' . (string) $coreBundleItem['rate_sheet_item_id']
                            : (string) $coreBundleItem['source_item_id'];
                        $coreBundleItem['item_id'] = self::deriveBundleRateItemId(
                            $coreBundle['bundle_id'],
                            $memberReference
                        );
                    }
                    foreach ($coreBundleItem['price_options'] as &$coreBundleOption) {
                        if ($coreBundleOption['option_id'] === '') { $coreBundleOption['option_id'] = self::mintOptionId(); }
                    }
                    unset($coreBundleOption);
                }
                unset($coreBundleItem);
            }
            unset($coreBundle);
            $id = sanitize_text_field((string) ($submitted['rate_sheet_id'] ?? ''));
            if ($id === '') { $id = self::mintRateSheetId(); } // write-path mint
            $reconciled = self::reconcileRateSheetRows(
                $id,
                self::sanitizeRateSheetStatus($submitted['status'] ?? null),
                $core,
                $liveIds,
                $persistedById
            );
            $existingSheet = $sheetsById[$id] ?? null;
            $reconciled['cz_platform_id'] = (string) ($existingSheet['cz_platform_id'] ?? '');
            $existingItems = [];
            $existingOptions = [];
            foreach (is_array($existingSheet['items'] ?? null) ? $existingSheet['items'] : [] as $item) {
                if (!is_array($item)) { continue; }
                $existingItemId = (string) ($item['item_id'] ?? '');
                $existingItems[$existingItemId] = (string) ($item['cz_platform_id'] ?? '');
                foreach (is_array($item['price_options'] ?? null) ? $item['price_options'] : [] as $option) {
                    if (!is_array($option)) { continue; }
                    $existingOptions[$existingItemId . "\0" . (string) ($option['option_id'] ?? '')] = (string) ($option['cz_platform_id'] ?? '');
                }
            }
            foreach ($reconciled['items'] as &$item) {
                $item['cz_platform_id'] = $existingItems[(string) $item['item_id']] ?? '';
                foreach ($item['price_options'] as &$option) {
                    $option['cz_platform_id'] = $existingOptions[(string) $item['item_id'] . "\0" . (string) $option['option_id']] ?? '';
                }
                unset($option);
            }
            unset($item);
            $existingGroups = [];
            foreach (is_array($existingSheet['groups'] ?? null) ? $existingSheet['groups'] : [] as $group) {
                if (is_array($group)) $existingGroups[(string) ($group['group_id'] ?? '')] = (string) ($group['cz_platform_id'] ?? '');
            }
            foreach ($reconciled['groups'] as &$group) {
                $group['cz_platform_id'] = $existingGroups[(string) $group['group_id']] ?? '';
            }
            unset($group);
            // Bundle, compiled-row, membership, and child-option identities all
            // carry forward on their own native keys. None replaces or borrows
            // the referenced Rate Sheet row's CZPRCI.
            $existingBundles = [];
            $existingBundleItems = [];
            $existingCompiledBundleItems = [];
            $existingBundleOwnOptions = [];
            $existingBundleIncludedItems = [];
            foreach (is_array($existingSheet['bundles'] ?? null) ? $existingSheet['bundles'] : [] as $bundle) {
                if (!is_array($bundle)) { continue; }
                $existingBundleId = (string) ($bundle['bundle_id'] ?? '');
                if ($existingBundleId === '') { continue; }
                $existingBundles[$existingBundleId] = (string) ($bundle['cz_platform_id'] ?? '');
                $existingBundleItems[$existingBundleId] = (string) ($bundle['bundle_item_cz_platform_id'] ?? '');
                $existingCompiledBundleItems[$existingBundleId] = (string) ($bundle['compiled_item_cz_platform_id'] ?? '');
                foreach (is_array($bundle['price_options'] ?? null) ? $bundle['price_options'] : [] as $bundleOwnOption) {
                    if (!is_array($bundleOwnOption)) { continue; }
                    $existingBundleOwnOptions[$existingBundleId . "\0" . (string) ($bundleOwnOption['option_id'] ?? '')] = (string) ($bundleOwnOption['cz_platform_id'] ?? '');
                }
                foreach (is_array($bundle['items'] ?? null) ? $bundle['items'] : [] as $bundleItem) {
                    if (!is_array($bundleItem)) { continue; }
                    $existingBundleItemId = (string) ($bundleItem['item_id'] ?? '');
                    $existingBundleIncludedItems[$existingBundleId . "\0" . $existingBundleItemId] = (string) ($bundleItem['cz_platform_id'] ?? '');
                }
            }
            foreach ($reconciled['bundles'] as &$bundle) {
                $bundleKey = (string) $bundle['bundle_id'];
                $bundle['cz_platform_id'] = $existingBundles[$bundleKey] ?? '';
                $storedBundleItemId = $existingBundleItems[$bundleKey] ?? '';
                $bundle['bundle_item_cz_platform_id'] = PlatformIdentifierPolicy::validate(
                    PlatformIdentifierPolicy::PACKAGE_RATE_CARD_BUNDLE_ITEM,
                    $storedBundleItemId
                ) ? $storedBundleItemId : '';
                $bundle['compiled_item_cz_platform_id'] = $existingCompiledBundleItems[$bundleKey] ?? '';
                foreach ($bundle['price_options'] as &$bundleOwnOption) {
                    $storedOptionId = $existingBundleOwnOptions[$bundleKey . "\0" . (string) $bundleOwnOption['option_id']] ?? '';
                    $bundleOwnOption['cz_platform_id'] = PlatformIdentifierPolicy::validate(
                        PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM_OPTION,
                        $storedOptionId
                    ) ? $storedOptionId : '';
                }
                unset($bundleOwnOption);
                foreach ($bundle['items'] as &$bundleItem) {
                    $bundleItemKey = $bundleKey . "\0" . (string) $bundleItem['item_id'];
                    $storedIncludedId = $existingBundleIncludedItems[$bundleItemKey] ?? '';
                    $bundleItem['cz_platform_id'] = PlatformIdentifierPolicy::validate(
                        PlatformIdentifierPolicy::PACKAGE_RATE_CARD_BUNDLE_INCLUDED_ITEM,
                        $storedIncludedId
                    ) ? $storedIncludedId : '';
                }
                unset($bundleItem);
            }
            unset($bundle);
            $sheetsById[$id] = $reconciled;
        }
        foreach (is_array($rateSheetDeletions) ? $rateSheetDeletions : [] as $deleteId) {
            $deleteId = sanitize_text_field((string) $deleteId);
            if ($deleteId !== '') { unset($sheetsById[$deleteId]); }
        }

        $rateSheets = self::reconcileBundleMemberships(array_values($sheetsById));

        // A curated unit a surviving row still carries is kept, even when the
        // submitted vocabulary omits it. Retiring a unit is a deliberate act on
        // the rows that use it, never a side effect of saving a sheet.
        $inUse = [];
        foreach ($rateSheets as $sheet) {
            foreach ($sheet['items'] as $rateItem) {
                if ($rateItem['per'] !== '') { $inUse[$rateItem['per']] = true; }
            }
        }
        foreach ($stored['rate_sheet_units'] as $storedUnit) {
            if (isset($inUse[$storedUnit]) && !in_array($storedUnit, $rateSheetUnits, true)) {
                $rateSheetUnits[] = $storedUnit;
            }
        }

        return self::sanitize([
            'sources' => $submittedSources,
            'groups' => $groups,
            // The group registry has its own station lifecycle endpoints; a
            // manager configuration commit never creates or removes groups.
            'category_groups' => $stored['category_groups'],
            'items' => $items,
            'rate_sheet_units' => $rateSheetUnits,
            'rate_sheets' => $rateSheets,
        ]);
    }

    /**
     * Reconcile one curated Rate Sheet at the write boundary. Stale supplied-
     * content rows (source resolves in neither the live pool nor persisted
     * items) are dropped so legacy unresolved rows are permanently cleaned;
     * sort_order is re-indexed per sheet. Independent curation — this never
     * onboards a source the admin did not add to this sheet.
     */
    private static function reconcileRateSheetRows(
        string $rateSheetId,
        string $status,
        array $core,
        array $liveIds,
        array $persistedById
    ): array {
        $keep = static fn(array $rateItem): bool => isset($liveIds[$rateItem['source_item_id']])
            || isset($persistedById[$rateItem['source_item_id']]);

        $items = array_values(array_filter($core['items'], $keep));
        foreach ($items as $index => &$rateItem) {
            $rateItem['sort_order'] = $index;
        }
        unset($rateItem);

        // Membership validity is reconciled against exact Rate Sheet row
        // identity after the complete sheet collection has been assembled.
        $bundles = $core['bundles'] ?? [];
        foreach ($bundles as $bundleIndex => &$bundle) {
            $bundleItems = array_values($bundle['items']);
            foreach ($bundleItems as $index => &$bundleItem) {
                $bundleItem['sort_order'] = $index;
            }
            unset($bundleItem);
            $bundle['items'] = $bundleItems;
            $bundle['sort_order'] = $bundleIndex;
        }
        unset($bundle);

        return [
            'rate_sheet_id' => $rateSheetId,
            'cz_platform_id'=> '',
            'title'         => $core['title'],
            'status'        => $status,
            'groups'        => $core['groups'],
            'items'         => $items,
            'bundles'       => $bundles,
        ];
    }

    /**
     * Resolve every Bundle membership against an existing atomic Rate Sheet
     * row. Existing membership ids/CZPRCBII values are preserved; only dangling
     * relationships fall away. Legacy copied components are adopted when their
     * Manager source identifies one unambiguous row (preferring the owning
     * sheet), so the next real save establishes the exact native reference.
     *
     * @param array<int, array> $rateSheets
     * @return array<int, array>
     */
    private static function reconcileBundleMemberships(array $rateSheets): array
    {
        $rowsByReference = [];
        $referencesBySource = [];
        foreach ($rateSheets as $sheet) {
            $sheetId = (string) ($sheet['rate_sheet_id'] ?? '');
            foreach (is_array($sheet['items'] ?? null) ? $sheet['items'] : [] as $row) {
                $itemId = (string) ($row['item_id'] ?? '');
                $sourceItemId = (string) ($row['source_item_id'] ?? '');
                if ($sheetId === '' || $itemId === '') { continue; }
                $reference = $sheetId . "\0" . $itemId;
                $rowsByReference[$reference] = $row;
                if ($sourceItemId !== '') { $referencesBySource[$sourceItemId][] = $reference; }
            }
        }

        foreach ($rateSheets as &$sheet) {
            $owningSheetId = (string) ($sheet['rate_sheet_id'] ?? '');
            foreach ($sheet['bundles'] as &$bundle) {
                $members = [];
                $seenReferences = [];
                foreach ($bundle['items'] as $member) {
                    $memberSheetId = (string) ($member['rate_sheet_id'] ?? '');
                    $memberItemId = (string) ($member['rate_sheet_item_id'] ?? '');
                    $hasExactReference = $memberSheetId !== '' && $memberItemId !== '';
                    $reference = $hasExactReference
                        ? $memberSheetId . "\0" . $memberItemId
                        : '';
                    // Only source-only legacy members may be adopted. Once a
                    // membership has an exact row address, losing that row
                    // removes the relationship; it must never retarget to a
                    // different row that happens to share the Manager source.
                    if (!$hasExactReference) {
                        $sourceItemId = (string) ($member['source_item_id'] ?? '');
                        $candidates = $referencesBySource[$sourceItemId] ?? [];
                        $owningReference = null;
                        foreach ($candidates as $candidate) {
                            if (str_starts_with($candidate, $owningSheetId . "\0")) { $owningReference = $candidate; break; }
                        }
                        $reference = $owningReference ?? (count($candidates) === 1 ? $candidates[0] : '');
                    }
                    if ($reference === '' || !isset($rowsByReference[$reference])) { continue; }
                    if (isset($seenReferences[$reference])) { continue; }
                    $seenReferences[$reference] = true;
                    [$memberSheetId, $memberItemId] = explode("\0", $reference, 2);
                    $sourceRow = $rowsByReference[$reference];
                    $member['rate_sheet_id'] = $memberSheetId;
                    $member['rate_sheet_item_id'] = $memberItemId;
                    $member['rate_sheet_item_cz_platform_id'] = (string) ($sourceRow['cz_platform_id'] ?? '');
                    $member['source_item_id'] = (string) ($sourceRow['source_item_id'] ?? '');
                    $sourceOptions = [];
                    foreach (is_array($sourceRow['price_options'] ?? null) ? $sourceRow['price_options'] : [] as $sourceOption) {
                        $sourceOptions[(string) ($sourceOption['option_id'] ?? '')] = (string) ($sourceOption['cz_platform_id'] ?? '');
                    }
                    foreach ($member['price_options'] ?? [] as &$memberOption) {
                        $memberOption['cz_platform_id'] = $sourceOptions[(string) ($memberOption['option_id'] ?? '')] ?? '';
                    }
                    unset($memberOption);
                    $members[] = $member;
                }
                $bundle['items'] = array_values($members);
            }
            unset($bundle);
        }
        unset($sheet);
        return $rateSheets;
    }

    // ── Deterministic provisional identity ──────────────────────────────────

    /**
     * Canonical Manager item identity — a pure function of (source_type,
     * source_id) only. Never derived from label/content, pool order, group,
     * or decoration, so the same source always maps to the same item_id on
     * every read, independent of admin edits or pool reordering. This is
     * what makes Option A (provisional-until-saved, no write-on-read) work:
     * a never-persisted item and a later-persisted item for the same source
     * always compute the same id, so the merge in reconcileItems() is exact.
     *
     * Digest: first 16 hex characters (64 bits) of
     * sha256("{source_type}:{source_id}"). Collision behaviour: at 64 bits,
     * a birthday-bound collision needs on the order of 2^32 distinct
     * (source_type, source_id) pairs before a 50% collision probability — a
     * single service's inclusion/FAQ pool is realistically tens of items,
     * many orders of magnitude below that threshold. This is not
     * cryptographically hardened (sha256 truncated to 64 bits is not
     * collision-resistant against a deliberate adversary) — acceptable here
     * because inputs are admin-authored pool ids, not attacker-controlled.
     */
    public static function deriveItemId(string $sourceType, string $sourceId): string
    {
        return 'mgr_' . substr(hash('sha256', $sourceType . ':' . $sourceId), 0, 16);
    }

    // ── Pure in-memory reconciliation ───────────────────────────────────────

    /**
     * Synthesizes one provisional item per live pool entry (inclusions then
     * FAQs, in pool order), merges any persisted row over its provisional
     * counterpart by item_id, and preserves persisted rows whose source no
     * longer resolves in either pool — flagged `missing`, never dropped,
     * same discipline as PoolReferences' dangling-ref handling. Never
     * writes; the caller decides whether/when to persist newly-provisional
     * items (Option A: only once an admin action saves one, Phase D).
     *
     * @param  array<int, array> $persistedItems  PackageManagerSchema::sanitize()'d items[]
     * @param  array<int, mixed> $inclusionPool   cz_service_inclusions items: [{id, label}]
     * @param  array<int, mixed> $faqPool         cz_service_faqs items: [{id, question, answer}]
     * @return array<int, array>  reconciled items, each carrying a `missing` bool
     */
    // ===================================================================
    // SECTION: SOURCE_RECONCILIATION
    // ===================================================================
    public static function reconcileItems(array $persistedItems, array $inclusionPool, array $faqPool): array
    {
        $persistedById = [];
        foreach ($persistedItems as $item) {
            if (is_array($item) && isset($item['item_id'])) {
                $persistedById[$item['item_id']] = $item;
            }
        }

        $sources = [];
        foreach ($inclusionPool as $inc) {
            if (!is_array($inc)) {
                continue;
            }
            $id = (string) ($inc['id'] ?? '');
            if ($id !== '') {
                $sources[] = ['type' => 'inclusion', 'id' => $id];
            }
        }
        foreach ($faqPool as $faq) {
            if (!is_array($faq)) {
                continue;
            }
            $id = (string) ($faq['id'] ?? '');
            if ($id !== '') {
                $sources[] = ['type' => 'faq', 'id' => $id];
            }
        }

        $liveIds = [];
        $result  = [];
        $sortSeq = 0;

        foreach ($sources as $src) {
            $itemId = self::deriveItemId($src['type'], $src['id']);
            $liveIds[$itemId] = true;

            if (isset($persistedById[$itemId])) {
                $item = $persistedById[$itemId];
            } else {
                // New provisional item — never persisted, defaults per §4 of
                // the accepted Phase A plan.
                $item = [
                    'item_id'           => $itemId,
                    'source_type'       => $src['type'],
                    'source_id'         => $src['id'],
                    'group_id'          => null,
                    'sort_order'        => $sortSeq,
                    'disabled'          => false,
                    'decorated_label'   => null,
                    'draft'             => null,
                    'module_transition' => 'not-configured',
                ];
            }
            $item['missing'] = false;
            $result[] = $item;
            $sortSeq++;
        }

        // Stale persisted rows: source no longer resolves in either pool.
        // Preserved so a returning source resolves against the same identity
        // and the same prior admin decisions — never dropped.
        foreach ($persistedItems as $item) {
            if (is_array($item) && isset($item['item_id']) && !isset($liveIds[$item['item_id']])) {
                $item['missing'] = true;
                $result[] = $item;
            }
        }

        return $result;
    }

    /**
     * Live-resolved source content, dispatched by source_type. Returns null
     * when the source no longer resolves (the item is `missing`) — callers
     * must not fabricate placeholder content for a missing source.
     *
     * @return array{label: string}|array{question: string, answer: string}|null
     */
    private static function resolveSourceContent(
        string $sourceType,
        string $sourceId,
        array $inclusionPool,
        array $faqPool
    ): ?array {
        $pool = match ($sourceType) {
            'inclusion' => $inclusionPool,
            'faq'       => $faqPool,
            default     => [],
        };

        foreach ($pool as $entry) {
            if (!is_array($entry) || (string) ($entry['id'] ?? '') !== $sourceId) {
                continue;
            }
            return $sourceType === 'inclusion'
                ? ['label' => (string) ($entry['label'] ?? '')]
                : ['question' => (string) ($entry['question'] ?? ''), 'answer' => (string) ($entry['answer'] ?? '')];
        }

        return null;
    }

    // ── Read-model builder ──────────────────────────────────────────────────

    /**
     * Pure backend read-model builder — the exact admin-facing shape
     * PackageManagerStep (Phase B) and tier consumers (Phase E) will read.
     * Performs no I/O: callers own fetching $storedManager (the sanitized
     * package_manager field) and the live pools, and pass them in.
     *
     * Operational facts only (locked, post-Phase-A-audit correction): no
     * presentation status, no notes, no summary. Phase B computes all of
     * that client-side via the existing evaluateModule path
     * (packageManagerItemModule + packageManagerSummaryModule), reading
     * module_transition/disabled/missing/platform_status straight off this
     * shape — exactly the inputs NoteContext already expects.
     *
     * @param  array<int, mixed> $inclusionPool cz_service_inclusions items
     * @param  array<int, mixed> $faqPool       cz_service_faqs items
     * @param  string $platformStatus service/package platform_status ('active'|'disabled')
     * @return array{service_id: int, platform_status: string, has_configuration: bool, groups: array, items: array, projections: array}
     */
    // ===================================================================
    // SECTION: MANAGER_READ_MODEL
    // ===================================================================
    public static function buildReadModel(
        int $serviceId,
        array $storedManager,
        array $inclusionPool,
        array $faqPool,
        string $platformStatus
    ): array {
        $groups = $storedManager['groups'] ?? [];
        $items  = self::reconcileItems($storedManager['items'] ?? [], $inclusionPool, $faqPool);
        // A source used by ANY Rate Sheet is auto-settled for Tier consumption.
        $rateSheetSourceItemIds = [];
        foreach (is_array($storedManager['rate_sheets'] ?? null) ? $storedManager['rate_sheets'] : [] as $sheet) {
            foreach (is_array($sheet['items'] ?? null) ? $sheet['items'] : [] as $rateItem) {
                $sourceItemId = (string) ($rateItem['source_item_id'] ?? '');
                if ($sourceItemId !== '') { $rateSheetSourceItemIds[$sourceItemId] = true; }
            }
        }
        $rateSheetSourceIds = $rateSheetSourceItemIds;

        $outItems = [];
        foreach ($items as $item) {
            // Commercial configuration is the relationship decision. A source
            // used by the Rate Sheet must not require a second, legacy Manager
            // item-settle action before Tiers and pricing can consume it.
            if (isset($rateSheetSourceIds[$item['item_id']])) {
                $item['module_transition'] = 'settled';
            }
            $matchingSources = self::countSourceMatches($item['source_type'], $item['source_id'], $inclusionPool, $faqPool);
            $resolved = $matchingSources === 1
                ? self::resolveSourceContent($item['source_type'], $item['source_id'], $inclusionPool, $faqPool)
                : null;
            $sourceAvailable = self::sourceAvailability($item['source_type'], $item['source_id'], $inclusionPool, $faqPool);
            $operational = self::deriveOperationalState($item, $matchingSources, $platformStatus, $sourceAvailable);
            $provenance = self::sourceProvenance($item['source_type'], $item['source_id'], $inclusionPool, $faqPool);

            $outItems[] = [
                'item_id'           => $item['item_id'],
                'source_type'       => $item['source_type'],
                'source_id'         => $item['source_id'],
                'resolved'          => $resolved, // null when missing
                'decorated_label'   => $item['decorated_label'],
                'group_id'          => $item['group_id'],
                'sort_order'        => $item['sort_order'],
                'disabled'          => $item['disabled'],
                'missing'           => $item['missing'],
                'connection_resolved'=> $operational['resolved'],
                'available'         => $operational['available'],
                'operational_state' => $operational['operational_state'],
                'health_reasons'    => $operational['health_reasons'],
                'module_transition' => $item['module_transition'],
                // Live-resolved supplying-Service provenance (admin read model
                // only — never enters commercial projections): drives the Rate
                // Sheet filters and the group dependency guard.
                'source_service_id'    => $provenance['service_id'],
                'source_service_title' => $provenance['service_title'],
                'source_categories'    => $provenance['categories'],
                // The permanent identity behind the two display facets above:
                // the supplying Service's CZS and the CZC of each category-role
                // term it carries. Output-only, resolved live like the rest of
                // the provenance block — a reader collating what a row
                // represents identifies by these, never by name or native id.
                'source_service_platform_id'   => $provenance['service_platform_id'],
                'source_category_platform_ids' => $provenance['category_platform_ids'],
                // Native Category identity, for COUNTING distinct Categories.
                // Resolution still happens by CZC above; this exists so a term
                // with no Platform ID yet is still counted as the Category it
                // is instead of vanishing from the tally.
                'source_category_term_ids'     => $provenance['category_term_ids'],
            ];
        }

        return [
            'service_id'        => $serviceId,
            'sources'           => $storedManager['sources'] ?? [],
            'platform_status'   => $platformStatus,
            'has_configuration' => self::hasConfiguration($storedManager),
            'groups'            => $groups,
            'category_groups'   => array_map(
                static fn(array $group): array => PackageCategoryGroups::projection($group),
                is_array($storedManager['category_groups'] ?? null) ? $storedManager['category_groups'] : []
            ),
            'items'             => $outItems,
            'rate_sheets'       => array_map(
                static function (array $sheet) use ($outItems): array {
                    $sheet['platform_id'] = (string) ($sheet['cz_platform_id'] ?? '');
                    unset($sheet['cz_platform_id']);
                    $sheet['groups'] = array_map(static function (array $group): array {
                        $group['platform_id'] = (string) ($group['cz_platform_id'] ?? '');
                        unset($group['cz_platform_id']);
                        return $group;
                    }, is_array($sheet['groups'] ?? null) ? $sheet['groups'] : []);
                    $consumerSources = [];
                    foreach ($outItems as $source) {
                        $consumerSources[(string) ($source['item_id'] ?? '')] = $source;
                    }
                    $projectRow = static function (array $item) use ($consumerSources): array {
                        $item['platform_id'] = (string) ($item['cz_platform_id'] ?? '');
                        unset($item['cz_platform_id']);
                        if (array_key_exists('rate_sheet_item_cz_platform_id', $item)) {
                            $item['rate_sheet_item_platform_id'] = (string) $item['rate_sheet_item_cz_platform_id'];
                            unset($item['rate_sheet_item_cz_platform_id']);
                        }
                        $item['price_options'] = array_map(static function (array $option): array {
                            $option['platform_id'] = (string) ($option['cz_platform_id'] ?? '');
                            unset($option['cz_platform_id']);
                            return $option;
                        }, is_array($item['price_options'] ?? null) ? $item['price_options'] : []);
                        $sourceItemId = (string) ($item['source_item_id'] ?? '');
                        if ($sourceItemId !== '' && isset($consumerSources[$sourceItemId])) {
                            $source = $consumerSources[$sourceItemId];
                            $item['resolved_label'] = $source['decorated_label']
                                ?: (($source['source_type'] ?? null) === 'faq'
                                    ? (string) ($source['resolved']['question'] ?? '')
                                    : (string) ($source['resolved']['label'] ?? ''));
                            foreach (['source_type', 'source_id', 'connection_resolved', 'available', 'operational_state', 'health_reasons'] as $field) {
                                $item[$field] = $source[$field] ?? null;
                            }
                        }
                        return $item;
                    };
                    // The rows this sheet offers: its own, plus one per active
                    // Bundle. They go into `items` — the rows every consumer
                    // already reads — so nothing downstream changes at all.
                    $offered = self::consumableRateSheetRows($sheet);
                    // A Bundle projects exactly like the sheet that owns it:
                    // output-only `platform_id`, same for its own rows.
                    $sheet['bundles'] = array_map(static function (array $bundle) use ($projectRow): array {
                        $bundle['platform_id'] = (string) ($bundle['cz_platform_id'] ?? '');
                        unset($bundle['cz_platform_id']);
                        $bundle['bundle_item_platform_id'] = (string) ($bundle['bundle_item_cz_platform_id'] ?? '');
                        unset($bundle['bundle_item_cz_platform_id']);
                        $bundle['compiled_item_platform_id'] = (string) ($bundle['compiled_item_cz_platform_id'] ?? '');
                        unset($bundle['compiled_item_cz_platform_id']);
                        $bundle['price_options'] = array_map(static function (array $option): array {
                            $option['platform_id'] = (string) ($option['cz_platform_id'] ?? '');
                            unset($option['cz_platform_id']);
                            return $option;
                        }, is_array($bundle['price_options'] ?? null) ? $bundle['price_options'] : []);
                        $bundle['items'] = array_map($projectRow, is_array($bundle['items'] ?? null) ? $bundle['items'] : []);
                        return $bundle;
                    }, is_array($sheet['bundles'] ?? null) ? $sheet['bundles'] : []);
                    $sheet['items'] = array_map($projectRow, $offered);
                    return $sheet;
                },
                is_array($storedManager['rate_sheets'] ?? null) ? $storedManager['rate_sheets'] : []
            ),
            // The full vocabulary a row's `per` may hold: the built-in seven
            // followed by whatever this Manager curated. The reader never infers
            // it from the rows it happens to see.
            'rate_sheet_units'  => self::allowedRateSheetUnits(
                self::sanitizeRateSheetUnits($storedManager['rate_sheet_units'] ?? [])
            ),
            'projections'       => self::buildConsumerProjections($outItems, $platformStatus),
        ];
    }

    /**
     * Supplying-Service provenance carried on pool entries by
     * PackageRepository::sourcePools (`_source_service_id` etc). Null-safe for
     * pools built without provenance (tests, legacy callers) and for missing
     * sources.
     *
     * @return array{service_id: int|null, service_title: string|null, categories: array<int, string>, service_platform_id: string, category_platform_ids: array<int, string>, category_term_ids: array<int, int>}
     */
    private static function sourceProvenance(string $sourceType, string $sourceId, array $inclusionPool, array $faqPool): array
    {
        $pool = $sourceType === 'inclusion' ? $inclusionPool : ($sourceType === 'faq' ? $faqPool : []);
        foreach ($pool as $entry) {
            if (!is_array($entry) || (string) ($entry['id'] ?? '') !== $sourceId) {
                continue;
            }
            return [
                'service_id'    => isset($entry['_source_service_id']) ? (int) $entry['_source_service_id'] : null,
                'service_title' => isset($entry['_source_service_title']) ? (string) $entry['_source_service_title'] : null,
                'categories'    => is_array($entry['_source_categories'] ?? null)
                    ? array_values(array_map('strval', $entry['_source_categories']))
                    : [],
                'service_platform_id' => isset($entry['_source_service_platform_id'])
                    ? (string) $entry['_source_service_platform_id']
                    : '',
                'category_platform_ids' => is_array($entry['_source_category_platform_ids'] ?? null)
                    ? array_values(array_map('strval', $entry['_source_category_platform_ids']))
                    : [],
                'category_term_ids' => is_array($entry['_source_category_term_ids'] ?? null)
                    ? array_values(array_map('intval', $entry['_source_category_term_ids']))
                    : [],
            ];
        }
        return [
            'service_id' => null,
            'service_title' => null,
            'categories' => [],
            'service_platform_id' => '',
            'category_platform_ids' => [],
            'category_term_ids' => [],
        ];
    }

    private static function countSourceMatches(
        string $sourceType,
        string $sourceId,
        array $inclusionPool,
        array $faqPool
    ): int {
        $pool = $sourceType === 'inclusion' ? $inclusionPool : ($sourceType === 'faq' ? $faqPool : []);
        $count = 0;
        foreach ($pool as $entry) {
            if (is_array($entry) && (string) ($entry['id'] ?? '') === $sourceId) {
                $count++;
            }
        }
        return $count;
    }

    private static function sourceAvailability(string $sourceType, string $sourceId, array $inclusionPool, array $faqPool): ?bool
    {
        $pool = $sourceType === 'inclusion' ? $inclusionPool : ($sourceType === 'faq' ? $faqPool : []);
        foreach ($pool as $entry) {
            if (is_array($entry) && (string) ($entry['id'] ?? '') === $sourceId) {
                return array_key_exists('_source_available', $entry) ? (bool) $entry['_source_available'] : null;
            }
        }
        return null;
    }

    /** Derive operational health without changing or persisting relationship data. */
    private static function deriveOperationalState(array $item, int $matchingSources, string $platformStatus, ?bool $sourceAvailable = null): array
    {
        if ($matchingSources > 1) {
            return [
                'resolved' => false,
                'available' => false,
                'operational_state' => 'ambiguous',
                'health_reasons' => ['multiple_source_matches'],
            ];
        }
        if ($matchingSources === 0) {
            return [
                'resolved' => false,
                'available' => false,
                'operational_state' => 'source_missing',
                'health_reasons' => ['source_missing'],
            ];
        }

        $reasons = [];
        if (($sourceAvailable ?? ($platformStatus === 'active')) === false) { $reasons[] = 'service_unavailable'; }
        if (($item['module_transition'] ?? null) !== 'settled') { $reasons[] = 'relationship_unsettled'; }
        if (!empty($item['disabled'])) { $reasons[] = 'relationship_disabled'; }

        return [
            'resolved' => true,
            'available' => $reasons === [],
            'operational_state' => $reasons === [] ? 'connected_available' : 'connected_unavailable',
            'health_reasons' => $reasons,
        ];
    }

    /** Resolve Tier-owned Rate Sheet references without copying catalogue data. */
    // ===================================================================
    // SECTION: RATE_SHEET_PROJECTION
    // ===================================================================
    public static function projectTierRateSheet(
        int $serviceId,
        array $storedManager,
        mixed $selections,
        array $inclusionPool,
        array $faqPool,
        string $platformStatus,
        ?string $rateSheetId = null,
        bool $contact = false
    ): array {
        $manager = self::sanitize($storedManager);
        $model = self::buildReadModel($serviceId, $manager, $inclusionPool, $faqPool, $platformStatus);
        return self::projectTierRateSheetWith($model, $selections, $rateSheetId, $contact);
    }

    /**
     * Resolve one Tier against an already-built Package Manager read model.
     * Public and collection projections use this entry point so the source
     * reconciliation model is built once per request, regardless of how many
     * assigned instances or Tier slots are projected.
     *
     * $contact is the occupant/Edition's own explicit "Contact Us" override —
     * distinct from Rate Sheet resolution. When true, the resolved rows/
     * inclusions still surface normally, but the numeric total is always
     * null, matching evaluateTierPricing's existing 'mode' => 'contact'
     * semantics rather than a second null-price code path.
     */
    public static function projectTierRateSheetWith(
        array $readModel,
        mixed $selections,
        ?string $rateSheetId = null,
        bool $contact = false
    ): array {
        // Row identity is (rate_sheet_id, item_id): resolve strictly within the
        // sheet the Tier names. A null/unknown sheet resolves nothing.
        $rateSheet = self::findRateSheet(
            is_array($readModel['rate_sheets'] ?? null) ? $readModel['rate_sheets'] : [],
            $rateSheetId
        );
        // What this sheet offers: its own priced rows plus one priced row per
        // Bundle. Resolved once, by the Rate Sheet, before anything is handed
        // to a consumer — so from here down there are only Rate Sheet rows.
        $rateSheetItemsList = is_array($rateSheet) ? ($rateSheet['items'] ?? []) : [];
        $rateItems = [];
        foreach ($rateSheetItemsList as $item) {
            $rateItems[$item['item_id']] = $item;
        }
        $rows = [];
        foreach (is_array($selections) ? $selections : [] as $selection) {
            if (!is_array($selection)) { continue; }
            $itemId = sanitize_text_field((string) ($selection['item_id'] ?? ''));
            if ($itemId === '') { continue; }
            $quantity = max(1, (int) ($selection['quantity'] ?? 1));
            $rawOptionId = $selection['price_option_id'] ?? null;
            $priceOptionId = ($rawOptionId === null || $rawOptionId === '') ? null : sanitize_text_field((string) $rawOptionId);
            $rateItem = $rateItems[$itemId] ?? null;
            $resolved = $rateItem !== null && !empty($rateItem['connection_resolved']);
            $label = '(unresolved Rate Sheet item)';
            if ($resolved) {
                $label = (string) ($rateItem['resolved_label'] ?? '');
                // A row may carry its own name (Bundle-created rows do); blank
                // inherits the resolved supplied-content label above.
                $ownLabel = trim((string) ($rateItem['label'] ?? ''));
                if ($ownLabel !== '') { $label = $ownLabel; }
            }
            // Effective unit price: the row's own Default Price unless a
            // price_option_id is present and resolves against that row's own
            // price_options[]. A present-but-unresolved id never falls back
            // to Default Price — it makes the row's price unavailable.
            $unitPrice = $rateItem !== null ? (float) $rateItem['unit_price'] : null;
            $optionUnresolved = false;
            if ($priceOptionId !== null) {
                $matchedOption = null;
                foreach ($rateItem['price_options'] ?? [] as $option) {
                    if (($option['option_id'] ?? null) === $priceOptionId) { $matchedOption = $option; break; }
                }
                if ($matchedOption !== null) {
                    $unitPrice = (float) $matchedOption['unit_price'];
                } else {
                    $optionUnresolved = true;
                    $unitPrice = null;
                }
            }
            $available = $resolved && !empty($rateItem['available']) && !$optionUnresolved;
            $lineTotal = $available && $unitPrice !== null ? $unitPrice * $quantity : null;
            $healthReasons = is_array($rateItem['health_reasons'] ?? null)
                ? $rateItem['health_reasons']
                : ['rate_sheet_item_unresolved'];
            if ($optionUnresolved) { $healthReasons = array_values(array_unique([...$healthReasons, 'price_option_unresolved'])); }
            $rows[] = [
                'item_id' => $itemId, 'quantity' => $quantity, 'resolved' => $resolved,
                'price_option_id' => $priceOptionId,
                'source_type' => $rateItem['source_type'] ?? null,
                'source_id' => $rateItem['source_id'] ?? null,
                'available' => $available,
                'operational_state' => $rateItem['operational_state'] ?? 'source_missing',
                'health_reasons' => $healthReasons,
                'label' => $label, 'unit_price' => $unitPrice,
                'per' => $rateItem['per'] ?? null,
                'group_id' => $rateItem['group_id'] ?? null,
                'line_total' => $lineTotal,
                // Present for a row that carries ingredients — the "Includes:"
                // list. Never chargeable lines of their own.
                'includes' => $rateItem['includes'] ?? null,
            ];
        }
        $rowsByItemId = [];
        foreach ($rows as $row) { $rowsByItemId[$row['item_id']] = $row; }
        $pricingItems = [];
        foreach ($rateSheetItemsList as $rateItem) {
            if (empty($rateItem['connection_resolved'])) { continue; }
            $row = $rowsByItemId[$rateItem['item_id']] ?? null;
            // A selected, resolving Price Option overrides the item's Default
            // Price fed to the shared pricing engine; an unresolved one makes
            // the item unavailable there too, so the total never silently
            // reverts to Default Price.
            $unitPriceForPricing = (float) $rateItem['unit_price'];
            $availableForPricing = !empty($rateItem['available']);
            if ($row !== null && $row['price_option_id'] !== null) {
                if ($row['unit_price'] !== null) {
                    $unitPriceForPricing = $row['unit_price'];
                } else {
                    $availableForPricing = false;
                }
            }
            $pricingItems[] = [
                'item_id' => $rateItem['item_id'],
                'unit_price' => $unitPriceForPricing,
                'available' => $availableForPricing,
                'options' => [],
            ];
        }
        $pricingSelections = array_map(
            fn(array $row): array => ['item_id' => $row['item_id'], 'quantity' => $row['quantity'], 'option_selections' => []],
            $rows
        );
        $pricing = PackageStationSchema::evaluateTierPricing(
            $pricingItems,
            $pricingSelections,
            $contact
        );
        $availableRows = array_values(array_filter($rows, fn(array $row): bool => $row['available']));
        return [
            'selections' => $rows,
            'price' => $rows === [] ? null : $pricing['total'],
            'valid_count' => count($availableRows),
            'pricing' => $pricing,
        ];
    }

    /**
     * Batch-apply projectTierRateSheetWith() to a list of rows that each
     * carry their own rate_sheet_id + rate_sheet_items (Tier Editions
     * today). No new pricing calculation — a thin wrapper around the one
     * existing projector, reused so a Tier occupant's own live price and a
     * Tier Edition's own live price share the exact same authority. Every
     * other key on each row passes through untouched.
     *
     * @param  array<int, array{rate_sheet_id?: ?string, rate_sheet_items?: array}> $editions
     * @return array<int, array>
     */
    public static function projectEditionPrices(array $readModel, array $editions): array
    {
        return array_map(function (array $edition) use ($readModel): array {
            $projection = self::projectTierRateSheetWith(
                $readModel,
                $edition['rate_sheet_items'] ?? [],
                $edition['rate_sheet_id'] ?? null,
                (bool) ($edition['contact'] ?? false)
            );
            $edition['price'] = $projection['price'];
            return $edition;
        }, $editions);
    }

    // ── Consumer projections ─────────────────────────────────────────────────

    /**
     * Tier-facing projections. Gate is operational facts only — no
     * presentation status involved, per the post-Phase-A-audit correction:
     *   module_transition === 'settled'
     *   AND platform_status === 'active'
     *   AND disabled === false
     *   AND missing === false
     *   AND source_type matches the requested consumer bucket
     * Pending, unsettled, missing, and explicitly-disabled items are never
     * selectable by a tier. Always keyed by source_id, never item_id — tier
     * storage must never learn a Manager item exists.
     *
     * @param  array<int, array> $readModelItems  the `items` array from buildReadModel()
     * @param  string $platformStatus service/package platform_status ('active'|'disabled')
     * @return array{inclusions: array<int, array{id: string, label: string}>, faqs: array<int, array{id: string, question: string, answer: string}>}
     */
    public static function buildConsumerProjections(array $readModelItems, string $platformStatus): array
    {
        $inclusions = [];
        $faqs       = [];

        foreach ($readModelItems as $item) {
            $eligible = ($item['module_transition'] ?? null) === 'settled'
                && $platformStatus === 'active'
                && empty($item['disabled'])
                && empty($item['missing']);

            if (!$eligible) {
                continue;
            }

            if ($item['source_type'] === 'inclusion') {
                $inclusions[] = [
                    'id'    => $item['source_id'],
                    'label' => $item['decorated_label'] ?? ($item['resolved']['label'] ?? ''),
                ];
            } elseif ($item['source_type'] === 'faq') {
                $faqs[] = [
                    'id'       => $item['source_id'],
                    'question' => $item['resolved']['question'] ?? '',
                    'answer'   => $item['resolved']['answer'] ?? '',
                ];
            }
        }

        return ['inclusions' => $inclusions, 'faqs' => $faqs];
    }
}
