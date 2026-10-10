<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\Account\Support;

/**
 * AccountRepository — the one non-autoloaded WordPress option backing Account
 * Station's entire singleton tree: the four identity nodes, Brand's canonical
 * and draft fields, and lifecycle state. There is exactly one row for each of
 * these, forever; this is a read-modify-write aggregate, not a collection.
 *
 * FILE INDEX
 *   SECTION: NODES — the four identity-bearing singleton records
 *   SECTION: BRAND — canonical and draft field storage
 *   SECTION: MEDIA — metadata for Account-owned Logo/Favicon image files
 *   SECTION: LIFECYCLE — platform_status / module_status
 *   SECTION: COMMIT — the one compare-and-swap write path
 *   SECTION: INTERNALS — direct option read and defaults
 *
 * CONCURRENCY
 * Correctness never depends on a lock, lease or TTL. Every mutation is
 * commit(): read the row straight from the database (never get_option(), so a
 * persistent object cache cannot supply a stale value), run a pure mutator on
 * that state, then write with ONE conditional statement that succeeds only if
 * the row still holds the exact bytes the mutator was derived from. A paused,
 * slow or stale request therefore cannot overwrite newer state: its write
 * simply fails, and the mutator is re-run on fresh state. A missing row is
 * created with INSERT IGNORE against the unique option_name; the loser retries.
 * Mutators are repeatable and side-effect free — they never allocate
 * identifiers, touch files or send anything.
 */
final class AccountRepository
{
    public const OPTION_KEY = 'cz_account_station_v1';
    private const VERSION   = 1;

    /** Each failed attempt means another writer committed, so the bound is generous but finite. */
    public function __construct(private int $commitAttempts = 40, private int $retryJitterMicros = 20_000) {}

    /** @var array<string, int> */
    public const NODES = ['account_station' => 0, 'settings' => 1, 'tools' => 2, 'profile' => 3];

    // =====================================================================
    // SECTION: NODES
    // =====================================================================

    public function readNodePlatformId(string $node): string
    {
        $state = $this->read();

        return (string) ($state['nodes'][$node]['platform_id'] ?? '');
    }

    public function readNodeParentPlatformId(string $node): ?string
    {
        $state  = $this->read();
        $parent = $state['nodes'][$node]['parent_platform_id'] ?? null;

        return $parent === null ? null : (string) $parent;
    }

    /**
     * Binds a node only while it is still unbound. A node that already holds a
     * Platform ID is left exactly as it is (identity is immutable), so of any
     * number of racing first-Saves only the first commit's ID is ever stored;
     * the Station's own read-back then rejects every loser.
     */
    public function writeNode(string $node, string $platformId, ?string $parentPlatformId): void
    {
        $this->commit(function (array $state) use ($node, $platformId, $parentPlatformId): ?array {
            if (($state['nodes'][$node]['platform_id'] ?? '') !== '') {
                return null;
            }
            $state['nodes'][$node] = [
                'platform_id'        => $platformId,
                'parent_platform_id' => $parentPlatformId,
            ];

            return $state;
        });
    }

    /** @return array<string, array{platform_id: string, parent_platform_id: ?string}> */
    public function readNodes(): array
    {
        return $this->read()['nodes'];
    }

    // =====================================================================
    // SECTION: BRAND
    // =====================================================================

    /** @return array{name: string, code: string, logo_attachment_id: ?int, favicon_attachment_id: ?int, logo_media_id: ?string, favicon_media_id: ?string} */
    public function readBrand(): array
    {
        return $this->read()['brand'];
    }

    /** @return ?array{name: string, code: string, logo_attachment_id: ?int, favicon_attachment_id: ?int, logo_media_id: ?string, favicon_media_id: ?string} */
    public function readBrandDraft(): ?array
    {
        return $this->read()['brand_draft'];
    }

