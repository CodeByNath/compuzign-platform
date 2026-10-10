<?php

namespace CompuZign\Platform\Modules\AdminStation;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Core\PlatformAccess;

/**
 * The independent administration environment and sole admin frontend host.
 *
 * This module owns only the mount point for the Admin Station frontend shell.
 * It gates access with the shared platform manager capability owned by
 * Core\PlatformAccess, and it does not own persistence or domain authority.
 */
class AdminStationModule
{
    public const SHORTCODE = 'compuzign_admin_station';
    public const MOUNT_ID  = 'compuzign-admin-station';

    public function register(): void
    {
        add_shortcode(self::SHORTCODE, [$this, 'renderShortcode']);
        Health::register('admin-station', static fn() => true);
    }

    public function renderShortcode(): string
    {
        // CSS registered by AssetLoader; enqueue as a safety net for themes
        // that bypass wp_head timing.
        if (wp_style_is('compuzign-admin-station', 'registered') && !wp_style_is('compuzign-admin-station', 'enqueued')) {
            wp_enqueue_style('compuzign-admin-station');
        }

        if (!is_user_logged_in()) {
            return $this->renderLoginGate();
        }

        if (!current_user_can(PlatformAccess::CAP)) {
            return $this->renderAccessDenied();
        }

        if (wp_script_is('compuzign-admin-station', 'registered')) {
            wp_enqueue_script('compuzign-admin-station');
        }

        $template = COMPUZIGN_APP_PATH . 'modules/admin-station/templates/admin-station.php';

        ob_start();
        if (file_exists($template)) {
            include $template;
        } else {
            echo '<div id="' . esc_attr(self::MOUNT_ID) . '"></div>';
        }
        return ob_get_clean();
    }

    /**
     * The branded, credential-free login form for a logged-out visitor.
     * Authentication itself happens in AdminStationAuth, hooked earlier at
     * template_redirect — this only renders the form and any prior failure.
     * The form self-submits (action="") and carries no redirect field:
     * AdminStationAuth derives the return destination from the request
     * itself, never from client input.
     */
    private function renderLoginGate(): string
    {
        $hasError = !empty($_GET['login_error']);
        $nonce    = wp_create_nonce(AdminStationAuth::NONCE_ACTION);

        $template = COMPUZIGN_APP_PATH . 'modules/admin-station/templates/login-gate.php';

        ob_start();
        if (file_exists($template)) {
            include $template;
        }
        return ob_get_clean();
    }

    /**
     * A logged-in visitor who lacks PlatformAccess::CAP — a product-styled
     * dead end, never the WP dashboard and never a silent redirect there.
     */
    private function renderAccessDenied(): string
    {
        $template = COMPUZIGN_APP_PATH . 'modules/admin-station/templates/access-denied.php';

        ob_start();
        if (file_exists($template)) {
            include $template;
        }
        return ob_get_clean();
    }
}
