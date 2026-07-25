<?php

declare(strict_types=1);

$peerIsolationOption = null;

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $value): string { return strtolower((string) preg_replace('/[^a-z0-9_\-]/', '', (string) $value)); }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $peerIsolationOption;
        return $key === 'cz_package_station' ? ($peerIsolationOption ?? $default) : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $peerIsolationOption;
        if ($key === 'cz_package_station') {
            $peerIsolationOption = $value;
        }
        return true;
    }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 77 ? new WP_Post($id, 'Peer Service') : null; }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-07-25 01:02:03'; }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): WP_REST_Response
    {
        return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
    }
}
if (!class_exists('WP_Post')) {
    class WP_Post
    {
        public string $post_type = 'cz_service';
        public function __construct(public int $ID, public string $post_title) {}
    }
}
if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request
    {
        public function __construct(private array $params = [], private array $body = []) {}
        public function get_param(string $key): mixed { return $this->params[$key] ?? null; }
        public function get_json_params(): array { return $this->body; }
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
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_peer_isolation(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Package capability peer isolation: ' . $message);
    }
}

/** @return array<string, mixed> */
function peer_success(WP_REST_Response $response, string $operation): array
{
    $data = $response->get_data();
    check_peer_isolation(
        $response->get_status() === 200 && is_array($data) && ($data['success'] ?? false) === true,
        "{$operation} reaches the persistence boundary successfully"
    );
    return $data;
}

function peer_station_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository());
}

function peer_family_controller(): PackageFamiliesController
{
    return new PackageFamiliesController();
}

/** @return array<string, mixed> */
function persisted_peer_family(): array
{
    global $peerIsolationOption;
    return PackageCategoryGroups::find(
        $peerIsolationOption['package_manager']['category_groups'] ?? [],
        'pcg_peer'
    ) ?? [];
}

/** @return array<string, mixed> */
function persisted_peer_instance(): array
{
    global $peerIsolationOption;
    return TierInstanceSchema::findInstance($peerIsolationOption['tier_instances'] ?? [], 'ti_peer') ?? [];
}

$family = PackageCategoryGroups::sanitizeAll([[
    'group_id' => 'pcg_peer',
    'label' => 'Peer Family',
    'platform_status' => 'active',
]])[0];
$instance = TierInstanceSchema::sanitizeInstance([
    'tier_instance_id' => 'ti_peer',
    'title' => 'Peer Tiers',
    'status' => 'active',
    'allowed_rate_sheet_ids' => ['rs_peer'],
    'popular_tier' => 'basic',
    'popular_label' => 'Popular',
    'tiers' => [
        'basic' => ['current_occupant' => ['id' => 'occ_peer', 'platform_status' => 'active']],
    ],
    'occupant_bin' => [],
]);
$assignments = TierAssignmentSchema::assign(
    [], 'package_family', 'pcg_peer', 'ti_peer', ['pcg_peer' => true], [$instance]
);

$familyBytes = serialize($family);
$instanceBytes = serialize($instance);
$withoutAssignment = TierAssignmentSchema::unassign($assignments, $assignments[0]['assignment_id']);
check_peer_isolation($withoutAssignment === [], 'P1 removes exactly one assignment row');
check_peer_isolation(serialize($family) === $familyBytes, 'P1 leaves the Family byte-identical');
check_peer_isolation(serialize($instance) === $instanceBytes, 'P1 leaves the Tier instance byte-identical');

// P2/P3 use the real controllers and PackageRepository option boundary. The
// station contains both peers and their assignment, so these assertions fail if
// a controller reconstructs or overwrites the opposite peer while persisting.
$manager = PackageManagerSchema::sanitize([
    'category_groups' => [$family],
    'rate_sheets' => [
        ['rate_sheet_id' => 'rs_peer', 'title' => 'Peer', 'status' => 'active', 'groups' => [], 'items' => []],
        ['rate_sheet_id' => 'rs_secondary', 'title' => 'Secondary', 'status' => 'active', 'groups' => [], 'items' => []],
    ],
]);
$peerIsolationOption = [
    'platform_status' => 'active',
    'tiers' => [],
    'occupant_bin' => [],
    'popular_tier' => null,
    'popular_label' => '',
    'tier_instances' => [$instance],
    'tier_assignments' => $assignments,
    'promotions' => [],
    'package_manager' => $manager,
    'legacy_host_service_id' => 0,
];

