<?php

namespace CompuZign\Platform\Modules\AdminStation;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\Admin\AdminRouter;

/**
 * The new, independent administration environment.
 *
 * This module owns only the mount point for the Admin Station frontend shell.
 * It shares nothing with the existing AdminModule beyond the platform manager
 * capability (a shared permission contract), and it does not touch the old
 * manager architecture. Business areas are rebuilt inside the Admin Station one
 * at a time; until then this renders an empty, ready platform landing.
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

        if (!is_user_logged_in() || !current_user_can(AdminRouter::CAP)) {
            return '<div class="cz-station-gate">The Admin Station is available to platform managers.</div>';
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
}
