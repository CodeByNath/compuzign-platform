<?php

if (!defined('COMPUZIGN_PLUGIN_PATH')) {
    return;
}

if (!defined('COMPUZIGN_COST_BUILDER_PATH')) {
    define('COMPUZIGN_COST_BUILDER_PATH', COMPUZIGN_APP_PATH . 'modules/cost-builder/');
}

if (!defined('COMPUZIGN_COST_BUILDER_URL')) {
    define('COMPUZIGN_COST_BUILDER_URL', COMPUZIGN_PLUGIN_URL . 'app/modules/cost-builder/');
}

$cost_builder_includes = COMPUZIGN_COST_BUILDER_PATH . 'includes/';
$meta_fields_file = $cost_builder_includes . 'meta-fields.php';
$pricing_response_file = $cost_builder_includes . 'pricing-response.php';
$rest_routes_file = $cost_builder_includes . 'rest-routes.php';
$importer_file = $cost_builder_includes . 'importer.php';

if (file_exists($meta_fields_file)) {
    require_once $meta_fields_file;
}

if (file_exists($pricing_response_file)) {
    require_once $pricing_response_file;
}

if (file_exists($rest_routes_file)) {
    require_once $rest_routes_file;
}

if (file_exists($importer_file)) {
    require_once $importer_file;
}

$cost_builder_logic = COMPUZIGN_COST_BUILDER_PATH . 'logic';
if (is_dir($cost_builder_logic)) {
    foreach (glob(trailingslashit($cost_builder_logic) . '*.php') as $logic_file) {
        if (file_exists($logic_file)) {
            require_once $logic_file;
        }
    }
}

function compuzign_cost_builder_shortcode($atts = array(), $content = null) {
    if (wp_style_is('compuzign-cost-builder', 'registered')) {
        wp_enqueue_style('compuzign-cost-builder');
    }

    if (wp_script_is('compuzign-cost-builder', 'registered')) {
        wp_enqueue_script('compuzign-cost-builder');
    }

    ob_start();

    $template = COMPUZIGN_COST_BUILDER_PATH . 'templates/cost-builder.php';
    if (file_exists($template)) {
        include $template;
    } else {
        echo '<div class="compuzign-cost-builder-placeholder">Cost Builder is coming soon.</div>';
    }

    return ob_get_clean();
}
add_shortcode('compuzign_cost_builder', 'compuzign_cost_builder_shortcode');
