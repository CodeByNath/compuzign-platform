<?php

namespace CompuZign\Platform\Modules\Admin\Http;

use CompuZign\Platform\Modules\Admin\Support\PoolReferences;
use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\Modules\CostBuilder\Support\MetaSchema;

class AdminServicesController
{
    private const POST_TYPE         = 'cz_service';
    private const CATEGORY_TAXONOMY = 'cz_service_category';
    private const META_KEY          = 'cz_service_meta';
    private const META_INCLUSIONS   = 'cz_service_inclusions';
    private const META_FAQS         = 'cz_service_faqs';
    private const DRAFT_OVERVIEW    = 'cz_service_overview_draft';
    private const DRAFT_INCLUSIONS  = 'cz_service_inclusions_draft';
    private const DRAFT_FAQS            = 'cz_service_faqs_draft';
    private const META_PACKAGE_STATION  = 'cz_service_package_station';
    private const META_PROMOTION_STATION = 'cz_service_promotion_station';

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        // ── Station catalog list (admin only) ────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services', [
            'methods'             => 'GET',
            'callback'            => [$this, 'listServices'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'platform_status' => [
                    'required' => false,
                    'type'     => 'string',
                    'enum'     => ['archived', 'trashed'],
                ],
            ],
        ]);

        // ── Create ────────────────────────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createService'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'title'        => ['required' => true,  'type' => 'string',
                                   'sanitize_callback' => 'sanitize_text_field'],
                'excerpt'      => ['required' => false, 'type' => 'string',
                                   'sanitize_callback' => 'sanitize_textarea_field'],
                'content'      => ['required' => false, 'type' => 'string',
                                   'sanitize_callback' => 'wp_kses_post'],
                'category_ids' => ['required' => false, 'type' => 'array',
                                   'items' => ['type' => 'integer']],
            ],
        ]);

        // ── Admin detail (drawer open) ────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)', [
            'methods'             => 'GET',
            'callback'            => [$this, 'fetchDetail'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);

        // ── Draft saves ───────────────────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/overview', [
            'methods'             => 'POST',
            'callback'            => [$this, 'updateOverview'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'           => ['required' => true,  'type' => 'integer'],
                'title'        => ['required' => true,  'type' => 'string',
                                   'sanitize_callback' => 'sanitize_text_field'],
                'excerpt'      => ['required' => false, 'type' => 'string',
                                   'sanitize_callback' => 'sanitize_textarea_field'],
                'content'      => ['required' => false, 'type' => 'string',
                                   'sanitize_callback' => 'wp_kses_post'],
                'category_ids' => ['required' => false, 'type' => 'array',
                                   'items' => ['type' => 'integer']],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/inclusions', [
            'methods'             => 'POST',
            'callback'            => [$this, 'updateInclusions'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'         => ['required' => true, 'type' => 'integer'],
                'inclusions' => ['required' => true, 'type' => 'array',
                                 'items' => ['type' => 'object']],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/faqs', [
            'methods'             => 'POST',
            'callback'            => [$this, 'updateFaqs'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'   => ['required' => true, 'type' => 'integer'],
                'faqs' => ['required' => true, 'type' => 'array',
                           'items' => ['type' => 'object']],
            ],
        ]);

        // ── Per-module settle (atomic primary) ────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/(?P<module>overview|inclusions|faqs)/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settleModuleRoute'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'     => ['required' => true, 'type' => 'integer'],
                'module' => ['required' => true, 'type' => 'string'],
            ],
        ]);

        // ── Bulk settle (convenience — calls per-module for each draft) ───────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settleAll'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);

        // ── Per-module revert ─────────────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/(?P<module>overview|inclusions|faqs)/revert', [
            'methods'             => 'POST',
            'callback'            => [$this, 'revertModule'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'     => ['required' => true, 'type' => 'integer'],
                'module' => ['required' => true, 'type' => 'string'],
            ],
        ]);

        // ── Restore (server-driven — resolves previous_platform_status) ─────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/restore', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restoreService'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);

        // ── Permanent delete (only when platform_status = trashed) ────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)', [
            'methods'             => 'DELETE',
            'callback'            => [$this, 'permanentDeleteService'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);

        // ── Platform status ───────────────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/status', [
            'methods'             => 'POST',
            'callback'            => [$this, 'updateStatus'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'              => ['required' => true, 'type' => 'integer'],
                'platform_status' => [
                    'required' => false,
                    'type'     => 'string',
                    'enum'     => MetaSchema::ALLOWED_PLATFORM_STATUSES,
                ],
                // Deprecated: kept for backward compat; ignored if platform_status is present.
                'is_active'   => ['required' => false, 'type' => 'boolean'],
                'post_status' => ['required' => false, 'type' => 'string', 'enum' => ['publish', 'draft']],
            ],
        ]);

        // ── Package Station tier management (Phase 2) — service-owned paths ──
        // ── Inline service category creation ─────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/service-categories', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createServiceCategory'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        // ── Inline service category update ────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/service-categories/(?P<id>\d+)', [
            'methods'             => 'POST',
            'callback'            => [$this, 'updateServiceCategory'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id' => ['required' => true, 'type' => 'integer'],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getPackageStation'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/tiers/(?P<tier>[a-z]+)', [
            'methods'             => 'POST',
            'callback'            => [$this, 'savePackageStationTier'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'   => ['required' => true, 'type' => 'integer'],
                'tier' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/tiers/(?P<tier>[a-z]+)/enabled', [
            'methods'             => 'POST',
            'callback'            => [$this, 'setPackageStationTierEnabled'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'   => ['required' => true, 'type' => 'integer'],
                'tier' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)],
            ],
        ]);

        // Phase 2 — P3: per-module tier draft save. Persists a draft and marks the
        // module pending; does not commit current_occupant. Additive to the atomic
        // save route above, which stays live. Not called by the frontend until P5.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/tiers/(?P<tier>[a-z]+)/modules/(?P<module>[a-z]+)', [
            'methods'             => 'POST',
            'callback'            => [$this, 'savePackageStationTierModule'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'     => ['required' => true, 'type' => 'integer'],
                'tier'   => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)],
                'module' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::TIER_MODULES, true)],
            ],
        ]);

        // Phase 2 — P3: settle a tier. Commits the draft-preferred state into
        // current_occupant, clears drafts, marks all modules settled.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/tiers/(?P<tier>[a-z]+)/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settlePackageStationTier'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'   => ['required' => true, 'type' => 'integer'],
                'tier' => ['required' => true, 'validate_callback' => fn($v) => in_array($v, \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, true)],
            ],
        ]);

        // Phase 2 — P5: station-level popular tier selection. `popular_tier` is a
        // package-module concern, not part of the per-tier overview draft, so it
        // gets its own station-level write (body: { tier_id: string|null, label }).
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/package-station/popular', [
            'methods'             => 'POST',
            'callback'            => [$this, 'setPackageStationPopular'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        // Phase 2 — P5 Step 2: immediate canonical pool creation. Service owns the
        // pool; Tier only ever stores a reference (id) into it. These write straight
        // to the canonical pool (no draft indirection) so a caller gets a real id back
        // to attach to a tier's module draft in a separate, subsequent save.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/inclusion-pool/items', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createInclusionPoolItem'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/faq-pool/items', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createFaqPoolItem'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        // ── Promotion Station management (Phase 4 — service-owned paths) ──────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/promotion-station', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getPromotionStation'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/promotion-station/promotions', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createServicePromotion'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ['id' => ['required' => true, 'type' => 'integer']],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/promotion-station/promotions/(?P<promo>[a-z0-9_]+)/archive', [
            'methods'             => 'POST',
            'callback'            => [$this, 'archiveServicePromotion'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'    => ['required' => true, 'type' => 'integer'],
                'promo' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/promotion-station/promotions/(?P<promo>[a-z0-9_]+)/reactivate', [
            'methods'             => 'POST',
            'callback'            => [$this, 'reactivateServicePromotion'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'    => ['required' => true, 'type' => 'integer'],
                'promo' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/promotion-station/promotions/(?P<promo>[a-z0-9_]+)', [
            'methods'             => 'POST',
            'callback'            => [$this, 'saveServicePromotion'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'    => ['required' => true, 'type' => 'integer'],
                'promo' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        // ── Promotion module lifecycle (engine C2) ────────────────────────────
        // Per-module draft save / settle / revert — the travelling-instance
        // counterparts of the tier module routes. Travel status is never written
        // here; the transition endpoints (C3) own status.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/promotion-station/promotions/(?P<promo>[a-z0-9_]+)/modules/(?P<module>overview|features|faqs)', [
            'methods'             => 'POST',
            'callback'            => [$this, 'savePromotionModule'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'     => ['required' => true, 'type' => 'integer'],
                'promo'  => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
                'module' => ['required' => true, 'type' => 'string'],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/promotion-station/promotions/(?P<promo>[a-z0-9_]+)/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settlePromotion'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'    => ['required' => true, 'type' => 'integer'],
                'promo' => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
            ],
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/promotion-station/promotions/(?P<promo>[a-z0-9_]+)/modules/(?P<module>overview|features|faqs)/revert', [
            'methods'             => 'POST',
            'callback'            => [$this, 'revertPromotionModule'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'id'     => ['required' => true, 'type' => 'integer'],
                'promo'  => ['required' => true, 'validate_callback' => fn($v) => strlen((string) $v) > 0],
                'module' => ['required' => true, 'type' => 'string'],
            ],
        ]);
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    /**
     * Return station summaries for the catalog table.
     *
     * Default (no platform_status param): excludes archived and trashed — normal catalog view.
     * With platform_status=archived|trashed: returns only stations in that bin — used by the
     * Archived and Trash workstation views.
     */
    public function listServices(\WP_REST_Request $request): \WP_REST_Response
    {
        $filterStatus = $request->get_param('platform_status'); // 'archived', 'trashed', or null.

        // All category terms ordered by name — used for the catalog tab bar.
        $terms      = get_terms(['taxonomy' => self::CATEGORY_TAXONOMY, 'hide_empty' => false, 'orderby' => 'name', 'order' => 'ASC']);
        $categories = array_map(fn($t) => [
            'id'          => (int) $t->term_id,
            'name'        => html_entity_decode($t->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
            'slug'        => $t->slug,
            'description' => get_term_meta((int) $t->term_id, 'cz_category_description', true) ?: '',
        ], is_array($terms) ? $terms : []);

        // All published service posts ordered by title.
        $posts = get_posts([
            'post_type'   => self::POST_TYPE,
            'post_status' => 'publish',
            'numberposts' => -1,
            'orderby'     => 'title',
            'order'       => 'ASC',
        ]);

        $stations = [];

        foreach ($posts as $post) {
            $meta           = get_post_meta($post->ID, self::META_KEY, true);
            $meta           = is_array($meta) ? $meta : [];
            $platformStatus = MetaSchema::resolvePlatformStatus($meta, $post->post_status);

            if ($filterStatus !== null) {
                // Filtered view (archived/trash): include only the requested status.
                if ($platformStatus !== $filterStatus) {
                    continue;
                }
            } else {
                // Default catalog view: exclude archived and trashed.
                if (in_array($platformStatus, ['archived', 'trashed'], true)) {
                    continue;
                }
            }

            $postTerms = wp_get_post_terms($post->ID, self::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
            $postCats  = array_map(fn($t) => [
                'id'          => (int) $t->term_id,
                'name'        => html_entity_decode($t->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug'        => $t->slug,
                'description' => get_term_meta((int) $t->term_id, 'cz_category_description', true) ?: '',
            ], $postTerms);

            $stations[] = [
                'id'                       => $post->ID,
                'title'                    => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug'                     => $post->post_name,
                'categories'               => $postCats,
                'platform_status'          => $platformStatus,
                'previous_platform_status' => $meta['previous_platform_status'] ?? '',
                'module_status'            => $meta['module_status'] ?? $this->defaultModuleStatus(),
                'has_drafts'               => $this->hasDraft($post->ID, 'overview')
                                           || $this->hasDraft($post->ID, 'inclusions')
                                           || $this->hasDraft($post->ID, 'faqs'),
            ];
        }

        return rest_ensure_response([
            'categories' => $categories,
            'stations'   => $stations,
        ]);
    }

    public function createService(\WP_REST_Request $request): \WP_REST_Response
    {
        $title       = $request->get_param('title');
        $excerpt     = (string) ($request->get_param('excerpt') ?? '');
        $content     = (string) ($request->get_param('content') ?? '');
        $categoryIds = $request->has_param('category_ids')
                       ? array_values(array_map('intval', (array) $request->get_param('category_ids')))
                       : [];

        // Step 1 — Connector born.
        // post_title written for slug generation (bootstrap only — title lives in the draft).
        // post_excerpt and post_content intentionally omitted — content lives in the draft.
        $id = wp_insert_post([
            'post_type'   => self::POST_TYPE,
            'post_status' => 'publish',
            'post_title'  => $title,
        ], true);

        if (is_wp_error($id)) {
            return rest_ensure_response(['success' => false, 'message' => $id->get_error_message()]);
        }

        // Categories on the Connector — routing/filtering relationship.
        if (!empty($categoryIds)) {
            wp_set_object_terms($id, $categoryIds, self::CATEGORY_TAXONOMY);
        }

        // Initialize canonical inclusions/faqs as empty placeholders.
        update_post_meta($id, self::META_INCLUSIONS, ['inclusions' => [], 'tier_inclusions' => []]);
        update_post_meta($id, self::META_FAQS, []);

        // overview: pending (draft exists); inclusions/faqs: not-configured (no draft, no active).
        update_post_meta($id, self::META_KEY, [
            'platform_status' => 'disabled',
            'module_status'   => [
                'overview'   => 'pending',
                'inclusions' => 'not-configured',
                'faqs'       => 'not-configured',
            ],
        ]);

        // Step 2 — Overview Draft begins.
        $overviewDraft = [
            'title'        => $title,
            'excerpt'      => $excerpt,
            'content'      => $content,
            'category_ids' => $categoryIds,
        ];
        update_post_meta($id, self::DRAFT_OVERVIEW, $overviewDraft);

        // Package Station — born with four named tier shells, all empty.
        // NOTE: platform_status here is a legacy Cost Builder visibility field copied from
        // cz_package during migration. It is NOT the lifecycle status of the Package Station
        // shell itself. The Package Station is structural and permanent — it has no lifecycle.
        update_post_meta($id, self::META_PACKAGE_STATION, [
            'platform_status'    => 'disabled',
            'tiers'              => ['basic' => [], 'standard' => [], 'premium' => [], 'enterprise' => []],
            'popular_tier'       => null,
            'popular_label'      => '',
            'sort_position'      => 0,
            'bundle'             => ['title' => '', 'description' => '', 'price' => null],
            'valid_from'         => null,
            'valid_until'        => null,
            'display_contexts'   => ['cost-builder'],
            'migration_source_id' => null,
        ]);

        // Promotion Station — born empty; Promotion Instances created in Phase 4.
        update_post_meta($id, self::META_PROMOTION_STATION, []);

        $post = get_post($id);
        $meta = get_post_meta($id, self::META_KEY, true) ?: [];

        // Resolve assigned categories for the step data so the frontend can populate
        // service.categories without a separate fetch. This prevents Discard Draft
        // from losing the category display on new services.
        $assignedTerms = wp_get_post_terms($id, self::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
        $assignedCats  = array_map(fn($t) => [
            'id'          => (int) $t->term_id,
            'name'        => html_entity_decode($t->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
            'slug'        => $t->slug,
            'description' => get_term_meta((int) $t->term_id, 'cz_category_description', true) ?: '',
        ], is_array($assignedTerms) ? $assignedTerms : []);

        return rest_ensure_response([
            'success' => true,
            'service' => [
                'id'              => $id,
                'title'           => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug'            => $post->post_name,
                'platform_status' => $meta['platform_status'] ?? 'disabled',
                'module_status'   => $meta['module_status']   ?? $this->defaultModuleStatus(),
                'categories'      => $assignedCats,
            ],
            'drafts'  => [
                'overview'   => $overviewDraft,
                'inclusions' => null,
                'faqs'       => null,
            ],
        ]);
    }

    public function fetchDetail(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $meta         = get_post_meta($id, self::META_KEY, true);
        $meta         = is_array($meta) ? $meta : [];
        $terms        = wp_get_post_terms($id, self::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
        $categories   = array_map(fn($t) => ['id' => (int) $t->term_id, 'name' => html_entity_decode($t->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'), 'slug' => $t->slug, 'description' => $t->description ?? ''], $terms);
        $rawInc       = get_post_meta($id, self::META_INCLUSIONS, true);
        $inclusions   = is_array($rawInc) ? ($rawInc['inclusions'] ?? []) : [];
        $faqs         = get_post_meta($id, self::META_FAQS, true);
        $faqs         = is_array($faqs) ? $faqs : [];

        $ovDraft  = get_post_meta($id, self::DRAFT_OVERVIEW, true);
        $incDraft = get_post_meta($id, self::DRAFT_INCLUSIONS, true);
        $faqDraft = get_post_meta($id, self::DRAFT_FAQS, true);

        return rest_ensure_response([
            'success'         => true,
            'id'              => $id,
            'title'           => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
            'excerpt'         => $post->post_excerpt,
            'content'         => $post->post_content,
            'categories'      => $categories,
            'inclusions'      => $inclusions,
            'faqs'            => $faqs,
            'platform_status' => MetaSchema::resolvePlatformStatus($meta, $post->post_status),
            'module_status'   => $meta['module_status'] ?? $this->defaultModuleStatus(),
            'drafts'          => [
                'overview'   => is_array($ovDraft)  && !empty($ovDraft)  ? $ovDraft  : null,
                'inclusions' => is_array($incDraft) && !empty($incDraft) ? $incDraft : null,
                'faqs'       => is_array($faqDraft) && !empty($faqDraft) ? $faqDraft : null,
            ],
        ]);
    }

    public function updateOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        // Write to draft — do NOT touch canonical post fields or taxonomy.
        $draft = [
            'title'        => (string) ($request->get_param('title')   ?? ''),
            'excerpt'      => (string) ($request->get_param('excerpt')  ?? ''),
            'content'      => (string) ($request->get_param('content')  ?? ''),
            'category_ids' => $request->has_param('category_ids')
                              ? array_values(array_map('intval', (array) $request->get_param('category_ids')))
                              : [],
        ];

        update_post_meta($id, self::DRAFT_OVERVIEW, $draft);
        $moduleStatus = $this->markModuleDraft($id, 'overview');

        return rest_ensure_response([
            'success'       => true,
            'draft'         => $draft,
            'module_status' => $moduleStatus,
        ]);
    }

    public function updateInclusions(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $input = (array) ($request->get_param('inclusions') ?: []);
        $seen  = [];

        foreach ($input as $item) {
            if (!is_array($item)) continue;
            $itemId = sanitize_text_field((string) ($item['id'] ?? ''));
            $label  = sanitize_text_field((string) ($item['label'] ?? ''));
            if ($label === '') continue;
            if ($itemId === '') $itemId = sanitize_title($label);
            $seen[$itemId] = ['id' => $itemId, 'label' => $label];
        }

        $normalized = array_values($seen);

        // Write to draft — canonical cz_service_inclusions untouched.
        update_post_meta($id, self::DRAFT_INCLUSIONS, $normalized);
        $moduleStatus = $this->markModuleDraft($id, 'inclusions');

        return rest_ensure_response([
            'success'       => true,
            'inclusions'    => $normalized,
            'module_status' => $moduleStatus,
        ]);
    }

    public function updateFaqs(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $input = (array) ($request->get_param('faqs') ?: []);
        $seen  = [];

        foreach ($input as $item) {
            if (!is_array($item)) continue;
            $question = sanitize_text_field((string) ($item['question'] ?? ''));
            $answer   = sanitize_textarea_field((string) ($item['answer'] ?? ''));
            if ($question === '') continue;
            $faqId = sanitize_text_field((string) ($item['id'] ?? ''));
            if ($faqId === '') $faqId = sanitize_title($question);
            $seen[$faqId] = ['id' => $faqId, 'question' => $question, 'answer' => $answer];
        }

        $normalized = array_values($seen);

        // Write to draft — canonical cz_service_faqs untouched.
        update_post_meta($id, self::DRAFT_FAQS, $normalized);
        $moduleStatus = $this->markModuleDraft($id, 'faqs');

        return rest_ensure_response([
            'success'       => true,
            'faqs'          => $normalized,
            'module_status' => $moduleStatus,
        ]);
    }

    public function settleModuleRoute(\WP_REST_Request $request): \WP_REST_Response
    {
        $id     = (int) $request->get_param('id');
        $module = (string) $request->get_param('module');
        $post   = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        // B3 — non-blocking pool-settle guard: compare before the commit replaces
        // the pool, so removed-but-still-referenced items can be reported.
        $poolWarnings = $this->poolSettleWarnings($id, $module);

        $moduleStatus = $this->settleModule($id, $module);

        // Re-fetch settled canonical data for this module.
        $freshPost  = get_post($id);
        $terms      = wp_get_post_terms($id, self::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
        $categories = array_map(fn($t) => ['id' => (int) $t->term_id, 'name' => $t->name, 'slug' => $t->slug], $terms);
        $rawInc     = get_post_meta($id, self::META_INCLUSIONS, true);
        $inclusions = is_array($rawInc) ? ($rawInc['inclusions'] ?? []) : [];
        $faqs       = get_post_meta($id, self::META_FAQS, true);
        $faqs       = is_array($faqs) ? $faqs : [];

        $response = [
            'success'       => true,
            'module'        => $module,
            'module_status' => $moduleStatus,
            'service'       => [
                'id'         => $id,
                'title'      => html_entity_decode($freshPost->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'excerpt'    => $freshPost->post_excerpt,
                'content'    => $freshPost->post_content,
                'categories' => $categories,
            ],
            'inclusions'    => $inclusions,
            'faqs'          => $faqs,
        ];
        if ($poolWarnings !== []) {
            $response['pool_warnings'] = $poolWarnings;
        }

        return rest_ensure_response($response);
    }

    public function settleAll(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        // B3 — collect pool-settle warnings for every draft-bearing pool module
        // before the commits run (the commit replaces the pool being compared).
        $poolWarnings = [];
        foreach (['inclusions', 'faqs'] as $poolModule) {
            if ($this->hasDraft($id, $poolModule)) {
                $poolWarnings = array_merge($poolWarnings, $this->poolSettleWarnings($id, $poolModule));
            }
        }

        foreach (['overview', 'inclusions', 'faqs'] as $module) {
            if ($this->hasDraft($id, $module)) {
                $this->settleModule($id, $module);
            }
        }

        $freshPost  = get_post($id);
        $meta       = get_post_meta($id, self::META_KEY, true);
        $meta       = is_array($meta) ? $meta : [];
        $terms      = wp_get_post_terms($id, self::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
        $categories = array_map(fn($t) => ['id' => (int) $t->term_id, 'name' => $t->name, 'slug' => $t->slug], $terms);
        $rawInc     = get_post_meta($id, self::META_INCLUSIONS, true);
        $inclusions = is_array($rawInc) ? ($rawInc['inclusions'] ?? []) : [];
        $faqs       = get_post_meta($id, self::META_FAQS, true);
        $faqs       = is_array($faqs) ? $faqs : [];

        $response = [
            'success'       => true,
            'module_status' => $meta['module_status'] ?? $this->defaultModuleStatus(),
            'service'       => [
                'id'         => $id,
                'title'      => html_entity_decode($freshPost->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'excerpt'    => $freshPost->post_excerpt,
                'content'    => $freshPost->post_content,
                'categories' => $categories,
            ],
            'inclusions'    => $inclusions,
            'faqs'          => $faqs,
        ];
        if ($poolWarnings !== []) {
            $response['pool_warnings'] = $poolWarnings;
        }

        return rest_ensure_response($response);
    }

    public function revertModule(\WP_REST_Request $request): \WP_REST_Response
    {
        $id     = (int) $request->get_param('id');
        $module = (string) $request->get_param('module');
        $post   = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $draftKey = match ($module) {
            'overview'   => self::DRAFT_OVERVIEW,
            'inclusions' => self::DRAFT_INCLUSIONS,
            'faqs'       => self::DRAFT_FAQS,
            default      => null,
        };

        if ($draftKey) {
            delete_post_meta($id, $draftKey);
        }

        $meta = get_post_meta($id, self::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];
        if (!isset($meta['module_status']) || !is_array($meta['module_status'])) {
            $meta['module_status'] = $this->defaultModuleStatus();
        }

        $meta['module_status'][$module] = match ($module) {
            'overview'   => $this->isOverviewComplete($post)  ? 'settled' : 'not-configured',
            'inclusions' => $this->isInclusionsComplete($id)   ? 'settled' : 'not-configured',
            'faqs'       => $this->isFaqsComplete($id)         ? 'settled' : 'not-configured',
            default      => 'not-configured',
        };

        update_post_meta($id, self::META_KEY, $meta);

        return rest_ensure_response([
            'success'       => true,
            'module'        => $module,
            'module_status' => $meta['module_status'],
        ]);
    }

    public function updateStatus(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $meta = get_post_meta($id, self::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];

        if ($request->has_param('platform_status')) {
            $platformStatus = sanitize_text_field((string) $request->get_param('platform_status'));
            if (!in_array($platformStatus, MetaSchema::ALLOWED_PLATFORM_STATUSES, true)) {
                return new \WP_REST_Response(['success' => false, 'message' => 'Invalid platform_status.'], 422);
            }
        } elseif ($request->has_param('is_active')) {
            $platformStatus = $request->get_param('is_active') ? 'active' : 'disabled';
        } else {
            return new \WP_REST_Response(['success' => false, 'message' => 'No status parameter provided.'], 422);
        }

        // Engine-computed transition: previous_platform_status is captured when
        // entering a bin state from active/disabled and preserved on bin→bin moves
        // (StationLifecycle::capturePrevious owns that rule).
        $change = StationLifecycle::applyStatus(
            (string) ($meta['platform_status'] ?? 'disabled'),
            $platformStatus,
            isset($meta['previous_platform_status']) ? (string) $meta['previous_platform_status'] : null
        );

        if ($change['previous_status'] !== null) {
            $meta['previous_platform_status'] = $change['previous_status'];
        }

        // Rule 1: never write post_status — CompuZign owns lifecycle via platform_status.
        $meta['platform_status'] = $change['status'];

        // On activation: drafts stay pending; modules without drafts resolved from canonical.
        if ($platformStatus === 'active') {
            $meta['module_status'] = $this->resolveModuleStatusOnActivation($id, $post, $meta);
        }

        update_post_meta($id, self::META_KEY, $meta);
        $meta = get_post_meta($id, self::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];

        return rest_ensure_response([
            'success' => true,
            'service' => [
                'id'              => $id,
                'platform_status' => $meta['platform_status'] ?? 'disabled',
                'module_status'   => $meta['module_status']   ?? $this->defaultModuleStatus(),
                // Deprecated fields retained for frontend transition period.
                'post_status'     => $post->post_status,
                'is_active'       => MetaSchema::resolvePlatformStatus($meta, $post->post_status) === 'active',
            ],
        ]);
    }

    /**
     * Restore a service from archived or trashed back to the pending/draft re-entry state.
     * Always targets 'disabled' — never restores directly to 'active'.
     * Module statuses are preserved as-is; drafts and canonical data are untouched.
     */
    public function restoreService(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $meta          = get_post_meta($id, self::META_KEY, true);
        $meta          = is_array($meta) ? $meta : [];
        $currentStatus = MetaSchema::resolvePlatformStatus($meta, $post->post_status);

        $change = StationLifecycle::restore($currentStatus);
        if ($change === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service is not in a restorable state.'], 422);
        }

        $meta['platform_status']          = $change['status'];
        $meta['previous_platform_status'] = $change['previous_status'] ?? '';

        update_post_meta($id, self::META_KEY, $meta);
        $meta = get_post_meta($id, self::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];

        return rest_ensure_response([
            'success' => true,
            'service' => [
                'id'              => $id,
                'platform_status' => $meta['platform_status'] ?? 'disabled',
                'module_status'   => $meta['module_status']   ?? $this->defaultModuleStatus(),
                'post_status'     => $post->post_status,
                'is_active'       => false,
            ],
        ]);
    }

    /**
     * Permanently delete a trashed service and clean up all related platform data.
     * Only callable when platform_status === 'trashed'. Uses wp_delete_post with force=true
     * (bypasses WordPress Trash). Scrubs the service ID from surface package refs first.
     */
    public function permanentDeleteService(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $meta           = get_post_meta($id, self::META_KEY, true);
        $meta           = is_array($meta) ? $meta : [];
        $platformStatus = MetaSchema::resolvePlatformStatus($meta, $post->post_status);

        if (!StationLifecycle::canDelete($platformStatus)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Only trashed services can be permanently deleted.'], 422);
        }

        // Scrub this service ID from any surface package service_refs before hard-deleting.
        $pkgPosts = get_posts([
            'post_type'              => 'cz_surface_package',
            'post_status'            => ['publish', 'draft'],
            'numberposts'            => -1,
            'fields'                 => 'ids',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
        ]);

        foreach ($pkgPosts as $pkgId) {
            $pkg = get_post_meta((int) $pkgId, 'cz_package', true);
            if (!is_array($pkg) || empty($pkg['service_refs'])) {
                continue;
            }
            $filtered = array_values(array_filter(
                $pkg['service_refs'],
                fn($ref) => (int) $ref !== $id
            ));
            if (count($filtered) !== count($pkg['service_refs'])) {
                if (empty($filtered)) {
                    // Package now references no services — destroy the empty shell.
                    wp_delete_post((int) $pkgId, true);
                } else {
                    $pkg['service_refs'] = $filtered;
                    update_post_meta((int) $pkgId, 'cz_package', $pkg);
                }
            }
        }

        // Hard delete — removes the wp_posts row and all wp_postmeta rows automatically.
        wp_delete_post($id, true);

        return rest_ensure_response(['success' => true, 'deleted' => $id]);
    }

    // ── Inline service category creation ─────────────────────────────────────

    public function createServiceCategory(\WP_REST_Request $request): \WP_REST_Response
    {
        $body = $request->get_json_params();
        $name = sanitize_text_field((string) ($body['name'] ?? ''));
        $desc = sanitize_textarea_field((string) ($body['description'] ?? ''));

        if ($name === '') {
            return rest_ensure_response(['success' => false, 'message' => 'Category name is required.']);
        }

        // Description is stored as CompuZign-owned term meta, not the native WP term description.
        $result = wp_insert_term($name, self::CATEGORY_TAXONOMY);

        if (is_wp_error($result)) {
            // Duplicate — return the existing term so the frontend can select it.
            if ($result->get_error_code() === 'term_exists') {
                $existingId = (int) $result->get_error_data();
                $term       = get_term($existingId, self::CATEGORY_TAXONOMY);
                if ($term instanceof \WP_Term) {
                    return rest_ensure_response([
                        'success'  => true,
                        'existing' => true,
                        'category' => [
                            'id'          => (int) $term->term_id,
                            'name'        => html_entity_decode($term->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                            'slug'        => $term->slug,
                            'description' => get_term_meta((int) $term->term_id, 'cz_category_description', true) ?: '',
                        ],
                    ]);
                }
            }
            return rest_ensure_response(['success' => false, 'message' => $result->get_error_message()]);
        }

        $termId = (int) $result['term_id'];

        if ($desc !== '') {
            update_term_meta($termId, 'cz_category_description', $desc);
        }

        $term = get_term($termId, self::CATEGORY_TAXONOMY);

        return rest_ensure_response([
            'success'  => true,
            'existing' => false,
            'category' => [
                'id'          => $termId,
                'name'        => html_entity_decode($term->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug'        => $term->slug,
                'description' => get_term_meta($termId, 'cz_category_description', true) ?: '',
            ],
        ]);
    }

    // ── Inline service category update ───────────────────────────────────────

    public function updateServiceCategory(\WP_REST_Request $request): \WP_REST_Response
    {
        $termId = (int) $request->get_param('id');
        $term   = get_term($termId, self::CATEGORY_TAXONOMY);

        if (!$term instanceof \WP_Term) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Category not found.'], 404);
        }

        $body = $request->get_json_params();
        $name = isset($body['name']) ? sanitize_text_field((string) $body['name']) : null;
        $desc = isset($body['description']) ? sanitize_textarea_field((string) $body['description']) : null;

        if ($name !== null && $name !== '') {
            wp_update_term($termId, self::CATEGORY_TAXONOMY, ['name' => $name]);
        }

        if ($desc !== null) {
            update_term_meta($termId, 'cz_category_description', $desc);
        }

        $updated = get_term($termId, self::CATEGORY_TAXONOMY);

        return rest_ensure_response([
            'success'  => true,
            'category' => [
                'id'          => $termId,
                'name'        => html_entity_decode($updated->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug'        => $updated->slug,
                'description' => get_term_meta($termId, 'cz_category_description', true) ?: '',
            ],
        ]);
    }

    // ── Package Station tier management (Phase 2 — service-owned paths) ──────

    public function getPackageStation(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $station = get_post_meta($serviceId, self::META_PACKAGE_STATION, true);
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $rawInc     = get_post_meta($serviceId, self::META_INCLUSIONS, true) ?: [];
        $incPool    = (isset($rawInc['inclusions']) && is_array($rawInc['inclusions'])) ? $rawInc['inclusions'] : [];
        $rawFaqs    = get_post_meta($serviceId, self::META_FAQS, true) ?: [];

        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $tiers = [];
        foreach ($PS::ALLOWED_TIERS as $tierId) {
            // P3 additive read exposure: settled detail (unchanged 8 fields) plus the
            // raw drafts + module_status, returned SEPARATELY. No server-side merge —
            // the hook derives draft-preferred client-side (parity with useServiceStation).
            $slot   = $PS::ensureTierLifecycle($station['tiers'][$tierId] ?? []);
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
                $detail['drafts']['features'] = PoolReferences::refreshInclusionLabels($incPool, $detail['drafts']['features']);
            }
            $tiers[$tierId] = $detail;
        }

        return rest_ensure_response([
            'success'    => true,
            'service_id' => $serviceId,
            'station'    => [
                'platform_status' => $station['platform_status'] ?? 'disabled',
                'tiers'           => $tiers,
                'popular_tier'    => $station['popular_tier'] ?? null,
                'popular_label'   => $station['popular_label'] ?? '',
                'sort_position'   => (int) ($station['sort_position'] ?? 0),
                'bundle'          => $station['bundle'] ?? ['title' => '', 'description' => '', 'price' => null],
            ],
            'service' => [
                'id'         => $serviceId,
                'title'      => $post->post_title,
                'inclusions' => array_values(array_filter(
                    is_array($incPool) ? $incPool : [],
                    fn($i) => is_array($i) && !empty($i['id']) && !empty($i['label'])
                )),
                'faqs'       => array_values(array_filter(
                    is_array($rawFaqs) ? $rawFaqs : [],
                    fn($i) => is_array($i) && !empty($i['question'])
                )),
            ],
        ]);
    }

    public function savePackageStationTier(\WP_REST_Request $request): \WP_REST_Response
    {
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

        $station = get_post_meta($serviceId, self::META_PACKAGE_STATION, true);
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        // Add new inclusions/FAQs to service canonical pools.
        $addedInclusions = $this->addItemsToInclusionPool($serviceId, $body['new_inclusions'] ?? []);
        $addedFaqRefs    = $this->addItemsToFaqPool($serviceId, $body['new_faqs'] ?? []);

        $existingDetail = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::normaliseTierSlot(
            $station['tiers'][$tierId] ?? []
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
        $station['tiers'][$tierId] = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::commitTierLifecycle(
            \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::upsertOccupant(
                $station['tiers'][$tierId] ?? ['current_occupant' => null, 'history' => []],
                $tierData,
                $enabled
            )
        );

        if (array_key_exists('popular', $body)) {
            if ((bool) $body['popular']) {
                $station['popular_tier']  = $tierId;
                $station['popular_label'] = sanitize_text_field((string) ($body['popular_label'] ?? ''));
            } elseif (($station['popular_tier'] ?? null) === $tierId) {
                $station['popular_tier'] = null;
            }
        }

        $station['platform_status'] = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::deriveStationStatus($station);
        update_post_meta($serviceId, self::META_PACKAGE_STATION, $station);

        $tiers = [];
        foreach (\CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS as $tid) {
            $tiers[$tid] = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::normaliseTierSlot($station['tiers'][$tid] ?? []);
        }

        return rest_ensure_response([
            'success'              => true,
            'station'              => array_merge($station, ['tiers' => $tiers]),
            'new_inclusions_added' => count($addedInclusions),
            'new_faqs_added'       => count($addedFaqRefs),
        ]);
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

        $station = get_post_meta($serviceId, self::META_PACKAGE_STATION, true);
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $tierSlot = $station['tiers'][$tierId] ?? [];
        $PS = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;

        if ($PS::isOccupantFormat($tierSlot)) {
            if (!empty($tierSlot['current_occupant'])) {
                $station['tiers'][$tierId]['current_occupant']['platform_status'] = $enabled ? 'active' : 'disabled';
            }
        } else {
            if (!empty($tierSlot)) {
                $station['tiers'][$tierId]['enabled'] = $enabled;
            }
        }

        $station['platform_status'] = $PS::deriveStationStatus($station);
        update_post_meta($serviceId, self::META_PACKAGE_STATION, $station);

        return rest_ensure_response(['success' => true, 'tier_id' => $tierId, 'enabled' => $enabled]);
    }

    /**
     * Phase 2 — P3: per-module tier draft save.
     * Persists drafts[$module] and marks the module pending. Does NOT touch
     * current_occupant, so Cost Builder visibility (platform_status) is unchanged.
     * References only — P3 does not create service-pool items (that is a later phase).
     */
    public function savePackageStationTierModule(\WP_REST_Request $request): \WP_REST_Response
    {
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

        $station = get_post_meta($serviceId, self::META_PACKAGE_STATION, true);
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) { $body = []; }

        $slot = $PS::ensureTierLifecycle($station['tiers'][$tierId] ?? []);

        if ($module === 'overview') {
            $contact = !empty($body['contact']);
            $price   = null;
            if (!$contact && array_key_exists('price', $body) && $body['price'] !== null && $body['price'] !== '') {
                $price = (float) $body['price'];
            }
            $draftValue = [
                'label'         => sanitize_text_field((string) ($body['label'] ?? '')),
                'price'         => $price,
                'contact'       => $contact,
                'billing_cycle' => sanitize_text_field((string) ($body['billing_cycle'] ?? '')),
            ];
        } elseif ($module === 'features') {
            $draftValue = [];
            if (is_array($body['inclusions_override'] ?? null)) {
                foreach ($body['inclusions_override'] as $inc) {
                    if (!is_array($inc)) { continue; }
                    $id = sanitize_text_field((string) ($inc['id'] ?? ''));
                    $lb = sanitize_text_field((string) ($inc['label'] ?? ''));
                    if ($id !== '' && $lb !== '') { $draftValue[] = ['id' => $id, 'label' => $lb]; }
                }
            }
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
        $station['tiers'][$tierId]      = $slot;
        update_post_meta($serviceId, self::META_PACKAGE_STATION, $station);

        return rest_ensure_response([
            'success'       => true,
            'tier_id'       => $tierId,
            'module'        => $module,
            'tier'          => $PS::normaliseTierSlot($slot),
            'drafts'        => $slot['drafts'],
            'module_status' => $slot['module_status'],
        ]);
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

        $station = get_post_meta($serviceId, self::META_PACKAGE_STATION, true);
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $slot = $PS::settleTierSlot($station['tiers'][$tierId] ?? []);
        $station['tiers'][$tierId]  = $slot;
        $station['platform_status'] = $PS::deriveStationStatus($station);
        update_post_meta($serviceId, self::META_PACKAGE_STATION, $station);

        return rest_ensure_response([
            'success'       => true,
            'tier_id'       => $tierId,
            'tier'          => $PS::normaliseTierSlot($slot),
            'drafts'        => $slot['drafts'],
            'module_status' => $slot['module_status'],
        ]);
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

        $station = get_post_meta($serviceId, self::META_PACKAGE_STATION, true);
        if (!is_array($station) || empty($station)) {
            return rest_ensure_response(['success' => false, 'message' => 'Package Station not found.']);
        }

        $body   = $request->get_json_params();
        if (!is_array($body)) { $body = []; }
        $tierId = sanitize_key((string) ($body['tier_id'] ?? ''));

        if ($tierId !== '' && in_array($tierId, $PS::ALLOWED_TIERS, true)) {
            $station['popular_tier']  = $tierId;
            $station['popular_label'] = sanitize_text_field((string) ($body['label'] ?? ''));
        } else {
            $station['popular_tier']  = null;
            $station['popular_label'] = '';
        }

        update_post_meta($serviceId, self::META_PACKAGE_STATION, $station);

        return rest_ensure_response([
            'success'       => true,
            'popular_tier'  => $station['popular_tier'],
            'popular_label' => $station['popular_label'],
        ]);
    }

    /**
     * Phase 2 — P5 Step 2: create (or resolve) a single canonical inclusion.
     * Immediate write to the Service-owned pool — no draft, no module_status change,
     * same as the existing addItemsToInclusionPool contract used by tier saves.
     * Dedupe is case-insensitive on label, or exact id match; a duplicate resolves
     * to the existing item (existing: true) instead of erroring or creating a copy.
     */
    public function createInclusionPoolItem(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $body  = $request->get_json_params();
        $label = sanitize_text_field((string) ($body['label'] ?? ''));
        if ($label === '') {
            return new \WP_REST_Response(['success' => false, 'message' => 'Label is required.'], 422);
        }

        $id   = sanitize_title($label);
        $raw  = get_post_meta($serviceId, self::META_INCLUSIONS, true) ?: [];
        $pool = (isset($raw['inclusions']) && is_array($raw['inclusions'])) ? $raw['inclusions'] : [];

        foreach ($pool as $item) {
            if (!is_array($item)) { continue; }
            $itemId    = (string) ($item['id'] ?? '');
            $itemLabel = (string) ($item['label'] ?? '');
            if ($itemId === $id || strtolower($itemLabel) === strtolower($label)) {
                return rest_ensure_response([
                    'success'   => true,
                    'existing'  => true,
                    'inclusion' => ['id' => $itemId, 'label' => $itemLabel],
                ]);
            }
        }

        $added = $this->addItemsToInclusionPool($serviceId, [['label' => $label]]);

        return rest_ensure_response([
            'success'   => true,
            'existing'  => false,
            'inclusion' => $added[0] ?? ['id' => $id, 'label' => $label],
        ]);
    }

    /**
     * Phase 2 — P5 Step 2: create (or resolve) a single canonical FAQ.
     * Same immediate-write, dedupe-by-question-or-id contract as the inclusion pool.
     */
    public function createFaqPoolItem(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $body     = $request->get_json_params();
        $question = sanitize_text_field((string) ($body['question'] ?? ''));
        if ($question === '') {
            return new \WP_REST_Response(['success' => false, 'message' => 'Question is required.'], 422);
        }
        $answer = sanitize_textarea_field((string) ($body['answer'] ?? ''));

        $id   = sanitize_title($question);
        $pool = get_post_meta($serviceId, self::META_FAQS, true);
        $pool = is_array($pool) ? $pool : [];

        foreach ($pool as $item) {
            if (!is_array($item)) { continue; }
            $itemId       = (string) ($item['id'] ?? '');
            $itemQuestion = (string) ($item['question'] ?? '');
            if ($itemId === $id || strtolower($itemQuestion) === strtolower($question)) {
                return rest_ensure_response([
                    'success'  => true,
                    'existing' => true,
                    'faq'      => [
                        'id'       => $itemId,
                        'question' => $itemQuestion,
                        'answer'   => (string) ($item['answer'] ?? ''),
                    ],
                ]);
            }
        }

        $addedIds = $this->addItemsToFaqPool($serviceId, [['question' => $question, 'answer' => $answer]]);

        return rest_ensure_response([
            'success'  => true,
            'existing' => false,
            'faq'      => ['id' => $addedIds[0] ?? $id, 'question' => $question, 'answer' => $answer],
        ]);
    }

    // ── Promotion Station management (Phase 4 — service-owned paths) ──────────

    public function getPromotionStation(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $PS  = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $raw = $this->readPromotionStation($serviceId);
        $instances = $PS::normalisePromotionInstances($raw);

        // C1 — lifecycle envelopes are ensured on the RAW instances (normalise
        // whitelists fields and would drop the stored envelope).
        $rawById = [];
        foreach ($raw as $rawInst) {
            if (is_array($rawInst) && !empty($rawInst['id'])) {
                $rawById[(string) $rawInst['id']] = $rawInst;
            }
        }

        $rawInc  = get_post_meta($serviceId, self::META_INCLUSIONS, true) ?: [];
        $incPool = (isset($rawInc['inclusions']) && is_array($rawInc['inclusions'])) ? $rawInc['inclusions'] : [];
        $rawFaqs = get_post_meta($serviceId, self::META_FAQS, true) ?: [];

        foreach ($instances as &$inst) {
            // B2 — pool refs resolve at read time: id authoritative, labels refreshed
            // from the inclusion pool. Inclusions flag danglers (missing); exclusions
            // never do (an off-pool exclusion ref is legitimate). The admin save
            // round-trip then persists the refreshed labels.
            $inst['inclusions'] = PoolReferences::refreshInclusionLabels($incPool, $inst['inclusions']);
            $inst['exclusions'] = PoolReferences::refreshInclusionLabels($incPool, $inst['exclusions'], false);

            // C1 additive read exposure: raw drafts + module_status returned
            // SEPARATELY, no server-side merge — the hook derives draft-preferred
            // client-side (parity with the tier P3 read shape). Travel state stays
            // on the legacy top-level status field until C3.
            $ensured = $PS::ensurePromotionLifecycle($rawById[$inst['id']] ?? $inst);
            $inst['drafts']        = $ensured['lifecycle']['drafts'];
            $inst['module_status'] = $ensured['lifecycle']['module_status'];
            // Pending feature drafts hold pool refs too — same read-time refresh
            // as the settled fields (parity with the tier drafts.features path).
            if (is_array($inst['drafts']['features'] ?? null)) {
                $inst['drafts']['features'] = PoolReferences::refreshInclusionLabels($incPool, $inst['drafts']['features']);
            }
        }
        unset($inst);

        return rest_ensure_response([
            'success'    => true,
            'service_id' => $serviceId,
            'promotions' => $instances,
            'service'    => [
                'id'         => $serviceId,
                'title'      => $post->post_title,
                'inclusions' => array_values(array_filter(
                    is_array($incPool) ? $incPool : [],
                    fn($i) => is_array($i) && !empty($i['id']) && !empty($i['label'])
                )),
                'faqs' => array_values(array_filter(
                    is_array($rawFaqs) ? $rawFaqs : [],
                    fn($i) => is_array($i) && !empty($i['question'])
                )),
            ],
        ]);
    }

    public function createServicePromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $post      = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid request body.']);
        }

        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $promoId  = $PS::generatePromotionTierId();
        $instance = $PS::buildPromotionInstance($promoId, $body);

        $current   = $this->readPromotionStation($serviceId);
        $current[] = $instance;
        $this->writePromotionStationDirect($serviceId, $current);

        return rest_ensure_response(['success' => true, 'promo_id' => $promoId, 'promotion_tier' => $instance]);
    }

    public function saveServicePromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid request body.']);
        }

        $PS        = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $current   = $this->readPromotionStation($serviceId);
        $existing  = $PS::findPromoInInstances($current, $promoId);
        if ($existing === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Promotion not found.']);
        }

        $updated = $PS::buildPromotionInstance($promoId, $body, [], $existing);

        foreach ($current as &$inst) {
            if (is_array($inst) && ($inst['id'] ?? '') === $promoId) {
                $inst = $updated;
                break;
            }
        }
        unset($inst);

        $this->writePromotionStationDirect($serviceId, $current);

        return rest_ensure_response(['success' => true, 'promo_id' => $promoId, 'promotion_tier' => $updated]);
    }

    public function archiveServicePromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $current = $this->readPromotionStation($serviceId);
        $found   = false;
        foreach ($current as &$inst) {
            if (is_array($inst) && ($inst['id'] ?? '') === $promoId) {
                $inst['status'] = 'archived';
                $found = true;
                break;
            }
        }
        unset($inst);

        if (!$found) {
            return rest_ensure_response(['success' => false, 'message' => 'Promotion not found.']);
        }

        $this->writePromotionStationDirect($serviceId, $current);

        return rest_ensure_response(['success' => true, 'promo_id' => $promoId, 'status' => 'archived']);
    }

    public function reactivateServicePromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $current = $this->readPromotionStation($serviceId);
        $found   = false;
        foreach ($current as &$inst) {
            if (is_array($inst) && ($inst['id'] ?? '') === $promoId) {
                $inst['status'] = 'active';
                $found = true;
                break;
            }
        }
        unset($inst);

        if (!$found) {
            return rest_ensure_response(['success' => false, 'message' => 'Promotion not found.']);
        }

        $this->writePromotionStationDirect($serviceId, $current);

        return rest_ensure_response(['success' => true, 'promo_id' => $promoId, 'status' => 'active']);
    }

    // ── Promotion module lifecycle handlers (engine C2) ───────────────────────

    /**
     * Per-module draft save: persists lifecycle.drafts[module], marks the module
     * pending. Settled fields and travel status are never touched.
     */
    public function savePromotionModule(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));
        $module    = sanitize_key((string) $request->get_param('module'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $body = $request->get_json_params();
        if (!is_array($body)) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid request body.']);
        }

        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $current = $this->readPromotionStation($serviceId);
        $index   = $this->findPromotionIndex($current, $promoId);
        if ($index === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Promotion not found.']);
        }

        $updated = $PS::savePromotionModuleDraft($current[$index], $module, $body);
        if ($updated === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid module payload.']);
        }

        $current[$index] = $updated;
        $this->writePromotionStationDirect($serviceId, $current);

        return rest_ensure_response($this->promotionLifecycleResponse($serviceId, $updated, $module));
    }

    /**
     * Settle: commit the draft-preferred state of every module into the settled
     * fields, clear drafts, re-derive module_status. No-ops (no write) when the
     * instance has no drafts. Travel status is never touched.
     */
    public function settlePromotion(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $current = $this->readPromotionStation($serviceId);
        $index   = $this->findPromotionIndex($current, $promoId);
        if ($index === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Promotion not found.']);
        }

        $settled = $PS::settlePromotionInstance($current[$index]);
        if ($settled !== $current[$index]) {
            $current[$index] = $settled;
            $this->writePromotionStationDirect($serviceId, $current);
        }

        return rest_ensure_response($this->promotionLifecycleResponse($serviceId, $settled));
    }

    /**
     * Per-module revert: discard the draft, module_status re-derives from the
     * settled content.
     */
    public function revertPromotionModule(\WP_REST_Request $request): \WP_REST_Response
    {
        $serviceId = (int) $request->get_param('id');
        $promoId   = sanitize_key((string) $request->get_param('promo'));
        $module    = sanitize_key((string) $request->get_param('module'));

        $post = get_post($serviceId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return rest_ensure_response(['success' => false, 'message' => 'Service not found.']);
        }

        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $current = $this->readPromotionStation($serviceId);
        $index   = $this->findPromotionIndex($current, $promoId);
        if ($index === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Promotion not found.']);
        }

        $updated = $PS::revertPromotionModuleDraft($current[$index], $module);
        if ($updated === null) {
            return rest_ensure_response(['success' => false, 'message' => 'Invalid module.']);
        }

        $current[$index] = $updated;
        $this->writePromotionStationDirect($serviceId, $current);

        return rest_ensure_response($this->promotionLifecycleResponse($serviceId, $updated, $module));
    }

    /** Index of a promotion instance in the raw instances array, or null. */
    private function findPromotionIndex(array $instances, string $promoId): ?int
    {
        foreach ($instances as $i => $inst) {
            if (is_array($inst) && ($inst['id'] ?? '') === $promoId) {
                return $i;
            }
        }
        return null;
    }

    /**
     * Shared C2 response shape — parity with the tier module lifecycle responses:
     * the normalised instance (pool labels refreshed, B2) plus the raw drafts and
     * module_status returned SEPARATELY for the client-side draft-preferred merge.
     *
     * @param  array<string, mixed> $instance raw instance (lifecycle guaranteed)
     * @return array<string, mixed>
     */
    private function promotionLifecycleResponse(int $serviceId, array $instance, ?string $module = null): array
    {
        $PS      = \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::class;
        $ensured = $PS::ensurePromotionLifecycle($instance);

        $rawInc  = get_post_meta($serviceId, self::META_INCLUSIONS, true) ?: [];
        $incPool = (isset($rawInc['inclusions']) && is_array($rawInc['inclusions'])) ? $rawInc['inclusions'] : [];

        // Pending feature drafts hold pool refs too — same read-time refresh as
        // the settled fields (parity with the tier drafts.features path).
        $drafts = $ensured['lifecycle']['drafts'];
        if (is_array($drafts['features'] ?? null)) {
            $drafts['features'] = PoolReferences::refreshInclusionLabels($incPool, $drafts['features']);
        }

        $normalised = $PS::normalisePromotionInstances([$ensured])[0] ?? [];
        if ($normalised !== []) {
            $normalised['inclusions'] = PoolReferences::refreshInclusionLabels($incPool, $normalised['inclusions']);
            $normalised['exclusions'] = PoolReferences::refreshInclusionLabels($incPool, $normalised['exclusions'], false);
            $normalised['drafts']        = $drafts;
            $normalised['module_status'] = $ensured['lifecycle']['module_status'];
        }

        $response = [
            'success'        => true,
            'promo_id'       => (string) ($ensured['id'] ?? ''),
            'drafts'         => $drafts,
            'module_status'  => $ensured['lifecycle']['module_status'],
            'promotion_tier' => $normalised,
        ];
        if ($module !== null) {
            $response['module'] = $module;
        }
        return $response;
    }

    /**
     * Reads current promotion instances, bridging to the legacy cz_package post when
     * this service's promotion station has not been Phase 4-migrated yet. Mirrors the
     * fallback already used by AdminSurfacePackagesController::loadPromotionInstancesForPackage()
     * and PackageRepository, so create/save/archive/reactivate never stamp migrated=>true
     * over an empty station while promotions still exist only on the source package.
     *
     * @return array<int, array<string, mixed>>
     */
    private function readPromotionStation(int $serviceId): array
    {
        $promoStation = get_post_meta($serviceId, self::META_PROMOTION_STATION, true);
        if (is_array($promoStation) && !empty($promoStation['migrated'])) {
            return $promoStation['instances'] ?? [];
        }
        return \CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::normalisePromotionInstances(
            $this->legacyPromotionInstances($serviceId)
        );
    }

    /**
     * Legacy bridge — remove when Phase 4 migration is confirmed complete for all services.
     * Follows this service's package station migration_source_id to the source cz_package
     * post and reads its promotion_tiers, same source AdminSurfacePackagesController and
     * PackageRepository already read for the Connections summary and Cost Builder.
     *
     * @return array<int, array<string, mixed>>
     */
    private function legacyPromotionInstances(int $serviceId): array
    {
        $station  = get_post_meta($serviceId, self::META_PACKAGE_STATION, true);
        $sourceId = is_array($station) ? (int) ($station['migration_source_id'] ?? 0) : 0;
        if ($sourceId <= 0) {
            return [];
        }
        $pkg = get_post_meta($sourceId, 'cz_package', true);
        return is_array($pkg) ? ($pkg['promotion_tiers'] ?? []) : [];
    }

    private function writePromotionStationDirect(int $serviceId, array $instances): void
    {
        update_post_meta($serviceId, self::META_PROMOTION_STATION, [
            'instances' => array_values($instances),
            'migrated'  => true,
        ]);
    }

    // ── Service inclusion/FAQ pool helpers (used by tier save) ────────────────

    /** @return array<int, array{id: string, label: string}> */
    private function addItemsToInclusionPool(int $serviceId, array $items): array
    {
        if (empty($items)) { return []; }
        $raw  = get_post_meta($serviceId, self::META_INCLUSIONS, true) ?: [];
        $pool = (isset($raw['inclusions']) && is_array($raw['inclusions'])) ? $raw['inclusions'] : [];
        $byId = array_flip(array_column($pool, 'id'));
        $byLb = array_flip(array_map('strtolower', array_column($pool, 'label')));
        $added = [];
        foreach ($items as $item) {
            $label = sanitize_text_field((string) ($item['label'] ?? ''));
            if ($label === '') { continue; }
            $id = sanitize_title($label);
            if (isset($byId[$id]) || isset($byLb[strtolower($label)])) { continue; }
            $inc = ['id' => $id, 'label' => $label];
            $pool[] = $inc; $added[] = $inc;
            $byId[$id] = true; $byLb[strtolower($label)] = true;
        }
        if (!empty($added)) {
            $raw['inclusions'] = $pool;
            if (!isset($raw['tier_inclusions']) || !is_array($raw['tier_inclusions'])) {
                $raw['tier_inclusions'] = array_fill_keys(\CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema::ALLOWED_TIERS, []);
            }
            update_post_meta($serviceId, self::META_INCLUSIONS, $raw);
        }
        return $added;
    }

    /** @return string[] */
    private function addItemsToFaqPool(int $serviceId, array $items): array
    {
        if (empty($items)) { return []; }
        $pool = get_post_meta($serviceId, self::META_FAQS, true) ?: [];
        if (!is_array($pool)) { $pool = []; }
        $byId = array_flip(array_column($pool, 'id'));
        $byQ  = array_flip(array_map('strtolower', array_column($pool, 'question')));
        $added = [];
        foreach ($items as $item) {
            $q = sanitize_text_field((string) ($item['question'] ?? ''));
            $a = sanitize_textarea_field((string) ($item['answer'] ?? ''));
            if ($q === '') { continue; }
            $id = sanitize_title($q);
            if (isset($byId[$id]) || isset($byQ[strtolower($q)])) { continue; }
            $pool[] = ['id' => $id, 'question' => $q, 'answer' => $a];
            $added[] = $id; $byId[$id] = true; $byQ[strtolower($q)] = true;
        }
        if (!empty($added)) { update_post_meta($serviceId, self::META_FAQS, $pool); }
        return $added;
    }

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Modules\Admin\AdminRouter::CAP);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Writing a draft always marks the module as 'pending', regardless of platform_status.
     * Handles not-configured → pending transition on first save for inclusions/faqs.
     */
    private function markModuleDraft(int $id, string $module): array
    {
        $meta = get_post_meta($id, self::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];

        if (!isset($meta['module_status']) || !is_array($meta['module_status'])) {
            $meta['module_status'] = $this->defaultModuleStatus();
        }

        $meta['module_status'][$module] = 'pending';
        update_post_meta($id, self::META_KEY, $meta);

        return $meta['module_status'];
    }

    /**
     * Promotes one module's draft to canonical Active. Called by both per-module and bulk routes.
     * Returns the updated module_status array.
     */
    private function settleModule(int $id, string $module): array
    {
        $meta = get_post_meta($id, self::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];
        if (!isset($meta['module_status']) || !is_array($meta['module_status'])) {
            $meta['module_status'] = $this->defaultModuleStatus();
        }

        switch ($module) {
            case 'overview':
                $draft = get_post_meta($id, self::DRAFT_OVERVIEW, true);
                if (!is_array($draft) || empty($draft)) break;

                $post = get_post($id);
                wp_update_post([
                    'ID'           => $id,
                    'post_title'   => $draft['title']   ?? ($post->post_title ?? ''),
                    'post_excerpt' => $draft['excerpt']  ?? '',
                    'post_content' => $draft['content']  ?? '',
                ]);

                $catIds = isset($draft['category_ids']) && is_array($draft['category_ids'])
                          ? array_map('intval', $draft['category_ids'])
                          : [];
                wp_set_object_terms($id, $catIds, self::CATEGORY_TAXONOMY);

                delete_post_meta($id, self::DRAFT_OVERVIEW);

                $freshPost = get_post($id);
                $meta['module_status']['overview'] = $this->isOverviewComplete($freshPost) ? 'settled' : 'not-configured';
                break;

            case 'inclusions':
                $draft = get_post_meta($id, self::DRAFT_INCLUSIONS, true);
                if (!is_array($draft)) break;

                $existing = get_post_meta($id, self::META_INCLUSIONS, true);
                $existing = is_array($existing) ? $existing : [];
                update_post_meta($id, self::META_INCLUSIONS, [
                    'inclusions'      => $draft,
                    'tier_inclusions' => $existing['tier_inclusions'] ?? [],
                ]);

                delete_post_meta($id, self::DRAFT_INCLUSIONS);
                $meta['module_status']['inclusions'] = $this->isInclusionsComplete($id) ? 'settled' : 'not-configured';
                break;

            case 'faqs':
                $draft = get_post_meta($id, self::DRAFT_FAQS, true);
                if (!is_array($draft)) break;

                update_post_meta($id, self::META_FAQS, $draft);
                delete_post_meta($id, self::DRAFT_FAQS);
                $meta['module_status']['faqs'] = $this->isFaqsComplete($id) ? 'settled' : 'not-configured';
                break;
        }

        update_post_meta($id, self::META_KEY, $meta);
        return $meta['module_status'];
    }

    /**
     * B3 — non-blocking pool-settle guard. When settling would remove a pool item
     * still referenced anywhere in the station graph (tier occupants + drafts,
     * binned occupants, promotion instances of every status + drafts), report it
     * so the admin UI can warn. Never blocks the settle; refs are never pruned —
     * they degrade to dangling and re-resolve if the pool item returns.
     *
     * Must run BEFORE settleModule() commits, since the commit replaces the pool
     * being compared.
     *
     * @return array<int, array{id: string, label: string, referenced_by: string[]}>
     */
    private function poolSettleWarnings(int $serviceId, string $module): array
    {
        if ($module === 'inclusions') {
            $draft = get_post_meta($serviceId, self::DRAFT_INCLUSIONS, true);
            if (!is_array($draft)) {
                return [];
            }
            $existingRaw = get_post_meta($serviceId, self::META_INCLUSIONS, true);
            $existing    = is_array($existingRaw) ? ($existingRaw['inclusions'] ?? []) : [];
            $labelField  = 'label';
        } elseif ($module === 'faqs') {
            $draft = get_post_meta($serviceId, self::DRAFT_FAQS, true);
            if (!is_array($draft)) {
                return [];
            }
            $existing   = get_post_meta($serviceId, self::META_FAQS, true);
            $existing   = is_array($existing) ? $existing : [];
            $labelField = 'question';
        } else {
            return [];
        }

        $keptIds = [];
        foreach ($draft as $item) {
            if (is_array($item) && (string) ($item['id'] ?? '') !== '') {
                $keptIds[(string) $item['id']] = true;
            }
        }

        $removed = [];
        foreach ((is_array($existing) ? $existing : []) as $item) {
            if (!is_array($item)) {
                continue;
            }
            $itemId = (string) ($item['id'] ?? '');
            if ($itemId !== '' && !isset($keptIds[$itemId])) {
                $removed[$itemId] = (string) ($item[$labelField] ?? '');
            }
        }
        if ($removed === []) {
            return [];
        }

        $station   = get_post_meta($serviceId, self::META_PACKAGE_STATION, true);
        $station   = is_array($station) ? $station : [];
        $instances = $this->readPromotionStation($serviceId);

        $refs = $module === 'inclusions'
            ? PoolReferences::collectInclusionRefs($station, $instances)
            : PoolReferences::collectFaqRefs($station, $instances);

        $warnings = [];
        foreach ($removed as $itemId => $label) {
            if (!empty($refs[$itemId])) {
                $warnings[] = [
                    'id'            => $itemId,
                    'label'         => $label,
                    'referenced_by' => array_values(array_unique($refs[$itemId])),
                ];
            }
        }
        return $warnings;
    }

    /**
     * On activation, drafts stay pending. Modules without drafts are resolved from canonical.
     */
    private function resolveModuleStatusOnActivation(int $id, \WP_Post $post, array $meta): array
    {
        return [
            'overview'   => $this->hasDraft($id, 'overview')
                            ? 'pending'
                            : ($this->isOverviewComplete($post)  ? 'settled' : 'not-configured'),
            'inclusions' => $this->hasDraft($id, 'inclusions')
                            ? 'pending'
                            : ($this->isInclusionsComplete($id)   ? 'settled' : 'not-configured'),
            'faqs'       => $this->hasDraft($id, 'faqs')
                            ? 'pending'
                            : ($this->isFaqsComplete($id)         ? 'settled' : 'not-configured'),
        ];
    }

    private function hasDraft(int $id, string $module): bool
    {
        $key = match ($module) {
            'overview'   => self::DRAFT_OVERVIEW,
            'inclusions' => self::DRAFT_INCLUSIONS,
            'faqs'       => self::DRAFT_FAQS,
            default      => null,
        };
        return $key !== null && !empty(get_post_meta($id, $key, true));
    }

    private function isOverviewComplete(\WP_Post $post): bool
    {
        // Overview completeness = title + category + content. Excerpt is intentionally
        // NOT required — it is not collected in the current Overview workflow, so it must
        // not block module settlement. Aligns with the frontend completeness gate.
        if (trim($post->post_title) === '')   return false;
        if (trim($post->post_content) === '')  return false;
        $terms = wp_get_post_terms($post->ID, self::CATEGORY_TAXONOMY, ['fields' => 'ids']);
        return !empty($terms);
    }

    private function isInclusionsComplete(int $id): bool
    {
        $raw        = get_post_meta($id, self::META_INCLUSIONS, true);
        $inclusions = is_array($raw) ? ($raw['inclusions'] ?? []) : [];
        if (empty($inclusions)) return false;
        foreach ($inclusions as $inc) {
            if (trim((string) ($inc['label'] ?? '')) === '') return false;
        }
        return true;
    }

    private function isFaqsComplete(int $id): bool
    {
        $faqs = get_post_meta($id, self::META_FAQS, true);
        if (!is_array($faqs) || empty($faqs)) return false;
        foreach ($faqs as $faq) {
            if (trim((string) ($faq['question'] ?? '')) === '') return false;
            if (trim((string) ($faq['answer']   ?? '')) === '') return false;
        }
        return true;
    }

    private function defaultModuleStatus(): array
    {
        return ['overview' => 'pending', 'inclusions' => 'not-configured', 'faqs' => 'not-configured'];
    }
}
