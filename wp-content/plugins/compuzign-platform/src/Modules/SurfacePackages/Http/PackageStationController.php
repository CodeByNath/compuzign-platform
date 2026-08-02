<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Http;

use CompuZign\Platform\Modules\Admin\Support\PoolReferences;
use CompuZign\Platform\Modules\Service\Support\ServicePools;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageStationSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference;
use CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier\PackagePlatformIdentifierAdapters;
use CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier\PackagePlatformIdentifierService;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

/**
 * Package Station admin write/read endpoints — manager, tiers, occupant bin,
 * and the station-level popular selection.
 *
 * Ownership: these handlers moved here from the former AdminServicesController,
 * where they only ever lived because Package Station data used to be stored on
 * the Service post. That data now lives in independent option storage
 * (PackageRepository — cz_package_station); the handlers followed their data.
 *
 * Tier-instance and Manager URLs remain Service-scoped navigation paths, where
 * {id} supplies source-pool context only. Every Tier read or mutation also
 * requires its canonical instance identity. The assignment collection uses a
 * Package-global admin path because it relates two Package-owned peers and
 * needs no Service context. Every read/write goes through PackageRepository. See
 * docs/code-map/service-station.md.
 *
 * Promotions are a child collection of the Package Station and are owned by
 * Promotions\Http\PromotionsController, which reads and writes the same
 * PackageRepository storage.
 *
 * ServicePools is imported from Service\Support: the tier save path may carry
 * new_inclusions/new_faqs, which must be written through the Service-owned pool
 * contract rather than by touching cz_service_* meta here.
 *
 * File index (stable section markers below):
 * - ROUTE_REGISTRATION — Package global and Service-navigation REST contracts.
 * - ASSIGNMENT_LEDGER — create/list/remove peer relationships.
 * - TIER_INSTANCE_COLLECTION — independent instance CRUD and deletion guards.
 * - PACKAGE_READ_AND_MANAGER — selected-instance read plus Manager configuration.
 * - TIER_MUTATIONS — selected-instance slot lifecycle and popular state.
 * - INSTANCE_CONTEXT — instance-first resolution and one-instance persistence.
 */
class PackageStationController
{
    /**
     * Service post type — route context only. These endpoints validate that the
     * {id} in the path is a real Service before using it as navigation context;
     * the Service entity itself stays owned by the Service boundary.
     */
    private const POST_TYPE = 'cz_service';

    private PackagePlatformIdentifierService $platformIdentity;
    private PackagePlatformIdentifierAdapters $identityAdapters;
    private bool $identityEnabled;

    public function __construct(
        private PackageRepository $repository,
        ?PlatformIdentifierStation $platformIdentifiers = null
    ) {
        $this->identityEnabled = $platformIdentifiers !== null;
        $station = $platformIdentifiers ?? new PlatformIdentifierStation();
        $this->platformIdentity = new PackagePlatformIdentifierService($station);
        $this->identityAdapters = new PackagePlatformIdentifierAdapters($repository);
    }

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    /** Single Package Station authority (independent option storage). */
    private function packages(): PackageRepository
    {
        return $this->repository;
    }

