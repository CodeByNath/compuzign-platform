<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformIdentifier;

/**
 * PlatformIdentifierStation — permanent Platform identity authority.
 *
 * The Station owns format, reservation, identity binding, lookup, tombstones,
 * and bounded assignment. Domain owners retain native creation, persistence,
 * lifecycle, validation, projection, and every non-identity mutation.
 *
 * FILE INDEX
 *   SECTION: GENERATION_AND_RESERVATION — policy-driven candidates and claims
 *   SECTION: ASSIGNMENT_AND_LOOKUP — immutable binding, ensure, lookup, deletion
 *   SECTION: BOUNDED_ASSIGNMENT — owner-callback migration batches
 *   SECTION: REGISTRY_INTERNALS — exact option claims, reads, and verification
 */
final class PlatformIdentifierStation
{
    public const REGISTRY_VERSION = 1;
    public const META_KEY = 'cz_platform_id';

    public const STATUS_RESERVED = 'reserved';
    public const STATUS_BOUND    = 'bound';
    public const STATUS_RETIRED  = 'retired';
    public const STATUS_DELETED  = 'deleted';

    private const FORWARD_PREFIX = 'cz_platform_identifier_v1_';
    private const REVERSE_PREFIX = 'cz_platform_identifier_native_v1_';
    private const MAX_RESERVATION_ATTEMPTS = 128;

    private \Closure $randomInteger;

    /** @param callable(int, int): int|null $randomInteger Test seam only; production uses random_int(). */
    public function __construct(?callable $randomInteger = null)
    {
        $this->randomInteger = $randomInteger === null
            ? static fn(int $minimum, int $maximum): int => random_int($minimum, $maximum)
            : \Closure::fromCallable($randomInteger);
    }

    // =====================================================================
    // SECTION: GENERATION_AND_RESERVATION
    // =====================================================================

    public function generate(string $entityType): PlatformIdentifier
    {
        $prefix   = PlatformIdentifierPolicy::prefix($entityType);
        $alphabet = PlatformIdentifierPolicy::ALPHABET;
        $maximum  = strlen($alphabet) - 1;
        $suffix   = '';

        for ($i = 0; $i < PlatformIdentifierPolicy::SUFFIX_LENGTH; $i++) {
            $index = ($this->randomInteger)(0, $maximum);
            if (!is_int($index) || $index < 0 || $index > $maximum) {
                throw new \UnexpectedValueException('Platform identifier random source returned an out-of-range value.');
            }
            $suffix .= $alphabet[$index];
        }

        return new PlatformIdentifier($entityType, $prefix . $suffix);
    }

    public function validate(string $entityType, string $platformId): bool
    {
        return PlatformIdentifierPolicy::validate($entityType, $platformId);
    }

    /**
     * @param callable(string): bool|null $authoritativeIdExists During rollout,
     *        the owner checks its authoritative storage for unregistered IDs.
     */
    public function reserve(string $entityType, ?callable $authoritativeIdExists = null): PlatformIdentifierReservation
    {
        PlatformIdentifierPolicy::prefix($entityType);

        for ($attempt = 0; $attempt < self::MAX_RESERVATION_ATTEMPTS; $attempt++) {
            $identifier = $this->generate($entityType);
            $platformId = $identifier->value();
            $now        = $this->now();
            $record     = [
                'version'          => self::REGISTRY_VERSION,
                'platform_id'      => $platformId,
                'entity_type'      => $entityType,
                'native_reference' => null,
                'status'           => self::STATUS_RESERVED,
                'created_at'       => $now,
                'updated_at'       => $now,
            ];

            if (!$this->claimOption($this->forwardKey($platformId), $record)) {
                continue;
            }

            if ($authoritativeIdExists !== null && (bool) $authoritativeIdExists($platformId)) {
                $this->retireRecord($record);
                continue;
            }

            return new PlatformIdentifierReservation($identifier);
        }

        throw PlatformIdentifierConflict::registry('could not reserve a unique candidate within the attempt limit.');
    }

