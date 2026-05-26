<?php

namespace CompuZign\Platform\Modules\Admin\Http;

class AdminRequestsController
{
    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        register_rest_route('compuzign/v1', '/admin/requests', [
            'methods'             => 'GET',
            'callback'            => [$this, 'listRequests'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        register_rest_route('compuzign/v1', '/admin/requests/(?P<ref>[A-Z0-9\-]+)', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getRequest'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => [
                'ref' => [
                    'type'              => 'string',
                    'required'          => true,
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ]);
    }

    public function listRequests(\WP_REST_Request $request): \WP_REST_Response
    {
        global $wpdb;

        $rows = $wpdb->get_col(
            "SELECT option_name FROM {$wpdb->options}
             WHERE option_name LIKE '_transient_cz_quote_%'
               AND option_name NOT LIKE '_transient_timeout_cz_quote_%'
             ORDER BY option_id DESC
             LIMIT 200"
        );

        $results = [];

        foreach ($rows as $optionName) {
            $transientKey = str_replace('_transient_', '', $optionName);
            $data         = get_transient($transientKey);

            if (!is_array($data)) {
                continue;
            }

            $results[] = $this->summarize($data);
        }

        return rest_ensure_response([
            'success'  => true,
            'requests' => $results,
            'total'    => count($results),
        ]);
    }

    public function getRequest(\WP_REST_Request $request): \WP_REST_Response
    {
        $ref  = $request->get_param('ref');
        $data = get_transient('cz_quote_' . $ref);

        if (!is_array($data)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Request not found.'], 404);
        }

        return rest_ensure_response(['success' => true, 'request' => $data]);
    }

    public function requireAdmin(): bool
    {
        return is_user_logged_in() && current_user_can('manage_options');
    }

    private function summarize(array $data): array
    {
        $items    = $data['items'] ?? [];
        $total    = 0.0;
        $hasPrice = false;

        foreach ($items as $item) {
            if (isset($item['price']) && $item['price'] !== null) {
                $total    += (float) $item['price'];
                $hasPrice  = true;
            }
        }

        return [
            'quote_ref'  => $data['quote_ref'] ?? '',
            'contact'    => $data['contact'] ?? '',
            'company'    => $data['company'] ?? '',
            'email'      => $data['email'] ?? '',
            'phone'      => $data['phone'] ?? '',
            'submitted'  => $data['submitted'] ?? '',
            'item_count' => count($items),
            'total'      => $hasPrice ? round($total, 2) : null,
        ];
    }
}
