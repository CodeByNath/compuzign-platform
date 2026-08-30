<?php

namespace CompuZign\Platform\Modules\Requests\Http;

use CompuZign\Platform\Modules\Requests\Notifications\NotificationTemplates;
use CompuZign\Platform\Modules\Requests\Support\QuoteViewAccess;
use CompuZign\Platform\Modules\Requests\Support\QuoteViewSecret;
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

        // Phase 8J-C1: the secure read boundary only — no customer page or
        // email link consumes this yet (see project-work/2026-08-30-phase-8j-
        // quote-email-snapshot-parity.md). Public (no nonce/login) because the
        // eventual caller is an emailed link, not an authenticated session;
        // access is instead gated entirely by the view secret.
        //
        // The secret is deliberately NOT a REST 'args' entry: it travels only
        // in the X-Quote-View-Secret request header (see getQuote()), never a
        // query parameter — a query string lands in server/proxy access logs
        // and browser history, a header does not. Declaring it here would also
        // let WordPress's own arg-validation reject a missing header with its
        // own distinct response before getQuote() runs, defeating the single
        // non-disclosing failure path every other rejection reason shares.
        register_rest_route('compuzign/v1', '/requests/quote/(?P<ref>[A-Za-z0-9-]+)', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getQuote'],
            'permission_callback' => '__return_true',
            'args'                => [
                'ref' => ['type' => 'string', 'required' => true],
            ],
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

        // ── Phase 8J-C1: view secret (boundary only — not yet surfaced to any
        //    caller; only the one-way hash is persisted). ──────────────────
        $viewSecret                    = QuoteViewSecret::generate();
        $payload['view_secret_hash']   = QuoteViewSecret::hash($viewSecret);

        // ── Persist to transient (7 days) ────────────────────────────────────
        set_transient('cz_quote_' . $quoteRef, $payload, 7 * DAY_IN_SECONDS);

        // ── Email notifications ──────────────────────────────────────────────
        $adminEmail = (string) get_option('admin_email');
        $siteTitle  = (string) get_bloginfo('name');
        $email      = $payload['email'];
        $headers    = ['Content-Type: text/html; charset=UTF-8'];

        $isAssessment = ($payload['type'] ?? '') === 'free_it_assessment';

        $adminSubject    = $isAssessment
            ? "[{$siteTitle}] Free IT Assessment Request — {$quoteRef}"
            : "[{$siteTitle}] New Quote Request — {$quoteRef}";

        $customerSubject = $isAssessment
            ? "Your assessment request has been received — {$quoteRef}"
            : "Your quote request has been received — {$quoteRef}";

        wp_mail(
            $adminEmail,
            $adminSubject,
            NotificationTemplates::buildAdminHtmlEmail($payload),
            $headers
        );

        wp_mail(
            $email,
            $customerSubject,
            NotificationTemplates::buildCustomerHtmlEmail($payload, $siteTitle),
            $headers
        );

        return new \WP_REST_Response([
            'success'  => true,
            'quote_id' => $quoteRef,
            'message'  => 'Your quote request has been received. We will be in touch within one business day.',
        ], 200);
    }

    /**
     * Phase 8J-C1: the secure read boundary. Every failure path (malformed
     * reference, missing header, wrong secret, missing/expired transient, a
     * pre-8J-C1 snapshot with no stored hash) returns the identical
     * non-disclosing 404 — see QuoteViewAccess's docblock for why a
     * distinguishing message is never safe here, and registerRoutes()'s
     * docblock for why the secret arrives as a header rather than an 'args'
     * entry (no framework-level rejection to converge with, by construction).
     */
    public function getQuote(\WP_REST_Request $request): \WP_REST_Response
    {
        $ref    = (string) $request->get_param('ref');
        $secret = (string) $request->get_header('X-Quote-View-Secret');

        $stored = get_transient('cz_quote_' . $ref);
        $result = QuoteViewAccess::resolve($stored, $ref, $secret);

        if (!$result['ok']) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Quote not found.'], 404);
        }

        return new \WP_REST_Response(['success' => true, 'quote' => $result['quote']], 200);
    }

}
