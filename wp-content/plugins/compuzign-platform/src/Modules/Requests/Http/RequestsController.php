<?php

namespace CompuZign\Platform\Modules\Requests\Http;

use CompuZign\Platform\Modules\Requests\Notifications\NotificationTemplates;
use CompuZign\Platform\Modules\Requests\Repositories\RequestRepository;
use CompuZign\Platform\Modules\Requests\RequestsModule;
use CompuZign\Platform\Modules\Requests\Support\QuoteViewAccess;
use CompuZign\Platform\Modules\Requests\Support\QuoteViewSecret;
use CompuZign\Platform\Modules\Requests\Support\RequestSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierBinding;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierReservation;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

class RequestsController
{
    public function __construct(
        private PlatformIdentifierStation $platformIdentifiers,
        private RequestRepository $requests
    ) {
    }

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

        // Phase 8J-C1: the secure read boundary — the "View / Print Quote"
        // link in the customer email (Phase 8J-C3, see submitRequest()) is
        // this route's caller. Public (no nonce/login) because that caller is
        // an emailed link, not an authenticated session; access is instead
        // gated entirely by the view secret.
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

        // ── CRM-1A: the durable Request is authoritative and must exist,
        //    identified, before any customer-facing side effect. Fails closed:
        //    no transient, no email, if this doesn't succeed.
        $acquired = $this->acquireOrJoinDurableRequest($quoteRef, $payload);

        if ($acquired['post_id'] === null) {
            return new \WP_REST_Response(
                ['success' => false, 'message' => 'Please try again in a moment.'],
                503
            );
        }

        if ($acquired['created_by_this_call'] !== true) {
            // A durable Request for this ref already existed (a sequential
            // retry, or this call converged onto a concurrent winner's post).
            // The stored durable payload is authoritative — never regenerate
            // the quote-view transient/email from unverified incoming data.
            $stored       = $this->requests->findByRef($quoteRef);
            $storedPayload = is_array($stored) ? ($stored['data'] ?? []) : [];

            if (!self::payloadsMatch($storedPayload, $payload)) {
                return new \WP_REST_Response([
                    'success' => false,
                    'message' => 'This quote reference was already submitted with different details. Please start a new request.',
                ], 409);
            }

            $payload = $storedPayload;
        }

        // ── Phase 8J-C1: view secret; only the one-way hash is persisted, and
        //    only in the transient — never merged into the durable snapshot.
        $viewSecret        = QuoteViewSecret::generate();
        $transientPayload  = $payload;
        $transientPayload['view_secret_hash'] = QuoteViewSecret::hash($viewSecret);

        // ── Persist to transient (7 days) — secure quote-view storage only. ──
        set_transient('cz_quote_' . $quoteRef, $transientPayload, 7 * DAY_IN_SECONDS);

        // ── Phase 8J-C3: the raw secret lives only in this local variable for
        //    the remainder of this one request — used to build the customer
        //    email link below, then discarded. Never added to $payload
        //    (already persisted above without it), never part of this
        //    method's own JSON response (see the return statement at the
        //    bottom), never logged. RequestsModule::quoteViewUrl() is the
        //    single URL-building contract; the secret is appended here only,
        //    as a URL fragment — never a query/path segment.
        $quoteViewLink = RequestsModule::quoteViewUrl($quoteRef) . '#' . $viewSecret;

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

        // Live-correction round: the durable Request above is already
        // persisted and authoritative by this point — a rendering failure in
        // EITHER email must never 500 this response (which would read to the
        // customer as a failed submission despite their Request already
        // existing) and must never let one email's failure silently swallow
        // the other. Each is independently guarded and logged; a genuine
        // wp_mail() transport failure (returns false, no exception) is
        // unaffected by this and was already silent before this change.
        try {
            wp_mail(
                $adminEmail,
                $adminSubject,
                NotificationTemplates::buildAdminHtmlEmail($payload),
                $headers
            );
        } catch (\Throwable $e) {
            error_log('[CompuZign] Admin Request notification failed for ' . $quoteRef . ': ' . $e->getMessage());
        }

