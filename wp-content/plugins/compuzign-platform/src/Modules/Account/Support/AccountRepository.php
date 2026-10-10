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
 *   SECTION: LOCK — serializes every read-modify-write of the aggregate
 *   SECTION: INTERNALS — option read/write and defaults
 *
 * CONCURRENCY
 * update_option() is a blind whole-value write, not compare-and-swap, so two
 * overlapping requests that each read, change and rewrite the aggregate could
 * silently drop one another's change. Every mutation therefore runs inside
 * withLock(), a narrow Account-only mutex built on the same atomic primitive
 * PlatformIdentifierStation and RequestRepository already rely on:
 * add_option()'s DB-level unique option_name. The lock value is one opaque
 * "{token}|{claimedAt}" string; release and stale takeover are compare-and-swap
 * against the exact value this request observed, never a blind write.
 */
final class AccountRepository
{
    public const OPTION_KEY = 'cz_account_station_v1';
    private const VERSION   = 1;

    public const LOCK_OPTION_KEY = 'cz_account_station_lock_v1';
    private const LOCK_TTL_SECONDS = 10;

    /** Lock claimed by THIS instance (null when not held) — makes withLock() re-entrant within one request. */
    private ?string $heldLock = null;
    private int $lockDepth    = 0;

    public function __construct(private int $lockAttempts = 40, private int $lockPollMicros = 50_000) {}

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

    public function writeNode(string $node, string $platformId, ?string $parentPlatformId): void
    {
        $this->withLock(function () use ($node, $platformId, $parentPlatformId): void {
            $state = $this->read();
            $state['nodes'][$node] = [
                'platform_id'        => $platformId,
                'parent_platform_id' => $parentPlatformId,
            ];
            $this->write($state);
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

    public function writeBrandDraft(array $draft): void
    {
        $this->withLock(function () use ($draft): void {
            $state = $this->read();
            $state['brand_draft'] = $draft;
            $this->write($state);
        });
    }

    /** Commits the current draft to canonical Brand and clears it. No-op (returns canonical) if there is no draft. */
    public function settleBrandDraft(): array
    {
        return $this->withLock(function (): array {
            $state = $this->read();
            if ($state['brand_draft'] !== null) {
                // A draft saved before the media-reference fields existed lacks those keys;
                // fill them from the defaults so canonical Brand always carries the full shape.
                $state['brand']       = array_replace($this->defaults()['brand'], $state['brand_draft']);
                $state['brand_draft'] = null;
                $this->write($state);
            }

            return $state['brand'];
        });
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
        $this->withLock(function () use ($id, $record): void {
            $state               = $this->read();
            $state['media'][$id] = $record;
            $this->write($state);
        });
    }

    // =====================================================================
    // SECTION: LIFECYCLE
    // =====================================================================

    /** @return array{platform_status: string, previous_platform_status: string, module_status: array{brand: string}} */
    public function readLifecycle(): array
    {
        $state = $this->read();

        return [
            'platform_status'          => $state['platform_status'],
            'previous_platform_status' => $state['previous_platform_status'],
            'module_status'            => $state['module_status'],
        ];
    }

    public function writeLifecycle(string $platformStatus, string $previousPlatformStatus, array $moduleStatus): void
    {
        $this->withLock(function () use ($platformStatus, $previousPlatformStatus, $moduleStatus): void {
            $state                             = $this->read();
            $state['platform_status']          = $platformStatus;
            $state['previous_platform_status'] = $previousPlatformStatus;
            $state['module_status']            = $moduleStatus;
            $this->write($state);
        });
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
    // SECTION: LOCK
    // =====================================================================

    /**
     * Runs $operation with exclusive access to the aggregate. Re-entrant within
     * this instance. Waits a bounded time for another request's lock, then
     * throws AccountStorageBusy rather than proceeding unprotected.
     *
     * @template T
     * @param callable(): T $operation
     * @return T
     */
    public function withLock(callable $operation): mixed
    {
        if ($this->lockDepth === 0) {
            $this->heldLock = $this->acquireLock();
        }
        $this->lockDepth++;

        try {
            return $operation();
        } finally {
            $this->lockDepth--;
            if ($this->lockDepth === 0 && $this->heldLock !== null) {
                $this->releaseLock($this->heldLock);
                $this->heldLock = null;
            }
        }
    }

    private function acquireLock(): string
    {
        for ($attempt = 0; $attempt < $this->lockAttempts; $attempt++) {
            $value = bin2hex(random_bytes(16)) . '|' . time();
            if (add_option(self::LOCK_OPTION_KEY, $value, '', 'no')) {
                return $value;
            }

            $observed = get_option(self::LOCK_OPTION_KEY, null);
            if (is_string($observed) && $this->isLockStale($observed) && $this->takeOverLock($observed, $value)) {
                return $value;
            }

            usleep($this->lockPollMicros);
        }

        throw new AccountStorageBusy('Account Station storage is busy.');
    }

    private function isLockStale(string $lockValue): bool
    {
        $claimedAt = (int) (explode('|', $lockValue, 2)[1] ?? 0);

        return $claimedAt <= 0 || (time() - $claimedAt) > self::LOCK_TTL_SECONDS;
    }

    /** Single conditional UPDATE against the exact bytes last observed; false if the row changed since. */
    private function takeOverLock(string $observed, string $newValue): bool
    {
        global $wpdb;

        $affected = $wpdb->query($wpdb->prepare(
            "UPDATE {$wpdb->options} SET option_value = %s WHERE option_name = %s AND option_value = %s",
            $newValue,
            self::LOCK_OPTION_KEY,
            $observed
        ));
        wp_cache_delete(self::LOCK_OPTION_KEY, 'options');

        return $affected === 1;
    }

    /** No-op if the stored value is no longer ours (the lock went stale and was taken over). */
    private function releaseLock(string $value): void
    {
        global $wpdb;

        $wpdb->query($wpdb->prepare(
            "DELETE FROM {$wpdb->options} WHERE option_name = %s AND option_value = %s",
            self::LOCK_OPTION_KEY,
            $value
        ));
        wp_cache_delete(self::LOCK_OPTION_KEY, 'options');
    }

    // =====================================================================
    // SECTION: INTERNALS
    // =====================================================================

    /** @return array<string, mixed> */
    private function read(): array
    {
        $stored = get_option(self::OPTION_KEY, null);
        $state  = is_array($stored) ? $stored : [];

        return array_replace_recursive($this->defaults(), $state);
    }

    private function write(array $state): void
    {
        $state['version'] = self::VERSION;
        update_option(self::OPTION_KEY, $state, false);
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
