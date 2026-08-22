<?php

declare(strict_types=1);

$tierMutationOption = null;

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
        global $tierMutationOption;
        return $key === 'cz_package_station' ? $tierMutationOption : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $tierMutationOption;
        if ($key === 'cz_package_station') { $tierMutationOption = $value; }
        return true;
    }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 77 ? new WP_Post($id, 'Mutation Service') : null; }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $id, string $key, bool $single = false): mixed { return $single ? [] : []; }
}
if (!function_exists('wp_get_post_terms')) {
    function wp_get_post_terms(int $postId, string $taxonomy, array $args = []): array { return []; }
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

use CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_tier_mutation(bool $condition, string $message): void
{
    if (!$condition) { throw new RuntimeException('Tier instance mutations: ' . $message); }
}

function mutation_instance(string $id, string $occupantId, string $label): array
{
    $slot = PackageSchema::commitTierLifecycle(PackageSchema::upsertOccupant([], [
        'label' => $label, 'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
        'rate_sheet_id' => 'rs_primary', 'rate_sheet_items' => [],
        'inclusions_override' => [], 'features' => [], 'faq_refs' => [],
    ], true));
    $slot['current_occupant']['id'] = $occupantId;
    return [
        'tier_instance_id' => $id, 'title' => strtoupper($id), 'status' => 'active',
        'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => [...TierInstanceSchema::emptyTierMap(), 'basic' => $slot],
        'occupant_bin' => [],
    ];
}

function mutation_station(): array
{
    $primary = mutation_instance('ti_primary', 'occ_primary', 'Primary');
    return [
        'platform_status' => 'active', 'tiers' => $primary['tiers'],
        'popular_tier' => null, 'popular_label' => '', 'occupant_bin' => [],
        'tier_instances' => [$primary, mutation_instance('ti_b', 'occ_b', 'B')],
        'tier_assignments' => [], 'promotions' => [],
        'package_manager' => PackageManagerSchema::defaultManager(),
        'legacy_host_service_id' => 77,
    ];
}

function mutation_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository());
}

function instance_from_option(string $id): array
{
    global $tierMutationOption;
    return TierInstanceSchema::findInstance($tierMutationOption['tier_instances'], $id) ?? [];
}

// A scoped occupant save changes only A; B may hold the same fixed slot independently.
$tierMutationOption = mutation_station();
$beforeB = serialize(instance_from_option('ti_b')['tiers']['basic']);
$response = mutation_controller()->savePackageStationTier(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['label' => 'Primary updated', 'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
        'inclusions_override' => [], 'faq_refs' => [], 'popular' => false, 'enabled' => true]
));
check_tier_mutation($response->get_status() === 200, 'scoped occupant save succeeds');
check_tier_mutation(serialize(instance_from_option('ti_b')['tiers']['basic']) === $beforeB, 'save in A leaves B basic byte-identical');
check_tier_mutation(instance_from_option('ti_primary')['tiers']['basic']['current_occupant']['id'] === 'occ_primary', 'save preserves A occupant id');
check_tier_mutation(instance_from_option('ti_b')['tiers']['basic']['current_occupant']['id'] === 'occ_b', 'instances hold independent occupant ids in the same slot');

// Draft, revert, and settle remain within A.
$beforeBDrafts = serialize(instance_from_option('ti_b')['tiers']['basic']['drafts']);
mutation_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'overview'],
    ['label' => 'Draft A', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary']
));
check_tier_mutation(serialize(instance_from_option('ti_b')['tiers']['basic']['drafts']) === $beforeBDrafts, 'draft in A leaves B drafts untouched');
mutation_controller()->revertPackageStationTierModule(new WP_REST_Request([
    'id' => 77, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'overview',
]));
mutation_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'overview'],
    ['label' => 'Settled A', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary']
));
mutation_controller()->settlePackageStationTier(new WP_REST_Request([
    'id' => 77, 'instance' => 'ti_primary', 'tier' => 'basic',
]));
check_tier_mutation(serialize(instance_from_option('ti_b')['tiers']['basic']['drafts']) === $beforeBDrafts, 'settle in A leaves B drafts untouched');

// Popular and enabled state are instance-local.
$beforeB = serialize(instance_from_option('ti_b'));
mutation_controller()->setPackageStationPopular(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_primary'], ['tier_id' => 'basic', 'label' => 'Best']
));
mutation_controller()->setPackageStationTierEnabled(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_primary', 'tier' => 'basic'], ['enabled' => false]
));
check_tier_mutation(serialize(instance_from_option('ti_b')) === $beforeB, 'popular and enabled mutations leave B byte-identical');

