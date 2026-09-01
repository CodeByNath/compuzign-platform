<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;

/**
 * Canonical Package-owned Tier capability-instance envelope.
 *
 * Instances own Tier configuration and occupant lifecycle only. Consumer use
 * is represented separately by TierAssignmentSchema; this schema deliberately
 * has no consumer, Family, Group, or assignment vocabulary.
 */
final class TierInstanceSchema
{
    public const PRIMARY_INSTANCE_ID = 'ti_primary';
    public const ALLOWED_STATUSES = StationLifecycle::STATUSES;

    /** @var string[] */
    private const LEGACY_STATION_KEYS = [
        'tiers',
        'occupant_bin',
        'popular_tier',
        'popular_label',
    ];

    /** @return array<int, array<string, mixed>> */
    public static function defaultInstances(): array
    {
        return [];
    }

    /**
     * Lift the legacy global Tier set into one deterministic instance in memory.
     * Occupant, bin, slot, lifecycle, and Rate Sheet data is copied verbatim;
     * this function never sanitises, mints, infers an assignment, or writes.
     * A canonical station with no instances and no legacy keys stays empty.
     * On the repository write path, lifting completes before the obsolete
     * projection is pruned from the value prepared for the atomic option write.
     *
     * @param array<string, mixed> $station
     * @return array<string, mixed>
     */
    public static function liftLegacyStation(array $station, bool $forWrite = false): array
    {
        $hasInstances = is_array($station['tier_instances'] ?? null)
            && $station['tier_instances'] !== [];
        $hasLegacyProjection = false;
        foreach (self::LEGACY_STATION_KEYS as $key) {
            if (array_key_exists($key, $station)) {
                $hasLegacyProjection = true;
                break;
            }
        }

        if (!$hasInstances && !$hasLegacyProjection) {
            return $station;
        }

        if (!$hasInstances) {
            $legacyTiers = is_array($station['tiers'] ?? null) && $station['tiers'] !== []
                ? $station['tiers']
                : self::emptyTierMap();

            $station['tier_instances'] = [[
                'tier_instance_id'       => self::PRIMARY_INSTANCE_ID,
                'title'                  => 'Primary Tier Set',
                'status'                 => $station['platform_status'] ?? 'disabled',
                'allowed_rate_sheet_ids' => [],
                'popular_tier'           => $station['popular_tier'] ?? null,
                'popular_label'          => $station['popular_label'] ?? '',
                'tiers'                  => $legacyTiers,
                'occupant_bin'           => is_array($station['occupant_bin'] ?? null)
                    ? $station['occupant_bin']
                    : [],
            ]];
        }

        if ($forWrite
            && is_array($station['tier_instances'] ?? null)
            && $station['tier_instances'] !== []
        ) {
            foreach (self::LEGACY_STATION_KEYS as $key) {
                unset($station[$key]);
            }
        }

        return $station;
    }

