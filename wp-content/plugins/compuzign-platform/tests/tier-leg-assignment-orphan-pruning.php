<?php

declare(strict_types=1);

/*
 * Commercial Legs — orphaned inclusion assignment pruning.
 *
 * A Leg with no assignment does nothing to the commercial flow — left
 * alone is fine. An assignment referencing a Leg that no longer exists is
 * the actual hazard: it is a dangling reference with no real Leg behind
 * it. PackageSchema::pruneOrphanedLegAssignments() enforces the canonical
 * rule — an assignment never persists without a valid Leg connection —
 * by dropping (never reassigning) any leg_assignments[] entry whose
 * leg_platform_id no longer matches a currently-existing Leg, at the
 * settle boundary (settleTierSlot() for the Tier occupant,
 * settleTierEditionOverview() for a Tier Edition).
 *
 * Deliberately separate from, and unrelated to, the Commercial Legs
 * resolver/commitment work — this only keeps stored data internally
 * consistent and touches neither resolveCommercialLegTimeline() nor
 * commitment handling.
 *
 * Exercises the real controller/repository/identity stack, matching
 * tier-leg-inclusion-reference.php's own convention.
 */

$tlopOptions = [];

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
        global $tlopOptions;
        if (array_key_exists($key, $tlopOptions)) return false;
        $tlopOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $tlopOptions;
        return array_key_exists($key, $tlopOptions) ? $tlopOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $tlopOptions;
        $tlopOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_post')) {
    function get_post(int $id): ?WP_Post { return $id === 909 ? new WP_Post($id, 'Orphan Pruning Service') : null; }
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
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_orphan_pruning(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException('Orphaned leg assignment pruning: ' . $message);
}

function tlop_default_station(): array
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

function tlop_new_controller(): PackageStationController
{
    return new PackageStationController(new PackageRepository(), new PlatformIdentifierStation());
}

function tlop_instance(): array
{
    global $tlopOptions;
    return TierInstanceSchema::findInstance($tlopOptions['cz_package_station']['tier_instances'], 'ti_primary') ?? [];
}

function tlop_by_cycle(array $legs, string $cycle): array
{
    foreach ($legs as $leg) {
        if ($leg['billing_cycle'] === $cycle) return $leg;
    }
    throw new RuntimeException("No leg with billing_cycle {$cycle}");
}

// ═══════════════════════════════════════════════════════════════════════════
// PART A — Tier occupant: an inclusion assigned to Leg B survives while B
// exists; removing B from Pricing Rules (without touching Features at all)
// drops that assignment on the next Publish — Leg A and its own untouched
// assignment-free state are unaffected.
// ═══════════════════════════════════════════════════════════════════════════

$tlopOptions = ['cz_package_station' => tlop_default_station()];

tlop_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'overview'],
    ['label' => 'Starter Cloud', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_primary'],
));

$pricingDraftResp = tlop_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'pricing_rules'],
    ['rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'monthly', 'legs' => [
        ['billing_cycle' => 'A-cycle', 'from_month' => 1, 'to_month' => 10],
        ['billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20],
    ]],
));
$draftedLegs = $pricingDraftResp->get_data()['drafts']['pricing_rules']['legs'];
$draftLegIdA = tlop_by_cycle($draftedLegs, 'A-cycle')['id'];
$draftLegIdB = tlop_by_cycle($draftedLegs, 'B-cycle')['id'];

tlop_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'features'],
    ['rate_sheet_items' => [
        ['item_id' => 'rate-vm', 'quantity' => 2, 'leg_assignments' => [
            ['price_option_id' => null, 'quantity' => 1, 'leg_platform_id' => $draftLegIdB],
        ]],
    ]],
));

$publish1 = tlop_new_controller()->settlePackageStationTier(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
));
check_orphan_pruning($publish1->get_status() === 200, 'first Publish (Legs A/B + an inclusion assigned to B) succeeds');

$occupant1 = tlop_instance()['tiers']['basic']['current_occupant'];
check_orphan_pruning(count($occupant1['legs']) === 2, 'both Legs A and B exist after the first Publish');
$legAPlatformId = tlop_by_cycle($occupant1['legs'], 'A-cycle')['platform_id'];
$legBPlatformId = tlop_by_cycle($occupant1['legs'], 'B-cycle')['platform_id'];
check_orphan_pruning(
    $occupant1['rate_sheet_items'][0]['leg_assignments'][0]['leg_platform_id'] === $legBPlatformId,
    'the inclusion assignment resolves to Leg B\'s own real CZTL'
);

// Remove Leg B from Pricing Rules ONLY — Features/the inclusion assignment
// is never resaved, mirroring an admin who edits Pricing Rules and
// publishes without ever revisiting Inclusions.
tlop_new_controller()->savePackageStationTierModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'module' => 'pricing_rules'],
    ['rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'monthly', 'legs' => [
        ['id' => $draftLegIdA, 'billing_cycle' => 'A-cycle', 'from_month' => 1, 'to_month' => 10],
    ]],
));

$publish2 = tlop_new_controller()->settlePackageStationTier(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
));
check_orphan_pruning($publish2->get_status() === 200, 'republish after removing Leg B succeeds');

