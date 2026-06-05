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
        // CSS is enqueued proactively from AssetLoader for this page.
        // Re-enqueue here as a safety net for themes that bypass wp_head timing.
        if (wp_style_is('compuzign-admin', 'registered') && !wp_style_is('compuzign-admin', 'enqueued')) {
            wp_enqueue_style('compuzign-admin');
        }

        if (!is_user_logged_in()) {
            return $this->renderLoginForm();
        }

        if (!current_user_can(AdminRouter::CAP)) {
            return $this->renderAccessDenied();
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

    private function renderLoginForm(): string
    {
        $hasError = !empty($_GET['login_error']);
        $nonce    = wp_create_nonce('cz_login');

        ob_start();
        ?>
        <div class="cz-login-root">
          <div class="cz-login-card">
            <div class="cz-login-brand">
              <div class="cz-login-brand__mark">CZ</div>
              <p class="cz-login-brand__name">CompuZign</p>
              <p class="cz-login-brand__sub">Admin Command Centre</p>
            </div>

            <?php if ($hasError): ?>
            <p class="cz-login-error">Invalid username or password. Please try again.</p>
            <?php endif; ?>

            <form class="cz-login-form" method="post" action="">
              <input type="hidden" name="cz_login_nonce" value="<?php echo esc_attr($nonce); ?>">

              <div class="cz-login-field">
                <label class="cz-login-label" for="cz_username">Username or email</label>
                <input
                  class="cz-login-input"
                  type="text"
                  name="cz_username"
                  id="cz_username"
                  autocomplete="username"
                  required
                  <?php if (!$hasError): ?>autofocus<?php endif; ?>
                >
              </div>

              <div class="cz-login-field">
                <label class="cz-login-label" for="cz_password">Password</label>
                <div class="cz-login-input-wrap">
                  <input
                    class="cz-login-input"
                    type="password"
                    name="cz_password"
                    id="cz_password"
                    autocomplete="current-password"
                    required
                    <?php if ($hasError): ?>autofocus<?php endif; ?>
                  >
                  <button
                    type="button"
                    class="cz-login-eye"
                    onclick="var f=document.getElementById('cz_password');f.type=f.type==='password'?'text':'password';this.textContent=this.textContent==='SHOW'?'HIDE':'SHOW'"
                  >SHOW</button>
                </div>
              </div>

              <button type="submit" class="cz-login-btn">Sign in</button>
            </form>

            <p class="cz-login-footer">© CompuZign</p>
          </div>
        </div>
        <?php
        return ob_get_clean();
    }

    private function renderAccessDenied(): string
    {
        $debug = '';
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $user  = wp_get_current_user();
            $debug = '<p style="margin-top:16px;font-size:11px;opacity:.4;color:#e8eaed">'
                . 'user_id: ' . (int) $user->ID
                . ' &mdash; roles: ' . esc_html(implode(', ', (array) $user->roles))
                . ' &mdash; ' . esc_html(AdminRouter::CAP) . ': no'
                . '</p>';
        }

        return '<div class="cz-login-root">'
            . '<div class="cz-login-card">'
            . '<div class="cz-login-brand">'
            . '<div class="cz-login-brand__mark">CZ</div>'
            . '<p class="cz-login-brand__name">CompuZign</p>'
            . '</div>'
            . '<p class="cz-login-error">Access restricted. You do not have permission to access the Admin Command Centre.</p>'
            . $debug
            . '</div>'
            . '</div>';
    }
}
