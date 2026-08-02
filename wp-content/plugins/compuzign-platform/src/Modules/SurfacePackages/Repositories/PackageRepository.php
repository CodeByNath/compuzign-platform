<?php

/*
 * FILE INDEX
 *
 * STATION_PERSISTENCE    Load, cache, defaults, save, and legacy migration
 * PROMOTION_PERSISTENCE  Promotion collection load and save
 * SOURCE_PROJECTIONS     Inclusion/FAQ pools and Service provenance
 * PACKAGE_LOOKUPS        Coverage and active/disabled Package indexes
 *
 * Search: SECTION: STATION_PERSISTENCE
 *         SECTION: PROMOTION_PERSISTENCE
 *         SECTION: SOURCE_PROJECTIONS
 *         SECTION: PACKAGE_LOOKUPS
 */

namespace CompuZign\Platform\Modules\SurfacePackages\Repositories;

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference;

/**
 * Single authority for Package Station storage.
 *
 * The station (Package Manager, Tier instances and assignments, Promotions,
 * and aggregate status) lives in one WP option — COMPUZIGN option
 * `cz_package_station` — fully independent of any cz_service post. Deleting or
 * disconnecting a Service can no longer destroy commercial data; missing
 * sources degrade to the source_missing operational state at read time.
 *
 * Cutover compatibility (temporary, in loadStation()): when the option is
 * absent, the station is migrated once from the legacy Service-hosted
 * cz_service_package_station post meta. The originating service ID is kept
 * as legacy_host_service_id so stored item IDs (unprefixed for the old host,
 * `service:{id}:` for other sources) remain stable.
 */
class PackageRepository
{
    // ===================================================================
    // SECTION: STATION_PERSISTENCE
    // ===================================================================
    public const OPTION_KEY = 'cz_package_station';

    private const LEGACY_STATION_META   = 'cz_service_package_station';
    private const LEGACY_PROMOTION_META = 'cz_service_promotion_station';
    private const SERVICE_POST_TYPE     = 'cz_service';

    /** Request-scope cache: false = not loaded, null = no station exists. */
    private array|null|false $stationCache = false;

    /** Assignment-resolved public index, built at most once per request. */
    private array|false $activePackageMapCache = false;

    // ── Storage authority ─────────────────────────────────────────────────────

    /**
     * Load the station from its independent anchor. Returns null when no
     * station exists anywhere (fresh install, nothing to migrate).
     */
    public function loadStation(): ?array
    {
        if ($this->stationCache !== false) {
            return $this->stationCache;
        }

        $station = get_option(self::OPTION_KEY, null);
        if (is_array($station) && !empty($station)) {
            $station = $this->ensurePromotions($station);
            return $this->stationCache = TierInstanceSchema::liftLegacyStation($station);
        }

        // One-time cutover migration from the legacy Service-hosted meta.
        $station = $this->migrateFromLegacyServiceMeta();
        if ($station !== null) {
            $station = $this->ensurePromotions($station);
            $station = TierInstanceSchema::liftLegacyStation($station);
        }

        return $this->stationCache = $station;
    }

    // ── Promotions (child collection of the independent station) ──────────────

    /**
     * Raw promotion instances stored on the station. The station is the only
     * authority — no Service postmeta is read.
     *
     * @return array<int, array<string, mixed>>
     */
    // ===================================================================
    // SECTION: PROMOTION_PERSISTENCE
    // ===================================================================
    public function loadPromotions(): array
    {
        $station = $this->loadStation();
        return is_array($station['promotions'] ?? null) ? $station['promotions'] : [];
    }

    /** Persist the promotion collection atomically inside the station. */
    public function savePromotions(array $instances): void
    {
        $station = $this->loadStation() ?? $this->defaultStation();
        $station['promotions'] = array_values($instances);
        $this->saveStation($station);
    }

    /**
     * Cutover bridge — promotions used to live on Service postmeta
     * (cz_service_promotion_station). The first load after cutover copies the
     * richest migrated Service-hosted collection into the station, once. The
     * legacy meta is left in place untouched (read-only safety net); nothing
     * reads it after this runs. This established load-time bridge deliberately
     * bypasses saveStation: routing it through the Tier canonical write boundary
     * would prune legacy Tier keys during a read rather than a real mutation.
     */
    private function ensurePromotions(array $station): array
    {
        if (array_key_exists('promotions', $station)) {
            return $station;
        }

        $serviceIds = get_posts([
            'post_type'              => self::SERVICE_POST_TYPE,
            'post_status'            => 'any',
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]);

        $best = [];
        foreach (is_array($serviceIds) ? $serviceIds : [] as $serviceId) {
            $promoStation = get_post_meta((int) $serviceId, self::LEGACY_PROMOTION_META, true);
            if (!is_array($promoStation) || empty($promoStation['migrated'])) {
                continue;
            }
            $instances = is_array($promoStation['instances'] ?? null) ? $promoStation['instances'] : [];
            if (count($instances) > count($best)) {
                $best = $instances;
            }
        }

        $station['promotions'] = array_values($best);
        update_option(self::OPTION_KEY, $station, false);

        return $station;
    }

