<?php

namespace CompuZign\Platform\Modules\Admin;

/**
 * AdminRouter — login/admin landing flow for the CompuZign Admin Command Centre.
 *
 * Architecture contract:
 *   WordPress is the runtime/auth host. The product admin surface is the
 *   Command Centre, not the WP dashboard.
 *
 * Capability model:
 *   manage_compuzign — the platform capability that gates the Command Centre.
 *   Granted transparently (via user_has_cap filter) to any user who has
 *   manage_options, so existing accounts need no migration.
 *
 * Decision boundary (platform user vs developer):
 *   Platform user  : has manage_compuzign && !has install_plugins → redirect to CCC
 *   Developer/maint: has manage_compuzign &&  has install_plugins → full WP admin retained
 */
class AdminRouter
{
    public const CAP  = 'manage_compuzign';
    public const SLUG = 'compuzign-command-centre';

    public function register(): void
    {
        add_filter('user_has_cap',         [$this, 'grantPlatformCap'], 10, 4);
        add_action('admin_menu',           [$this, 'registerMenu']);
        add_filter('login_redirect',       [$this, 'loginRedirect'], 10, 3);
        add_action('admin_init',           [$this, 'dashboardRedirect']);
        add_action('admin_enqueue_scripts', [$this, 'enqueueAssets']);
    }

    // ── Capability ────────────────────────────────────────────────────────────

    /**
     * Grant manage_compuzign to any user who already has manage_options.
     * Fires on every current_user_can() call — keep the fast path cheap.
     */
    public function grantPlatformCap(array $allCaps, array $caps, array $args, \WP_User $user): array
    {
        if (!empty($allCaps[self::CAP]) || empty($allCaps['manage_options'])) {
            return $allCaps;
        }
        $allCaps[self::CAP] = true;
        return $allCaps;
    }

    // ── Menu ──────────────────────────────────────────────────────────────────

    public function registerMenu(): void
    {
        add_menu_page(
            'CompuZign Admin',
            'CompuZign',
            self::CAP,
            self::SLUG,
            [$this, 'renderPage'],
            'dashicons-grid-view',
            2
        );

        // Platform users only see the CompuZign entry — strip WP defaults.
        if ($this->isPlatformUser()) {
            $this->removeDefaultMenuItems();
        }
    }

    public function renderPage(): void
    {
        echo '<div id="compuzign-admin"></div>';
    }

    // ── Redirects ─────────────────────────────────────────────────────────────

    /**
     * After a successful WP login, send platform users directly to the CCC.
     *
     * @param string          $redirectTo
     * @param string          $requestedRedirect
     * @param \WP_User|\WP_Error $user
     */
    public function loginRedirect(string $redirectTo, string $requestedRedirect, $user): string
    {
        if (is_wp_error($user) || !($user instanceof \WP_User)) {
            return $redirectTo;
        }
        if ($this->isPlatformUser($user)) {
            return admin_url('admin.php?page=' . self::SLUG);
        }
        return $redirectTo;
    }

    /**
     * If a platform user lands on the WP dashboard directly, push them to the CCC.
     * Skips AJAX requests and non-dashboard pages.
     */
    public function dashboardRedirect(): void
    {
        if (wp_doing_ajax()) {
            return;
        }
        if (!$this->isPlatformUser()) {
            return;
        }
        global $pagenow;
        if ($pagenow === 'index.php') {
            wp_safe_redirect(admin_url('admin.php?page=' . self::SLUG));
            exit;
        }
    }

    // ── Assets ────────────────────────────────────────────────────────────────

