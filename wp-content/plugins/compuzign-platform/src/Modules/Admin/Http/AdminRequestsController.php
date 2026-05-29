<?php

namespace CompuZign\Platform\Modules\Admin\Http;

use CompuZign\Platform\Modules\Requests\Repositories\RequestRepository;
use CompuZign\Platform\Modules\Requests\Support\RequestLifecycle;

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

        // ── Intake Acceptance Bridge ───────────────────────────────────────────
        // POST /admin/requests/{ref}/accept
        // Accepts a transient intake request into persistent Water storage.
        // Idempotent: repeated calls for the same ref return the existing record.
        register_rest_route('compuzign/v1', '/admin/requests/(?P<ref>[A-Z0-9\-]+)/accept', [
            'methods'             => 'POST',
            'callback'            => [$this, 'acceptRequest'],
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

    // ── Intake list ───────────────────────────────────────────────────────────

    /**
     * GET /admin/requests
     *
     * Returns the River intake queue from transients. Additive-only change:
     * each item gains is_accepted (bool) derived from a single Water query.
     * The response envelope and all pre-existing fields are unchanged.
     */
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

        // Load all accepted refs in one query; flip for O(1) lookup.
        $repository   = new RequestRepository();
        $acceptedRefs = array_flip($repository->findAllAcceptedRefs());

        $results = [];

        foreach ($rows as $optionName) {
            $transientKey = str_replace('_transient_', '', $optionName);
            $data         = get_transient($transientKey);

            if (!is_array($data)) {
                continue;
            }

            $summary               = $this->summarize($data);
            $summary['is_accepted'] = isset($acceptedRefs[$summary['quote_ref']]);
            $results[]             = $summary;
        }

        return rest_ensure_response([
            'success'  => true,
            'requests' => $results,
            'total'    => count($results),
        ]);
    }

    // ── Intake detail ─────────────────────────────────────────────────────────

    /**
     * GET /admin/requests/{ref}
     *
     * Returns the raw intake transient payload. Unchanged from Phase 0.
     */
    public function getRequest(\WP_REST_Request $request): \WP_REST_Response
    {
        $ref  = $request->get_param('ref');
        $data = get_transient('cz_quote_' . $ref);

        if (!is_array($data)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Request not found.'], 404);
        }

        return rest_ensure_response(['success' => true, 'request' => $data]);
    }

    // ── Intake Acceptance Bridge ───────────────────────────────────────────────

    /**
     * POST /admin/requests/{ref}/accept
     *
     * Accepts a transient intake request into the Water layer as a managed
     * cz_request post with lifecycle status = new.
     *
     * Idempotency: if the ref already has a Water record, returns the existing
     * record with already_accepted = true. No duplicate is created.
     *
     * The intake transient is NOT modified or deleted — it remains the source
     * of truth for the River layer until it expires naturally.
     */
    public function acceptRequest(\WP_REST_Request $request): \WP_REST_Response
    {
        $ref  = $request->get_param('ref');
        $data = get_transient('cz_quote_' . $ref);

        if (!is_array($data)) {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'Intake request not found or has expired.'],
                404
            );
        }

        $repository = new RequestRepository();
        $existing   = $repository->findByRef($ref);

        // Already accepted — return existing Water record, no mutation.
        if ($existing !== null) {
            return rest_ensure_response([
                'success'          => true,
                'post_id'          => $existing['post_id'],
                'quote_ref'        => $ref,
                'status'           => $existing['status'],
                'accepted_at'      => $existing['accepted_at'],
                'already_accepted' => true,
            ]);
        }

        // Fresh acceptance — create the Water record from the intake payload.
        $postId = $repository->create($data);

        if ($postId === 0) {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'Failed to create managed request.'],
                500
            );
        }

        $record = $repository->findByRef($ref);

        return rest_ensure_response([
            'success'          => true,
            'post_id'          => $postId,
            'quote_ref'        => $ref,
            'status'           => $record['status']      ?? RequestLifecycle::STATUS_NEW,
            'accepted_at'      => $record['accepted_at'] ?? '',
            'already_accepted' => false,
        ]);
    }

    // ── Shared ────────────────────────────────────────────────────────────────

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
            'type'       => $data['type'] ?? 'quote_cart',
            'contact'    => $data['contact'] ?? '',
            'company'    => $data['company'] ?? '',
            'email'      => $data['email'] ?? '',
            'phone'      => $data['phone'] ?? '',
            'category'   => $data['category'] ?? '',
            'submitted'  => $data['submitted'] ?? '',
            'item_count' => count($items),
            'total'      => $hasPrice ? round($total, 2) : null,
        ];
    }
}
