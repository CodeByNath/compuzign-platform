<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Repositories;

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;

/**
 * Reads cz_surface_package posts and their cz_package meta.
 *
 * The primary method — findAllActiveIndexedByServiceId() — performs a single
 * bulk load of all published packages, filters by platform_status=active and
 * validity window, and builds an in-memory map keyed by covered service ID.
 * PricingBuilder holds this map for the duration of one buildResponse() call
 * and performs O(1) lookups per service during compilation.
 *
 * Priority: when multiple active packages cover the same service ID, the package
 * with the highest post ID (most recently published) takes precedence.
 */
class PackageRepository
{
    private const POST_TYPE          = 'cz_surface_package';
    private const META_KEY           = 'cz_package';
    private const PACKAGE_STATION_KEY = 'cz_service_package_station';

    /**
     * Load all active packages indexed by service ID.
     *
     * Phase 1+: reads from cz_service_package_station meta (new canonical location).
     * Bridge: services not yet backfilled fall back to cz_surface_package posts.
     *         Remove the bridge when POST /admin/migrate/phase-one is confirmed complete.
     *
     * promotion_tiers are bridged from the original cz_surface_package post (migration_source_id)
     * until Phase 4 moves them to the Promotion Station.
     *
     * @return array<int, array<string, mixed>>  service_id => station/package meta array
     */
    public function findAllActiveIndexedByServiceId(): array
    {
        $serviceIds = get_posts([
            'post_type'              => 'cz_service',
            'post_status'            => 'publish',
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]);

        if (empty($serviceIds)) {
            return [];
        }

        $now          = current_time('mysql');
        $map          = [];
        $unmigratedIds = [];

        // Phase 1+: read Package Station from service meta.
        foreach ($serviceIds as $serviceId) {
            $serviceId = (int) $serviceId;
            $station   = get_post_meta($serviceId, self::PACKAGE_STATION_KEY, true);

            if (!is_array($station) || empty($station)) {
                $unmigratedIds[] = $serviceId;
                continue;
            }

            $pkgStatus = $station['platform_status'] ?? '';
            if (in_array($pkgStatus, PackageSchema::ALLOWED_PLATFORM_STATUSES, true) && $pkgStatus !== 'active') {
                continue;
            }

            if (!empty($station['valid_from']) && $station['valid_from'] > $now) {
                continue;
            }
            if (!empty($station['valid_until']) && $station['valid_until'] < $now) {
                continue;
            }

            // Phase 2: extract flat tier interface from occupant model for PricingBuilder.
            // Phase 1 flat format passes through unchanged; null slots (empty shells) are omitted.
            $flatTiers = [];
            foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
                $extracted = PackageSchema::extractTierForCostBuilder($station['tiers'][$tierId] ?? []);
                if ($extracted !== null) {
                    $flatTiers[$tierId] = $extracted;
                }
            }
            $station['tiers'] = $flatTiers;

            // Phase 1 bridge: promotion_tiers still live in the original package post until Phase 4.
            $sourceId = (int) ($station['migration_source_id'] ?? 0);
            if ($sourceId > 0) {
                $pkg = get_post_meta($sourceId, self::META_KEY, true);
                $station['promotion_tiers'] = is_array($pkg) ? ($pkg['promotion_tiers'] ?? []) : [];
            } else {
                $station['promotion_tiers'] = [];
            }

            $map[$serviceId] = $station;
        }

        // Bridge: legacy path for services not yet backfilled. Remove when backfill is complete.
        if (!empty($unmigratedIds)) {
            foreach ($this->findLegacyActiveForServices($unmigratedIds, $now) as $serviceId => $pkg) {
                $map[$serviceId] = $pkg;
            }
        }

