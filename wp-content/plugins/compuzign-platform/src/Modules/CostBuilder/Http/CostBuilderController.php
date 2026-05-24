<?php

namespace CompuZign\Platform\Modules\CostBuilder\Http;

use CompuZign\Platform\Modules\CostBuilder\Services\CatalogImporter;
use CompuZign\Platform\Modules\CostBuilder\Services\PricingBuilder;

class CostBuilderController
{
    public function __construct(
        private PricingBuilder  $builder,
        private CatalogImporter $importer
    ) {}

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        register_rest_route('compuzign/v1', '/cost-builder', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getCostBuilder'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route('compuzign/v1', '/cost-builder/import-catalog', [
            'methods'             => 'POST',
            'callback'            => [$this, 'importCatalog'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        register_rest_route('compuzign/v1', '/cost-builder/import-catalog-dry-run', [
            'methods'             => 'POST',
            'callback'            => [$this, 'importCatalogDryRun'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        register_rest_route('compuzign/v1', '/requests/submit', [
            'methods'             => 'POST',
            'callback'            => [$this, 'submitRequest'],
            'permission_callback' => '__return_true',
        ]);
    }

    public function getCostBuilder(\WP_REST_Request $request): \WP_REST_Response
    {
        return rest_ensure_response($this->builder->buildResponse());
    }

    public function importCatalog(\WP_REST_Request $request): \WP_REST_Response
    {
        delete_option('compuzign_cost_builder_sample_import_run');

        $xlsx = $this->catalogPath();
        if (!$xlsx) {
            return rest_ensure_response([
                'success' => false,
                'message' => 'Workbook not found or unreadable. Ensure the file exists at COMPUZIGN_COST_BUILDER_PATH . "CompuZign_Service_Catalog.xlsx"',
            ]);
        }

        $result = $this->importer->import($xlsx);

        if (!empty($result['success'])) {
            update_option('compuzign_cost_builder_sample_import_run', true);
        }

        return rest_ensure_response($result);
    }

    public function importCatalogDryRun(\WP_REST_Request $request): \WP_REST_Response
    {
        $xlsx = $this->catalogPath();
        if (!$xlsx) {
            return rest_ensure_response([
                'success' => false,
                'message' => 'Workbook not found or unreadable.',
            ]);
        }

        return rest_ensure_response($this->importer->dryRun($xlsx));
    }

    public function submitRequest(\WP_REST_Request $request): \WP_REST_Response
    {
        // ── Type guard ──────────────────────────────────────────────────────
        $type = sanitize_text_field((string) $request->get_param('type'));
        if ($type !== 'quote_cart') {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'Invalid request type.'],
                400
            );
        }

        // ── Sanitise inputs ──────────────────────────────────────────────────
        $contact  = sanitize_text_field((string) ($request->get_param('contact') ?? ''));
        $email    = sanitize_email((string) ($request->get_param('email') ?? ''));
        $company  = sanitize_text_field((string) ($request->get_param('company') ?? ''));
        $phone    = sanitize_text_field((string) ($request->get_param('phone') ?? ''));
        $notes    = sanitize_textarea_field((string) ($request->get_param('notes') ?? ''));
        $quoteRef = sanitize_text_field((string) ($request->get_param('quote_ref') ?? ''));
        $rawItems = $request->get_param('items');

        // ── Required-field validation ────────────────────────────────────────
        if ($contact === '') {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'Contact name is required.'],
                422
            );
        }

        if ($email === '' || !is_email($email)) {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'A valid email address is required.'],
                422
            );
        }

        if (empty($rawItems) || !is_array($rawItems)) {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'At least one service item is required.'],
                422
            );
        }

        // ── Accept client-generated ref if well-formed, otherwise mint one ───
        if (!preg_match('/^CZ-[A-Z0-9]{6}$/', $quoteRef)) {
            $quoteRef = 'CZ-' . strtoupper(substr(md5(uniqid('cz', true)), 0, 6));
        }

        // ── Sanitise items array ─────────────────────────────────────────────
        $items = [];
        foreach ($rawItems as $raw) {
            if (!is_array($raw)) {
                continue;
            }
            $price = null;
            if (isset($raw['price']) && $raw['price'] !== null) {
                $price = floatval($raw['price']);
            }
            $features = [];
            if (isset($raw['features']) && is_array($raw['features'])) {
                $features = array_values(array_map('sanitize_text_field', $raw['features']));
            }
            $items[] = [
                'serviceId'    => intval($raw['serviceId'] ?? 0),
                'serviceTitle' => sanitize_text_field((string) ($raw['serviceTitle'] ?? '')),
                'categoryName' => sanitize_text_field((string) ($raw['categoryName'] ?? '')),
                'tierTitle'    => sanitize_text_field((string) ($raw['tierTitle'] ?? '')),
                'tierId'       => sanitize_text_field((string) ($raw['tierId'] ?? '')),
                'price'        => $price,
                'billingCycle' => sanitize_text_field((string) ($raw['billingCycle'] ?? '')),
                'features'     => $features,
            ];
        }

        // ── Persist to transient (7 days) ────────────────────────────────────
        $payload = [
            'type'      => 'quote_cart',
            'quote_ref' => $quoteRef,
            'contact'   => $contact,
            'company'   => $company,
            'email'     => $email,
            'phone'     => $phone,
            'notes'     => $notes,
            'items'     => $items,
            'submitted' => current_time('mysql'),
        ];
        set_transient('cz_quote_' . $quoteRef, $payload, 7 * DAY_IN_SECONDS);

        // ── Email notifications ──────────────────────────────────────────────
        $adminEmail = (string) get_option('admin_email');
        $siteTitle  = (string) get_bloginfo('name');
        $headers    = ['Content-Type: text/plain; charset=UTF-8'];

        wp_mail(
            $adminEmail,
            "[{$siteTitle}] New Quote Request — {$quoteRef}",
            $this->buildAdminEmailBody($payload),
            $headers
        );

        wp_mail(
            $email,
            "Your quote request has been received — {$quoteRef}",
            $this->buildCustomerEmailBody($payload, $siteTitle),
            $headers
        );

        return new \WP_REST_Response([
            'success'  => true,
            'quote_id' => $quoteRef,
            'message'  => 'Your quote request has been received. We will be in touch within one business day.',
        ], 200);
    }

    public function requireAdmin(): bool
    {
        return is_user_logged_in() && current_user_can('manage_options');
    }

    private function catalogPath(): ?string
    {
        if (!defined('COMPUZIGN_COST_BUILDER_PATH')) {
            return null;
        }

        $path = trailingslashit(COMPUZIGN_COST_BUILDER_PATH) . 'CompuZign_Service_Catalog.xlsx';

        return (file_exists($path) && is_readable($path)) ? $path : null;
    }

    /** @param array<string, mixed> $data */
    private function buildAdminEmailBody(array $data): string
    {
        $lines = [
            'New quote request received via the Cost Builder.',
            '',
            "Reference : {$data['quote_ref']}",
            "Submitted : {$data['submitted']}",
            '',
            '── Contact ──────────────────────────',
            "Name    : {$data['contact']}",
            "Company : {$data['company']}",
            "Email   : {$data['email']}",
            "Phone   : {$data['phone']}",
        ];

        if ($data['notes'] !== '') {
            $lines[] = '';
            $lines[] = "Notes: {$data['notes']}";
        }

        $lines[] = '';
        $lines[] = '── Services ─────────────────────────';

        foreach ($data['items'] as $item) {
            $price   = $item['price'] !== null
                ? '$' . number_format((float) $item['price'], 2)
                : 'Custom pricing';
            $cycle   = $item['billingCycle'] !== '' ? " / {$item['billingCycle']}" : '';
            $lines[] = "• {$item['serviceTitle']} ({$item['tierTitle']}) — {$price}{$cycle}";
        }

        return implode("\n", $lines);
    }

    /** @param array<string, mixed> $data */
    private function buildCustomerEmailBody(array $data, string $siteTitle): string
    {
        $lines = [
            "Hi {$data['contact']},",
            '',
            "Thank you for your quote request. We've received it and will be in touch within one business day.",
            '',
            '── Your Quote Summary ───────────────',
            "Reference: {$data['quote_ref']}",
            '',
        ];

        foreach ($data['items'] as $item) {
            $price   = $item['price'] !== null
                ? '$' . number_format((float) $item['price'], 2)
                : 'Custom pricing';
            $cycle   = $item['billingCycle'] !== '' ? " / {$item['billingCycle']}" : '';
            $lines[] = "• {$item['serviceTitle']} ({$item['tierTitle']}) — {$price}{$cycle}";
        }

        $lines[] = '';
        $lines[] = 'If you have any questions in the meantime, feel free to reply to this email.';
        $lines[] = '';
        $lines[] = "The {$siteTitle} Team";

        return implode("\n", $lines);
    }
}
