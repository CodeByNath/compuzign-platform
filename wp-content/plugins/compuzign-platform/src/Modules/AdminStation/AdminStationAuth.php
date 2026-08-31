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
 * Admin Station shortcode can sit on any page, so the form itself carries
 * the page it was submitted from and this class only ever redirects back
 * to that same page — never a fixed slug, never wp-login.php, never wp-admin.
 */
class AdminStationAuth
{
    public const NONCE_ACTION  = 'cz_admin_station_login';
    public const NONCE_FIELD   = 'cz_admin_station_login_nonce';
    public const REDIRECT_FIELD = 'cz_admin_station_redirect';

    public function register(): void
    {
        // template_redirect fires early enough that wp_signon()'s auth
        // cookies can still be set before any HTML output starts.
        add_action('template_redirect', [$this, 'processLogin']);
    }

    public function processLogin(): void
    {
        $redirect = $this->handleLoginRequest($_SERVER['REQUEST_METHOD'] ?? '', $_POST);
        if ($redirect === null) {
            return;
        }
        wp_safe_redirect($redirect);
        exit;
    }

    /**
     * Pure(ish) decision core, kept separate from processLogin()'s exit so
     * it is testable without needing to mock process termination.
     *
     * Returns the URL to redirect to, or null when this request is not a
     * submission of this form at all (wrong method, no nonce field, stale/
     * invalid nonce) — in which case the caller does nothing further and
     * the page renders normally, which still shows the login form to a
     * logged-out visitor. A stale/invalid nonce is treated identically to
     * "not our form": no error is surfaced for it, matching the same
     * generic-feedback posture as a genuine bad-credentials attempt.
     *
     * @param array<string, mixed> $post
     */
    public function handleLoginRequest(string $method, array $post): ?string
    {
        if ($method !== 'POST' || empty($post[self::NONCE_FIELD])) {
            return null;
        }
        if (!wp_verify_nonce(sanitize_key((string) $post[self::NONCE_FIELD]), self::NONCE_ACTION)) {
            return null;
        }

        $redirectTo = $this->sameSiteRedirectTarget((string) ($post[self::REDIRECT_FIELD] ?? ''));

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
     * The submitted page to return to, with any stale login_error stripped
     * so a retry never stacks/echoes a prior failure once it succeeds.
     * wp_safe_redirect() is the actual security boundary here — it refuses
     * to redirect off-site regardless of what this returns — this just
     * supplies a sane same-page default when the field is empty.
     */
    private function sameSiteRedirectTarget(string $submitted): string
    {
        $submitted = trim($submitted);
        $target    = $submitted !== '' ? $submitted : home_url('/');
        return remove_query_arg('login_error', $target);
    }
}