    public function retire(PlatformIdentifierReservation $reservation): void
    {
        $record = $this->requireForwardRecord($reservation->platformId());
        $this->assertRecordIdentity($record, $reservation->entityType(), $reservation->platformId());

        if (($record['status'] ?? null) !== self::STATUS_RESERVED) {
            throw PlatformIdentifierConflict::registry('only an unbound reservation can be retired.');
        }

        $this->retireRecord($record);
    }

    // =====================================================================
    // SECTION: ASSIGNMENT_AND_LOOKUP
    // =====================================================================

    /**
     * @param callable(int|string): mixed $readStoredPlatformId
     * @param callable(int|string, string): mixed $writeStoredPlatformId
     */
    public function assign(
        PlatformIdentifierReservation $reservation,
        int|string $nativeReference,
        callable $readStoredPlatformId,
        callable $writeStoredPlatformId
    ): PlatformIdentifierBinding {
        $platformId = $reservation->platformId();
        $entityType = $reservation->entityType();
        $record     = $this->requireForwardRecord($platformId);
        $this->assertRecordIdentity($record, $entityType, $platformId);

        if (($record['status'] ?? null) !== self::STATUS_RESERVED) {
            throw PlatformIdentifierConflict::registry('assignment requires an active reservation.');
        }

        $existing = $this->normalizeStoredId($readStoredPlatformId($nativeReference));
        if ($existing !== '' && $existing !== $platformId) {
            throw PlatformIdentifierConflict::immutable($existing, $platformId);
        }

        if ($existing === '') {
            $writeStoredPlatformId($nativeReference, $platformId);
        }

        $stored = $this->normalizeStoredId($readStoredPlatformId($nativeReference));
        if ($stored !== $platformId) {
            throw PlatformIdentifierConflict::registry('authoritative storage did not read back the reserved identifier exactly.');
        }

        $this->claimReverse($entityType, $nativeReference, $platformId, self::STATUS_BOUND);

        $record['native_reference'] = $nativeReference;
        $record['status']           = self::STATUS_BOUND;
        $record['updated_at']       = $this->now();
        $this->writeAndVerify($this->forwardKey($platformId), $record);

        return $this->bindingFromRecord($record);
    }

    /**
     * @param callable(int|string): mixed $readStoredPlatformId
     * @param callable(int|string, string): mixed $writeStoredPlatformId
     * @param callable(string): bool|null $authoritativeIdExists
     */
    public function ensure(
        string $entityType,
        int|string $nativeReference,
        callable $readStoredPlatformId,
        callable $writeStoredPlatformId,
        ?callable $authoritativeIdExists = null
    ): PlatformIdentifierBinding {
        PlatformIdentifierPolicy::prefix($entityType);
        $stored = $this->normalizeStoredId($readStoredPlatformId($nativeReference));

        if ($stored === '') {
            $reservation = $this->reserve($entityType, $authoritativeIdExists);
            return $this->assign($reservation, $nativeReference, $readStoredPlatformId, $writeStoredPlatformId);
        }

        if (!$this->validate($entityType, $stored)) {
            throw PlatformIdentifierConflict::invalidIdentifier($entityType, $stored);
        }

        $reverse = get_option($this->reverseKey($entityType, $nativeReference), null);
        if (is_array($reverse)) {
            $this->assertBindingRecord($reverse, $entityType, $nativeReference, $stored);
            if (($reverse['status'] ?? null) !== self::STATUS_BOUND) {
                throw PlatformIdentifierConflict::registry('a deleted native binding cannot be restored by ensure().');
            }
        }

        $forwardKey = $this->forwardKey($stored);
        $forward    = get_option($forwardKey, null);
        if (is_array($forward)) {
            $this->assertBindingRecord($forward, $entityType, $nativeReference, $stored);
            if (($forward['status'] ?? null) !== self::STATUS_BOUND) {
                throw PlatformIdentifierConflict::registry('the stored identifier is already reserved, retired, or deleted.');
            }
        } else {
            $now     = $this->now();
            $forward = [
                'version'          => self::REGISTRY_VERSION,
                'platform_id'      => $stored,
                'entity_type'      => $entityType,
                'native_reference' => $nativeReference,
                'status'           => self::STATUS_BOUND,
                'created_at'       => $now,
                'updated_at'       => $now,
            ];
            if (!$this->claimOption($forwardKey, $forward)) {
                $forward = $this->requireForwardRecord($stored);
                $this->assertBindingRecord($forward, $entityType, $nativeReference, $stored);
                if (($forward['status'] ?? null) !== self::STATUS_BOUND) {
                    throw PlatformIdentifierConflict::registry('the stored identifier became unavailable during registration.');
                }
            }
        }

        $this->claimReverse($entityType, $nativeReference, $stored, self::STATUS_BOUND);

        return $this->bindingFromRecord($forward);
    }

