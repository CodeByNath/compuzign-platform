<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageToolRegistry;

/**
 * PackageCategoryGroups — the Package Family station collection.
 *
 * A Package Family (e.g. KAIROS) is the Package-owned permanent
 * commercial bucket that Services are connected to. It is NOT a Service
 * Category and never replaces one: Services keep their own Service
 * Categories; membership is recorded as `category_group_id` on the Package
 * Station's source relationships, never on the Service itself.
 *
 * Storage: `package_manager.category_groups` inside the single
 * `cz_package_station` option (PackageRepository is the storage authority).
 * This class is pure — no I/O; callers load/save the station.
 *
 * Lifecycle: delegated entirely to the shared StationLifecycle engine
 * (born disabled, publish/toggle/archive/trash/restore/delete), with the
 * same overview draft → settle/revert module mechanics as the Category and
 * Service Category Group taxonomy stations. No custom lifecycle vocabulary exists
 * here.
 */
final class PackageCategoryGroups
{
    /** @return array<int, array<string, mixed>> */
    public static function sanitizeAll(mixed $groups): array
    {
        if (!is_array($groups)) {
            return [];
        }

        $out  = [];
        $seen = [];
        foreach ($groups as $group) {
            if (!is_array($group)) {
                continue;
            }
            $id = sanitize_text_field((string) ($group['group_id'] ?? ''));
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;

            $status = sanitize_text_field((string) ($group['platform_status'] ?? StationLifecycle::STATUS_DISABLED));
            if (!StationLifecycle::isValidStatus($status)) {
                $status = StationLifecycle::STATUS_DISABLED;
            }

            $previous = $group['previous_platform_status'] ?? null;
            $previous = is_string($previous) && StationLifecycle::isLive($previous) ? $previous : null;

            $overview = sanitize_text_field((string) ($group['module_status']['overview'] ?? StationLifecycle::MODULE_PENDING));
            if (!in_array($overview, StationLifecycle::MODULE_STATUSES, true)) {
                $overview = StationLifecycle::MODULE_PENDING;
            }

            $draft = null;
            if (is_array($group['overview_draft'] ?? null)) {
                $draft = [
                    'label'       => sanitize_text_field((string) ($group['overview_draft']['label'] ?? '')),
                    'description' => self::textarea((string) ($group['overview_draft']['description'] ?? '')),
                ];
            }

            $out[] = [
                'group_id'                 => $id,
                'label'                    => sanitize_text_field((string) ($group['label'] ?? '')),
                'description'              => self::textarea((string) ($group['description'] ?? '')),
                'platform_status'          => $status,
                'previous_platform_status' => $previous,
                'module_status'            => ['overview' => $overview],
                'overview_draft'           => $draft,
                'tools'                    => self::sanitizeTools($group['tools'] ?? []),
                'sort_order'               => count($out),
            ];
        }
        return $out;
    }

    /** Set of valid group ids, for normalising source assignments. @return array<string, true> */
    public static function idSet(array $groups): array
    {
        $set = [];
        foreach ($groups as $group) {
            if (is_array($group) && is_string($group['group_id'] ?? null) && $group['group_id'] !== '') {
                $set[$group['group_id']] = true;
            }
        }
        return $set;
    }

    /**
     * Station create — born disabled with the overview module pending, exactly
     * matching the Service Category Group taxonomy station's create semantics.
     *
     * @return array{groups: array, group: array}
     */
    public static function create(array $groups, string $label, string $description = '', ?string $groupId = null): array
    {
        $label = sanitize_text_field($label);
        if ($label === '') {
            throw new \InvalidArgumentException('Package Family name is required.');
        }
        $groupId = $groupId !== null && $groupId !== ''
            ? sanitize_text_field($groupId)
            : 'pcg_' . substr(hash('sha256', $label . '|' . uniqid('', true)), 0, 16);
        if (isset(self::idSet($groups)[$groupId])) {
            throw new \InvalidArgumentException('Package Family identity already exists.');
        }

        $group = [
            'group_id'                 => $groupId,
            'label'                    => $label,
            'description'              => self::textarea($description),
            'platform_status'          => StationLifecycle::STATUS_DISABLED,
            'previous_platform_status' => null,
            'module_status'            => ['overview' => StationLifecycle::MODULE_PENDING],
            'overview_draft'           => null,
            'tools'                    => [],
            'sort_order'               => count($groups),
        ];

        return ['groups' => self::sanitizeAll([...$groups, $group]), 'group' => $group];
    }

