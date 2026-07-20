<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Http;

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCapabilityAssignments;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;

/** Package-owned capability assignment read/write boundary. */
final class PackageCapabilityController
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
        register_rest_route('compuzign/v1', '/admin/package-station/capabilities', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getAssignments'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        register_rest_route('compuzign/v1', '/admin/package-station/capabilities', [
            'methods'             => 'PUT',
            'callback'            => [$this, 'saveAssignment'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);
    }

    public function getAssignments(\WP_REST_Request $request): \WP_REST_Response
    {
        [$station, $manager] = $this->loadStationAndManager();
        return $this->response($manager);
    }

    public function saveAssignment(\WP_REST_Request $request): \WP_REST_Response
    {
        $body = $request->get_json_params();
        if (!is_array($body)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Invalid request body.'], 400);
        }

        [$station, $manager] = $this->loadStationAndManager();

        try {
            $manager['capability_assignments'] = PackageCapabilityAssignments::upsert(
                $manager['capability_assignments'],
                (string) ($body['owner_type'] ?? ''),
                (string) ($body['owner_id'] ?? ''),
                (string) ($body['capability_key'] ?? ''),
                (bool) ($body['enabled'] ?? false)
            );
        } catch (\InvalidArgumentException $e) {
            return new \WP_REST_Response(['success' => false, 'message' => $e->getMessage()], 422);
        }

        // The only write: assignment/configuration inside Package Manager.
        // No capability authority collection (including station.tiers) is read
        // or mutated by this controller.
        $station['package_manager'] = PackageManagerSchema::sanitize($manager);
        $this->repository->saveStation($station);

        return $this->response($station['package_manager']);
    }

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Modules\Admin\AdminRouter::CAP);
    }

    /** @return array{0:array,1:array} */
    private function loadStationAndManager(): array
    {
        $station = $this->repository->loadStation();
        if (!is_array($station) || $station === []) {
            $station = $this->repository->defaultStation();
        }
        $manager = PackageManagerSchema::sanitize(
            is_array($station['package_manager'] ?? null)
                ? $station['package_manager']
                : PackageManagerSchema::defaultManager()
        );
        $station['package_manager'] = $manager;
        return [$station, $manager];
    }

    private function response(array $manager): \WP_REST_Response
    {
        return rest_ensure_response([
            'success' => true,
            'owner' => [
                'owner_type' => PackageCapabilityAssignments::OWNER_PACKAGE_MANAGER,
                'owner_id'   => PackageCapabilityAssignments::PACKAGE_MANAGER_ID,
            ],
            'registered_capabilities' => PackageCapabilityAssignments::registered(),
            'assignments'             => PackageCapabilityAssignments::sanitize($manager['capability_assignments'] ?? []),
        ]);
    }
}