    /** Persist the station atomically to its independent anchor. */
    public function saveStation(array $station): void
    {
        // The read path exposes a legacy-only station without writing. Its first
        // real mutation lifts the Tier data before pruning the obsolete top-level
        // projection from this one atomic persistence candidate.
        $station = TierInstanceSchema::liftLegacyStation($station, true);
        $updated = update_option(self::OPTION_KEY, $station, false);

        // WordPress also returns false when the value is already unchanged, so
        // false alone is not a persistence failure. Read the option back and
        // compare the exact serialized value before deciding. Keep the previous
        // request cache untouched until persistence has been confirmed; otherwise
        // a failed write could still be returned to the caller as if it succeeded.
        if (!$updated) {
            $persisted = get_option(self::OPTION_KEY, null);
            if (serialize($persisted) !== serialize($station)) {
                throw new \RuntimeException('package_station_persistence_failed');
            }
        }

        $this->stationCache = $station;
        $this->activePackageMapCache = false;
    }

    /** Fresh station shell for first-time configuration. */
    public function defaultStation(): array
    {
        return [
            'platform_status'         => 'disabled',
            'tier_instances'          => TierInstanceSchema::defaultInstances(),
            'tier_assignments'        => [],
            'sort_position'           => 0,
            'bundle'                  => ['title' => '', 'description' => '', 'price' => null],
            'promotions'              => [],
            'package_manager'         => PackageManagerSchema::defaultManager(),
            'legacy_host_service_id'  => 0,
        ];
    }

    /** Package-owned scalar identity read for one native Family reference. */
    public function familyPlatformId(string $groupId): string
    {
        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $group = PackageCategoryGroups::find($manager['category_groups'], $groupId);
        return is_array($group) ? (string) ($group['cz_platform_id'] ?? '') : '';
    }

    /** Immutable scalar claim used by PlatformIdentifierStation assignment. */
    public function claimFamilyPlatformId(string $groupId, string $platformId): bool
    {
        $station = $this->loadStation();
        if (!is_array($station)) return false;
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $group = PackageCategoryGroups::find($manager['category_groups'], $groupId);
        if ($group === null) return false;
        $stored = (string) ($group['cz_platform_id'] ?? '');
        if ($stored !== '') return $stored === $platformId;
        $group['cz_platform_id'] = $platformId;
        $manager['category_groups'] = PackageCategoryGroups::replace($manager['category_groups'], $group);
        $station['package_manager'] = $manager;
        $this->saveStation($station);
        return $this->familyPlatformId($groupId) === $platformId;
    }

    public function familyPlatformIdExists(string $platformId): bool
    {
        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        foreach ($manager['category_groups'] as $group) {
            if (is_array($group) && ($group['cz_platform_id'] ?? '') === $platformId) return true;
        }
        return false;
    }

    /**
     * Bounded, stable native Family identities for Platform-ID assignment.
     * The cursor is the last processed string group_id, not a mutable offset.
     *
     * @return array{items: list<string>, next_cursor: string|null, complete: bool}
     */
    public function familyAssignmentPage(?string $cursor, int $limit): array
    {
        if ($limit < 1 || $limit > 500) {
            throw new \InvalidArgumentException('Package Family assignment limit must be between 1 and 500.');
        }

        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $ids = [];
        foreach ($manager['category_groups'] as $group) {
            $groupId = is_array($group) ? (string) ($group['group_id'] ?? '') : '';
            if ($groupId !== '' && ($cursor === null || strcmp($groupId, $cursor) > 0)) {
                $ids[] = $groupId;
            }
        }
        sort($ids, SORT_STRING);

        $items = array_slice($ids, 0, $limit);
        return [
            'items' => $items,
            'next_cursor' => $items === [] ? $cursor : $items[array_key_last($items)],
            'complete' => count($ids) <= $limit,
        ];
    }