$familyBytes = serialize(persisted_peer_family());
$assertFamilyAfter = static function (string $operation) use ($familyBytes): void {
    check_peer_isolation(
        serialize(persisted_peer_family()) === $familyBytes,
        "P2 {$operation} leaves the persisted Family byte-identical"
    );
};

peer_success(peer_station_controller()->savePackageStationTier(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_peer', 'tier' => 'basic'],
    [
        'label' => 'Edited', 'price' => null, 'contact' => false,
        'billing_cycle' => 'monthly', 'inclusions_override' => [],
        'faq_refs' => [], 'enabled' => true,
    ]
)), 'P2 occupant save');
$assertFamilyAfter('occupant save');

peer_success(peer_station_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_peer', 'tier' => 'basic', 'module' => 'overview'],
    ['label' => 'Draft', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_peer']
)), 'P2 module edit');
$assertFamilyAfter('module edit');

peer_success(peer_station_controller()->revertPackageStationTierModule(new WP_REST_Request([
    'id' => 77, 'instance' => 'ti_peer', 'tier' => 'basic', 'module' => 'overview',
])), 'P2 revert');
$assertFamilyAfter('revert');

peer_success(peer_station_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_peer', 'tier' => 'basic', 'module' => 'overview'],
    ['label' => 'Settled', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_peer']
)), 'P2 second module edit');
$assertFamilyAfter('second module edit');
peer_success(peer_station_controller()->settlePackageStationTier(new WP_REST_Request([
    'id' => 77, 'instance' => 'ti_peer', 'tier' => 'basic',
])), 'P2 settle');
$assertFamilyAfter('settle');

peer_success(peer_station_controller()->setPackageStationTierEnabled(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_peer', 'tier' => 'basic'], ['enabled' => false]
)), 'P2 enabled toggle');
$assertFamilyAfter('enabled toggle and derived status change');
peer_success(peer_station_controller()->setPackageStationPopular(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_peer'], ['tier_id' => 'basic', 'label' => 'Peer popular']
)), 'P2 popular');
$assertFamilyAfter('popular');

peer_success(peer_station_controller()->setPackageStationTierEnabled(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_peer', 'tier' => 'basic'], ['enabled' => true]
)), 'P2 re-enable before archive');
$assertFamilyAfter('re-enable before archive');
$archived = peer_success(peer_station_controller()->archivePackageStationTierOccupant(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_peer', 'tier' => 'basic']
)), 'P2 archive');
$assertFamilyAfter('archive');
$binId = (string) $archived['bin_entry']['bin_id'];
peer_success(peer_station_controller()->restorePackageStationBinEntry(new WP_REST_Request([
    'id' => 77, 'instance' => 'ti_peer', 'bin' => $binId,
])), 'P2 restore');
$assertFamilyAfter('restore');

$archived = peer_success(peer_station_controller()->archivePackageStationTierOccupant(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_peer', 'tier' => 'basic']
)), 'P2 archive for swap');
$assertFamilyAfter('archive for swap');
$oldBinId = (string) $archived['bin_entry']['bin_id'];
peer_success(peer_station_controller()->savePackageStationTier(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_peer', 'tier' => 'basic'],
    [
        'label' => 'Replacement', 'price' => null, 'contact' => false,
        'billing_cycle' => 'monthly', 'inclusions_override' => [],
        'faq_refs' => [], 'enabled' => true,
    ]
)), 'P2 replacement occupant save');
$assertFamilyAfter('replacement occupant save');
$swapped = peer_success(peer_station_controller()->restorePackageStationBinEntry(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_peer', 'bin' => $oldBinId], ['mode' => 'swap']
)), 'P2 swap');
$assertFamilyAfter('swap');
$displacedBinId = (string) $swapped['displaced_entry']['bin_id'];
peer_success(peer_station_controller()->trashPackageStationBinEntry(new WP_REST_Request([
    'id' => 77, 'instance' => 'ti_peer', 'bin' => $displacedBinId,
])), 'P2 trash');
$assertFamilyAfter('trash');
peer_success(peer_station_controller()->deletePackageStationBinEntry(new WP_REST_Request([
    'id' => 77, 'instance' => 'ti_peer', 'bin' => $displacedBinId,
])), 'P2 bin delete');
$assertFamilyAfter('bin delete');

