<?php

/*
 * FILE INDEX
 *
 * CATEGORY_GROUP_ROUTES          Service Category Group REST route registration
 * CATEGORY_GROUP_HANDLERS        Listing, creation, modules, and lifecycle
 * CATEGORY_GROUP_AUTHORIZATION   Permission callback
 * CATEGORY_GROUP_HELPERS         Term lookup and response projection
 *
 * Search: SECTION: CATEGORY_GROUP_ROUTES
 *         SECTION: CATEGORY_GROUP_HANDLERS
 *         SECTION: CATEGORY_GROUP_AUTHORIZATION
 *         SECTION: CATEGORY_GROUP_HELPERS
 */

namespace CompuZign\Platform\Modules\Admin\Http;

use CompuZign\Platform\Modules\Admin\Support\CategoryMeta;
use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;

/**
 * AdminCategoryGroupsController — the Service Category Group station's REST family
 * (Category Group audit, Option B, Phase B).
 *
 * Service Category Group is a second station sharing the existing `cz_service_category`
 * taxonomy and `cz_category_meta` envelope with Category — distinguished only by
 * `station_role`. Route grammar, lifecycle handling, and draft/settle/revert
 * mechanics mirror AdminCategoriesController exactly; the two differences are:
 *   - the list/create/response paths deal in `station_role === 'group'` terms only
 *   - the delete guard counts child category terms (CategoryMeta::assignedCategoryCount),
 *     not assigned services
 *
 * Two-tier enforcement (locked): a group term is always created with no parent
 * (wp_insert_term below never accepts one), so a group can never itself have a
 * parent. Category's own group assignment (AdminCategoriesController::updateGroup)
 * separately validates its target has station_role 'group' — between the two,
 * nesting beyond group→category is structurally unreachable.
 */
