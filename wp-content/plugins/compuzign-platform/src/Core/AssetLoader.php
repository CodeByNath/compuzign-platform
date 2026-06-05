<?php

namespace CompuZign\Platform\Core;

class AssetLoader
{
    private const MODULE_HANDLES = ['compuzign-homepage', 'compuzign-cost-builder', 'compuzign-admin'];

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
        $this->registerAdminAssets();
        $this->enqueueAdminPageStyles();
    }

    /**
     * Proactively enqueue admin.css on the Command Centre page so it lands in
     * <head> via wp_head(), not late inside a shortcode callback after <head> closes.
     * This covers both the branded login state and the authenticated app state.
     */
    private function enqueueAdminPageStyles(): void
    {
        if (!is_page(\CompuZign\Platform\Modules\Admin\AdminRouter::PAGE_SLUG)) {
            return;
        }
        if (wp_style_is('compuzign-admin', 'registered')) {
            wp_enqueue_style('compuzign-admin');
        }
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
            'costBuilderUrl' => esc_url(apply_filters('compuzign_cost_builder_url', home_url('/pricing/'))),
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
            '08-modals.css', '09-utilities.css',
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
            wp_enqueue_script('compuzign-core', $distUrl . 'js/core.js', ['compuzign-config'], filemtime($distPath . 'js/core.js'), true);
        }

        if (file_exists($distPath . 'css/core.css')) {
            wp_enqueue_style('compuzign-core', $distUrl . 'css/core.css', ['compuzign-atomic-00'], filemtime($distPath . 'css/core.css'));
        }
    }

    private function registerCostBuilderAssets(): void
    {
        $distPath     = COMPUZIGN_DIST_PATH;
        $distUrl      = COMPUZIGN_DIST_URL;
        $fallbackPath = COMPUZIGN_APP_PATH . 'modules/cost-builder/assets/';
        $fallbackUrl  = COMPUZIGN_APP_URL . 'modules/cost-builder/assets/';

        // CSS: enqueued globally so it lands in <head> before shortcodes fire.
        if (file_exists($distPath . 'css/cost-builder.css')) {
            wp_enqueue_style('compuzign-cost-builder', $distUrl . 'css/cost-builder.css', ['compuzign-atomic-09'], filemtime($distPath . 'css/cost-builder.css'));
        } elseif (file_exists($fallbackPath . 'css/cost-builder.css')) {
            wp_enqueue_style('compuzign-cost-builder', $fallbackUrl . 'css/cost-builder.css', ['compuzign-atomic-09'], filemtime($fallbackPath . 'css/cost-builder.css'));
        }

        // JS: register-only; shortcode handler enqueues it after the mount div is in the DOM.
        if (file_exists($distPath . 'js/cost-builder.js')) {
            wp_register_script('compuzign-cost-builder', $distUrl . 'js/cost-builder.js', ['compuzign-config'], filemtime($distPath . 'js/cost-builder.js'), true);
        } elseif (file_exists($fallbackPath . 'js/cost-builder.js')) {
            wp_register_script('compuzign-cost-builder', $fallbackUrl . 'js/cost-builder.js', ['compuzign-config'], filemtime($fallbackPath . 'js/cost-builder.js'), true);
        }
    }

    private function registerHomepageAssets(): void
    {
        $distPath = COMPUZIGN_DIST_PATH;
        $distUrl  = COMPUZIGN_DIST_URL;

        // CSS: enqueued globally so it lands in <head> before shortcodes fire.
        if (file_exists($distPath . 'css/homepage.css')) {
            wp_enqueue_style('compuzign-homepage', $distUrl . 'css/homepage.css', ['compuzign-atomic-09'], filemtime($distPath . 'css/homepage.css'));
        }

        // JS: register-only; shortcode handler enqueues it after the mount div is in the DOM.
        if (file_exists($distPath . 'js/homepage.js')) {
            wp_register_script('compuzign-homepage', $distUrl . 'js/homepage.js', ['compuzign-config'], filemtime($distPath . 'js/homepage.js'), true);
        }
    }

    private function registerAdminAssets(): void
    {
        $distPath = COMPUZIGN_DIST_PATH;
        $distUrl  = COMPUZIGN_DIST_URL;

        // CSS: register-only; admin shortcode enqueues when the page is an admin page.
        if (file_exists($distPath . 'css/admin.css')) {
            wp_register_style('compuzign-admin', $distUrl . 'css/admin.css', [], filemtime($distPath . 'css/admin.css'));
        }

        // JS: register-only; admin shortcode enqueues after mount div is in the DOM.
        if (file_exists($distPath . 'js/admin.js')) {
            wp_register_script('compuzign-admin', $distUrl . 'js/admin.js', ['compuzign-config'], filemtime($distPath . 'js/admin.js'), true);

            // Localize admin runtime config so window.CompuZignAdmin is available
            // on the admin page. Outputs only when compuzign-admin is enqueued
            // (i.e., only on /admin-command-centre via the shortcode).
            // The nonce must be generated here — wp_create_nonce requires a
            // loaded user context, which exists at wp_enqueue_scripts time.
            wp_localize_script('compuzign-admin', 'CompuZignAdmin', [
                'restUrl' => esc_url_raw(rest_url('compuzign/v1/')),
                'nonce'   => wp_create_nonce('wp_rest'),
            ]);
        }
    }
}
