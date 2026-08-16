<?php

declare(strict_types=1);

// Milestone 1's footer Apply sends title, description, and
// allowed_rate_sheet_ids and direct Bundle access together in ONE PATCH — bundling what the Overview
// and Rate Sheet Access modules each locally committed rather than issuing
// two separate authoritative writes. Nothing else in this suite exercises
// PackageStationController::updateTierInstance() with a combined payload.

$tierUpdateOption = null;

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
        global $tierUpdateOption;
        return $key === 'cz_package_station' ? $tierUpdateOption : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $tierUpdateOption;
        if ($key === 'cz_package_station') { $tierUpdateOption = $value; }
        return true;
    }
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
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_tier_update(bool $condition, string $message): void
{
    if (!$condition) { throw new RuntimeException('Tier instance update: ' . $message); }
}

function update_instance(string $id): array
{
    return [
        'tier_instance_id' => $id, 'title' => 'Original', 'description' => 'Original description',
        'status' => 'disabled', 'allowed_rate_sheet_ids' => [], 'allowed_rate_sheet_bundles' => [], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TierInstanceSchema::emptyTierMap(), 'occupant_bin' => [],
    ];
}

function update_station(array $instance): array
{
    return [
        'platform_status' => 'disabled', 'tier_instances' => [$instance], 'tier_assignments' => [],
        'promotions' => [],
        'package_manager' => PackageManagerSchema::sanitize(['rate_sheets' => [
            ['rate_sheet_id' => 'rs_a', 'title' => 'A', 'status' => 'active', 'groups' => [], 'items' => [], 'bundles' => [['bundle_id' => 'ba', 'title' => 'Bundle A', 'status' => 'active', 'items' => []]]],
            ['rate_sheet_id' => 'rs_b', 'title' => 'B', 'status' => 'active', 'groups' => [], 'items' => [], 'bundles' => [['bundle_id' => 'bb', 'title' => 'Bundle B', 'status' => 'active', 'items' => []]]],
        ]]),
        'legacy_host_service_id' => 0,
    ];
}

function controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository());
}

function instance_from_option(string $id): array
{
    global $tierUpdateOption;
    return TierInstanceSchema::findInstance($tierUpdateOption['tier_instances'], $id) ?? [];
}

// Apply's exact payload shape: title, description, and allowed_rate_sheet_ids
// arrive together and all three land in one write.
$tierUpdateOption = update_station(update_instance('ti_apply'));
$response = controller()->updateTierInstance(new WP_REST_Request(
    ['instance' => 'ti_apply'],
    ['title' => 'Renamed', 'description' => 'New description', 'allowed_rate_sheet_ids' => ['rs_a', 'rs_b'],
        'allowed_rate_sheet_bundles' => [['rate_sheet_id' => 'rs_a', 'bundle_id' => 'ba']]],
));
check_tier_update($response->get_status() === 200, 'a combined update succeeds');
$saved = $response->get_data()['tier_instance'];
check_tier_update($saved['title'] === 'Renamed', 'title lands from the combined payload');
check_tier_update($saved['description'] === 'New description', 'description lands from the combined payload');
check_tier_update($saved['allowed_rate_sheet_ids'] === ['rs_a', 'rs_b'], 'allowed_rate_sheet_ids lands from the combined payload');
check_tier_update($saved['allowed_rate_sheet_bundles'] === [['rate_sheet_id' => 'rs_a', 'bundle_id' => 'ba']], 'direct Bundle access lands from the combined payload');
check_tier_update(instance_from_option('ti_apply')['title'] === 'Renamed', 'the combined update persists to storage');

// A field the caller omits is left exactly as stored — Apply always sends all
// three today, but the endpoint's own field-independence must not regress.
$tierUpdateOption = update_station(update_instance('ti_partial'));
controller()->updateTierInstance(new WP_REST_Request(
    ['instance' => 'ti_partial'],
    ['title' => 'Only title changes'],
));
$partial = instance_from_option('ti_partial');
check_tier_update($partial['title'] === 'Only title changes', 'an omitted-sibling update still applies the given field');
check_tier_update($partial['description'] === 'Original description', 'description is untouched when the payload omits it');
check_tier_update($partial['allowed_rate_sheet_ids'] === [], 'allowed_rate_sheet_ids is untouched when the payload omits it');
check_tier_update($partial['allowed_rate_sheet_bundles'] === [], 'Bundle access is untouched when the payload omits it');

