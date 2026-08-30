<?php

namespace CompuZign\Platform\Modules\Requests\Support;

/**
 * Phase 8J-C1: the cryptographically strong, unguessable secret that gates
 * customer read access to one stored quote snapshot — the short `CZ-xxxxxx`
 * quote reference (RequestSchema::resolveQuoteRef()) is identification only
 * and must never by itself be sufficient to retrieve customer quote data.
 * Only the one-way hash is ever persisted (see RequestsController); the raw
 * secret exists only transiently in memory at generation/verification time.
 */
class QuoteViewSecret
{
    /**
     * 32 bytes (256 bits) from PHP's CSPRNG, hex-encoded — plenty of entropy
     * to be unguessable, and URL-safe without further encoding.
     */
    public static function generate(): string
    {
        return bin2hex(random_bytes(32));
    }

    /**
     * A fast one-way hash is appropriate here (unlike a user-chosen
     * password): the input space is already a full-entropy random secret,
     * not something brute-forceable via a dictionary.
     */
    public static function hash(string $secret): string
    {
        return hash('sha256', $secret);
    }

    /**
     * Constant-time comparison (hash_equals()) so a wrong-secret response
     * never leaks timing information about how much of the hash matched.
     */
    public static function verify(string $secret, string $storedHash): bool
    {
        return hash_equals($storedHash, self::hash($secret));
    }
}
