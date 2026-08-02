<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Http;

use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierBinding;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierConflict;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierReservation;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

/**
 * PackageFamiliesController — the Package Family station's REST family.
 *
 * Route grammar, lifecycle handling, and draft/settle/revert mechanics mirror
 * AdminCategoryGroupsController exactly; the differences are ownership and
 * guard:
 *   - the station collection lives inside the Package Station option
 *     (`cz_package_station` → package_manager.category_groups) via
 *     PackageRepository — Package-owned, never taxonomy terms
 *   - permanent deletion first rejects a Tier assignment, then checks the
 *     unchanged commercial dependents (Services, Rate Sheet rows, selections)
 *
 * Transitions are computed by StationLifecycle (through
 * PackageCategoryGroups); this controller persists engine results only.
 */
class PackageFamiliesController
{
    private ?PackageRepository $packages = null;
    private PlatformIdentifierStation $platformIdentifiers;
    private bool $identityEnabled;

    /** Optional construction is retained for isolated legacy contract harnesses. */
    public function __construct(?PlatformIdentifierStation $platformIdentifiers = null)
    {
        $this->identityEnabled = $platformIdentifiers !== null;
        $this->platformIdentifiers = $platformIdentifiers ?? new PlatformIdentifierStation();
    }

    private function packages(): PackageRepository
    {
        return $this->packages ??= new PackageRepository();
    }

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        // ── Station list (admin only) ─────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/package-category-groups', [
            'methods'             => 'GET',
            'callback'            => [$this, 'listGroups'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'platform_status' => [
                    'required' => false,
                    'type'     => 'string',
                    'enum'     => [StationLifecycle::STATUS_ARCHIVED, StationLifecycle::STATUS_TRASHED],
                ],
            ],
        ]);

        // ── Station create (born disabled) ────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/package-category-groups', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createGroup'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'name'        => ['required' => true,  'type' => 'string',
                                  'sanitize_callback' => 'sanitize_text_field'],
                'description' => ['required' => false, 'type' => 'string',
                                  'sanitize_callback' => 'sanitize_textarea_field'],
            ],
        ]);

        // ── Overview draft save ───────────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/package-category-groups/(?P<gid>[a-z0-9_]+)/overview', [
            'methods'             => 'PUT',
            'callback'            => [$this, 'saveOverview'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'gid'         => ['required' => true,  'type' => 'string'],
                'name'        => ['required' => true,  'type' => 'string',
                                  'sanitize_callback' => 'sanitize_text_field'],
                'description' => ['required' => false, 'type' => 'string',
                                  'sanitize_callback' => 'sanitize_textarea_field'],
            ],
        ]);

        // ── Overview settle (commit draft) ────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/package-category-groups/(?P<gid>[a-z0-9_]+)/overview/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settleOverview'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['gid' => ['required' => true, 'type' => 'string']],
        ]);

        // ── Overview revert (discard draft) ───────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/package-category-groups/(?P<gid>[a-z0-9_]+)/overview/revert', [
            'methods'             => 'POST',
            'callback'            => [$this, 'revertOverview'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['gid' => ['required' => true, 'type' => 'string']],
        ]);

        // ── Platform status (engine transition) ───────────────────────────────
        register_rest_route('compuzign/v1', '/admin/package-category-groups/(?P<gid>[a-z0-9_]+)/status', [
            'methods'             => 'PATCH',
            'callback'            => [$this, 'updateStatus'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'gid'             => ['required' => true, 'type' => 'string'],
                'platform_status' => [
                    'required' => false,
                    'type'     => 'string',
                    'enum'     => [
                        StationLifecycle::STATUS_ACTIVE,
                        StationLifecycle::STATUS_DISABLED,
                        StationLifecycle::STATUS_ARCHIVED,
                        StationLifecycle::STATUS_TRASHED,
                    ],
                ],
                'action' => [
                    'required' => false,
                    'type'     => 'string',
                    'enum'     => ['disable', 'enable'],
                ],
            ],
        ]);

        // ── Restore (server-driven — always lands disabled) ───────────────────
        register_rest_route('compuzign/v1', '/admin/package-category-groups/(?P<gid>[a-z0-9_]+)/restore', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restoreGroup'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['gid' => ['required' => true, 'type' => 'string']],
        ]);

        // ── Permanent delete (trashed only + dependency guard) ────────────────
        register_rest_route('compuzign/v1', '/admin/package-category-groups/(?P<gid>[a-z0-9_]+)', [
            'methods'             => 'DELETE',
            'callback'            => [$this, 'permanentDeleteGroup'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['gid' => ['required' => true, 'type' => 'string']],
        ]);
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    public function listGroups(\WP_REST_Request $request): \WP_REST_Response
    {
        $filterStatus = $request->get_param('platform_status'); // 'archived', 'trashed', or null.
        [$station, $manager] = $this->loadStationAndManager();

        $readModelItems = $this->readModelItems($station, $manager);

        $groups = [];
        foreach ($manager['category_groups'] as $group) {
            $dependents = PackageCategoryGroups::dependents($station, $readModelItems, (string) $group['group_id']);
            $projection = PackageCategoryGroups::projection($group, $dependents);
            $projection['tier_assignment_count'] = PackageCategoryGroups::tierAssignmentCount(
                $station['tier_assignments'] ?? [],
                (string) $group['group_id']
            );
            $projection['active_tier_slots'] = PackageCategoryGroups::activeTierSlotSummary(
                $station,
                (string) $group['group_id']
            );
            $projection['related_service_ids'] = PackageCategoryGroups::relatedServiceIds(
                $station,
                (string) $group['group_id']
            );

            if ($filterStatus !== null) {
                if ($projection['platform_status'] !== $filterStatus) {
                    continue;
                }
            } elseif (StationLifecycle::isBinned($projection['platform_status'])) {
                continue;
            }

            $groups[] = $projection;
        }

        return rest_ensure_response(['package_category_groups' => $groups]);
    }

    public function createGroup(\WP_REST_Request $request): \WP_REST_Response
    {
        if ($rejection = $this->rejectPlatformIdMutation($request)) return $rejection;
        $name        = (string) $request->get_param('name');
        $description = (string) ($request->get_param('description') ?? '');

        if ($name === '') {
            return new \WP_REST_Response(['success' => false, 'message' => 'Package Family name is required.'], 422);
        }

        // First-time configuration bootstraps the independent station anchor,
        // same as the manager save endpoint.
        [$station, $manager] = $this->loadStationAndManager();

        // Isolated pre-identity contract harnesses instantiate the controller
        // directly. Production always receives Core's shared Station through
        // SurfacePackagesModule and therefore always takes the integrated path.
        if (!$this->identityEnabled) {
            try {
                $result = PackageCategoryGroups::create($manager['category_groups'], $name, $description);
            } catch (\InvalidArgumentException $e) {
                return new \WP_REST_Response(['success' => false, 'message' => $e->getMessage()], 422);
            }
            $station = $this->persistGroups($station, $manager, $result['groups']);
            return $this->groupResponse($station, (string) $result['group']['group_id']);
        }

        try {
            $reservation = $this->platformIdentifiers->reserve(
                PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP,
                fn(string $platformId): bool => $this->packages()->familyPlatformIdExists($platformId)
            );
        } catch (\Throwable) {
            return new \WP_REST_Response([
                'success' => false,
                'message' => 'Could not reserve a permanent Package Family identifier.',
            ], 500);
        }

        try {
            $result = PackageCategoryGroups::create(
                $manager['category_groups'],
                $name,
                $description,
                null,
                $reservation->platformId()
            );
        } catch (\InvalidArgumentException $e) {
            $this->retireReservation($reservation);
            return new \WP_REST_Response(['success' => false, 'message' => $e->getMessage()], 422);
        }

        $station = $this->persistGroups($station, $manager, $result['groups']);
        $groupId = (string) $result['group']['group_id'];

        try {
            $this->assignIdentifier($reservation, $groupId);
        } catch (\Throwable) {
            // Compensating rollback: restore the exact pre-create Family
            // collection and preserve every unrelated Package collection.
            try {
                $this->persistGroups($station, $manager, $manager['category_groups']);
            } catch (\Throwable) {
                return new \WP_REST_Response([
                    'success' => false,
                    'message' => 'Package Family identity binding failed and native rollback requires reconciliation.',
                    'native_reference' => $groupId,
                ], 500);
            }
            $this->retireReservation($reservation, $groupId);
            return new \WP_REST_Response([
                'success' => false,
                'message' => 'Package Family creation could not confirm its permanent identifier.',
                'native_reference' => $groupId,
            ], 500);
        }

        return $this->groupResponse($station, $groupId);
    }

    public function saveOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->mutateGroup($request, fn(array $groups, string $gid): array => (
            PackageCategoryGroups::saveOverviewDraft(
                $groups,
                $gid,
                (string) $request->get_param('name'),
                (string) ($request->get_param('description') ?? '')
            )
        ));
    }

    public function settleOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->mutateGroup($request, fn(array $groups, string $gid): array => (
            PackageCategoryGroups::settleOverview($groups, $gid)
        ));
    }

    public function revertOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->mutateGroup($request, fn(array $groups, string $gid): array => (
            PackageCategoryGroups::revertOverview($groups, $gid)
        ));
    }

    public function updateStatus(\WP_REST_Request $request): \WP_REST_Response
    {
        if ($request->get_param('action') !== null) {
            return $this->mutateGroup($request, fn(array $groups, string $gid): array => (
                PackageCategoryGroups::applyDisabledMask($groups, $gid, (string) $request->get_param('action'))
            ));
        }
        $target = sanitize_text_field((string) $request->get_param('platform_status'));
        return $this->mutateGroup($request, fn(array $groups, string $gid): array => (
            PackageCategoryGroups::applyStatus($groups, $gid, $target)
        ));
    }

    public function restoreGroup(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->mutateGroup($request, fn(array $groups, string $gid): array => (
            PackageCategoryGroups::restore($groups, $gid)
        ));
    }

    /**
     * Permanent delete: legal only from trashed (StationLifecycle::canDelete)
     * AND with zero commercial dependents — connected Services, Rate Sheet
     * rows, or Tier selections block it (the Package mirror of the D6
     * assigned-service guard). Detachment must be an explicit prior step.
     */
    public function permanentDeleteGroup(\WP_REST_Request $request): \WP_REST_Response
    {
        if ($rejection = $this->rejectPlatformIdMutation($request)) return $rejection;
        $gid = sanitize_text_field((string) $request->get_param('gid'));
        [$station, $manager] = $this->loadStationAndManager();

        $group = PackageCategoryGroups::find($manager['category_groups'], $gid);
        if ($group === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Package Family not found.'], 404);
        }

        if (TierAssignmentSchema::findForConsumer(
            $station['tier_assignments'] ?? [],
            'package_family',
            $gid
        ) !== null) {
            return new \WP_REST_Response([
                'success' => false,
                'code'    => 'family_in_use_by_capability',
                'message' => 'This Package Family uses the Tier capability. Remove it first.',
            ], 409);
        }

        $dependents = PackageCategoryGroups::dependents($station, $this->readModelItems($station, $manager), $gid);

        try {
            $groups = PackageCategoryGroups::delete($manager['category_groups'], $gid, $dependents);
        } catch (\RuntimeException $e) {
            return new \WP_REST_Response([
                'success'        => false,
                'message'        => $e->getMessage(),
                'assigned_count' => $dependents['services'],
                'dependents'     => $dependents,
            ], 409);
        } catch (\InvalidArgumentException $e) {
            return new \WP_REST_Response(['success' => false, 'message' => $e->getMessage()], 422);
        }

        if (!$this->identityEnabled) {
            $this->persistGroups($station, $manager, $groups);
            return rest_ensure_response(['success' => true, 'deleted' => $gid]);
        }

        try {
            $binding = $this->ensureIdentifier($gid);
        } catch (PlatformIdentifierConflict) {
            return new \WP_REST_Response([
                'success' => false,
                'message' => 'Package Family identity is conflicted and must be reconciled before permanent deletion.',
            ], 409);
        }

        $this->persistGroups($station, $manager, $groups);

        try {
            $this->platformIdentifiers->markDeleted(PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP, $gid);
        } catch (PlatformIdentifierConflict) {
            return new \WP_REST_Response([
                'success' => false,
                'message' => 'Package Family was deleted but its permanent identifier tombstone requires reconciliation.',
                'native_reference' => $gid,
            ], 500);
        }

        return rest_ensure_response([
            'success' => true,
            'deleted' => $gid,
            'platform_id' => $binding->platformId(),
        ]);
    }

    // ── Permissions ───────────────────────────────────────────────────────────

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Core\PlatformAccess::CAP);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Load station + fully-sanitized manager. A missing station defaults to
     * the fresh shell: create bootstraps the independent anchor on first save;
     * every other handler then 404s naturally through the group lookup.
     *
     * @return array{0: array, 1: array}
     */
    private function loadStationAndManager(): array
    {
        $station = $this->packages()->loadStation();
        if (!is_array($station) || $station === []) {
            $station = $this->packages()->defaultStation();
        }
        $rawManager = is_array($station['package_manager'] ?? null)
            ? $station['package_manager']
            : PackageManagerSchema::defaultManager();
        $manager = PackageManagerSchema::sanitize($rawManager);
        $station['package_manager'] = $manager;

        return [$station, $manager];
    }

    /** Reconciled read-model items with supplying-Service provenance, for guards. */
    private function readModelItems(array $station, array $manager): array
    {
        [$incPool, $faqPool] = $this->packages()->sourcePools($station, $manager['sources']);
        $readModel = PackageManagerSchema::buildReadModel(
            (int) ($station['legacy_host_service_id'] ?? 0),
            $manager,
            $incPool,
            $faqPool,
            (string) ($station['platform_status'] ?? 'disabled')
        );
        return $readModel['items'];
    }

    /** Persist the new group collection atomically inside the station. */
    private function persistGroups(array $station, array $manager, array $groups): array
    {
        $manager['category_groups'] = $groups;
        // Re-sanitize the whole manager so source assignments pointing at a
        // now-deleted group normalise to null in the same write.
        $station['package_manager'] = PackageManagerSchema::sanitize($manager);
        $this->packages()->saveStation($station);
        return $station;
    }

    /** Shared mutate-and-respond wrapper for the draft/lifecycle handlers. */
    private function mutateGroup(\WP_REST_Request $request, callable $mutation): \WP_REST_Response
    {
        if ($rejection = $this->rejectPlatformIdMutation($request)) return $rejection;
        $gid = sanitize_text_field((string) $request->get_param('gid'));
        [$station, $manager] = $this->loadStationAndManager();

        if (PackageCategoryGroups::find($manager['category_groups'], $gid) === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Package Family not found.'], 404);
        }

        try {
            $groups = $mutation($manager['category_groups'], $gid);
        } catch (\InvalidArgumentException $e) {
            return new \WP_REST_Response(['success' => false, 'message' => $e->getMessage()], 422);
        }

        $station = $this->persistGroups($station, $manager, $groups);

        return $this->groupResponse($station, $gid);
    }

    /** Full response projection: draft-preferred fields + lifecycle envelope + dependents. */
    private function groupResponse(array $station, string $gid): \WP_REST_Response
    {
        $manager = $station['package_manager'];
        $group   = PackageCategoryGroups::find($manager['category_groups'], $gid);
        if ($group === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Package Family not found.'], 404);
        }
        $dependents = PackageCategoryGroups::dependents($station, $this->readModelItems($station, $manager), $gid);

        $tierAssignmentCount = PackageCategoryGroups::tierAssignmentCount(
            $station['tier_assignments'] ?? [],
            $gid
        );
        $activeTierSlots = PackageCategoryGroups::activeTierSlotSummary($station, $gid);

        return rest_ensure_response([
            'success' => true,
            'group'   => [
                ...PackageCategoryGroups::projection($group, $dependents),
                'tier_assignment_count' => $tierAssignmentCount,
                'active_tier_slots'     => $activeTierSlots,
            ],
        ]);
    }

    private function assignIdentifier(
        PlatformIdentifierReservation $reservation,
        string $groupId
    ): PlatformIdentifierBinding {
        return $this->platformIdentifiers->assign(
            $reservation,
            $groupId,
            fn(int|string $nativeReference): string => $this->packages()->familyPlatformId((string) $nativeReference),
            fn(int|string $nativeReference, string $platformId): bool => $this->packages()->claimFamilyPlatformId(
                (string) $nativeReference,
                $platformId
            )
        );
    }

    private function ensureIdentifier(string $groupId): PlatformIdentifierBinding
    {
        return $this->platformIdentifiers->ensure(
            PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP,
            $groupId,
            fn(int|string $nativeReference): string => $this->packages()->familyPlatformId((string) $nativeReference),
            fn(int|string $nativeReference, string $platformId): bool => $this->packages()->claimFamilyPlatformId(
                (string) $nativeReference,
                $platformId
            ),
            fn(string $platformId): bool => $this->packages()->familyPlatformIdExists($platformId)
        );
    }

    private function rejectPlatformIdMutation(\WP_REST_Request $request): ?\WP_REST_Response
    {
        $json = method_exists($request, 'get_json_params') ? $request->get_json_params() : [];
        $json = is_array($json) ? $json : [];
        foreach (['platform_id', 'platformId', PlatformIdentifierStation::META_KEY] as $field) {
            if ($request->get_param($field) !== null || array_key_exists($field, $json)) {
                return new \WP_REST_Response([
                    'success' => false,
                    'message' => 'Platform identifiers are immutable and output-only.',
                ], 422);
            }
        }
        return null;
    }

    private function retireReservation(
        PlatformIdentifierReservation $reservation,
        ?string $nativeReference = null
    ): void {
        if ($nativeReference !== null) {
            try {
                $reverse = $this->platformIdentifiers->lookupNative(
                    PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP,
                    $nativeReference
                );
                if ($reverse?->platformId() === $reservation->platformId()) return;
            } catch (\Throwable) {
                // Inspect the reservation itself below.
            }
        }
        try {
            $forward = $this->platformIdentifiers->resolve($reservation->platformId());
            if ($forward?->status() === PlatformIdentifierStation::STATUS_RESERVED) {
                $this->platformIdentifiers->retire($reservation);
            }
        } catch (\Throwable) {
            // Never recycle an uncertain claim.
        }
    }
}