    /**
     * Load all CompuZign assets when the CCC page is active in WP admin.
     * Mirrors what AssetLoader does for the front-end shortcode.
     */
    public function enqueueAssets(string $hookSuffix): void
    {
        if ($hookSuffix !== 'toplevel_page_' . self::SLUG) {
            return;
        }

        // ── Atomic Engine styles ─────────────────────────────────────────────
        $atomicBase = COMPUZIGN_ATOMIC_ENGINE_URL . 'css/';
        $atomicFiles = [
            '00-tokens.css', '01-reset.css', '02-base.css', '03-layout.css',
            '04-buttons.css', '05-cards.css', '06-forms.css', '07-tabs.css',
            '08-modals.css', '09-utilities.css',
        ];
        foreach ($atomicFiles as $i => $file) {
            wp_enqueue_style(
                'compuzign-atomic-' . str_pad((string) $i, 2, '0', STR_PAD_LEFT),
                $atomicBase . $file,
                [],
                COMPUZIGN_PLUGIN_VERSION
            );
        }

        // ── Runtime config (window.CompuZignConfig) ──────────────────────────
        if (!wp_script_is('compuzign-config', 'registered')) {
            wp_register_script('compuzign-config', false, [], null, true);
            $config = wp_json_encode([
                'apiRoot'        => esc_url_raw(rest_url('compuzign/v1/')),
                'nonce'          => wp_create_nonce('wp_rest'),
                'contactUrl'     => esc_url(apply_filters('compuzign_contact_url', home_url('/contact/'))),
                'costBuilderUrl' => esc_url(apply_filters('compuzign_cost_builder_url', home_url('/pricing/'))),
            ]);
            wp_add_inline_script('compuzign-config', 'window.CompuZignConfig = ' . $config . ';');
        }
        wp_enqueue_script('compuzign-config');

        $distPath = COMPUZIGN_DIST_PATH;
        $distUrl  = COMPUZIGN_DIST_URL;

        // ── Suppress WP admin chrome — WordPress is the host, not the product.
        // Registered unconditionally (no dist file dependency) so the override
        // always lands even during fresh checkouts or build failures.
        // Raw values are intentional — these target WP core elements, not CZ components.
        wp_register_style('compuzign-admin-host-reset', false, ['compuzign-atomic-09']);
        wp_enqueue_style('compuzign-admin-host-reset');
        wp_add_inline_style('compuzign-admin-host-reset', '
            #wpadminbar, #adminmenu, #adminmenuwrap, #adminmenuback { display: none !important; }
            html.wp-toolbar { padding-top: 0 !important; }
            #wpcontent, #wpbody { margin-left: 0 !important; }
            #wpbody-content { padding-top: 0 !important; }
            .update-nag, .notice, .error, .updated, .is-dismissible { display: none !important; }
        ');

        // ── Admin CSS ────────────────────────────────────────────────────────
        if (file_exists($distPath . 'css/admin.css')) {
            wp_enqueue_style(
                'compuzign-admin',
                $distUrl . 'css/admin.css',
                ['compuzign-admin-host-reset'],
                filemtime($distPath . 'css/admin.css')
            );
        }

        // ── Admin JS ─────────────────────────────────────────────────────────
        if (file_exists($distPath . 'js/admin.js')) {
            wp_enqueue_script(
                'compuzign-admin',
                $distUrl . 'js/admin.js',
                ['compuzign-config'],
                filemtime($distPath . 'js/admin.js'),
                true
            );
            wp_localize_script('compuzign-admin', 'CompuZignAdmin', [
                'restUrl' => esc_url_raw(rest_url('compuzign/v1/')),
                'nonce'   => wp_create_nonce('wp_rest'),
            ]);
        }
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    /**
     * A platform user has manage_compuzign but NOT install_plugins.
     * Developers/maintainers have install_plugins and bypass all redirects.
     */
    private function isPlatformUser(?\WP_User $user = null): bool
    {
        $user ??= wp_get_current_user();
        return user_can($user, self::CAP) && !user_can($user, 'install_plugins');
    }

    private function removeDefaultMenuItems(): void
    {
        remove_menu_page('index.php');
        remove_menu_page('edit.php');
        remove_menu_page('upload.php');
        remove_menu_page('edit.php?post_type=page');
        remove_menu_page('edit-comments.php');
        remove_menu_page('themes.php');
        remove_menu_page('plugins.php');
        remove_menu_page('users.php');
        remove_menu_page('tools.php');
        remove_menu_page('options-general.php');
    }
}
