<?php

declare(strict_types=1);

$tierInstanceMigrationOption = null;
$tierInstanceMigrationWrites = 0;

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
        global $tierInstanceMigrationWrites, $tierInstanceMigrationOption;
        $tierInstanceMigrationWrites++;
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

$tierInstanceMigrationOption = $legacy;
$tierInstanceMigrationWrites = 0;
$repository = new PackageRepository();
$loadedOnce = $repository->loadStation();
$loadedTwice = $repository->loadStation();
check_tier_migration(($loadedOnce['tier_instances'][0]['tier_instance_id'] ?? null) === Schema::PRIMARY_INSTANCE_ID, 'repository exposes the in-memory lift');
check_tier_migration($loadedTwice === $loadedOnce, 'request cache returns the same lifted shape');
check_tier_migration($tierInstanceMigrationWrites === 0, 'read-time lift performs no option write');
check_tier_migration(!array_key_exists('tier_instances', $tierInstanceMigrationOption), 'stored legacy option remains untouched');

$fresh = (new PackageRepository())->defaultStation();
check_tier_migration($fresh['tier_instances'] === [], 'fresh station declares the canonical empty collection');

echo "Tier instance migration checks passed.\n";
