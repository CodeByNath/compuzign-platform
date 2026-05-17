<?php

namespace CompuZign\Platform\Core;

class AssetLoader
{
    private const MODULE_HANDLES = ['compuzign-homepage', 'compuzign-cost-builder'];

    public function register(): void
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue']);
        add_filter('script_loader_tag', [$this, 'setModuleType'], 10, 2);
    }

    public function enqueue(): void
    {
        $this->enqueueAtomicStyles();
        $this->outputRuntimeConfig();
        $this->enqueueDistAssets();
        $this->registerCostBuilderAssets();
        $this->registerHomepageAssets();
    }

    /**
     * Outputs window.CompuZignConfig unconditionally via a no-src script handle.
     * Decoupled from any dist file existing — the config is always on the page.
     */
    private function outputRuntimeConfig(): void
    {
        wp_register_script('compuzign-config', false, [], null, true);
        wp_enqueue_script('compuzign-config');

        $config = wp_json_encode([
            'apiRoot'        => esc_url_raw(rest_url('compuzign/v1/')),
            'nonce'          => wp_create_nonce('wp_rest'),
            'contactUrl'     => esc_url(apply_filters('compuzign_contact_url', home_url('/contact/'))),
            'costBuilderUrl' => esc_url(apply_filters('compuzign_cost_builder_url', home_url('/services/'))),
        ]);

        wp_add_inline_script('compuzign-config', 'window.CompuZignConfig = ' . $config . ';');
    }

    public function setModuleType(string $tag, string $handle): string
    {
        if (in_array($handle, self::MODULE_HANDLES, true)) {
            return str_replace('<script ', '<script type="module" ', $tag);
        }
        return $tag;
    }

    private function enqueueAtomicStyles(): void
    {
        $base = COMPUZIGN_ATOMIC_ENGINE_URL . 'css/';
        $files = [
            '00-tokens.css', '01-reset.css', '02-base.css', '03-layout.css',
            '04-buttons.css', '05-cards.css', '06-forms.css', '07-tabs.css',
            '08-modals.css', '09-utilities.css', 'atomic-engine.css',
        ];

        foreach ($files as $i => $file) {
            wp_enqueue_style(
                'compuzign-atomic-' . str_pad((string) $i, 2, '0', STR_PAD_LEFT),
                $base . $file,
                [],
                COMPUZIGN_PLUGIN_VERSION
            );
        }
    }

    private function enqueueDistAssets(): void
    {
        $distPath = COMPUZIGN_DIST_PATH;
        $distUrl  = COMPUZIGN_DIST_URL;

        if (file_exists($distPath . 'js/core.js')) {
            wp_enqueue_script('compuzign-core', $distUrl . 'js/core.js', ['compuzign-config'], COMPUZIGN_PLUGIN_VERSION, true);
        }

        if (file_exists($distPath . 'css/core.css')) {
            wp_enqueue_style('compuzign-core', $distUrl . 'css/core.css', ['compuzign-atomic-00'], COMPUZIGN_PLUGIN_VERSION);
        }
    }

    private function registerCostBuilderAssets(): void
    {
        $distPath     = COMPUZIGN_DIST_PATH;
        $distUrl      = COMPUZIGN_DIST_URL;
        $fallbackPath = COMPUZIGN_APP_PATH . 'modules/cost-builder/assets/';
        $fallbackUrl  = COMPUZIGN_APP_URL . 'modules/cost-builder/assets/';

        if (file_exists($distPath . 'css/cost-builder.css')) {
            wp_register_style('compuzign-cost-builder', $distUrl . 'css/cost-builder.css', ['compuzign-atomic-00'], COMPUZIGN_PLUGIN_VERSION);
        } elseif (file_exists($fallbackPath . 'css/cost-builder.css')) {
            wp_register_style('compuzign-cost-builder', $fallbackUrl . 'css/cost-builder.css', ['compuzign-atomic-00'], COMPUZIGN_PLUGIN_VERSION);
        }

        if (file_exists($distPath . 'js/cost-builder.js')) {
            wp_register_script('compuzign-cost-builder', $distUrl . 'js/cost-builder.js', ['compuzign-config'], COMPUZIGN_PLUGIN_VERSION, true);
        } elseif (file_exists($fallbackPath . 'js/cost-builder.js')) {
            wp_register_script('compuzign-cost-builder', $fallbackUrl . 'js/cost-builder.js', ['compuzign-config'], COMPUZIGN_PLUGIN_VERSION, true);
        }
    }

    private function registerHomepageAssets(): void
    {
        $distPath = COMPUZIGN_DIST_PATH;
        $distUrl  = COMPUZIGN_DIST_URL;

        if (file_exists($distPath . 'css/homepage.css')) {
            wp_register_style('compuzign-homepage', $distUrl . 'css/homepage.css', ['compuzign-atomic-00'], COMPUZIGN_PLUGIN_VERSION);
        }

        if (file_exists($distPath . 'js/homepage.js')) {
            wp_register_script('compuzign-homepage', $distUrl . 'js/homepage.js', ['compuzign-config'], COMPUZIGN_PLUGIN_VERSION, true);
        }
    }
}