    public static function find(array $groups, string $groupId): ?array
    {
        foreach ($groups as $group) {
            if (is_array($group) && ($group['group_id'] ?? null) === $groupId) {
                return $group;
            }
        }
        return null;
    }

    /** Replace one group row by identity; unknown identity is a no-op. */
    public static function replace(array $groups, array $next): array
    {
        return self::sanitizeAll(array_map(
            static fn($group) => is_array($group) && ($group['group_id'] ?? null) === ($next['group_id'] ?? '') ? $next : $group,
            $groups
        ));
    }

    // ── Tools / Skills (Family-owned tool activation) ─────────────────────────

    /**
     * Normalise a group's `tools` map to `[toolKey => ['enabled' => bool]]`,
     * keeping only registry-known keys. Activation ownership lives on the group
     * row, so this is where a Family's tool assignments are shaped. Unknown keys
     * and malformed values are dropped; a missing map sanitizes to `[]`.
     *
     * @return array<string, array{enabled: bool}>
     */
    public static function sanitizeTools(mixed $tools): array
    {
        if (!is_array($tools)) {
            return [];
        }
        $out = [];
        foreach ($tools as $key => $value) {
            $toolKey = is_string($key) ? $key : '';
            if ($toolKey === '' || !PackageToolRegistry::isKnown($toolKey)) {
                continue;
            }
            $enabled = is_array($value) ? ($value['enabled'] ?? false) : $value;
            $out[$toolKey] = ['enabled' => (bool) $enabled];
        }
        return $out;
    }

    /**
     * Activate or deactivate one tool for one Package Family / Group — the sole
     * tool-assignment mutation. It flips a boolean on the group row and writes
     * nothing under `station.tiers`: activation is NOT tool data creation.
     *
     * Guards: the group and tool key must exist; only an available tool (one
     * backed by real authority) may be enabled. Deactivation is always allowed
     * and never deletes tool data — it only clears the assignment flag.
     */
    public static function setTool(array $groups, string $groupId, string $toolKey, bool $enabled): array
    {
        $group = self::find($groups, $groupId);
        if ($group === null) {
            throw new \InvalidArgumentException('Package Family not found.');
        }
        if (!PackageToolRegistry::isKnown($toolKey)) {
            throw new \InvalidArgumentException('Unknown tool.');
        }
        if ($enabled && !PackageToolRegistry::isAvailable($toolKey)) {
            throw new \InvalidArgumentException('This tool is not available yet.');
        }

        $tools = self::sanitizeTools($group['tools'] ?? []);
        $tools[$toolKey] = ['enabled' => $enabled];
        $group['tools'] = $tools;

        return self::replace($groups, $group);
    }

    // ── Overview module (draft → settle/revert) ───────────────────────────────

    public static function saveOverviewDraft(array $groups, string $groupId, string $label, string $description): array
    {
        $group = self::find($groups, $groupId);
        if ($group === null) {
            throw new \InvalidArgumentException('Package Family not found.');
        }
        $group['overview_draft'] = [
            'label'       => sanitize_text_field($label),
            'description' => self::textarea($description),
        ];
        $group['module_status']['overview'] = StationLifecycle::MODULE_PENDING;
        return self::replace($groups, $group);
    }

    public static function settleOverview(array $groups, string $groupId): array
    {
        $group = self::find($groups, $groupId);
        if ($group === null) {
            throw new \InvalidArgumentException('Package Family not found.');
        }
        $draft = $group['overview_draft'];
        if (is_array($draft)) {
            if (($draft['label'] ?? '') !== '') {
                $group['label'] = $draft['label'];
            }
            $group['description'] = (string) ($draft['description'] ?? '');
        }
        $group['overview_draft'] = null;
        $group['module_status']['overview'] = self::deriveOverviewStatus($group);
        return self::replace($groups, $group);
    }

    public static function revertOverview(array $groups, string $groupId): array
    {
        $group = self::find($groups, $groupId);
        if ($group === null) {
            throw new \InvalidArgumentException('Package Family not found.');
        }
        $group['overview_draft'] = null;
        $group['module_status']['overview'] = self::deriveOverviewStatus($group);
        return self::replace($groups, $group);
    }

