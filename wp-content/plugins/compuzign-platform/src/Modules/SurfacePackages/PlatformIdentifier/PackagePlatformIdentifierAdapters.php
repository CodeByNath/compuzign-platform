<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier;

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;

final class PackagePlatformIdentifierAdapters
{
    public function __construct(private PackageRepository $packages) {}

    public function tierGroup(): PackagePlatformIdentifierAdapter
    {
        return new PackagePlatformIdentifierAdapter(
            PlatformIdentifierPolicy::TIER_GROUP,
            fn(int|string|null $cursor, int $limit): array => $this->packages->tierGroupAssignmentPage(
                is_string($cursor) && $cursor !== '' ? $cursor : null,
                $limit
            ),
            fn(int|string $reference): string => $this->packages->tierGroupPlatformId((string) $reference),
            fn(int|string $reference, string $platformId): bool => $this->packages->claimTierGroupPlatformId((string) $reference, $platformId),
            fn(string $platformId): bool => $this->packages->tierGroupPlatformIdExists($platformId),
            fn(int|string $reference): ?array => $this->packages->tierGroupProjection((string) $reference)
        );
    }

    public function tier(): PackagePlatformIdentifierAdapter
    {
        return $this->tierOccupantAdapter(PlatformIdentifierPolicy::TIER, false);
    }

    public function tierAddon(): PackagePlatformIdentifierAdapter
    {
        return $this->tierOccupantAdapter(PlatformIdentifierPolicy::TIER_ADDON, true);
    }

    private function tierOccupantAdapter(string $entityType, bool $addon): PackagePlatformIdentifierAdapter
    {
        return new PackagePlatformIdentifierAdapter(
            $entityType,
            fn(int|string|null $cursor, int $limit): array => $this->packages->tierOccupantAssignmentPage(
                is_string($cursor) && $cursor !== '' ? $cursor : null,
                $limit,
                $addon
            ),
            fn(int|string $reference): string => $this->packages->tierOccupantPlatformId((string) $reference, $addon),
            fn(int|string $reference, string $platformId): bool => $this->packages->claimTierOccupantPlatformId((string) $reference, $platformId, $addon),
            fn(string $platformId): bool => $this->packages->tierOccupantPlatformIdExists($platformId, $addon),
            fn(int|string $reference): ?array => $this->packages->tierOccupantProjection((string) $reference)
        );
    }

    public function rateSheet(): PackagePlatformIdentifierAdapter
    {
        return $this->rateSheetAdapter(PlatformIdentifierPolicy::PACKAGE_RATE_CARD, 'sheet');
    }

    public function rateSheetGroup(): PackagePlatformIdentifierAdapter
    {
        return $this->rateSheetAdapter(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_GROUP, 'group');
    }

    public function rateSheetItem(): PackagePlatformIdentifierAdapter
    {
        return $this->rateSheetAdapter(PlatformIdentifierPolicy::PACKAGE_RATE_CARD_ITEM, 'item');
    }

    private function rateSheetAdapter(string $entityType, string $scope): PackagePlatformIdentifierAdapter
    {
        return new PackagePlatformIdentifierAdapter(
            $entityType,
            fn(int|string|null $cursor, int $limit): array => $this->packages->rateSheetAssignmentPage(is_string($cursor) && $cursor !== '' ? $cursor : null, $limit, $scope),
            fn(int|string $reference): string => $this->packages->rateSheetPlatformId((string) $reference, $scope),
            fn(int|string $reference, string $platformId): bool => $this->packages->claimRateSheetPlatformId((string) $reference, $platformId, $scope),
            fn(string $platformId): bool => $this->packages->rateSheetPlatformIdExists($platformId, $scope),
            fn(int|string $reference): ?array => $this->packages->rateSheetProjection((string) $reference, $scope)
        );
    }
}
