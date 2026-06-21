<?php

namespace CompuZign\Platform\Modules\Admin\Http;

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
    private const DRAFT_FAQS       = 'cz_service_faqs_draft';

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
            'id'   => (int) $t->term_id,
            'name' => $t->name,
            'slug' => $t->slug,
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
                'id'   => (int) $t->term_id,
                'name' => $t->name,
                'slug' => $t->slug,
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

        $post = get_post($id);
        $meta = get_post_meta($id, self::META_KEY, true) ?: [];

        return rest_ensure_response([
            'success' => true,
            'service' => [
                'id'              => $id,
                'title'           => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug'            => $post->post_name,
                'platform_status' => $meta['platform_status'] ?? 'disabled',
                'module_status'   => $meta['module_status']   ?? $this->defaultModuleStatus(),
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
        $categories   = array_map(fn($t) => ['id' => (int) $t->term_id, 'name' => $t->name, 'slug' => $t->slug], $terms);
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

        $moduleStatus = $this->settleModule($id, $module);

        // Re-fetch settled canonical data for this module.
        $freshPost  = get_post($id);
        $terms      = wp_get_post_terms($id, self::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
        $categories = array_map(fn($t) => ['id' => (int) $t->term_id, 'name' => $t->name, 'slug' => $t->slug], $terms);
        $rawInc     = get_post_meta($id, self::META_INCLUSIONS, true);
        $inclusions = is_array($rawInc) ? ($rawInc['inclusions'] ?? []) : [];
        $faqs       = get_post_meta($id, self::META_FAQS, true);
        $faqs       = is_array($faqs) ? $faqs : [];

        return rest_ensure_response([
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
        ]);
    }

    public function settleAll(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
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

        return rest_ensure_response([
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
        ]);
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

        // When entering a bin state, capture the current normal state for restore.
        // Only write previous_platform_status when leaving active/disabled — not when
        // transitioning between archived/trashed, so the original state is preserved.
        if (in_array($platformStatus, ['archived', 'trashed'], true)) {
            $currentStatus = $meta['platform_status'] ?? 'disabled';
            if (in_array($currentStatus, ['active', 'disabled'], true)) {
                $meta['previous_platform_status'] = $currentStatus;
            }
        }

        // Rule 1: never write post_status — CompuZign owns lifecycle via platform_status.
        $meta['platform_status'] = $platformStatus;

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

        if (!in_array($currentStatus, ['archived', 'trashed'], true)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service is not in a restorable state.'], 422);
        }

        $meta['platform_status']          = 'disabled';
        $meta['previous_platform_status'] = '';

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

        if ($platformStatus !== 'trashed') {
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
        if (trim($post->post_title) === '')   return false;
        if (trim($post->post_excerpt) === '')  return false;
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
