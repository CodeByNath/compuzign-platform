<?php

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
 * AdminServicesController's station-default array and read/write paths, not
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
    public const ALLOWED_SOURCE_TYPES       = ['inclusion', 'faq'];
    public const ALLOWED_MODULE_TRANSITIONS = ['not-configured', 'pending', 'settled'];
    public const OPERATIONAL_STATES         = ['connected_available', 'connected_unavailable', 'source_missing', 'ambiguous'];

    // ── Storage sanitizers ──────────────────────────────────────────────────

    /**
     * Sanitise inbound package_manager data. Returns a fully-shaped array
     * regardless of input quality. Items here are PERSISTED rows only — an
     * item that has never been saved/settled has no row here at all; it is
     * synthesized provisionally by reconcileItems() at read time instead
     * (Option A from the accepted Phase A audit: no write-on-read).
     *
     * @param  mixed $data
     * @return array{groups: array<int, array>, items: array<int, array>, rate_sheet: array|null}
     */
    public static function sanitize(mixed $data): array
    {
        if (!is_array($data)) {
            $data = [];
        }

        $groups   = self::sanitizeGroups($data['groups'] ?? []);
        $groupIds = array_column($groups, 'group_id');

        return [
            'groups' => $groups,
            'items'  => self::sanitizeItems($data['items'] ?? [], $groupIds),
            'rate_sheet' => self::sanitizeRateSheet($data['rate_sheet'] ?? null),
        ];
    }

    /** @return array{groups: array, items: array, rate_sheet: null} */
    public static function defaultManager(): array
    {
        return ['groups' => [], 'items' => [], 'rate_sheet' => null];
    }

    /**
     * Whether the stored Manager contains any Manager-owned configuration.
     * Reconciled source rows are deliberately not considered: they are
     * provisional read-model material and do not exist in $storedManager.
     */
    public static function hasConfiguration(array $storedManager): bool
    {
        return !empty($storedManager['groups']) || !empty($storedManager['items']) || !empty($storedManager['rate_sheet']);
    }

    /**
     * Rate Sheet groups are catalogue-owned and deliberately separate from
     * relationship Groups. Option identity points at a canonical reconciled
     * Package Manager item; the Rate Sheet never copies source labels.
     */
    private static function sanitizeRateSheet(mixed $rateSheet): ?array
    {
        if (!is_array($rateSheet)) {
            return null;
        }

        $title = sanitize_text_field((string) ($rateSheet['title'] ?? ''));
        $groups = self::sanitizeGroups($rateSheet['groups'] ?? []);
        $groupIds = array_column($groups, 'group_id');
        $items = [];
        $seen = [];
        $allowedUnits = ['Per VM', 'Per GB', 'Per TB', 'Per vCPU', 'Per user', 'Per month', 'Per item'];

        foreach (is_array($rateSheet['items'] ?? null) ? $rateSheet['items'] : [] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $itemId = sanitize_text_field((string) ($item['item_id'] ?? ''));
            $sourceItemId = sanitize_text_field((string) ($item['source_item_id'] ?? ''));
            if ($itemId === '' || $sourceItemId === '' || isset($seen[$itemId])) {
                continue;
            }
            $seen[$itemId] = true;
            $unit = sanitize_text_field((string) ($item['per'] ?? ''));
            if (!in_array($unit, $allowedUnits, true)) {
                $unit = '';
            }
            $groupId = sanitize_text_field((string) ($item['group_id'] ?? ''));
            if ($groupId === '' || !in_array($groupId, $groupIds, true)) {
                $groupId = null;
            }
            $items[] = [
                'item_id'       => $itemId,
                'source_item_id'=> $sourceItemId,
                'unit_price'    => max(0, (float) ($item['unit_price'] ?? 0)),
                'per'           => $unit,
                'quantity'      => max(1, (int) ($item['quantity'] ?? 1)),
                'group_id'      => $groupId,
                'sort_order'    => (int) ($item['sort_order'] ?? 0),
            ];
        }

        if ($title === '' && $groups === [] && $items === []) {
            return null;
        }
        return ['title' => $title, 'groups' => $groups, 'items' => $items];
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
    private static function sanitizeGroups(mixed $groups): array
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
            $out[] = [
                'group_id'   => $id,
                'label'      => sanitize_text_field((string) ($g['label'] ?? '')),
                'sort_order' => (int) ($g['sort_order'] ?? 0),
            ];
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
    public static function commitConfiguration(
        array $storedManager,
        mixed $submittedGroups,
        mixed $submittedDecisions,
        array $inclusionPool,
        array $faqPool,
        mixed $submittedRateSheet = null
    ): array {
        if (!is_array($submittedGroups) || !is_array($submittedDecisions)) {
            throw new \InvalidArgumentException('Groups and item decisions must be arrays.');
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

        $rateSheet = self::sanitizeRateSheet($submittedRateSheet);
        foreach ($rateSheet['items'] ?? [] as $rateItem) {
            $sourceItemId = $rateItem['source_item_id'];
            if (!isset($liveIds[$sourceItemId]) && !isset($persistedById[$sourceItemId])) {
                throw new \InvalidArgumentException('Rate Sheet item does not reference a current or persisted Package relationship.');
            }
        }

        return self::sanitize([
            'groups' => $groups,
            'items' => $items,
            'rate_sheet' => $rateSheet,
        ]);
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
    public static function buildReadModel(
        int $serviceId,
        array $storedManager,
        array $inclusionPool,
        array $faqPool,
        string $platformStatus
    ): array {
        $groups = $storedManager['groups'] ?? [];
        $items  = self::reconcileItems($storedManager['items'] ?? [], $inclusionPool, $faqPool);

        $outItems = [];
        foreach ($items as $item) {
            $matchingSources = self::countSourceMatches($item['source_type'], $item['source_id'], $inclusionPool, $faqPool);
            $resolved = $matchingSources === 1
                ? self::resolveSourceContent($item['source_type'], $item['source_id'], $inclusionPool, $faqPool)
                : null;
            $operational = self::deriveOperationalState($item, $matchingSources, $platformStatus);

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
            ];
        }

        return [
            'service_id'        => $serviceId,
            'platform_status'   => $platformStatus,
            'has_configuration' => self::hasConfiguration($storedManager),
            'groups'            => $groups,
            'items'             => $outItems,
            'rate_sheet'        => $storedManager['rate_sheet'] ?? null,
            'projections'       => self::buildConsumerProjections($outItems, $platformStatus),
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

    /** Derive operational health without changing or persisting relationship data. */
    private static function deriveOperationalState(array $item, int $matchingSources, string $platformStatus): array
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
        if ($platformStatus !== 'active') { $reasons[] = 'service_unavailable'; }
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
    public static function projectTierRateSheet(
        int $serviceId,
        array $storedManager,
        mixed $selections,
        array $inclusionPool,
        array $faqPool,
        string $platformStatus
    ): array {
        $manager = self::sanitize($storedManager);
        $model = self::buildReadModel($serviceId, $manager, $inclusionPool, $faqPool, $platformStatus);
        $rateItems = [];
        foreach ($manager['rate_sheet']['items'] ?? [] as $item) {
            $rateItems[$item['item_id']] = $item;
        }
        $sources = [];
        foreach ($model['items'] as $item) {
            $sources[$item['item_id']] = $item;
        }
        $rows = [];
        foreach (is_array($selections) ? $selections : [] as $selection) {
            if (!is_array($selection)) { continue; }
            $itemId = sanitize_text_field((string) ($selection['item_id'] ?? ''));
            if ($itemId === '') { continue; }
            $quantity = max(1, (int) ($selection['quantity'] ?? 1));
            $rateItem = $rateItems[$itemId] ?? null;
            $source = $rateItem ? ($sources[$rateItem['source_item_id']] ?? null) : null;
            $resolved = $rateItem !== null && $source !== null && !empty($source['connection_resolved']);
            $available = $resolved && !empty($source['available']);
            $label = '(unresolved Rate Sheet item)';
            if ($resolved) {
                $label = $source['decorated_label']
                    ?: (($source['source_type'] === 'faq')
                        ? (string) ($source['resolved']['question'] ?? '')
                        : (string) ($source['resolved']['label'] ?? ''));
            }
            $unitPrice = $rateItem !== null ? (float) $rateItem['unit_price'] : null;
            $lineTotal = $available && $unitPrice !== null ? $unitPrice * $quantity : null;
            $rows[] = [
                'item_id' => $itemId, 'quantity' => $quantity, 'resolved' => $resolved,
                'available' => $available,
                'operational_state' => $source['operational_state'] ?? 'source_missing',
                'health_reasons' => $source['health_reasons'] ?? ['rate_sheet_item_unresolved'],
                'label' => $label, 'unit_price' => $unitPrice,
                'per' => $rateItem['per'] ?? null,
                'group_id' => $rateItem['group_id'] ?? null,
                'line_total' => $lineTotal,
            ];
        }
        $pricingItems = [];
        foreach ($manager['rate_sheet']['items'] ?? [] as $rateItem) {
            $source = $sources[$rateItem['source_item_id']] ?? null;
            if ($source === null || empty($source['connection_resolved'])) { continue; }
            $pricingItems[] = [
                'item_id' => $rateItem['item_id'],
                'unit_price' => (float) $rateItem['unit_price'],
                'available' => !empty($source['available']),
                'options' => [],
            ];
        }
        $pricingSelections = array_map(
            fn(array $row): array => ['item_id' => $row['item_id'], 'quantity' => $row['quantity'], 'option_selections' => []],
            $rows
        );
        $pricing = \CompuZign\Platform\Modules\Packages\Support\PackageStationSchema::evaluateTierPricing(
            $pricingItems,
            $pricingSelections,
            false
        );
        $availableRows = array_values(array_filter($rows, fn(array $row): bool => $row['available']));
        return [
            'selections' => $rows,
            'price' => $rows === [] ? null : $pricing['total'],
            'valid_count' => count($availableRows),
            'pricing' => $pricing,
        ];
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