$occupant2 = tlop_instance()['tiers']['basic']['current_occupant'];
check_orphan_pruning(count($occupant2['legs']) === 1, 'only Leg A remains');
check_orphan_pruning($occupant2['legs'][0]['platform_id'] === $legAPlatformId, 'Leg A keeps its own CZTL, untouched by removing B');
check_orphan_pruning(
    $occupant2['rate_sheet_items'][0]['leg_assignments'] === [],
    'the assignment that pointed at removed Leg B is dropped, never silently reassigned to Default or Leg A'
);
check_orphan_pruning($occupant2['rate_sheet_items'][0]['item_id'] === 'rate-vm', 'the inclusion itself (its own top-level Default declaration) is untouched');

// ═══════════════════════════════════════════════════════════════════════════
// PART B — Tier Edition: same proof, one level deeper, within the Edition's
// own single consolidated draft (legs and rate_sheet_items resaved together,
// the assignment left unchanged while legs[] drops B).
// ═══════════════════════════════════════════════════════════════════════════

$created = tlop_new_controller()->createTierEdition(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic'],
    ['title' => 'Annual'],
));
$editionId = $created->get_data()['edition_id'];

$editionDraftResp = tlop_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
    [
        'title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'yearly',
        'legs' => [
            ['billing_cycle' => 'A-cycle', 'from_month' => 1, 'to_month' => 10],
            ['billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20],
        ],
        'rate_sheet_items' => [
            ['item_id' => 'rate-vm', 'quantity' => 3],
        ],
    ],
));
$editionDraftLegs = $editionDraftResp->get_data()['edition']['drafts']['overview']['legs'];
$editionDraftLegIdA = tlop_by_cycle($editionDraftLegs, 'A-cycle')['id'];
$editionDraftLegIdB = tlop_by_cycle($editionDraftLegs, 'B-cycle')['id'];

tlop_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
    [
        'title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'yearly',
        'legs' => [
            ['id' => $editionDraftLegIdA, 'billing_cycle' => 'A-cycle', 'from_month' => 1, 'to_month' => 10],
            ['id' => $editionDraftLegIdB, 'billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20],
        ],
        'rate_sheet_items' => [
            ['item_id' => 'rate-vm', 'quantity' => 3, 'leg_assignments' => [
                ['price_option_id' => null, 'quantity' => 1, 'leg_platform_id' => $editionDraftLegIdB],
            ]],
        ],
    ],
));
tlop_new_controller()->settleTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
));
$activate1 = tlop_new_controller()->updateTierEditionStatus(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'platform_status' => 'active'],
));
check_orphan_pruning($activate1->get_status() === 200, 'first Edition activation (Legs A/B + an inclusion assigned to B) succeeds');

$edition1 = $activate1->get_data()['edition'];
check_orphan_pruning(count($edition1['legs']) === 2, 'both Edition Legs A and B exist after activation');
$editionLegAPlatformId = tlop_by_cycle($edition1['legs'], 'A-cycle')['platform_id'];
$editionLegBPlatformId = tlop_by_cycle($edition1['legs'], 'B-cycle')['platform_id'];
check_orphan_pruning(
    $edition1['rate_sheet_items'][0]['leg_assignments'][0]['leg_platform_id'] === $editionLegBPlatformId,
    'the Edition inclusion assignment resolves to Leg B\'s own real CZTEL'
);

// Resave the SAME consolidated draft with Leg B removed from legs[], while
// rate_sheet_items still carries the now-stale assignment to B — mirroring
// an admin who only edited the Pricing Rules tab of the shared draft.
tlop_new_controller()->saveTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
    [
        'title' => 'Annual', 'rate_sheet_id' => 'rs_primary', 'billing_cycle' => 'yearly',
        'legs' => [
            ['id' => $editionDraftLegIdA, 'billing_cycle' => 'A-cycle', 'from_month' => 1, 'to_month' => 10],
        ],
        'rate_sheet_items' => [
            ['item_id' => 'rate-vm', 'quantity' => 3, 'leg_assignments' => [
                ['price_option_id' => null, 'quantity' => 1, 'leg_platform_id' => $editionLegBPlatformId],
            ]],
        ],
    ],
));
tlop_new_controller()->settleTierEditionModule(new WP_REST_Request(
    ['id' => 909, 'instance' => 'ti_primary', 'tier' => 'basic', 'edition' => $editionId, 'module' => 'overview'],
));

$edition2 = tlop_instance()['tiers']['basic']['current_occupant']['tier_editions'][0];
check_orphan_pruning(count($edition2['legs']) === 1, 'only Edition Leg A remains');
check_orphan_pruning($edition2['legs'][0]['platform_id'] === $editionLegAPlatformId, 'Edition Leg A keeps its own CZTEL, untouched by removing B');
check_orphan_pruning(
    $edition2['rate_sheet_items'][0]['leg_assignments'] === [],
    'the Edition assignment that pointed at removed Leg B is dropped, never silently reassigned to Default or Leg A'
);
check_orphan_pruning($edition2['rate_sheet_items'][0]['item_id'] === 'rate-vm', 'the Edition inclusion itself is untouched');

echo "Orphaned leg assignment pruning contract: PASS\n";
