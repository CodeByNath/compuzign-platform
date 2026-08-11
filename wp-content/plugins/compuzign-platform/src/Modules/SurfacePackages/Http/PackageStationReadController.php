<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Http;

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

/**
 * Read-only list endpoint for admin stations (catalog pills, overview
 * promo counts). Serves GET /admin/surface-packages in the response shape the
 * frontend already consumes (SurfacePackagesResponse), derived entirely from
 * the single Package Station authority — no cz_surface_package posts are read
 * or written. The legacy write routes on this path are retired for good.
 */
class PackageStationReadController
{
    public function __construct(private PackageRepository $repository)
    {
    }

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        register_rest_route('compuzign/v1', '/admin/surface-packages', [
            'methods'             => 'GET',
            'callback'            => [$this, 'list'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);
    }

    public function list(\WP_REST_Request $request): \WP_REST_Response
    {
        $station = $this->repository->loadStation();
        if ($station === null) {
            return rest_ensure_response(['success' => true, 'total' => 0, 'packages' => []]);
        }

        $manager = is_array($station['package_manager'] ?? null)
            ? PackageManagerSchema::sanitize($station['package_manager'])
            : PackageManagerSchema::defaultManager();
        [$incPool, $faqPool] = $this->repository->sourcePools($station);
        $coveredServiceRefs = $this->repository->coveredServiceIds($station);
        $coveredServiceSet = array_fill_keys($coveredServiceRefs, true);
        $hostId      = (int) ($station['legacy_host_service_id'] ?? 0);
        $status      = (string) ($station['platform_status'] ?? 'disabled');
        $readModel = PackageManagerSchema::buildReadModel(
            $hostId,
            $manager,
            $incPool,
            $faqPool,
            $status
        );
        $instances = TierInstanceSchema::sanitizeInstances($station['tier_instances'] ?? []);
        $assignments = TierAssignmentSchema::sanitizeAssignments(
            $station['tier_assignments'] ?? [],
            ['package_family' => TierAssignmentSchema::consumerRegistryFor('package_family', $manager)],
            $instances
        );
        $promotionTiers = $this->repository->loadPromotions();
        $rows = [];
        foreach ($assignments as $assignment) {
            $familyId = (string) ($assignment['consumer_id'] ?? '');
            $instance = TierInstanceSchema::findInstance(
                $instances,
                (string) ($assignment['tier_instance_id'] ?? '')
            );
            if ($instance === null) {
                continue;
            }

            $tiers = [];
            foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
                $slot = is_array($instance['tiers'][$tierId] ?? null) ? $instance['tiers'][$tierId] : [];
                $summary = PackageSchema::summariseTierSlot($slot);
                $extracted = PackageSchema::extractTierForCostBuilder($slot);
                if ($extracted !== null) {
                    $projection = PackageManagerSchema::projectTierRateSheetWith(
                        $readModel,
                        $extracted['rate_sheet_items'] ?? [],
                        $extracted['rate_sheet_id'] ?? null
                    );
                    $summary['price'] = $projection['price'];
                }
                $tiers[$tierId] = $summary;
            }

            $serviceRefs = array_values(array_filter(
                PackageCategoryGroups::relatedServiceIds($station, $familyId),
                static fn(int $serviceId): bool => isset($coveredServiceSet[$serviceId])
            ));
            $services = [];
            foreach ($serviceRefs as $serviceId) {
                $post = get_post($serviceId);
                if ($post instanceof \WP_Post) {
                    $services[] = ['id' => $serviceId, 'title' => $post->post_title, 'slug' => $post->post_name];
                }
            }

            $rows[] = [
                'post_id'            => 0,
                'post_status'        => 'publish',
                'platform_status'    => (string) ($instance['status'] ?? 'disabled'),
                'title'              => (string) ($instance['title'] ?? 'Tier Instance'),
                'package_type'       => 'tier_configuration',
                'service_refs'       => $serviceRefs,
                'services'           => $services,
                'tiers'              => $tiers,
                'promotion_tiers'    => $promotionTiers,
                'popular_tier'       => $instance['popular_tier'] ?? null,
                'popular_label'      => (string) ($instance['popular_label'] ?? ''),
                'faq_refs'           => is_array($station['faq_refs'] ?? null) ? $station['faq_refs'] : [],
                'display_contexts'   => is_array($station['display_contexts'] ?? null) ? $station['display_contexts'] : ['cost-builder'],
                'migration_complete' => true,
                'valid_from'         => $station['valid_from'] ?? null,
                'valid_until'        => $station['valid_until'] ?? null,
            ];
        }

        return rest_ensure_response(['success' => true, 'total' => count($rows), 'packages' => $rows]);
    }

    public function requireAdmin(): bool
    {
        return current_user_can('manage_options');
    }
}
