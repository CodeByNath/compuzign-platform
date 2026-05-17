<?php

namespace CompuZign\Platform\Modules\CostBuilder\Services;

class CatalogImporter
{
    public function import(string $xlsxPath): array
    {
        if (function_exists('compuzign_cost_builder_import_service_catalog_from_csv')) {
            return compuzign_cost_builder_import_service_catalog_from_csv($xlsxPath);
        }

        return ['success' => false, 'message' => 'Importer not available.'];
    }

    public function dryRun(string $xlsxPath): array
    {
        if (function_exists('compuzign_cost_builder_import_service_catalog_dry_run')) {
            return compuzign_cost_builder_import_service_catalog_dry_run($xlsxPath);
        }

        return ['success' => false, 'message' => 'Dry-run importer not available.'];
    }
}
