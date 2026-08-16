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
            // Every sheet id present in this collection, gathered up front so a
            // Bundle's supplied-content reference can name a sheet OTHER than
            // the one that owns it — composing across sheets is the point.
            $rateSheetIds = [];
            foreach ($plural as $sheet) {
                if (!is_array($sheet)) { continue; }
                $sheetId = sanitize_text_field((string) ($sheet['rate_sheet_id'] ?? ''));
                if ($sheetId !== '') { $rateSheetIds[] = $sheetId; }
            }
            foreach ($plural as $sheet) {
                if (!is_array($sheet)) { continue; }
                $id = sanitize_text_field((string) ($sheet['rate_sheet_id'] ?? ''));
                if ($id === '' || isset($seen[$id])) { continue; }
                $core = self::sanitizeRateSheet($sheet, $allowedUnits, $rateSheetIds);
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
     * The upstream row id of a Bundle — an ordinary Rate Sheet row id. Used
     * ONLY to mint a NEW Bundle's row on the write path (commitConfiguration);
     * once minted, the row is a stored item like any other and this is never
     * recomputed. Deterministic (rather than randomly minted like
     * `mintRateSheetId()`) so a Bundle's row keeps one stable, predictable id
     * across the request that creates both records together.
     */
    public static function deriveBundleRowId(string $bundleId): string
    {
        return 'rate_' . substr(hash('sha256', 'bundle:' . $bundleId), 0, 16);
    }

    /**
     * What a Rate Sheet offers upstream: its own rows, minus any row backed
     * by an archived Bundle. A Bundle's commercial row is now a REAL member
     * of `items[]` (see `sanitizeRateRows()`'s `bundle_id` field and
     * `linkBundleRows()`), so there is nothing left to SYNTHESIZE here — only
     * this one filter remains, preserving the existing rule that an archived
     * Bundle offers nothing, mirroring an archived sheet. A row's own
     * existence in storage is untouched either way; archiving hides it from
     * what a Tier can select, exactly as it always has.
     *
     * @param  array $rateSheet one stored/projected sheet
     * @return array<int, array> priced rows, in offer order
     */
    public static function consumableRateSheetRows(array $rateSheet): array
    {
        $archivedBundleIds = [];
        foreach (is_array($rateSheet['bundles'] ?? null) ? $rateSheet['bundles'] : [] as $bundle) {
            if (!is_array($bundle)) { continue; }
            if ((string) ($bundle['status'] ?? 'active') === 'archived') {
                $archivedBundleIds[(string) ($bundle['bundle_id'] ?? '')] = true;
            }
        }
        $rows = [];
        foreach (is_array($rateSheet['items'] ?? null) ? $rateSheet['items'] : [] as $item) {
            if (!is_array($item)) { continue; }
            $bundleId = (string) ($item['bundle_id'] ?? '');
            if ($bundleId !== '' && isset($archivedBundleIds[$bundleId])) { continue; }
            $rows[] = $item;
        }
        return $rows;
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
     *
     * @param  array<int, string> $rateSheetIds every rate_sheet_id in the same
     *         submission/collection — needed only to validate a Bundle's
     *         supplied-content references, which may name a sheet other than
     *         this one.
     */
    private static function sanitizeRateSheet(mixed $rateSheet, ?array $allowedUnits = null, array $rateSheetIds = []): ?array
    {
        if (!is_array($rateSheet)) {
            return null;
        }

        $title = sanitize_text_field((string) ($rateSheet['title'] ?? ''));
        $groups = self::sanitizeGroups($rateSheet['groups'] ?? [], true);
        $groupIds = array_column($groups, 'group_id');
        $allowedUnits ??= self::BUILT_IN_RATE_SHEET_UNITS;

        $items = self::sanitizeRateRows($rateSheet['items'] ?? [], $groupIds, $allowedUnits);
        $bundles = self::linkBundleRows(
            $items,
            self::sanitizeRateSheetBundles($rateSheet['bundles'] ?? [], $rateSheetIds)
        );

        if ($title === '' && $groups === [] && $items === [] && $bundles === []) {
            return null;
        }
        return ['title' => $title, 'groups' => $groups, 'items' => $items, 'bundles' => $bundles];
    }

    /**
     * Priced Rate Sheet rows — a sheet's own `items[]`. A row backed by a
     * Bundle carries `bundle_id` — that Bundle's native id, or the reserved
     * sentinel `'new'` naming the ONE not-yet-minted Bundle being authored in
     * this same sheet's submission — instead of a Manager `source_item_id`.
     * Every other field (price, unit, quantity, group, `price_options[]`,
     * sort order, and an optional own `label`) is the SAME complete row shape
     * either way: a Bundle-backed row IS an ordinary Rate Sheet row, not a
     * lookalike, which is what lets a Tier select it by `item_id` alone with
     * no Bundle-shaped branch anywhere downstream.
     *
     * @param  string[] $groupIds
     * @param  array<int, string> $allowedUnits
     * @return array<int, array>
     */
    private static function sanitizeRateRows(mixed $items, array $groupIds, array $allowedUnits): array
    {
        $out  = [];
        $seen = [];
        foreach (is_array($items) ? $items : [] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $sourceItemId = sanitize_text_field((string) ($item['source_item_id'] ?? ''));
            $bundleId     = sanitize_text_field((string) ($item['bundle_id'] ?? ''));
            $itemId       = sanitize_text_field((string) ($item['item_id'] ?? ''));
            // A stored row KEEPS its id — Platform identity is bound to it, so
            // it is never recomputed. Only a Tool-curated row that carries a
            // Manager source but no id is derived here. A Bundle-backed row's
            // id is derived from its Bundle instead, once that Bundle actually
            // has an id (see deriveBundleRowId / linkBundleRows) — the
            // sentinel `'new'` deliberately leaves it blank here for
            // commitConfiguration to finish after minting.
            if ($itemId === '' && $sourceItemId !== '' && $bundleId === '') {
                $itemId = self::deriveRateItemId($sourceItemId);
            }
            if ($sourceItemId === '' && $bundleId === '') {
                continue; // neither a Manager source nor a Bundle backs this row — no identity to derive
            }
            // One row per source, or per Bundle. Keyed on the id once it
            // exists, and on whichever of the two backs it before then.
            $seenKey = $itemId !== '' ? $itemId : ($bundleId !== '' ? 'bundle:' . $bundleId : 'src:' . $sourceItemId);
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
            $out[] = [
                'item_id'        => $itemId,
                'cz_platform_id' => sanitize_text_field((string) ($item['cz_platform_id'] ?? '')),
                'source_item_id' => $sourceItemId,
                'bundle_id'      => $bundleId,
                // A row's own display name. Blank on an ordinary row, which
                // has never had one; the Bundle Name on a Bundle-backed row.
                'label'          => sanitize_text_field((string) ($item['label'] ?? '')),
                'unit_price'     => max(0, (float) ($item['unit_price'] ?? 0)),
                'per'            => $unit,
                'quantity'       => max(1, (int) ($item['quantity'] ?? 1)),
                'group_id'       => $groupId,
                'sort_order'     => (int) ($item['sort_order'] ?? 0),
                'price_options'  => self::sanitizePriceOptions($item['price_options'] ?? []),
                // What this row's own `unit_price` is CALLED. Display
                // configuration for the price already stored above — it mints
                // no identity, is never a `price_options[]` entry, and never
                // changes how a Tier selects that price (still the absence of
                // a `price_option_id`). Blank means the built-in name.
                'default_price_label' => sanitize_text_field((string) ($item['default_price_label'] ?? '')),
            ];
        }
        return $out;
    }

    /**
     * A sheet's Bundles — admin-composed authoring records. Each Bundle owns
     * ONE real Rate Sheet row (linked below by `linkBundleRows()`, never
     * trusted from input) and a list of live references to the exact Rate
     * Sheet rows it compiles (`supplied_content[]`, see
     * `sanitizeSuppliedContent()`). A Bundle is NOT a second Rate Sheet and
     * stores no pricing of its own: unit price, per, quantity, group, Price
     * Options and the Bundle Name all live on the linked row — the Bundle IS
     * that row commercially. `bundle_id` is passed through as submitted
     * (blank for a not-yet-minted Bundle) and minted on the write path only
     * (commitConfiguration), exactly like a price option's `option_id`; this
     * helper serves both the read and write paths, so it must never mint
     * here.
     *
     * @param  array<int, string> $rateSheetIds every rate_sheet_id present in
     *         this same submission/collection, so a supplied-content
     *         reference naming an unknown sheet fails closed rather than
     *         being trusted.
     * @return array<int, array{bundle_id:string,cz_platform_id:string,status:string,sort_order:int,item_id:string,supplied_content:array}>
     */
    private static function sanitizeRateSheetBundles(mixed $bundles, array $rateSheetIds): array
    {
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
            $out[] = [
                'bundle_id'        => $bundleId,
                'cz_platform_id'   => sanitize_text_field((string) ($bundle['cz_platform_id'] ?? '')),
                'status'           => self::sanitizeRateSheetStatus($bundle['status'] ?? null),
                'sort_order'       => (int) ($bundle['sort_order'] ?? $index),
                // Reconciled by linkBundleRows() immediately after this
                // returns — never trusted from input.
                'item_id'          => '',
                'supplied_content' => self::sanitizeSuppliedContent($bundle['supplied_content'] ?? [], $rateSheetIds),
            ];
        }
        usort($out, static fn(array $a, array $b): int => $a['sort_order'] <=> $b['sort_order']);
        return $out;
    }

    /**
     * One Bundle's live references to the exact Rate Sheet rows it compiles —
     * never a copy of them. `(source_rate_sheet_id, source_item_id)` names
     * the referenced row; `cz_platform_id` is this REFERENCE's own identity
     * (the Bundle-inclusion Platform ID, `CZPRCBI` — a child of the Bundle it
     * belongs to), not the referenced row's — that row keeps its own
     * `CZPRCI` completely untouched.
     *
     * A reference naming a sheet outside the current collection is dropped at
     * the door here. A reference naming a row that no longer exists in that
     * sheet is NOT filtered here — at this point rows from other sheets in
     * the same submission are not yet known to have survived their own
     * sanitisation — so that liveness check belongs to the write boundary
     * (`reconcileSuppliedContent()`, run once against the FINAL merged
     * collection) and the read projection instead.
     *
     * @param  array<int, string> $rateSheetIds
     * @return array<int, array{source_rate_sheet_id:string,source_item_id:string,cz_platform_id:string}>
     */
    private static function sanitizeSuppliedContent(mixed $entries, array $rateSheetIds): array
    {
        if (!is_array($entries)) {
            return [];
        }
        $out  = [];
        $seen = [];
        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $sourceRateSheetId = sanitize_text_field((string) ($entry['source_rate_sheet_id'] ?? ''));
            $sourceItemId      = sanitize_text_field((string) ($entry['source_item_id'] ?? ''));
            if ($sourceRateSheetId === '' || $sourceItemId === '' || !in_array($sourceRateSheetId, $rateSheetIds, true)) {
                continue;
            }
            $key = $sourceRateSheetId . "\0" . $sourceItemId;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = [
                'source_rate_sheet_id' => $sourceRateSheetId,
                'source_item_id'       => $sourceItemId,
                'cz_platform_id'       => sanitize_text_field((string) ($entry['cz_platform_id'] ?? '')),
            ];
        }
        return $out;
    }

    /**
     * Reconciles each Bundle's `item_id` against the ONE row in `items[]`
     * that carries a matching `bundle_id` — always re-derived here, never
     * trusted from input, so the two can never drift apart. A Bundle whose
     * row has not yet been minted in this same request (the row still
     * carries the `'new'` sentinel — see `sanitizeRateRows()`) resolves to a
     * blank `item_id`; `commitConfiguration` re-links a second time after
     * minting, once the sentinel has been resolved to a real id.
     *
     * @param  array<int, array> $items
     * @param  array<int, array> $bundles
     * @return array<int, array>
     */
    private static function linkBundleRows(array $items, array $bundles): array
    {
        $rowIdByBundleId = [];
        foreach ($items as $item) {
            $bundleId = (string) ($item['bundle_id'] ?? '');
            if ($bundleId === '' || isset($rowIdByBundleId[$bundleId])) {
                continue;
            }
            $rowIdByBundleId[$bundleId] = (string) ($item['item_id'] ?? '');
        }
        foreach ($bundles as &$bundle) {
            $bundle['item_id'] = $rowIdByBundleId[(string) $bundle['bundle_id']] ?? '';
        }
        unset($bundle);
        return $bundles;
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
        // Every sheet id in THIS submission, gathered up front for the same
        // reason sanitizeRateSheets() gathers it — a Bundle may reference a
        // row on a sheet other than the one it lives on.
        $submittedRateSheetIds = [];
        foreach (is_array($submittedRateSheets) ? $submittedRateSheets : [] as $submitted) {
            if (!is_array($submitted)) { continue; }
            $sheetId = sanitize_text_field((string) ($submitted['rate_sheet_id'] ?? ''));
            if ($sheetId !== '') { $submittedRateSheetIds[] = $sheetId; }
        }
        foreach (is_array($submittedRateSheets) ? $submittedRateSheets : [] as $submitted) {
            if (!is_array($submitted)) { continue; }
            $core = self::sanitizeRateSheet($submitted, $allowedUnits, $submittedRateSheetIds);
            if ($core === null) { continue; }
            // Write-path mint: a Bundle with no id is one the Tool just
            // created (mirrors the sheet's own blank-id mint just below).
            // Every row backing a not-yet-minted Bundle carries the reserved
            // sentinel `'new'` instead of a real bundle_id (it could not
            // derive one at sanitize time — its Bundle had no id yet).
            // Correlation is positional, by encounter order, so more than one
            // new Bundle can mint together in one request (e.g. duplicating a
            // sheet that carries several): the Kth newly-minted Bundle links
            // to the Kth `'new'`-sentinel row. A sentinel row past the last
            // newly-minted Bundle (malformed input) is left unresolved rather
            // than guessed at; linkBundleRows() below then simply finds no
            // Bundle for it.
            $newlyMintedBundleIds = [];
            foreach ($core['bundles'] as &$coreBundle) {
                if ($coreBundle['bundle_id'] === '') {
                    $coreBundle['bundle_id'] = self::mintBundleId();
                    $newlyMintedBundleIds[] = $coreBundle['bundle_id'];
                }
            }
            unset($coreBundle);
            if ($newlyMintedBundleIds !== []) {
                $nextNewBundleIndex = 0;
                foreach ($core['items'] as &$coreItem) {
                    if ($coreItem['bundle_id'] !== 'new') { continue; }
                    $mintedBundleId = $newlyMintedBundleIds[$nextNewBundleIndex] ?? null;
                    if ($mintedBundleId === null) { continue; }
                    $nextNewBundleIndex++;
                    $coreItem['bundle_id'] = $mintedBundleId;
                    if ($coreItem['item_id'] === '') {
                        $coreItem['item_id'] = self::deriveBundleRowId($mintedBundleId);
                    }
                }
                unset($coreItem);
            }
            // Every row's Price Options mint exactly the same way whether the
            // row is an ordinary one or a Bundle's own — it is just another
            // row, with no second mint path.
            foreach ($core['items'] as &$coreItem) {
                foreach ($coreItem['price_options'] as &$coreOption) {
                    if ($coreOption['option_id'] === '') { $coreOption['option_id'] = self::mintOptionId(); }
                }
                unset($coreOption);
            }
            unset($coreItem);
            // Re-link now that every Bundle and every Bundle-backed row in
            // this sheet has a real id.
            $core['bundles'] = self::linkBundleRows($core['items'], $core['bundles']);
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
            // Bundle identity carries forward on its own two keys — the
            // Bundle itself and each supplied-content reference — never
            // borrowed from the row it now links to (that row's own identity
            // already carried forward above, as just another item) or from
            // the sheet's own row of the same supplied content.
            $existingBundles = [];
            $existingSuppliedContent = [];
            foreach (is_array($existingSheet['bundles'] ?? null) ? $existingSheet['bundles'] : [] as $bundle) {
                if (!is_array($bundle)) { continue; }
                $existingBundleId = (string) ($bundle['bundle_id'] ?? '');
                if ($existingBundleId === '') { continue; }
                $existingBundles[$existingBundleId] = (string) ($bundle['cz_platform_id'] ?? '');
                foreach (is_array($bundle['supplied_content'] ?? null) ? $bundle['supplied_content'] : [] as $reference) {
                    if (!is_array($reference)) { continue; }
                    $refKey = $existingBundleId . "\0" . (string) ($reference['source_rate_sheet_id'] ?? '') . "\0" . (string) ($reference['source_item_id'] ?? '');
                    $existingSuppliedContent[$refKey] = (string) ($reference['cz_platform_id'] ?? '');
                }
            }
            foreach ($reconciled['bundles'] as &$bundle) {
                $bundleKey = (string) $bundle['bundle_id'];
                $bundle['cz_platform_id'] = $existingBundles[$bundleKey] ?? '';
                foreach ($bundle['supplied_content'] as &$reference) {
                    $refKey = $bundleKey . "\0" . (string) $reference['source_rate_sheet_id'] . "\0" . (string) $reference['source_item_id'];
                    $reference['cz_platform_id'] = $existingSuppliedContent[$refKey] ?? '';
                }
                unset($reference);
            }
            unset($bundle);
            $sheetsById[$id] = $reconciled;
        }
        foreach (is_array($rateSheetDeletions) ? $rateSheetDeletions : [] as $deleteId) {
            $deleteId = sanitize_text_field((string) $deleteId);
            if ($deleteId !== '') { unset($sheetsById[$deleteId]); }
        }

        // Phase 5 — drop any Bundle's supplied-content reference whose source
        // row is now gone from the FINAL collection (its own sheet deleted
        // just above, or the row itself removed from a sheet — touched by
        // this request or not). The dependency is one-way: this never
        // touches the Bundle itself, its own row, or any other reference.
        $rateSheets = self::reconcileSuppliedContent(array_values($sheetsById));

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
     * Reconcile one curated Rate Sheet at the write boundary. A stale
     * supplied-content ROW — the sheet's own, Manager-sourced kind, whose
     * source resolves in neither the live pool nor persisted items — is
     * dropped so legacy unresolved rows are permanently cleaned; sort_order
     * is re-indexed per sheet. Independent curation — this never onboards a
     * source the admin did not add to this sheet.
     *
     * A Bundle-backed row is never subject to that check: it has no Manager
     * source to resolve, and its own liveness is simply "does this record
     * still exist," unconditionally true here. Whether ITS supplied-content
     * REFERENCES still resolve against a live Rate Sheet row is a separate,
     * later reconciliation — `reconcileSuppliedContent()`, run once against
     * the FINAL merged collection, not per-sheet like this one.
     */
    private static function reconcileRateSheetRows(
        string $rateSheetId,
        string $status,
        array $core,
        array $liveIds,
        array $persistedById
    ): array {
        $keep = static fn(array $rateItem): bool => $rateItem['bundle_id'] !== ''
            || isset($liveIds[$rateItem['source_item_id']])
            || isset($persistedById[$rateItem['source_item_id']]);

        $items = array_values(array_filter($core['items'], $keep));
        foreach ($items as $index => &$rateItem) {
            $rateItem['sort_order'] = $index;
        }
        unset($rateItem);

        return [
            'rate_sheet_id' => $rateSheetId,
            'cz_platform_id'=> '',
            'title'         => $core['title'],
            'status'        => $status,
            'groups'        => $core['groups'],
            'items'         => $items,
            'bundles'       => $core['bundles'] ?? [],
        ];
    }

    /**
     * Live composition reconciliation: a Bundle's supplied-content reference
     * survives only as long as the row it names does. Run against the FINAL
     * merged collection (every sheet, deletions already applied) so a
     * reference naming a row on a sheet this request never touched still
     * resolves correctly — the source may be untouched, or it may be the one
     * that just changed. A reference whose row is gone is silently dropped,
     * never left dangling in storage and never a placeholder; the Bundle
     * itself, its own row, and every OTHER reference are untouched — the
     * dependency is one-way. The caller's own old-vs-new identity diff
     * (PackageStationController::savePackageStationManager) tombstones the
     * dropped reference's CZPRCBI as a plain consequence of it no longer
     * appearing here, with no separate mechanism of its own.
     */
    private static function reconcileSuppliedContent(array $rateSheets): array
    {
        $liveRowKeys = [];
        foreach ($rateSheets as $sheet) {
            $sheetId = (string) ($sheet['rate_sheet_id'] ?? '');
            foreach (is_array($sheet['items'] ?? null) ? $sheet['items'] : [] as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $liveRowKeys[$sheetId . "\0" . (string) ($item['item_id'] ?? '')] = true;
            }
        }
        foreach ($rateSheets as &$sheet) {
            foreach ($sheet['bundles'] as &$bundle) {
                $bundle['supplied_content'] = array_values(array_filter(
                    $bundle['supplied_content'],
                    static fn(array $reference): bool => isset($liveRowKeys[
                        (string) ($reference['source_rate_sheet_id'] ?? '') . "\0" . (string) ($reference['source_item_id'] ?? '')
                    ])
                ));
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
        // A Bundle-backed row carries no `source_item_id` of its own (it is
        // self-priced), so it contributes nothing here — the Manager source
        // BEHIND one of its supplied-content references is already settled by
        // this same loop, via that reference's own sheet row, in its own right.
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
            'rate_sheets'       => self::projectRateSheets($storedManager, $outItems),
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
     * Projects every stored sheet for the read model: output-only
     * `platform_id` throughout, and — the one Bundle-specific step — each
     * Bundle-backed row gains `self_priced` and a live-resolved `includes[]`
     * of what its Bundle currently compiles.
     *
     * A Bundle's supplied-content references may name a row on a DIFFERENT
     * sheet than the one the Bundle lives on (composing across sheets is the
     * point), so resolving what a Bundle compiles needs a cross-sheet index
     * of every stored row, built once here rather than per Bundle.
     *
     * A reference naming a row that no longer resolves against that index is
     * silently absent from `includes[]` — never a placeholder, never
     * "(missing source) — Unavailable", mirroring how a stale Manager-sourced
     * row is reconciled by reconcileItems() above rather than by a separate
     * pass. `reconcileSuppliedContent()` prunes the SAME dangling reference
     * from storage at the write boundary; this is only the read-time mirror.
     *
     * @param  array<int, mixed> $outItems this same call's own already-resolved
     *         Manager items, for looking up a referenced row's label the exact
     *         same way an ordinary row's is resolved.
     * @return array<int, array>
     */
    private static function projectRateSheets(array $storedManager, array $outItems): array
    {
        $rateSheets = is_array($storedManager['rate_sheets'] ?? null) ? $storedManager['rate_sheets'] : [];

        $rowsBySheetAndId = [];
        foreach ($rateSheets as $sheet) {
            if (!is_array($sheet)) { continue; }
            $sheetId = (string) ($sheet['rate_sheet_id'] ?? '');
            foreach (is_array($sheet['items'] ?? null) ? $sheet['items'] : [] as $row) {
                if (!is_array($row)) { continue; }
                $rowsBySheetAndId[$sheetId . "\0" . (string) ($row['item_id'] ?? '')] = $row;
            }
        }
        $labelByManagerItemId = [];
        foreach ($outItems as $outItem) {
            $labelByManagerItemId[$outItem['item_id']] = $outItem['decorated_label']
                ?: (($outItem['source_type'] === 'faq')
                    ? (string) ($outItem['resolved']['question'] ?? '')
                    : (string) ($outItem['resolved']['label'] ?? ''));
        }
        // A row's own display label: its own `label` when it has one (every
        // Bundle-backed row does — its Bundle Name), otherwise the Manager
        // source's resolved label, the same rule the frontend's
        // rowDisplayLabel() applies.
        $resolveRowLabel = static function (array $row) use ($labelByManagerItemId): string {
            $own = trim((string) ($row['label'] ?? ''));
            if ($own !== '') { return $own; }
            return $labelByManagerItemId[(string) ($row['source_item_id'] ?? '')] ?? '(missing source)';
        };

        return array_map(
            static function (array $sheet) use ($rowsBySheetAndId, $resolveRowLabel): array {
                $sheet['platform_id'] = (string) ($sheet['cz_platform_id'] ?? '');
                unset($sheet['cz_platform_id']);
                $sheet['groups'] = array_map(static function (array $group): array {
                    $group['platform_id'] = (string) ($group['cz_platform_id'] ?? '');
                    unset($group['cz_platform_id']);
                    return $group;
                }, is_array($sheet['groups'] ?? null) ? $sheet['groups'] : []);

                // Every Bundle's compiled composition, resolved once per sheet
                // rather than once per row.
                $includesByBundleId = [];
                foreach (is_array($sheet['bundles'] ?? null) ? $sheet['bundles'] : [] as $bundle) {
                    if (!is_array($bundle)) { continue; }
                    $includes = [];
                    foreach (is_array($bundle['supplied_content'] ?? null) ? $bundle['supplied_content'] : [] as $reference) {
                        if (!is_array($reference)) { continue; }
                        $sourceRateSheetId = (string) ($reference['source_rate_sheet_id'] ?? '');
                        $sourceItemId      = (string) ($reference['source_item_id'] ?? '');
                        $sourceRow = $rowsBySheetAndId[$sourceRateSheetId . "\0" . $sourceItemId] ?? null;
                        if ($sourceRow === null) { continue; }
                        $includes[] = [
                            'item_id'              => (string) ($sourceRow['item_id'] ?? ''),
                            'cz_platform_id'       => (string) ($sourceRow['cz_platform_id'] ?? ''),
                            'source_rate_sheet_id' => $sourceRateSheetId,
                            'source_item_id'       => $sourceItemId,
                            'label'                => $resolveRowLabel($sourceRow),
                            'quantity'             => (int) ($sourceRow['quantity'] ?? 1),
                        ];
                    }
                    $includesByBundleId[(string) ($bundle['bundle_id'] ?? '')] = $includes;
                }

                $sheet['bundles'] = array_map(static function (array $bundle): array {
                    $bundle['platform_id'] = (string) ($bundle['cz_platform_id'] ?? '');
                    unset($bundle['cz_platform_id']);
                    $bundle['supplied_content'] = array_map(static function (array $reference): array {
                        $reference['platform_id'] = (string) ($reference['cz_platform_id'] ?? '');
                        unset($reference['cz_platform_id']);
                        return $reference;
                    }, is_array($bundle['supplied_content'] ?? null) ? $bundle['supplied_content'] : []);
                    return $bundle;
                }, is_array($sheet['bundles'] ?? null) ? $sheet['bundles'] : []);

                $sheet['items'] = array_map(
                    static function (array $item) use ($includesByBundleId): array {
                        $item['platform_id'] = (string) ($item['cz_platform_id'] ?? '');
                        unset($item['cz_platform_id']);
                        $item['price_options'] = array_map(static function (array $option): array {
                            $option['platform_id'] = (string) ($option['cz_platform_id'] ?? '');
                            unset($option['cz_platform_id']);
                            return $option;
                        }, is_array($item['price_options'] ?? null) ? $item['price_options'] : []);
                        // A Bundle-backed row draws its availability from
                        // itself, not from a Manager source — a combination
                        // is not itself a Service inclusion — and carries its
                        // compiled composition for the "Includes:"
                        // presentation only. consumableRateSheetRows() never
                        // offers those ingredients as separately chargeable
                        // rows of their own.
                        $bundleId = (string) ($item['bundle_id'] ?? '');
                        if ($bundleId !== '') {
                            $item['self_priced'] = true;
                            $item['includes']    = $includesByBundleId[$bundleId] ?? [];
                        }
                        return $item;
                    },
                    self::consumableRateSheetRows($sheet)
                );
                return $sheet;
            },
            $rateSheets
        );
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
        $sources = [];
        foreach (is_array($readModel['items'] ?? null) ? $readModel['items'] : [] as $item) {
            $sources[$item['item_id']] = $item;
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
            $source = $rateItem ? ($sources[$rateItem['source_item_id']] ?? null) : null;
            // A self-priced row stands behind itself: no Manager source backs a
            // combination, so it resolves on its own existence and names itself.
            $selfPriced = $rateItem !== null && !empty($rateItem['self_priced']);
            $resolved = $rateItem !== null
                && ($selfPriced || ($source !== null && !empty($source['connection_resolved'])));
            $label = '(unresolved Rate Sheet item)';
            if ($resolved) {
                $label = $selfPriced
                    ? (string) ($rateItem['label'] ?? '')
                    : ($source['decorated_label']
                        ?: (($source['source_type'] === 'faq')
                            ? (string) ($source['resolved']['question'] ?? '')
                            : (string) ($source['resolved']['label'] ?? '')));
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
            $available = $resolved && ($selfPriced || !empty($source['available'])) && !$optionUnresolved;
            $lineTotal = $available && $unitPrice !== null ? $unitPrice * $quantity : null;
            $healthReasons = $selfPriced ? [] : ($source['health_reasons'] ?? ['rate_sheet_item_unresolved']);
            if ($optionUnresolved) { $healthReasons = array_values(array_unique([...$healthReasons, 'price_option_unresolved'])); }
            $rows[] = [
                'item_id' => $itemId, 'quantity' => $quantity, 'resolved' => $resolved,
                'price_option_id' => $priceOptionId,
                'source_type' => $source['source_type'] ?? null,
                'source_id' => $source['source_id'] ?? null,
                'available' => $available,
                'operational_state' => $selfPriced
                    ? 'connected_available'
                    : ($source['operational_state'] ?? 'source_missing'),
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
            $selfPricedItem = !empty($rateItem['self_priced']);
            $source = $sources[$rateItem['source_item_id']] ?? null;
            if (!$selfPricedItem && ($source === null || empty($source['connection_resolved']))) { continue; }
            $row = $rowsByItemId[$rateItem['item_id']] ?? null;
            // A selected, resolving Price Option overrides the item's Default
            // Price fed to the shared pricing engine; an unresolved one makes
            // the item unavailable there too, so the total never silently
            // reverts to Default Price.
            $unitPriceForPricing = (float) $rateItem['unit_price'];
            $availableForPricing = $selfPricedItem || !empty($source['available']);
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
