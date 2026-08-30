<?php

namespace CompuZign\Platform\Modules\Admin\Http;

use CompuZign\Platform\Modules\Requests\Repositories\RequestRepository;

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

    // ── CRM-1B: durable list/detail ──────────────────────────────────────────
    //
    // CRM-1A made every validated submission durable and identified
    // immediately, so the 7-day cz_quote_* transient is no longer the CRM
    // queue authority — RequestRepository is. Both routes below read it
    // exclusively; neither scans or reads a quote transient. Every projection
    // is an explicit allow-list, so a field neither route names (in
    // particular, view_secret_hash — transient-only security plumbing, never
    // written to durable data by CRM-1A, but never trusted here either) can
    // never reach the response.

    /** GET /admin/requests — durable Requests, newest first. */
    public function listRequests(\WP_REST_Request $request): \WP_REST_Response
    {
        $repository = new RequestRepository();
        $records    = $repository->findAll();

        return rest_ensure_response([
            'success'  => true,
            'requests' => array_map([$this, 'summarize'], $records),
            'total'    => count($records),
        ]);
    }

    /** GET /admin/requests/{ref} — one durable Request's CRM identity/status plus its immutable submitted snapshot. */
    public function getRequest(\WP_REST_Request $request): \WP_REST_Response
    {
        $ref        = (string) $request->get_param('ref');
        $repository = new RequestRepository();
        $record     = $repository->findByRef($ref);

        if ($record === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Request not found.'], 404);
        }

        return rest_ensure_response(['success' => true, 'request' => $this->detail($record)]);
    }

    // ── Shared ────────────────────────────────────────────────────────────────

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Core\PlatformAccess::CAP);
    }

    /**
     * The list row projection — native/customer reference, CZR, lifecycle
     * status, request type, submitted timestamp, contact/company/email, and
     * a concise item count/value summary. Explicit allow-list; the stored
     * snapshot's own keys are never spread wholesale into the response.
     *
     * @param  array{quote_ref: string, platform_id: string, status: string, data: array<string, mixed>} $record
     * @return array<string, mixed>
     */
    private function summarize(array $record): array
    {
        $data     = $record['data'];
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
            'quote_ref'   => $record['quote_ref'],
            'platform_id' => $record['platform_id'],
            'status'      => $record['status'],
            'type'        => $data['type'] ?? 'quote_cart',
            'contact'     => $data['contact'] ?? '',
            'company'     => $data['company'] ?? '',
            'email'       => $data['email'] ?? '',
            'submitted'   => $data['submitted'] ?? '',
            // Derived display-only flag for the Requests summary cards' "New
            // Today" count — site-local day-prefix match against `submitted`
            // (itself stamped by a bare current_time('mysql'), see
            // RequestSchema::validate()), never persisted, never a filter.
            'is_today'    => substr((string) ($data['submitted'] ?? ''), 0, 10) === current_time('Y-m-d'),
            'item_count'  => count($items),
            'total'       => $hasPrice ? round($total, 2) : null,
        ];
    }

    /**
     * The detail projection — CRM identity/status plus the immutable
     * submitted snapshot's customer-facing fields. Explicit allow-list, same
     * discipline as summarize(): a stored key not named here (view_secret_hash
     * included) never reaches this response even if it were ever present.
     *
     * @param  array{quote_ref: string, platform_id: string, status: string, data: array<string, mixed>} $record
     * @return array<string, mixed>
     */
    private function detail(array $record): array
    {
        $data = $record['data'];

        return [
            'quote_ref'   => $record['quote_ref'],
            'platform_id' => $record['platform_id'],
            'status'      => $record['status'],
            'type'        => $data['type'] ?? 'quote_cart',
            'contact'     => $data['contact'] ?? '',
            'company'     => $data['company'] ?? '',
            'email'       => $data['email'] ?? '',
            'phone'       => $data['phone'] ?? '',
            'notes'       => $data['notes'] ?? '',
            'category'    => $data['category'] ?? '',
            'items'       => $data['items'] ?? [],
            'submitted'   => $data['submitted'] ?? '',
        ];
    }
}
