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
 *   Granted natively to users in the cz_platform_manager role (registered here).
 *   Also granted transparently (via user_has_cap filter) to any user who has
 *   manage_options, so developer accounts retain access without role migration.
 *
 * Decision boundary (platform user vs developer):
 *   Platform user  : has manage_compuzign && !has install_plugins → redirect to CCC
 *   Developer/maint: has manage_compuzign &&  has install_plugins → full WP admin retained
 *
 * Provisioning:
 *   Assign new business/platform users the 'cz_platform_manager' role.
 *   They receive manage_compuzign natively and never need install_plugins.
 */
class AdminRouter
{
    public const CAP       = 'manage_compuzign';
    public const ROLE      = 'cz_platform_manager';
    public const SLUG      = 'compuzign-command-centre';
    public const PAGE_SLUG = 'admin-command-centre';

    public function register(): void
    {
        add_action('init',                  [$this, 'registerRole'],       1);
        add_action('init',                  [$this, 'provisionDefaultUser'], 2);
        add_filter('user_has_cap',          [$this, 'grantPlatformCap'], 10, 4);
        add_action('admin_menu',            [$this, 'registerMenu']);
        add_filter('login_redirect',        [$this, 'loginRedirect'], 10, 3);
        add_action('admin_init',            [$this, 'dashboardRedirect']);
        add_action('admin_enqueue_scripts', [$this, 'enqueueAssets']);
        add_action('template_redirect',     [$this, 'processLogin']);
    }

    // ── Role ──────────────────────────────────────────────────────────────────

    /**
     * Register the platform manager role on init if it does not yet exist.
     * The role carries manage_compuzign and read only — no WP admin surface access.
     * Idempotent: safe to run on every request.
     */
    public function registerRole(): void
    {
        if (get_role(self::ROLE) !== null) {
            return;
        }
        add_role(self::ROLE, 'Platform Manager', [
            self::CAP => true,
            'read'    => true,
        ]);
    }

    /**
     * Provision the default platform user on first run.
     * Skips immediately once the account exists — one DB lookup, no overhead.
     * Credentials are initial values only; the password can be changed in WP admin.
     */
    public function provisionDefaultUser(): void
    {
        if (get_user_by('login', 'accountmanager') !== false) {
            return;
        }

        $host  = (string) parse_url(home_url(), PHP_URL_HOST);
        $email = 'accountmanager@' . ($host ?: 'compuzign.com');

        wp_insert_user([
            'user_login'   => 'accountmanager',
            'user_pass'    => 'Compuzign@2026',
            'display_name' => 'Account Manager',
            'user_email'   => $email,
            'role'         => self::ROLE,
        ]);
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
     * After a successful WP login (via wp-login.php), send platform users to the CCC.
     * This covers standard WP login. The /admin-command-centre/ form uses processLogin().
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
            return $this->canonicalUrl();
        }
        return $redirectTo;
    }

    /**
     * If a platform user lands on the WP dashboard, push them to /admin-command-centre/.
     * Skips AJAX and non-dashboard pages so developers retain full wp-admin access.
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
            wp_safe_redirect($this->canonicalUrl());
            exit;
        }
    }

    /**
     * Process the branded login form on /admin-command-centre/.
     * Runs at template_redirect so cookies can be set before any output.
     */
    public function processLogin(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['cz_login_nonce'])) {
            return;
        }
        if (!wp_verify_nonce(sanitize_key($_POST['cz_login_nonce']), 'cz_login')) {
            return;
        }

        $credentials = [
            'user_login'    => sanitize_user(wp_unslash((string) ($_POST['cz_username'] ?? ''))),
            'user_password' => wp_unslash((string) ($_POST['cz_password'] ?? '')),
            'remember'      => !empty($_POST['cz_remember']),
        ];

        $user = wp_signon($credentials, is_ssl());

        if (is_wp_error($user)) {
            wp_safe_redirect(add_query_arg('login_error', '1', $this->canonicalUrl()));
            exit;
        }

        // All authentications via the CCC form return to /admin-command-centre/.
        // Access control is enforced by the shortcode — non-platform users see the
        // access-denied state there rather than being sent somewhere unexpected.
        wp_safe_redirect($this->canonicalUrl());
        exit;
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
     * Canonical product admin URL. Override via the compuzign_command_centre_url filter.
     */
    private function canonicalUrl(): string
    {
        return (string) apply_filters(
            'compuzign_command_centre_url',
            home_url('/' . self::PAGE_SLUG . '/')
        );
    }

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
