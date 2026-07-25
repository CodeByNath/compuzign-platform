<?php

declare(strict_types=1);

$tierGuardOption = null;

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
        global $tierGuardOption;
        return $key === 'cz_package_station' ? $tierGuardOption : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $tierGuardOption;
        if ($key === 'cz_package_station') { $tierGuardOption = $value; }
        return true;
    }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 88 ? new WP_Post($id, 'Guard Service') : null; }
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

use CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_tier_guard(bool $condition, string $message): void
{
    if (!$condition) { throw new RuntimeException('Tier instance guards: ' . $message); }
}

function guard_instance(string $id): array
{
    return [
        'tier_instance_id' => $id, 'title' => $id, 'status' => 'disabled',
        'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TierInstanceSchema::emptyTierMap(), 'occupant_bin' => [],
    ];
}

function guard_station(array $instance, array $assignments = []): array
{
    return [
        'platform_status' => 'disabled',
        'tier_instances' => [$instance], 'tier_assignments' => $assignments,
        'promotions' => [], 'package_manager' => PackageManagerSchema::defaultManager(),
        'legacy_host_service_id' => 0,
    ];
}

$repository = new PackageRepository();
$base = guard_instance('ti_scan');

$current = $base;
$current['tiers']['basic'] = ['current_occupant' => ['id' => 'occ_current', 'rate_sheet_id' => 'rs_current', 'rate_sheet_items' => []]];
check_tier_guard(isset($repository->rateSheetIdsInUse(guard_station($current))['rs_current']), 'current occupant binding is protected without selections');

$overview = $base;
$overview['tiers']['basic'] = ['drafts' => ['overview' => ['rate_sheet_id' => 'rs_overview']]];
check_tier_guard(isset($repository->rateSheetIdsInUse(guard_station($overview))['rs_overview']), 'overview draft binding is protected');

$features = $base;
$features['tiers']['basic'] = [
    'current_occupant' => ['id' => 'occ_features', 'rate_sheet_id' => 'rs_features', 'rate_sheet_items' => []],
    'drafts' => ['features' => [['item_id' => 'row', 'quantity' => 1]]],
];
check_tier_guard(isset($repository->rateSheetIdsInUse(guard_station($features))['rs_features']), 'features draft protects its bound sheet');

$history = $base;
$history['tiers']['basic'] = ['history' => [['id' => 'occ_history', 'rate_sheet_id' => 'rs_history']]];
check_tier_guard(isset($repository->rateSheetIdsInUse(guard_station($history))['rs_history']), 'historical occupant binding is protected');

$bin = $base;
$bin['occupant_bin'] = [[
    'bin_id' => 'bin_guard', 'origin_tier' => 'basic', 'status' => 'archived',
    'previous_enabled' => true, 'displaced_at' => null,
    'occupant' => ['id' => 'occ_bin', 'rate_sheet_id' => 'rs_bin'],
]];
check_tier_guard(isset($repository->rateSheetIdsInUse(guard_station($bin))['rs_bin']), 'binned occupant binding is protected');

$allowed = $base;
$allowed['allowed_rate_sheet_ids'] = ['rs_allowed'];
check_tier_guard(isset($repository->rateSheetIdsInUse(guard_station($allowed))['rs_allowed']), 'allowed-sheet configuration is protected');

$staleMirror = guard_station($base);
$staleMirror['tiers']['basic'] = ['current_occupant' => ['id' => 'occ_legacy']];
$staleMirror['occupant_bin'] = [[
    'bin_id' => 'bin_legacy', 'origin_tier' => 'basic', 'status' => 'archived',
    'previous_enabled' => true, 'displaced_at' => null,
    'occupant' => ['id' => 'occ_legacy_bin', 'rate_sheet_id' => 'rs_legacy'],
]];
check_tier_guard(
    !isset($repository->rateSheetIdsInUse($staleMirror)['rs_primary'])
        && !isset($repository->rateSheetIdsInUse($staleMirror)['rs_legacy']),
    'retired top-level Tier mirrors are not dependency authority'
);
check_tier_guard($repository->rateSheetInstanceIdsInUse(guard_station($allowed), 'rs_allowed') === ['ti_scan'], 'archive diagnostics name every using instance');

// Archiving a sheet bound anywhere fails before Manager persistence and names instances.
$bound = guard_instance('ti_bound');
$bound['allowed_rate_sheet_ids'] = ['rs_bound'];
$tierGuardOption = guard_station($bound);
$tierGuardOption['package_manager'] = PackageManagerSchema::sanitize(['rate_sheets' => [[
    'rate_sheet_id' => 'rs_bound', 'title' => 'Bound', 'status' => 'active', 'groups' => [], 'items' => [],
]]]);
$archive = (new PackageStationController(new PackageRepository()))->savePackageStationManager(new WP_REST_Request(
    ['id' => 88],
    ['sources' => [], 'groups' => [], 'item_decisions' => [], 'rate_sheets' => [[
        'rate_sheet_id' => 'rs_bound', 'title' => 'Bound', 'status' => 'archived', 'groups' => [], 'items' => [],
    ]], 'rate_sheet_deletions' => []]
));
check_tier_guard(($archive->get_data()['code'] ?? null) === 'rate_sheet_in_use_archive', 'archive guard uses the dedicated code');
check_tier_guard(($archive->get_data()['tier_instance_ids'] ?? null) === ['ti_bound'], 'archive guard names the bound instance');

// Instance deletion refuses each protected state with its exact code.
$cases = [];
$assigned = guard_instance('ti_delete');
$cases['instance_in_use'] = guard_station($assigned, [[
    'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_guard', 'ti_delete'),
    'consumer_type' => 'package_family', 'consumer_id' => 'pcg_guard', 'tier_instance_id' => 'ti_delete',
]]);
$occupied = guard_instance('ti_delete');
$occupied['tiers']['basic'] = ['current_occupant' => ['id' => 'occ_guard', 'platform_status' => 'disabled']];
$cases['instance_has_occupants'] = guard_station($occupied);
$binned = guard_instance('ti_delete');
$binned['occupant_bin'] = $bin['occupant_bin'];
$cases['instance_has_bin_entries'] = guard_station($binned);
$drafted = guard_instance('ti_delete');
$drafted['tiers']['basic'] = ['current_occupant' => null, 'drafts' => ['overview' => ['label' => 'Draft']]];
$cases['instance_has_drafts'] = guard_station($drafted);

foreach ($cases as $expectedCode => $station) {
    $tierGuardOption = $station;
    $response = (new PackageStationController(new PackageRepository()))->deleteTierInstance(
        new WP_REST_Request(['instance' => 'ti_delete'])
    );
    check_tier_guard($response->get_status() === 409, "{$expectedCode} returns 409");
    check_tier_guard(($response->get_data()['code'] ?? null) === $expectedCode, "{$expectedCode} is exact");
}

$tierGuardOption = guard_station(guard_instance('ti_delete'));
$deleted = (new PackageStationController(new PackageRepository()))->deleteTierInstance(
    new WP_REST_Request(['instance' => 'ti_delete'])
);
check_tier_guard($deleted->get_status() === 200, 'fully empty unassigned instance deletes');
check_tier_guard($tierGuardOption['tier_instances'] === [], 'delete removes only the empty instance');

echo "Tier instance guard checks passed.\n";
