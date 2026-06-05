<?php

namespace CompuZign\Platform\Modules\Admin;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\Admin\Http\AdminController;
use CompuZign\Platform\Modules\Admin\Http\AdminRequestsController;
use CompuZign\Platform\Modules\Admin\Http\AdminServicesController;

class AdminModule
{
    public function register(): void
    {
        (new AdminRouter())->register();
        (new AdminController())->register();
        (new AdminRequestsController())->register();
        (new AdminServicesController())->register();

        add_shortcode('compuzign_admin', [$this, 'renderShortcode']);

        add_filter('body_class', [$this, 'addBodyClass']);

        Health::register('admin', static fn() => true);
    }

    /** @param string[] $classes */
    public function addBodyClass(array $classes): array
    {
        if (is_page()) {
            $post = get_post();
            if ($post && has_shortcode($post->post_content, 'compuzign_admin')) {
                $classes[] = 'compuzign-admin-page';
            }
        }
        return $classes;
    }

    public function renderShortcode(): string
    {
        if (!is_user_logged_in()) {
            return '<div class="cz-admin-gate">'
                . '<p>Please <a href="' . esc_url(wp_login_url(get_permalink())) . '">log in</a> to access the Command Centre.</p>'
                . '</div>';
        }

        if (!current_user_can(AdminRouter::CAP)) {
            $debug = '';
            if (defined('WP_DEBUG') && WP_DEBUG) {
                $user  = wp_get_current_user();
                $debug = '<p class="cz-admin-gate__debug" style="font-size:12px;opacity:.6;">'
                    . 'Debug &mdash; user_id: ' . (int) $user->ID
                    . ' | roles: ' . esc_html(implode(', ', (array) $user->roles))
                    . ' | ' . AdminRouter::CAP . ': no'
                    . '</p>';
            }
            return '<div class="cz-admin-gate cz-admin-gate--denied"><p>Access restricted.</p>' . $debug . '</div>';
        }

        if (wp_style_is('compuzign-admin', 'registered')) {
            wp_enqueue_style('compuzign-admin');
        }
        if (wp_script_is('compuzign-admin', 'registered')) {
            wp_enqueue_script('compuzign-admin');
        }

        $template = COMPUZIGN_APP_PATH . 'modules/admin/templates/admin.php';

        ob_start();
        if (file_exists($template)) {
            include $template;
        } else {
            echo '<div id="compuzign-admin" class="cz-admin-root"></div>';
        }
        return ob_get_clean();
    }
}
