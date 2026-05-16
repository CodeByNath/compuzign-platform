<?php

function compuzign_enqueue_assets() {
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

    $cost_builder_css = COMPUZIGN_APP_PATH . 'modules/cost-builder/assets/css/cost-builder.css';
    if (file_exists($cost_builder_css)) {
        wp_register_style(
            'compuzign-cost-builder',
            COMPUZIGN_APP_URL . 'modules/cost-builder/assets/css/cost-builder.css',
            array('compuzign-atomic-00'),
            COMPUZIGN_PLUGIN_VERSION,
            'all'
        );
    }

    $cost_builder_js = COMPUZIGN_APP_PATH . 'modules/cost-builder/assets/js/cost-builder.js';
    if (file_exists($cost_builder_js)) {
        wp_register_script(
            'compuzign-cost-builder',
            COMPUZIGN_APP_URL . 'modules/cost-builder/assets/js/cost-builder.js',
            array('jquery'),
            COMPUZIGN_PLUGIN_VERSION,
            true
        );
    }
}
add_action('wp_enqueue_scripts', 'compuzign_enqueue_assets');