$tierUpdateOption = update_station(update_instance('ti_bundles'));
controller()->updateTierInstance(new WP_REST_Request(
    ['instance' => 'ti_bundles'],
    ['allowed_rate_sheet_ids' => ['rs_a'], 'allowed_rate_sheet_bundles' => [
        ['rate_sheet_id' => 'rs_a', 'bundle_id' => 'ba'],
        ['rate_sheet_id' => 'rs_a', 'bundle_id' => 'missing'],
        ['rate_sheet_id' => 'rs_b', 'bundle_id' => 'bb'],
    ]],
));
check_tier_update(
    instance_from_option('ti_bundles')['allowed_rate_sheet_bundles'] === [['rate_sheet_id' => 'rs_a', 'bundle_id' => 'ba']],
    'Bundle access reads only direct bundles under the allowed Rate Sheet',
);
controller()->updateTierInstance(new WP_REST_Request(
    ['instance' => 'ti_bundles'], ['allowed_rate_sheet_ids' => []],
));
check_tier_update(instance_from_option('ti_bundles')['allowed_rate_sheet_bundles'] === [], 'removing parent Rate Sheet access removes its Bundle access');

// An unresolved Rate Sheet id in the payload is dropped, not stored blind.
$tierUpdateOption = update_station(update_instance('ti_unknown_sheet'));
controller()->updateTierInstance(new WP_REST_Request(
    ['instance' => 'ti_unknown_sheet'],
    ['allowed_rate_sheet_ids' => ['rs_a', 'rs_ghost']],
));
check_tier_update(
    instance_from_option('ti_unknown_sheet')['allowed_rate_sheet_ids'] === ['rs_a'],
    'an unresolved Rate Sheet id in the combined payload is silently dropped, never stored',
);

// An unknown instance is reported explicitly and writes nothing.
$tierUpdateOption = update_station(update_instance('ti_real'));
$beforeStation = serialize($tierUpdateOption);
$missing = controller()->updateTierInstance(new WP_REST_Request(
    ['instance' => 'ti_missing'],
    ['title' => 'Never'],
));
check_tier_update(($missing->get_data()['code'] ?? null) === 'unknown_tier_instance', 'an unknown instance id is reported explicitly');
check_tier_update(serialize($tierUpdateOption) === $beforeStation, 'an unknown instance update leaves station bytes unchanged');

// ── Rate Sheet access semantic correction (2026-08-15) ──────────────────────
// A Tier system is an independent Package-owned capability instance. Rate
// Sheet access is a deliberate later admin decision, never something creation
// or Family assignment grants implicitly — an empty allowed_rate_sheet_ids
// means nothing is configured yet, not "every active Rate Sheet".

$tierUpdateOption = update_station(update_instance('ti_seed'));
$created = controller()->createTierInstance(new WP_REST_Request(['title' => 'New Tier System'], []));
check_tier_update($created->get_status() === 200, 'creating a Tier system succeeds with no Rate Sheet configuration at all');
$createdInstance = $created->get_data()['tier_instance'];
check_tier_update(
    $createdInstance['allowed_rate_sheet_ids'] === [],
    'a newly created Tier system starts with zero allowed Rate Sheets, not every active one',
);
$newId = $createdInstance['tier_instance_id'];
check_tier_update(
    instance_from_option($newId)['allowed_rate_sheet_ids'] === [],
    'the freshly created instance reloads with zero allowed Rate Sheets',
);

// The admin can move access [] -> [A,B] -> [A] -> [], and each step persists
// and round-trips through a fresh read exactly as stored — deselecting
// everything is a valid, savable state, never rejected or reinterpreted.
controller()->updateTierInstance(new WP_REST_Request(
    ['instance' => $newId], ['allowed_rate_sheet_ids' => ['rs_a', 'rs_b']],
));
check_tier_update(
    instance_from_option($newId)['allowed_rate_sheet_ids'] === ['rs_a', 'rs_b'],
    'access [] -> [A,B] persists and reloads exactly as stored',
);
controller()->updateTierInstance(new WP_REST_Request(
    ['instance' => $newId], ['allowed_rate_sheet_ids' => ['rs_a']],
));
check_tier_update(
    instance_from_option($newId)['allowed_rate_sheet_ids'] === ['rs_a'],
    'access [A,B] -> [A] persists and reloads exactly as stored',
);
controller()->updateTierInstance(new WP_REST_Request(
    ['instance' => $newId], ['allowed_rate_sheet_ids' => []],
));
check_tier_update(
    instance_from_option($newId)['allowed_rate_sheet_ids'] === [],
    'access [A] -> [] persists and reloads exactly as stored',
);

// A Rate Sheet created later must never silently become available to an
// existing Tier system: allowed_rate_sheet_ids is a fixed stored list, not a
// rule re-evaluated against whatever sheets happen to exist afterward.
global $tierUpdateOption;
$tierUpdateOption['package_manager']['rate_sheets'][] = PackageManagerSchema::sanitize([
    'rate_sheets' => [['rate_sheet_id' => 'rs_c', 'title' => 'C', 'status' => 'active', 'groups' => [], 'items' => []]],
])['rate_sheets'][0];
check_tier_update(
    instance_from_option($newId)['allowed_rate_sheet_ids'] === [],
    'a newly created active Rate Sheet does not alter an existing Tier system\'s stored access',
);

echo "Tier instance update checks passed.\n";
