<?php

namespace CompuZign\Platform\Modules\Admin\Http;

class AdminServicesController
{
    private const POST_TYPE         = 'cz_service';
    private const CATEGORY_TAXONOMY = 'cz_service_category';
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
                'id'          => ['required' => true,  'type' => 'integer'],
                'is_active'   => ['required' => false, 'type' => 'boolean'],
                'post_status' => ['required' => false, 'type' => 'string',
                                  'enum' => ['publish', 'draft']],
            ],
        ]);
    }

    public function createService(\WP_REST_Request $request): \WP_REST_Response
    {
        $id = wp_insert_post([
            'post_type'    => self::POST_TYPE,
            'post_status'  => 'draft',
            'post_title'   => $request->get_param('title'),
            'post_excerpt' => (string) ($request->get_param('excerpt') ?? ''),
            'post_content' => (string) ($request->get_param('content') ?? ''),
        ], true);

        if (is_wp_error($id)) {
            return rest_ensure_response(['success' => false, 'message' => $id->get_error_message()]);
        }

        update_post_meta($id, self::META_INCLUSIONS, ['inclusions' => [], 'tier_inclusions' => []]);
        update_post_meta($id, self::META_FAQS, []);
        update_post_meta($id, 'cz_service_meta', ['is_active' => true]);

        if ($request->has_param('category_ids')) {
            $ids = array_values(array_map('intval', (array) $request->get_param('category_ids')));
            wp_set_object_terms($id, $ids, self::CATEGORY_TAXONOMY);
        }

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
                'id'         => $id,
                'title'      => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'slug'       => $post->post_name,
                'excerpt'    => $post->post_excerpt,
                'content'    => $post->post_content,
                'categories' => $categories,
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
                'id'         => $id,
                'title'      => html_entity_decode($post->post_title, ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                'excerpt'    => $post->post_excerpt,
                'content'    => $post->post_content,
                'categories' => $categories,
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

        $normalized = [];
        $seen       = [];

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

        return rest_ensure_response([
            'success'    => true,
            'inclusions' => $normalized,
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

        $normalized = [];
        $seen       = [];

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

        return rest_ensure_response([
            'success' => true,
            'faqs'    => $normalized,
        ]);
    }

    public function updateStatus(\WP_REST_Request $request): \WP_REST_Response
    {
        $id   = (int) $request->get_param('id');
        $post = get_post($id);

        if (!$post || $post->post_type !== self::POST_TYPE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Service not found.'], 404);
        }

        if ($request->has_param('post_status')) {
            $newStatus = sanitize_text_field((string) $request->get_param('post_status'));
            wp_update_post(['ID' => $id, 'post_status' => $newStatus]);
        }

        if ($request->has_param('is_active')) {
            $meta = get_post_meta($id, 'cz_service_meta', true);
            $meta = is_array($meta) ? $meta : [];
            $meta['is_active'] = (bool) $request->get_param('is_active');
            update_post_meta($id, 'cz_service_meta', $meta);
        }

        $post     = get_post($id);
        $meta     = get_post_meta($id, 'cz_service_meta', true);
        $isActive = is_array($meta) ? (bool) ($meta['is_active'] ?? true) : true;

        return rest_ensure_response([
            'success' => true,
            'service' => [
                'id'          => $id,
                'post_status' => $post->post_status,
                'is_active'   => $isActive,
            ],
        ]);
    }

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Modules\Admin\AdminRouter::CAP);
    }
}
