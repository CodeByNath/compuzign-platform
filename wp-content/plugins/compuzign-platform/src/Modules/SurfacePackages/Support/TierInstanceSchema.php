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

    /** @return array<int, array<string, mixed>> */
    public static function defaultInstances(): array
    {
        return [];
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

        return [
            'tier_instance_id'       => $id,
            'title'                  => sanitize_text_field((string) ($instance['title'] ?? '')),
            'status'                 => $status,
            'allowed_rate_sheet_ids' => self::sanitizeIdList($instance['allowed_rate_sheet_ids'] ?? []),
            'popular_tier'           => $popularTier,
            'popular_label'          => sanitize_text_field((string) ($instance['popular_label'] ?? '')),
            'tiers'                  => $tiers,
            'occupant_bin'           => $binStation['occupant_bin'],
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
