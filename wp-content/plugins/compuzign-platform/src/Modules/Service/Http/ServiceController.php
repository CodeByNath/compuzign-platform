<?php

/*
 * FILE INDEX
 *
 * SERVICE_ROUTES           The 14 cz_service REST route registrations
 * CATALOGUE_HANDLERS       List, create, detail
 * DRAFT_HANDLERS           Overview/inclusions/faqs draft saves
 * SETTLE_HANDLERS          Per-module settle, bulk settle, revert
 * LIFECYCLE_HANDLERS       Status, restore, permanent delete
 * POOL_HANDLERS            Immediate canonical inclusion/FAQ pool creation
 * AUTHORIZATION            Permission callback
 * MODULE_HELPERS           Draft marking, settle commit, completeness, pool guard
 *
 * Search: SECTION: SERVICE_ROUTES ... SECTION: MODULE_HELPERS
 *
 * OWNERSHIP
 * This is the single backend owner of the cz_service entity: its lifecycle, its
 * cz_service_* meta, its drafts, its inclusion/FAQ pools, and its category
 * taxonomy relationships. Route paths, payloads, and validation are unchanged
 * from AdminServicesController, which this replaces.
 *
 * NOT OWNED HERE
 *   - cz_service_pricing — Cost Builder is the sole authority. The MetaSchema
 *     import is only the shared platform_status vocabulary, not pricing.
 *   - The Package Station and Promotions route families, which are nested under
 *     /admin/services/{id}/package-station/* as compatibility contracts but are
 *     owned by SurfacePackages and Promotions respectively.
 *   - StationLifecycle, PoolReferences, CategoryMeta — entity-neutral shared
 *     infrastructure that stays in Admin\Support.
 *
 * Storage keys and REST argument definitions live in Support\ServiceSchema; the
 * pool write path is Support\ServicePools, the module's one public contract.
 */

namespace CompuZign\Platform\Modules\Service\Http;

use CompuZign\Platform\Modules\Admin\Support\CategoryMeta;
use CompuZign\Platform\Modules\Admin\Support\PoolReferences;
use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\Modules\CostBuilder\Support\MetaSchema;
use CompuZign\Platform\Modules\Service\Support\ServicePools;
use CompuZign\Platform\Modules\Service\Support\ServiceSchema;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;

class ServiceController
{
    private ?PackageRepository $packageRepository = null;

