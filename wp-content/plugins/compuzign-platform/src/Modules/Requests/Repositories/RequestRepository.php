<?php

namespace CompuZign\Platform\Modules\Requests\Repositories;

use CompuZign\Platform\Modules\Requests\Support\RequestLifecycle;

class RequestRepository
{
    private const POST_TYPE   = 'cz_request';
    private const META_REF    = 'cz_request_ref';
    private const META_DATA   = 'cz_request_data';
    private const META_STATUS = 'cz_request_status';
    private const META_PLATFORM_ID = 'cz_platform_id';

    private const LOCK_TTL_SECONDS  = 10;
    private const LOCK_POLL_ATTEMPTS = 40;
    private const LOCK_POLL_MICROS   = 50_000;

    /**
     * Unconditionally insert a new durable Request from $payload — the caller
     * is responsible for having already established (e.g. via the creation
     * lock in RequestsController) that no record for this quote_ref exists
     * and that this call is the sole writer. Does not set cz_platform_id;
     * identity assignment is the caller's job (see
     * RequestsController::createDurableRequest()).
     *
     * @param  array<string, mixed> $payload
     * @return array{post_id: int, created_by_this_call: bool}
     */
    public function createOwned(array $payload): array
    {
        $quoteRef = (string) ($payload['quote_ref'] ?? '');
        if ($quoteRef === '') {
            return ['post_id' => 0, 'created_by_this_call' => false];
        }

        $postId = wp_insert_post([
            'post_type'   => self::POST_TYPE,
            'post_title'  => $quoteRef,
            'post_status' => 'publish',
        ], true);

        if (is_wp_error($postId)) {
            return ['post_id' => 0, 'created_by_this_call' => false];
        }

        $postId = (int) $postId;

        update_post_meta($postId, self::META_REF,    $quoteRef);
        update_post_meta($postId, self::META_DATA,   $payload);
        update_post_meta($postId, self::META_STATUS, RequestLifecycle::STATUS_PENDING);

        return ['post_id' => $postId, 'created_by_this_call' => true];
    }

    /** Permanently remove a durable Request this call is certain it just created (rollback only). */
    public function deleteOwned(int $postId): void
    {
        wp_delete_post($postId, true);
    }

    /**
     * Return all stored Water requests, newest first.
     *
     * Meta for the result set is batch-loaded by WordPress via the post meta
     * cache, so per-record hydration calls are O(1) cache hits.
     *
     * @return array<int, array<string, mixed>>
     */
    public function findAll(): array
    {
        $posts = get_posts([
            'post_type'              => self::POST_TYPE,
            'post_status'            => 'publish',
            'numberposts'            => -1,
            'orderby'                => 'ID',
            'order'                  => 'DESC',
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
            // update_post_meta_cache left at default (true) — WP batch-loads
            // meta for the full result set, making hydration cache-efficient.
        ]);

        return array_map([$this, 'hydrate'], $posts);
    }

    /**
     * Return a single stored managed request by quote_ref, or null if not yet accepted.
     *
     * @return array<string, mixed>|null
     */
    public function findByRef(string $ref): ?array
    {
        $postId = $this->findPostIdByRef($ref);
        if ($postId === null) {
            return null;
        }

        $post = get_post($postId);
        if (!$post instanceof \WP_Post) {
            return null;
        }

        return $this->hydrate($post);
    }

    /**
     * Update the lifecycle status on a stored request.
     *
     * Status must be a value declared in RequestLifecycle::ACTIVE_STATUSES.
     * Returns false when the post does not exist, is the wrong type, or the
     * status value is not valid.
     */
    public function updateStatus(int $postId, string $status): bool
    {
        if (!RequestLifecycle::isValid($status)) {
            return false;
        }

        $post = get_post($postId);
        if (!$post instanceof \WP_Post || $post->post_type !== self::POST_TYPE) {
            return false;
        }

        $storedStatus = (string) get_post_meta($postId, self::META_STATUS, true);
        $current      = $storedStatus !== ''
            ? RequestLifecycle::normalizeLegacy($storedStatus)
            : RequestLifecycle::STATUS_PENDING;

        if (!RequestLifecycle::canTransition($current, $status)) {
            return false;
        }

        return (bool) update_post_meta($postId, self::META_STATUS, $status);
    }

