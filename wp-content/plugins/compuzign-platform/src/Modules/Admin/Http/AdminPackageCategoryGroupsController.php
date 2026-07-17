<?php

namespace CompuZign\Platform\Modules\Admin\Http;

use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;

/**
 * AdminPackageCategoryGroupsController — the Package Family station's
 * REST family.
 *
 * Route grammar, lifecycle handling, and draft/settle/revert mechanics mirror
 * AdminCategoryGroupsController exactly; the differences are ownership and
 * guard:
 *   - the station collection lives inside the Package Station option
 *     (`cz_package_station` → package_manager.category_groups) via
 *     PackageRepository — Package-owned, never taxonomy terms
 *   - the delete guard counts commercial dependents (connected Services,
 *     Rate Sheet rows, Tier selections), not child category terms
 *
 * Transitions are computed by StationLifecycle (through
 * PackageCategoryGroups); this controller persists engine results only.
 */
class AdminPackageCategoryGroupsController
{
    private ?PackageRepository $packages = null;

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
                    'required' => true,
                    'type'     => 'string',
                    'enum'     => [
                        StationLifecycle::STATUS_ACTIVE,
                        StationLifecycle::STATUS_DISABLED,
                        StationLifecycle::STATUS_ARCHIVED,
                        StationLifecycle::STATUS_TRASHED,
                    ],
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
        $name        = (string) $request->get_param('name');
        $description = (string) ($request->get_param('description') ?? '');

        if ($name === '') {
            return new \WP_REST_Response(['success' => false, 'message' => 'Package Family name is required.'], 422);
        }

        // First-time configuration bootstraps the independent station anchor,
        // same as the manager save endpoint.
        [$station, $manager] = $this->loadStationAndManager();

        try {
            $result = PackageCategoryGroups::create($manager['category_groups'], $name, $description);
        } catch (\InvalidArgumentException $e) {
            return new \WP_REST_Response(['success' => false, 'message' => $e->getMessage()], 422);
        }

        $station = $this->persistGroups($station, $manager, $result['groups']);

        return $this->groupResponse($station, $result['group']['group_id']);
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
        $gid = sanitize_text_field((string) $request->get_param('gid'));
        [$station, $manager] = $this->loadStationAndManager();

        $group = PackageCategoryGroups::find($manager['category_groups'], $gid);
        if ($group === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Package Family not found.'], 404);
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

        $this->persistGroups($station, $manager, $groups);

        return rest_ensure_response(['success' => true, 'deleted' => $gid]);
    }

    // ── Permissions ───────────────────────────────────────────────────────────

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Modules\Admin\AdminRouter::CAP);
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

        return rest_ensure_response([
            'success' => true,
            'group'   => PackageCategoryGroups::projection($group, $dependents),
        ]);
    }
}