    public function resolve(string $platformId): ?PlatformIdentifierBinding
    {
        $entityType = PlatformIdentifierPolicy::entityTypeFor($platformId);
        if ($entityType === null) {
            return null;
        }

        $record = get_option($this->forwardKey($platformId), null);
        if (!is_array($record)) {
            return null;
        }

        $this->assertRecordIdentity($record, $entityType, $platformId);

        return $this->bindingFromRecord($record);
    }

    public function lookupNative(string $entityType, int|string $nativeReference): ?PlatformIdentifierBinding
    {
        PlatformIdentifierPolicy::prefix($entityType);
        $record = get_option($this->reverseKey($entityType, $nativeReference), null);
        if (!is_array($record)) {
            return null;
        }

        $platformId = (string) ($record['platform_id'] ?? '');
        $this->assertBindingRecord($record, $entityType, $nativeReference, $platformId);

        $forward = $this->requireForwardRecord($platformId);
        $this->assertBindingRecord($forward, $entityType, $nativeReference, $platformId);
        if (($forward['status'] ?? null) !== ($record['status'] ?? null)) {
            throw PlatformIdentifierConflict::registry('forward and reverse binding states disagree.');
        }

        return $this->bindingFromRecord($forward);
    }

    public function markDeleted(string $entityType, int|string $nativeReference): void
    {
        $binding = $this->lookupNative($entityType, $nativeReference);
        if ($binding === null) {
            throw PlatformIdentifierConflict::registry('cannot tombstone a missing native binding.');
        }
        if ($binding->isDeleted()) {
            return;
        }
        if (!$binding->isBound()) {
            throw PlatformIdentifierConflict::registry('only a bound identifier can be tombstoned.');
        }

        $reverseKey = $this->reverseKey($entityType, $nativeReference);
        $reverse    = get_option($reverseKey, null);
        $forwardKey = $this->forwardKey($binding->platformId());
        $forward    = get_option($forwardKey, null);
        if (!is_array($reverse) || !is_array($forward)) {
            throw PlatformIdentifierConflict::registry('binding disappeared during tombstone creation.');
        }

        $reverse['status']     = self::STATUS_DELETED;
        $reverse['updated_at'] = $this->now();
        $this->writeAndVerify($reverseKey, $reverse);

        $forward['status']     = self::STATUS_DELETED;
        $forward['updated_at'] = $this->now();
        $this->writeAndVerify($forwardKey, $forward);
    }

    // =====================================================================
    // SECTION: BOUNDED_ASSIGNMENT
    // =====================================================================

