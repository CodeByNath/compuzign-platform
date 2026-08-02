<?php

declare(strict_types=1);

$packageAdapterOptions = [];
if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $packageAdapterOptions;
        if (array_key_exists($key, $packageAdapterOptions)) return false;
        $packageAdapterOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $packageAdapterOptions;
        return $packageAdapterOptions[$key] ?? $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $packageAdapterOptions;
        $packageAdapterOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-08-02 00:00:00'; }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier\PackagePlatformIdentifierAdapter;
use CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier\PackagePlatformIdentifierService;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_package_adapter(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Package Platform adapter: ' . $message);
}

$rows = ['tier-occupant:4:ti_a5:occ_a' => ['cz_platform_id' => '', 'label' => 'A']];
$adapter = new PackagePlatformIdentifierAdapter(
    PlatformIdentifierPolicy::TIER,
    static fn(int|string|null $cursor, int $limit): array => [
        'items' => array_slice(array_keys($rows), 0, $limit), 'next_cursor' => null, 'complete' => true,
    ],
    static function (int|string $reference) use (&$rows): string {
        return (string) ($rows[(string) $reference]['cz_platform_id'] ?? '');
    },
    static function (int|string $reference, string $platformId) use (&$rows): bool {
        $key = (string) $reference;
        if (!isset($rows[$key]) || $rows[$key]['cz_platform_id'] !== '') return false;
        $rows[$key]['cz_platform_id'] = $platformId;
        return true;
    },
    static function (string $platformId) use (&$rows): bool {
        foreach ($rows as $row) if (($row['cz_platform_id'] ?? '') === $platformId) return true;
        return false;
    },
    static function (int|string $reference) use (&$rows): ?array {
        return $rows[(string) $reference] ?? null;
    }
);

$random = array_fill(0, 5, 0);
$station = new PlatformIdentifierStation(static function () use (&$random): int { return array_shift($random) ?? 1; });
$service = new PackagePlatformIdentifierService($station);
$reference = array_key_first($rows);
$reservation = $service->reserve($adapter);
$binding = $service->bind($adapter, $reservation, $reference);

check_package_adapter($binding->entityType() === PlatformIdentifierPolicy::TIER, 'delegates the approved Tier entity type');
check_package_adapter(str_starts_with($rows[$reference]['cz_platform_id'], 'CZT'), 'owner callback stores the reserved primary Tier identifier');
check_package_adapter($service->resolveProjection($adapter, $binding->platformId())['label'] === 'A', 'bound reads delegate projection to Package ownership');

$wrong = new PackagePlatformIdentifierAdapter(
    PlatformIdentifierPolicy::TIER_ADDON,
    static fn(int|string|null $cursor, int $limit): array => ['items' => [], 'complete' => true],
    static fn(int|string $reference): string => '',
    static fn(int|string $reference, string $platformId): bool => false,
    static fn(string $platformId): bool => false,
    static fn(int|string $reference): array => ['wrong' => true]
);
check_package_adapter($service->resolveProjection($wrong, $binding->platformId()) === null, 'wrong-entity reads fail closed');

$service->tombstone($adapter, $reference);
check_package_adapter($service->resolveProjection($adapter, $binding->platformId()) === null, 'deleted bindings fail closed');

echo "Package Platform identifier adapter contract: OK\n";