    // ── Permanent Platform identity ─────────────────────────────────────────

    public function platformId(int $postId): string
    {
        $stored = get_post_meta($postId, self::META_PLATFORM_ID, true);

        return is_string($stored) ? $stored : '';
    }

    /** Atomic write-once claim; the Station performs the exact read-back. */
    public function claimPlatformId(int $postId, string $platformId): bool
    {
        return add_post_meta($postId, self::META_PLATFORM_ID, $platformId, true) !== false;
    }

    public function platformIdExists(string $platformId): bool
    {
        $posts = get_posts([
            'post_type'              => self::POST_TYPE,
            'post_status'            => 'any',
            'numberposts'            => 1,
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
            'update_post_meta_cache' => false,
            'fields'                 => 'ids',
            'meta_query'             => [
                ['key' => self::META_PLATFORM_ID, 'value' => $platformId, 'compare' => '='],
            ],
        ]);

        return !empty($posts);
    }

    // ── Creation lock (concurrent same-ref submission convergence) ──────────
    //
    // Narrow, Request-specific — not a generic locking framework. Reuses the
    // one atomic WordPress primitive PlatformIdentifierStation already relies
    // on for its own reservation safety: add_option()'s DB-level unique
    // option_name guarantee. The lock value is a single opaque string,
    // "{token}|{claimedAt}" — never an array, so it round-trips through
    // $wpdb as literal bytes with no maybe_serialize() ambiguity. Every
    // mutation of an existing lock (release, takeover) is a compare-and-swap
    // against the exact previously-observed value — never a blind write —
    // so a caller can never touch a lock another caller has since replaced.

    public function claimCreationLock(string $quoteRef): ?string
    {
        $value = $this->newLockValue();

        return add_option($this->lockKey($quoteRef), $value, '', 'no') ? $value : null;
    }

