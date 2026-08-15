<?php

declare(strict_types=1);

$tierAssignmentOption = null;
$tierAssignmentWrites = 0;

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('add_action')) {
    function add_action(string $hook, callable $callback): bool { return true; }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $tierAssignmentOption;
        return $key === 'cz_package_station' ? $tierAssignmentOption : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $tierAssignmentOption, $tierAssignmentWrites;
        $tierAssignmentOption = $value;
        $tierAssignmentWrites++;
        return true;
    }
}
if (!function_exists('current_user_can')) {
    function current_user_can(string $capability): bool { return true; }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): WP_REST_Response
    {
        return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
    }
}

if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request
    {
        public function __construct(private array $params = []) {}
        public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
    }
}
if (!class_exists('WP_REST_Response')) {
    class WP_REST_Response
    {
        public function __construct(private mixed $data = null, private int $status = 200) {}
        public function get_data(): mixed { return $this->data; }
        public function get_status(): int { return $this->status; }
    }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Core\Health;
use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\Modules\SurfacePackages\Http\PackageFamiliesController;
use CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema as Schema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\Modules\SurfacePackages\SurfacePackagesModule;

function check_tier_assignment(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier assignment schema: ' . $message);
    }
}

function expect_assignment_error(callable $operation, string $code): void
{
    try {
        $operation();
    } catch (RuntimeException $e) {
        check_tier_assignment($e->getMessage() === $code, "{$code} is reported exactly");
        return;
    }
    throw new RuntimeException("Tier assignment schema: expected {$code}");
}

$families = PackageCategoryGroups::sanitizeAll([
    ['group_id' => 'pcg_a', 'label' => 'A', 'platform_status' => 'active'],
    ['group_id' => 'pcg_b', 'label' => 'B', 'platform_status' => 'active'],
]);
$manager = PackageManagerSchema::sanitize(['category_groups' => $families]);
$registry = Schema::consumerRegistryFor('package_family', $manager);
$instances = [
    ['tier_instance_id' => 'ti_a'],
    ['tier_instance_id' => 'ti_b'],
];

$assigned = Schema::assign([], 'package_family', 'pcg_a', 'ti_a', $registry, $instances);
$expectedId = Schema::deriveAssignmentId('package_family', 'pcg_a', 'ti_a');
check_tier_assignment($assigned === [[
    'assignment_id' => $expectedId,
    'consumer_type' => 'package_family',
    'consumer_id' => 'pcg_a',
    'tier_instance_id' => 'ti_a',
]], 'assign creates the canonical derived row');
check_tier_assignment($expectedId === Schema::deriveAssignmentId('package_family', 'pcg_a', 'ti_a'), 'derived id is deterministic');

// Idempotent: re-asserting the exact pairing already stored is a no-op
// success, not a conflict — a caller that redundantly re-points a consumer
// at the instance it already names (no unassign first) must not fail for a
// request that changes nothing. Any OTHER pairing sharing either half still
// throws (below), so this must not weaken the real conflict guards.
check_tier_assignment(
    Schema::assign($assigned, 'package_family', 'pcg_a', 'ti_a', $registry, $instances) === $assigned,
    'assigning the exact already-stored pairing again is idempotent, not consumer_already_assigned',
);

expect_assignment_error(fn() => Schema::assign([], 'service', 'pcg_a', 'ti_a', $registry, $instances), 'unknown_consumer_type');
expect_assignment_error(fn() => Schema::assign([], 'package_family', 'pcg_missing', 'ti_a', $registry, $instances), 'unknown_consumer');
expect_assignment_error(fn() => Schema::assign([], 'package_family', 'pcg_a', 'ti_missing', $registry, $instances), 'unknown_tier_instance');
expect_assignment_error(fn() => Schema::assign($assigned, 'package_family', 'pcg_a', 'ti_b', $registry, $instances), 'consumer_already_assigned');
expect_assignment_error(fn() => Schema::assign($assigned, 'package_family', 'pcg_b', 'ti_a', $registry, $instances), 'instance_already_assigned');
expect_assignment_error(fn() => Schema::unassign($assigned, 'tasg_missing'), 'unknown_assignment');

$dirty = [
    $assigned[0],
    ['consumer_type' => 'package_family', 'consumer_id' => 'pcg_missing', 'tier_instance_id' => 'ti_b'],
    ['consumer_type' => 'package_family', 'consumer_id' => 'pcg_b', 'tier_instance_id' => 'ti_missing'],
];
$sanitized = Schema::sanitizeAssignments($dirty, ['package_family' => $registry], $instances);
check_tier_assignment($sanitized === $assigned, 'sanitise drops unresolved consumers and instances');
check_tier_assignment(PackageCategoryGroups::tierAssignmentCount($assigned, 'pcg_a') === 1, 'assignment count is separate');
$dependentShape = PackageCategoryGroups::dependents(['package_manager' => []], [], 'pcg_a');
check_tier_assignment(array_keys($dependentShape) === ['services', 'rate_sheet_rows', 'tier_selections'], 'dependents remains exactly three metrics');

