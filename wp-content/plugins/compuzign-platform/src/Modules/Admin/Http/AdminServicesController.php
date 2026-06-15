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

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
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

    public function createService(\WP_REST_Request $request): \WP_REST_Response
    {
        // Rule 1 + 5: post_status = publish always. platform_status = disabled until admin activates.
        $id = wp_insert_post([
            'post_type'    => self::POST_TYPE,
            'post_status'  => 'publish',
            'post_title'   => $request->get_param('title'),
            'post_excerpt' => (string) ($request->get_param('excerpt') ?? ''),
            'post_content' => (string) ($request->get_param('content') ?? ''),
        ], true);

        if (is_wp_error($id)) {
            return rest_ensure_response(['success' => false, 'message' => $id->get_error_message()]);
        }

        update_post_meta($id, self::META_INCLUSIONS, ['inclusions' => [], 'tier_inclusions' => []]);
        update_post_meta($id, self::META_FAQS, []);
        update_post_meta($id, self::META_KEY, [
            'platform_status' => 'disabled',
            'module_status'   => [
                'overview'   => 'pending',
                'inclusions' => 'pending',
                'faqs'       => 'pending',
            ],
        ]);

        if ($request->has_param('category_ids')) {
            $ids = array_values(array_map('intval', (array) $request->get_param('category_ids')));
            wp_set_object_terms($id, $ids, self::CATEGORY_TAXONOMY);
        }

        $post       = get_post($id);
        $meta       = get_post_meta($id, self::META_KEY, true) ?: [];
        $terms      = wp_get_post_terms($id, self::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
        $categories = array_map(fn($t) => [
            'id'   => (int) $t->term_id,
            'name' => $t->name,
            'slug' => $t->slug,
        ], $terms);

        return rest_ensure_response([
            'success' => true,
            'service' => [
                'id'              => $id,
                'title'           => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug'            => $post->post_name,
                'excerpt'         => $post->post_excerpt,
                'content'         => $post->post_content,
                'categories'      => $categories,
                'platform_status' => $meta['platform_status'] ?? 'disabled',
                'module_status'   => $meta['module_status']   ?? $this->defaultModuleStatus(),
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

        $update = [
            'ID'           => $id,
            'post_title'   => $request->get_param('title')   ?? $post->post_title,
            'post_excerpt' => $request->get_param('excerpt')  ?? $post->post_excerpt,
            'post_content' => $request->get_param('content')  ?? $post->post_content,
        ];

        $result = wp_update_post($update, true);

        if (is_wp_error($result)) {
            return rest_ensure_response([
                'success' => false,
                'message' => $result->get_error_message(),
            ]);
        }

        if ($request->has_param('category_ids')) {
            $ids = array_values(array_map('intval', (array) $request->get_param('category_ids')));
            wp_set_object_terms($id, $ids, self::CATEGORY_TAXONOMY);
        }

        // Rule 7: saving overview on an active entity marks transition as pending.
        $moduleStatus = $this->markModulePending($id, 'overview');

        $post       = get_post($id);
        $terms      = wp_get_post_terms($id, self::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
        $categories = array_map(fn($t) => [
            'id'   => (int) $t->term_id,
            'name' => $t->name,
            'slug' => $t->slug,
        ], $terms);

        return rest_ensure_response([
            'success' => true,
            'service' => [
                'id'            => $id,
                'title'         => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'excerpt'       => $post->post_excerpt,
                'content'       => $post->post_content,
                'categories'    => $categories,
                'module_status' => $moduleStatus,
            ],
        ]);
    }

    public function updateInclusions(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        $raw   = (array) (get_post_meta($id, self::META_INCLUSIONS, true) ?: []);
        $input = (array) ($request->get_param('inclusions') ?: []);

        $seen = [];

        foreach ($input as $item) {
            if (!is_array($item)) {
                continue;
            }
            $itemId = sanitize_text_field((string) ($item['id'] ?? ''));
            $label  = sanitize_text_field((string) ($item['label'] ?? ''));
            if ($label === '') {
                continue;
            }
            if ($itemId === '') {
                $itemId = sanitize_title($label);
            }
            // Deduplicate by id; last write wins.
            $seen[$itemId] = ['id' => $itemId, 'label' => $label];
        }

        $normalized = array_values($seen);

        // Preserve tier_inclusions; replace only the inclusions pool.
        $stored = [
            'inclusions'      => $normalized,
            'tier_inclusions' => isset($raw['tier_inclusions']) && is_array($raw['tier_inclusions'])
                                  ? $raw['tier_inclusions']
                                  : [],
        ];

        update_post_meta($id, self::META_INCLUSIONS, $stored);

        // Rule 7: saving inclusions on an active entity marks transition as pending.
        $moduleStatus = $this->markModulePending($id, 'inclusions');

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

        $seen = [];

        foreach ($input as $item) {
            if (!is_array($item)) {
                continue;
            }
            $question = sanitize_text_field((string) ($item['question'] ?? ''));
            $answer   = sanitize_textarea_field((string) ($item['answer'] ?? ''));
            if ($question === '') {
                continue;
            }
            $faqId = sanitize_text_field((string) ($item['id'] ?? ''));
            if ($faqId === '') {
                $faqId = sanitize_title($question);
            }
            $seen[$faqId] = ['id' => $faqId, 'question' => $question, 'answer' => $answer];
        }

        $normalized = array_values($seen);

        update_post_meta($id, self::META_FAQS, $normalized);

        // Rule 7: saving FAQs on an active entity marks transition as pending.
        $moduleStatus = $this->markModulePending($id, 'faqs');

        return rest_ensure_response([
            'success'       => true,
            'faqs'          => $normalized,
            'module_status' => $moduleStatus,
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

        // Resolve the target platform_status.
        // platform_status param takes priority; fall back to legacy is_active mapping.
        if ($request->has_param('platform_status')) {
            $platformStatus = sanitize_text_field((string) $request->get_param('platform_status'));
            if (!in_array($platformStatus, MetaSchema::ALLOWED_PLATFORM_STATUSES, true)) {
                return new \WP_REST_Response(['success' => false, 'message' => 'Invalid platform_status.'], 422);
            }
        } elseif ($request->has_param('is_active')) {
            // Deprecated path: map boolean is_active to platform_status.
            $platformStatus = $request->get_param('is_active') ? 'active' : 'disabled';
        } else {
            return new \WP_REST_Response(['success' => false, 'message' => 'No status parameter provided.'], 422);
        }

        // Rule 1: never write post_status — CompuZign owns lifecycle via platform_status.
        $meta['platform_status'] = $platformStatus;

        // Rule 6: on activation, settle only complete modules; incomplete stay pending.
        if ($platformStatus === 'active') {
            $meta['module_status'] = $this->resolveModuleStatusOnActivation($id, $post, $meta);
        }
        // For other transitions (disable, archive, trash), module_status is unchanged.

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

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Modules\Admin\AdminRouter::CAP);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Rule 7: if the entity is currently active, mark the given module transition
     * back to 'pending' after a content save. Returns the updated module_status array.
     */
    private function markModulePending(int $id, string $module): array
    {
        $meta = get_post_meta($id, self::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];

        $platformStatus = MetaSchema::resolvePlatformStatus($meta, 'publish');

        if ($platformStatus === 'active') {
            if (!isset($meta['module_status']) || !is_array($meta['module_status'])) {
                $meta['module_status'] = $this->defaultModuleStatus();
            }
            $meta['module_status'][$module] = 'pending';
            update_post_meta($id, self::META_KEY, $meta);
        }

        return $meta['module_status'] ?? $this->defaultModuleStatus();
    }

    /**
     * Rule 6: on activation, settle only complete modules; incomplete stay pending.
     */
    private function resolveModuleStatusOnActivation(int $id, \WP_Post $post, array $meta): array
    {
        $current = is_array($meta['module_status'] ?? null)
                   ? $meta['module_status']
                   : $this->defaultModuleStatus();

        return [
            'overview'   => $this->isOverviewComplete($post)  ? 'settled' : 'pending',
            'inclusions' => $this->isInclusionsComplete($id)   ? 'settled' : 'pending',
            'faqs'       => $this->isFaqsComplete($id)         ? 'settled' : 'pending',
        ];
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
        if (empty($inclusions)) {
            return false;
        }
        foreach ($inclusions as $inc) {
            if (trim((string) ($inc['label'] ?? '')) === '') {
                return false;
            }
        }
        return true;
    }

    private function isFaqsComplete(int $id): bool
    {
        $faqs = get_post_meta($id, self::META_FAQS, true);
        if (!is_array($faqs) || empty($faqs)) {
            return false;
        }
        foreach ($faqs as $faq) {
            if (trim((string) ($faq['question'] ?? '')) === '') return false;
            if (trim((string) ($faq['answer']   ?? '')) === '') return false;
        }
        return true;
    }

    private function defaultModuleStatus(): array
    {
        return ['overview' => 'pending', 'inclusions' => 'pending', 'faqs' => 'pending'];
    }
}
