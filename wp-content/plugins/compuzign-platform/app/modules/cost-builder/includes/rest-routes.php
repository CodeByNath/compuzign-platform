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
}
add_action('rest_api_init', 'compuzign_cost_builder_register_rest_routes');

function compuzign_cost_builder_rest_cost_builder(WP_REST_Request $request) {
    return rest_ensure_response(
        array(
            'success' => true,
            'message' => 'CompuZign Cost Builder route is available.',
        )
    );
}