    /** @return array<int, array<string, mixed>> */
    public static function sanitizeInstances(mixed $instances): array
    {
        if (!is_array($instances)) {
            return [];
        }

        $out = [];
        $seen = [];
        foreach ($instances as $candidate) {
            $instance = self::sanitizeInstance($candidate);
            if ($instance === null) {
                continue;
            }
            $id = $instance['tier_instance_id'];
            if (isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $out[] = $instance;
        }

        return $out;
    }

    /** @return array<string, mixed>|null */
    public static function sanitizeInstance(mixed $instance): ?array
    {
        if (!is_array($instance)) {
            return null;
        }

        $id = sanitize_text_field((string) ($instance['tier_instance_id'] ?? ''));
        if ($id === '') {
            return null;
        }

        $status = sanitize_text_field((string) ($instance['status'] ?? 'disabled'));
        if (!in_array($status, self::ALLOWED_STATUSES, true)) {
            $status = 'disabled';
        }

        $tiers = [];
        $sourceTiers = is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [];
        foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
            $slot = is_array($sourceTiers[$tierId] ?? null) ? $sourceTiers[$tierId] : [];
            $tiers[$tierId] = PackageSchema::ensureTierLifecycle($slot);
        }

        $binStation = PackageSchema::ensureOccupantBin([
            'occupant_bin' => $instance['occupant_bin'] ?? [],
        ]);

        $popularTier = sanitize_text_field((string) ($instance['popular_tier'] ?? ''));
        if (!in_array($popularTier, PackageSchema::ALLOWED_TIERS, true)) {
            $popularTier = null;
        }

        // Subordinate composable child (Phase 1A) — deliberately a single
        // nullable slot, not an array/map keyed like `tiers`, so "exactly
        // one occupant" is true by shape rather than by a runtime check.
        // Never one of ALLOWED_TIERS and never merged into `tiers`: every
        // consumer that only iterates ALLOWED_TIERS/`tiers` (five-slot
        // status derivation, the customer exclusive-select projection,
        // Add-on grouping) stays unaware of it by construction. See
        // docs/code-map/tier-composable-occupant.md.
        $composableOccupant = null;
        if (is_array($instance['composable_occupant'] ?? null) && $instance['composable_occupant'] !== []) {
            $composableOccupant = PackageSchema::ensureTierLifecycle($instance['composable_occupant']);
        }

        return [
            'tier_instance_id'       => $id,
            'cz_platform_id'         => sanitize_text_field((string) ($instance['cz_platform_id'] ?? '')),
            'title'                  => sanitize_text_field((string) ($instance['title'] ?? '')),
            'description'            => sanitize_textarea_field((string) ($instance['description'] ?? '')),
            'status'                 => $status,
            'allowed_rate_sheet_ids' => self::sanitizeIdList($instance['allowed_rate_sheet_ids'] ?? []),
            'popular_tier'           => $popularTier,
            'popular_label'          => sanitize_text_field((string) ($instance['popular_label'] ?? '')),
            'tiers'                  => $tiers,
            'occupant_bin'           => $binStation['occupant_bin'],
            'composable_occupant'    => $composableOccupant,
        ];
    }

    public static function mintInstanceId(): string
    {
        return 'ti_' . bin2hex(random_bytes(6));
    }

    /** @return array<string, mixed>|null */
    public static function findInstance(array $instances, ?string $id): ?array
    {
        if ($id === null || $id === '') {
            return null;
        }
        foreach ($instances as $instance) {
            if (is_array($instance) && ($instance['tier_instance_id'] ?? null) === $id) {
                return $instance;
            }
        }
        return null;
    }

    /**
     * Resolve the one public-ready Tier instance related to a Service through
     * its Package Family assignment. Every edge is explicit and peer-owned:
     * Service source relationship -> active Family -> assignment -> instance.
     * Ambiguous or incomplete relationships fail closed without a fallback.
     *
     * @return array<string, mixed>|null
     */
    public static function resolveInstanceForService(
        int $serviceId,
        array $manager,
        array $assignments,
        array $instances
    ): ?array {
        if ($serviceId < 1) {
            return null;
        }

        $familyIds = [];
        foreach (is_array($manager['sources'] ?? null) ? $manager['sources'] : [] as $source) {
            if (!is_array($source)
                || ($source['provider_key'] ?? null) !== 'service'
                || ($source['entity_type'] ?? null) !== 'service'
                || (int) ($source['entity_id'] ?? 0) !== $serviceId
            ) {
                continue;
            }

            $familyId = is_string($source['category_group_id'] ?? null)
                ? trim($source['category_group_id'])
                : '';
            if ($familyId === '') {
                return null;
            }
            $familyIds[$familyId] = true;
        }

        // A Service with no Family, or with conflicting Family relationships,
        // cannot safely select a consumer's instance.
        if (count($familyIds) !== 1) {
            return null;
        }
        $familyId = (string) array_key_first($familyIds);
        $families = is_array($manager['category_groups'] ?? null) ? $manager['category_groups'] : [];
        $family = PackageCategoryGroups::find($families, $familyId);
        if ($family === null || ($family['platform_status'] ?? null) !== StationLifecycle::STATUS_ACTIVE) {
            return null;
        }

        $matches = [];
        foreach ($assignments as $assignment) {
            if (is_array($assignment)
                && ($assignment['consumer_type'] ?? null) === 'package_family'
                && ($assignment['consumer_id'] ?? null) === $familyId
            ) {
                $matches[] = $assignment;
            }
        }
        if (count($matches) !== 1) {
            return null;
        }

        $instanceId = is_string($matches[0]['tier_instance_id'] ?? null)
            ? $matches[0]['tier_instance_id']
            : '';
        $instance = self::findInstance($instances, $instanceId);
        if ($instance === null
            || ($instance['status'] ?? null) !== StationLifecycle::STATUS_ACTIVE
            || self::deriveInstanceStatus($instance) !== StationLifecycle::STATUS_ACTIVE
        ) {
            return null;
        }

        return $instance;
    }

