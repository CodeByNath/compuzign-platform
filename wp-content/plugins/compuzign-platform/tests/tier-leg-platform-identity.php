<?php

declare(strict_types=1);

/*
 * Commercial Leg Platform identity contract — Phase 2 of the Leg identity
 * model: CZTL/CZTEL assigned through the SAME reserve -> persist -> bind
 * infrastructure CZT/CZTA/CZTE already use (PackagePlatformIdentifierService/
 * Adapters, PackageRepository's tierLeg… / tierEditionLeg… callbacks), scoped
 * to Default Leg + every Additional Leg, for both the Tier occupant and a
 * Tier Edition.
 *
 * This exercises the real PlatformIdentifierStation, PackagePlatformIdentifierService/
 * Adapters, PackageRepository, PackageSchema, and TierInstanceSchema through the
 * real PackageStationController — only WordPress core functions are stubbed,
 * matching tier-occupant-platform-identity.php's own convention.
 *
 * Central proof (extends the Phase 1 identity contract into Platform IDs):
 * reordering Legs — the exact move-D-from-4-to-2 case — must NEVER change,
 * regenerate, or re-bind any Leg's already-assigned CZTL/CZTEL. Only
 * sort_order moves.
 */

$tlpiOptions = [];

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $value): string { return strtolower((string) preg_replace('/[^a-z0-9_\-]/', '', (string) $value)); }
}
if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $tlpiOptions;
        if (array_key_exists($key, $tlpiOptions)) return false;
        $tlpiOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $tlpiOptions;
        return array_key_exists($key, $tlpiOptions) ? $tlpiOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $tlpiOptions;
        $tlpiOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 909 ? new WP_Post($id, 'Tier Leg Identity Service') : null; }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-08-22 00:00:00'; }
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
use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_leg_identity_contract(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Commercial Leg Platform identity: ' . $message);
}

function tlpi_default_station(): array
{
    $primaryInstance = [
        'tier_instance_id' => 'ti_primary', 'cz_platform_id' => '',
        'title' => 'Primary Tier Set', 'description' => '', 'status' => 'disabled',
        'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TierInstanceSchema::emptyTierMap(), 'occupant_bin' => [],
    ];
    return [
        'platform_status' => 'disabled',
        'tier_instances' => [$primaryInstance],
        'tier_assignments' => [], 'sort_position' => 0,
        'bundle' => ['title' => '', 'description' => '', 'price' => null],
        'promotions' => [], 'package_manager' => PackageManagerSchema::defaultManager(),
        'legacy_host_service_id' => 909,
    ];
}

function tlpi_new_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

function tlpi_instance(): array
{
    global $tlpiOptions;
    return TierInstanceSchema::findInstance($tlpiOptions['cz_package_station']['tier_instances'], 'ti_primary') ?? [];
}

function tlpi_four_legs(): array
{
    return [
        ['billing_cycle' => 'A-cycle', 'from_month' => 1,  'to_month' => 10],
        ['billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20],
        ['billing_cycle' => 'C-cycle', 'from_month' => 21, 'to_month' => 30],
        ['billing_cycle' => 'D-cycle', 'from_month' => 31, 'to_month' => 40],
    ];
}

function tlpi_by_cycle(array $legs, string $cycle): array
{
    foreach ($legs as $leg) {
        if ($leg['billing_cycle'] === $cycle) return $leg;
    }
    throw new RuntimeException("No leg with billing_cycle {$cycle}");
}

function tlpi_bound_count(string $entityType): int
{
    global $tlpiOptions;
    $count = 0;
    foreach ($tlpiOptions as $key => $value) {
        if (str_starts_with((string) $key, 'cz_platform_identifier_v1_')
            && is_array($value)
            && ($value['entity_type'] ?? null) === $entityType
            && ($value['status'] ?? null) === PlatformIdentifierStation::STATUS_BOUND
        ) { $count++; }
    }
    return $count;
}

// ═══════════════════════════════════════════════════════════════════════════
// PART A — Tier occupant Legs (Default + Additional)
// ═══════════════════════════════════════════════════════════════════════════

$tlpiOptions = ['cz_package_station' => tlpi_default_station()];

tlpi_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'overview'],
    ['label' => 'Starter Cloud', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary'],
));
tlpi_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'pricing_rules'],
    ['rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'monthly', 'legs' => tlpi_four_legs()],
));
$publish1 = tlpi_new_controller()->settlePackageStationTier(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
));
check_leg_identity_contract($publish1->get_status() === 200, 'first Publish (with 4 Additional Legs already drafted) returns successfully');
check_leg_identity_contract((bool) $publish1->get_data()['success'], 'first Publish response reports success');