    /**
     * Stores the Brand draft and applies $lifecycleFn to the lifecycle in the
     * SAME commit, so a Save is never half-recorded. $lifecycleFn receives the
     * fresh lifecycle and returns the new one. Returns the committed lifecycle.
     *
     * @param callable(array): array $lifecycleFn
     * @return array{platform_status: string, previous_platform_status: string, module_status: array{brand: string}}
     */
    public function saveBrandDraft(array $draft, callable $lifecycleFn): array
    {
        $state = $this->commit(function (array $state) use ($draft, $lifecycleFn): array {
            $state['brand_draft'] = $draft;

            return $this->withLifecycle($state, $lifecycleFn($this->lifecycleOf($state)));
        });

        return $this->lifecycleOf($state);
    }

    /**
     * Commits the current draft (if any) to canonical Brand and clears it, and
     * applies $lifecycleFn in the same commit.
     *
     * @param callable(array): array $lifecycleFn
     * @return array{brand: array, lifecycle: array}
     */
    public function settleBrandDraft(callable $lifecycleFn): array
    {
        $state = $this->commit(function (array $state) use ($lifecycleFn): array {
            if ($state['brand_draft'] !== null) {
                // A draft saved before the media-reference fields existed lacks those keys;
                // fill them from the defaults so canonical Brand always carries the full shape.
                $state['brand']       = array_replace($this->defaults()['brand'], $state['brand_draft']);
                $state['brand_draft'] = null;
            }

            return $this->withLifecycle($state, $lifecycleFn($this->lifecycleOf($state)));
        });

        return ['brand' => $state['brand'], 'lifecycle' => $this->lifecycleOf($state)];
    }

    // =====================================================================
    // SECTION: MEDIA
    // =====================================================================

    /** @return array<string, array{file: string, name: string, mime: string, size: int, uploaded_at: int}> keyed by content hash */
    public function readMedia(): array
    {
        return $this->read()['media'];
    }

    public function writeMediaRecord(string $id, array $record): void
    {
        $this->commit(function (array $state) use ($id, $record): array {
            $state['media'][$id] = $record;

            return $state;
        });
    }

    // =====================================================================
    // SECTION: LIFECYCLE
    // =====================================================================

    /** @return array{platform_status: string, previous_platform_status: string, module_status: array{brand: string}} */
    public function readLifecycle(): array
    {
        return $this->lifecycleOf($this->read());
    }

    /**
     * Recomputes the lifecycle from the freshest committed state. $fn receives
     * the current lifecycle and returns the new one, or null to refuse (nothing
     * is written). It may run more than once, so it must be repeatable and
     * side-effect free — capture a refusal reason in a local variable, never act on it.
     *
     * @param callable(array): ?array $fn
     * @return array{platform_status: string, previous_platform_status: string, module_status: array{brand: string}} the committed (or, on refusal, the current) lifecycle
     */
    public function updateLifecycle(callable $fn): array
    {
        $state = $this->commit(function (array $state) use ($fn): ?array {
            $next = $fn($this->lifecycleOf($state));

            return $next === null ? null : $this->withLifecycle($state, $next);
        });

        return $this->lifecycleOf($state);
    }

    /** The one existence predicate every lifecycle route shares: true only once all four chain nodes are bound, not just the leaf. */
    public function isBootstrapped(): bool
    {
        foreach (array_keys(self::NODES) as $node) {
            if ($this->readNodePlatformId($node) === '') {
                return false;
            }
        }

        return true;
    }

    // =====================================================================
    // SECTION: COMMIT
    // =====================================================================

    /**
     * The only write path. $mutator receives the freshly read state and returns
     * the new state, or null for "nothing to change". It is re-run on a fresh
     * read whenever another writer committed first, so it must be repeatable
     * and free of side effects. After the bounded attempts the commit fails
     * closed with AccountStorageBusy and writes nothing.
     *
     * @param callable(array): ?array $mutator
     * @return array<string, mixed> the committed state (the unchanged state for a no-op)
     */
    private function commit(callable $mutator): array
    {
        for ($attempt = 0; $attempt < $this->commitAttempts; $attempt++) {
            $raw   = $this->readRaw();
            $state = $this->decode($raw);
            $next  = $mutator($state);

            if ($next === null) {
                return $state;
            }

            $next['version'] = self::VERSION;
            $bytes           = maybe_serialize($next);

            // Identical bytes: the row already holds exactly this state, and a
            // conditional UPDATE would report 0 changed rows. Nothing to write.
            if ($raw !== null && $bytes === $raw) {
                return $next;
            }

            if ($this->compareAndSet($raw, $bytes)) {
                return $next;
            }

            usleep(random_int(500, max(500, $this->retryJitterMicros)));
        }

        throw new AccountStorageBusy('Account Station storage is busy.');
    }