    /**
     * Settled-state derivation, mirroring CategoryMeta::deriveOverviewStatus:
     * settled when the settled label is complete (description optional),
     * not-configured otherwise. Create bypasses this deliberately ('pending')
     * so a fresh group walks the pending → publish path.
     */
    private static function deriveOverviewStatus(array $group): string
    {
        return trim((string) ($group['label'] ?? '')) !== ''
            ? StationLifecycle::MODULE_SETTLED
            : StationLifecycle::MODULE_NOT_CONFIGURED;
    }

    /**
     * Multiline-preserving text sanitizer. sanitize_textarea_field when WP is
     * loaded; a strip-tags fallback keeps this class pure for the standalone
     * contract tests (same pattern as their sanitize_text_field shim).
     */
    private static function textarea(mixed $value): string
    {
        return function_exists('sanitize_textarea_field')
            ? sanitize_textarea_field((string) $value)
            : trim(strip_tags((string) $value));
    }

    // ── Lifecycle (engine transitions only — no custom vocabulary) ────────────

    /** Permissive status application, same contract as the other stations' /status endpoints. */
    public static function applyStatus(array $groups, string $groupId, string $target): array
    {
        $group = self::find($groups, $groupId);
        if ($group === null) {
            throw new \InvalidArgumentException('Package Family not found.');
        }
        if (!StationLifecycle::isValidStatus($target) || $target === StationLifecycle::STATUS_DRAFT) {
            throw new \InvalidArgumentException('Invalid platform_status.');
        }
        $change = StationLifecycle::applyStatus(
            (string) $group['platform_status'],
            $target,
            $group['previous_platform_status'] ?? null
        );
        $group['platform_status']          = $change['status'];
        $group['previous_platform_status'] = $change['previous_status'];
        return self::replace($groups, $group);
    }

    /** restore: archived|trashed → disabled — never straight to active. */
    public static function restore(array $groups, string $groupId): array
    {
        $group = self::find($groups, $groupId);
        if ($group === null) {
            throw new \InvalidArgumentException('Package Family not found.');
        }
        $change = StationLifecycle::restore((string) $group['platform_status']);
        if ($change === null) {
            throw new \InvalidArgumentException('Package Family is not in a restorable state.');
        }
        $group['platform_status']          = $change['status'];
        $group['previous_platform_status'] = $change['previous_status'];
        return self::replace($groups, $group);
    }

    /**
     * Permanent delete. Engine gate (trashed only) plus the dependency guard:
     * a group with connected Services, Rate Sheet rows, or Tier selections is
     * never deletable — detachment must be an explicit prior step (D6 rule).
     *
     * @param array{services:int, rate_sheet_rows:int, tier_selections:int} $dependents
     */
    public static function delete(array $groups, string $groupId, array $dependents): array
    {
        $group = self::find($groups, $groupId);
        if ($group === null) {
            throw new \InvalidArgumentException('Package Family not found.');
        }
        if (!StationLifecycle::canDelete((string) $group['platform_status'])) {
            throw new \InvalidArgumentException('Only trashed Package Families can be permanently deleted.');
        }
        if (array_sum($dependents) > 0) {
            throw new \RuntimeException('This group still has connected Services or dependent commercial records. Move them out before deleting.');
        }
        return self::sanitizeAll(array_values(array_filter(
            $groups,
            static fn($candidate) => !is_array($candidate) || ($candidate['group_id'] ?? null) !== $groupId
        )));
    }

    // ── Projections and guards ────────────────────────────────────────────────

    /**
     * Draft-preferred station projection — the same field grammar the taxonomy
     * Service Category Group station exposes, so pill derivation is shared.
     */
    public static function projection(array $group, array $dependents = ['services' => 0, 'rate_sheet_rows' => 0, 'tier_selections' => 0]): array
    {
        $draft = is_array($group['overview_draft'] ?? null) ? $group['overview_draft'] : null;
        return [
            'group_id'                 => (string) $group['group_id'],
            'label'                    => $draft !== null && ($draft['label'] ?? '') !== '' ? $draft['label'] : (string) $group['label'],
            'description'              => $draft !== null ? (string) ($draft['description'] ?? '') : (string) $group['description'],
            'platform_status'          => (string) $group['platform_status'],
            'previous_platform_status' => $group['previous_platform_status'] ?? null,
            'module_status'            => ['overview' => (string) ($group['module_status']['overview'] ?? StationLifecycle::MODULE_PENDING)],
            'has_draft'                => $draft !== null,
            'tools'                    => self::sanitizeTools($group['tools'] ?? []),
            'sort_order'               => (int) ($group['sort_order'] ?? 0),
            'assigned_service_count'   => (int) $dependents['services'],
            'dependents'               => $dependents,
        ];
    }