    public function registerRoutes(): void
    {
        // ===================================================================
        // SECTION: ROUTE_REGISTRATION
        // ===================================================================
        register_rest_route('compuzign/v1', '/admin/package-station/tier-assignments', [
            'methods'             => 'GET',
            'callback'            => [$this, 'listTierAssignments'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        register_rest_route('compuzign/v1', '/admin/package-station/tier-assignments', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createTierAssignment'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'consumer_type'   => ['required' => true, 'type' => 'string'],
                'consumer_id'     => ['required' => true, 'type' => 'string'],
                'tier_instance_id' => ['required' => true, 'type' => 'string'],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/package-station/tier-assignments/(?P<assignment>[a-z0-9_]+)', [
            'methods'             => 'DELETE',
            'callback'            => [$this, 'deleteTierAssignment'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['assignment' => ['required' => true, 'type' => 'string']],
        ]);

        register_rest_route('compuzign/v1', '/admin/package-station/tier-instances', [
            'methods'             => 'GET',
            'callback'            => [$this, 'listTierInstances'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        register_rest_route('compuzign/v1', '/admin/tier-groups/(?P<platform_id>CZTG[A-Z0-9]+)', [
            'methods'             => 'GET',
            'callback'            => [$this, 'fetchTierGroupByPlatformId'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['platform_id' => ['required' => true, 'type' => 'string']],
        ]);
        register_rest_route('compuzign/v1', '/admin/tiers/(?P<platform_id>CZT[A-Z0-9]+)', [
            'methods' => 'GET', 'callback' => [$this, 'fetchTierByPlatformId'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => ['platform_id' => ['required' => true, 'type' => 'string']],
        ]);
        register_rest_route('compuzign/v1', '/admin/tier-addons/(?P<platform_id>CZTA[A-Z0-9]+)', [
            'methods' => 'GET', 'callback' => [$this, 'fetchTierAddonByPlatformId'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => ['platform_id' => ['required' => true, 'type' => 'string']],
        ]);
        register_rest_route('compuzign/v1', '/admin/rate-sheets/(?P<platform_id>CZPRC[A-Z0-9]+)', [
            'methods' => 'GET', 'callback' => [$this, 'fetchRateSheetByPlatformId'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => ['platform_id' => ['required' => true, 'type' => 'string']],
        ]);
        register_rest_route('compuzign/v1', '/admin/rate-sheet-groups/(?P<platform_id>CZPRCG[A-Z0-9]+)', [
            'methods' => 'GET', 'callback' => [$this, 'fetchRateSheetGroupByPlatformId'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => ['platform_id' => ['required' => true, 'type' => 'string']],
        ]);
        register_rest_route('compuzign/v1', '/admin/rate-sheet-items/(?P<platform_id>CZPRCI[A-Z0-9]+)', [
            'methods' => 'GET', 'callback' => [$this, 'fetchRateSheetItemByPlatformId'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => ['platform_id' => ['required' => true, 'type' => 'string']],
        ]);

        register_rest_route('compuzign/v1', '/admin/package-station/tier-instances', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createTierInstance'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['title' => ['required' => true, 'type' => 'string']],
        ]);

        register_rest_route('compuzign/v1', '/admin/package-station/tier-instances/(?P<instance>[a-z0-9_]+)', [
            'methods'             => 'PATCH',
            'callback'            => [$this, 'updateTierInstance'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['instance' => ['required' => true, 'type' => 'string']],
        ]);

        register_rest_route('compuzign/v1', '/admin/package-station/tier-instances/(?P<instance>[a-z0-9_]+)', [
            'methods'             => 'DELETE',
            'callback'            => [$this, 'deleteTierInstance'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['instance' => ['required' => true, 'type' => 'string']],
        ]);

        $instanceBase = '/admin/services/(?P<id>\d+)/package-station/tier-instances/(?P<instance>[a-z0-9_]+)';
        $instanceArgs = [
            'id'       => ['required' => true, 'type' => 'integer'],
            'instance' => ['required' => true, 'type' => 'string'],
        ];
        register_rest_route('compuzign/v1', $instanceBase . '/read', [
            'methods' => 'GET', 'callback' => [$this, 'getPackageStation'],
            'permission_callback' => [$this, 'requireAdmin'], 'args' => $instanceArgs,
        ]);
        register_rest_route('compuzign/v1', $instanceBase . '/tiers/(?P<tier>[a-z]+)', [
            'methods' => 'POST', 'callback' => [$this, 'savePackageStationTier'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => [...$instanceArgs, 'tier' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)]],
        ]);
        register_rest_route('compuzign/v1', $instanceBase . '/tiers/(?P<tier>[a-z]+)/enabled', [
            'methods' => 'POST', 'callback' => [$this, 'setPackageStationTierEnabled'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => [...$instanceArgs, 'tier' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)]],
        ]);
        register_rest_route('compuzign/v1', $instanceBase . '/tiers/(?P<tier>[a-z]+)/modules/(?P<module>[a-z]+)', [
            'methods' => 'POST', 'callback' => [$this, 'savePackageStationTierModule'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => [...$instanceArgs,
                'tier' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)],
                'module' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::TIER_MODULES, true)],
            ],
        ]);
        register_rest_route('compuzign/v1', $instanceBase . '/tiers/(?P<tier>[a-z]+)/archive', [
            'methods' => 'POST', 'callback' => [$this, 'archivePackageStationTierOccupant'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => [...$instanceArgs, 'tier' => ['required' => true, 'type' => 'string']],
        ]);
        register_rest_route('compuzign/v1', $instanceBase . '/bin/(?P<bin>[a-z0-9_]+)/restore', [
            'methods' => 'POST', 'callback' => [$this, 'restorePackageStationBinEntry'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => [...$instanceArgs, 'bin' => ['required' => true, 'type' => 'string']],
        ]);
        register_rest_route('compuzign/v1', $instanceBase . '/bin/(?P<bin>[a-z0-9_]+)/trash', [
            'methods' => 'POST', 'callback' => [$this, 'trashPackageStationBinEntry'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => [...$instanceArgs, 'bin' => ['required' => true, 'type' => 'string']],
        ]);
        register_rest_route('compuzign/v1', $instanceBase . '/bin/(?P<bin>[a-z0-9_]+)', [
            'methods' => 'DELETE', 'callback' => [$this, 'deletePackageStationBinEntry'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => [...$instanceArgs, 'bin' => ['required' => true, 'type' => 'string']],
        ]);
        register_rest_route('compuzign/v1', $instanceBase . '/tiers/(?P<tier>[a-z]+)/modules/(?P<module>overview|features|faqs)/revert', [
            'methods' => 'POST', 'callback' => [$this, 'revertPackageStationTierModule'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => [...$instanceArgs, 'tier' => ['required' => true, 'type' => 'string'], 'module' => ['required' => true, 'type' => 'string']],
        ]);
        register_rest_route('compuzign/v1', $instanceBase . '/tiers/(?P<tier>[a-z]+)/settle', [
            'methods' => 'POST', 'callback' => [$this, 'settlePackageStationTier'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args' => [...$instanceArgs, 'tier' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)]],
        ]);
        register_rest_route('compuzign/v1', $instanceBase . '/popular', [
            'methods' => 'POST', 'callback' => [$this, 'setPackageStationPopular'],
            'permission_callback' => [$this, 'requireAdmin'], 'args' => $instanceArgs,
        ]);

        // Package Station Manager — operational-facts-only read model.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/manager', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getPackageStationManager'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        // Atomic configuration commit. This is not a lifecycle transition:
        // only explicitly submitted decisions are upserted and settled.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/manager', [
            'methods'             => 'POST',
            'callback'            => [$this, 'savePackageStationManager'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

    }

    // ===================================================================
    // SECTION: ASSIGNMENT_LEDGER
    // ===================================================================

    public function listTierAssignments(\WP_REST_Request $request): \WP_REST_Response
    {
        [$station, $manager, $instances] = $this->assignmentState();
        $assignments = TierAssignmentSchema::sanitizeAssignments(
            $station['tier_assignments'] ?? [],
            ['package_family' => TierAssignmentSchema::consumerRegistryFor('package_family', $manager)],
            $instances
        );
        return rest_ensure_response(['success' => true, 'tier_assignments' => $assignments]);
    }

    public function createTierAssignment(\WP_REST_Request $request): \WP_REST_Response
    {
        [$station, $manager, $instances] = $this->assignmentState();
        $type = sanitize_text_field((string) $request->get_param('consumer_type'));
        $consumerId = sanitize_text_field((string) $request->get_param('consumer_id'));
        $instanceId = sanitize_text_field((string) $request->get_param('tier_instance_id'));
        $registry = TierAssignmentSchema::consumerRegistryFor($type, $manager);
        $assignments = TierAssignmentSchema::sanitizeAssignments(
            $station['tier_assignments'] ?? [],
            ['package_family' => TierAssignmentSchema::consumerRegistryFor('package_family', $manager)],
            $instances
        );

        try {
            $assignments = TierAssignmentSchema::assign(
                $assignments, $type, $consumerId, $instanceId, $registry, $instances
            );
        } catch (\RuntimeException $e) {
            return new \WP_REST_Response([
                'success' => false,
                'code' => $e->getMessage(),
                'message' => $e->getMessage(),
            ], 422);
        }

        $station['tier_assignments'] = $assignments;
        $this->packages()->saveStation($station);
        return rest_ensure_response([
            'success' => true,
            'assignment' => TierAssignmentSchema::findForConsumer($assignments, $type, $consumerId),
            'tier_assignments' => $assignments,
        ]);
    }

    public function deleteTierAssignment(\WP_REST_Request $request): \WP_REST_Response
    {
        [$station, $manager, $instances] = $this->assignmentState();
        $assignmentId = sanitize_text_field((string) $request->get_param('assignment'));
        $assignments = TierAssignmentSchema::sanitizeAssignments(
            $station['tier_assignments'] ?? [],
            ['package_family' => TierAssignmentSchema::consumerRegistryFor('package_family', $manager)],
            $instances
        );
        try {
            $assignments = TierAssignmentSchema::unassign($assignments, $assignmentId);
        } catch (\RuntimeException $e) {
            return new \WP_REST_Response([
                'success' => false,
                'code' => $e->getMessage(),
                'message' => $e->getMessage(),
            ], 404);
        }

        $station['tier_assignments'] = $assignments;
        $this->packages()->saveStation($station);
        return rest_ensure_response([
            'success' => true,
            'deleted' => $assignmentId,
            'tier_assignments' => $assignments,
        ]);
    }

    /** @return array{0:array,1:array,2:array} */
    private function assignmentState(): array
    {
        $station = $this->packages()->loadStation();
        if (!is_array($station) || $station === []) {
            $station = $this->packages()->defaultStation();
        }
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $instances = is_array($station['tier_instances'] ?? null) ? $station['tier_instances'] : [];
        return [$station, $manager, $instances];
    }

    // ===================================================================
    // SECTION: TIER_INSTANCE_COLLECTION
    // ===================================================================

    public function listTierInstances(\WP_REST_Request $request): \WP_REST_Response
    {
        $station = $this->packages()->loadStation() ?? $this->packages()->defaultStation();
        return rest_ensure_response([
            'success' => true,
            'tier_instances' => TierInstanceSchema::sanitizeInstances($station['tier_instances'] ?? []),
        ]);
    }

    public function fetchTierGroupByPlatformId(\WP_REST_Request $request): \WP_REST_Response
    {
        $platformId = sanitize_text_field((string) $request->get_param('platform_id'));
        try {
            $instance = $this->platformIdentity->resolveProjection($this->identityAdapters->tierGroup(), $platformId);
        } catch (\Throwable) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Tier Group identity is conflicting.'], 409);
        }
        if (!is_array($instance) || (string) ($instance['cz_platform_id'] ?? '') !== $platformId) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Tier Group not found.'], 404);
        }
        return rest_ensure_response(['success' => true, 'tier_instance' => $instance]);
    }

    public function fetchTierByPlatformId(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->fetchTierOccupantByPlatformId($request, false);
    }

    public function fetchTierAddonByPlatformId(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->fetchTierOccupantByPlatformId($request, true);
    }

    private function fetchTierOccupantByPlatformId(\WP_REST_Request $request, bool $addon): \WP_REST_Response
    {
        $platformId = sanitize_text_field((string) $request->get_param('platform_id'));
        $adapter = $addon ? $this->identityAdapters->tierAddon() : $this->identityAdapters->tier();
        try {
            $projection = $this->platformIdentity->resolveProjection($adapter, $platformId);
        } catch (\Throwable) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Tier identity is conflicting.'], 409);
        }
        if (!is_array($projection) || !is_array($projection['occupant'] ?? null)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Tier not found.'], 404);
        }
        $stored = (string) ($projection['occupant'][$addon ? 'addon_platform_id' : 'cz_platform_id'] ?? '');
        if ($stored !== $platformId) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Tier Platform identifier storage is conflicting.'], 409);
        }
        return rest_ensure_response(['success' => true, ...$projection]);
    }

    public function fetchRateSheetByPlatformId(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->fetchRateIdentityByPlatformId($request, false);
    }

    public function fetchRateSheetGroupByPlatformId(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->fetchRateIdentityByPlatformId($request, true);
    }

    public function fetchRateSheetItemByPlatformId(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->fetchRateIdentityByPlatformId($request, 'item');
    }

    private function fetchRateIdentityByPlatformId(\WP_REST_Request $request, bool|string $group): \WP_REST_Response
    {
        $platformId = sanitize_text_field((string) $request->get_param('platform_id'));
        $adapter = $group === 'item' ? $this->identityAdapters->rateSheetItem() : ($group ? $this->identityAdapters->rateSheetGroup() : $this->identityAdapters->rateSheet());
        try { $projection = $this->platformIdentity->resolveProjection($adapter, $platformId); }
        catch (\Throwable) { return new \WP_REST_Response(['success' => false, 'message' => 'Rate Sheet identity is conflicting.'], 409); }
        if (!is_array($projection) || !is_array($projection['record'] ?? null)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Rate Sheet record not found.'], 404);
        }
        if ((string) ($projection['record']['cz_platform_id'] ?? '') !== $platformId) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Rate Sheet Platform identifier storage is conflicting.'], 409);
        }
        return rest_ensure_response(['success' => true, ...$projection]);
    }

    public function createTierInstance(\WP_REST_Request $request): \WP_REST_Response
    {
        if ($rejection = $this->rejectPlatformIdMutation($request)) return $rejection;
        $station = $this->packages()->loadStation() ?? $this->packages()->defaultStation();
        $title = sanitize_text_field((string) $request->get_param('title'));
        if ($title === '') {
            return new \WP_REST_Response([
                'success' => false, 'code' => 'title_required',
                'message' => 'Tier instance title is required.',
            ], 422);
        }
        $body = $request->get_json_params();
        $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
        $reservation = null;
        if ($this->identityEnabled) {
            try {
                $reservation = $this->platformIdentity->reserve($this->identityAdapters->tierGroup());
            } catch (\Throwable) {
                return new \WP_REST_Response(['success' => false, 'message' => 'Could not reserve a permanent Tier Group identifier.'], 500);
            }
        }
        $instance = [
            'tier_instance_id' => TierInstanceSchema::mintInstanceId(),
            'cz_platform_id' => $reservation?->platformId() ?? '',
            'title' => $title,
            'description' => sanitize_textarea_field((string) (is_array($body) ? ($body['description'] ?? '') : '')),
            'status' => 'disabled',
            'allowed_rate_sheet_ids' => TierInstanceSchema::sanitizeAllowedRateSheetIds(
                is_array($body) ? ($body['allowed_rate_sheet_ids'] ?? []) : [],
                $manager['rate_sheets']
            ),
            'popular_tier' => null,
            'popular_label' => '',
            'tiers' => TierInstanceSchema::emptyTierMap(),
            'occupant_bin' => [],
        ];
        $instances = TierInstanceSchema::upsertInstance($station['tier_instances'] ?? [], $instance);
        $instance = TierInstanceSchema::findInstance($instances, $instance['tier_instance_id']);
        $station['tier_instances'] = $instances;
        $station['platform_status'] = TierInstanceSchema::deriveStationStatusFromInstances($instances);
        try {
            $this->packages()->saveStation($station);
        } catch (\Throwable) {
            if ($reservation !== null) $this->retireReservation($reservation);
            return new \WP_REST_Response(['success' => false, 'message' => 'Tier Group could not be persisted.'], 500);
        }
        if ($reservation !== null) {
            $nativeReference = PackagePlatformNativeReference::tierGroup((string) $instance['tier_instance_id']);
            try {
                $this->platformIdentity->bind($this->identityAdapters->tierGroup(), $reservation, $nativeReference);
            } catch (\Throwable) {
                $station['tier_instances'] = TierInstanceSchema::removeInstance($station['tier_instances'], (string) $instance['tier_instance_id']);
                try { $this->packages()->saveStation($station); } catch (\Throwable) {
                    return new \WP_REST_Response(['success' => false, 'message' => 'Tier Group identity binding failed and native rollback requires reconciliation.'], 500);
                }
                $this->retireReservation($reservation);
                return new \WP_REST_Response(['success' => false, 'message' => 'Tier Group creation could not confirm its permanent identifier.'], 500);
            }
        }
        return rest_ensure_response(['success' => true, 'tier_instance' => $instance]);
    }

    public function updateTierInstance(\WP_REST_Request $request): \WP_REST_Response
    {
        if ($rejection = $this->rejectPlatformIdMutation($request)) return $rejection;
        $instanceId = sanitize_text_field((string) $request->get_param('instance'));
        $station = $this->packages()->loadStation() ?? $this->packages()->defaultStation();
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $instanceId);
        if ($instance === null) {
            return $this->unknownTierInstanceResponse();
        }
        $body = $request->get_json_params();
        if (!is_array($body)) {
            $body = [];
        }
        if (array_key_exists('title', $body)) {
            $title = sanitize_text_field((string) $body['title']);
            if ($title === '') {
                return new \WP_REST_Response([
                    'success' => false, 'code' => 'title_required',
                    'message' => 'Tier instance title is required.',
                ], 422);
            }
            $instance['title'] = $title;
        }
        // A description is optional and may be cleared, so an empty string is a
        // real value here rather than an absent one.
        if (array_key_exists('description', $body)) {
            $instance['description'] = sanitize_textarea_field((string) $body['description']);
        }
        if (array_key_exists('allowed_rate_sheet_ids', $body)) {
            $manager = PackageManagerSchema::sanitize($station['package_manager'] ?? []);
            $instance['allowed_rate_sheet_ids'] = TierInstanceSchema::sanitizeAllowedRateSheetIds(
                $body['allowed_rate_sheet_ids'],
                $manager['rate_sheets']
            );
        }
        $station = TierInstanceSchema::withInstance($station, $instanceId, $instance);
        $station['platform_status'] = TierInstanceSchema::deriveStationStatusFromInstances($station['tier_instances']);
        $this->packages()->saveStation($station);
        return rest_ensure_response([
            'success' => true,
            'tier_instance' => TierInstanceSchema::findInstance($station['tier_instances'], $instanceId),
        ]);
    }

    public function deleteTierInstance(\WP_REST_Request $request): \WP_REST_Response
    {
        $instanceId = sanitize_text_field((string) $request->get_param('instance'));
        $station = $this->packages()->loadStation() ?? $this->packages()->defaultStation();
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $instanceId);
        if ($instance === null) {
            return $this->unknownTierInstanceResponse();
        }
        if (TierAssignmentSchema::findForInstance($station['tier_assignments'] ?? [], $instanceId) !== null) {
            return $this->instanceDeleteGuardResponse('instance_in_use', 'Remove the Tier assignment first.');
        }
        foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slot) {
            if (!is_array($slot)) {
                continue;
            }
            $hasOccupant = array_key_exists('current_occupant', $slot)
                ? is_array($slot['current_occupant'] ?? null) && $slot['current_occupant'] !== []
                : array_diff_key($slot, ['drafts' => true, 'module_status' => true]) !== [];
            if ($hasOccupant) {
                return $this->instanceDeleteGuardResponse('instance_has_occupants', 'Remove or archive every occupant first.');
            }
        }
        if (is_array($instance['occupant_bin'] ?? null) && $instance['occupant_bin'] !== []) {
            return $this->instanceDeleteGuardResponse('instance_has_bin_entries', 'Empty the occupant bin first.');
        }
        foreach (is_array($instance['tiers'] ?? null) ? $instance['tiers'] : [] as $slot) {
            foreach (is_array($slot['drafts'] ?? null) ? $slot['drafts'] : [] as $draft) {
                if ($draft !== null) {
                    return $this->instanceDeleteGuardResponse('instance_has_drafts', 'Discard every Tier draft first.');
                }
            }
        }

        $station['tier_instances'] = TierInstanceSchema::removeInstance($station['tier_instances'], $instanceId);
        $station['platform_status'] = TierInstanceSchema::deriveStationStatusFromInstances($station['tier_instances']);
        $this->packages()->saveStation($station);
        if ($this->identityEnabled && (string) ($instance['cz_platform_id'] ?? '') !== '') {
            try {
                $this->platformIdentity->tombstone(
                    $this->identityAdapters->tierGroup(),
                    PackagePlatformNativeReference::tierGroup($instanceId)
                );
            } catch (\Throwable) {
                return new \WP_REST_Response(['success' => false, 'message' => 'Tier Group was deleted but its Platform identifier tombstone requires reconciliation.'], 500);
            }
        }
        return rest_ensure_response(['success' => true, 'deleted' => $instanceId]);
    }

    private function rejectPlatformIdMutation(\WP_REST_Request $request): ?\WP_REST_Response
    {
        $body = $request->get_json_params();
        $body = is_array($body) ? $body : [];
        $fields = ['platform_id', 'platformId', PlatformIdentifierStation::META_KEY, 'addon_platform_id', 'addonPlatformId'];
        foreach ($fields as $field) {
            if ($request->get_param($field) !== null || $this->payloadContainsKey($body, $field)) {
                return new \WP_REST_Response(['success' => false, 'message' => 'Platform identifiers are immutable and output-only.'], 422);
            }
        }
        return null;
    }

    private function payloadContainsKey(array $payload, string $key): bool
    {
        if (array_key_exists($key, $payload)) return true;
        foreach ($payload as $value) {
            if (is_array($value) && $this->payloadContainsKey($value, $key)) return true;
        }
        return false;
    }

    private function retireReservation(\CompuZign\Platform\PlatformIdentifier\PlatformIdentifierReservation $reservation): void
    {
        try { $this->platformIdentity->retire($reservation); } catch (\Throwable) {
            // Never recycle an uncertain reservation.
        }
    }

    private function instanceDeleteGuardResponse(string $code, string $message): \WP_REST_Response
    {
        return new \WP_REST_Response(['success' => false, 'code' => $code, 'message' => $message], 409);
    }

    // ===================================================================
    // SECTION: PACKAGE_READ_AND_MANAGER
    // ===================================================================

    public function getPackageStation(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $context = $this->tierInstanceContext($request);
        if ($context instanceof \WP_REST_Response) {
            return $context;
        }
        [$station, $instanceId, $instance] = $context;
        $instanceStatus = TierInstanceSchema::deriveInstanceStatus($instance);

        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $PMS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema::class;
        $rawManager = is_array($station['package_manager'] ?? null) ? $station['package_manager'] : $PMS::defaultManager();
        $sanitizedManager = $PMS::sanitize($rawManager);
        [$incPool, $faqPool] = $this->packages()->sourcePools($station, $sanitizedManager['sources']);
        $managerModel = $PMS::buildReadModel($serviceId, $sanitizedManager, $incPool, $faqPool, $instanceStatus);
        $tiers = [];
        foreach ($PS::ALLOWED_TIERS as $tierId) {
            // P3 additive read exposure: settled detail (unchanged 8 fields) plus the
            // raw drafts + module_status, returned SEPARATELY. No server-side merge —
            // the hook derives draft-preferred client-side (parity with useServiceStation).
            $slot   = $PS::ensureTierLifecycle($instance['tiers'][$tierId] ?? []);
            $detail = $PS::normaliseTierSlot($slot);
            $detail['drafts']        = $slot['drafts'];
            $detail['module_status'] = $slot['module_status'];
            // B2 — pool refs resolve at read time: id authoritative, label refreshed
            // from the pool, danglers flagged (missing) but never pruned. Applies to
            // the settled occupant AND the pending features draft; the admin save
            // round-trip then persists the refreshed labels.
            $detail['inclusions_override'] = PoolReferences::refreshInclusionLabels(
                $incPool,
                is_array($detail['inclusions_override'] ?? null) ? $detail['inclusions_override'] : []
            );
            if (is_array($detail['drafts']['features'] ?? null)) {
                $detail['drafts']['features'] = $PS::sanitizeTierRateSheetSelections($detail['drafts']['features']);
            }
            $effectiveSelections = is_array($detail['drafts']['features'] ?? null)
                ? $detail['drafts']['features']
                : ($detail['rate_sheet_items'] ?? []);
            $rateProjection = $PMS::projectTierRateSheet(
                $serviceId, $rawManager, $effectiveSelections, $incPool,
                $faqPool, $instanceStatus,
                $detail['rate_sheet_id'] ?? null
            );
            $detail['rate_sheet_selections'] = $rateProjection['selections'];
            $detail['rate_sheet_items'] = $PS::sanitizeTierRateSheetSelections($effectiveSelections);
            $detail['price'] = $rateProjection['price'];
            $detail['contact'] = false;
            $detail['inclusions_override'] = array_map(
                fn(array $row): array => ['id' => $row['item_id'], 'label' => $row['label'], 'missing' => !$row['resolved']],
                array_values(array_filter($rateProjection['selections'], fn(array $row): bool => ($row['source_type'] ?? null) === 'inclusion'))
            );
            $detail['faq_refs'] = array_values(array_map(
                fn(array $row): string => (string) $row['source_id'],
                array_filter($rateProjection['selections'], fn(array $row): bool => ($row['source_type'] ?? null) === 'faq' && !empty($row['resolved']))
            ));
            if (is_array($detail['drafts']['overview'] ?? null)) {
                $detail['drafts']['overview']['price'] = $rateProjection['price'];
            }
            $tiers[$tierId] = $detail;
        }

        // D2 additive read exposure: the occupant bin (lazy-normalised; [] pre-D2).
        $instance = $PS::ensureOccupantBin($instance);

        $responseStation = [
            'platform_status' => $instanceStatus,
            'allowed_rate_sheet_ids' => $instance['allowed_rate_sheet_ids'] ?? [],
            'tiers'           => $tiers,
            'popular_tier'    => $instance['popular_tier'] ?? null,
            'popular_label'   => $instance['popular_label'] ?? '',
            'sort_position'   => (int) ($station['sort_position'] ?? 0),
            'bundle'          => $station['bundle'] ?? ['title' => '', 'description' => '', 'price' => null],
            'occupant_bin'    => $instance['occupant_bin'],
        ];
        $responseStation['tier_instance_id'] = $instanceId;

        return rest_ensure_response($this->instanceResponseEnvelope($request, $instanceId, [
            'success'    => true,
            'service_id' => $serviceId,
            'station'    => $responseStation,
            'service' => [
                'id'         => $serviceId,
                'title'      => $post->post_title,
                'inclusions' => array_values(array_filter(
                    is_array($incPool) ? $incPool : [],
                    fn($i) => is_array($i) && !empty($i['id']) && !empty($i['label'])
                )),
                'faqs'       => array_values(array_filter(
                    $faqPool,
                    fn($i) => is_array($i) && !empty($i['question'])
                )),
                'rate_sheets' => $managerModel['rate_sheets'],
                'rate_sheet_units' => $managerModel['rate_sheet_units'],
                'package_relationships' => $managerModel['items'],
            ],
        ]));
    }

    /**
     * Package Station Manager read endpoint (Phase B). Pure read: sanitizes
     * whatever `station.package_manager` currently holds (or in-memory
     * defaults it for a station that predates the key — never persisted here,
     * per the no-write-on-read contract), reconciles against the live
     * inclusion/FAQ pools, and returns PackageManagerSchema::buildReadModel's
     * operational-facts-only shape. No presentation status, no notes, no
     * writes of any kind.
     */
    public function getPackageStationManager(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $station = $this->packages()->loadStation();
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $PMS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema::class;

        // In-memory default for a station that predates package_manager — never
        // written back here; sanitize() always returns a fully-shaped array
        // regardless of what (if anything) was actually stored.
        $rawManager = is_array($station['package_manager'] ?? null) ? $station['package_manager'] : $PMS::defaultManager();
        $manager    = $PMS::sanitize($rawManager);
        [$incPool, $faqPool] = $this->packages()->sourcePools($station, $manager['sources']);

        // Stored platform_status is the parent operational fact (per the
        // accepted Phase B plan) — same field Cost Builder visibility already
        // trusts, not a re-derivation.
        $platformStatus = (string) ($station['platform_status'] ?? 'disabled');

        $readModel = $PMS::buildReadModel($serviceId, $manager, $incPool, $faqPool, $platformStatus);

        return rest_ensure_response([
            'success' => true,
            'manager' => $readModel,
        ]);
    }

    /**
     * Commit complete group configuration plus explicit Manager item
     * decisions. Omitted persisted decisions survive; omitted provisional
     * source items never enter storage and remain not-configured.
     */
    public function savePackageStationManager(\WP_REST_Request $request): \WP_REST_Response
    {
        if ($rejection = $this->rejectPlatformIdMutation($request)) return $rejection;
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $body = $request->get_json_params();
        // rate_sheets is a PARTIAL upsert set (may be empty) and rate_sheet_deletions
        // an explicit id list — neither need enumerate the full inventory. Legacy
        // clients may still send a singular rate_sheet; accept it as one upsert.
        $hasRateSheets = array_key_exists('rate_sheets', $body ?? []) || array_key_exists('rate_sheet', $body ?? []);
        if (!is_array($body) || !isset($body['sources'], $body['groups'], $body['item_decisions']) || !$hasRateSheets) {
            return rest_ensure_response([
                'success' => false,
                'message' => 'Sources, groups, item_decisions, and rate_sheets are required.',
            ]);
        }

        $submittedRateSheets = array_key_exists('rate_sheets', $body)
            ? $body['rate_sheets']
            : (is_array($body['rate_sheet'] ?? null) ? [$body['rate_sheet']] : []);
        if (!is_array($submittedRateSheets)) {
            return rest_ensure_response(['success' => false, 'message' => 'rate_sheets must be an array.']);
        }
        $rateSheetDeletions = is_array($body['rate_sheet_deletions'] ?? null) ? $body['rate_sheet_deletions'] : [];
        // An absent vocabulary is not an empty one: a caller that does not author
        // units leaves the stored list alone rather than erasing it.
        $submittedRateSheetUnits = array_key_exists('rate_sheet_units', $body)
            ? $body['rate_sheet_units']
            : null;

        // First-time configuration bootstraps the independent station anchor.
        $station = $this->packages()->loadStation() ?? $this->packages()->defaultStation();

        $PMS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema::class;
        $rawManager = is_array($station['package_manager'] ?? null)
            ? $station['package_manager']
            : $PMS::defaultManager();
        $storedManager = $PMS::sanitize($rawManager);

        // Delete/archive guards traverse every instance lifecycle envelope.
        $referenced = $this->packages()->rateSheetIdsInUse($station);
        foreach ($rateSheetDeletions as $deleteId) {
            $deleteId = sanitize_text_field((string) $deleteId);
            if ($deleteId !== '' && isset($referenced[$deleteId])) {
                return rest_ensure_response([
                    'success' => false,
                    'code'    => 'rate_sheet_in_use',
                    'message' => 'This Rate Sheet is still used by a Tier. Archive it or move those Tiers first.',
                ]);
            }
        }

        foreach ($submittedRateSheets as $submittedRateSheet) {
            if (!is_array($submittedRateSheet)) {
                continue;
            }
            $sheetId = sanitize_text_field((string) ($submittedRateSheet['rate_sheet_id'] ?? ''));
            $nextStatus = sanitize_text_field((string) ($submittedRateSheet['status'] ?? 'active'));
            $storedSheet = $PMS::findRateSheet($storedManager['rate_sheets'], $sheetId);
            if ($sheetId !== ''
                && $nextStatus === 'archived'
                && ($storedSheet['status'] ?? null) !== 'archived'
                && isset($referenced[$sheetId])
            ) {
                return rest_ensure_response([
                    'success' => false,
                    'code' => 'rate_sheet_in_use_archive',
                    'message' => 'This Rate Sheet is still bound by a Tier instance.',
                    'tier_instance_ids' => $this->packages()->rateSheetInstanceIdsInUse($station, $sheetId),
                ]);
            }
        }

        $submittedSources = PackageStationSchema::sanitizeSourceRelationships($body['sources']);
        [$incPool, $faqPool] = $this->packages()->sourcePools($station, $submittedSources);

        try {
            $manager = $PMS::commitConfiguration(
                $rawManager,
                $body['groups'],
                $body['item_decisions'],
                $incPool,
                $faqPool,
                $submittedRateSheets,
                $submittedSources,
                $rateSheetDeletions,
                $submittedRateSheetUnits
            );
        } catch (\InvalidArgumentException $e) {
            return rest_ensure_response(['success' => false, 'message' => $e->getMessage()]);
        }

        $identityAssignments = [];
        $identityDeletions = [];
        if ($this->identityEnabled) {
            $oldSheets = [];
            $oldGroups = [];
            $oldItems = [];
            foreach ($storedManager['rate_sheets'] as $sheet) {
                $sheetId = (string) ($sheet['rate_sheet_id'] ?? '');
                if ($sheetId === '') continue;
                $oldSheets[$sheetId] = $sheet;
                foreach ($sheet['groups'] as $group) {
                    $groupId = (string) ($group['group_id'] ?? '');
                    if ($groupId !== '') $oldGroups[$sheetId . "\0" . $groupId] = $group;
                }
                foreach ($sheet['items'] as $item) {
                    $itemId = (string) ($item['item_id'] ?? '');
                    if ($itemId !== '') $oldItems[$sheetId . "\0" . $itemId] = $item;
                }
            }
            try {
                foreach ($manager['rate_sheets'] as $sheetIndex => $sheet) {
                    $sheetId = (string) $sheet['rate_sheet_id'];
                    if (!isset($oldSheets[$sheetId])) {
                        $reservation = $this->platformIdentity->reserve($this->identityAdapters->rateSheet());
                        $manager['rate_sheets'][$sheetIndex]['cz_platform_id'] = $reservation->platformId();
                        $identityAssignments[] = [$this->identityAdapters->rateSheet(), $reservation, PackagePlatformNativeReference::rateSheet($sheetId)];
                    }
                    foreach ($sheet['groups'] as $groupIndex => $group) {
                        $groupId = (string) $group['group_id'];
                        if (!isset($oldGroups[$sheetId . "\0" . $groupId])) {
                            $reservation = $this->platformIdentity->reserve($this->identityAdapters->rateSheetGroup());
                            $manager['rate_sheets'][$sheetIndex]['groups'][$groupIndex]['cz_platform_id'] = $reservation->platformId();
                            $identityAssignments[] = [$this->identityAdapters->rateSheetGroup(), $reservation, PackagePlatformNativeReference::rateSheetGroup($sheetId, $groupId)];
                        }
                    }
                    foreach ($sheet['items'] as $itemIndex => $item) {
                        $itemId = (string) $item['item_id'];
                        if (!isset($oldItems[$sheetId . "\0" . $itemId])) {
                            $reservation = $this->platformIdentity->reserve($this->identityAdapters->rateSheetItem());
                            $manager['rate_sheets'][$sheetIndex]['items'][$itemIndex]['cz_platform_id'] = $reservation->platformId();
                            $identityAssignments[] = [$this->identityAdapters->rateSheetItem(), $reservation, PackagePlatformNativeReference::rateSheetItem($sheetId, $itemId)];
                        }
                    }
                }
            } catch (\Throwable) {
                foreach ($identityAssignments as [, $reservation]) $this->retireReservation($reservation);
                return new \WP_REST_Response(['success' => false, 'message' => 'Could not reserve Rate Sheet Platform identifiers.'], 500);
            }
            $newSheetIds = array_fill_keys(array_map(static fn(array $sheet): string => (string) $sheet['rate_sheet_id'], $manager['rate_sheets']), true);
            $newGroupKeys = [];
            foreach ($manager['rate_sheets'] as $sheet) foreach ($sheet['groups'] as $group) $newGroupKeys[(string) $sheet['rate_sheet_id'] . "\0" . (string) $group['group_id']] = true;
            $newItemKeys = [];
            foreach ($manager['rate_sheets'] as $sheet) foreach ($sheet['items'] as $item) $newItemKeys[(string) $sheet['rate_sheet_id'] . "\0" . (string) $item['item_id']] = true;
            foreach ($oldItems as $key => $item) if (!isset($newItemKeys[$key]) && (string) ($item['cz_platform_id'] ?? '') !== '') {
                [$sheetId, $itemId] = explode("\0", $key, 2);
                $identityDeletions[] = [$this->identityAdapters->rateSheetItem(), PackagePlatformNativeReference::rateSheetItem($sheetId, $itemId)];
            }
            foreach ($oldGroups as $key => $group) if (!isset($newGroupKeys[$key]) && (string) ($group['cz_platform_id'] ?? '') !== '') {
                [$sheetId, $groupId] = explode("\0", $key, 2);
                $identityDeletions[] = [$this->identityAdapters->rateSheetGroup(), PackagePlatformNativeReference::rateSheetGroup($sheetId, $groupId)];
            }
            foreach ($oldSheets as $sheetId => $sheet) if (!isset($newSheetIds[$sheetId]) && (string) ($sheet['cz_platform_id'] ?? '') !== '') {
                $identityDeletions[] = [$this->identityAdapters->rateSheet(), PackagePlatformNativeReference::rateSheet($sheetId)];
            }
        }

        // One postmeta write is the atomic storage boundary. Do not derive or
        // alter platform_status: the Manager owns no lifecycle.
        $station['package_manager'] = $manager;
        try {
            $this->packages()->saveStation($station);
        } catch (\Throwable) {
            foreach ($identityAssignments as [, $reservation]) $this->retireReservation($reservation);
            return new \WP_REST_Response(['success' => false, 'message' => 'Rate Sheet changes could not be persisted.'], 500);
        }
        try {
            foreach ($identityAssignments as [$adapter, $reservation, $nativeReference]) {
                $this->platformIdentity->bind($adapter, $reservation, $nativeReference);
            }
            foreach ($identityDeletions as [$adapter, $nativeReference]) {
                $this->platformIdentity->tombstone($adapter, $nativeReference);
            }
        } catch (\Throwable) {
            foreach ($identityAssignments as [, $reservation]) $this->retireReservation($reservation);
            return new \WP_REST_Response(['success' => false, 'message' => 'Rate Sheet changes persisted, but Platform identifier reconciliation is required.'], 500);
        }

        $platformStatus = (string) ($station['platform_status'] ?? 'disabled');
        $readModel = $PMS::buildReadModel($serviceId, $manager, $incPool, $faqPool, $platformStatus);

        return rest_ensure_response([
            'success' => true,
            'manager' => $readModel,
        ]);
    }

    // ===================================================================
    // SECTION: TIER_MUTATIONS
    // ===================================================================

    public function savePackageStationTier(\WP_REST_Request $request): \WP_REST_Response
    {
        if ($rejection = $this->rejectPlatformIdMutation($request)) return $rejection;
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid request body.']);
        }

        $context = $this->tierInstanceContext($request);
        if ($context instanceof \WP_REST_Response) {
            return $context;
        }
        [$station, $instanceId, $instance] = $context;

        // Add new inclusions/FAQs to the canonical pools of the service whose
        // items resolve unprefixed (the station's legacy host), so the stored
        // item IDs keep matching the source-pool namespace scheme.
        $poolServiceId   = (int) ($station['legacy_host_service_id'] ?? 0) ?: $serviceId;
        $addedInclusions = ServicePools::addInclusions($poolServiceId, $body['new_inclusions'] ?? []);
        $addedFaqRefs    = ServicePools::addFaqs($poolServiceId, $body['new_faqs'] ?? []);

        $existingDetail = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::normaliseTierSlot(
            $instance['tiers'][$tierId] ?? []
        );

        // Inclusions
        $inclusions = [];
        if (array_key_exists('inclusions_override', $body) && is_array($body['inclusions_override'])) {
            foreach ($body['inclusions_override'] as $inc) {
                if (!is_array($inc)) { continue; }
                $id = sanitize_text_field((string) ($inc['id'] ?? ''));
                $lb = sanitize_text_field((string) ($inc['label'] ?? ''));
                if ($id !== '' && $lb !== '') { $inclusions[] = ['id' => $id, 'label' => $lb]; }
            }
        } else {
            $inclusions = $existingDetail['inclusions_override'];
        }
        foreach ($addedInclusions as $inc) {
            if (!in_array($inc['id'], array_column($inclusions, 'id'), true)) { $inclusions[] = $inc; }
        }

        // FAQ refs
        $faqRefs = [];
        if (array_key_exists('faq_refs', $body) && is_array($body['faq_refs'])) {
            foreach ($body['faq_refs'] as $ref) {
                $ref = sanitize_text_field((string) $ref);
                if ($ref !== '') { $faqRefs[] = $ref; }
            }
        } else {
            $faqRefs = $existingDetail['faq_refs'];
        }
        foreach ($addedFaqRefs as $id) {
            if (!in_array($id, $faqRefs, true)) { $faqRefs[] = $id; }
        }

        $contact = !empty($body['contact']);
        $price   = null;
        if (!$contact && array_key_exists('price', $body) && $body['price'] !== null && $body['price'] !== '') {
            $price = (float) $body['price'];
        }
        $enabled = array_key_exists('enabled', $body) ? (bool) $body['enabled'] : $existingDetail['enabled'];

        $tierData = [
            'label'               => sanitize_text_field((string) ($body['label'] ?? $existingDetail['label'])),
            'price'               => $price,
            'contact'             => $contact,
            'billing_cycle'       => sanitize_text_field((string) ($body['billing_cycle'] ?? $existingDetail['billing_cycle'] ?? 'monthly')),
            'inclusions_override' => $inclusions,
            'features'            => [],
            'faq_refs'            => $faqRefs,
        ];

        // P2 store schema: an atomic tier save is a direct commit — the written slot
        // carries the lifecycle layer with no pending drafts and every module settled.
        // Additive/inert (no read path consumes it yet); response shape is unchanged
        // because it is built from normaliseTierSlot, which ignores these keys.
        $instance['tiers'][$tierId] = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::commitTierLifecycle(
            \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::upsertOccupant(
                $instance['tiers'][$tierId] ?? ['current_occupant' => null, 'history' => []],
                $tierData,
                $enabled
            )
        );

        if (array_key_exists('popular', $body)) {
            if ((bool) $body['popular']) {
                $instance['popular_tier']  = $tierId;
                $instance['popular_label'] = sanitize_text_field((string) ($body['popular_label'] ?? ''));
            } elseif (($instance['popular_tier'] ?? null) === $tierId) {
                $instance['popular_tier'] = null;
            }
        }

        $station = $this->persistTierInstance($station, $instanceId, $instance);
        $instance = TierInstanceSchema::findInstance($station['tier_instances'], $instanceId) ?? $instance;

        $tiers = [];
        foreach (\CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS as $tid) {
            $tiers[$tid] = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::normaliseTierSlot($instance['tiers'][$tid] ?? []);
        }

        $responseStation = [
            'platform_status' => TierInstanceSchema::deriveInstanceStatus($instance),
            'allowed_rate_sheet_ids' => $instance['allowed_rate_sheet_ids'] ?? [],
            'tiers' => $tiers,
            'popular_tier' => $instance['popular_tier'] ?? null,
            'popular_label' => $instance['popular_label'] ?? '',
            'sort_position' => (int) ($station['sort_position'] ?? 0),
            'bundle' => $station['bundle'] ?? ['title' => '', 'description' => '', 'price' => null],
            'occupant_bin' => $instance['occupant_bin'] ?? [],
        ];
        $responseStation['tier_instance_id'] = $instanceId;
        return rest_ensure_response($this->instanceResponseEnvelope($request, $instanceId, [
            'success'              => true,
            'station'              => $responseStation,
            'new_inclusions_added' => count($addedInclusions),
            'new_faqs_added'       => count($addedFaqRefs),
        ]));
    }

    public function setPackageStationTierEnabled(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $body    = $request->get_json_params();
        $enabled = isset($body['enabled']) ? (bool) $body['enabled'] : true;

        $context = $this->tierInstanceContext($request);
        if ($context instanceof \WP_REST_Response) {
            return $context;
        }
        [$station, $instanceId, $instance] = $context;

        $tierSlot = $instance['tiers'][$tierId] ?? [];
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        if ($PS::isOccupantFormat($tierSlot)) {
            if (!empty($tierSlot['current_occupant'])) {
                // Enable/Disable is the explicit-marker transition, never Publish:
                // both land the occupant inactive/unmasked-or-masked (Pending or
                // Disabled) — only settlePackageStationTier activates.
                $instance['tiers'][$tierId]['current_occupant']['platform_status'] = 'disabled';
                $instance['tiers'][$tierId]['current_occupant']['is_explicitly_disabled'] = !$enabled;
            }
        } else {
            if (!empty($tierSlot)) {
                $instance['tiers'][$tierId]['enabled'] = $enabled;
            }
        }

        $station = $this->persistTierInstance($station, $instanceId, $instance);
        $instance = TierInstanceSchema::findInstance($station['tier_instances'], $instanceId) ?? $instance;
        $slot = $PS::ensureTierLifecycle($instance['tiers'][$tierId] ?? []);

        // Authoritative occupant status, marker, drafts, and module statuses —
        // the frontend patches this response, never a synthetic slot.enabled.
        return rest_ensure_response($this->instanceResponseEnvelope($request, $instanceId, [
            'success'         => true,
            'tier_id'         => $tierId,
            'tier'            => $PS::normaliseTierSlot($slot),
            'drafts'          => $slot['drafts'],
            'module_status'   => $slot['module_status'],
            'platform_status' => TierInstanceSchema::deriveInstanceStatus($instance),
        ]));
    }

    /**
     * Phase 2 — P3: per-module tier draft save.
     * Persists drafts[$module] and marks the module pending. Does NOT touch
     * current_occupant, so Cost Builder visibility (platform_status) is unchanged.
     * References only — P3 does not create service-pool items (that is a later phase).
     */
    public function savePackageStationTierModule(\WP_REST_Request $request): \WP_REST_Response
    {
        if ($rejection = $this->rejectPlatformIdMutation($request)) return $rejection;
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));
        $module    = sanitize_key((string) $request->get_param('module'));

        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        if (!in_array($module, $PS::TIER_MODULES, true)) {
            return rest_ensure_response(['success' => false, 'message' => 'Unknown module.']);
        }

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $context = $this->tierInstanceContext($request);
        if ($context instanceof \WP_REST_Response) {
            return $context;
        }
        [$station, $instanceId, $instance] = $context;

        $body = $request->get_json_params();
        if (!is_array($body)) { $body = []; }

        $slot = $PS::ensureTierLifecycle($instance['tiers'][$tierId] ?? []);

        if ($module === 'overview') {
            $contact = !empty($body['contact']);
            $price   = null;
            if (!$contact && array_key_exists('price', $body) && $body['price'] !== null && $body['price'] !== '') {
                $price = (float) $body['price'];
            }
            $draftValue = [
                'label'         => sanitize_text_field((string) ($body['label'] ?? '')),
                'ideal_for'     => sanitize_textarea_field((string) ($body['ideal_for'] ?? '')),
                'price'         => null,
                'contact'       => $contact,
                'billing_cycle' => sanitize_text_field((string) ($body['billing_cycle'] ?? '')),
                // Selection-mode flag — normal Tier vs. stackable add-on. Carried
                // through the existing Overview module save flow rather than a new
                // endpoint; defaults false when the client omits it.
                'is_addon'      => !empty($body['is_addon']),
            ];
            // The Tier's bound Rate Sheet is edited alongside overview so a switch
            // commits (clearing selections at settle) before new rows are chosen.
            if (array_key_exists('rate_sheet_id', $body)) {
                $draftValue['rate_sheet_id'] = sanitize_text_field((string) ($body['rate_sheet_id'] ?? ''));
            }
        } elseif ($module === 'features') {
            $draftValue = $PS::sanitizeTierRateSheetSelections($body['rate_sheet_items'] ?? []);
        } else { // faqs
            $draftValue = [];
            if (is_array($body['faq_refs'] ?? null)) {
                foreach ($body['faq_refs'] as $ref) {
                    $ref = sanitize_text_field((string) $ref);
                    if ($ref !== '') { $draftValue[] = $ref; }
                }
            }
        }

        $slot['drafts'][$module]        = $draftValue;
        $slot['module_status'][$module] = 'pending';
        $instance['tiers'][$tierId] = $slot;
        $this->persistTierInstance($station, $instanceId, $instance);

        return rest_ensure_response($this->instanceResponseEnvelope($request, $instanceId, [
            'success'       => true,
            'tier_id'       => $tierId,
            'module'        => $module,
            'tier'          => $PS::normaliseTierSlot($slot),
            'drafts'        => $slot['drafts'],
            'module_status' => $slot['module_status'],
        ]));
    }

    /**
     * Engine D2 — archive a shell's occupant into the occupant_bin. Pending
     * drafts block the move unless discard_drafts: true (the UI confirms first);
     * the failure carries code: pending_drafts so the client can prompt. One
     * atomic meta write covers the bin append, the shell emptying, and the
     * station-status re-derive.
     */
    public function archivePackageStationTierOccupant(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $context = $this->tierInstanceContext($request);
        if ($context instanceof \WP_REST_Response) {
            return $context;
        }
        [$station, $instanceId, $instance] = $context;

        $body          = $request->get_json_params();
        $discardDrafts = is_array($body) && !empty($body['discard_drafts']);

        $result = $PS::archiveTierOccupant(
            $instance,
            $tierId,
            $discardDrafts,
            $PS::generateBinId(),
            current_time('mysql', true)
        );

        if (isset($result['error'])) {
            $message = match ($result['error']) {
                'unknown_tier'   => 'Unknown tier.',
                'no_occupant'    => 'This tier has no settled occupant to archive.',
                'pending_drafts' => 'This tier has unsettled changes. Discard them to archive.',
                default          => 'Archive failed.',
            };
            return rest_ensure_response(['success' => false, 'code' => $result['error'], 'message' => $message]);
        }

        $station = $this->persistTierInstance($station, $instanceId, $result['station']);

        $slot = $result['station']['tiers'][$tierId];
        return rest_ensure_response($this->instanceResponseEnvelope($request, $instanceId, [
            'success'         => true,
            'tier_id'         => $tierId,
            'tier'            => $PS::normaliseTierSlot($slot),
            'drafts'          => $slot['drafts'],
            'module_status'   => $slot['module_status'],
            'bin_entry'       => $result['entry'],
            'occupant_bin'    => $result['station']['occupant_bin'],
            'platform_status' => TierInstanceSchema::deriveInstanceStatus($result['station']),
        ]));
    }

    /**
     * Engine D3 — restore a binned occupant into a shell. Plain restore targets
     * the origin shell (must be empty); body may carry mode: swap|retarget plus
     * target_tier (retarget) and discard_drafts. Swap is composed in memory by
     * the schema op and persisted here in a SINGLE meta write. Failures carry
     * code so the UI can prompt (target_occupied → offer swap/retarget,
     * pending_drafts → confirm discard).
     */
    public function restorePackageStationBinEntry(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $binId     = sanitize_key((string) $request->get_param('bin'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $context = $this->tierInstanceContext($request);
        if ($context instanceof \WP_REST_Response) {
            return $context;
        }
        [$station, $instanceId, $instance] = $context;

        $body          = $request->get_json_params();
        $mode          = is_array($body) && isset($body['mode']) ? sanitize_key((string) $body['mode']) : '';
        $targetTier    = is_array($body) && isset($body['target_tier']) ? sanitize_key((string) $body['target_tier']) : '';
        $discardDrafts = is_array($body) && !empty($body['discard_drafts']);

        $result = $PS::restoreBinnedOccupant(
            $instance,
            $binId,
            $mode === '' ? null : $mode,
            $targetTier === '' ? null : $targetTier,
            $discardDrafts,
            $PS::generateBinId(),
            current_time('mysql', true)
        );

        if (isset($result['error'])) {
            $message = match ($result['error']) {
                'unknown_bin_entry'   => 'Bin entry not found.',
                'invalid_mode'        => 'Invalid restore mode.',
                'restore_illegal'     => 'This entry cannot be restored.',
                'origin_unknown'      => 'This entry has no origin tier. Retarget it into an empty tier.',
                'unknown_tier'        => 'Unknown target tier.',
                'target_occupied'     => 'The target tier is occupied. Swap with its occupant or retarget to an empty tier.',
                'target_not_occupied' => 'The origin tier is empty — restore without swap.',
                'pending_drafts'      => 'The target tier has unsettled changes. Discard them to restore.',
                default               => 'Restore failed.',
            };
            return rest_ensure_response(['success' => false, 'code' => $result['error'], 'message' => $message]);
        }

        $station = $this->persistTierInstance($station, $instanceId, $result['station']);

        $tierId = $result['tier_id'];
        $slot   = $result['station']['tiers'][$tierId];
        return rest_ensure_response($this->instanceResponseEnvelope($request, $instanceId, [
            'success'         => true,
            'bin_id'          => $binId,
            'tier_id'         => $tierId,
            'tier'            => $PS::normaliseTierSlot($slot),
            'drafts'          => $slot['drafts'],
            'module_status'   => $slot['module_status'],
            'displaced_entry' => $result['displaced'],
            'occupant_bin'    => $result['station']['occupant_bin'],
            'platform_status' => TierInstanceSchema::deriveInstanceStatus($result['station']),
        ]));
    }

    /** Engine D3 — trash a bin entry (archived → trashed, engine-validated). */
    public function trashPackageStationBinEntry(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $binId     = sanitize_key((string) $request->get_param('bin'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $context = $this->tierInstanceContext($request);
        if ($context instanceof \WP_REST_Response) {
            return $context;
        }
        [$station, $instanceId, $instance] = $context;

        $result = $PS::trashBinnedOccupant($instance, $binId);
        if (isset($result['error'])) {
            $message = match ($result['error']) {
                'unknown_bin_entry' => 'Bin entry not found.',
                'trash_illegal'     => 'Only archived entries can be moved to trash.',
                default             => 'Trash failed.',
            };
            return rest_ensure_response(['success' => false, 'code' => $result['error'], 'message' => $message]);
        }

        $this->persistTierInstance($station, $instanceId, $result['station']);

        return rest_ensure_response($this->instanceResponseEnvelope($request, $instanceId, [
            'success'      => true,
            'bin_id'       => $binId,
            'bin_entry'    => $result['entry'],
            'occupant_bin' => $result['station']['occupant_bin'],
        ]));
    }

    /**
     * Engine D3 — permanently delete a bin entry. Legal only from trashed
     * (engine-validated); the only operation removing an occupant_bin entry.
     */
    public function deletePackageStationBinEntry(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $binId     = sanitize_key((string) $request->get_param('bin'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $context = $this->tierInstanceContext($request);
        if ($context instanceof \WP_REST_Response) {
            return $context;
        }
        [$station, $instanceId, $instance] = $context;

        $result = $PS::deleteBinnedOccupant($instance, $binId);
        if (isset($result['error'])) {
            $message = match ($result['error']) {
                'unknown_bin_entry' => 'Bin entry not found.',
                'delete_illegal'    => 'Only trashed entries can be permanently deleted.',
                default             => 'Delete failed.',
            };
            return rest_ensure_response(['success' => false, 'code' => $result['error'], 'message' => $message]);
        }

        $this->persistTierInstance($station, $instanceId, $result['station']);

        $deletedOccupant = is_array($result['entry']['occupant'] ?? null) ? $result['entry']['occupant'] : [];
        $deletedOccupantId = (string) ($deletedOccupant['id'] ?? '');
        if ($this->identityEnabled && $deletedOccupantId !== '') {
            $nativeReference = PackagePlatformNativeReference::tierOccupant($instanceId, $deletedOccupantId);
            try {
                if ((string) ($deletedOccupant['cz_platform_id'] ?? '') !== '') {
                    $this->platformIdentity->tombstone($this->identityAdapters->tier(), $nativeReference);
                }
                if ((string) ($deletedOccupant['addon_platform_id'] ?? '') !== '') {
                    $this->platformIdentity->tombstone($this->identityAdapters->tierAddon(), $nativeReference);
                }
            } catch (\Throwable) {
                return new \WP_REST_Response([
                    'success' => false,
                    'message' => 'Tier occupant was deleted but its Platform identifier tombstone requires reconciliation.',
                    'native_reference' => $nativeReference,
                ], 500);
            }
        }

        return rest_ensure_response($this->instanceResponseEnvelope($request, $instanceId, [
            'success'      => true,
            'bin_id'       => $binId,
            'deleted'      => true,
            'occupant_bin' => $result['station']['occupant_bin'],
        ]));
    }

    /**
     * Engine D1 — revert one tier module draft. Clears drafts[module]; the
     * module's status re-derives from the settled occupant. Response shape
     * matches savePackageStationTierModule so the hook patches identically.
     */
    public function revertPackageStationTierModule(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));
        $module    = sanitize_key((string) $request->get_param('module'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }
        if (!in_array($tierId, $PS::ALLOWED_TIERS, true)) {
            return rest_ensure_response(['success' => false, 'message' => 'Unknown tier.']);
        }

        $context = $this->tierInstanceContext($request);
        if ($context instanceof \WP_REST_Response) {
            return $context;
        }
        [$station, $instanceId, $instance] = $context;

        $slot = $PS::revertTierModuleDraft($instance['tiers'][$tierId] ?? [], $module);
        if ($slot === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid module.']);
        }

        $instance['tiers'][$tierId] = $slot;
        $this->persistTierInstance($station, $instanceId, $instance);

        return rest_ensure_response($this->instanceResponseEnvelope($request, $instanceId, [
            'success'       => true,
            'tier_id'       => $tierId,
            'module'        => $module,
            'tier'          => $PS::normaliseTierSlot($slot),
            'drafts'        => $slot['drafts'],
            'module_status' => $slot['module_status'],
        ]));
    }

    /**
     * Phase 2 — P3: settle a tier.
     * Commits the draft-preferred state of every module into current_occupant,
     * clears drafts, marks all modules settled, and re-derives station status.
     */
    public function settlePackageStationTier(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $tierId    = sanitize_key((string) $request->get_param('tier'));
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $context = $this->tierInstanceContext($request);
        if ($context instanceof \WP_REST_Response) {
            return $context;
        }
        [$station, $instanceId, $instance] = $context;

        $originalSlot = is_array($instance['tiers'][$tierId] ?? null) ? $instance['tiers'][$tierId] : [];
        $hadOccupant = is_array($originalSlot['current_occupant'] ?? null);
        $slot = $PS::settleTierSlot($originalSlot);
        $occupant = is_array($slot['current_occupant'] ?? null) ? $slot['current_occupant'] : null;
        $primaryReservation = null;
        $addonReservation = null;
        if ($this->identityEnabled && $occupant !== null) {
            try {
                if (!$hadOccupant && (string) ($occupant['cz_platform_id'] ?? '') === '') {
                    $primaryReservation = $this->platformIdentity->reserve($this->identityAdapters->tier());
                    $slot['current_occupant']['cz_platform_id'] = $primaryReservation->platformId();
                }
                if ((bool) ($occupant['is_addon'] ?? false) && (string) ($occupant['addon_platform_id'] ?? '') === '') {
                    $addonReservation = $this->platformIdentity->reserve($this->identityAdapters->tierAddon());
                    $slot['current_occupant']['addon_platform_id'] = $addonReservation->platformId();
                }
            } catch (\Throwable) {
                if ($primaryReservation !== null) $this->retireReservation($primaryReservation);
                if ($addonReservation !== null) $this->retireReservation($addonReservation);
                return new \WP_REST_Response(['success' => false, 'message' => 'Could not reserve the Tier Platform identifier.'], 500);
            }
        }
        $instance['tiers'][$tierId] = $slot;
        try {
            $this->persistTierInstance($station, $instanceId, $instance);
        } catch (\Throwable) {
            if ($primaryReservation !== null) $this->retireReservation($primaryReservation);
            if ($addonReservation !== null) $this->retireReservation($addonReservation);
            return new \WP_REST_Response(['success' => false, 'message' => 'Tier settlement could not be persisted.'], 500);
        }

        if ($occupant !== null && ($primaryReservation !== null || $addonReservation !== null)) {
            $nativeReference = PackagePlatformNativeReference::tierOccupant(
                $instanceId,
                (string) $slot['current_occupant']['id']
            );
            try {
                if ($primaryReservation !== null) {
                    $this->platformIdentity->bind($this->identityAdapters->tier(), $primaryReservation, $nativeReference);
                }
                if ($addonReservation !== null) {
                    $this->platformIdentity->bind($this->identityAdapters->tierAddon(), $addonReservation, $nativeReference);
                }
            } catch (\Throwable) {
                // A bound primary identity must never be detached from its
                // occupant. Leave the persisted record intact for explicit
                // reconciliation; only still-reserved claims are retired.
                if ($primaryReservation !== null) $this->retireReservation($primaryReservation);
                if ($addonReservation !== null) $this->retireReservation($addonReservation);
                return new \WP_REST_Response([
                    'success' => false,
                    'message' => 'Tier settlement persisted, but Platform identifier binding requires reconciliation.',
                    'native_reference' => $nativeReference,
                ], 500);
            }
        }

        return rest_ensure_response($this->instanceResponseEnvelope($request, $instanceId, [
            'success'       => true,
            'tier_id'       => $tierId,
            'platform_status' => TierInstanceSchema::deriveInstanceStatus($instance),
            'tier'          => $PS::normaliseTierSlot($slot),
            'drafts'        => $slot['drafts'],
            'module_status' => $slot['module_status'],
        ]));
    }

    /**
     * Phase 2 — P5: set the station-level popular tier.
     * `tier_id` selects the popular tier (must be a known tier); a null/empty
     * `tier_id` clears the selection. `label` is the popular badge text.
     */
    public function setPackageStationPopular(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $context = $this->tierInstanceContext($request);
        if ($context instanceof \WP_REST_Response) {
            return $context;
        }
        [$station, $instanceId, $instance] = $context;

        $body   = $request->get_json_params();
        if (!is_array($body)) { $body = []; }
        $tierId = sanitize_key((string) ($body['tier_id'] ?? ''));

        if ($tierId !== '' && in_array($tierId, $PS::ALLOWED_TIERS, true)) {
            $instance['popular_tier']  = $tierId;
            $instance['popular_label'] = sanitize_text_field((string) ($body['label'] ?? ''));
        } else {
            $instance['popular_tier']  = null;
            $instance['popular_label'] = '';
        }

        $this->persistTierInstance($station, $instanceId, $instance);

        return rest_ensure_response($this->instanceResponseEnvelope($request, $instanceId, [
            'success'       => true,
            'popular_tier'  => $instance['popular_tier'],
            'popular_label' => $instance['popular_label'],
        ]));
    }

    // ===================================================================
    // SECTION: INSTANCE_CONTEXT
    // ===================================================================

    /** @return array{0:array,1:string,2:array}|\WP_REST_Response */
    private function tierInstanceContext(\WP_REST_Request $request): array|\WP_REST_Response
    {
        $instanceId = sanitize_text_field((string) $request->get_param('instance'));
        if ($instanceId === '') {
            return $this->unknownTierInstanceResponse();
        }
        $station = $this->packages()->loadStation();
        if (!is_array($station) || $station === []) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }
        $instance = TierInstanceSchema::findInstance($station['tier_instances'] ?? [], $instanceId);
        if ($instance === null) {
            return $this->unknownTierInstanceResponse();
        }
        return [$station, $instanceId, $instance];
    }

    private function persistTierInstance(array $station, string $instanceId, array $instance): array
    {
        $station = TierInstanceSchema::withInstance($station, $instanceId, $instance);
        $station['platform_status'] = TierInstanceSchema::deriveStationStatusFromInstances(
            $station['tier_instances'] ?? []
        );
        $this->packages()->saveStation($station);
        return $station;
    }

    private function unknownTierInstanceResponse(): \WP_REST_Response
    {
        return new \WP_REST_Response([
            'success' => false,
            'code' => 'unknown_tier_instance',
            'message' => 'Tier instance not found.',
        ], 404);
    }

    /** @param array<string, mixed> $payload @return array<string, mixed> */
    private function instanceResponseEnvelope(\WP_REST_Request $request, string $instanceId, array $payload): array
    {
        $payload['tier_instance_id'] = $instanceId;
        return $payload;
    }

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Core\PlatformAccess::CAP);
    }
}