    /** One atomic statement: true only if the row still held exactly $expectedRaw (or did not exist, for null). */
    private function compareAndSet(?string $expectedRaw, string $bytes): bool
    {
        global $wpdb;

        if ($expectedRaw === null) {
            $affected = $wpdb->query($wpdb->prepare(
                "INSERT IGNORE INTO {$wpdb->options} (option_name, option_value, autoload) VALUES (%s, %s, %s)",
                self::OPTION_KEY,
                $bytes,
                'no'
            ));
        } else {
            // BINARY: the options collation is case- and pad-insensitive, so a
            // plain "=" would call two different states equal and let a stale
            // writer win. The comparison must be byte-exact.
            $affected = $wpdb->query($wpdb->prepare(
                "UPDATE {$wpdb->options} SET option_value = %s WHERE option_name = %s AND BINARY option_value = %s",
                $bytes,
                self::OPTION_KEY,
                $expectedRaw
            ));
        }

        // The statements above bypass update_option(); drop any cached copy.
        wp_cache_delete(self::OPTION_KEY, 'options');
        wp_cache_delete('notoptions', 'options');

        return $affected === 1;
    }

    // =====================================================================
    // SECTION: INTERNALS
    // =====================================================================

    /** @return array<string, mixed> */
    private function read(): array
    {
        return $this->decode($this->readRaw());
    }

    /** The stored bytes straight from the database; null when the row does not exist. */
    private function readRaw(): ?string
    {
        global $wpdb;

        $raw = $wpdb->get_var($wpdb->prepare(
            "SELECT option_value FROM {$wpdb->options} WHERE option_name = %s",
            self::OPTION_KEY
        ));

        return is_string($raw) ? $raw : null;
    }

    /** @return array<string, mixed> */
    private function decode(?string $raw): array
    {
        $stored = $raw === null ? null : maybe_unserialize($raw);
        $state  = is_array($stored) ? $stored : [];

        return array_replace_recursive($this->defaults(), $state);
    }

    /** @return array{platform_status: string, previous_platform_status: string, module_status: array{brand: string}} */
    private function lifecycleOf(array $state): array
    {
        return [
            'platform_status'          => $state['platform_status'],
            'previous_platform_status' => $state['previous_platform_status'],
            'module_status'            => $state['module_status'],
        ];
    }

    /** @param array{platform_status: string, previous_platform_status: string, module_status: array} $lifecycle */
    private function withLifecycle(array $state, array $lifecycle): array
    {
        $state['platform_status']          = $lifecycle['platform_status'];
        $state['previous_platform_status'] = $lifecycle['previous_platform_status'];
        $state['module_status']            = $lifecycle['module_status'];

        return $state;
    }

    /** @return array<string, mixed> */
    private function defaults(): array
    {
        $emptyNode = ['platform_id' => '', 'parent_platform_id' => null];

        return [
            'version' => self::VERSION,
            'nodes'   => array_fill_keys(array_keys(self::NODES), $emptyNode),
            'brand'   => [
                'name' => '', 'code' => '',
                'logo_attachment_id' => null, 'favicon_attachment_id' => null,
                'logo_media_id' => null, 'favicon_media_id' => null,
            ],
            'media'   => [],
            'brand_draft'               => null,
            'platform_status'          => 'disabled',
            'previous_platform_status' => '',
            'module_status'            => ['brand' => 'not-configured'],
        ];
    }
}
