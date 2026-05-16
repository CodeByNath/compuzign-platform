<?php

if (!defined('ABSPATH')) {
    exit;
}

function compuzign_cost_builder_register_rest_routes() {
    error_log('compuzign_cost_builder_register_rest_routes loaded');

    register_rest_route(
        'compuzign/v1',
        '/cost-builder',
        array(
            'methods' => 'GET',
            'callback' => 'compuzign_cost_builder_rest_cost_builder',
            'permission_callback' => '__return_true',
        )
    );
    // Temporary admin-only importer trigger (one-time)
    register_rest_route(
        'compuzign/v1',
        '/cost-builder/import-sample',
        array(
            'methods' => 'POST',
            'callback' => 'compuzign_cost_builder_rest_import_sample',
            'permission_callback' => 'compuzign_cost_builder_import_sample_permission_callback',
        )
    );
}
add_action('rest_api_init', 'compuzign_cost_builder_register_rest_routes');

function compuzign_cost_builder_rest_cost_builder(WP_REST_Request $request) {
    $response = compuzign_cost_builder_get_cost_builder_service_response();

    return rest_ensure_response($response);
}

function compuzign_cost_builder_import_sample_permission_callback() {
    if (!is_user_logged_in()) {
        return false;
    }

    return current_user_can('manage_options');
}

function compuzign_cost_builder_rest_import_sample(WP_REST_Request $request) {
    // Reset any previous one-off flag so the real workbook can be imported now
    delete_option('compuzign_cost_builder_sample_import_run');

    $option = get_option('compuzign_cost_builder_sample_import_run', false);
    if ($option) {
        return rest_ensure_response(array('success' => false, 'message' => 'Import already run.'));
    }

    if (!defined('COMPUZIGN_COST_BUILDER_PATH')) {
        return rest_ensure_response(array('success' => false, 'message' => 'Cost Builder path not defined.'));
    }

    $xlsx = trailingslashit(COMPUZIGN_COST_BUILDER_PATH) . 'CompuZign_Service_Catalog.xlsx';

    if (!file_exists($xlsx) || !is_readable($xlsx)) {
        return rest_ensure_response(array(
            'success' => false,
            'message' => 'Workbook not found or unreadable. Please ensure the file exists at COMPUZIGN_COST_BUILDER_PATH . "CompuZign_Service_Catalog.xlsx"',
            'path' => $xlsx,
        ));
    }

    if (!function_exists('compuzign_cost_builder_import_service_catalog_from_csv')) {
        return rest_ensure_response(array('success' => false, 'message' => 'Importer not available.'));
    }

    $result = compuzign_cost_builder_import_service_catalog_from_csv($xlsx);

    if (is_array($result) && !empty($result['success'])) {
        update_option('compuzign_cost_builder_sample_import_run', true);
    }

    return rest_ensure_response($result);
}
