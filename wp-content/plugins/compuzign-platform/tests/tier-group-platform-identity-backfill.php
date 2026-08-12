<?php

declare(strict_types=1);

/*
 * Contract: the Tier Group Platform ID backfill mints a CZTG for a LEGACY
 * instance, and the canonical CZTG read becomes reachable through it.
 *
 * This is the PRECONDITION for the Package Family card. That card reads its
 * counts from the assigned Tier Group's canonical `CZTG` route and fails closed
 * with no native-id fallback, so a Tier Group that never received a Platform ID
 * is simply unreadable and its Family card shows nothing.
 *
 * `TierInstanceSchema::liftLegacyStation()` creates `ti_primary` with NO
 * `cz_platform_id`, unlike `createTierInstance()` which reserves one before
 * persisting. Only the backfill closes that gap, and
 * platform-identifier-temporary-migration.php exercises tier_group for
 * `dry-run` only — so this drives the real `assignExistingBatch` through the
 * real `tierGroup()` adapter and out the other side to the composition read.
 */

$opts = [];

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $v): string { return trim(strip_tags((string) $v)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $v): string { return trim(strip_tags((string) $v)); }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $v): string { return strtolower((string) preg_replace('/[^a-z0-9_\-]/', '', (string) $v)); }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed { global $opts; return $opts[$key] ?? $default; }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = false): bool { global $opts; $opts[$key] = $value; return true; }
}
if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $opts;
        if (array_key_exists($key, $opts)) { return false; }
        $opts[$key] = $value;
        return true;
    }
}
if (!function_exists('delete_option')) {
    function delete_option(string $key): bool { global $opts; unset($opts[$key]); return true; }
}
if (!function_exists('get_post')) { function get_post(int $id): mixed { return null; } }
if (!function_exists('get_post_meta')) { function get_post_meta(int $id, string $k, bool $s = false): mixed { return ''; } }
if (!function_exists('wp_get_post_terms')) { function wp_get_post_terms(int $id, string $t, array $a = []): array { return []; } }
if (!function_exists('get_term_meta')) { function get_term_meta(int $id, string $k, bool $s = false): mixed { return ''; } }

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier\PackagePlatformIdentifierAdapters;
use CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier\PackagePlatformIdentifierService;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function verify(bool $condition, string $message): void
{
    if (!$condition) { throw new RuntimeException('Tier Group CZTG backfill: ' . $message); }
}

// A legacy-migrated Tier Group, exactly as liftLegacyStation() produces it:
// no cz_platform_id key at all. Plus a natively-created one that already has a
// CZTG, to prove assignment preserves rather than reassigns.
$opts['cz_package_station'] = [
    'platform_status' => 'active',
    'legacy_host_service_id' => 0,
    'promotions' => [],
    'package_manager' => PackageManagerSchema::defaultManager(),
    'tier_assignments' => [],
    'tier_instances' => [
        [
            'tier_instance_id' => TierInstanceSchema::PRIMARY_INSTANCE_ID,
            'title' => 'Primary Tier Set', 'status' => 'active',
            'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
            'tiers' => TierInstanceSchema::emptyTierMap(), 'occupant_bin' => [],
        ],
        [
            'tier_instance_id' => 'ti_native', 'cz_platform_id' => 'CZTGPRESET',
            'title' => 'Natively created', 'status' => 'active',
            'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
            'tiers' => TierInstanceSchema::emptyTierMap(), 'occupant_bin' => [],
        ],
    ],
];

$packages = new PackageRepository();
$station  = new PlatformIdentifierStation();
$adapter  = (new PackagePlatformIdentifierAdapters($packages))->tierGroup();

// 1. The legacy instance starts with no identity — the exact live risk.
verify(
    $packages->tierGroupPlatformId(PackagePlatformNativeReference::tierGroup(TierInstanceSchema::PRIMARY_INSTANCE_ID)) === '',
    'ti_primary starts with no CZTG (the legacy lift never mints one)'
);

// 2. Enumeration finds both groups, as the migration batch would.
$page = $adapter->enumerate(null, 100);
verify(count($page['items']) === 2, 'the adapter enumerates every stored Tier Group');

// 3. Run the real assignment batch.
$result = $station->assignExistingBatch(
    PlatformIdentifierPolicy::TIER_GROUP,
    null,
    100,
    fn(int|string|null $cursor, int $limit): array => $adapter->enumerate($cursor, $limit),
    fn(int|string $ref): string => (string) $adapter->readStored($ref),
    fn(int|string $ref, string $platformId): bool => (bool) $adapter->claimStored($ref, $platformId),
    fn(string $platformId): bool => $adapter->storedCollision($platformId)
);

$assigned = $packages->tierGroupPlatformId(PackagePlatformNativeReference::tierGroup(TierInstanceSchema::PRIMARY_INSTANCE_ID));
verify($result->processed() === 2, 'the batch processed both Tier Groups');
verify(str_starts_with($assigned, 'CZTG'), 'ti_primary is assigned a real CZTG by the backfill');
verify(
    $packages->tierGroupPlatformId(PackagePlatformNativeReference::tierGroup('ti_native')) === 'CZTGPRESET',
    'an already-identified Tier Group is preserved exactly, never reassigned'
);
verify(
    $station->lookupNative(PlatformIdentifierPolicy::TIER_GROUP, PackagePlatformNativeReference::tierGroup(TierInstanceSchema::PRIMARY_INSTANCE_ID))?->platformId() === $assigned,
    'the reverse binding resolves the native reference back to the same CZTG'
);

// 4. The whole point: the Family card's read boundary is now reachable, and it
//    carries the derived composition.
$identityService = new PackagePlatformIdentifierService($station);
$projection = $identityService->resolveProjection($adapter, $assigned);
verify(is_array($projection), 'the canonical CZTG read resolves the backfilled Tier Group');
verify(
    $identityService->resolveProjection($adapter, 'CZTGZZZZZ') === null,
    'an unbound CZTG resolves to null — the read boundary still fails closed'
);
verify(
    is_array($projection['composition'] ?? null)
    && $projection['composition'] === ['tiers' => 0, 'service_categories' => 0, 'services' => 0, 'inclusions' => 0],
    'the backfilled group answers with its own derived composition (zeros — it has no occupants)'
);

// 5. Re-running is safe.
$again = $station->assignExistingBatch(
    PlatformIdentifierPolicy::TIER_GROUP, null, 100,
    fn(int|string|null $c, int $l): array => $adapter->enumerate($c, $l),
    fn(int|string $r): string => (string) $adapter->readStored($r),
    fn(int|string $r, string $p): bool => (bool) $adapter->claimStored($r, $p),
    fn(string $p): bool => $adapter->storedCollision($p)
);
verify($again->assigned() === 0, 're-running the backfill assigns nothing — it is idempotent');
verify(
    $packages->tierGroupPlatformId(PackagePlatformNativeReference::tierGroup(TierInstanceSchema::PRIMARY_INSTANCE_ID)) === $assigned,
    'the CZTG is unchanged by a second run'
);

echo "Tier Group CZTG backfill contract passed.\n";