    /**
     * Enumerator result:
     * ['items' => list<int|string>, 'next_cursor' => int|string|null, 'complete' => bool]
     *
     * @param callable(int|string|null, int): array $enumerate
     * @param callable(int|string): mixed $readStoredPlatformId
     * @param callable(int|string, string): mixed $writeStoredPlatformId
     * @param callable(string): bool|null $authoritativeIdExists
     */
    public function assignExistingBatch(
        string $entityType,
        int|string|null $cursor,
        int $limit,
        callable $enumerate,
        callable $readStoredPlatformId,
        callable $writeStoredPlatformId,
        ?callable $authoritativeIdExists = null
    ): PlatformIdentifierBatchResult {
        PlatformIdentifierPolicy::prefix($entityType);
        if ($limit < 1 || $limit > 500) {
            throw new \InvalidArgumentException('Platform identifier batch limit must be between 1 and 500.');
        }

        $page = $enumerate($cursor, $limit);
        if (!is_array($page) || !is_array($page['items'] ?? null)) {
            throw new \UnexpectedValueException('Platform identifier batch enumerator returned an invalid page.');
        }

        $items = array_slice(array_values($page['items']), 0, $limit);
        $assigned = 0;
        $preserved = 0;
        $conflicts = [];

        foreach ($items as $nativeReference) {
            if (!is_int($nativeReference) && !is_string($nativeReference)) {
                throw new \UnexpectedValueException('Native references must be integers or strings.');
            }

            $before = $this->normalizeStoredId($readStoredPlatformId($nativeReference));
            try {
                $this->ensure(
                    $entityType,
                    $nativeReference,
                    $readStoredPlatformId,
                    $writeStoredPlatformId,
                    $authoritativeIdExists
                );
                if ($before === '') {
                    $assigned++;
                } else {
                    $preserved++;
                }
            } catch (PlatformIdentifierConflict $error) {
                $conflicts[] = [
                    'native_reference' => $nativeReference,
                    'message'          => $error->getMessage(),
                ];
            }
        }

        $nextCursor = $page['next_cursor'] ?? ($items === [] ? $cursor : $items[array_key_last($items)]);

        return new PlatformIdentifierBatchResult(
            $nextCursor,
            (bool) ($page['complete'] ?? count($items) < $limit),
            count($items),
            $assigned,
            $preserved,
            $conflicts
        );
    }

    // =====================================================================
    // SECTION: REGISTRY_INTERNALS
    // =====================================================================

    /** @param array<string, mixed> $record */
    private function retireRecord(array $record): void
    {
        $record['native_reference'] = null;
        $record['status']           = self::STATUS_RETIRED;
        $record['updated_at']       = $this->now();
        $this->writeAndVerify($this->forwardKey((string) $record['platform_id']), $record);
    }

    private function claimReverse(
        string $entityType,
        int|string $nativeReference,
        string $platformId,
        string $status
    ): void {
        $key = $this->reverseKey($entityType, $nativeReference);
        $now = $this->now();
        $record = [
            'version'          => self::REGISTRY_VERSION,
            'platform_id'      => $platformId,
            'entity_type'      => $entityType,
            'native_reference' => $nativeReference,
            'status'           => $status,
            'created_at'       => $now,
            'updated_at'       => $now,
        ];

        if ($this->claimOption($key, $record)) {
            return;
        }

        $existing = get_option($key, null);
        if (!is_array($existing)) {
            throw PlatformIdentifierConflict::registry('native reverse claim could not be read after an atomic collision.');
        }

        // A native reference address is reused whenever its prior occupant is
        // removed and a new one is later created at the same address (e.g. a
        // Rate Sheet row deleted, then a row re-added for the same source). The
        // reverse key is stable and content-addressed by (entity_type,
        // native_reference) alone, so that address's earlier claim is still
        // sitting here under a DIFFERENT, already-tombstoned platform id.
        // markDeleted() is what marks a claim as properly released — once it
        // has, the address is free for a completely different identifier to
        // claim fresh; requiring an exact record match (as for every other
        // status below) would permanently strand this address on its first
        // reuse, no matter how the failure is retried.
        if (($existing['status'] ?? null) === self::STATUS_DELETED
            && ($existing['entity_type'] ?? null) === $entityType
            && ($existing['native_reference'] ?? null) === $nativeReference
        ) {
            $this->writeAndVerify($key, $record);
            return;
        }

        $this->assertBindingRecord($existing, $entityType, $nativeReference, $platformId);
        if (($existing['status'] ?? null) !== $status) {
            throw PlatformIdentifierConflict::registry('native reverse binding has a conflicting state.');
        }
    }