    /**
     * Single Package Station authority (independent option storage). Resolved
     * lazily and only for the settle guard, which is the sole path here that
     * needs to see the station graph.
     */
    private function packages(): PackageRepository
    {
        return $this->packageRepository ??= new PackageRepository();
    }

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        // ===================================================================
        // SECTION: SERVICE_ROUTES
        // ===================================================================
        // ── Station catalog list (admin only) ────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services', [
            'methods'             => 'GET',
            'callback'            => [$this, 'listServices'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::listArgs(),
        ]);

        // ── Create ────────────────────────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createService'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::createArgs(),
        ]);

        // ── Admin detail (drawer open) ────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)', [
            'methods'             => 'GET',
            'callback'            => [$this, 'fetchDetail'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::identity(),
        ]);

        // ── Draft saves ───────────────────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/overview', [
            'methods'             => 'POST',
            'callback'            => [$this, 'updateOverview'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::updateOverviewArgs(),
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/inclusions', [
            'methods'             => 'POST',
            'callback'            => [$this, 'updateInclusions'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::updateInclusionsArgs(),
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/faqs', [
            'methods'             => 'POST',
            'callback'            => [$this, 'updateFaqs'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::updateFaqsArgs(),
        ]);

        // ── Per-module settle (atomic primary) ────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/(?P<module>overview|inclusions|faqs)/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settleModuleRoute'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::moduleIdentity(),
        ]);

        // ── Bulk settle (convenience — calls per-module for each draft) ───────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settleAll'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::identity(),
        ]);

        // ── Per-module revert ─────────────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/(?P<module>overview|inclusions|faqs)/revert', [
            'methods'             => 'POST',
            'callback'            => [$this, 'revertModule'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::moduleIdentity(),
        ]);

        // ── Restore (server-driven — resolves previous_platform_status) ─────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/restore', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restoreService'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::identity(),
        ]);

        // ── Permanent delete (only when platform_status = trashed) ────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)', [
            'methods'             => 'DELETE',
            'callback'            => [$this, 'permanentDeleteService'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::identity(),
        ]);

        // ── Platform status ───────────────────────────────────────────────────
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/status', [
            'methods'             => 'POST',
            'callback'            => [$this, 'updateStatus'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::statusArgs(),
        ]);

        // Phase 2 — P5 Step 2: immediate canonical pool creation. Service owns the
        // pool; Tier only ever stores a reference (id) into it. These write straight
        // to the canonical pool (no draft indirection) so a caller gets a real id back
        // to attach to a tier's module draft in a separate, subsequent save.
        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/inclusion-pool/items', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createInclusionPoolItem'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::identity(),
        ]);

        register_rest_route('compuzign/v1', '/admin/services/(?P<id>\d+)/faq-pool/items', [
            'methods'             => 'POST',
            'callback'            => [$this, 'createFaqPoolItem'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => ServiceSchema::identity(),
        ]);

    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    /**
     * Return station summaries for the catalog table.
     *
     * Default (no platform_status param): excludes archived and trashed — normal catalog view.
     * With platform_status=archived|trashed: returns only stations in that bin — used by the
     * Archived and Trash station views.
     */
    // ===================================================================
    // SECTION: CATALOGUE_HANDLERS
    // ===================================================================
    public function listServices(\WP_REST_Request $request): \WP_REST_Response
    {
        $filterStatus = $request->get_param('platform_status'); // 'archived', 'trashed', or null.

        // Live category terms ordered by name — used for the catalog tab bar and
        // admin pickers. Selector scoping (D7): archived/trashed categories never
        // appear here, but stay rendered on services already assigned to them
        // (the per-service categories below are intentionally unfiltered).
        $terms      = get_terms(['taxonomy' => ServiceSchema::CATEGORY_TAXONOMY, 'hide_empty' => false, 'orderby' => 'name', 'order' => 'ASC']);
        $categories = [];
        foreach (is_array($terms) ? $terms : [] as $t) {
            $categoryStatus = CategoryMeta::status((int) $t->term_id);
            if (!StationLifecycle::isLive($categoryStatus)) {
                continue;
            }
            // Category Group audit (Option B): keep group-role terms out of the
            // Service Catalog's category tab bar/picker — same filter as
            // AdminCategoriesController::listCategories().
            if (CategoryMeta::role((int) $t->term_id) !== CategoryMeta::STATION_ROLE_CATEGORY) {
                continue;
            }
            $categories[] = [
                'id'              => (int) $t->term_id,
                'name'            => html_entity_decode($t->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug'            => $t->slug,
                'description'     => get_term_meta((int) $t->term_id, 'cz_category_description', true) ?: '',
                'platform_status' => $categoryStatus,
            ];
        }

        // All published service posts ordered by title.
        $posts = get_posts([
            'post_type'   => ServiceSchema::POST_TYPE,
            'post_status' => 'publish',
            'numberposts' => -1,
            'orderby'     => 'title',
            'order'       => 'ASC',
        ]);

        $stations = [];

        foreach ($posts as $post) {
            $meta           = get_post_meta($post->ID, ServiceSchema::META_KEY, true);
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

            $postTerms = wp_get_post_terms($post->ID, ServiceSchema::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
            $postCats  = array_map(fn($t) => [
                'id'          => (int) $t->term_id,
                'name'        => html_entity_decode($t->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug'        => $t->slug,
                'description' => get_term_meta((int) $t->term_id, 'cz_category_description', true) ?: '',
            ], $postTerms);

            // Pool sizes for the Package Manager Services table — counts only;
            // the Service-owned pool content itself never leaves the Service.
            $rawInclusions = get_post_meta($post->ID, 'cz_service_inclusions', true);
            $rawFaqs       = get_post_meta($post->ID, 'cz_service_faqs', true);

            $stations[] = [
                'id'                       => $post->ID,
                'title'                    => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug'                     => $post->post_name,
                'categories'               => $postCats,
                'platform_status'          => $platformStatus,
                'previous_platform_status' => $meta['previous_platform_status'] ?? '',
                'module_status'            => $meta['module_status'] ?? ServiceSchema::defaultModuleStatus(),
                'has_drafts'               => $this->hasDraft($post->ID, 'overview')
                                           || $this->hasDraft($post->ID, 'inclusions')
                                           || $this->hasDraft($post->ID, 'faqs'),
                'inclusion_count'          => is_array($rawInclusions['inclusions'] ?? null) ? count($rawInclusions['inclusions']) : 0,
                'faq_count'                => is_array($rawFaqs) ? count($rawFaqs) : 0,
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
            'post_type'   => ServiceSchema::POST_TYPE,
            'post_status' => 'publish',
            'post_title'  => $title,
        ], true);

        if (is_wp_error($id)) {
            return rest_ensure_response(['success' => false, 'message' => $id->get_error_message()]);
        }

        // Categories on the Connector — routing/filtering relationship.
        if (!empty($categoryIds)) {
            wp_set_object_terms($id, $categoryIds, ServiceSchema::CATEGORY_TAXONOMY);
        }

        // Initialize canonical inclusions/faqs as empty placeholders.
        update_post_meta($id, ServiceSchema::META_INCLUSIONS, ['inclusions' => [], 'tier_inclusions' => []]);
        update_post_meta($id, ServiceSchema::META_FAQS, []);

        // overview: pending (draft exists); inclusions/faqs: not-configured (no draft, no active).
        update_post_meta($id, ServiceSchema::META_KEY, [
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
        update_post_meta($id, ServiceSchema::DRAFT_OVERVIEW, $overviewDraft);

        $post = get_post($id);
        $meta = get_post_meta($id, ServiceSchema::META_KEY, true) ?: [];

        // Resolve assigned categories for the step data so the frontend can populate
        // service.categories without a separate fetch. This prevents Discard Draft
        // from losing the category display on new services.
        $assignedTerms = wp_get_post_terms($id, ServiceSchema::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
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
                'module_status'   => $meta['module_status']   ?? ServiceSchema::defaultModuleStatus(),
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

        if (!$post || $post->post_type !== ServiceSchema::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $meta         = get_post_meta($id, ServiceSchema::META_KEY, true);
        $meta         = is_array($meta) ? $meta : [];
        $terms        = wp_get_post_terms($id, ServiceSchema::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
        $categories   = array_map(fn($t) => ['id' => (int) $t->term_id, 'name' => html_entity_decode($t->name, ENT_QUOTES | ENT_HTML5, 'UTF-8'), 'slug' => $t->slug, 'description' => $t->description ?? ''], $terms);
        $rawInc       = get_post_meta($id, ServiceSchema::META_INCLUSIONS, true);
        $inclusions   = is_array($rawInc) ? ($rawInc['inclusions'] ?? []) : [];
        $faqs         = get_post_meta($id, ServiceSchema::META_FAQS, true);
        $faqs         = is_array($faqs) ? $faqs : [];

        $ovDraft  = get_post_meta($id, ServiceSchema::DRAFT_OVERVIEW, true);
        $incDraft = get_post_meta($id, ServiceSchema::DRAFT_INCLUSIONS, true);
        $faqDraft = get_post_meta($id, ServiceSchema::DRAFT_FAQS, true);

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
            'module_status'   => $meta['module_status'] ?? ServiceSchema::defaultModuleStatus(),
            'drafts'          => [
                'overview'   => is_array($ovDraft)  && !empty($ovDraft)  ? $ovDraft  : null,
                'inclusions' => is_array($incDraft) && !empty($incDraft) ? $incDraft : null,
                'faqs'       => is_array($faqDraft) && !empty($faqDraft) ? $faqDraft : null,
            ],
        ]);
    }

    // ===================================================================
    // SECTION: DRAFT_HANDLERS
    // ===================================================================
    public function updateOverview(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== ServiceSchema::POST_TYPE) {
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

        update_post_meta($id, ServiceSchema::DRAFT_OVERVIEW, $draft);
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

        if (!$post || $post->post_type !== ServiceSchema::POST_TYPE) {
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
        update_post_meta($id, ServiceSchema::DRAFT_INCLUSIONS, $normalized);
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

        if (!$post || $post->post_type !== ServiceSchema::POST_TYPE) {
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
        update_post_meta($id, ServiceSchema::DRAFT_FAQS, $normalized);
        $moduleStatus = $this->markModuleDraft($id, 'faqs');

        return rest_ensure_response([
            'success'       => true,
            'faqs'          => $normalized,
            'module_status' => $moduleStatus,
        ]);
    }

    // ===================================================================
    // SECTION: SETTLE_HANDLERS
    // ===================================================================
    public function settleModuleRoute(\WP_REST_Request $request): \WP_REST_Response
    {
        $id     = (int) $request->get_param('id');
        $module = (string) $request->get_param('module');
        $post   = get_post($id);

        if (!$post || $post->post_type !== ServiceSchema::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        // B3 — non-blocking pool-settle guard: compare before the commit replaces
        // the pool, so removed-but-still-referenced items can be reported.
        $poolWarnings = $this->poolSettleWarnings($id, $module);

        $moduleStatus = $this->settleModule($id, $module);

        // Re-fetch settled canonical data for this module.
        $freshPost  = get_post($id);
        $terms      = wp_get_post_terms($id, ServiceSchema::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
        $categories = array_map(fn($t) => ['id' => (int) $t->term_id, 'name' => $t->name, 'slug' => $t->slug], $terms);
        $rawInc     = get_post_meta($id, ServiceSchema::META_INCLUSIONS, true);
        $inclusions = is_array($rawInc) ? ($rawInc['inclusions'] ?? []) : [];
        $faqs       = get_post_meta($id, ServiceSchema::META_FAQS, true);
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

        if (!$post || $post->post_type !== ServiceSchema::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        // B3 — collect pool-settle warnings for every draft-bearing pool module
        // before the commits run (the commit replaces the pool being compared).
        $poolWarnings = [];
        foreach (ServiceSchema::POOL_MODULES as $poolModule) {
            if ($this->hasDraft($id, $poolModule)) {
                $poolWarnings = array_merge($poolWarnings, $this->poolSettleWarnings($id, $poolModule));
            }
        }

        foreach (ServiceSchema::MODULES as $module) {
            if ($this->hasDraft($id, $module)) {
                $this->settleModule($id, $module);
            }
        }

        $freshPost  = get_post($id);
        $meta       = get_post_meta($id, ServiceSchema::META_KEY, true);
        $meta       = is_array($meta) ? $meta : [];
        $terms      = wp_get_post_terms($id, ServiceSchema::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
        $categories = array_map(fn($t) => ['id' => (int) $t->term_id, 'name' => $t->name, 'slug' => $t->slug], $terms);
        $rawInc     = get_post_meta($id, ServiceSchema::META_INCLUSIONS, true);
        $inclusions = is_array($rawInc) ? ($rawInc['inclusions'] ?? []) : [];
        $faqs       = get_post_meta($id, ServiceSchema::META_FAQS, true);
        $faqs       = is_array($faqs) ? $faqs : [];

        $response = [
            'success'       => true,
            'module_status' => $meta['module_status'] ?? ServiceSchema::defaultModuleStatus(),
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

        if (!$post || $post->post_type !== ServiceSchema::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $draftKey = ServiceSchema::draftKey($module);

        if ($draftKey) {
            delete_post_meta($id, $draftKey);
        }

        $meta = get_post_meta($id, ServiceSchema::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];
        if (!isset($meta['module_status']) || !is_array($meta['module_status'])) {
            $meta['module_status'] = ServiceSchema::defaultModuleStatus();
        }

        $meta['module_status'][$module] = match ($module) {
            'overview'   => $this->isOverviewComplete($post)  ? 'settled' : 'not-configured',
            'inclusions' => $this->isInclusionsComplete($id)   ? 'settled' : 'not-configured',
            'faqs'       => $this->isFaqsComplete($id)         ? 'settled' : 'not-configured',
            default      => 'not-configured',
        };

        update_post_meta($id, ServiceSchema::META_KEY, $meta);

        return rest_ensure_response([
            'success'       => true,
            'module'        => $module,
            'module_status' => $meta['module_status'],
        ]);
    }

    // ===================================================================
    // SECTION: LIFECYCLE_HANDLERS
    // ===================================================================
    public function updateStatus(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== ServiceSchema::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $meta = get_post_meta($id, ServiceSchema::META_KEY, true);
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

        update_post_meta($id, ServiceSchema::META_KEY, $meta);
        $meta = get_post_meta($id, ServiceSchema::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];

        return rest_ensure_response([
            'success' => true,
            'service' => [
                'id'              => $id,
                'platform_status' => $meta['platform_status'] ?? 'disabled',
                'module_status'   => $meta['module_status']   ?? ServiceSchema::defaultModuleStatus(),
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

        if (!$post || $post->post_type !== ServiceSchema::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $meta          = get_post_meta($id, ServiceSchema::META_KEY, true);
        $meta          = is_array($meta) ? $meta : [];
        $currentStatus = MetaSchema::resolvePlatformStatus($meta, $post->post_status);

        $change = StationLifecycle::restore($currentStatus);
        if ($change === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service is not in a restorable state.'], 422);
        }

        $meta['platform_status']          = $change['status'];
        $meta['previous_platform_status'] = $change['previous_status'] ?? '';

        update_post_meta($id, ServiceSchema::META_KEY, $meta);
        $meta = get_post_meta($id, ServiceSchema::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];

        return rest_ensure_response([
            'success' => true,
            'service' => [
                'id'              => $id,
                'platform_status' => $meta['platform_status'] ?? 'disabled',
                'module_status'   => $meta['module_status']   ?? ServiceSchema::defaultModuleStatus(),
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

        if (!$post || $post->post_type !== ServiceSchema::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $meta           = get_post_meta($id, ServiceSchema::META_KEY, true);
        $meta           = is_array($meta) ? $meta : [];
        $platformStatus = MetaSchema::resolvePlatformStatus($meta, $post->post_status);

        if (!StationLifecycle::canDelete($platformStatus)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Only trashed services can be permanently deleted.'], 422);
        }

        // Hard delete — removes the wp_posts row and all wp_postmeta rows automatically.
        // The Package Station lives in its own option storage, so deleting a
        // service can no longer destroy commercial data; any manager items
        // sourced from this service degrade to source_missing at read time.
        wp_delete_post($id, true);

        return rest_ensure_response(['success' => true, 'deleted' => $id]);
    }

    // ===================================================================
    // SECTION: POOL_HANDLERS
    // ===================================================================

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
        if (!$post instanceof \WP_Post || $post->post_type !== ServiceSchema::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $body  = $request->get_json_params();
        $label = sanitize_text_field((string) ($body['label'] ?? ''));
        if ($label === '') {
            return new \WP_REST_Response(['success' => false, 'message' => 'Label is required.'], 422);
        }

        $id   = sanitize_title($label);
        $raw  = get_post_meta($serviceId, ServiceSchema::META_INCLUSIONS, true) ?: [];
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

        $added = ServicePools::addInclusions($serviceId, [['label' => $label]]);

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
        if (!$post instanceof \WP_Post || $post->post_type !== ServiceSchema::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $body     = $request->get_json_params();
        $question = sanitize_text_field((string) ($body['question'] ?? ''));
        if ($question === '') {
            return new \WP_REST_Response(['success' => false, 'message' => 'Question is required.'], 422);
        }
        $answer = sanitize_textarea_field((string) ($body['answer'] ?? ''));

        $id   = sanitize_title($question);
        $pool = get_post_meta($serviceId, ServiceSchema::META_FAQS, true);
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

        $addedIds = ServicePools::addFaqs($serviceId, [['question' => $question, 'answer' => $answer]]);

        return rest_ensure_response([
            'success'  => true,
            'existing' => false,
            'faq'      => ['id' => $addedIds[0] ?? $id, 'question' => $question, 'answer' => $answer],
        ]);
    }

    // ===================================================================
    // SECTION: AUTHORIZATION
    // ===================================================================
    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Modules\Admin\AdminRouter::CAP);
    }

    // ===================================================================
    // SECTION: MODULE_HELPERS
    // ===================================================================

    /**
     * Writing a draft always marks the module as 'pending', regardless of platform_status.
     * Handles not-configured → pending transition on first save for inclusions/faqs.
     */
    private function markModuleDraft(int $id, string $module): array
    {
        $meta = get_post_meta($id, ServiceSchema::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];

        if (!isset($meta['module_status']) || !is_array($meta['module_status'])) {
            $meta['module_status'] = ServiceSchema::defaultModuleStatus();
        }

        $meta['module_status'][$module] = 'pending';
        update_post_meta($id, ServiceSchema::META_KEY, $meta);

        return $meta['module_status'];
    }

    /**
     * Promotes one module's draft to canonical Active. Called by both per-module and bulk routes.
     * Returns the updated module_status array.
     */
    private function settleModule(int $id, string $module): array
    {
        $meta = get_post_meta($id, ServiceSchema::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];
        if (!isset($meta['module_status']) || !is_array($meta['module_status'])) {
            $meta['module_status'] = ServiceSchema::defaultModuleStatus();
        }

        switch ($module) {
            case 'overview':
                $draft = get_post_meta($id, ServiceSchema::DRAFT_OVERVIEW, true);
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
                wp_set_object_terms($id, $catIds, ServiceSchema::CATEGORY_TAXONOMY);

                delete_post_meta($id, ServiceSchema::DRAFT_OVERVIEW);

                $freshPost = get_post($id);
                $meta['module_status']['overview'] = $this->isOverviewComplete($freshPost) ? 'settled' : 'not-configured';
                break;

            case 'inclusions':
                $draft = get_post_meta($id, ServiceSchema::DRAFT_INCLUSIONS, true);
                if (!is_array($draft)) break;

                $existing = get_post_meta($id, ServiceSchema::META_INCLUSIONS, true);
                $existing = is_array($existing) ? $existing : [];
                update_post_meta($id, ServiceSchema::META_INCLUSIONS, [
                    'inclusions'      => $draft,
                    'tier_inclusions' => $existing['tier_inclusions'] ?? [],
                ]);

                delete_post_meta($id, ServiceSchema::DRAFT_INCLUSIONS);
                $meta['module_status']['inclusions'] = $this->isInclusionsComplete($id) ? 'settled' : 'not-configured';
                break;

            case 'faqs':
                $draft = get_post_meta($id, ServiceSchema::DRAFT_FAQS, true);
                if (!is_array($draft)) break;

                update_post_meta($id, ServiceSchema::META_FAQS, $draft);
                delete_post_meta($id, ServiceSchema::DRAFT_FAQS);
                $meta['module_status']['faqs'] = $this->isFaqsComplete($id) ? 'settled' : 'not-configured';
                break;
        }

        update_post_meta($id, ServiceSchema::META_KEY, $meta);
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
            $draft = get_post_meta($serviceId, ServiceSchema::DRAFT_INCLUSIONS, true);
            if (!is_array($draft)) {
                return [];
            }
            $existingRaw = get_post_meta($serviceId, ServiceSchema::META_INCLUSIONS, true);
            $existing    = is_array($existingRaw) ? ($existingRaw['inclusions'] ?? []) : [];
            $labelField  = 'label';
        } elseif ($module === 'faqs') {
            $draft = get_post_meta($serviceId, ServiceSchema::DRAFT_FAQS, true);
            if (!is_array($draft)) {
                return [];
            }
            $existing   = get_post_meta($serviceId, ServiceSchema::META_FAQS, true);
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

        $station   = $this->packages()->loadStation() ?? [];
        $instances = $this->packages()->loadPromotions();

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
        $key = ServiceSchema::draftKey($module);
        return $key !== null && !empty(get_post_meta($id, $key, true));
    }

    private function isOverviewComplete(\WP_Post $post): bool
    {
        // Overview completeness = title + category + content. Excerpt is intentionally
        // NOT required — it is not collected in the current Overview workflow, so it must
        // not block module settlement. Aligns with the frontend completeness gate.
        if (trim($post->post_title) === '')   return false;
        if (trim($post->post_content) === '')  return false;
        $terms = wp_get_post_terms($post->ID, ServiceSchema::CATEGORY_TAXONOMY, ['fields' => 'ids']);
        return !empty($terms);
    }

    private function isInclusionsComplete(int $id): bool
    {
        $raw        = get_post_meta($id, ServiceSchema::META_INCLUSIONS, true);
        $inclusions = is_array($raw) ? ($raw['inclusions'] ?? []) : [];
        if (empty($inclusions)) return false;
        foreach ($inclusions as $inc) {
            if (trim((string) ($inc['label'] ?? '')) === '') return false;
        }
        return true;
    }

    private function isFaqsComplete(int $id): bool
    {
        $faqs = get_post_meta($id, ServiceSchema::META_FAQS, true);
        if (!is_array($faqs) || empty($faqs)) return false;
        foreach ($faqs as $faq) {
            if (trim((string) ($faq['question'] ?? '')) === '') return false;
            if (trim((string) ($faq['answer']   ?? '')) === '') return false;
        }
        return true;
    }
}
