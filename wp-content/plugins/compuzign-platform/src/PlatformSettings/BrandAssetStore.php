<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformSettings;

/**
 * Platform-owned port for durable brand image bytes.
 *
 * A key is opaque platform data (`<sha256>.<ext>`): the Profile stores keys,
 * never host paths, attachment identities, or absolute URLs. Stored content
 * is immutable — the same key always names the same bytes — so a committed
 * Profile can never be left pointing at a half-written file.
 */
interface BrandAssetStore
{
    /** Persist bytes and return their content-addressed key. Idempotent. */
    public function put(string $bytes, string $extension): string;

    public function exists(string $key): bool;

    /** Public URL for a stored key, or null when it is missing. */
    public function url(string $key): ?string;

    public function delete(string $key): void;

    /** @return array<string, int> stored key => last-modified Unix time */
    public function keys(): array;

    /** Remove interrupted temporary writes older than the given age. */
    public function sweepTemporary(int $olderThanSeconds): void;
}