$archived = PackageCategoryGroups::applyStatus($families, 'pcg_a', StationLifecycle::STATUS_ARCHIVED);
check_tier_assignment($archived[0]['platform_status'] === 'archived', 'Family can archive independently');
check_tier_assignment(Schema::findForConsumer($assigned, 'package_family', 'pcg_a') === $assigned[0], 'archiving leaves the assignment dormant');

// Route authority and Family deletion guard against the same stored option.
$trashedFamilies = PackageCategoryGroups::applyStatus($families, 'pcg_a', StationLifecycle::STATUS_TRASHED);
$tierAssignmentOption = [
    'platform_status' => 'disabled',
    'tiers' => [],
    'occupant_bin' => [],
    'tier_instances' => [[
        'tier_instance_id' => 'ti_a', 'title' => 'A Tiers', 'status' => 'disabled',
        'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TierInstanceSchema::emptyTierMap(), 'occupant_bin' => [],
    ]],
    'tier_assignments' => [],
    'promotions' => [],
    'package_manager' => PackageManagerSchema::sanitize(['category_groups' => $trashedFamilies]),
    'legacy_host_service_id' => 0,
];
check_tier_assignment((new PackageRepository())->defaultStation()['tier_assignments'] === [], 'fresh station declares an empty assignment ledger');
$stationController = new PackageStationController(new PackageRepository());
$createdResponse = $stationController->createTierAssignment(new WP_REST_Request([
    'consumer_type' => 'package_family', 'consumer_id' => 'pcg_a', 'tier_instance_id' => 'ti_a',
]));
check_tier_assignment($createdResponse->get_status() === 200, 'assignment POST succeeds');
$createdRow = $createdResponse->get_data()['assignment'];
check_tier_assignment($createdRow['assignment_id'] === $expectedId, 'assignment POST returns the canonical row');

$familyController = new PackageFamiliesController();
$blocked = $familyController->permanentDeleteGroup(new WP_REST_Request(['gid' => 'pcg_a']));
check_tier_assignment($blocked->get_status() === 409, 'Family deletion with assignment returns 409');
check_tier_assignment($blocked->get_data()['code'] === 'family_in_use_by_capability', 'Family deletion reports the capability guard code');

$deletedAssignment = $stationController->deleteTierAssignment(new WP_REST_Request(['assignment' => $expectedId]));
check_tier_assignment($deletedAssignment->get_status() === 200, 'assignment DELETE succeeds');
$deletedFamily = (new PackageFamiliesController())->permanentDeleteGroup(new WP_REST_Request(['gid' => 'pcg_a']));
check_tier_assignment($deletedFamily->get_status() === 200, 'guard-clean Family deletion succeeds');

// The temporary D1 cutover sentinel retired with the legacy global projection.
// Permanent health validates station shape only: an unassigned canonical
// instance is legitimate, and the check remains strictly read-only.
$activeFamily = PackageCategoryGroups::sanitizeAll([
    ['group_id' => 'pcg_health', 'label' => 'Health', 'platform_status' => 'active'],
]);
$activeInstance = [
    'tier_instance_id' => 'ti_primary', 'title' => 'Primary', 'status' => 'active',
    'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
    'tiers' => [
        ...TierInstanceSchema::emptyTierMap(),
        'basic' => ['current_occupant' => ['id' => 'occ_health', 'platform_status' => 'active']],
    ],
    'occupant_bin' => [],
];
$tierAssignmentOption = [
    'platform_status' => 'active',
    'tier_instances' => [$activeInstance], 'tier_assignments' => [], 'promotions' => [],
    'package_manager' => PackageManagerSchema::sanitize(['category_groups' => $activeFamily]),
];
$tierAssignmentWrites = 0;
(new SurfacePackagesModule())->register();
check_tier_assignment(Health::run()['package_station'] === true, 'canonical unassigned instance is a healthy supported state');
$tierAssignmentOption['tier_assignments'] = Schema::assign(
    [], 'package_family', 'pcg_health', 'ti_primary', ['pcg_health' => true], [$activeInstance]
);
check_tier_assignment(Health::run()['package_station'] === true, 'valid assignment remains healthy');
$tierAssignmentOption['package_manager']['category_groups'] = PackageCategoryGroups::applyStatus(
    $activeFamily, 'pcg_health', StationLifecycle::STATUS_ARCHIVED
);
check_tier_assignment(Health::run()['package_station'] === true, 'dormant archived-Family assignment is valid stored state');
check_tier_assignment($tierAssignmentWrites === 0, 'health never mutates or auto-assigns');

echo "Tier assignment schema checks passed.\n";
