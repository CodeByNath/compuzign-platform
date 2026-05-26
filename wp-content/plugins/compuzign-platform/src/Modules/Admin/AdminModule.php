<?php

namespace CompuZign\Platform\Modules\Admin;

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\Admin\Http\AdminController;
use CompuZign\Platform\Modules\Admin\Http\AdminRequestsController;

class AdminModule
{
    public function register(): void
    {
        (new AdminController())->register();
        (new AdminRequestsController())->register();

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

        if (!current_user_can('manage_options')) {
            return '<div class="cz-admin-gate cz-admin-gate--denied"><p>Access restricted.</p></div>';
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