$occupant1 = tlpi_instance()['tiers']['basic']['current_occupant'];
$occupantId = $occupant1['id'];
check_leg_identity_contract(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_LEG, $occupant1['default_leg_platform_id'] ?? ''), 'the occupant\'s own Default Leg receives a validly formatted CZTL on first Publish');
check_leg_identity_contract(count($occupant1['legs']) === 4, 'all four Additional Legs survive Publish');
foreach (['A-cycle', 'B-cycle', 'C-cycle', 'D-cycle'] as $cycle) {
    $leg = tlpi_by_cycle($occupant1['legs'], $cycle);
    check_leg_identity_contract(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_LEG, $leg['platform_id'] ?? ''), "Additional Leg {$cycle} receives a validly formatted CZTL on first Publish");
}
check_leg_identity_contract(
    count(array_unique(array_merge([$occupant1['default_leg_platform_id']], array_column($occupant1['legs'], 'platform_id')))) === 5,
    'Default Leg + all four Additional Legs receive five DISTINCT CZTL identities'
);
check_leg_identity_contract(tlpi_bound_count(PlatformIdentifierPolicy::TIER_LEG) === 5, 'exactly five CZTL registry records are bound after first Publish');

// Native reference correctness — each CZTL binds to the exact Leg it names.
$defaultBinding = $tlpiOptions['cz_platform_identifier_v1_' . $occupant1['default_leg_platform_id']];
check_leg_identity_contract(
    $defaultBinding['native_reference'] === PackagePlatformNativeReference::tierLeg('ti_primary', $occupantId, 'default'),
    'the Default Leg\'s CZTL binds to the (instance, occupant, "default") native reference'
);
$legA1 = tlpi_by_cycle($occupant1['legs'], 'A-cycle');
$aBinding = $tlpiOptions['cz_platform_identifier_v1_' . $legA1['platform_id']];
check_leg_identity_contract(
    $aBinding['native_reference'] === PackagePlatformNativeReference::tierLeg('ti_primary', $occupantId, $legA1['id']),
    'Leg A\'s CZTL binds to the (instance, occupant, its own leg id) native reference'
);

// ── THE reorder proof: move D from position 4 to position 2. Same ids and
//    billing terms resubmitted with reassigned sort_order — nothing else. ──
$legIdA = tlpi_by_cycle($occupant1['legs'], 'A-cycle')['id'];
$legIdB = tlpi_by_cycle($occupant1['legs'], 'B-cycle')['id'];
$legIdC = tlpi_by_cycle($occupant1['legs'], 'C-cycle')['id'];
$legIdD = tlpi_by_cycle($occupant1['legs'], 'D-cycle')['id'];
$platformIdDefault = $occupant1['default_leg_platform_id'];
$platformIdA = tlpi_by_cycle($occupant1['legs'], 'A-cycle')['platform_id'];
$platformIdB = tlpi_by_cycle($occupant1['legs'], 'B-cycle')['platform_id'];
$platformIdC = tlpi_by_cycle($occupant1['legs'], 'C-cycle')['platform_id'];
$platformIdD = tlpi_by_cycle($occupant1['legs'], 'D-cycle')['platform_id'];