class AdminCategoryGroupsController
{
    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        // ===================================================================
        // SECTION: CATEGORY_GROUP_ROUTES
        // ===================================================================
        // ── Station list (admin only) ─────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/category-groups', [
            'methods'             => 'GET',
            'callback'            => [$this, 'listCategoryGroups'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'platform_status' => [
                    'required' => false,
                    'type'     => 'string',
                    'enum'     => [StationLifecycle::STATUS_ARCHIVED, StationLifecycle::STATUS_TRASHED],
                ],
            ],
        ]);

        // ── Station create (D3-style: born disabled) ──────────────────────────
        register_rest_route('compuzign/v1', '/admin/category-groups', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createCategoryGroup'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'name'        => ['required' => true,  'type' => 'string',
                                  'sanitize_callback' => 'sanitize_text_field'],
                'description' => ['required' => false, 'type' => 'string',
                                  'sanitize_callback' => 'sanitize_textarea_field'],
            ],
        ]);

        // ── Overview draft save ───────────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/category-groups/(?P<id>\d+)/overview', [
            'methods'             => 'PUT',
            'callback'            => [$this, 'saveOverview'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'          => ['required' => true,  'type' => 'integer'],
                'name'        => ['required' => true,  'type' => 'string',
                                  'sanitize_callback' => 'sanitize_text_field'],
                'description' => ['required' => false, 'type' => 'string',
                                  'sanitize_callback' => 'sanitize_textarea_field'],
            ],
        ]);

        // ── Overview settle (commit draft → term) ─────────────────────────────
        register_rest_route('compuzign/v1', '/admin/category-groups/(?P<id>\d+)/overview/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settleOverview'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);

        // ── Overview revert (discard draft) ───────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/category-groups/(?P<id>\d+)/overview/revert', [
            'methods'             => 'POST',
            'callback'            => [$this, 'revertOverview'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);

        // ── Platform status (engine transition) ───────────────────────────────
        register_rest_route('compuzign/v1', '/admin/category-groups/(?P<id>\d+)/status', [
            'methods'             => 'PATCH',
            'callback'            => [$this, 'updateStatus'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'              => ['required' => true, 'type' => 'integer'],
                'platform_status' => [
                    'required' => true,
                    'type'     => 'string',
                    'enum'     => CategoryMeta::ALLOWED_PLATFORM_STATUSES,
                ],
            ],
        ]);

        // ── Restore (server-driven — resolves previous_platform_status) ───────
        register_rest_route('compuzign/v1', '/admin/category-groups/(?P<id>\d+)/restore', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restoreCategoryGroup'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);

        // ── Permanent delete (trashed only + child-category guard) ────────────
        register_rest_route('compuzign/v1', '/admin/category-groups/(?P<id>\d+)', [
            'methods'             => 'DELETE',
            'callback'            => [$this, 'permanentDeleteCategoryGroup'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    /**
     * Station projections for every group term — the inverse of Category's own
     * list (station_role === 'group' only). Same default/bin scoping contract as
     * /admin/categories and /admin/services.
     */
    // ===================================================================
    // SECTION: CATEGORY_GROUP_HANDLERS
    // ===================================================================
    public function listCategoryGroups(\WP_REST_Request $request): \WP_REST_Response
    {
        $filterStatus = $request->get_param('platform_status'); // 'archived', 'trashed', or null.

        $terms = get_terms([
            'taxonomy'   => CategoryMeta::TAXONOMY,
            'hide_empty' => false,
            'orderby'    => 'name',
            'order'      => 'ASC',
        ]);

        $groups = [];

        foreach (is_array($terms) ? $terms : [] as $term) {
            if (!$term instanceof \WP_Term) {
                continue;
            }

            if (CategoryMeta::role((int) $term->term_id) !== CategoryMeta::STATION_ROLE_GROUP) {
                continue;
            }

            $projection = CategoryMeta::projection($term);

            if ($filterStatus !== null) {
                if ($projection['platform_status'] !== $filterStatus) {
                    continue;
                }
            } elseif (StationLifecycle::isBinned($projection['platform_status'])) {
                continue;
            }

            // Child-category count — the group mirror of Category's assigned_count
            // (which counts services). Guard predicate for permanent delete.
            $projection['assigned_count'] = CategoryMeta::assignedCategoryCount((int) $term->term_id);

            $groups[] = $projection;
        }

        return rest_ensure_response(['category_groups' => $groups]);
    }

    /**
     * Station create: term + meta, born 'disabled', station_role 'group'.
     * Two-tier enforcement: wp_insert_term is never given a parent here — a group
     * term can never itself have a parent.
     */
    public function createCategoryGroup(\WP_REST_Request $request): \WP_REST_Response
    {
        $name        = (string) $request->get_param('name');
        $description = (string) ($request->get_param('description') ?? '');

        if ($name === '') {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service Category Group name is required.'], 422);
        }

        $result = wp_insert_term($name, CategoryMeta::TAXONOMY);
        if (is_wp_error($result)) {
            return new \WP_REST_Response(['success' => false, 'message' => $result->get_error_message()], 422);
        }

        $termId = (int) $result['term_id'];

        if ($description !== '') {
            update_term_meta($termId, CategoryMeta::DESCRIPTION_META, $description);
        }

        // module_status.overview is always 'pending' on creation, regardless of
        // completeness — matching ServiceController::createService and the
        // (now-fixed) AdminCategoriesController::createCategory exactly. See the
        // matching comment there for why: settling immediately skips the
        // 'pending' transition that categoryGroupOverviewModule.resolveStatus
        // maps to 'pending-full' — the state canPublish requires — leaving a
        // freshly-created group with only Enable, never Publish.
        CategoryMeta::write($termId, [
            'platform_status' => StationLifecycle::STATUS_DISABLED,
            'module_status'   => [
                'overview' => StationLifecycle::MODULE_PENDING,
            ],
            'station_role' => CategoryMeta::STATION_ROLE_GROUP,
        ]);

        $term = get_term($termId, CategoryMeta::TAXONOMY);

        return rest_ensure_response([
            'success' => true,
            'group'   => $this->groupResponse($term),
        ]);
    }

    /** Save the overview draft (name, description) — identical mechanics to Category. */
    public function saveOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findGroupTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service Category Group not found.'], 404);
        }

        $meta = CategoryMeta::saveOverviewDraft(
            (int) $term->term_id,
            (string) $request->get_param('name'),
            (string) ($request->get_param('description') ?? '')
        );

        return rest_ensure_response([
            'success'       => true,
            'draft'         => $meta['overview_draft'],
            'module_status' => $meta['module_status'],
        ]);
    }

    /** Commit the draft to the term; clear the draft; re-derive module status. */
    public function settleOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findGroupTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service Category Group not found.'], 404);
        }

        $termId = (int) $term->term_id;
        $draft  = CategoryMeta::overviewDraft($termId);

        if ($draft !== null) {
            if ($draft['name'] !== '') {
                $updated = wp_update_term($termId, CategoryMeta::TAXONOMY, ['name' => $draft['name']]);
                if (is_wp_error($updated)) {
                    return new \WP_REST_Response(['success' => false, 'message' => $updated->get_error_message()], 422);
                }
            }
            update_term_meta($termId, CategoryMeta::DESCRIPTION_META, $draft['description']);
        }

        CategoryMeta::clearOverviewDraft($termId);

        return rest_ensure_response([
            'success' => true,
            'group'   => $this->groupResponse(get_term($termId, CategoryMeta::TAXONOMY)),
        ]);
    }

    /** Discard the draft; module_status re-derives from the settled state. */
    public function revertOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findGroupTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service Category Group not found.'], 404);
        }

        CategoryMeta::clearOverviewDraft((int) $term->term_id);

        return rest_ensure_response([
            'success' => true,
            'group'   => $this->groupResponse($term),
        ]);
    }

    /** Engine transition via StationLifecycle::applyStatus — identical to Category. */
    public function updateStatus(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findGroupTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service Category Group not found.'], 404);
        }

        $target = sanitize_text_field((string) $request->get_param('platform_status'));
        if (!in_array($target, CategoryMeta::ALLOWED_PLATFORM_STATUSES, true)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Invalid platform_status.'], 422);
        }

        $termId = (int) $term->term_id;

        $change = StationLifecycle::applyStatus(
            CategoryMeta::status($termId),
            $target,
            CategoryMeta::previousStatus($termId)
        );
        CategoryMeta::applyStatusChange($termId, $change);

        return rest_ensure_response([
            'success' => true,
            'group'   => $this->groupResponse($term),
        ]);
    }

    /** Restore from archived/trashed — always lands 'disabled', never straight to active. */
    public function restoreCategoryGroup(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findGroupTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service Category Group not found.'], 404);
        }

        $termId = (int) $term->term_id;

        $change = StationLifecycle::restore(CategoryMeta::status($termId));
        if ($change === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service Category Group is not in a restorable state.'], 422);
        }
        CategoryMeta::applyStatusChange($termId, $change);

        return rest_ensure_response([
            'success' => true,
            'group'   => $this->groupResponse($term),
        ]);
    }

    /**
     * Permanent delete: legal only from trashed (StationLifecycle::canDelete) AND
     * with zero child category terms (assignedCategoryCount guard — the group
     * mirror of Category's D6 assigned-service guard). Detachment (re-parenting
     * each child) must be an explicit prior step, same rationale.
     */
    public function permanentDeleteCategoryGroup(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findGroupTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service Category Group not found.'], 404);
        }

        $termId = (int) $term->term_id;

        if (!StationLifecycle::canDelete(CategoryMeta::status($termId))) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Only trashed Service Category Groups can be permanently deleted.'], 422);
        }

        $assignedCount = CategoryMeta::assignedCategoryCount($termId);
        if ($assignedCount > 0) {
            return new \WP_REST_Response([
                'success'        => false,
                'message'        => 'This group still has categories assigned to it. Move them out before deleting.',
                'assigned_count' => $assignedCount,
            ], 409);
        }

        $deleted = wp_delete_term($termId, CategoryMeta::TAXONOMY);
        if (is_wp_error($deleted)) {
            return new \WP_REST_Response(['success' => false, 'message' => $deleted->get_error_message()], 422);
        }

        return rest_ensure_response(['success' => true, 'deleted' => $termId]);
    }

    // ── Permissions ───────────────────────────────────────────────────────────

    // ===================================================================
    // SECTION: CATEGORY_GROUP_AUTHORIZATION
    // ===================================================================
    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Modules\Admin\AdminRouter::CAP);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Resolves a term by id, scoped to station_role 'group' only (404s a category id). */
    // ===================================================================
    // SECTION: CATEGORY_GROUP_HELPERS
    // ===================================================================
    private function findGroupTerm(int $termId): ?\WP_Term
    {
        $term = get_term($termId, CategoryMeta::TAXONOMY);
        if (!$term instanceof \WP_Term) {
            return null;
        }

        return CategoryMeta::role($termId) === CategoryMeta::STATION_ROLE_GROUP ? $term : null;
    }

    /** Full response projection: draft-preferred fields + lifecycle envelope + child-category guard count. */
    private function groupResponse(?\WP_Term $term): ?array
    {
        if (!$term instanceof \WP_Term) {
            return null;
        }

        $projection                   = CategoryMeta::projection($term);
        $projection['assigned_count'] = CategoryMeta::assignedCategoryCount((int) $term->term_id);

        return $projection;
    }
}
