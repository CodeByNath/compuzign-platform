<?php
/**
 * Temporary one-off importer runner.
 * - Admin-only
 * - Imports sample-cost-builder-services.csv once
 * - Prevents repeat runs via option: compuzign_cost_builder_sample_import_run
 * - Outputs the importer result as JSON
 */

// Bootstrap WP if needed
if (!defined('ABSPATH')) {
    $wp_load = dirname(__FILE__, 7) . '/wp-load.php';
    if (file_exists($wp_load)) {
        require_once $wp_load;
    } else {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(array('success' => false, 'message' => 'Unable to locate wp-load.php'));
        exit;
    }
}

// Require plugin bootstrap to ensure functions/constants available
if (!defined('COMPUZIGN_PLUGIN_PATH')) {
    $plugin_file = ABSPATH . 'wp-content/plugins/compuzign-platform/compuzign-platform.php';
    if (file_exists($plugin_file)) {
        require_once $plugin_file;
    }
}

// Admin-only
if (!is_user_logged_in() || !current_user_can('manage_options')) {
    status_header(403);
    echo json_encode(array('success' => false, 'message' => 'Forbidden: admin only.'));
    exit;
}

$option = get_option('compuzign_cost_builder_sample_import_run', false);
if ($option) {
    header('Content-Type: application/json');
    echo json_encode(array('success' => false, 'message' => 'Import already run.')); 
    exit;
}

$csv = '';
if (defined('COMPUZIGN_COST_BUILDER_PATH')) {
    $csv = COMPUZIGN_COST_BUILDER_PATH . 'sample-cost-builder-services.csv';
} else {
    $csv = __DIR__ . '/sample-cost-builder-services.csv';
}

$result = array('success' => false, 'message' => 'Importer not available.');

if (function_exists('compuzign_cost_builder_import_service_catalog_from_csv')) {
    $result = compuzign_cost_builder_import_service_catalog_from_csv($csv);
} else {
    // Try to include importer directly as a fallback
    $importer = __DIR__ . '/includes/importer.php';
    if (file_exists($importer)) {
        require_once $importer;
        if (function_exists('compuzign_cost_builder_import_service_catalog_from_csv')) {
            $result = compuzign_cost_builder_import_service_catalog_from_csv($csv);
        }
    }
}

// If importer succeeded, set option to prevent rerun
if (is_array($result) && !empty($result['success'])) {
    update_option('compuzign_cost_builder_sample_import_run', true);
}

header('Content-Type: application/json');
echo wp_json_encode($result);
exit;