// Deliberately omits platform_id — a real client save can never carry it
// (PackageStationController::rejectPlatformIdMutation rejects the whole
// request outright if it does); identity must survive reordering WITHOUT
// the client ever round-tripping it.
tlpi_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'pricing_rules'],
    ['rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'monthly', 'legs' => [
        ['id' => $legIdA, 'billing_cycle' => 'A-cycle', 'from_month' => 1,  'to_month' => 10, 'sort_order' => 0],
        ['id' => $legIdB, 'billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20, 'sort_order' => 2],
        ['id' => $legIdC, 'billing_cycle' => 'C-cycle', 'from_month' => 21, 'to_month' => 30, 'sort_order' => 3],
        ['id' => $legIdD, 'billing_cycle' => 'D-cycle', 'from_month' => 31, 'to_month' => 40, 'sort_order' => 1],
    ]],
));
$publish2 = tlpi_new_controller()->settlePackageStationTier(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
));
check_leg_identity_contract($publish2->get_status() === 200, 'republish after reordering returns successfully');

$occupant2 = tlpi_instance()['tiers']['basic']['current_occupant'];
check_leg_identity_contract(
    array_column($occupant2['legs'], 'billing_cycle') === ['A-cycle', 'D-cycle', 'B-cycle', 'C-cycle'],
    'read-back order after the move is A, D, B, C'
);
check_leg_identity_contract($occupant2['default_leg_platform_id'] === $platformIdDefault, 'reordering never changes the Default Leg\'s CZTL');
check_leg_identity_contract(tlpi_by_cycle($occupant2['legs'], 'A-cycle')['platform_id'] === $platformIdA, 'A keeps its own CZTL after the move');
check_leg_identity_contract(tlpi_by_cycle($occupant2['legs'], 'B-cycle')['platform_id'] === $platformIdB, 'B keeps its own CZTL after the move');
check_leg_identity_contract(tlpi_by_cycle($occupant2['legs'], 'C-cycle')['platform_id'] === $platformIdC, 'C keeps its own CZTL after the move');
check_leg_identity_contract(tlpi_by_cycle($occupant2['legs'], 'D-cycle')['platform_id'] === $platformIdD, 'D keeps its own CZTL after the move — the identity spec\'s central claim');
check_leg_identity_contract(tlpi_bound_count(PlatformIdentifierPolicy::TIER_LEG) === 5, 'reordering mints no new CZTL — still exactly five bound');

// ── Idempotency: an already fully-identified occupant is untouched by a
//    repeat Publish with no further changes. ─────────────────────────────
$beforeIdempotent = serialize(tlpi_instance()['tiers']['basic']);
$publish3 = tlpi_new_controller()->settlePackageStationTier(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
));
check_leg_identity_contract($publish3->get_status() === 200, 'a further repeat Publish still succeeds');
check_leg_identity_contract(serialize(tlpi_instance()['tiers']['basic']) === $beforeIdempotent, 'a fully-identified occupant is left byte-identical by a repeat Publish');

// ═══════════════════════════════════════════════════════════════════════════
// PART B — Tier Edition Legs (Default + Additional), same reorder proof
// ═══════════════════════════════════════════════════════════════════════════

$created = tlpi_new_controller()->createTierEdition(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['title' => 'Annual'],
));
check_leg_identity_contract((bool) $created->get_data()['success'], 'Edition creation succeeds');
$editionId = $created->get_data()['edition_id'];

tlpi_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
    ['title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'yearly', 'legs' => tlpi_four_legs()],
));
tlpi_new_controller()->settleTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
));
$activate1 = tlpi_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'active'],
));
check_leg_identity_contract($activate1->get_status() === 200, 'first Edition activation returns successfully');
check_leg_identity_contract((bool) $activate1->get_data()['success'], 'first Edition activation response reports success');

$edition1 = $activate1->get_data()['edition'];
check_leg_identity_contract(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION, $edition1['edition_platform_id'] ?? ''), 'the Edition itself still receives its own CZTE');
check_leg_identity_contract(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION_LEG, $edition1['default_leg_platform_id'] ?? ''), 'the Edition\'s own Default Leg receives a validly formatted CZTEL on first Active');
foreach (['A-cycle', 'B-cycle', 'C-cycle', 'D-cycle'] as $cycle) {
    $leg = tlpi_by_cycle($edition1['legs'], $cycle);
    check_leg_identity_contract(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION_LEG, $leg['platform_id'] ?? ''), "Edition Additional Leg {$cycle} receives a validly formatted CZTEL on first Active");
}
check_leg_identity_contract(tlpi_bound_count(PlatformIdentifierPolicy::TIER_EDITION_LEG) === 5, 'exactly five CZTEL registry records are bound after first Edition activation');

