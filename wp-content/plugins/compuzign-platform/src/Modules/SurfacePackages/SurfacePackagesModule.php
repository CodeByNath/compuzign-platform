<?php

namespace CompuZign\Platform\Modules\SurfacePackages;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\CostBuilder\Support\MetaSchema;
use CompuZign\Platform\Modules\SurfacePackages\Http\AdminSurfacePackagesController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;

/**
 * Surface Packages module.
 *
 * Registers the cz_package post meta schema and wires the surface_packages
 * health check into the River integrity registry. The cz_surface_package post
 * type itself is registered in PostTypeRegistrar alongside cz_service.
 */
class SurfacePackagesModule
{
    public function register(): void
    {
        (new PackageSchema())->register();
        (new AdminSurfacePackagesController(new PackageRepository()))->register();

        Health::register('surface_packages', static function (): bool {
            if (!post_type_exists('cz_surface_package')) {
                return false;
            }

            // No published packages → nothing to validate; system is healthy.
            $published = get_posts([
                'post_type'      => 'cz_surface_package',
                'post_status'    => 'publish',
                'numberposts'    => -1,
                'fields'         => 'ids',
                'no_found_rows'  => true,
                'update_post_meta_cache' => false,
                'update_post_term_cache' => false,
            ]);

            if (empty($published)) {
                return true;
            }

            foreach ($published as $postId) {
                $pkg = get_post_meta((int) $postId, 'cz_package', true);

                // Corrupt meta — package exists but cannot be read
                if (!is_array($pkg)) {
                    return false;
                }

                $refs = $pkg['service_refs'] ?? [];

                // A package with no service_refs is incomplete but not broken;
                // skip integrity check for it.
                if (empty($refs)) {
                    continue;
                }

                // Verify every referenced service ID resolves to an active cz_service.
                // An orphan or disabled service reference is a River integrity failure.
                foreach ($refs as $serviceId) {
                    $serviceId = (int) $serviceId;
                    if ($serviceId <= 0) {
                        return false;
                    }

                    $service = get_post($serviceId);
                    if (!$service instanceof \WP_Post || $service->post_type !== 'cz_service') {
                        return false;
                    }

                    $svcMeta = get_post_meta($serviceId, 'cz_service_meta', true);
                    $svcMeta = is_array($svcMeta) ? $svcMeta : [];
                    if (MetaSchema::resolvePlatformStatus($svcMeta, $service->post_status) !== 'active') {
                        return false;
                    }
                }
            }

            return true;
        });
    }
}
