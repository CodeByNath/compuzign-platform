<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Repositories;

/**
 * Reads cz_surface_package posts and their cz_package meta.
 *
 * The primary method — findAllActiveIndexedByServiceId() — performs a single
 * bulk load of all published packages, filters by validity window, and builds
 * an in-memory map keyed by covered service ID. PricingBuilder holds this map
 * for the duration of one buildResponse() call and performs O(1) lookups per
 * service during compilation. No per-service database queries.
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
     * "Active" means: published, within valid_from / valid_until window.
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

            // Validity window: skip packages not yet active or already expired
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
     * Return all packages — published and draft — for admin listing.
     * Draft = disabled by admin. PricingBuilder only loads published ones.
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
     * Return all published packages regardless of validity window.
     * Used by health checks to inspect package integrity.
     *
     * @return \WP_Post[]
     */
    public function findAllPublished(): array
    {
        return get_posts([
            'post_type'      => self::POST_TYPE,
            'post_status'    => 'publish',
            'numberposts'    => -1,
            'no_found_rows'  => true,
            'update_post_term_cache' => false,
        ]) ?: [];
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
