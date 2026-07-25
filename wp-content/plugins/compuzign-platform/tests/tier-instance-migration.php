<?php

declare(strict_types=1);

$tierInstanceMigrationOption = null;
$tierInstanceMigrationWrites = 0;
$tierInstanceMigrationRejectWrites = false;

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $tierInstanceMigrationOption;
        return $key === 'cz_package_station' ? $tierInstanceMigrationOption : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $tierInstanceMigrationWrites, $tierInstanceMigrationOption, $tierInstanceMigrationRejectWrites;
        $tierInstanceMigrationWrites++;
        if ($tierInstanceMigrationRejectWrites) {
            return false;
        }
        if (serialize($tierInstanceMigrationOption) === serialize($value)) {
            return false;
        }
        $tierInstanceMigrationOption = $value;
        return true;
    }
}

require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageCategoryGroups.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageManagerSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/TierInstanceSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Repositories/PackageRepository.php';

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema as Schema;

function check_tier_migration(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier instance migration: ' . $message);
    }
}

$basic = [
    'current_occupant' => [
        'id' => 'occ_deadbeef',
        'platform_status' => 'active',
        'label' => 'Basic',
        'rate_sheet_id' => 'rs_a',
        'rate_sheet_items' => [['item_id' => 'same-row', 'quantity' => 2]],
    ],
    'history' => [['id' => 'occ_history', 'rate_sheet_id' => 'rs_old']],
    'drafts' => ['overview' => null, 'features' => ['rate_sheet_items' => []], 'faqs' => null],
    'module_status' => ['overview' => 'settled', 'features' => 'pending', 'faqs' => 'settled'],
];
$premium = [
    'current_occupant' => [
        'id' => 'occ_cafefeed',
        'platform_status' => 'disabled',
        'label' => 'Premium',
        'rate_sheet_id' => 'rs_b',
        'rate_sheet_items' => [['item_id' => 'same-row', 'quantity' => 5]],
    ],
    'history' => [],
    'drafts' => ['overview' => ['label' => 'Premium draft'], 'features' => null, 'faqs' => null],
    'module_status' => ['overview' => 'pending', 'features' => 'settled', 'faqs' => 'settled'],
];
$bin = [[
    'bin_id' => 'bin_aabbccdd',
    'origin_tier' => 'standard',
    'occupant' => [
        'id' => 'occ_1234abcd',
        'rate_sheet_id' => 'rs_a',
        'rate_sheet_items' => [['item_id' => 'same-row', 'quantity' => 1]],
    ],
    'status' => 'archived',
    'previous_enabled' => true,
    'displaced_at' => '2026-07-25 01:02:03',
]];

$legacy = [
    'platform_status' => 'active',
    'tiers' => ['basic' => $basic, 'premium' => $premium],
    'occupant_bin' => $bin,
    'popular_tier' => 'premium',
    'popular_label' => 'Recommended',
    'promotions' => [],
    'package_manager' => [],
];
$lifted = Schema::liftLegacyStation($legacy);
$instance = $lifted['tier_instances'][0] ?? null;
check_tier_migration(count($lifted['tier_instances']) === 1, 'one ti_primary instance is created');
check_tier_migration($instance['tier_instance_id'] === Schema::PRIMARY_INSTANCE_ID, 'primary id is deterministic');
check_tier_migration($instance['tiers'] === $legacy['tiers'], 'all slots, occupants, drafts, status, history, ids, and Rate Sheet selections are byte-identical');
check_tier_migration($instance['tiers']['basic']['current_occupant'] === $basic['current_occupant'], 'basic occupant is byte-identical');
check_tier_migration($instance['tiers']['premium']['current_occupant'] === $premium['current_occupant'], 'premium occupant is byte-identical');
check_tier_migration($instance['occupant_bin'] === $bin, 'bin entries are field-for-field identical');
check_tier_migration($instance['popular_tier'] === 'premium' && $instance['popular_label'] === 'Recommended', 'popular fields are copied');
check_tier_migration(empty($lifted['tier_assignments'] ?? []), 'migration writes no assignment decision');
check_tier_migration(Schema::liftLegacyStation($lifted) === $lifted, 'lift is idempotent');