    /** No-op if $myLockValue no longer matches the stored value (already superseded). */
    public function releaseCreationLock(string $quoteRef, string $myLockValue): void
    {
        global $wpdb;
        $key = $this->lockKey($quoteRef);

        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s",
            $key,
            $myLockValue
        ));

        // Raw $wpdb mutation bypasses delete_option()'s own cache invalidation —
        // do it explicitly so a stale object-cache value can never masquerade
        // as current lock state for a later get_option() read.
        wp_cache_delete($key, 'options');
    }

    public function observeLockValue(string $quoteRef): ?string
    {
        $value = get_option($this->lockKey($quoteRef), null);

        return is_string($value) ? $value : null;
    }

    public function isLockStale(string $lockValue): bool
    {
        $claimedAt = (int) (explode('|', $lockValue, 2)[1] ?? 0);

        return $claimedAt <= 0 || (time() - $claimedAt) > self::LOCK_TTL_SECONDS;
    }

    /**
     * Single atomic conditional UPDATE — compare-and-swap on the exact bytes
     * $observedValue was last read as. Returns the new value on success, or
     * null if the row no longer held $observedValue (someone else's claim,
     * release, or takeover already changed it) — in which case this call has
     * touched nothing.
     */
    public function takeoverStaleLock(string $quoteRef, string $observedValue): ?string
    {
        global $wpdb;
        $key      = $this->lockKey($quoteRef);
        $newValue = $this->newLockValue();

        $affected = $wpdb->query($wpdb->prepare(
            "UPDATE {$wpdb->options} SET option_value = %s WHERE option_name = %s AND option_value = %s",
            $newValue,
            $key,
            $observedValue
        ));

        if ($affected !== 1) {
            return null;
        }

        wp_cache_delete($key, 'options');

        return $newValue;
    }

    /**
     * Bounded poll for a READY durable Request — post existence alone is not
     * enough (see findReadyPostIdByRef()'s docblock for why).
     */
    public function awaitReadyPost(string $quoteRef, ?int $maxAttempts = null): ?int
    {
        $attempts = $maxAttempts ?? self::LOCK_POLL_ATTEMPTS;

        for ($i = 0; $i < $attempts; $i++) {
            usleep(self::LOCK_POLL_MICROS);
            $found = $this->findReadyPostIdByRef($quoteRef);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }

    private function lockKey(string $quoteRef): string
    {
        return 'cz_request_creating_' . $quoteRef;
    }

    private function newLockValue(): string
    {
        return bin2hex(random_bytes(16)) . '|' . time();
    }

    /**
     * Return all quote_ref values that have a corresponding Water record.
     *
     * Used by the intake list to derive is_accepted per item without N+1 queries.
     * Single JOIN query across postmeta + posts.
     *
     * @return string[]
     */
    public function findAllAcceptedRefs(): array
    {
        global $wpdb;

        $refs = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT pm.meta_value
                 FROM {$wpdb->postmeta} pm
                 INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
                 WHERE p.post_type = %s
                   AND p.post_status = 'publish'
                   AND pm.meta_key = %s",
                self::POST_TYPE,
                self::META_REF
            )
        );

        return array_values(array_filter((array) $refs));
    }

    /** Exact-match lookup by cz_request_ref meta. Returns post ID or null. */
    public function findPostIdByRef(string $ref): ?int
    {
        if ($ref === '') {
            return null;
        }

        $posts = get_posts([
            'post_type'              => self::POST_TYPE,
            'post_status'            => 'publish',
            'numberposts'            => 1,
            'no_found_rows'          => true,
            'update_post_term_cache' => false,
            'update_post_meta_cache' => false,
            'meta_query'             => [
                ['key' => self::META_REF, 'value' => $ref, 'compare' => '='],
            ],
        ]);

        return !empty($posts) ? (int) $posts[0]->ID : null;
    }

    /**
     * A post existing is not the same as a durable Request being joinable.
     * `createOwned()` inserts the post — making it visible to
     * findPostIdByRef() — strictly before `assignIdentifier()` binds its
     * CZR; a caller joining on bare post existence could regenerate the
     * quote-view transient/email for a Request whose identity assignment
     * then fails and rolls the post back. "Ready" means either a bound
     * `cz_platform_id`, or a pre-CRM-1A legacy record (raw stored status
     * `new`, no CZR by design — see isLegacyUnidentified()) — never a bare
     * post with neither.
     */
    public function findReadyPostIdByRef(string $ref): ?int
    {
        $postId = $this->findPostIdByRef($ref);
        if ($postId === null) {
            return null;
        }

        if ($this->platformId($postId) !== '') {
            return $postId;
        }

        return $this->isLegacyUnidentified($postId) ? $postId : null;
    }

    /**
     * True only for a genuine pre-CRM-1A record: raw stored status is
     * literally the old `new` value (written by the retired admin /accept
     * bridge, never by createOwned(), which always writes STATUS_PENDING)
     * and it has no CZR. Distinguishes an intentionally-unidentified legacy
     * record (complete, joinable, never getting a CZR — no backfill) from an
     * in-flight or orphaned CRM-1A post (STATUS_PENDING/APPROVED/CANCELLED,
     * temporarily or permanently missing its CZR because its creator is
     * still assigning it or crashed before finishing).
     */
    public function isLegacyUnidentified(int $postId): bool
    {
        if ($this->platformId($postId) !== '') {
            return false;
        }

        return (string) get_post_meta($postId, self::META_STATUS, true) === 'new';
    }

    /** Build the normalized record shape from a cz_request post. */
    private function hydrate(\WP_Post $post): array
    {
        $data   = get_post_meta($post->ID, self::META_DATA, true);
        $status = get_post_meta($post->ID, self::META_STATUS, true);
        $ref    = get_post_meta($post->ID, self::META_REF, true);

        // Legacy `new` (pre-CRM-1A records created by the retired admin
        // /accept bridge) normalizes here, at the read boundary only — the
        // stored postmeta value is left untouched until updateStatus() next
        // writes it forward. See RequestLifecycle::normalizeLegacy().
        $normalizedStatus = ($status !== '' && $status !== false)
            ? RequestLifecycle::normalizeLegacy((string) $status)
            : RequestLifecycle::STATUS_PENDING;

        return [
            'post_id'     => (int) $post->ID,
            'quote_ref'   => $ref ?: $post->post_title,
            'status'      => $normalizedStatus,
            'platform_id' => $this->platformId((int) $post->ID),
            'data'        => is_array($data) ? $data : [],
        ];
    }
}
