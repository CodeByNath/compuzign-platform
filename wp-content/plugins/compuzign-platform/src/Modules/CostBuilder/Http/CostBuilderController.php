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
}