    /** Package-owned Tier Group scalar read using the canonical registry reference. */
    public function tierGroupPlatformId(string $nativeReference): string
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-group', 1);
        if ($parts === null) return '';
        $station = $this->loadStation();
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $parts[0]);
        return is_array($instance) ? (string) ($instance['cz_platform_id'] ?? '') : '';
    }

    /** Immutable Tier Group scalar claim used only by PlatformIdentifierStation. */
    public function claimTierGroupPlatformId(string $nativeReference, string $platformId): bool
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-group', 1);
        if ($parts === null) return false;
        $station = $this->loadStation();
        if (!is_array($station)) return false;
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $parts[0]);
        if ($instance === null) return false;
        $stored = (string) ($instance['cz_platform_id'] ?? '');
        if ($stored !== '') return $stored === $platformId;
        $instance['cz_platform_id'] = $platformId;
        $station = TierInstanceSchema::withInstance($station, $parts[0], $instance);
        $this->saveStation($station);
        return $this->tierGroupPlatformId($nativeReference) === $platformId;
    }

    public function tierGroupPlatformIdExists(string $platformId): bool
    {
        $station = $this->loadStation();
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            if (is_array($instance) && ($instance['cz_platform_id'] ?? '') === $platformId) return true;
        }
        return false;
    }

    /** @return array{items:list<string>,next_cursor:string|null,complete:bool} */
    public function tierGroupAssignmentPage(?string $cursor, int $limit): array
    {
        if ($limit < 1 || $limit > 500) {
            throw new \InvalidArgumentException('Tier Group assignment limit must be between 1 and 500.');
        }
        $station = $this->loadStation();
        $ids = [];
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            $id = is_array($instance) ? (string) ($instance['tier_instance_id'] ?? '') : '';
            if ($id !== '' && ($cursor === null || strcmp($id, $cursor) > 0)) $ids[] = $id;
        }
        sort($ids, SORT_STRING);
        $page = array_slice($ids, 0, $limit);
        return [
            'items' => array_map(static fn(string $id): string => PackagePlatformNativeReference::tierGroup($id), $page),
            'next_cursor' => $page === [] ? $cursor : $page[array_key_last($page)],
            'complete' => count($ids) <= $limit,
        ];
    }

    public function tierGroupProjection(string $nativeReference): ?array
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-group', 1);
        if ($parts === null) return null;
        $station = $this->loadStation();
        return TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $parts[0]);
    }

    public function tierOccupantPlatformId(string $nativeReference, bool $addon = false): string
    {
        $located = $this->locateTierOccupant($nativeReference);
        if ($located === null) return '';
        $key = $addon ? 'addon_platform_id' : 'cz_platform_id';
        return (string) ($located['occupant'][$key] ?? '');
    }

    public function claimTierOccupantPlatformId(string $nativeReference, string $platformId, bool $addon = false): bool
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-occupant', 2);
        if ($parts === null) return false;
        $station = $this->loadStation();
        if (!is_array($station)) return false;
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $parts[0]);
        if ($instance === null) return false;
        $key = $addon ? 'addon_platform_id' : 'cz_platform_id';
        $matches = 0;
        foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slotId => $slot) {
            if (is_array($slot['current_occupant'] ?? null) && (string) ($slot['current_occupant']['id'] ?? '') === $parts[1]) {
                $stored = (string) ($slot['current_occupant'][$key] ?? '');
                if ($stored !== '' && $stored !== $platformId) return false;
                $instance['tiers'][$slotId]['current_occupant'][$key] = $platformId;
                $matches++;
            }
        }
        foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $index => $entry) {
            if (is_array($entry['occupant'] ?? null) && (string) ($entry['occupant']['id'] ?? '') === $parts[1]) {
                $stored = (string) ($entry['occupant'][$key] ?? '');
                if ($stored !== '' && $stored !== $platformId) return false;
                $instance['occupant_bin'][$index]['occupant'][$key] = $platformId;
                $matches++;
            }
        }
        if ($matches !== 1) return false;
        $station = TierInstanceSchema::withInstance($station, $parts[0], $instance);
        $this->saveStation($station);
        return $this->tierOccupantPlatformId($nativeReference, $addon) === $platformId;
    }

    public function tierOccupantPlatformIdExists(string $platformId, bool $addon = false): bool
    {
        $key = $addon ? 'addon_platform_id' : 'cz_platform_id';
        $station = $this->loadStation();
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            if (!is_array($instance)) continue;
            foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slot) {
                if (is_array($slot['current_occupant'] ?? null) && ($slot['current_occupant'][$key] ?? '') === $platformId) return true;
            }
            foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $entry) {
                if (is_array($entry['occupant'] ?? null) && ($entry['occupant'][$key] ?? '') === $platformId) return true;
            }
        }
        return false;
    }

    /** @return array{items:list<string>,next_cursor:string|null,complete:bool} */
    public function tierOccupantAssignmentPage(?string $cursor, int $limit, bool $addon = false): array
    {
        if ($limit < 1 || $limit > 500) throw new \InvalidArgumentException('Tier assignment limit must be between 1 and 500.');
        $station = $this->loadStation();
        $references = [];
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            if (!is_array($instance)) continue;
            $instanceId = (string) ($instance['tier_instance_id'] ?? '');
            if ($instanceId === '') continue;
            foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slot) {
                $occupant = is_array($slot['current_occupant'] ?? null) ? $slot['current_occupant'] : null;
                $this->appendEligibleOccupantReference($references, $instanceId, $occupant, $addon);
            }
            foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $entry) {
                $occupant = is_array($entry['occupant'] ?? null) ? $entry['occupant'] : null;
                $this->appendEligibleOccupantReference($references, $instanceId, $occupant, $addon);
            }
        }
        $references = array_values(array_unique($references));
        sort($references, SORT_STRING);
        $eligible = array_values(array_filter($references, static fn(string $reference): bool => $cursor === null || strcmp($reference, $cursor) > 0));
        $page = array_slice($eligible, 0, $limit);
        return ['items' => $page, 'next_cursor' => $page === [] ? $cursor : $page[array_key_last($page)], 'complete' => count($eligible) <= $limit];
    }

    public function tierOccupantProjection(string $nativeReference): ?array
    {
        $located = $this->locateTierOccupant($nativeReference);
        if ($located === null) return null;
        return [
            'tier_instance_id' => $located['tier_instance_id'],
            'location' => $located['location'],
            'is_addon' => (bool) ($located['occupant']['is_addon'] ?? false),
            'occupant' => $located['occupant'],
        ];
    }

    /** @return array{tier_instance_id:string,location:string,occupant:array}|null */
    private function locateTierOccupant(string $nativeReference): ?array
    {
        $parts = PackagePlatformNativeReference::parse($nativeReference, 'tier-occupant', 2);
        if ($parts === null) return null;
        $station = $this->loadStation();
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $parts[0]);
        if ($instance === null) return null;
        $matches = [];
        foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slotId => $slot) {
            $occupant = is_array($slot['current_occupant'] ?? null) ? $slot['current_occupant'] : null;
            if ($occupant !== null && (string) ($occupant['id'] ?? '') === $parts[1]) $matches[] = ['tier_instance_id' => $parts[0], 'location' => 'slot:' . $slotId, 'occupant' => $occupant];
        }
        foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $entry) {
            $occupant = is_array($entry['occupant'] ?? null) ? $entry['occupant'] : null;
            if ($occupant !== null && (string) ($occupant['id'] ?? '') === $parts[1]) $matches[] = ['tier_instance_id' => $parts[0], 'location' => 'bin:' . (string) ($entry['bin_id'] ?? ''), 'occupant' => $occupant];
        }
        return count($matches) === 1 ? $matches[0] : null;
    }

    /** @param list<string> $references */
    private function appendEligibleOccupantReference(array &$references, string $instanceId, ?array $occupant, bool $addon): void
    {
        if ($occupant === null) return;
        $occupantId = (string) ($occupant['id'] ?? '');
        if ($occupantId === '') return;
        if ($addon && !((bool) ($occupant['is_addon'] ?? false) || (string) ($occupant['addon_platform_id'] ?? '') !== '')) return;
        $references[] = PackagePlatformNativeReference::tierOccupant($instanceId, $occupantId);
    }

    public function rateSheetPlatformId(string $nativeReference, string $scope = 'sheet'): string
    {
        $located = $this->locateRateSheetIdentity($nativeReference, $scope);
        return $located === null ? '' : (string) ($located['record']['cz_platform_id'] ?? '');
    }

    public function claimRateSheetPlatformId(string $nativeReference, string $platformId, string $scope = 'sheet'): bool
    {
        $located = $this->locateRateSheetIdentity($nativeReference, $scope);
        if ($located === null) return false;
        $stored = (string) ($located['record']['cz_platform_id'] ?? '');
        if ($stored !== '') return $stored === $platformId;
        $station = $this->loadStation();
        if (!is_array($station)) return false;
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        foreach ($manager['rate_sheets'] as $sheetIndex => $sheet) {
            if ((string) ($sheet['rate_sheet_id'] ?? '') !== $located['rate_sheet_id']) continue;
            if ($scope === 'sheet') {
                $manager['rate_sheets'][$sheetIndex]['cz_platform_id'] = $platformId;
            } elseif ($scope === 'group') {
                foreach ($sheet['groups'] as $groupIndex => $group) {
                    if ((string) ($group['group_id'] ?? '') === $located['group_id']) {
                        $manager['rate_sheets'][$sheetIndex]['groups'][$groupIndex]['cz_platform_id'] = $platformId;
                    }
                }
            } else {
                foreach ($sheet['items'] as $itemIndex => $item) {
                    if ((string) ($item['item_id'] ?? '') === $located['item_id']) {
                        $manager['rate_sheets'][$sheetIndex]['items'][$itemIndex]['cz_platform_id'] = $platformId;
                    }
                }
            }
        }
        $station['package_manager'] = $manager;
        $this->saveStation($station);
        return $this->rateSheetPlatformId($nativeReference, $scope) === $platformId;
    }

    public function rateSheetPlatformIdExists(string $platformId, string $scope = 'sheet'): bool
    {
        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        foreach ($manager['rate_sheets'] as $sheet) {
            if ($scope === 'sheet' && ($sheet['cz_platform_id'] ?? '') === $platformId) return true;
            if ($scope === 'group') foreach ($sheet['groups'] as $group) {
                if (($group['cz_platform_id'] ?? '') === $platformId) return true;
            }
            if ($scope === 'item') foreach ($sheet['items'] as $item) {
                if (($item['cz_platform_id'] ?? '') === $platformId) return true;
            }
        }
        return false;
    }

    /** @return array{items:list<string>,next_cursor:string|null,complete:bool} */
    public function rateSheetAssignmentPage(?string $cursor, int $limit, string $scope): array
    {
        if ($limit < 1 || $limit > 500) throw new \InvalidArgumentException('Rate Sheet assignment limit must be between 1 and 500.');
        if (!in_array($scope, ['sheet', 'group', 'item'], true)) throw new \InvalidArgumentException('Rate Sheet assignment scope must be sheet, group, or item.');
        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $references = [];
        foreach ($manager['rate_sheets'] as $sheet) {
            $sheetId = (string) ($sheet['rate_sheet_id'] ?? '');
            if ($sheetId === '') continue;
            if ($scope === 'sheet') $references[] = PackagePlatformNativeReference::rateSheet($sheetId);
            elseif ($scope === 'group') foreach ($sheet['groups'] as $group) {
                $groupId = (string) ($group['group_id'] ?? '');
                if ($groupId !== '') $references[] = PackagePlatformNativeReference::rateSheetGroup($sheetId, $groupId);
            }
            else foreach ($sheet['items'] as $item) {
                $itemId = (string) ($item['item_id'] ?? '');
                if ($itemId !== '') $references[] = PackagePlatformNativeReference::rateSheetItem($sheetId, $itemId);
            }
        }
        sort($references, SORT_STRING);
        $eligible = array_values(array_filter($references, static fn(string $reference): bool => $cursor === null || strcmp($reference, $cursor) > 0));
        $page = array_slice($eligible, 0, $limit);
        return ['items' => $page, 'next_cursor' => $page === [] ? $cursor : $page[array_key_last($page)], 'complete' => count($eligible) <= $limit];
    }

    public function rateSheetProjection(string $nativeReference, string $scope = 'sheet'): ?array
    {
        return $this->locateRateSheetIdentity($nativeReference, $scope);
    }

    /** @return array{rate_sheet_id:string,group_id?:string,item_id?:string,record:array}|null */
    private function locateRateSheetIdentity(string $nativeReference, string $scope): ?array
    {
        if (!in_array($scope, ['sheet', 'group', 'item'], true)) return null;
        $parts = PackagePlatformNativeReference::parse(
            $nativeReference,
            $scope === 'sheet' ? 'rate-sheet' : ($scope === 'group' ? 'rate-sheet-group' : 'rate-sheet-item'),
            $scope === 'sheet' ? 1 : 2
        );
        if ($parts === null) return null;
        $station = $this->loadStation();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $sheet = PackageManagerSchema::findRateSheet($manager['rate_sheets'], $parts[0]);
        if ($sheet === null) return null;
        if ($scope === 'sheet') return ['rate_sheet_id' => $parts[0], 'record' => $sheet];
        if ($scope === 'group') foreach ($sheet['groups'] as $group) {
            if ((string) ($group['group_id'] ?? '') === $parts[1]) {
                return ['rate_sheet_id' => $parts[0], 'group_id' => $parts[1], 'record' => $group];
            }
        }
        if ($scope === 'item') foreach ($sheet['items'] as $item) {
            if ((string) ($item['item_id'] ?? '') === $parts[1]) {
                return ['rate_sheet_id' => $parts[0], 'item_id' => $parts[1], 'record' => $item];
            }
        }
        return null;
    }

    /**
     * Every Rate Sheet identity protected by any instance lifecycle envelope.
     * Duplicate discoveries collapse into the returned id set.
     *
     * @return array<string, true>
     */
    public function rateSheetIdsInUse(array $station): array
    {
        $used = [];
        $instances = is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [];
        foreach ($instances as $instance) {
            if (is_array($instance)) {
                $this->collectRateSheetIdsFromInstance($instance, $used);
            }
        }

        return $used;
    }

    /** @return string[] */
    public function rateSheetInstanceIdsInUse(array $station, string $rateSheetId): array
    {
        $instanceIds = [];
        foreach (is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [] as $instance) {
            if (!is_array($instance)) {
                continue;
            }
            $used = [];
            $this->collectRateSheetIdsFromInstance($instance, $used);
            if (isset($used[$rateSheetId])) {
                $id = (string) ($instance['tier_instance_id'] ?? '');
                if ($id !== '') {
                    $instanceIds[] = $id;
                }
            }
        }
        return array_values(array_unique($instanceIds));
    }

    /** @param array<string, true> $used */
    private function collectRateSheetIdsFromInstance(array $instance, array &$used): void
    {
        $primary = PackageManagerSchema::PRIMARY_RATE_SHEET_ID;
        foreach (is_array($instance['allowed_rate_sheet_ids'] ?? null) ? $instance['allowed_rate_sheet_ids'] : [] as $rawId) {
            $id = is_scalar($rawId) ? trim((string) $rawId) : '';
            if ($id !== '') {
                $used[$id] = true;
            }
        }

        foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slot) {
            if (!is_array($slot)) {
                continue;
            }
            $occupant = is_array($slot['current_occupant'] ?? null)
                ? $slot['current_occupant']
                : (array_key_exists('current_occupant', $slot) ? [] : $slot);
            $occupantId = $this->resolvedRateSheetId($occupant, $primary);
            if ($occupantId !== null) {
                $used[$occupantId] = true;
            }

            $overview = is_array($slot['drafts']['overview'] ?? null) ? $slot['drafts']['overview'] : null;
            if ($overview !== null) {
                $overviewId = trim((string) ($overview['rate_sheet_id'] ?? ''));
                $used[$overviewId !== '' ? $overviewId : $primary] = true;
            }

            $features = $slot['drafts']['features'] ?? null;
            if (is_array($features) && $features !== []) {
                $bound = $overview !== null && array_key_exists('rate_sheet_id', $overview)
                    ? trim((string) ($overview['rate_sheet_id'] ?? ''))
                    : ($occupantId ?? '');
                $used[$bound !== '' ? $bound : $primary] = true;
            }

            foreach (is_array($slot['history'] ?? null) ? $slot['history'] : [] as $historical) {
                if (!is_array($historical)) {
                    continue;
                }
                $historicalId = $this->resolvedRateSheetId($historical, $primary);
                if ($historicalId !== null) {
                    $used[$historicalId] = true;
                }
            }
        }

        foreach (is_array($instance['occupant_bin'] ?? null) ? $instance['occupant_bin'] : [] as $entry) {
            $occupant = is_array($entry['occupant'] ?? null) ? $entry['occupant'] : [];
            $id = $this->resolvedRateSheetId($occupant, $primary);
            if ($id !== null) {
                $used[$id] = true;
            }
        }
    }

    private function resolvedRateSheetId(array $record, string $primary): ?string
    {
        $id = trim((string) ($record['rate_sheet_id'] ?? ''));
        if ($id !== '') {
            return $id;
        }
        return $record !== [] ? $primary : null;
    }

    /**
     * Cutover bridge — copies the richest legacy Service-hosted station into
     * the option, once. The legacy meta is left in place untouched (read-only
     * safety net); nothing reads it after this migration runs. The raw copy is
     * intentionally persisted before the in-memory Tier lift, so this read-time
     * import cannot also perform Phase 9 compatibility retirement. The first
     * real mutation passes through saveStation and canonicalises atomically.
     */
    private function migrateFromLegacyServiceMeta(): ?array
    {
        $serviceIds = get_posts([
            'post_type'              => self::SERVICE_POST_TYPE,
            'post_status'            => 'any',
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]);

        $bestId      = 0;
        $bestScore   = -1;
        $bestStation = null;

        foreach (is_array($serviceIds) ? $serviceIds : [] as $serviceId) {
            $station = get_post_meta((int) $serviceId, self::LEGACY_STATION_META, true);
            if (!is_array($station) || empty($station)) {
                continue;
            }
            $manager = is_array($station['package_manager'] ?? null) ? $station['package_manager'] : [];
            $score = count(is_array($manager['sources'] ?? null) ? $manager['sources'] : [])
                + count(is_array($manager['items'] ?? null) ? $manager['items'] : [])
                + count(is_array($station['tiers'] ?? null) ? $station['tiers'] : [])
                + (!empty($manager['rate_sheet']) || !empty($manager['rate_sheets']) ? 1000 : 0);
            if ($score > $bestScore) {
                $bestScore   = $score;
                $bestId      = (int) $serviceId;
                $bestStation = $station;
            }
        }

        if ($bestStation === null) {
            return null;
        }

        $bestStation['legacy_host_service_id'] = $bestId;
        update_option(self::OPTION_KEY, $bestStation, false);

        return $bestStation;
    }

    // ── Supply resolution (single canonical implementation) ──────────────────

    /**
     * Resolve Service-provider supply into namespaced item pools.
     * Item IDs stay unprefixed for the legacy host service and prefixed
     * `service:{id}:` for every other source — the ID scheme stored rate
     * sheets and tier selections were written against.
     *
     * @return array{0: array, 1: array} [$inclusions, $faqs]
     */
    // ===================================================================
    // SECTION: SOURCE_PROJECTIONS
    // ===================================================================
    public function sourcePools(array $station, ?array $sources = null): array
    {
        $manager = is_array($station['package_manager'] ?? null)
            ? PackageManagerSchema::sanitize($station['package_manager'])
            : PackageManagerSchema::defaultManager();
        $sources = $sources ?? $manager['sources'];
        $hostId  = (int) ($station['legacy_host_service_id'] ?? 0);

        // Legacy tolerance: a station configured before explicit source
        // relationships supplies from its migrated host service.
        if ($sources === [] && $hostId > 0) {
            $sources = [['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => $hostId]];
        }

        $inclusions = [];
        $faqs       = [];

        foreach ($sources as $source) {
            if (($source['provider_key'] ?? '') !== 'service' || ($source['entity_type'] ?? '') !== 'service') {
                continue;
            }
            $sourceServiceId = (int) ($source['entity_id'] ?? 0);
            $post = $sourceServiceId > 0 ? get_post($sourceServiceId) : null;
            if (!$post instanceof \WP_Post || $post->post_type !== self::SERVICE_POST_TYPE) {
                continue; // deleted source → its items degrade to source_missing downstream
            }
            $prefix = $sourceServiceId === $hostId ? '' : 'service:' . $sourceServiceId . ':';
            $serviceMeta = get_post_meta($sourceServiceId, 'cz_service_meta', true);
            $sourceAvailable = is_array($serviceMeta) && ($serviceMeta['platform_status'] ?? 'disabled') === 'active';
            // Supplying-Service provenance for the admin read model (Rate Sheet
            // filters, group dependency guards). Category names are the
            // Service-owned category-role terms only — group-role terms are a
            // different station and never read as a Service Category.
            $provenance = [
                '_source_available'     => $sourceAvailable,
                '_source_service_id'    => $sourceServiceId,
                '_source_service_title' => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                '_source_categories'    => $this->serviceCategoryNames($sourceServiceId),
            ];
            $rawInc = get_post_meta($sourceServiceId, 'cz_service_inclusions', true) ?: [];
            foreach ((isset($rawInc['inclusions']) && is_array($rawInc['inclusions'])) ? $rawInc['inclusions'] : [] as $item) {
                if (!is_array($item) || empty($item['id'])) {
                    continue;
                }
                $inclusions[] = [...$item, 'id' => $prefix . (string) $item['id'], ...$provenance];
            }
            $rawFaqs = get_post_meta($sourceServiceId, 'cz_service_faqs', true) ?: [];
            foreach (is_array($rawFaqs) ? $rawFaqs : [] as $item) {
                if (!is_array($item) || empty($item['id'])) {
                    continue;
                }
                $faqs[] = [...$item, 'id' => $prefix . (string) $item['id'], ...$provenance];
            }
        }

        return [$inclusions, $faqs];
    }

    /**
     * Service-owned category names for a supplying service — category-role
     * terms only. A group-role term shares the taxonomy but is a different
     * station (Service Category Group) and must never read as a Service Category.
     *
     * @return string[]
     */
    private function serviceCategoryNames(int $serviceId): array
    {
        $terms = wp_get_post_terms($serviceId, \CompuZign\Platform\Modules\Admin\Support\CategoryMeta::TAXONOMY, ['fields' => 'all']);
        if (!is_array($terms)) {
            return [];
        }
        $names = [];
        foreach ($terms as $term) {
            if (!$term instanceof \WP_Term) {
                continue;
            }
            if (\CompuZign\Platform\Modules\Admin\Support\CategoryMeta::role((int) $term->term_id)
                !== \CompuZign\Platform\Modules\Admin\Support\CategoryMeta::STATION_ROLE_CATEGORY) {
                continue;
            }
            $names[] = html_entity_decode($term->name, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        return $names;
    }

    /**
     * Service IDs covered by the station: every existing, published source
     * service in the manager's relationships (the single indexing path).
     *
     * @return int[]
     */
    // ===================================================================
    // SECTION: PACKAGE_LOOKUPS
    // ===================================================================
    public function coveredServiceIds(array $station): array
    {
        $manager = is_array($station['package_manager'] ?? null)
            ? PackageManagerSchema::sanitize($station['package_manager'])
            : PackageManagerSchema::defaultManager();

        $sources = $manager['sources'];
        $hostId  = (int) ($station['legacy_host_service_id'] ?? 0);
        if ($sources === [] && $hostId > 0) {
            // Same legacy tolerance as sourcePools(): pre-relationship stations
            // cover their migrated host service.
            $sources = [['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => $hostId]];
        }

        $covered = [];
        foreach ($sources as $source) {
            if (($source['provider_key'] ?? '') !== 'service' || ($source['entity_type'] ?? '') !== 'service') {
                continue;
            }
            $serviceId = (int) ($source['entity_id'] ?? 0);
            $post = $serviceId > 0 ? get_post($serviceId) : null;
            if ($post instanceof \WP_Post && $post->post_type === self::SERVICE_POST_TYPE && $post->post_status === 'publish') {
                $covered[$serviceId] = true;
            }
        }

        return array_map('intval', array_keys($covered));
    }

    // ── Cost Builder projection (single read path) ────────────────────────────

    /**
     * Load the active station indexed by covered service ID. This is the only
     * mechanism by which packages reach the Cost Builder (and therefore the
     * Quote Builder). Empty map = no active package → legacy XLSX pricing.
     *
     * @return array<int, array<string, mixed>>  service_id => station array
     */
    public function findAllActiveIndexedByServiceId(): array
    {
        if ($this->activePackageMapCache !== false) {
            return $this->activePackageMapCache;
        }

        $station = $this->loadStation();
        if ($station === null) {
            return $this->activePackageMapCache = [];
        }

        // Visible iff active; empty status keeps legacy tolerance. Fail-closed.
        $pkgStatus = $station['platform_status'] ?? '';
        if ($pkgStatus !== '' && $pkgStatus !== 'active') {
            return $this->activePackageMapCache = [];
        }

        // valid_from/valid_until are stored UTC.
        $now = current_time('mysql', true);
        if (!empty($station['valid_from']) && $station['valid_from'] > $now) {
            return $this->activePackageMapCache = [];
        }
        if (!empty($station['valid_until']) && $station['valid_until'] < $now) {
            return $this->activePackageMapCache = [];
        }

        $rawManager = is_array($station['package_manager'] ?? null)
            ? $station['package_manager']
            : [];
        $manager = is_array($station['package_manager'] ?? null)
            ? PackageManagerSchema::sanitize($station['package_manager'])
            : PackageManagerSchema::defaultManager();
        $instances = TierInstanceSchema::sanitizeInstances($station['tier_instances'] ?? []);
        $consumerRegistry = [
            'package_family' => TierAssignmentSchema::consumerRegistryFor('package_family', $manager),
        ];
        $assignments = TierAssignmentSchema::sanitizeAssignments(
            $station['tier_assignments'] ?? [],
            $consumerRegistry,
            $instances
        );
        [$incPool, $faqPool] = $this->sourcePools($station);
        $coveredServiceIds   = $this->coveredServiceIds($station);
        $hostId              = (int) ($station['legacy_host_service_id'] ?? 0);
        $readModel = PackageManagerSchema::buildReadModel(
            $hostId,
            $manager,
            $incPool,
            $faqPool,
            'active'
        );
        // Keep the original source rows for ambiguity detection. Sanitisation
        // intentionally deduplicates identity, while a corrupt duplicate that
        // points one Service at two Families must fail closed publicly.
        $resolutionManager = $manager;
        $resolutionManager['sources'] = is_array($rawManager['sources'] ?? null)
            ? $rawManager['sources']
            : [];

        $map = [];
        $projectedByInstanceId = [];
        foreach ($coveredServiceIds as $coveredServiceId) {
            $instance = TierInstanceSchema::resolveInstanceForService(
                $coveredServiceId,
                $resolutionManager,
                $assignments,
                $instances
            );
            if ($instance === null) {
                continue;
            }

            $instanceId = (string) $instance['tier_instance_id'];
            if (!isset($projectedByInstanceId[$instanceId])) {
                $projected = $station;
                $flatTiers = [];
                foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
                    $extracted = PackageSchema::extractTierForCostBuilder($instance['tiers'][$tierId] ?? []);
                    if ($extracted === null) {
                        continue;
                    }
                    $rateProjection = PackageManagerSchema::projectTierRateSheetWith(
                        $readModel,
                        $extracted['rate_sheet_items'] ?? [],
                        $extracted['rate_sheet_id'] ?? null
                    );
                    $extracted['price'] = $rateProjection['price'];
                    $extracted['inclusions_override'] = array_map(
                        static fn(array $row): array => ['id' => $row['item_id'], 'label' => $row['label']],
                        array_values(array_filter(
                            $rateProjection['selections'],
                            static fn(array $row): bool => $row['resolved']
                                && ($row['source_type'] ?? null) === 'inclusion'
                        ))
                    );
                    $flatTiers[$tierId] = $extracted;
                }
                $projected['platform_status'] = 'active';
                $projected['tiers'] = $flatTiers;
                $projected['popular_tier'] = $instance['popular_tier'] ?? null;
                $projected['popular_label'] = (string) ($instance['popular_label'] ?? '');
                $projected['promotion_tiers'] = is_array($station['promotions'] ?? null)
                    ? $station['promotions']
                    : [];
                $projectedByInstanceId[$instanceId] = $projected;
            }

            $map[$coveredServiceId] = $projectedByInstanceId[$instanceId];
        }

        return $this->activePackageMapCache = $map;
    }

    /**
     * Covered Service IDs without a public-ready assigned instance, keyed by
     * service ID for O(1) lookup. PricingBuilder uses this to suppress legacy
     * XLSX fallback when a Package relationship exists but fails closed.
     *
     * @return array<int, true>  service_id => true
     */
    public function findDisabledPackageServiceIds(): array
    {
        $station = $this->loadStation();
        if ($station === null) {
            return [];
        }

        $set = [];
        foreach ($this->coveredServiceIds($station) as $serviceId) {
            $set[$serviceId] = true;
        }
        return array_diff_key($set, $this->findAllActiveIndexedByServiceId());
    }
}
