<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier;

use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierBatchResult;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierBinding;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierConflict;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierReservation;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

final class PackagePlatformIdentifierService
{
    public function __construct(private PlatformIdentifierStation $identifiers) {}

    public function reserve(PackagePlatformIdentifierAdapter $adapter): PlatformIdentifierReservation
    {
        return $this->identifiers->reserve(
            $adapter->entityType(),
            fn(string $platformId): bool => $adapter->storedCollision($platformId)
        );
    }

    public function bind(
        PackagePlatformIdentifierAdapter $adapter,
        PlatformIdentifierReservation $reservation,
        int|string $nativeReference
    ): PlatformIdentifierBinding {
        if ($reservation->entityType() !== $adapter->entityType()) {
            throw PlatformIdentifierConflict::registry('reservation entity type does not match the Package adapter.');
        }

        return $this->identifiers->assign(
            $reservation,
            $nativeReference,
            fn(int|string $reference): mixed => $adapter->readStored($reference),
            fn(int|string $reference, string $platformId): mixed => $adapter->claimStored($reference, $platformId)
        );
    }

    public function retire(PlatformIdentifierReservation $reservation): void
    {
        $this->identifiers->retire($reservation);
    }

    public function assignExisting(
        PackagePlatformIdentifierAdapter $adapter,
        int|string|null $cursor,
        int $limit
    ): PlatformIdentifierBatchResult {
        return $this->identifiers->assignExistingBatch(
            $adapter->entityType(),
            $cursor,
            $limit,
            fn(int|string|null $after, int $pageSize): array => $adapter->enumerate($after, $pageSize),
            fn(int|string $reference): mixed => $adapter->readStored($reference),
            fn(int|string $reference, string $platformId): mixed => $adapter->claimStored($reference, $platformId),
            fn(string $platformId): bool => $adapter->storedCollision($platformId)
        );
    }

    public function resolveProjection(PackagePlatformIdentifierAdapter $adapter, string $platformId): mixed
    {
        $binding = $this->identifiers->resolve($platformId);
        if ($binding === null || !$binding->isBound() || $binding->entityType() !== $adapter->entityType()) {
            return null;
        }
        $nativeReference = $binding->nativeReference();
        if (!is_int($nativeReference) && !is_string($nativeReference)) {
            return null;
        }
        return $adapter->project($nativeReference);
    }

    public function tombstone(PackagePlatformIdentifierAdapter $adapter, int|string $nativeReference): void
    {
        $this->identifiers->markDeleted($adapter->entityType(), $nativeReference);
    }
}