    /**
     * Native Service identities related to one Package Family through the
     * Package-owned source relationship collection. Generic/non-Service
     * providers are excluded, and Service identity is never parsed or cast.
     *
     * @return int[]
     */
    public static function relatedServiceIds(array $station, string $groupId): array
    {
        $manager = is_array($station['package_manager'] ?? null) ? $station['package_manager'] : [];
        $serviceIds = [];

        foreach (is_array($manager['sources'] ?? null) ? $manager['sources'] : [] as $source) {
            if (!is_array($source)
                || ($source['category_group_id'] ?? null) !== $groupId
                || ($source['provider_key'] ?? null) !== 'service'
                || ($source['entity_type'] ?? null) !== 'service'
            ) {
                continue;
            }

            $serviceId = $source['entity_id'] ?? null;
            if (is_int($serviceId) && $serviceId > 0) {
                $serviceIds[$serviceId] = $serviceId;
            }
        }

        return array_values($serviceIds);
    }

    /**
     * Dependency counts for guards, computed against the whole station.
     * Read-model items must be reconciled (buildReadModel output) so provisional
     * Rate Sheet references still resolve their supplying Service.
     *
     * @return array{services:int, rate_sheet_rows:int, tier_selections:int}
     */
    public static function dependents(array $station, array $readModelItems, string $groupId): array
    {
        $manager = is_array($station['package_manager'] ?? null) ? $station['package_manager'] : [];

        $serviceIds = [];
        foreach (is_array($manager['sources'] ?? null) ? $manager['sources'] : [] as $source) {
            if (is_array($source) && ($source['category_group_id'] ?? null) === $groupId) {
                $serviceIds[(string) ($source['entity_id'] ?? '')] = true;
            }
        }

        // Manager items supplied by the group's Services (via read-model provenance).
        $memberItemIds = [];
        foreach ($readModelItems as $item) {
            if (!is_array($item)) {
                continue;
            }
            $serviceId = $item['source_service_id'] ?? null;
            if ($serviceId !== null && isset($serviceIds[(string) $serviceId])) {
                $memberItemIds[(string) $item['item_id']] = true;
            }
        }

        $rateRows = 0;
        $rateItemIds = [];
        foreach (is_array($manager['rate_sheet']['items'] ?? null) ? $manager['rate_sheet']['items'] : [] as $row) {
            if (is_array($row) && isset($memberItemIds[(string) ($row['source_item_id'] ?? '')])) {
                $rateRows++;
                $rateItemIds[(string) ($row['item_id'] ?? '')] = true;
            }
        }

        $tierSelections = 0;
        foreach (is_array($station['tiers'] ?? null) ? $station['tiers'] : [] as $tier) {
            if (is_array($tier)) {
                $tierSelections += self::countTierSelections($tier, $rateItemIds);
            }
        }

        return [
            'services'        => count($serviceIds),
            'rate_sheet_rows' => $rateRows,
            'tier_selections' => $tierSelections,
        ];
    }

    /**
     * Tier occupants nest selections under occupant/draft keys; count every
     * `rate_sheet_items` collection that references a dependent Rate Sheet row.
     *
     * @param array<string, true> $rateItemIds
     */
    private static function countTierSelections(array $tier, array $rateItemIds): int
    {
        if ($rateItemIds === []) {
            return 0;
        }
        $count = 0;
        foreach ($tier as $key => $value) {
            if (!is_array($value)) {
                continue;
            }
            if ($key === 'rate_sheet_items') {
                foreach ($value as $selection) {
                    if (is_array($selection) && isset($rateItemIds[(string) ($selection['item_id'] ?? '')])) {
                        $count++;
                    }
                }
                continue;
            }
            $count += self::countTierSelections($value, $rateItemIds);
        }
        return $count;
    }
}
