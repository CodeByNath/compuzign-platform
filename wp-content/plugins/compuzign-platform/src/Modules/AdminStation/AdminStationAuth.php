<?php

namespace CompuZign\Platform\Modules\AdminStation;

/**
 * Processes the branded Admin Station login form's POST submission.
 *
 * WordPress remains the auth/session host: this class does nothing but
 * validate the request, hand credentials to wp_signon(), and redirect back
 * to the same page. It owns no role, capability, or account provisioning —
 * that stays with Core\PlatformAccess. It owns no page/route of its own:
 * unlike the retired Command Centre's AdminRouter (fixed /admin-command-
 * centre/ slug, WP-admin menu page, login_redirect/admin_init hooks), the
 * Admin Station shortcode can sit on any page — so this only ever processes
 * a submission made TO that same page (proven by the current queried post
 * actually carrying the shortcode, not by trusting anything the client
 * says), and only ever redirects back to that same page, server-derived —
 * never a client-supplied destination, never wp-login.php, never wp-admin.
 *
 * Audit correction: template_redirect fired globally with no page check,
 * and the return destination was a client-supplied hidden field trusted
 * until wp_safe_redirect() — whose own default validation fallback is
 * admin_url(), exactly the WP-admin journey this feature exists to avoid.
 * Both are fixed here: processing is gated on isAdminStationRequest(), and
 * the destination is derived from the current request itself (the form
 * self-submits — action="" — so the POST always lands back on the same
 * URL it was rendered from) and validated against an explicit non-admin
 * fallback, never wp_safe_redirect()'s own default.
 */
class AdminStationAuth
{
    public const NONCE_ACTION = 'cz_admin_station_login';
    public const NONCE_FIELD  = 'cz_admin_station_login_nonce';

    public function register(): void
    {
        // template_redirect fires early enough that wp_signon()'s auth
        // cookies can still be set before any HTML output starts.
        add_action('template_redirect', [$this, 'processLogin']);
    }

    public function processLogin(): void
    {
        $redirect = $this->handleLoginRequest(
            $_SERVER['REQUEST_METHOD'] ?? '',
            $_POST,
            $this->isAdminStationRequest(),
            $this->currentRequestUrl(),
        );
        if ($redirect === null) {
            return;
        }
        // Deliberately NOT wp_safe_redirect(): its own un-overridable
        // fallback is admin_url(). Validate explicitly against a
        // same-site, non-admin fallback instead, so no path here can
        // ever land on /wp-admin/.
        wp_redirect(wp_validate_redirect($redirect, home_url('/')));
        exit;
    }

    /**
     * Pure(ish) decision core, kept separate from processLogin()'s exit and
     * from every WordPress global-state read so it is directly testable.
     *
     * Returns the URL to redirect to, or null when this request is not a
     * submission of this form on the Admin Station page itself — wrong
     * page, wrong method, no nonce field, or a stale/invalid nonce are all
     * treated identically: no error, no redirect, the page just renders
     * normally (still showing the login form to a logged-out visitor).
     *
     * @param array<string, mixed> $post
     */
    public function handleLoginRequest(string $method, array $post, bool $isAdminStationPage, string $currentUrl): ?string
    {
        if (!$isAdminStationPage) {
            return null;
        }
        if ($method !== 'POST' || empty($post[self::NONCE_FIELD])) {
            return null;
        }
        if (!wp_verify_nonce(sanitize_key((string) $post[self::NONCE_FIELD]), self::NONCE_ACTION)) {
            return null;
        }

        // The only destination this ever returns to: wherever the request
        // actually landed, with any stale prior-failure flag stripped so a
        // retry never stacks/echoes it once it succeeds. Never client input.
        $redirectTo = remove_query_arg('login_error', $currentUrl);

        $user = wp_signon([
            'user_login'    => sanitize_user(wp_unslash((string) ($post['cz_username'] ?? ''))),
            'user_password' => wp_unslash((string) ($post['cz_password'] ?? '')),
            'remember'      => false,
        ], is_ssl());

        if (is_wp_error($user)) {
            // Generic failure signal only — never the WP_Error's own message,
            // which distinguishes unknown-username from wrong-password.
            return add_query_arg('login_error', '1', $redirectTo);
        }

        return $redirectTo;
    }

    /**
     * Source-grounded Admin Station page predicate — the same shape the
     * retired Command Centre's own addBodyClass() used (has_shortcode()
     * against the queried post's content), not a hardcoded slug, since the
     * shortcode can sit on any page.
     */
    private function isAdminStationRequest(): bool
    {
        if (!is_singular()) {
            return false;
        }
        $post = get_post();
        return $post instanceof \WP_Post && has_shortcode((string) $post->post_content, AdminStationModule::SHORTCODE);
    }

    private function currentRequestUrl(): string
    {
        return esc_url_raw(home_url(wp_unslash((string) ($_SERVER['REQUEST_URI'] ?? '/'))));
    }
}
