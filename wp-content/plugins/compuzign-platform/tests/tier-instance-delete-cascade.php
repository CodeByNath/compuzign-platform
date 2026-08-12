<?php

declare(strict_types=1);

// Temp-fix regression: deleting a Tier Group is now a destructive cascade
// scoped to that Tier Group's own tier_instance_id — it permanently removes
// every Default Tier occupant and occupant-bin entry it owns and disconnects
// its Package Family assignment, rather than refusing while any of them
// exist (see tests/tier-instance-guards.php for the guard behaviour this
// replaced). This file proves the cascade fires for the targeted Tier Group
// only, leaving a peer Tier Group and its own occupants/assignment/bin
// entirely untouched.

$tierDeleteCascadeOption = null;

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
        global $tierDeleteCascadeOption;
        return $key === 'cz_package_station' ? $tierDeleteCascadeOption : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $tierDeleteCascadeOption;
        if ($key === 'cz_package_station') { $tierDeleteCascadeOption = $value; }
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
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_tier_delete_cascade(bool $condition, string $message): void
{
    if (!$condition) { throw new RuntimeException('Tier instance delete cascade: ' . $message); }
}

function cascade_instance(string $id, array $occupant, array $binEntry): array
{
    $tiers = TierInstanceSchema::emptyTierMap();
    $tiers['basic'] = ['current_occupant' => $occupant];
    return [
        'tier_instance_id' => $id, 'title' => $id, 'status' => 'active',
        'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => $tiers, 'occupant_bin' => [$binEntry],
    ];
}

$alphaOccupant = ['id' => 'occ_alpha', 'platform_status' => 'active'];
$alphaBin = [
    'bin_id' => 'bin_alpha', 'origin_tier' => 'basic', 'status' => 'archived',
    'previous_enabled' => true, 'displaced_at' => null,
    'occupant' => ['id' => 'occ_alpha_bin', 'rate_sheet_id' => 'rs_alpha'],
];
$alpha = cascade_instance('ti_alpha', $alphaOccupant, $alphaBin);

$betaOccupant = ['id' => 'occ_beta', 'platform_status' => 'active'];
$betaBin = [
    'bin_id' => 'bin_beta', 'origin_tier' => 'basic', 'status' => 'archived',
    'previous_enabled' => true, 'displaced_at' => null,
    'occupant' => ['id' => 'occ_beta_bin', 'rate_sheet_id' => 'rs_beta'],
];
$beta = cascade_instance('ti_beta', $betaOccupant, $betaBin);

$alphaAssignment = [
    'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_alpha', 'ti_alpha'),
    'consumer_type' => 'package_family', 'consumer_id' => 'pcg_alpha', 'tier_instance_id' => 'ti_alpha',
];
$betaAssignment = [
    'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_beta', 'ti_beta'),
    'consumer_type' => 'package_family', 'consumer_id' => 'pcg_beta', 'tier_instance_id' => 'ti_beta',
];

$tierDeleteCascadeOption = [
    'platform_status' => 'active',
    'tier_instances' => [$alpha, $beta],
    'tier_assignments' => [$alphaAssignment, $betaAssignment],
    'promotions' => [], 'package_manager' => PackageManagerSchema::defaultManager(),
    'legacy_host_service_id' => 0,
];

$response = (new PackageStationController(new PackageRepository()))->deleteTierInstance(
    new WP_REST_Request(['instance' => 'ti_alpha'])
);

check_tier_delete_cascade($response->get_status() === 200, 'deleting an owning Tier Group succeeds instead of refusing');
check_tier_delete_cascade(($response->get_data()['success'] ?? null) === true, 'response reports success');
check_tier_delete_cascade(($response->get_data()['deleted'] ?? null) === 'ti_alpha', 'response names the deleted Tier Group');

$persisted = $tierDeleteCascadeOption;

check_tier_delete_cascade(
    TierInstanceSchema::findInstance($persisted['tier_instances'], 'ti_alpha') === null,
    'the Tier Group itself is gone'
);
check_tier_delete_cascade(
    TierAssignmentSchema::findForInstance($persisted['tier_assignments'], 'ti_alpha') === null,
    'its Package Family assignment is removed'
);
foreach ($persisted['tier_assignments'] as $row) {
    check_tier_delete_cascade($row['assignment_id'] !== $alphaAssignment['assignment_id'], 'the alpha assignment row no longer exists');
}

$survivingBeta = TierInstanceSchema::findInstance($persisted['tier_instances'], 'ti_beta');
check_tier_delete_cascade($survivingBeta !== null, 'a peer Tier Group survives the delete');
check_tier_delete_cascade(
    ($survivingBeta['tiers']['basic']['current_occupant']['id'] ?? null) === 'occ_beta',
    'the peer Tier Group keeps its own Default Tier occupant'
);
check_tier_delete_cascade(
    ($survivingBeta['occupant_bin'][0]['bin_id'] ?? null) === 'bin_beta',
    'the peer Tier Group keeps its own occupant-bin entry'
);
check_tier_delete_cascade(
    TierAssignmentSchema::findForInstance($persisted['tier_assignments'], 'ti_beta') !== null,
    'the peer Tier Group keeps its own Package Family assignment'
);

