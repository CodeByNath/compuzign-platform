<?php

namespace CompuZign\Platform\Modules\SurfacePackages;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\SurfacePackages\Http\PackageFamiliesController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;

/**
 * Surface Packages module.
 *
 * The Package Station lives in independent option storage
 * (PackageRepository::OPTION_KEY) — the single commercial authority consumed
 * by the admin Package Manager routes and the Cost Builder. This module wires
 * the station integrity check into the River health registry. The retired
 * cz_surface_package post type remains registered in PostTypeRegistrar only
 * so historical records stay queryable; nothing writes to it.
 */
class SurfacePackagesModule
{
    public function register(): void
    {
        (new PackageFamiliesController())->register();
        (new \CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationReadController(new PackageRepository()))->register();
        (new \CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationController(new PackageRepository()))->register();

        Health::register('package_station', static function (): bool {
            $station = get_option(PackageRepository::OPTION_KEY, null);

            // No station yet — nothing to validate; system is healthy.
            if ($station === null || $station === false) {
                return true;
            }

            if (!is_array($station)) {
                return false; // corrupt anchor
            }

            $status = $station['platform_status'] ?? 'disabled';
            if (!in_array($status, PackageSchema::ALLOWED_PLATFORM_STATUSES, true)) {
                return false;
            }

            // Manager must sanitize cleanly; a throw here means corrupt storage.
            try {
                PackageManagerSchema::sanitize($station['package_manager'] ?? []);
                $lifted = TierInstanceSchema::liftLegacyStation($station);
                $instances = TierInstanceSchema::sanitizeInstances($lifted['tier_instances'] ?? []);
                $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
                $familyRegistry = TierAssignmentSchema::consumerRegistryFor('package_family', $manager);
                $assignments = TierAssignmentSchema::sanitizeAssignments(
                    $station['tier_assignments'] ?? [],
                    ['package_family' => $familyRegistry],
                    $instances
                );
            } catch (\Throwable) {
                return false;
            }

            // Reports the cutover state only. It never assigns, mints, repairs,
            // or persists. Live legacy Tiers require one resolvable assignment
            // to an existing active Family before the public projection cutover.
            $hasLiveLegacyTiers = TierInstanceSchema::deriveStationStatusFromInstances($instances) === 'active';
            if ($hasLiveLegacyTiers) {
                $resolvable = false;
                foreach ($assignments as $assignment) {
                    $family = PackageCategoryGroups::find(
                        $manager['category_groups'],
                        (string) $assignment['consumer_id']
                    );
                    if (is_array($family) && ($family['platform_status'] ?? null) === 'active') {
                        $resolvable = true;
                        break;
                    }
                }
                if (!$resolvable) {
                    return false;
                }
            }

            return true;
        });
    }
}