peer_success(peer_station_controller()->updateTierInstance(new WP_REST_Request(
    ['instance' => 'ti_peer'],
    ['title' => 'Renamed peer Tiers', 'allowed_rate_sheet_ids' => ['rs_peer', 'rs_secondary']]
)), 'P2 title and allowed sheets update');
$assertFamilyAfter('allowed sheets and title change');

// P3 — every Family mutation passes through its real controller/repository
// write while the complete, post-P2 Tier instance must remain byte-identical.
$peerInstanceBytes = serialize(persisted_peer_instance());
$assertInstanceAfter = static function (string $operation) use ($peerInstanceBytes): void {
    check_peer_isolation(
        serialize(persisted_peer_instance()) === $peerInstanceBytes,
        "P3 {$operation} leaves the persisted Tier instance byte-identical"
    );
};

peer_success(peer_family_controller()->saveOverview(new WP_REST_Request([
    'gid' => 'pcg_peer', 'name' => 'Peer Draft', 'description' => 'Draft description',
])), 'P3 overview draft save');
$assertInstanceAfter('overview draft save');
peer_success(peer_family_controller()->revertOverview(new WP_REST_Request([
    'gid' => 'pcg_peer',
])), 'P3 overview revert');
$assertInstanceAfter('overview revert');
peer_success(peer_family_controller()->saveOverview(new WP_REST_Request([
    'gid' => 'pcg_peer', 'name' => 'Peer Settled', 'description' => 'Settled description',
])), 'P3 second overview draft save');
$assertInstanceAfter('second overview draft save');
peer_success(peer_family_controller()->settleOverview(new WP_REST_Request([
    'gid' => 'pcg_peer',
])), 'P3 overview settle');
$assertInstanceAfter('overview settle');
peer_success(peer_family_controller()->updateStatus(new WP_REST_Request([
    'gid' => 'pcg_peer', 'platform_status' => 'disabled',
])), 'P3 status change');
$assertInstanceAfter('status change');
peer_success(peer_family_controller()->updateStatus(new WP_REST_Request([
    'gid' => 'pcg_peer', 'platform_status' => 'active',
])), 'P3 publish');
$assertInstanceAfter('publish');
peer_success(peer_family_controller()->updateStatus(new WP_REST_Request([
    'gid' => 'pcg_peer', 'platform_status' => 'archived',
])), 'P3 archive');
$assertInstanceAfter('archive');
peer_success(peer_family_controller()->updateStatus(new WP_REST_Request([
    'gid' => 'pcg_peer', 'platform_status' => 'trashed',
])), 'P3 trash');
$assertInstanceAfter('trash');
peer_success(peer_family_controller()->restoreGroup(new WP_REST_Request([
    'gid' => 'pcg_peer',
])), 'P3 restore');
$assertInstanceAfter('restore');

$familyWithForbiddenInput = PackageCategoryGroups::sanitizeAll([[
    ...$family,
    'tier_instance_id' => 'ti_illegal',
    'tier_assignments' => [['assignment_id' => 'illegal']],
    'assignment_id' => 'illegal',
]])[0];
foreach (array_keys($familyWithForbiddenInput) as $key) {
    check_peer_isolation(!preg_match('/^tier|assignment/', $key), 'P4 Family sanitiser cannot emit Tier or assignment fields');
}

$instanceWithForbiddenInput = TierInstanceSchema::sanitizeInstance([
    ...$instance,
    'consumer_type' => 'package_family',
    'consumer_id' => 'pcg_peer',
    'family_id' => 'pcg_peer',
    'group_id' => 'pcg_peer',
]);
foreach (array_keys($instanceWithForbiddenInput ?? []) as $key) {
    check_peer_isolation(!preg_match('/^consumer|family|group/', $key), 'P5 Tier instance sanitiser cannot emit consumer, Family, or Group fields');
}

echo "Package capability peer-isolation checks passed.\n";
