<?php

declare(strict_types=1);

/*
 * Phase 3 contract: a Tier occupant's and a Tier Edition's own commercial
 * legs (active_billing_cycles/commercial_legs) reaching the real public
 * Cost Builder projection — PackageRepository::findAllActiveFamiliesForCostBuilder()
 * -> PackageFamilyPricingBuilder::buildResponse() — the same end-to-end path
 * tests/tier-instance-public-projection.php already exercises for price/
 * edition_options, following that file's own Service-post-backed source
 * pool fixture pattern.
 *
 * No new pricing calculation is proven here — that is
 * tests/tier-commercial-legs-projection.php's job. This file proves only the
 * wiring: each leg reaches the customer response already priced and with
 * public-shaped inclusions, the occupant's and its Edition's own schedules
 * resolve independently (including against two DIFFERENT Rate Sheets), a
 * Simple Mode record (no schedule) still projects commercial_legs: [], and
 * rate_sheet_id/rate_sheet_items never leak alongside the new fields.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-08-18 00:00:00'; }
}

$scheduleProjectionOption = null;
$scheduleProjectionPosts = [];
$scheduleProjectionMeta = [];

if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $scheduleProjectionOption;
        return $key === 'cz_package_station' ? ($scheduleProjectionOption ?? $default) : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $scheduleProjectionOption;
        if ($key === 'cz_package_station') $scheduleProjectionOption = $value;
        return true;
    }
}
if (!function_exists('get_posts')) {
    function get_posts(array $args = []): array { return []; }
}
if (!function_exists('get_post')) {
    function get_post(int $postId): ?WP_Post
    {
        global $scheduleProjectionPosts;
        return $scheduleProjectionPosts[$postId] ?? null;
    }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $postId, string $key = '', bool $single = false): mixed
    {
        global $scheduleProjectionMeta;
        return $scheduleProjectionMeta[$postId][$key] ?? ($single ? null : []);
    }
}
if (!function_exists('wp_get_post_terms')) {
    function wp_get_post_terms(int $postId, string $taxonomy, array $args = []): array { return []; }
}

if (!class_exists('WP_Post')) {
    class WP_Post
    {
        public int $ID;
        public string $post_type = 'cz_service';
        public string $post_status = 'publish';
        public string $post_title;
        public string $post_name;

        public function __construct(int $id, string $title)
        {
            $this->ID = $id;
            $this->post_title = $title;
            $this->post_name = 'schedule-source';
        }
    }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\CostBuilder\Services\PackageFamilyPricingBuilder;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema as PMS;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_schedule_projection(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier Commercial Schedule public projection: ' . $message);
    }
}

// ── Fixture: one Service post supplies the live inclusion pool (the real ────
// ── sourcePools()/buildReadModel() path, same as tier-instance-public-     ──
// ── projection.php), feeding two independent Rate Sheets — one the        ──
// ── occupant binds, one its own Edition binds — proving legs never cross. ──

const SCHEDULE_HOST_SERVICE_ID = 900;
$scheduleProjectionPosts[SCHEDULE_HOST_SERVICE_ID] = new WP_Post(SCHEDULE_HOST_SERVICE_ID, 'Schedule Source Service');
$scheduleProjectionMeta[SCHEDULE_HOST_SERVICE_ID] = [
    'cz_service_meta' => ['platform_status' => 'active'],
    'cz_service_inclusions' => ['inclusions' => [
        ['id' => 'inc-a', 'label' => 'Occupant Feature'],
        ['id' => 'inc-b', 'label' => 'Occupant Setup'],
        ['id' => 'inc-c', 'label' => 'Edition Feature'],
    ]],
    'cz_service_faqs' => [],
];

$srcA = PMS::deriveItemId('inclusion', 'inc-a');
$srcB = PMS::deriveItemId('inclusion', 'inc-b');
$srcC = PMS::deriveItemId('inclusion', 'inc-c');

$manager = [
    // The host Service IS legacy_host_service_id below, so its own inclusions
    // carry no 'service:ID:' prefix — the same simple case
    // public_projection_instance()'s own KAIROS fixture exercises.
    'sources' => [
        ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => SCHEDULE_HOST_SERVICE_ID],
    ],
    'groups' => [],
    'category_groups' => [
        ['group_id' => 'pcg_test', 'cz_platform_id' => 'CZPG-TEST0001', 'label' => 'Test Family', 'description' => '', 'platform_status' => 'active', 'previous_platform_status' => null, 'module_status' => ['overview' => 'settled'], 'overview_draft' => null, 'sort_order' => 0],
    ],
    // Left empty deliberately — buildReadModel() synthesises one provisional
    // item per live pool entry above, the same as every source item this
    // fixture needs.
    'items' => [],
    'rate_sheets' => [
        [
            'rate_sheet_id' => 'rs_occupant',
            'title' => 'Occupant Rates', 'status' => 'active', 'groups' => [],
            'items' => [
                ['item_id' => 'rate-monthly-feature', 'source_item_id' => $srcA, 'unit_price' => 10, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'price_options' => []],
                ['item_id' => 'rate-annual-setup', 'source_item_id' => $srcB, 'unit_price' => 7, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'price_options' => []],
            ],
        ],
        [
            'rate_sheet_id' => 'rs_edition',
            'title' => 'Edition Rates', 'status' => 'active', 'groups' => [],
            'items' => [
                ['item_id' => 'rate-onboarding', 'source_item_id' => $srcC, 'unit_price' => 99, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'price_options' => []],
            ],
        ],
    ],
];

$occupantLegs = [
    ['id' => 'leg_monthly', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => 12],
    ['id' => 'leg_annual', 'payment_category' => 'recurring', 'billing_cycle' => 'yearly', 'start_month' => 1, 'end_month' => 12],
];
$editionLegs = [
    ['id' => 'leg_setup', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 1, 'end_month' => 1],
];

$tiers = TierInstanceSchema::emptyTierMap();
$tiers['basic'] = [
    'current_occupant' => [
        'id' => 'occ_schedule01', 'cz_platform_id' => 'CZT-SCHEDULE01', 'addon_platform_id' => '',
        'label' => 'Scheduled Basic', 'ideal_for' => '', 'audience_groups' => ['personal_business', 'enterprise'],
        'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
        'minimum_term_value' => 12.0, 'minimum_term_unit' => 'month',
        'active_billing_cycles' => ['monthly', 'annually'],
        'commercial_legs' => $occupantLegs,
        'rate_sheet_id' => 'rs_occupant',
        'rate_sheet_items' => [
            ['item_id' => 'rate-monthly-feature', 'quantity' => 1, 'leg_assignments' => [['leg_id' => 'leg_monthly', 'price_option_id' => null, 'quantity' => 1]]],
            // Per-leg quantity is its own independent field, not inherited
            // from the selection's top-level quantity (which stays 2 here
            // only for the Default declaration's own total, asserted
            // separately below) — the assignment states its OWN 2 explicitly.
            ['item_id' => 'rate-annual-setup', 'quantity' => 2, 'leg_assignments' => [['leg_id' => 'leg_annual', 'price_option_id' => null, 'quantity' => 2]]],
        ],
        'inclusions_override' => [], 'features' => [], 'faq_refs' => [],
        'platform_status' => 'active', 'is_addon' => false,
        'tier_editions' => [[
            'id' => 'edt_schedule01', 'edition_platform_id' => 'CZTE-SCHEDULE01',
            'title' => 'Annual Plus', 'admin_description' => '',
            'platform_status' => 'active', 'previous_platform_status' => null,
            'module_status' => [], 'drafts' => [],
            'rate_sheet_id' => 'rs_edition',
            'rate_sheet_items' => [
                ['item_id' => 'rate-onboarding', 'quantity' => 1, 'leg_assignments' => [['leg_id' => 'leg_setup', 'price_option_id' => null]]],
            ],
            'price' => null, 'contact' => false, 'billing_cycle' => 'one-time',
            'minimum_term_value' => null, 'minimum_term_unit' => null,
            'active_billing_cycles' => ['one-time'],
            'commercial_legs' => $editionLegs,
            'inclusions_override' => [], 'faq_refs' => [],
        ]],
    ],
    'history' => [],
];
// Simple Mode sibling — never configured this capability — proves it stays
// an unaffected, additive no-op alongside the Multi-Cycle occupant above.
$tiers['standard'] = [
    'current_occupant' => [
        'id' => 'occ_simple01', 'cz_platform_id' => 'CZT-SIMPLE01', 'addon_platform_id' => '',
        'label' => 'Plain Standard', 'ideal_for' => '', 'audience_groups' => ['personal_business', 'enterprise'],
        'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
        'minimum_term_value' => null, 'minimum_term_unit' => null,
        'rate_sheet_id' => 'rs_occupant',
        'rate_sheet_items' => [['item_id' => 'rate-monthly-feature', 'quantity' => 1]],
        'inclusions_override' => [], 'features' => [], 'faq_refs' => [],
        'platform_status' => 'active', 'is_addon' => false,
    ],
    'history' => [],
];

$instance = [
    'tier_instance_id' => 'ti_schedule', 'cz_platform_id' => 'CZTG-SCHEDULE01',
    'title' => 'Schedule Tier Set', 'status' => 'active',
    'allowed_rate_sheet_ids' => ['rs_occupant', 'rs_edition'],
    'popular_tier' => 'basic', 'popular_label' => 'Popular',
    'tiers' => $tiers, 'occupant_bin' => [],
];

$assignment = [
    'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_test', 'ti_schedule'),
    'consumer_type' => 'package_family', 'consumer_id' => 'pcg_test', 'tier_instance_id' => 'ti_schedule',
];

$station = [
    'platform_status' => 'active',
    'tier_instances' => [$instance],
    'tier_assignments' => [$assignment],
    'popular_tier' => null, 'popular_label' => '',
    'sort_position' => 0,
    'bundle' => ['title' => '', 'description' => '', 'price' => null],
    'occupant_bin' => [],
    'promotions' => [],
    'package_manager' => $manager,
    'legacy_host_service_id' => SCHEDULE_HOST_SERVICE_ID,
    'valid_from' => null, 'valid_until' => null,
];

update_option('cz_package_station', $station);

$response = (new PackageFamilyPricingBuilder(new PackageRepository()))->buildResponse();
check_schedule_projection(count($response['families']) === 1, 'the one ready Family reaches the response');
$basic = $response['families'][0]['pricing']['tiers']['basic'];
$standard = $response['families'][0]['pricing']['tiers']['standard'];

// ── 1. The occupant's own schedule reaches the public response, priced ──────

check_schedule_projection($basic['active_billing_cycles'] === ['monthly', 'annually'], 'the occupant\'s own active_billing_cycles reach the public projection verbatim');
check_schedule_projection(count($basic['commercial_legs']) === 2, 'both of the occupant\'s own declared legs reach the public projection');

$legsById = [];
foreach ($basic['commercial_legs'] as $leg) { $legsById[$leg['id']] = $leg; }
check_schedule_projection($legsById['leg_monthly']['billing_cycle'] === 'monthly', 'leg_monthly round-trips its own billing_cycle');
check_schedule_projection($legsById['leg_monthly']['start_month'] === 1 && $legsById['leg_monthly']['end_month'] === 12, 'leg_monthly round-trips its own month bounds');
check_schedule_projection($legsById['leg_monthly']['price'] === 10.0, 'leg_monthly prices its own assigned inclusion (10 x qty 1) through the live Rate Sheet, not a stored scalar');
check_schedule_projection($legsById['leg_monthly']['inclusions'] === [['id' => 'rate-monthly-feature', 'label' => 'Occupant Feature', 'quantity' => 1]], 'leg_monthly carries only the ONE inclusion assigned to it, in the same public {id,label,quantity} shape the occupant\'s own top-level inclusions use');
check_schedule_projection($legsById['leg_annual']['price'] === 14.0, 'leg_annual prices its own assigned inclusion independently (7 x qty 2 = 14) — never blended with leg_monthly\'s total');
check_schedule_projection($legsById['leg_annual']['inclusions'][0]['label'] === 'Occupant Setup', 'leg_annual carries only ITS OWN assigned inclusion');

// ── 2. The occupant's own top-level Default declaration is unaffected ───────
// Its own price still sums every rate_sheet_items row through the SAME
// selection list legs draw from, by Default Price/top-level price_option_id
// (both unset here) — legs are an ADDITIONAL per-row breakdown, never a
// replacement for the row's participation in the Default declaration's own
// total. 10 (feature, qty 1) + 7 x 2 (setup, qty 2) = 24.

check_schedule_projection($basic['price'] === 24.0, 'the occupant\'s own top-level Default price still resolves normally — commercial_legs is additive, never a second selection list that displaces the existing one');

// ── 3. The Edition's own schedule resolves independently, from its OWN ──────
// ──    Rate Sheet, never the occupant's                                 ──

check_schedule_projection(count($basic['edition_options']) === 1, 'the one Active Edition reaches the public projection');
$edition = $basic['edition_options'][0];
check_schedule_projection($edition['active_billing_cycles'] === ['one-time'], 'the Edition\'s own active_billing_cycles are independent of the occupant\'s');
check_schedule_projection(count($edition['commercial_legs']) === 1, 'the Edition carries its own one leg');
check_schedule_projection($edition['commercial_legs'][0]['id'] === 'leg_setup', 'the Edition\'s leg is its own — never the occupant\'s leg_monthly/leg_annual');
check_schedule_projection($edition['commercial_legs'][0]['price'] === 99.0, 'the Edition\'s own leg prices from the EDITION\'S OWN Rate Sheet (rs_edition, 99), never the occupant\'s rs_occupant');
check_schedule_projection($edition['commercial_legs'][0]['inclusions'][0]['label'] === 'Edition Feature', 'the Edition\'s own leg resolves its own inclusion, from its own Rate Sheet');

// ── 4. Simple Mode (never configured) stays a true no-op ────────────────────

check_schedule_projection($standard['active_billing_cycles'] === [], 'a Simple Mode occupant (no schedule ever configured) projects an empty active_billing_cycles, never omitted or null');
check_schedule_projection($standard['commercial_legs'] === [], 'a Simple Mode occupant projects an empty commercial_legs, never omitted or null');
check_schedule_projection($standard['price'] === 10.0, 'a Simple Mode occupant\'s own price/behavior is completely unaffected by this capability existing elsewhere in the same response');

// ── 5. Internal Rate Sheet binding identity still never leaks ───────────────

check_schedule_projection(!array_key_exists('rate_sheet_id', $basic), 'rate_sheet_id never reaches the public response, even though commercial_legs now also resolves through it');
check_schedule_projection(!array_key_exists('rate_sheet_items', $basic), 'rate_sheet_items (with its internal leg_assignments) never reaches the public response');
check_schedule_projection(!array_key_exists('rate_sheet_items', $edition), 'an Edition\'s own rate_sheet_items never reaches the public response either');

echo "Tier Commercial Schedule public projection contract: PASS\n";
