<?php

namespace CompuZign\Platform\Modules\Admin\Http;

use CompuZign\Platform\Modules\Admin\Support\CategoryMeta;
use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;

/**
 * AdminCategoriesController — the Category station's REST family (S6 Phase B).
 *
 * Mirrors the Service station's route grammar under compuzign/v1. All term-meta
 * access goes through CategoryMeta (the sole reader/writer of cz_category_meta);
 * every status write is a StationLifecycle-computed transition.
 *
 * The inline convenience routes (/admin/service-categories) are untouched and
 * keep producing immediately-usable categories (D3: no meta = lazy active).
 * Station-created categories follow the station convention instead: born
 * 'disabled', activated by Publish.
 */
class AdminCategoriesController
{
    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        // ── Station list (admin only) ─────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/categories', [
            'methods'             => 'GET',
            'callback'            => [$this, 'listCategories'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'platform_status' => [
                    'required' => false,
                    'type'     => 'string',
                    'enum'     => [StationLifecycle::STATUS_ARCHIVED, StationLifecycle::STATUS_TRASHED],
                ],
            ],
        ]);

        // ── Station create (D3: born disabled) ────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/categories', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createCategory'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'name'        => ['required' => true,  'type' => 'string',
                                  'sanitize_callback' => 'sanitize_text_field'],
                'description' => ['required' => false, 'type' => 'string',
                                  'sanitize_callback' => 'sanitize_textarea_field'],
                'group_id'    => ['required' => false, 'type' => 'integer'],
            ],
        ]);

        // ── Group assignment (structural, not draft content — Category Group
        // audit Phase B): moves this category under a group term, or ungroups it
        // when group_id is null/0. Validated against station_role, not folded
        // into the overview draft envelope.
        register_rest_route('compuzign/v1', '/admin/categories/(?P<id>\d+)/group', [
            'methods'             => 'PATCH',
            'callback'            => [$this, 'updateGroup'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'       => ['required' => true, 'type' => 'integer'],
                'group_id' => ['required' => false, 'type' => ['integer', 'null']],
            ],
        ]);

        // ── Overview draft save ───────────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/categories/(?P<id>\d+)/overview', [
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
        register_rest_route('compuzign/v1', '/admin/categories/(?P<id>\d+)/overview/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settleOverview'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);

        // ── Overview revert (discard draft) ───────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/categories/(?P<id>\d+)/overview/revert', [
            'methods'             => 'POST',
            'callback'            => [$this, 'revertOverview'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);

        // ── Platform status (engine transition) ───────────────────────────────
        register_rest_route('compuzign/v1', '/admin/categories/(?P<id>\d+)/status', [
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
        register_rest_route('compuzign/v1', '/admin/categories/(?P<id>\d+)/restore', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restoreCategory'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);

        // ── Permanent delete (trashed only + D6 guard) ────────────────────────
        register_rest_route('compuzign/v1', '/admin/categories/(?P<id>\d+)', [
            'methods'             => 'DELETE',
            'callback'            => [$this, 'permanentDeleteCategory'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    /**
     * Station projections for every category term.
     *
     * Default (no platform_status param): excludes archived and trashed.
     * With platform_status=archived|trashed: returns only that bin — same
     * param contract as /admin/services.
     */
    public function listCategories(\WP_REST_Request $request): \WP_REST_Response
    {
        $filterStatus = $request->get_param('platform_status'); // 'archived', 'trashed', or null.

        $terms = get_terms([
            'taxonomy'   => CategoryMeta::TAXONOMY,
            'hide_empty' => false,
            'orderby'    => 'name',
            'order'      => 'ASC',
        ]);

        $categories = [];

        foreach (is_array($terms) ? $terms : [] as $term) {
            if (!$term instanceof \WP_Term) {
                continue;
            }

            // Category Group audit (Option B): the Category station's own list
            // stays a flat list of category-role terms only — group-role terms
            // belong exclusively to /admin/category-groups.
            if (CategoryMeta::role((int) $term->term_id) !== CategoryMeta::STATION_ROLE_CATEGORY) {
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

            $projection['assigned_count'] = CategoryMeta::assignedServiceCount((int) $term->term_id);

            $categories[] = $projection;
        }

        return rest_ensure_response(['categories' => $categories]);
    }

    /**
     * Station create (D3): term + meta, born 'disabled'; overview settles
     * immediately when the payload is complete, otherwise starts 'pending'.
     * Duplicates fail — the inline flow's return-existing convenience is a
     * service-edit affordance, not station behaviour.
     */
    public function createCategory(\WP_REST_Request $request): \WP_REST_Response
    {
        $name        = (string) $request->get_param('name');
        $description = (string) ($request->get_param('description') ?? '');
        $groupParam  = $request->get_param('group_id');

        if ($name === '') {
            return new \WP_REST_Response(['success' => false, 'message' => 'Category name is required.'], 422);
        }

        $groupId = null;
        if ($groupParam !== null && (int) $groupParam > 0) {
            $groupError = $this->validateGroupId((int) $groupParam);
            if ($groupError !== null) {
                return $groupError;
            }
            $groupId = (int) $groupParam;
        }

        $insertArgs = $groupId !== null ? ['parent' => $groupId] : [];
        $result     = wp_insert_term($name, CategoryMeta::TAXONOMY, $insertArgs);
        if (is_wp_error($result)) {
            return new \WP_REST_Response(['success' => false, 'message' => $result->get_error_message()], 422);
        }

        $termId = (int) $result['term_id'];

        if ($description !== '') {
            update_term_meta($termId, CategoryMeta::DESCRIPTION_META, $description);
        }

        // module_status.overview is always 'pending' on creation, regardless of
        // completeness — matching AdminServicesController::createService exactly
        // (bug fix: settling immediately when complete skipped the 'pending'
        // transition, which is the only state categoryOverviewModule.resolveStatus
        // maps to 'pending-full' — the state canPublish requires. A category
        // that arrived already-'settled' fell through to 'disabled' and could
        // never show Publish, only Enable).
        CategoryMeta::write($termId, [
            'platform_status' => StationLifecycle::STATUS_DISABLED,
            'module_status'   => [
                'overview' => StationLifecycle::MODULE_PENDING,
            ],
        ]);

        $term = get_term($termId, CategoryMeta::TAXONOMY);

        return rest_ensure_response([
            'success'  => true,
            'category' => $this->categoryResponse($term),
        ]);
    }

    /**
     * Group assignment (structural, not draft content): moves this category
     * under a group term (station_role 'group'), or ungroups it when group_id
     * is null/0. Two-tier enforcement lives in validateGroupId() below — the
     * target must itself have station_role 'group', and this endpoint refuses
     * to act on a term that is itself a group (a group can never gain a parent).
     */
    public function updateGroup(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Category not found.'], 404);
        }

        $termId = (int) $term->term_id;

        if (CategoryMeta::role($termId) !== CategoryMeta::STATION_ROLE_CATEGORY) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Only categories can be assigned to a group.'], 422);
        }

        $groupParam = $request->get_param('group_id');
        $groupId    = null;

        if ($groupParam !== null && (int) $groupParam > 0) {
            if ((int) $groupParam === $termId) {
                return new \WP_REST_Response(['success' => false, 'message' => 'A category cannot be its own group.'], 422);
            }
            $groupError = $this->validateGroupId((int) $groupParam);
            if ($groupError !== null) {
                return $groupError;
            }
            $groupId = (int) $groupParam;
        }

        $updated = wp_update_term($termId, CategoryMeta::TAXONOMY, ['parent' => $groupId ?? 0]);
        if (is_wp_error($updated)) {
            return new \WP_REST_Response(['success' => false, 'message' => $updated->get_error_message()], 422);
        }

        return rest_ensure_response([
            'success'  => true,
            'category' => $this->categoryResponse(get_term($termId, CategoryMeta::TAXONOMY)),
        ]);
    }

    /** Save the overview draft (name, description) — canonical term untouched, overview marked pending. */
    public function saveOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Category not found.'], 404);
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

    /**
     * Commit the draft to the term (name via wp_update_term, description via
     * the CompuZign term meta), clear the draft, and re-derive module status.
     * With no draft pending this degrades to a pure re-derivation.
     */
    public function settleOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Category not found.'], 404);
        }

        $termId = (int) $term->term_id;
        $draft  = CategoryMeta::overviewDraft($termId);

        if ($draft !== null) {
            // Slug is immutable (D5): name updates never regenerate it.
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
            'success'  => true,
            'category' => $this->categoryResponse(get_term($termId, CategoryMeta::TAXONOMY)),
        ]);
    }

    /** Discard the draft; module_status re-derives from the settled state. */
    public function revertOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Category not found.'], 404);
        }

        CategoryMeta::clearOverviewDraft((int) $term->term_id);

        return rest_ensure_response([
            'success'  => true,
            'category' => $this->categoryResponse($term),
        ]);
    }

    /**
     * Engine transition via StationLifecycle::applyStatus — previous_platform_status
     * is captured on bin entry and preserved on bin→bin moves (capturePrevious rule).
     */
    public function updateStatus(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Category not found.'], 404);
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
            'success'  => true,
            'category' => $this->categoryResponse($term),
        ]);
    }

    /** Restore from archived/trashed — always lands 'disabled', never straight to active. */
    public function restoreCategory(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Category not found.'], 404);
        }

        $termId = (int) $term->term_id;

        $change = StationLifecycle::restore(CategoryMeta::status($termId));
        if ($change === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Category is not in a restorable state.'], 422);
        }
        CategoryMeta::applyStatusChange($termId, $change);

        return rest_ensure_response([
            'success'  => true,
            'category' => $this->categoryResponse($term),
        ]);
    }

    /**
     * Permanent delete: legal only from trashed (StationLifecycle::canDelete)
     * AND with zero assigned services (D6 — wp_delete_term would silently sever
     * the relationships, so detachment must happen first, service-side).
     */
    public function permanentDeleteCategory(\WP_REST_Request $request): \WP_REST_Response
    {
        $term = $this->findTerm((int) $request->get_param('id'));
        if ($term === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Category not found.'], 404);
        }

        $termId = (int) $term->term_id;

        if (!StationLifecycle::canDelete(CategoryMeta::status($termId))) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Only trashed categories can be permanently deleted.'], 422);
        }

        $assignedCount = CategoryMeta::assignedServiceCount($termId);
        if ($assignedCount > 0) {
            return new \WP_REST_Response([
                'success'        => false,
                'message'        => 'This category still has services assigned to it. Unassign them before deleting.',
                'assigned_count' => $assignedCount,
            ], 409);
        }

        // Removes the term row and all its term meta (cz_category_meta included).
        $deleted = wp_delete_term($termId, CategoryMeta::TAXONOMY);
        if (is_wp_error($deleted)) {
            return new \WP_REST_Response(['success' => false, 'message' => $deleted->get_error_message()], 422);
        }

        return rest_ensure_response(['success' => true, 'deleted' => $termId]);
    }

    // ── Permissions ───────────────────────────────────────────────────────────

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Modules\Admin\AdminRouter::CAP);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function findTerm(int $termId): ?\WP_Term
    {
        $term = get_term($termId, CategoryMeta::TAXONOMY);

        return $term instanceof \WP_Term ? $term : null;
    }

    /**
     * Validates a candidate group_id: must resolve to an existing term with
     * station_role 'group'. Returns an error response to short-circuit the
     * caller, or null when valid. Shared by createCategory() and updateGroup()
     * so the two-tier rule (a category may only be parented to a real group
     * term) has one enforcement point.
     */
    private function validateGroupId(int $groupId): ?\WP_REST_Response
    {
        $groupTerm = get_term($groupId, CategoryMeta::TAXONOMY);
        if (!$groupTerm instanceof \WP_Term) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Category Group not found.'], 422);
        }

        if (CategoryMeta::role($groupId) !== CategoryMeta::STATION_ROLE_GROUP) {
            return new \WP_REST_Response(['success' => false, 'message' => 'group_id must reference a Category Group.'], 422);
        }

        return null;
    }

    /** Full response projection: draft-preferred fields + lifecycle envelope + guard count. */
    private function categoryResponse(?\WP_Term $term): ?array
    {
        if (!$term instanceof \WP_Term) {
            return null;
        }

        $projection                   = CategoryMeta::projection($term);
        $projection['assigned_count'] = CategoryMeta::assignedServiceCount((int) $term->term_id);

        return $projection;
    }
}
