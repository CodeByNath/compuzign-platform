<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Http;

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;

/**
 * Admin-only REST endpoint for listing Surface Package records.
 *
 * GET /compuzign/v1/admin/surface-packages
 *
 * Returns a summary of every published surface package: post ID, title,
 * resolved service names, per-tier prices, popular tier, FAQ refs,
 * display contexts, and migration status.
 *
 * This endpoint is read-only; Surface Packages are managed via seeding or
 * future admin CRUD actions (Phase 2+).
 */
class AdminSurfacePackagesController
{
    public function __construct(private PackageRepository $repository) {}

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
        $posts = $this->repository->findAllPublished();

        $packages = array_map(function (\WP_Post $post): array {
            $pkg = get_post_meta($post->ID, 'cz_package', true);

            if (!is_array($pkg)) {
                return [
                    'post_id'            => (int) $post->ID,
                    'title'              => $post->post_title,
                    'package_type'       => null,
                    'service_refs'       => [],
                    'services'           => [],
                    'tiers'              => [],
                    'popular_tier'       => null,
                    'faq_refs'           => [],
                    'display_contexts'   => [],
                    'migration_complete' => false,
                    'valid_from'         => null,
                    'valid_until'        => null,
                ];
            }

            $serviceRefs = array_map('intval', $pkg['service_refs'] ?? []);
            $services    = $this->resolveServiceNames($serviceRefs);

            return [
                'post_id'            => (int) $post->ID,
                'title'              => $post->post_title,
                'package_type'       => $pkg['package_type'] ?? 'tier_configuration',
                'service_refs'       => $serviceRefs,
                'services'           => $services,
                'tiers'              => $this->summariseTiers($pkg['tiers'] ?? []),
                'popular_tier'       => $pkg['popular_tier'] ?? null,
                'faq_refs'           => $pkg['faq_refs'] ?? [],
                'display_contexts'   => $pkg['display_contexts'] ?? ['cost-builder'],
                'migration_complete' => (bool) ($pkg['migration_complete'] ?? false),
                'valid_from'         => $pkg['valid_from'] ?? null,
                'valid_until'        => $pkg['valid_until'] ?? null,
            ];
        }, $posts);

        return rest_ensure_response([
            'success'  => true,
            'total'    => count($packages),
            'packages' => $packages,
        ]);
    }

    public function requireAdmin(): bool
    {
        return is_user_logged_in() && current_user_can('manage_options');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * @param  int[]  $serviceIds
     * @return array<int, array{id: int, title: string, slug: string}>
     */
    private function resolveServiceNames(array $serviceIds): array
    {
        $out = [];
        foreach ($serviceIds as $id) {
            $post = get_post($id);
            if ($post instanceof \WP_Post && $post->post_type === 'cz_service') {
                $out[] = [
                    'id'    => (int) $post->ID,
                    'title' => $post->post_title,
                    'slug'  => $post->post_name,
                ];
            } else {
                $out[] = ['id' => $id, 'title' => '(deleted)', 'slug' => ''];
            }
        }
        return $out;
    }

    /**
     * Returns a price summary keyed by tier ID.
     *
     * @param  mixed $tiers
     * @return array<string, array{price: float|null, billing_cycle: string|null, inclusion_count: int}>
     */
    private function summariseTiers(mixed $tiers): array
    {
        if (!is_array($tiers)) {
            return [];
        }

        $out = [];
        foreach (['basic', 'standard', 'premium', 'enterprise'] as $tierId) {
            $t = $tiers[$tierId] ?? [];
            $out[$tierId] = [
                'price'           => isset($t['price']) && $t['price'] !== null ? (float) $t['price'] : null,
                'billing_cycle'   => $t['billing_cycle'] ?? null,
                'inclusion_count' => count($t['inclusions_override'] ?? []),
            ];
        }
        return $out;
    }
}