// Archive, cross-instance bin isolation, restore, and swap all remain within A.
mutation_controller()->setPackageStationTierEnabled(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_primary', 'tier' => 'basic'], ['enabled' => true]
));
$beforeB = serialize(instance_from_option('ti_b'));
$archived = mutation_controller()->archivePackageStationTierOccupant(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_primary', 'tier' => 'basic'], []
));
$binId = $archived->get_data()['bin_entry']['bin_id'];
check_tier_mutation(serialize(instance_from_option('ti_b')) === $beforeB, 'archive in A changes only A bin');
$cross = mutation_controller()->restorePackageStationBinEntry(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_b', 'bin' => $binId], []
));
check_tier_mutation(($cross->get_data()['code'] ?? null) === 'unknown_bin_entry', 'a bin id from another instance is unknown');
mutation_controller()->restorePackageStationBinEntry(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_primary', 'bin' => $binId], []
));
check_tier_mutation(instance_from_option('ti_primary')['tiers']['basic']['current_occupant']['id'] === 'occ_primary', 'restore preserves occupant identity');

// Archive the old occupant, create a replacement, then swap the old occupant back.
$oldArchive = mutation_controller()->archivePackageStationTierOccupant(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_primary', 'tier' => 'basic'], []
));
$oldBinId = $oldArchive->get_data()['bin_entry']['bin_id'];
mutation_controller()->savePackageStationTier(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['label' => 'Replacement', 'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
        'inclusions_override' => [], 'faq_refs' => [], 'popular' => false, 'enabled' => true]
));
$replacementId = instance_from_option('ti_primary')['tiers']['basic']['current_occupant']['id'];
$swap = mutation_controller()->restorePackageStationBinEntry(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_primary', 'bin' => $oldBinId], ['mode' => 'swap']
));
check_tier_mutation($swap->get_data()['displaced_entry']['occupant']['id'] === $replacementId, 'swap displaces only A current occupant');
check_tier_mutation(instance_from_option('ti_primary')['tiers']['basic']['current_occupant']['id'] === 'occ_primary', 'swap returns the original occupant id');
check_tier_mutation(serialize(instance_from_option('ti_b')) === $beforeB, 'swap inside A leaves B byte-identical');

$displacedBinId = $swap->get_data()['displaced_entry']['bin_id'];
mutation_controller()->trashPackageStationBinEntry(new WP_REST_Request([
    'id' => 77, 'instance' => 'ti_primary', 'bin' => $displacedBinId,
]));
mutation_controller()->deletePackageStationBinEntry(new WP_REST_Request([
    'id' => 77, 'instance' => 'ti_primary', 'bin' => $displacedBinId,
]));
check_tier_mutation(serialize(instance_from_option('ti_b')) === $beforeB, 'trash and bin delete in A leave B byte-identical');

// Unknown instance wins before slot work and writes nothing.
$beforeStation = serialize($tierMutationOption);
$unknown = mutation_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 77, 'instance' => 'ti_missing', 'tier' => 'basic', 'module' => 'overview'], ['label' => 'Never']
));
check_tier_mutation(($unknown->get_data()['code'] ?? null) === 'unknown_tier_instance', 'unknown instance is reported explicitly');
check_tier_mutation(serialize($tierMutationOption) === $beforeStation, 'unknown instance leaves station bytes unchanged');

// Alias retirement: an omitted instance is invalid and must never fall through
// to ti_primary or write any station bytes.
$tierMutationOption = mutation_station();
$beforeStation = serialize($tierMutationOption);
$missing = mutation_controller()->setPackageStationPopular(new WP_REST_Request(
    ['id' => 77], ['tier_id' => 'basic', 'label' => 'Must not write']
));
check_tier_mutation($missing->get_status() === 404, 'missing Tier instance identity returns the established not-found response');
check_tier_mutation(($missing->get_data()['code'] ?? null) === 'unknown_tier_instance', 'missing Tier instance identity cannot alias and uses the established error code');
check_tier_mutation(serialize($tierMutationOption) === $beforeStation, 'missing Tier instance identity leaves station bytes unchanged');

echo "Tier instance mutation checks passed.\n";
