<?php

namespace CompuZign\Platform\Modules\Admin\Http;

use CompuZign\Platform\Core\Health;

class AdminController
{
    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        register_rest_route('compuzign/v1', '/admin/overview', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getOverview'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        // Temporary — Phase 0 migration readiness audit. Remove after migration is validated.
        register_rest_route('compuzign/v1', '/admin/migration-audit', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getMigrationAudit'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        // Temporary — Phase 1+3 backfill. Writes Package Station and Promotion Station
        // to all existing cz_service records. Safe to run multiple times (idempotent).
        // Remove after backfill is confirmed complete via migration-audit.
        register_rest_route('compuzign/v1', '/admin/migrate/phase-one', [
            'methods'             => 'POST',
            'callback'            => [$this, 'runPhaseOneMigration'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        // Temporary — Phase 2 tier occupant migration. Transforms flat tier objects in
        // cz_service_package_station to the { current_occupant, history } occupant model.
        // Safe to run multiple times (idempotent). Remove after migration is validated.
        register_rest_route('compuzign/v1', '/admin/migrate/phase-two', [
            'methods'             => 'POST',
            'callback'            => [$this, 'runPhaseTwoMigration'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        // Temporary — Phase 4 promotion migration. Copies promotion instances from
        // cz_package.promotion_tiers into cz_service_promotion_station on each service.
        // Safe to run multiple times (idempotent). Remove after migration is validated.
        register_rest_route('compuzign/v1', '/admin/migrate/phase-four', [
            'methods'             => 'POST',
            'callback'            => [$this, 'runPhaseFourMigration'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);
    }

    public function getOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        $counts = wp_count_posts('cz_service');

        return rest_ensure_response([
            'services_published' => (int) ($counts->publish ?? 0),
            'services_draft'     => (int) ($counts->draft ?? 0),
            'health'             => Health::run(),
            'platform_version'   => defined('COMPUZIGN_PLUGIN_VERSION') ? COMPUZIGN_PLUGIN_VERSION : null,
        ]);
    }

    // Temporary — Phase 0 migration readiness audit. Remove after migration is validated.
    public function getMigrationAudit(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceIds = get_posts([
            'post_type'              => 'cz_service',
            'post_status'            => ['publish', 'draft'],
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ]);

        $packageIds = get_posts([
            'post_type'              => 'cz_surface_package',
            'post_status'            => ['publish', 'draft'],
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ]);

        $referencedServiceIds = [];
        $packagesEmptyRefs    = [];
        $packagesBrokenRefs   = [];
        $multiServicePackages = [];
        $promotionsByStatus   = [];
        $totalPromotions      = 0;

        foreach ($packageIds as $pkgId) {
            $meta = get_post_meta((int) $pkgId, 'cz_package', true);
            $meta = is_array($meta) ? $meta : [];

            foreach ($meta['promotion_tiers'] ?? [] as $promo) {
                $totalPromotions++;
                $s = isset($promo['status']) ? (string) $promo['status'] : 'unknown';
                $promotionsByStatus[$s] = ($promotionsByStatus[$s] ?? 0) + 1;
            }

            $refs = $meta['service_refs'] ?? [];

            if (empty($refs)) {
                $packagesEmptyRefs[] = (int) $pkgId;
                continue;
            }

            if (count($refs) > 1) {
                $multiServicePackages[] = [
                    'package_id'  => (int) $pkgId,
                    'service_ids' => array_values(array_map('intval', $refs)),
                ];
            }

            foreach ($refs as $sid) {
                $sid = (int) $sid;
                $svc = get_post($sid);
                if (!$svc instanceof \WP_Post || $svc->post_type !== 'cz_service') {
                    $packagesBrokenRefs[] = [
                        'package_id'      => (int) $pkgId,
                        'missing_service' => $sid,
                    ];
                } else {
                    $referencedServiceIds[] = $sid;
                }
            }
        }

        $referencedServiceIds   = array_unique($referencedServiceIds);
        $servicesWithoutPackage = array_values(
            array_diff(array_map('intval', $serviceIds), $referencedServiceIds)
        );

        ksort($promotionsByStatus);

        return rest_ensure_response([
            'counts' => [
                'services'   => count($serviceIds),
                'packages'   => count($packageIds),
                'promotions' => $totalPromotions,
            ],
            'promotions_by_status'     => $promotionsByStatus,
            'services_without_package' => [
                'count' => count($servicesWithoutPackage),
                'ids'   => $servicesWithoutPackage,
            ],
            'packages_empty_refs'  => [
                'count' => count($packagesEmptyRefs),
                'ids'   => $packagesEmptyRefs,
            ],
            'packages_broken_refs' => [
                'count' => count($packagesBrokenRefs),
                'items' => $packagesBrokenRefs,
            ],
            'multi_service_packages' => [
                'count'  => count($multiServicePackages),
                'result' => empty($multiServicePackages) ? 'CLEAR' : 'BLOCKED',
                'items'  => $multiServicePackages,
            ],
        ]);
    }

    // Temporary — Phase 1+3 backfill. Remove after migration is confirmed complete.
    public function runPhaseOneMigration(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceIds = get_posts([
            'post_type'              => 'cz_service',
            'post_status'            => ['publish', 'draft'],
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ]);

        // Load all packages once and index by service_id for O(1) per-service lookup.
        $pkgIds = get_posts([
            'post_type'              => 'cz_surface_package',
            'post_status'            => ['publish', 'draft'],
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ]);

        $legacyMap = [];
        foreach ($pkgIds as $pkgId) {
            $meta = get_post_meta((int) $pkgId, 'cz_package', true);
            if (!is_array($meta) || empty($meta['service_refs'])) {
                continue;
            }
            foreach ($meta['service_refs'] as $serviceId) {
                $serviceId = (int) $serviceId;
                if ($serviceId > 0 && !isset($legacyMap[$serviceId])) {
                    $legacyMap[$serviceId] = ['post_id' => (int) $pkgId, 'meta' => $meta];
                }
            }
        }

        $results = ['migrated' => 0, 'already_migrated' => 0, 'born_empty' => 0, 'errors' => []];

        foreach ($serviceIds as $serviceId) {
            $serviceId = (int) $serviceId;

            try {
                // Ensure Promotion Station exists.
                $promoStation = get_post_meta($serviceId, 'cz_service_promotion_station', true);
                if (!is_array($promoStation)) {
                    update_post_meta($serviceId, 'cz_service_promotion_station', []);
                }

                // Skip Package Station if already migrated.
                $existing = get_post_meta($serviceId, 'cz_service_package_station', true);
                if (is_array($existing) && !empty($existing)) {
                    $results['already_migrated']++;
                    continue;
                }

                $legacy = $legacyMap[$serviceId] ?? null;

                if ($legacy !== null) {
                    $pkg     = $legacy['meta'];
                    $station = [
                        'platform_status'    => $pkg['platform_status'] ?? 'disabled',
                        'tiers'              => $pkg['tiers'] ?? ['basic' => [], 'standard' => [], 'premium' => [], 'enterprise' => []],
                        'popular_tier'       => $pkg['popular_tier'] ?? null,
                        'popular_label'      => $pkg['popular_label'] ?? '',
                        'sort_position'      => (int) ($pkg['sort_position'] ?? 0),
                        'bundle'             => $pkg['bundle'] ?? ['title' => '', 'description' => '', 'price' => null],
                        'valid_from'         => $pkg['valid_from'] ?? null,
                        'valid_until'        => $pkg['valid_until'] ?? null,
                        'display_contexts'   => $pkg['display_contexts'] ?? ['cost-builder'],
                        'migration_source_id' => $legacy['post_id'],
                    ];
                    update_post_meta($serviceId, 'cz_service_package_station', $station);
                    $results['migrated']++;
                } else {
                    update_post_meta($serviceId, 'cz_service_package_station', [
                        'platform_status'    => 'disabled',
                        'tiers'              => ['basic' => [], 'standard' => [], 'premium' => [], 'enterprise' => []],
                        'popular_tier'       => null,
                        'popular_label'      => '',
                        'sort_position'      => 0,
                        'bundle'             => ['title' => '', 'description' => '', 'price' => null],
                        'valid_from'         => null,
                        'valid_until'        => null,
                        'display_contexts'   => ['cost-builder'],
                        'migration_source_id' => null,
                    ]);
                    $results['born_empty']++;
                }
            } catch (\Throwable $e) {
                $results['errors'][] = ['service_id' => $serviceId, 'message' => $e->getMessage()];
            }
        }

        return rest_ensure_response(['success' => true, 'results' => $results]);
    }

    // Temporary — Phase 4 promotion migration. Remove after migration is validated.
    public function runPhaseFourMigration(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceIds = get_posts([
            'post_type'              => 'cz_service',
            'post_status'            => ['publish', 'draft'],
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ]);

        $results = ['migrated' => 0, 'already_migrated' => 0, 'born_empty' => 0, 'errors' => []];

        foreach ($serviceIds as $serviceId) {
            $serviceId = (int) $serviceId;

            try {
                $promoStation = get_post_meta($serviceId, 'cz_service_promotion_station', true);

                // Skip if already migrated.
                if (is_array($promoStation) && !empty($promoStation['migrated'])) {
                    $results['already_migrated']++;
                    continue;
                }

                // Find promotion instances to migrate via migration_source_id.
                $pkgStation = get_post_meta($serviceId, 'cz_service_package_station', true);
                $sourceId   = is_array($pkgStation) ? (int) ($pkgStation['migration_source_id'] ?? 0) : 0;

                $instances = [];
                if ($sourceId > 0) {
                    $pkg = get_post_meta($sourceId, 'cz_package', true);
                    $instances = is_array($pkg) ? array_values($pkg['promotion_tiers'] ?? []) : [];
                }

                update_post_meta($serviceId, 'cz_service_promotion_station', [
                    'instances' => $instances,
                    'migrated'  => true,
                ]);

                if (!empty($instances)) {
                    $results['migrated']++;
                } else {
                    $results['born_empty']++;
                }
            } catch (\Throwable $e) {
                $results['errors'][] = ['service_id' => $serviceId, 'message' => $e->getMessage()];
            }
        }

        return rest_ensure_response(['success' => true, 'results' => $results]);
    }

    // Temporary — Phase 2 tier occupant migration. Remove after migration is validated.
    public function runPhaseTwoMigration(\WP_REST_Request $request): \WP_REST_Response
    {
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $serviceIds = get_posts([
            'post_type'              => 'cz_service',
            'post_status'            => ['publish', 'draft'],
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ]);

        $results = ['migrated' => 0, 'already_migrated' => 0, 'errors' => []];

        foreach ($serviceIds as $serviceId) {
            $serviceId = (int) $serviceId;

            try {
                $station = get_post_meta($serviceId, 'cz_service_package_station', true);
                if (!is_array($station) || empty($station)) {
                    continue; // No Package Station — skip (Phase 1 migration not run).
                }

                $tiers   = $station['tiers'] ?? [];
                $changed = false;

                foreach ($PS::ALLOWED_TIERS as $tierId) {
                    $tier = $tiers[$tierId] ?? [];

                    // Already in occupant format.
                    if ($PS::isOccupantFormat($tier)) {
                        continue;
                    }

                    $changed = true;

                    if (empty($tier)) {
                        // Empty shell — normalise to occupant format with null occupant.
                        $station['tiers'][$tierId] = ['current_occupant' => null, 'history' => []];
                    } else {
                        // Flat Phase 1 tier — wrap as first occupant.
                        $enabled = isset($tier['enabled']) ? (bool) $tier['enabled'] : true;
                        unset($tier['enabled']);
                        $station['tiers'][$tierId] = [
                            'current_occupant' => array_merge(
                                ['id' => 'occ_' . bin2hex(random_bytes(4)), 'platform_status' => $enabled ? 'active' : 'disabled'],
                                $tier
                            ),
                            'history' => [],
                        ];
                    }
                }

                if ($changed) {
                    // Re-derive station platform_status after occupant transformation.
                    $station['platform_status'] = $PS::deriveStationStatus($station);
                    update_post_meta($serviceId, 'cz_service_package_station', $station);
                    $results['migrated']++;
                } else {
                    $results['already_migrated']++;
                }
            } catch (\Throwable $e) {
                $results['errors'][] = ['service_id' => $serviceId, 'message' => $e->getMessage()];
            }
        }

        return rest_ensure_response(['success' => true, 'results' => $results]);
    }

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Modules\Admin\AdminRouter::CAP);
    }
}
