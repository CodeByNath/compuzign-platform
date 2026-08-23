<?php

declare(strict_types=1);

/*
 * Commercial Legs — finite-commitment authoring cap.
 *
 * A finite commitment is the maximum legal commercial end for the Tier/
 * Edition. No Leg's own authored to_month may exceed it. Indefinite
 * (to_month === null) is never a violation on its own — it already resolves
 * correctly capped by clampCommercialLegTimelineToCommitment() at read
 * time, so the guard here does not special-case it. Legs may start late,
 * end early, overlap, or exist only in the middle of the commitment; there
 * is no "at least one Leg must reach the end" requirement and no gap
 * detection — the sole invariant is the cap itself.
 * PackageManagerSchema::checkFiniteCommitmentLegCap() is the pure check;
 * PackageSchema::settleTierSlot()/settleTierEditionOverview() enforce it at
 * the save boundary so a stale payload cannot bypass the editor's own cap.
 *
 * Deliberately separate from, and does not touch, the resolver's own
 * segmentation/bucketing/pricing (tests/commercial-leg-timeline.php) or the
 * orphaned-assignment pruning (tests/tier-leg-assignment-orphan-pruning.php).
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema as PMS;

function assertSameValue(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

function assertTrue(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function ccContainer(array $overrides): array
{
    return array_merge([
        'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
        'minimum_term_value' => null, 'minimum_term_unit' => null,
        'legs' => [],
    ], $overrides);
}

function ccLeg(string $platformId, int $from, ?int $to): array
{
    return ['id' => $platformId, 'platform_id' => $platformId, 'sort_order' => 0, 'billing_cycle' => 'monthly', 'from_month' => $from, 'to_month' => $to];
}

// ── 1. Commitment OFF — no unit/value — nothing enforced regardless of range ─

assertTrue(PMS::checkFiniteCommitmentLegCap(ccContainer([
    'to_month' => null,
    'legs' => [ccLeg('CZTL_1', 1, 999)],
])) === null, '1. no commitment configured: any authored range passes');

// ── 2. Valid: every Leg within the cap, none reaching it ────────────────────

assertTrue(PMS::checkFiniteCommitmentLegCap(ccContainer([
    'to_month' => 20, 'minimum_term_value' => 48, 'minimum_term_unit' => 'month',
    'legs' => [ccLeg('CZTL_2A', 5, 20), ccLeg('CZTL_2B', 12, 30)],
])) === null, '2. Default 1-20, Leg A 5-20, Leg B 12-30 — all within commitment 48, valid (no "must reach the end" rule)');

// ── 3. Valid: exactly one Leg lands exactly on the commitment end ───────────

assertTrue(PMS::checkFiniteCommitmentLegCap(ccContainer([
    'to_month' => 12, 'minimum_term_value' => 48, 'minimum_term_unit' => 'month',
    'legs' => [ccLeg('CZTL_3', 6, 48)],
])) === null, '3. Default 1-12, Leg 6-48 — valid, one Leg lands exactly on the cap');

// ── 4. Valid: Indefinite Leg under finite commitment — never a violation ────

assertTrue(PMS::checkFiniteCommitmentLegCap(ccContainer([
    'to_month' => null, 'minimum_term_value' => 48, 'minimum_term_unit' => 'month',
    'legs' => [ccLeg('CZTL_4', 5, null)],
])) === null, '4. Default Indefinite, Leg 5-Indefinite, commitment 48 — Indefinite passes through; the resolver clamp handles the rest');

// ── 5. Invalid: an Additional Leg's own to_month exceeds the cap ────────────

$v5 = PMS::checkFiniteCommitmentLegCap(ccContainer([
    'to_month' => 12, 'minimum_term_value' => 48, 'minimum_term_unit' => 'month',
    'legs' => [ccLeg('CZTL_5', 0, 56)],
]));
assertTrue($v5 !== null, '5. Leg 0-56 against commitment 48 is rejected');
assertSameValue(48, $v5['commitment_end'], '5. reported commitment end is 48');
assertSameValue(1, count($v5['violations']), '5. exactly one violation');
assertSameValue('CZTL_5', $v5['violations'][0]['source'], '5. the violating Leg is identified by its own identity');
assertSameValue(56, $v5['violations'][0]['to_month'], '5. the violating to_month is reported');

// ── 6. Invalid: two Additional Legs both exceed the cap ─────────────────────

$v6 = PMS::checkFiniteCommitmentLegCap(ccContainer([
    'to_month' => null, 'minimum_term_value' => 48, 'minimum_term_unit' => 'month',
    'legs' => [ccLeg('CZTL_6A', 5, 52), ccLeg('CZTL_6B', 12, 60)],
]));
assertTrue($v6 !== null, '6. both Legs exceeding commitment 48 are rejected together');
assertSameValue(2, count($v6['violations']), '6. both violations reported, not just the first');

// ── 7. Invalid: the Default Leg's own to_month exceeds the cap ──────────────

$v7 = PMS::checkFiniteCommitmentLegCap(ccContainer([
    'to_month' => 60, 'minimum_term_value' => 48, 'minimum_term_unit' => 'month',
    'legs' => [],
]));
assertTrue($v7 !== null, '7. Default alone, 1-60, against commitment 48 is rejected');
assertSameValue('default', $v7['violations'][0]['source'], '7. the Default Leg is identified by the internal source key at this layer');

// ── 8. Valid: a Leg landing exactly ON the cap is not itself a violation,
//         even though a sibling Leg elsewhere is within range ──────────────

assertTrue(PMS::checkFiniteCommitmentLegCap(ccContainer([
    'to_month' => 48, 'minimum_term_value' => 48, 'minimum_term_unit' => 'month',
    'legs' => [ccLeg('CZTL_8', 5, 20)],
])) === null, '8. Default 1-48 (exactly the cap), Leg 5-20 — valid');

echo "Commercial Legs finite-commitment cap contract (pure): PASS\n";

// ═══════════════════════════════════════════════════════════════════════════
// Controller-level: settleTierSlot()/settleTierEditionOverview() actually
// reject a violating payload (422) rather than silently persisting it, and
// still accept a valid one (200) — proving the guard is wired into both
// settle boundaries, not just reachable as a standalone pure function.
// ═══════════════════════════════════════════════════════════════════════════

$cclccOptions = [];

if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $value): string { return strtolower((string) preg_replace('/[^a-z0-9_\-]/', '', (string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $cclccOptions;
        if (array_key_exists($key, $cclccOptions)) return false;
        $cclccOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $cclccOptions;
        return array_key_exists($key, $cclccOptions) ? $cclccOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $cclccOptions;
        $cclccOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 910 ? new WP_Post($id, 'Commitment Cap Service') : null; }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $id, string $key, bool $single = false): mixed { return $single ? [] : []; }
}
if (!function_exists('wp_get_post_terms')) {
    function wp_get_post_terms(int $postId, string $taxonomy, array $args = []): array { return []; }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-08-23 00:00:00'; }
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
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_commitment_cap(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Commercial Legs commitment cap: ' . $message);
}

function cclcc_default_station(): array
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
        'promotions' => [], 'package_manager' => PMS::defaultManager(),
        'legacy_host_service_id' => 910,
    ];
}

function cclcc_new_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

function cclcc_instance(): array
{
    global $cclccOptions;
    return TierInstanceSchema::findInstance($cclccOptions['cz_package_station']['tier_instances'], 'ti_primary') ?? [];
}

// ═══════════════════════════════════════════════════════════════════════════
// PART A — Tier occupant: an Additional Leg authored past the commitment
// boundary blocks Publish (422); correcting it in place lets Publish through.
// ═══════════════════════════════════════════════════════════════════════════

$cclccOptions = ['cz_package_station' => cclcc_default_station()];

cclcc_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 910, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'overview'],
    ['label' => 'Starter Cloud', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary'],
));

cclcc_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 910, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'pricing_rules'],
    [
        'rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'monthly',
        'minimum_term_value' => 48, 'minimum_term_unit' => 'month',
        'legs' => [['billing_cycle' => 'yearly', 'from_month' => 1, 'to_month' => 56]],
    ],
));

$blocked = cclcc_new_controller()->settlePackageStationTier(new WP_REST_Request(
    ['id' => 910, 'instance' => 'ti_primary', 'tier' => 'basic'],
));
check_commitment_cap($blocked->get_status() === 422, 'Publish is rejected (422) when a Leg (0-56) exceeds the commitment (48)');
check_commitment_cap(
    str_contains((string) ($blocked->get_data()['message'] ?? ''), '48'),
    'the rejection message names the commitment boundary'
);
check_commitment_cap(
    cclcc_instance()['tiers']['basic']['current_occupant']['minimum_term_value'] === null
        && cclcc_instance()['tiers']['basic']['current_occupant']['legs'] === [],
    'the rejected Publish never writes the violating commitment/Legs into current_occupant'
);

// Correct the same Leg to end exactly at the commitment boundary — the
// authoring rule says nothing must reach it, but ending within/at the cap
// must now succeed.
cclcc_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 910, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'pricing_rules'],
    [
        'rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'monthly',
        'minimum_term_value' => 48, 'minimum_term_unit' => 'month',
        'legs' => [['billing_cycle' => 'yearly', 'from_month' => 1, 'to_month' => 20]],
    ],
));
$allowed = cclcc_new_controller()->settlePackageStationTier(new WP_REST_Request(
    ['id' => 910, 'instance' => 'ti_primary', 'tier' => 'basic'],
));
check_commitment_cap($allowed->get_status() === 200, 'Publish succeeds once the Leg (1-20) is within the commitment (48) — no "must reach the end" requirement');

// ═══════════════════════════════════════════════════════════════════════════
// PART B — Tier Edition: same guard at settleTierEditionOverview()'s own
// junction, one level deeper.
// ═══════════════════════════════════════════════════════════════════════════

$created = cclcc_new_controller()->createTierEdition(new WP_REST_Request(
    ['id' => 910, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['title' => 'Annual'],
));
$editionId = $created->get_data()['edition_id'];

cclcc_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 910, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
    [
        'title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'yearly',
        'minimum_term_value' => 24, 'minimum_term_unit' => 'month',
        'legs' => [['billing_cycle' => 'yearly', 'from_month' => 1, 'to_month' => 30]],
        'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 1]],
    ],
));
$editionBlocked = cclcc_new_controller()->settleTierEditionModule(new WP_REST_Request(
    ['id' => 910, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
));
check_commitment_cap($editionBlocked->get_status() === 422, 'Edition settle is rejected (422) when a Leg (1-30) exceeds the Edition\'s own commitment (24)');
check_commitment_cap(
    cclcc_instance()['tiers']['basic']['current_occupant']['tier_editions'][0]['module_status']['overview'] !== 'settled',
    'the rejected Edition settle never marks the module settled'
);

echo "Commercial Legs finite-commitment cap contract (controller): PASS\n";
