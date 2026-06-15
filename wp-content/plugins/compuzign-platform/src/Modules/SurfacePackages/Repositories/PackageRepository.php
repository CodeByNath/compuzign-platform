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
    private const POST_TYPE = 'cz_surface_package';
    private const META_KEY  = 'cz_package';

    /**
     * Load all active surface packages and index them by covered service ID.
     *
     * "Active" means: platform_status = active AND within valid_from / valid_until window.
     * post_status is always 'publish' for non-deleted packages (Rule 1/9); platform_status
     * in cz_package meta is the CompuZign lifecycle gate. Legacy packages without
     * platform_status are treated as active when post_status = 'publish' (backward compat).
     *
     * @return array<int, array<string, mixed>>  service_id => package meta array
     */
    public function findAllActiveIndexedByServiceId(): array
    {
        $ids = get_posts([
            'post_type'      => self::POST_TYPE,
            'post_status'    => 'publish',
            'numberposts'    => -1,
            'fields'         => 'ids',
            'orderby'        => 'ID',
            'order'          => 'DESC', // highest ID processed first → first-write-wins per service
            'no_found_rows'  => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]);

        if (empty($ids)) {
            return [];
        }

        $now = current_time('mysql');
        $map = [];

        foreach ($ids as $postId) {
            $pkg = get_post_meta((int) $postId, self::META_KEY, true);

            if (!is_array($pkg) || empty($pkg['service_refs'])) {
                continue;
            }

            // Rule 9: platform_status gates CostBuilder visibility.
            // Legacy records without platform_status default to 'active' (post_status=publish implied).
            $pkgStatus = $pkg['platform_status'] ?? '';
            if (in_array($pkgStatus, PackageSchema::ALLOWED_PLATFORM_STATUSES, true)) {
                if ($pkgStatus !== 'active') {
                    continue;
                }
            }
            // Legacy record (no platform_status): already published → treat as active.

            // Validity window: skip packages not yet active or already expired.
            if (!empty($pkg['valid_from']) && $pkg['valid_from'] > $now) {
                continue;
            }
            if (!empty($pkg['valid_until']) && $pkg['valid_until'] < $now) {
                continue;
            }

            foreach ($pkg['service_refs'] as $serviceId) {
                $serviceId = (int) $serviceId;
                if ($serviceId <= 0) {
                    continue;
                }

                // First write wins: highest post ID is processed first (DESC order above),
                // so the first time we see a service ID it is already the highest-priority package.
                if (!isset($map[$serviceId])) {
                    $map[$serviceId] = $pkg;
                }
            }
        }

        return $map;
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
     * Return the set of service IDs referenced by at least one disabled package,
     * keyed by service ID for O(1) lookup. Used by PricingBuilder alongside the active
     * packageMap to identify services whose package has been intentionally disabled —
     * preventing legacy XLSX pricing from surfacing as a commercial fallback.
     *
     * Covers both:
     *  - New records: platform_status = 'disabled' (post_status = 'publish')
     *  - Legacy records: post_status = 'draft' (pre-migration disabled packages)
     *
     * @return array<int, true>  service_id => true
     */
    public function findDisabledPackageServiceIds(): array
    {
        // New-style: post_status=publish, platform_status=disabled
        $publishedIds = get_posts([
            'post_type'              => self::POST_TYPE,
            'post_status'            => 'publish',
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]) ?: [];

        // Legacy: post_status=draft (old disabled packages before migration)
        $draftIds = get_posts([
            'post_type'              => self::POST_TYPE,
            'post_status'            => 'draft',
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
        ]) ?: [];

        $set = [];

        foreach ($publishedIds as $postId) {
            $pkg    = get_post_meta((int) $postId, self::META_KEY, true);
            $status = is_array($pkg) ? ($pkg['platform_status'] ?? '') : '';
            if ($status !== 'disabled') {
                continue;
            }
            foreach ($pkg['service_refs'] ?? [] as $serviceId) {
                $serviceId = (int) $serviceId;
                if ($serviceId > 0) {
                    $set[$serviceId] = true;
                }
            }
        }

        foreach ($draftIds as $postId) {
            $pkg = get_post_meta((int) $postId, self::META_KEY, true);
            if (!is_array($pkg) || empty($pkg['service_refs'])) {
                continue;
            }
            foreach ($pkg['service_refs'] as $serviceId) {
                $serviceId = (int) $serviceId;
                if ($serviceId > 0) {
                    $set[$serviceId] = true;
                }
            }
        }

        return $set;
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
