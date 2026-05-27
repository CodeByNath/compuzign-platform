<?php

namespace CompuZign\Platform\Modules\Requests\Repositories;

use CompuZign\Platform\Modules\Requests\Support\RequestLifecycle;

class RequestRepository
{
    private const POST_TYPE   = 'cz_request';
    private const META_REF    = 'cz_request_ref';
    private const META_DATA   = 'cz_request_data';
    private const META_STATUS = 'cz_request_status';

    /**
     * Persist a validated intake payload as a Water record.
     *
     * Idempotent: if a cz_request post already exists for this quote_ref,
     * the existing post ID is returned without creating a duplicate.
     *
     * @param  array<string, mixed> $payload validated transient payload (from RequestSchema::validate)
     * @return int post ID on success; 0 on failure
     */
    public function create(array $payload): int
    {
        $quoteRef = (string) ($payload['quote_ref'] ?? '');
        if ($quoteRef === '') {
            return 0;
        }

        $existing = $this->findPostIdByRef($quoteRef);
        if ($existing !== null) {
            return $existing;
        }

        // Augment the payload with accepted_at; all other fields stay identical
        // to the transient schema so future consumers can read either source.
        $data                = $payload;
        $data['accepted_at'] = current_time('mysql');

        $postId = wp_insert_post([
            'post_type'   => self::POST_TYPE,
            'post_title'  => $quoteRef,
            'post_status' => 'publish',
        ], true);

        if (is_wp_error($postId)) {
            return 0;
        }

        $postId = (int) $postId;

        update_post_meta($postId, self::META_REF,    $quoteRef);
        update_post_meta($postId, self::META_DATA,   $data);
        update_post_meta($postId, self::META_STATUS, RequestLifecycle::STATUS_NEW);

        return $postId;
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

        return (bool) update_post_meta($postId, self::META_STATUS, $status);
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

    // ── Private ───────────────────────────────────────────────────────────────

    /** Exact-match lookup by cz_request_ref meta. Returns post ID or null. */
    private function findPostIdByRef(string $ref): ?int
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

    /** Build the normalized record shape from a cz_request post. */
    private function hydrate(\WP_Post $post): array
    {
        $data   = get_post_meta($post->ID, self::META_DATA, true);
        $status = get_post_meta($post->ID, self::META_STATUS, true);
        $ref    = get_post_meta($post->ID, self::META_REF, true);

        return [
            'post_id'     => (int) $post->ID,
            'quote_ref'   => $ref ?: $post->post_title,
            'status'      => ($status !== '' && $status !== false) ? $status : RequestLifecycle::STATUS_NEW,
            'accepted_at' => is_array($data) ? ($data['accepted_at'] ?? '') : '',
            'data'        => is_array($data) ? $data : [],
        ];
    }
}