    /** @return array<string, mixed> */
    private function requireForwardRecord(string $platformId): array
    {
        $record = get_option($this->forwardKey($platformId), null);
        if (!is_array($record)) {
            throw PlatformIdentifierConflict::registry("missing forward record for '{$platformId}'.");
        }

        return $record;
    }

    /** @param array<string, mixed> $record */
    private function assertRecordIdentity(array $record, string $entityType, string $platformId): void
    {
        if (($record['version'] ?? null) !== self::REGISTRY_VERSION
            || ($record['entity_type'] ?? null) !== $entityType
            || ($record['platform_id'] ?? null) !== $platformId
        ) {
            throw PlatformIdentifierConflict::registry('record identity or version does not match the requested identifier.');
        }
    }

    /** @param array<string, mixed> $record */
    private function assertBindingRecord(
        array $record,
        string $entityType,
        int|string $nativeReference,
        string $platformId
    ): void {
        $this->assertRecordIdentity($record, $entityType, $platformId);
        if (($record['native_reference'] ?? null) !== $nativeReference) {
            throw PlatformIdentifierConflict::registry('one identifier or native reference is already bound elsewhere.');
        }
    }

    /** @param array<string, mixed> $record */
    private function bindingFromRecord(array $record): PlatformIdentifierBinding
    {
        $entityType = (string) ($record['entity_type'] ?? '');
        $platformId = (string) ($record['platform_id'] ?? '');
        $this->assertRecordIdentity($record, $entityType, $platformId);

        $status = (string) ($record['status'] ?? '');
        if (!in_array($status, [self::STATUS_RESERVED, self::STATUS_BOUND, self::STATUS_RETIRED, self::STATUS_DELETED], true)) {
            throw PlatformIdentifierConflict::registry('record contains an unknown binding state.');
        }

        $nativeReference = $record['native_reference'] ?? null;
        if ($nativeReference !== null && !is_int($nativeReference) && !is_string($nativeReference)) {
            throw PlatformIdentifierConflict::registry('record contains an invalid native reference.');
        }

        return new PlatformIdentifierBinding(
            new PlatformIdentifier($entityType, $platformId),
            $nativeReference,
            $status
        );
    }

    /** @param array<string, mixed> $record */
    private function writeAndVerify(string $key, array $record): void
    {
        update_option($key, $record, false);
        if (get_option($key, null) !== $record) {
            throw PlatformIdentifierConflict::registry("option '{$key}' did not read back exactly after update.");
        }
    }

    /** @param array<string, mixed> $record */
    private function claimOption(string $key, array $record): bool
    {
        if (!add_option($key, $record, '', 'no')) {
            return false;
        }
        if (get_option($key, null) !== $record) {
            throw PlatformIdentifierConflict::registry("option '{$key}' did not read back exactly after its atomic claim.");
        }

        return true;
    }

    private function normalizeStoredId(mixed $value): string
    {
        return is_string($value) ? $value : '';
    }

    private function forwardKey(string $platformId): string
    {
        return self::FORWARD_PREFIX . $platformId;
    }

    private function reverseKey(string $entityType, int|string $nativeReference): string
    {
        $address = get_debug_type($nativeReference) . ':' . (string) $nativeReference;

        return self::REVERSE_PREFIX . $entityType . '_' . hash('sha256', $address);
    }

    private function now(): string
    {
        return gmdate('c');
    }
}