        return $map;
    }

    /**
     * Legacy bridge — reads active packages from cz_surface_package posts for un-migrated services.
     * Remove when POST /admin/migrate/phase-one backfill is confirmed complete.
     *
     * @param  int[]  $serviceIds
     * @return array<int, array<string, mixed>>
     */
    private function findLegacyActiveForServices(array $serviceIds, string $now): array
    {
        if (empty($serviceIds) || !post_type_exists(self::POST_TYPE)) {
            return [];
        }

        $pkgIds = get_posts([
            'post_type'              => self::POST_TYPE,
            'post_status'            => 'publish',
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'orderby'                => 'ID',
            'order'                  => 'DESC',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]);

        $serviceIdSet = array_flip($serviceIds);
        $result       = [];

        foreach ($pkgIds as $pkgId) {
            $pkg = get_post_meta((int) $pkgId, self::META_KEY, true);
            if (!is_array($pkg) || empty($pkg['service_refs'])) {
                continue;
            }

            $pkgStatus = $pkg['platform_status'] ?? '';
            if (in_array($pkgStatus, PackageSchema::ALLOWED_PLATFORM_STATUSES, true) && $pkgStatus !== 'active') {
                continue;
            }
            if (!empty($pkg['valid_from']) && $pkg['valid_from'] > $now) {
                continue;
            }
            if (!empty($pkg['valid_until']) && $pkg['valid_until'] < $now) {
                continue;
            }

            foreach ($pkg['service_refs'] as $serviceId) {
                $serviceId = (int) $serviceId;
                if ($serviceId > 0 && isset($serviceIdSet[$serviceId]) && !isset($result[$serviceId])) {
                    $result[$serviceId] = $pkg;
                }
            }
        }

        return $result;
    }

    /**
     * Return all packages for admin listing.
     * All normal (non-hard-deleted) packages have post_status = 'publish' after the
     * platform_status migration; 'draft' is kept here during the transition window
     * so old disabled-via-draft packages remain visible in the admin until migrated.
     *
     * @return \WP_Post[]
     */
    public function findAll(): array
    {
        return get_posts([
            'post_type'              => self::POST_TYPE,
            'post_status'            => ['publish', 'draft'],
            'numberposts'            => -1,
            'orderby'                => 'ID',
            'order'                  => 'ASC',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ]) ?: [];
    }

    /**
     * Return all published packages regardless of validity window or platform_status.
     * Used by health checks to inspect package integrity.
     *
     * @return \WP_Post[]
     */
    public function findAllActive(): array
    {
        $posts = get_posts([
            'post_type'      => self::POST_TYPE,
            'post_status'    => 'publish',
            'numberposts'    => -1,
            'no_found_rows'  => true,
            'update_post_term_cache' => false,
        ]) ?: [];

        return array_values(array_filter($posts, function (\WP_Post $post): bool {
            $pkg    = get_post_meta($post->ID, self::META_KEY, true);
            $status = is_array($pkg) ? ($pkg['platform_status'] ?? '') : '';
            // Legacy records without platform_status treated as active when post_status=publish.
            return !in_array($status, PackageSchema::ALLOWED_PLATFORM_STATUSES, true) || $status === 'active';
        }));
    }

    /**
     * @deprecated Use findAllActive() for new code. Kept for backward compat during transition.
     * @return \WP_Post[]
     */
    public function findAllPublished(): array
    {
        return $this->findAllActive();
    }

    /**
     * Return the set of service IDs whose Package Station is disabled, keyed by service ID
     * for O(1) lookup. Used by PricingBuilder to suppress legacy XLSX pricing fallback for
     * services that have an intentionally disabled commercial configuration.
     *
     * Phase 1+: reads from cz_service_package_station meta.
     * Bridge: services not yet backfilled fall back to cz_surface_package posts.
     *         Remove the bridge when backfill is confirmed complete.
     *
     * @return array<int, true>  service_id => true
     */
    public function findDisabledPackageServiceIds(): array
    {
        $serviceIds = get_posts([
            'post_type'              => 'cz_service',
            'post_status'            => 'publish',
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]) ?: [];

        $set           = [];
        $unmigratedIds = [];

        foreach ($serviceIds as $serviceId) {
            $serviceId = (int) $serviceId;
            $station   = get_post_meta($serviceId, self::PACKAGE_STATION_KEY, true);

            if (!is_array($station) || empty($station)) {
                $unmigratedIds[] = $serviceId;
                continue;
            }

            if (($station['platform_status'] ?? '') === 'disabled') {
                $set[$serviceId] = true;
            }
        }

        // Bridge: legacy disabled packages for un-migrated services. Remove when backfill is complete.
        if (!empty($unmigratedIds)) {
            foreach ($this->findLegacyDisabledForServices($unmigratedIds) as $serviceId) {
                $set[$serviceId] = true;
            }
        }

        return $set;
    }

    /**
     * Legacy bridge — reads disabled packages from cz_surface_package posts for un-migrated services.
     * Remove when POST /admin/migrate/phase-one backfill is confirmed complete.
     *
     * @param  int[]   $serviceIds
     * @return int[]
     */
    private function findLegacyDisabledForServices(array $serviceIds): array
    {
        if (empty($serviceIds) || !post_type_exists(self::POST_TYPE)) {
            return [];
        }

        $pkgIds = get_posts([
            'post_type'              => self::POST_TYPE,
            'post_status'            => ['publish', 'draft'],
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]) ?: [];

        $serviceIdSet = array_flip($serviceIds);
        $result       = [];

        foreach ($pkgIds as $pkgId) {
            $pkg        = get_post_meta((int) $pkgId, self::META_KEY, true);
            $postStatus = get_post_field('post_status', (int) $pkgId);
            if (!is_array($pkg)) {
                continue;
            }

            $status    = $pkg['platform_status'] ?? '';
            $isDisabled = $status === 'disabled' || $postStatus === 'draft';
            if (!$isDisabled) {
                continue;
            }

            foreach ($pkg['service_refs'] ?? [] as $serviceId) {
                $serviceId = (int) $serviceId;
                if ($serviceId > 0 && isset($serviceIdSet[$serviceId])) {
                    $result[] = $serviceId;
                }
            }
        }

        return $result;
    }

    /**
     * @deprecated Use findDisabledPackageServiceIds(). Kept for backward compat.
     * @return array<int, true>
     */
    public function findDraftedServiceIds(): array
    {
        return $this->findDisabledPackageServiceIds();
    }

    /**
     * Return all published packages that reference a given service ID.
     * Convenience method for admin inspection (not used in compilation path).
     *
     * @return \WP_Post[]
     */
    public function findPublishedForService(int $serviceId): array
    {
        $all = $this->findAllPublished();

        return array_values(array_filter($all, function (\WP_Post $post) use ($serviceId) {
            $pkg  = get_post_meta($post->ID, self::META_KEY, true);
            $refs = is_array($pkg) ? ($pkg['service_refs'] ?? []) : [];
            return in_array($serviceId, array_map('intval', $refs), true);
        }));
    }
}