        try {
            wp_mail(
                $email,
                $customerSubject,
                NotificationTemplates::buildCustomerHtmlEmail($payload, $siteTitle, $quoteViewLink),
                $headers
            );
        } catch (\Throwable $e) {
            error_log('[CompuZign] Customer Request notification failed for ' . $quoteRef . ': ' . $e->getMessage());
        }

        return new \WP_REST_Response([
            'success'  => true,
            'quote_id' => $quoteRef,
            'message'  => 'Your quote request has been received. We will be in touch within one business day.',
        ], 200);
    }

    /**
     * Establish (or join) the one durable Request for $quoteRef.
     *
     * Returns ['post_id' => int|null, 'created_by_this_call' => bool].
     * post_id is null only when this call could neither find nor create a
     * durable record within its bounded attempts (submitRequest() returns
     * 503 in that case) — never a signal to fall back to transient-only
     * behavior.
     *
     * @param  array<string, mixed> $payload
     * @return array{post_id: int|null, created_by_this_call: bool}
     */
    private function acquireOrJoinDurableRequest(string $quoteRef, array $payload): array
    {
        // Readiness, not bare existence: a post can exist (visible to
        // findPostIdByRef()) strictly before its CZR is bound. Joining on
        // that window would let a loser regenerate the quote-view
        // transient/email for a Request whose identity assignment then
        // fails and rolls the post back — see findReadyPostIdByRef().
        $existing = $this->requests->findReadyPostIdByRef($quoteRef);
        if ($existing !== null) {
            return ['post_id' => $existing, 'created_by_this_call' => false];
        }

        $myLockValue = $this->requests->claimCreationLock($quoteRef);

        if ($myLockValue === null) {
            // Someone else holds it — poll for their post to become ready before considering takeover.
            $found = $this->requests->awaitReadyPost($quoteRef);
            if ($found !== null) {
                return ['post_id' => $found, 'created_by_this_call' => false];
            }

            // At most one takeover attempt, CAS-only against the exact value
            // observed — never a blind delete-then-add. A failed takeover
            // (null) means a concurrent taker won the race; this call must
            // never touch what it now holds.
            $observed = $this->requests->observeLockValue($quoteRef);
            if ($observed !== null && $this->requests->isLockStale($observed)) {
                $myLockValue = $this->requests->takeoverStaleLock($quoteRef, $observed);
            }

            if ($myLockValue === null) {
                $found = $this->requests->awaitReadyPost($quoteRef, 20);
                if ($found !== null) {
                    return ['post_id' => $found, 'created_by_this_call' => false];
                }

                return ['post_id' => null, 'created_by_this_call' => false];
            }
        }

        // We hold the lock now — either a fresh claim or a won CAS takeover.
        try {
            // Ready first (covers both a genuinely bound CZR and a legacy
            // record) — join it directly, no assignment work. Only if
            // nothing ready exists do we fall back to the RAW lookup: any
            // post at all — ready or not — means we must never insert a
            // second one. An unready, non-legacy post found there is an
            // orphan from a prior lock-holder that crashed mid-assignment
            // (the lock is free again, or we just took it over); resume its
            // identity assignment instead of duplicating it.
            $existing = $this->requests->findReadyPostIdByRef($quoteRef);
            if ($existing !== null) {
                return ['post_id' => $existing, 'created_by_this_call' => false];
            }

            $orphaned = $this->requests->findPostIdByRef($quoteRef);
            if ($orphaned !== null) {
                return $this->resumeDurableRequest($orphaned);
            }

            return $this->createDurableRequest($payload);
        } finally {
            $this->requests->releaseCreationLock($quoteRef, $myLockValue);
        }
    }

    /**
     * Reserve a CZR identity, insert the durable post, and bind them —
     * rolling back both on any failure. Called only while this instance
     * holds the exclusive per-quote_ref creation lock, so the post this
     * method inserts (if any) has no possible other owner.
     *
     * @param  array<string, mixed> $payload
     * @return array{post_id: int|null, created_by_this_call: bool}
     */
    private function createDurableRequest(array $payload): array
    {
        try {
            $reservation = $this->platformIdentifiers->reserve(
                PlatformIdentifierPolicy::REQUEST,
                fn(string $platformId): bool => $this->requests->platformIdExists($platformId)
            );
        } catch (\Throwable) {
            return ['post_id' => null, 'created_by_this_call' => false];
        }

        $outcome = $this->requests->createOwned($payload);
        if (!$outcome['created_by_this_call']) {
            $this->retireReservation($reservation);
            return ['post_id' => null, 'created_by_this_call' => false];
        }

        $postId = $outcome['post_id'];

        try {
            $this->assignIdentifier($reservation, $postId);
        } catch (\Throwable) {
            $stored = $this->requests->platformId($postId);
            if ($stored === '' || $stored === $reservation->platformId()) {
                $this->requests->deleteOwned($postId);
            }
            $this->retireReservation($reservation, $postId);
            return ['post_id' => null, 'created_by_this_call' => false];
        }

        return ['post_id' => $postId, 'created_by_this_call' => true];
    }

    /**
     * Resume identity assignment onto a post this call did not insert (an
     * orphaned CRM-1A record left by a prior lock-holder that crashed
     * between createOwned() and assignIdentifier()). Only ever reached while
     * holding the exclusive per-ref creation lock, so there is no concurrent
     * writer to race. Never deletes the post on failure — this call did not
     * create it, so it is not this call's to remove (the same rule
     * createDurableRequest()'s rollback already follows); a later resume
     * attempt, bounded by the same lock mechanism, tries again.
     *
     * @return array{post_id: int|null, created_by_this_call: bool}
     */
    private function resumeDurableRequest(int $postId): array
    {
        try {
            $reservation = $this->platformIdentifiers->reserve(
                PlatformIdentifierPolicy::REQUEST,
                fn(string $platformId): bool => $this->requests->platformIdExists($platformId)
            );
        } catch (\Throwable) {
            return ['post_id' => null, 'created_by_this_call' => false];
        }

        try {
            $this->assignIdentifier($reservation, $postId);
        } catch (\Throwable) {
            $this->retireReservation($reservation, $postId);
            return ['post_id' => null, 'created_by_this_call' => false];
        }

        return ['post_id' => $postId, 'created_by_this_call' => false];
    }

    private function assignIdentifier(
        PlatformIdentifierReservation $reservation,
        int $postId
    ): PlatformIdentifierBinding {
        return $this->platformIdentifiers->assign(
            $reservation,
            $postId,
            fn(int|string $nativeReference): string => $this->requests->platformId((int) $nativeReference),
            fn(int|string $nativeReference, string $platformId): bool => $this->requests->claimPlatformId(
                (int) $nativeReference,
                $platformId
            )
        );
    }

    /** Mirrors AdminCategoriesController::retireReservation() for the Request/CZR entity type. */
    private function retireReservation(
        PlatformIdentifierReservation $reservation,
        ?int $nativeReference = null
    ): void {
        if ($nativeReference !== null) {
            try {
                $reverse = $this->platformIdentifiers->lookupNative(
                    PlatformIdentifierPolicy::REQUEST,
                    $nativeReference
                );
                if ($reverse?->platformId() === $reservation->platformId()) {
                    return;
                }
            } catch (\Throwable) {
                // Continue to inspect the reservation's own forward record.
            }
        }

        try {
            $forward = $this->platformIdentifiers->resolve($reservation->platformId());
            if ($forward?->status() === PlatformIdentifierStation::STATUS_RESERVED) {
                $this->platformIdentifiers->retire($reservation);
            }
        } catch (\Throwable) {
            // Preserve the first failure; never recycle an uncertain claim.
        }
    }

    /**
     * Exact-match comparison for retry/collision detection, ignoring only
     * `submitted` — the one field RequestSchema::validate() stamps fresh
     * (current_time('mysql')) on every call, guaranteed to differ between
     * two otherwise-identical resubmissions. Deliberately strict rather than
     * a semantic diff: a false "same" would regenerate the quote-view
     * transient/email from data the durable Request never actually stored.
     *
     * @param  array<string, mixed> $stored
     * @param  array<string, mixed> $incoming
     */
    private static function payloadsMatch(array $stored, array $incoming): bool
    {
        unset($stored['submitted'], $incoming['submitted']);

        return $stored === $incoming;
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
