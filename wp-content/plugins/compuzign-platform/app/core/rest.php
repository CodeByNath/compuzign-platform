<?php

function compuzign_register_rest_routes() {
    register_rest_route(
        'compuzign/v1',
        '/health',
        array(
            'methods' => 'GET',
            'callback' => 'compuzign_rest_health_check',
            'permission_callback' => '__return_true',
        )
    );
}
add_action('rest_api_init', 'compuzign_register_rest_routes');

function compuzign_rest_health_check(
    WP_REST_Request $request
) {
    return rest_ensure_response(
        array(
            'success' => true,
            'message' => 'CompuZign API is healthy.',
            'version' => COMPUZIGN_PLUGIN_VERSION,
        )
    );
}
