<?php

namespace CompuZign\Platform\Core;

use CompuZign\Platform\Modules\AdminStation\AdminStationModule;

class AssetLoader
{
    private const MODULE_HANDLES = ['compuzign-homepage', 'compuzign-cost-builder', 'compuzign-admin-station'];

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
        $this->registerDrawerKitStyles();
        $this->registerAdminStationAssets();
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
            'apiRoot'         => esc_url_raw(rest_url('compuzign/v1/')),
            'nonce'           => wp_create_nonce('wp_rest'),
            'contactUrl'      => esc_url(apply_filters('compuzign_contact_url', home_url('/contact/'))),
            'costBuilderUrl'  => esc_url(apply_filters('compuzign_cost_builder_url', home_url('/pricing/'))),
            // CRM-1C: lets Admin Station's Request print load the exact
            // customer stylesheets (atomic-engine tokens + cost-builder.css)
            // inside an isolated print window only — never as global Admin
            // Station styles. Same base URLs this class already uses below.
            'distUrl'         => esc_url_raw(COMPUZIGN_DIST_URL),
            'atomicEngineUrl' => esc_url_raw(COMPUZIGN_ATOMIC_ENGINE_URL),
            // Admin Station header's User menu Log out action — see
            // adminStationLogoutUrl() below for why it is decoded first.
            'logoutUrl'       => $this->adminStationLogoutUrl(),
        ]);

        wp_add_inline_script('compuzign-config', 'window.CompuZignConfig = ' . $config . ';');
    }

    /**
     * The nonce-protected WordPress logout URL, decoded for JSON/JS use.
     *
     * wp_logout_url() delegates to wp_nonce_url(), which returns an HTML-
     * ENCODED URL (it applies esc_html(), so every `&` becomes `&amp;`).
     * That is correct for an HTML href written into markup, but this value is
     * serialized into window.CompuZignConfig and later assigned as a DOM href
     * from JavaScript, where nothing ever decodes it. The literal `&amp;` then
     * renames every query parameter after the first — `amp;_wpnonce`,
     * `amp;redirect_to` — so WordPress sees no nonce (it falls back to its own
     * "Do you really want to log out?" confirmation screen) and no redirect
     * (it lands on wp-login.php instead of this Station). Live-confirmed on
     * 2026-09-15, with the browser URL showing the literal `&amp;`.
     *
     * wp_specialchars_decode(..., ENT_QUOTES) is the exact inverse of the
     * esc_html() WordPress applied. The URL and its nonce still come from
     * wp_logout_url() alone — neither is ever hand-built here.
     */
    private function adminStationLogoutUrl(): string
    {
        return esc_url_raw(wp_specialchars_decode(wp_logout_url($this->adminStationDestination()), ENT_QUOTES));
    }

    /**
     * The canonical permalink of the page currently rendering the Admin
     * Station shortcode, or the site's front page when the current request
     * isn't that page. Never a hardcoded slug, and never derived from the raw
     * request path — the same source-grounded predicate
     * AdminStationAuth::isAdminStationRequest() already uses for the
     * post-login redirect, so this stays correct if that page's slug changes.
     * The front-page fallback means logout never lands on WordPress admin.
     */
    private function adminStationDestination(): string
    {
        if (is_singular()) {
            $post = get_post();
            if ($post instanceof \WP_Post && has_shortcode((string) $post->post_content, AdminStationModule::SHORTCODE)) {
                $permalink = get_permalink($post);
                if ($permalink !== false) {
                    return $permalink;
                }
            }
        }
        return home_url('/');
    }

    public function setModuleType(string $tag, string $handle): string
    {
        if (in_array($handle, self::MODULE_HANDLES, true)) {
            return str_replace('<script ', '<script type="module" ', $tag);
        }
        return $tag;
    }

    /**
     * The shared entity-drawer stylesheet.
     *
     * Holds the host-neutral entity-drawer rules mounted by the Admin Station's
     * entity compositions. Registered once here and declared as a DEPENDENCY of
     * the Admin Station stylesheet, which loads it exactly once and always
     * before it — so the page's own sheet keeps the last word.
     *
     * Registered before its caller so the handle exists when it names it.
     */
    private function registerDrawerKitStyles(): void
    {
        $distPath = COMPUZIGN_DIST_PATH;
        $distUrl  = COMPUZIGN_DIST_URL;

        if (file_exists($distPath . 'css/drawer-kit.css')) {
            wp_register_style('compuzign-drawer-kit', $distUrl . 'css/drawer-kit.css', [], filemtime($distPath . 'css/drawer-kit.css'));
        }
    }

    private function registerAdminStationAssets(): void
    {
        $distPath = COMPUZIGN_DIST_PATH;
        $distUrl  = COMPUZIGN_DIST_URL;

        // CSS: register-only; the admin-station shortcode enqueues it (with a
        // wp_head safety net) when its page renders.
        if (file_exists($distPath . 'css/admin-station.css')) {
            // Depends on the shared drawer kit: all four Admin Station entity
            // compositions mount the shared renderer and need its rules.
            wp_register_style('compuzign-admin-station', $distUrl . 'css/admin-station.css', ['compuzign-drawer-kit'], filemtime($distPath . 'css/admin-station.css'));
        }

        // JS: register-only; the shortcode enqueues after the mount div is in
        // the DOM.
        if (file_exists($distPath . 'js/admin-station.js')) {
            wp_register_script('compuzign-admin-station', $distUrl . 'js/admin-station.js', ['compuzign-config'], filemtime($distPath . 'js/admin-station.js'), true);
        }
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

}