    /** @return array<int, array<string, mixed>> */
    public static function upsertInstance(array $instances, array $instance): array
    {
        $clean = self::sanitizeInstance($instance);
        if ($clean === null) {
            return array_values($instances);
        }

        foreach ($instances as $index => $existing) {
            if (is_array($existing) && ($existing['tier_instance_id'] ?? null) === $clean['tier_instance_id']) {
                $instances[$index] = $clean;
                return array_values($instances);
            }
        }
        $instances[] = $clean;
        return array_values($instances);
    }

    /** @return array<int, array<string, mixed>> */
    public static function removeInstance(array $instances, string $id): array
    {
        return array_values(array_filter(
            $instances,
            static fn(mixed $instance): bool => !is_array($instance)
                || ($instance['tier_instance_id'] ?? null) !== $id
        ));
    }

    /**
     * Replace one instance without touching its peers.
     *
     * @param array<string, mixed> $station
     * @param array<string, mixed> $instance
     * @return array<string, mixed>
     */
    public static function withInstance(array $station, string $instanceId, array $instance): array
    {
        unset($instance['platform_status']);
        $instance['tier_instance_id'] = $instanceId;
        $instance['status'] = self::deriveInstanceStatus($instance);

        $found = false;
        $instances = is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [];
        foreach ($instances as $index => $existing) {
            if (is_array($existing) && ($existing['tier_instance_id'] ?? null) === $instanceId) {
                $instances[$index] = $instance;
                $found = true;
                break;
            }
        }
        if (!$found) {
            return $station;
        }
        $station['tier_instances'] = array_values($instances);

        return $station;
    }

    /** @return array<string, array<mixed>> */
    public static function emptyTierMap(): array
    {
        return array_fill_keys(PackageSchema::ALLOWED_TIERS, []);
    }

    /** @return string[] */
    public static function sanitizeAllowedRateSheetIds(mixed $ids, array $rateSheets): array
    {
        $known = [];
        foreach ($rateSheets as $rateSheet) {
            if (!is_array($rateSheet)) {
                continue;
            }
            $id = sanitize_text_field((string) ($rateSheet['rate_sheet_id'] ?? ''));
            if ($id !== '') {
                $known[$id] = true;
            }
        }

        return array_values(array_filter(
            self::sanitizeIdList($ids),
            static fn(string $id): bool => isset($known[$id])
        ));
    }

    public static function deriveInstanceStatus(array $instance): string
    {
        return PackageSchema::deriveStationStatus([
            'tiers' => is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [],
        ]);
    }

    public static function deriveStationStatusFromInstances(array $instances): string
    {
        foreach ($instances as $instance) {
            if (is_array($instance) && self::deriveInstanceStatus($instance) === 'active') {
                return 'active';
            }
        }
        return 'disabled';
    }

    /** @return string[] */
    private static function sanitizeIdList(mixed $ids): array
    {
        if (!is_array($ids)) {
            return [];
        }
        $out = [];
        $seen = [];
        foreach ($ids as $raw) {
            if (!is_scalar($raw) && $raw !== null) {
                continue;
            }
            $id = sanitize_text_field((string) $raw);
            if ($id === '' || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $out[] = $id;
        }
        return $out;
    }
}
