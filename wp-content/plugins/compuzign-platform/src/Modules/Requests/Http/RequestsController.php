<?php

namespace CompuZign\Platform\Modules\Requests\Http;

use CompuZign\Platform\Modules\Requests\Notifications\NotificationTemplates;
use CompuZign\Platform\Modules\Requests\Support\RequestSchema;

class RequestsController
{
    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        register_rest_route('compuzign/v1', '/requests/submit', [
            'methods'             => 'POST',
            'callback'            => [$this, 'submitRequest'],
            'permission_callback' => [$this, 'verifyNonce'],
            'args'                => RequestSchema::restArgs(),
        ]);
    }

    /**
     * Requires a valid WordPress REST nonce sent as X-WP-Nonce.
     * The nonce is available on every page via window.CompuZignConfig.nonce.
     * Rejects requests that arrive without a nonce (direct API calls, bots).
     */
    public function verifyNonce(\WP_REST_Request $request): bool
    {
        $nonce = $request->get_header('X-WP-Nonce');

        if (empty($nonce)) {
            return false;
        }

        return wp_verify_nonce($nonce, 'wp_rest') !== false;
    }

    public function submitRequest(\WP_REST_Request $request): \WP_REST_Response
    {
        // ── Rate limit: 5 submissions per IP per 60 minutes ──────────────────
        $ipKey = 'cz_rl_' . md5($_SERVER['REMOTE_ADDR'] ?? '');
        $count = (int) get_transient($ipKey);

        if ($count >= 5) {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'Too many submissions. Please try again later.'],
                429
            );
        }

        set_transient($ipKey, $count + 1, HOUR_IN_SECONDS);

        // ── Schema validation + sanitisation ────────────────────────────────
        $validated = RequestSchema::validate($request);
        if (!$validated['ok']) {
            return new \WP_REST_Response(
                ['success' => false, 'message' => $validated['message']],
                $validated['status']
            );
        }

        $payload  = $validated['data'];
        $quoteRef = $payload['quote_ref'];

        // ── Persist to transient (7 days) ────────────────────────────────────
        set_transient('cz_quote_' . $quoteRef, $payload, 7 * DAY_IN_SECONDS);

        // ── Email notifications ──────────────────────────────────────────────
        $adminEmail = (string) get_option('admin_email');
        $siteTitle  = (string) get_bloginfo('name');
        $email      = $payload['email'];
        $headers    = ['Content-Type: text/html; charset=UTF-8'];

        wp_mail(
            $adminEmail,
            "[{$siteTitle}] New Quote Request — {$quoteRef}",
            NotificationTemplates::buildAdminHtmlEmail($payload),
            $headers
        );

        wp_mail(
            $email,
            "Your quote request has been received — {$quoteRef}",
            NotificationTemplates::buildCustomerHtmlEmail($payload, $siteTitle),
            $headers
        );

        return new \WP_REST_Response([
            'success'  => true,
            'quote_id' => $quoteRef,
            'message'  => 'Your quote request has been received. We will be in touch within one business day.',
        ], 200);
    }

}
