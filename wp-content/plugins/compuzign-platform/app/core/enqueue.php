<?php

function compuzign_enqueue_assets() {
    // IBM Plex Sans — primary platform typeface via Google Fonts
    wp_enqueue_style(
        'compuzign-ibm-plex-sans',
        'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap',
        array(),
        null,
        'all'
    );

    $base_url = COMPUZIGN_ATOMIC_ENGINE_URL . 'css/';
    $styles = array(
        '00-tokens.css',
        '01-reset.css',
        '02-base.css',
        '03-layout.css',
        '04-buttons.css',
        '05-cards.css',
        '06-forms.css',
        '07-tabs.css',
        '08-modals.css',
        '09-utilities.css',
        'atomic-engine.css',
    );

    foreach ($styles as $index => $file_name) {
        $handle = 'compuzign-atomic-' . str_pad((string) $index, 2, '0', STR_PAD_LEFT);
        wp_enqueue_style(
            $handle,
            $base_url . $file_name,
            array(),
            COMPUZIGN_PLUGIN_VERSION,
            'all'
        );
    }

    $dist_url = COMPUZIGN_PLUGIN_URL . 'dist/';
    $dist_path = COMPUZIGN_PLUGIN_PATH . 'dist/';

    $core_js = $dist_path . 'js/core.js';
    $core_css = $dist_path . 'css/core.css';
    if (file_exists($core_js)) {
        wp_enqueue_script(
            'compuzign-core',
            $dist_url . 'js/core.js',
            array(),
            COMPUZIGN_PLUGIN_VERSION,
            true
        );
    }
    if (file_exists($core_css)) {
        wp_enqueue_style(
            'compuzign-core',
            $dist_url . 'css/core.css',
            array('compuzign-atomic-00'),
            COMPUZIGN_PLUGIN_VERSION,
            'all'
        );
    }

    $cost_builder_js_dist = $dist_path . 'js/cost-builder.js';
    $cost_builder_css_dist = $dist_path . 'css/cost-builder.css';
    $cost_builder_js_fallback = COMPUZIGN_APP_PATH . 'modules/cost-builder/assets/js/cost-builder.js';
    $cost_builder_css_fallback = COMPUZIGN_APP_PATH . 'modules/cost-builder/assets/css/cost-builder.css';

    if (file_exists($cost_builder_css_dist)) {
        wp_register_style(
            'compuzign-cost-builder',
            $dist_url . 'css/cost-builder.css',
            array('compuzign-atomic-00'),
            COMPUZIGN_PLUGIN_VERSION,
            'all'
        );
    } elseif (file_exists($cost_builder_css_fallback)) {
        wp_register_style(
            'compuzign-cost-builder',
            COMPUZIGN_APP_URL . 'modules/cost-builder/assets/css/cost-builder.css',
            array('compuzign-atomic-00'),
            COMPUZIGN_PLUGIN_VERSION,
            'all'
        );
    }

    if (file_exists($cost_builder_js_dist)) {
        wp_register_script(
            'compuzign-cost-builder',
            $dist_url . 'js/cost-builder.js',
            array(),
            COMPUZIGN_PLUGIN_VERSION,
            true
        );
    } elseif (file_exists($cost_builder_js_fallback)) {
        wp_register_script(
            'compuzign-cost-builder',
            COMPUZIGN_APP_URL . 'modules/cost-builder/assets/js/cost-builder.js',
            array(),
            COMPUZIGN_PLUGIN_VERSION,
            true
        );
    }
}
add_action('wp_enqueue_scripts', 'compuzign_enqueue_assets');