// ── Duplicate / stale assignment rows ──────────────────────────────────────
// assign() enforces at-most-one-assignment-per-instance only at its own call
// site (TierAssignmentSchema::assign, guarded by findForInstance() !== null);
// nothing re-checks that invariant on every write — saveStation()/
// loadStation() never re-run sanitizeAssignments(), and at least one write
// path (PackageFamiliesController::persistGroups()) round-trips
// tier_assignments verbatim. So storage itself carries no structural
// guarantee against a second, legacy, or malformed row surviving for the
// same tier_instance_id. findForInstance() alone would only see the first
// such row; this proves the delete cascade clears every one of them, not
// just the first, while leaving a peer instance's own assignment untouched.

$gammaOccupant = ['id' => 'occ_gamma', 'platform_status' => 'active'];
$gammaBin = [
    'bin_id' => 'bin_gamma', 'origin_tier' => 'basic', 'status' => 'archived',
    'previous_enabled' => true, 'displaced_at' => null,
    'occupant' => ['id' => 'occ_gamma_bin', 'rate_sheet_id' => 'rs_gamma'],
];
$gamma = cascade_instance('ti_gamma', $gammaOccupant, $gammaBin);

$deltaOccupant = ['id' => 'occ_delta', 'platform_status' => 'active'];
$deltaBin = [
    'bin_id' => 'bin_delta', 'origin_tier' => 'basic', 'status' => 'archived',
    'previous_enabled' => true, 'displaced_at' => null,
    'occupant' => ['id' => 'occ_delta_bin', 'rate_sheet_id' => 'rs_delta'],
];
$delta = cascade_instance('ti_delta', $deltaOccupant, $deltaBin);

// The row a normal assign() would have produced.
$gammaAssignmentPrimary = [
    'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_gamma_primary', 'ti_gamma'),
    'consumer_type' => 'package_family', 'consumer_id' => 'pcg_gamma_primary', 'tier_instance_id' => 'ti_gamma',
];
// A stale/legacy duplicate: a DIFFERENT consumer, so a DIFFERENT
// assignment_id — the exact shape findForInstance()+unassign(one id) would
// silently leave behind.
$gammaAssignmentDuplicate = [
    'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_gamma_duplicate', 'ti_gamma'),
    'consumer_type' => 'package_family', 'consumer_id' => 'pcg_gamma_duplicate', 'tier_instance_id' => 'ti_gamma',
];
// A malformed row: references the instance but carries no assignment_id at
// all (e.g. hand-edited/partially-migrated data).
$gammaAssignmentMalformed = [
    'consumer_type' => 'package_family', 'consumer_id' => 'pcg_gamma_malformed', 'tier_instance_id' => 'ti_gamma',
];
$deltaAssignment = [
    'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_delta', 'ti_delta'),
    'consumer_type' => 'package_family', 'consumer_id' => 'pcg_delta', 'tier_instance_id' => 'ti_delta',
];

$tierDeleteCascadeOption = [
    'platform_status' => 'active',
    'tier_instances' => [$gamma, $delta],
    'tier_assignments' => [
        $gammaAssignmentPrimary, $deltaAssignment, $gammaAssignmentDuplicate, $gammaAssignmentMalformed,
    ],
    'promotions' => [], 'package_manager' => PackageManagerSchema::defaultManager(),
    'legacy_host_service_id' => 0,
];

$duplicateResponse = (new PackageStationController(new PackageRepository()))->deleteTierInstance(
    new WP_REST_Request(['instance' => 'ti_gamma'])
);
check_tier_delete_cascade($duplicateResponse->get_status() === 200, 'deleting a Tier Group with duplicate assignment rows still succeeds');

$persistedDuplicates = $tierDeleteCascadeOption;

$remainingGammaRows = array_values(array_filter(
    $persistedDuplicates['tier_assignments'],
    static fn(array $row): bool => ($row['tier_instance_id'] ?? null) === 'ti_gamma'
));
check_tier_delete_cascade($remainingGammaRows === [], 'every assignment row referencing the deleted instance is removed, including duplicates and malformed rows');
check_tier_delete_cascade(
    TierInstanceSchema::findInstance($persistedDuplicates['tier_instances'], 'ti_gamma') === null,
    'the duplicate-assignment Tier Group itself is gone'
);

$survivingDelta = TierAssignmentSchema::findForInstance($persistedDuplicates['tier_assignments'], 'ti_delta');
check_tier_delete_cascade(
    $survivingDelta !== null && $survivingDelta['assignment_id'] === $deltaAssignment['assignment_id'],
    'a peer instance sharing the same assignment array keeps its own untouched assignment row'
);
check_tier_delete_cascade(
    TierInstanceSchema::findInstance($persistedDuplicates['tier_instances'], 'ti_delta') !== null,
    'the peer Tier Group itself survives'
);

echo "Tier instance delete cascade checks passed.\n";
