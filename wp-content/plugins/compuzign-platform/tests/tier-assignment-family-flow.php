<?php

declare(strict_types=1);

$familyFlowOption = null;

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $familyFlowOption;
        return $key === 'cz_package_station' ? ($familyFlowOption ?? $default) : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $familyFlowOption;
        if ($key === 'cz_package_station') $familyFlowOption = $value;
        return true;
    }
}
if (!function_exists('get_posts')) {
    function get_posts(array $args = []): array { return []; }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $postId, string $key = '', bool $single = false): mixed { return $single ? null : []; }
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
        public function get_json_params(): array { return $this->params; }
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

use CompuZign\Platform\Modules\SurfacePackages\Http\PackageFamiliesController;
use CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;

function check_family_flow(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Tier assignment Family flow: ' . $message);
}

$created = (new PackageFamiliesController())->createGroup(new WP_REST_Request([
    'name' => 'KAIROS', 'description' => 'Independent Package Family.',
]));
check_family_flow($created->get_status() === 200, 'Family creation API succeeds independently');
$family = $created->get_data()['group'];
$familyId = $family['group_id'];
check_family_flow($family['platform_status'] === 'disabled', 'new Family is valid and disabled');
check_family_flow($family['module_status']['overview'] === 'pending', 'new Family overview is pending');
check_family_flow(($familyFlowOption['tier_assignments'] ?? []) === [], 'Family creation writes no assignment');

$settled = (new PackageFamiliesController())->settleOverview(new WP_REST_Request(['gid' => $familyId]));
check_family_flow($settled->get_data()['group']['module_status']['overview'] === 'settled', 'Family settles without capability');
$published = (new PackageFamiliesController())->updateStatus(new WP_REST_Request([
    'gid' => $familyId, 'platform_status' => 'active',
]));
check_family_flow($published->get_data()['group']['platform_status'] === 'active', 'Family publishes without capability');

// A second Family is never assigned at any point. It remains independently
// valid through publish and can complete its full lifecycle and deletion with
// no Tier instance or assignment writes.
$instanceCountBefore = count($familyFlowOption['tier_instances'] ?? []);
$assignmentBytesBefore = serialize($familyFlowOption['tier_assignments'] ?? []);
$unassignedCreated = (new PackageFamiliesController())->createGroup(new WP_REST_Request([
    'name' => 'OMNIA scenario', 'description' => 'Intentionally has no Tier assignment.',
]));
$unassignedId = $unassignedCreated->get_data()['group']['group_id'];
(new PackageFamiliesController())->settleOverview(new WP_REST_Request(['gid' => $unassignedId]));
$unassignedPublished = (new PackageFamiliesController())->updateStatus(new WP_REST_Request([
    'gid' => $unassignedId, 'platform_status' => 'active',
]));
check_family_flow($unassignedPublished->get_status() === 200, 'never-assigned Family publishes normally');
(new PackageFamiliesController())->updateStatus(new WP_REST_Request([
    'gid' => $unassignedId, 'platform_status' => 'archived',
]));
(new PackageFamiliesController())->updateStatus(new WP_REST_Request([
    'gid' => $unassignedId, 'platform_status' => 'trashed',
]));
$unassignedDeleted = (new PackageFamiliesController())->permanentDeleteGroup(new WP_REST_Request(['gid' => $unassignedId]));
check_family_flow($unassignedDeleted->get_status() === 200, 'never-assigned Family deletes normally');
check_family_flow(count($familyFlowOption['tier_instances'] ?? []) === $instanceCountBefore, 'never-assigned Family lifecycle writes no Tier instance');
check_family_flow(serialize($familyFlowOption['tier_assignments'] ?? []) === $assignmentBytesBefore, 'never-assigned Family lifecycle writes no assignment');

$rawFamilyBefore = PackageCategoryGroups::find(
    $familyFlowOption['package_manager']['category_groups'],
    $familyId
);
$familyBytes = serialize($rawFamilyBefore);

$stationController = new PackageStationController(new PackageRepository());
$instanceCreated = $stationController->createTierInstance(new WP_REST_Request([
    'title' => 'KAIROS scenario Tiers',
]));
check_family_flow($instanceCreated->get_status() === 200, 'Tier instance is created as a separate explicit act');
$instance = $instanceCreated->get_data()['tier_instance'];
$instanceId = $instance['tier_instance_id'];
$instanceBytes = serialize($instance);
$assigned = $stationController->createTierAssignment(new WP_REST_Request([
    'consumer_type' => 'package_family',
    'consumer_id' => $familyId,
    'tier_instance_id' => $instanceId,
]));
check_family_flow($assigned->get_status() === 200, 'Family can explicitly use an existing Tier instance');
$assignmentId = $assigned->get_data()['assignment']['assignment_id'];
check_family_flow(
    serialize(PackageCategoryGroups::find($familyFlowOption['package_manager']['category_groups'], $familyId)) === $familyBytes,
    'assigning leaves the Family byte-identical'
);

$removed = (new PackageStationController(new PackageRepository()))->deleteTierAssignment(
    new WP_REST_Request(['assignment' => $assignmentId])
);
check_family_flow($removed->get_status() === 200, 'assignment removal succeeds');
check_family_flow(
    serialize(PackageCategoryGroups::find($familyFlowOption['package_manager']['category_groups'], $familyId)) === $familyBytes,
    'removing leaves the Family byte-identical'
);
$instanceAfter = array_values(array_filter(
    $familyFlowOption['tier_instances'],
    static fn(array $candidate): bool => ($candidate['tier_instance_id'] ?? '') === $instanceId
))[0];
check_family_flow(serialize($instanceAfter) === $instanceBytes, 'assign and remove leave the instance byte-identical');

$sanitized = PackageCategoryGroups::sanitizeAll([[
    ...$rawFamilyBefore,
    'tier_instance_id' => 'ti_illegal',
    'tier_assignment_count' => 99,
    'tier_assignments' => [['assignment_id' => 'illegal']],
]])[0];
foreach (array_keys($sanitized) as $key) {
    check_family_flow(!preg_match('/^tier/', $key), 'Family sanitisation emits no Tier key');
}

// Reassign only to prove the capability guard. Family lifecycle remains independent.
$assignedAgain = (new PackageStationController(new PackageRepository()))->createTierAssignment(new WP_REST_Request([
    'consumer_type' => 'package_family', 'consumer_id' => $familyId, 'tier_instance_id' => $instanceId,
]));
$assignmentId = $assignedAgain->get_data()['assignment']['assignment_id'];
(new PackageFamiliesController())->updateStatus(new WP_REST_Request([
    'gid' => $familyId, 'platform_status' => 'trashed',
]));
$blocked = (new PackageFamiliesController())->permanentDeleteGroup(new WP_REST_Request(['gid' => $familyId]));
check_family_flow($blocked->get_status() === 409, 'assigned Family deletion is blocked');
check_family_flow($blocked->get_data()['code'] === 'family_in_use_by_capability', 'guard reports exact capability code');

(new PackageStationController(new PackageRepository()))->deleteTierAssignment(
    new WP_REST_Request(['assignment' => $assignmentId])
);
$deleted = (new PackageFamiliesController())->permanentDeleteGroup(new WP_REST_Request(['gid' => $familyId]));
check_family_flow($deleted->get_status() === 200, 'Family deletes after explicit assignment removal');

echo "Tier assignment Family flow checks passed.\n";
