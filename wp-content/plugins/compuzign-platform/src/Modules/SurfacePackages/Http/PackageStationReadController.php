<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Http;

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;

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
        $serviceRefs = $this->repository->coveredServiceIds($station);
        $hostId      = (int) ($station['legacy_host_service_id'] ?? 0);
        $status      = (string) ($station['platform_status'] ?? 'disabled');

        $tiers = [];
        foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
            $slot    = is_array($station['tiers'][$tierId] ?? null) ? $station['tiers'][$tierId] : [];
            $summary = PackageSchema::summariseTierSlot($slot);
            // Prices are derived, never stored: overlay the rate-sheet projection.
            $extracted = PackageSchema::extractTierForCostBuilder($slot);
            if ($extracted !== null) {
                $projection = PackageManagerSchema::projectTierRateSheet(
                    $hostId,
                    $manager,
                    $extracted['rate_sheet_items'] ?? [],
                    $incPool,
                    $faqPool,
                    $status
                );
                $summary['price'] = $projection['price'];
            }
            $tiers[$tierId] = $summary;
        }

        // Promotions are a child collection of the station itself.
        $promotionTiers = $this->repository->loadPromotions();

        $services = [];
        foreach ($serviceRefs as $serviceId) {
            $post = get_post($serviceId);
            if ($post instanceof \WP_Post) {
                $services[] = ['id' => $serviceId, 'title' => $post->post_title, 'slug' => $post->post_name];
            }
        }

        $row = [
            'post_id'            => 0,
            'post_status'        => 'publish',
            'platform_status'    => $status,
            'title'              => 'Package Station',
            'package_type'       => 'tier_configuration',
            'service_refs'       => $serviceRefs,
            'services'           => $services,
            'tiers'              => $tiers,
            'promotion_tiers'    => $promotionTiers,
            'popular_tier'       => $station['popular_tier'] ?? null,
            'popular_label'      => (string) ($station['popular_label'] ?? ''),
            'faq_refs'           => is_array($station['faq_refs'] ?? null) ? $station['faq_refs'] : [],
            'display_contexts'   => is_array($station['display_contexts'] ?? null) ? $station['display_contexts'] : ['cost-builder'],
            'migration_complete' => true,
            'valid_from'         => $station['valid_from'] ?? null,
            'valid_until'        => $station['valid_until'] ?? null,
        ];

        return rest_ensure_response(['success' => true, 'total' => 1, 'packages' => [$row]]);
    }

    public function requireAdmin(): bool
    {
        return current_user_can('manage_options');
    }
}