$already = [...$legacy, 'tier_instances' => [['tier_instance_id' => 'ti_existing', 'raw' => true]]];
check_tier_migration(Schema::liftLegacyStation($already) === $already, 'non-empty instance collection is returned unchanged');

$empty = Schema::liftLegacyStation(['tiers' => [], 'occupant_bin' => []]);
check_tier_migration($empty['tier_instances'][0]['tiers'] === Schema::emptyTierMap(), 'empty legacy station receives all five empty slots');
$canonicalEmpty = ['tier_instances' => [], 'tier_assignments' => []];
check_tier_migration(
    Schema::liftLegacyStation($canonicalEmpty) === $canonicalEmpty,
    'fresh canonical station stays empty and never fabricates ti_primary'
);

$tierInstanceMigrationOption = $legacy;
$tierInstanceMigrationWrites = 0;
$repository = new PackageRepository();
$loadedOnce = $repository->loadStation();
$loadedTwice = $repository->loadStation();
check_tier_migration(($loadedOnce['tier_instances'][0]['tier_instance_id'] ?? null) === Schema::PRIMARY_INSTANCE_ID, 'repository exposes the in-memory lift');
check_tier_migration($loadedTwice === $loadedOnce, 'request cache returns the same lifted shape');
check_tier_migration($tierInstanceMigrationWrites === 0, 'read-time lift performs no option write');
check_tier_migration(!array_key_exists('tier_instances', $tierInstanceMigrationOption), 'stored legacy option remains untouched');

// The first canonical write is the retirement boundary. It must prune only the
// four top-level compatibility mirrors while keeping the lifted instance bytes
// unchanged. A failed option write must not prune storage, update the request
// cache, or return as a successful mutation.
$desired = $loadedOnce;
$desired['tier_instances'][0]['title'] = 'Primary Tier Set updated';
$tierInstanceMigrationRejectWrites = true;
$failure = null;
try {
    $repository->saveStation($desired);
} catch (RuntimeException $e) {
    $failure = $e->getMessage();
}
check_tier_migration($failure === 'package_station_persistence_failed', 'failed persistence throws the exact repository error');
check_tier_migration($repository->loadStation() === $loadedOnce, 'failed persistence leaves the prior request cache untouched');
check_tier_migration($tierInstanceMigrationOption === $legacy, 'failed persistence leaves the stored option untouched');

$tierInstanceMigrationRejectWrites = false;
$repository->saveStation($desired);
$canonical = $desired;
foreach (['tiers', 'occupant_bin', 'popular_tier', 'popular_label'] as $legacyKey) {
    unset($canonical[$legacyKey]);
    check_tier_migration(!array_key_exists($legacyKey, $tierInstanceMigrationOption), "canonical write prunes top-level {$legacyKey}");
}
check_tier_migration($tierInstanceMigrationOption === $canonical, 'canonical write changes no data beyond explicit input and legacy-key pruning');
check_tier_migration($repository->loadStation() === $canonical, 'successful canonical write updates the request cache to the persisted shape');
check_tier_migration(
    $tierInstanceMigrationOption['tier_instances'][0]['tiers'] === $legacy['tiers'],
    'canonical write preserves every lifted Tier slot byte-for-byte'
);
check_tier_migration(
    $tierInstanceMigrationOption['tier_instances'][0]['occupant_bin'] === $legacy['occupant_bin'],
    'canonical write preserves the lifted occupant bin byte-for-byte'
);

// WordPress returns false for a byte-identical update. Exact read-back still
// makes that a successful no-op, with the canonical cache unchanged.
$unchangedRepository = new PackageRepository();
$unchangedRepository->saveStation($canonical);
check_tier_migration($unchangedRepository->loadStation() === $canonical, 'false update with an exact canonical read-back is accepted as unchanged');

$fresh = (new PackageRepository())->defaultStation();
check_tier_migration($fresh['tier_instances'] === [], 'fresh station declares the canonical empty collection');
check_tier_migration($fresh['tier_assignments'] === [], 'fresh station declares the separate empty assignment ledger');
foreach (['tiers', 'occupant_bin', 'popular_tier', 'popular_label'] as $legacyKey) {
    check_tier_migration(!array_key_exists($legacyKey, $fresh), "fresh station omits retired top-level {$legacyKey}");
}

echo "Tier instance migration checks passed.\n";