$editionDefaultBinding = $tlpiOptions['cz_platform_identifier_v1_' . $edition1['default_leg_platform_id']];
check_leg_identity_contract(
    $editionDefaultBinding['native_reference'] === PackagePlatformNativeReference::tierEditionLeg('ti_primary', $occupantId, $editionId, 'default'),
    'the Edition\'s Default Leg CZTEL binds to the (instance, occupant, edition, "default") native reference'
);

// Reorder the Edition's own Legs, then re-Publish the Edition (settle + an
// already-Active status transition) — mirroring the admin UI's own Publish
// sequence (settle, then the status endpoint), exactly as the Tier's own
// re-Publish above did.
$eLegIdA = tlpi_by_cycle($edition1['legs'], 'A-cycle')['id'];
$eLegIdB = tlpi_by_cycle($edition1['legs'], 'B-cycle')['id'];
$eLegIdC = tlpi_by_cycle($edition1['legs'], 'C-cycle')['id'];
$eLegIdD = tlpi_by_cycle($edition1['legs'], 'D-cycle')['id'];
$ePlatformIdDefault = $edition1['default_leg_platform_id'];
$ePlatformIdA = tlpi_by_cycle($edition1['legs'], 'A-cycle')['platform_id'];
$ePlatformIdB = tlpi_by_cycle($edition1['legs'], 'B-cycle')['platform_id'];
$ePlatformIdC = tlpi_by_cycle($edition1['legs'], 'C-cycle')['platform_id'];
$ePlatformIdD = tlpi_by_cycle($edition1['legs'], 'D-cycle')['platform_id'];

// Same omission as the Tier occupant's own reorder save above — no
// platform_id in the payload, ever.
tlpi_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
    ['title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'yearly', 'legs' => [
        ['id' => $eLegIdA, 'billing_cycle' => 'A-cycle', 'from_month' => 1,  'to_month' => 10, 'sort_order' => 0],
        ['id' => $eLegIdB, 'billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20, 'sort_order' => 2],
        ['id' => $eLegIdC, 'billing_cycle' => 'C-cycle', 'from_month' => 21, 'to_month' => 30, 'sort_order' => 3],
        ['id' => $eLegIdD, 'billing_cycle' => 'D-cycle', 'from_month' => 31, 'to_month' => 40, 'sort_order' => 1],
    ]],
));
tlpi_new_controller()->settleTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
));
$activate2 = tlpi_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'active'],
));
check_leg_identity_contract($activate2->get_status() === 200, 'republishing the Edition after reordering its Legs returns successfully');

$edition2 = $activate2->get_data()['edition'];
check_leg_identity_contract(
    array_column($edition2['legs'], 'billing_cycle') === ['A-cycle', 'D-cycle', 'B-cycle', 'C-cycle'],
    'the Edition\'s own read-back order after the move is A, D, B, C'
);
check_leg_identity_contract($edition2['default_leg_platform_id'] === $ePlatformIdDefault, 'reordering never changes the Edition\'s Default Leg CZTEL');
check_leg_identity_contract(tlpi_by_cycle($edition2['legs'], 'A-cycle')['platform_id'] === $ePlatformIdA, 'Edition Leg A keeps its own CZTEL after the move');
check_leg_identity_contract(tlpi_by_cycle($edition2['legs'], 'D-cycle')['platform_id'] === $ePlatformIdD, 'Edition Leg D keeps its own CZTEL after the move — the identity spec\'s central claim, one level deeper');
check_leg_identity_contract(tlpi_bound_count(PlatformIdentifierPolicy::TIER_EDITION_LEG) === 5, 'reordering Edition Legs mints no new CZTEL — still exactly five bound');

echo "Commercial Leg Platform identity contract (Phase 2): PASS\n";
