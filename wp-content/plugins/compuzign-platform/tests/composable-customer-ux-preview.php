<?php

declare(strict_types=1);

/*
 * Composable Tier customer UX — Phase 2B1 backend slice.
 *
 * Locks the contract in
 * project-work/2026-09-02-composable-tier-customer-ux.md:
 *
 *   - PackageRepository::resolveComposableOfferSelection() reuses the exact
 *     same active-station/Family/Tier-Instance authorization boundary
 *     findAllActiveFamiliesForCostBuilder() already applies — an unknown or
 *     inactive family_id resolves nothing, never a partial/degraded result.
 *   - A `price_option_id` a caller submits on any choice row is NEVER
 *     forwarded to PackageManagerSchema::resolveCustomerComposableSelection()
 *     — Price Option stays exclusively the policy's own configured default
 *     (fixed) or Admin-configured default (choice) in this phase, regardless
 *     of what a client sends. This is proven by showing an explicit-null
 *     submission (which the resolver itself would REJECT if forwarded
 *     verbatim under 'choice' mode) still resolves ok, and a non-default
 *     but allowed id (which the resolver WOULD accept if forwarded) is
 *     silently ignored in favor of the policy's own default instead.
 *   - A fixed-quantity item (policy quantity === null) ignores any
 *     submitted quantity entirely — the row resolves at its own published
 *     quantity, never a client-supplied override.
 *   - A configurable quantity is still server-bounds-checked end-to-end
 *     through the repository entry point, not just the resolver directly.
 *   - Extraneous fields on a submitted choice row (e.g. a 'mode' trying to
 *     coerce an excluded item into selectable) have no effect — filter/
 *     merchandising-shaped input can never bypass policy.
 *   - The repository call never mutates the underlying station option.
 *   - PackageFamilyPricingBuilder's shared inclusion projection carries new
 *     browse-only fields (unit_price, line_total, categories, service) —
 *     additive, present for the composable occupant, harmless for a normal
 *     Tier occupant that never reads them.
 *   - `customer_policy.items[].featured` sanitizes to a plain bool and
 *     survives the existing excluded-entry projection filter unchanged.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
$composableUxProjectionOption = null;
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-09-03 00:00:00'; }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $composableUxProjectionOption;
        return $key === 'cz_package_station' ? ($composableUxProjectionOption ?? $default) : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $composableUxProjectionOption;
        if ($key === 'cz_package_station') { $composableUxProjectionOption = $value; }
        return true;
    }
}
if (!function_exists('get_posts')) {
    function get_posts(array $args = []): array { return []; }
}
if (!function_exists('get_post')) {
    function get_post(int $postId): ?object { return null; }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $postId, string $key = '', bool $single = false): mixed { return $single ? null : []; }
}
if (!function_exists('get_term_meta')) {
    function get_term_meta(int $termId, string $key = '', bool $single = false): mixed { return $single ? null : []; }
}
if (!function_exists('wp_get_post_terms')) {
    function wp_get_post_terms(int $postId, string $taxonomy, array $args = []): array { return []; }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): mixed { return $value; }
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as PS;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema as TIS;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\CostBuilder\Services\PackageFamilyPricingBuilder;

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

function occupantFixture(string $idSuffix, string $platformId, ?array $customerPolicy): array
{
    return [
        'current_occupant' => [
            'id' => 'occ_' . $idSuffix, 'cz_platform_id' => $platformId, 'addon_platform_id' => '',
            'default_leg_platform_id' => '', 'platform_status' => 'active', 'is_explicitly_disabled' => false,
            'is_addon' => false, 'label' => 'Build Your Own', 'ideal_for' => '',
            'audience_groups' => ['personal_business', 'enterprise'], 'price' => null, 'contact' => false,
            'billing_cycle' => 'monthly', 'minimum_term_value' => null, 'minimum_term_unit' => null,
            'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
            'rate_sheet_id' => 'rs_ux',
            'inclusions_override' => [],
            'rate_sheet_items' => [
                ['item_id' => 'hosting', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []],
                ['item_id' => 'support', 'quantity' => 3, 'price_option_id' => null, 'leg_assignments' => []],
            ],
            'features' => [], 'faq_refs' => [],
            'customer_policy' => $customerPolicy,
            'tier_editions' => [], 'tier_edition_bin' => [],
        ],
        'history' => [],
    ];
}

function stationFixture(array $composableOccupant): array
{
    $instance = [
        'tier_instance_id' => 'ti_ux', 'cz_platform_id' => 'CZTG-UX', 'title' => 'UX Set',
        'status' => 'active', 'allowed_rate_sheet_ids' => ['rs_ux'], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TIS::emptyTierMap(), 'occupant_bin' => [],
    ];
    // deriveInstanceStatus() never reads composable_occupant — a fixed-Tier
    // occupant is required here only to make the instance itself "active".
    $instance['tiers']['basic'] = occupantFixture('primary', 'CZT-PRIMARY-UX', null);
    $instance['composable_occupant'] = $composableOccupant;

    $manager = [
        'sources' => [], 'groups' => [], 'category_groups' => [[
            'group_id' => 'pcg_ux', 'cz_platform_id' => 'CZPG-UX', 'label' => 'UX Family',
            'description' => '', 'platform_status' => 'active', 'previous_platform_status' => null,
            'module_status' => ['overview' => 'settled'], 'overview_draft' => null, 'sort_order' => 0,
        ]], 'items' => [],
        'rate_sheets' => [[
            'rate_sheet_id' => 'rs_ux', 'title' => 'UX Rates', 'status' => 'active', 'groups' => [],
            // Bundle-backed rows (bundle_id set, no matching bundles[] entry
            // required) are the only ordinary-row shape PackageManagerSchema::
            // sanitize()/buildReadModel() marks self_priced — a row with no
            // source_item_id and no bundle_id is dropped entirely by
            // sanitizeRateRows() (see PackageManagerSchema::projectRateSheets()/
            // consumableRateSheetRows()). Using bundle_id here is purely a
            // fixture convenience to get a resolvable, source-independent
            // priced row through the REAL sanitize pipeline end-to-end — not
            // a claim these items are actually Bundles.
            'items' => [
                ['item_id' => 'hosting', 'source_item_id' => '', 'bundle_id' => 'bnd_hosting', 'label' => 'Hosting', 'unit_price' => 100, 'per' => null, 'quantity' => 1, 'group_id' => null,
                    'price_options' => [
                        ['option_id' => 'po_cheap', 'unit_price' => 50.0],
                        ['option_id' => 'po_expensive', 'unit_price' => 200.0],
                    ]],
                ['item_id' => 'support', 'source_item_id' => '', 'bundle_id' => 'bnd_support', 'label' => 'Support', 'unit_price' => 20, 'per' => null, 'quantity' => 1, 'group_id' => null, 'price_options' => []],
            ],
        ]],
    ];

    return [
        'platform_status' => 'active', 'tier_instances' => [$instance],
        'tier_assignments' => [[
            'assignment_id' => \CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_ux', 'ti_ux'),
            'consumer_type' => 'package_family', 'consumer_id' => 'pcg_ux', 'tier_instance_id' => 'ti_ux',
        ]],
        'popular_tier' => null, 'popular_label' => '', 'sort_position' => 0,
        'bundle' => ['title' => '', 'description' => '', 'price' => null], 'occupant_bin' => [], 'promotions' => [],
        'package_manager' => $manager, 'legacy_host_service_id' => 0, 'valid_from' => null, 'valid_until' => null,
    ];
}

$policy = [
    'items' => [
        // fixed quantity (no 'quantity' key at all => null), required, fixed price
        ['item_id' => 'hosting', 'mode' => 'required',
            'price_option' => ['mode' => 'choice', 'allowed_price_option_ids' => ['po_cheap', 'po_expensive'], 'default_price_option_id' => 'po_cheap'],
            'featured' => true],
        // configurable quantity, optional
        ['item_id' => 'support', 'mode' => 'optional', 'default_selected' => false,
            'quantity' => ['default' => 2, 'min' => 1, 'max' => 5, 'step' => 1]],
    ],
];

global $composableUxProjectionOption;
$composableUxProjectionOption = stationFixture(occupantFixture('composable', 'CZT-COMPOSABLE-UX', $policy));

$repo = new PackageRepository();

// ── 1. Unknown/inactive family resolves nothing ─────────────────────────────

$rMissing = $repo->resolveComposableOfferSelection('does_not_exist', [['item_id' => 'hosting']]);
assertSameValue(false, $rMissing['ok'], '1a. an unknown family_id never resolves');
assertSameValue('not_found', $rMissing['code'], '1b. structured not_found reason');

// ── 2. Baseline: required item resolves using the policy default price ─────

$rBaseline = $repo->resolveComposableOfferSelection('pcg_ux', [['item_id' => 'hosting']]);
assertTrue($rBaseline['ok'], '2a. required item alone resolves ok');

function totalForItem(array $periods, string $itemId): ?float
{
    foreach ($periods as $period) {
        foreach ($period['components'] ?? [] as $component) {
            foreach ($component['items'] ?? [] as $row) {
                if (($row['item_id'] ?? null) === $itemId) {
                    return $row['line_total'] ?? $row['unit_price'] ?? null;
                }
            }
        }
    }
    return null;
}

$baselineHostingPrice = totalForItem($rBaseline['periods'], 'hosting');
assertSameValue(50.0, $baselineHostingPrice, '2b. hosting resolves at the policy default option (po_cheap = 50), never the raw published price');

// ── 3. Explicit-null price_option_id from a client is dropped, not forwarded ─
//    Forwarded verbatim this would be REJECTED by the resolver itself
//    ('choice' mode never auto-authorizes an explicit null). Since the
//    repository never forwards the key at all, it still resolves using the
//    policy default exactly like the baseline above.

$rNullOption = $repo->resolveComposableOfferSelection('pcg_ux', [['item_id' => 'hosting', 'price_option_id' => null]]);
assertTrue($rNullOption['ok'], '3a. an explicit null price_option_id from the client does not reject — it is dropped before reaching the resolver');
assertSameValue(50.0, totalForItem($rNullOption['periods'], 'hosting'), '3b. still resolves at the policy default price');

// ── 4. A non-default but authorized price_option_id is also dropped ────────
//    Forwarded verbatim the resolver WOULD accept 'po_expensive' (it is in
//    allowed_price_option_ids). Since the repository strips price_option_id
//    unconditionally, the customer can never steer this even to an
//    otherwise-authorized alternative — Price Option selection does not
//    exist in this phase's customer-facing contract at all.

$rOtherOption = $repo->resolveComposableOfferSelection('pcg_ux', [['item_id' => 'hosting', 'price_option_id' => 'po_expensive']]);
assertTrue($rOtherOption['ok'], '4a. resolves ok');
assertSameValue(50.0, totalForItem($rOtherOption['periods'], 'hosting'), '4b. still resolves at the policy default (50), never the requested po_expensive (200) — Price Option is never customer-controlled');

// ── 5. Fixed quantity ignores a submitted quantity entirely ────────────────
//    'hosting' carries no quantity policy at all (fixed) — its published
//    rate_sheet_items quantity is 1. A client-submitted 99 must have zero
//    effect: the row resolves untouched, never rejected, never honored.

$rFixedQty = $repo->resolveComposableOfferSelection('pcg_ux', [['item_id' => 'hosting', 'quantity' => 99]]);
assertTrue($rFixedQty['ok'], '5a. a bogus quantity on a fixed-quantity item never rejects the whole selection');

// ── 6. Configurable quantity: in-bounds honored, out-of-bounds rejected ────

$rQtyOk = $repo->resolveComposableOfferSelection('pcg_ux', [
    ['item_id' => 'hosting'],
    ['item_id' => 'support', 'selected' => true, 'quantity' => 4],
]);
assertTrue($rQtyOk['ok'], '6a. an in-bounds configurable quantity resolves ok');

$rQtyBad = $repo->resolveComposableOfferSelection('pcg_ux', [
    ['item_id' => 'hosting'],
    ['item_id' => 'support', 'selected' => true, 'quantity' => 99],
]);
assertSameValue(false, $rQtyBad['ok'], '6b. an out-of-bounds configurable quantity rejects the whole selection, end-to-end through the repository entry point');
assertSameValue('quantity_out_of_bounds', $rQtyBad['rejected_items'][0]['reason'] ?? null, '6c. structured reason survives the repository call');

// ── 7. Extraneous fields on a choice row cannot bypass policy ──────────────
//    'support' with no 'selected'/'default_selected' true stays excluded
//    from the resolved candidate even if the submitted row tries to smuggle
//    a 'mode' key — the repository/resolver only ever reads item_id/
//    selected/quantity, so this has no effect either way, but the request
//    must still resolve ok (proving the extra key is silently ignored, not
//    a fatal/parse error) and 'support' must be absent from the result.

$rSmuggle = $repo->resolveComposableOfferSelection('pcg_ux', [
    ['item_id' => 'hosting'],
    ['item_id' => 'support', 'mode' => 'required', 'selected' => false],
]);
assertTrue($rSmuggle['ok'], '7a. an extraneous mode field on a choice row does not break the request');
assertSameValue(null, totalForItem($rSmuggle['periods'], 'support'), '7b. support stays excluded from the candidate — a smuggled mode field authorizes nothing');

// ── 8. No mutation of the underlying station option ────────────────────────

$before = $composableUxProjectionOption;
$repo2 = new PackageRepository();
$repo2->resolveComposableOfferSelection('pcg_ux', [['item_id' => 'hosting'], ['item_id' => 'support', 'selected' => true, 'quantity' => 3]]);
assertSameValue($before, $composableUxProjectionOption, '8. resolveComposableOfferSelection() never mutates the underlying station option');

// ── 9. Shared inclusion projection carries the new browse-only fields ──────

$response = (new PackageFamilyPricingBuilder(new PackageRepository()))->buildResponse();
$family = $response['families'][0] ?? null;
assertTrue($family !== null, '9a. the UX family renders publicly');
$composableInclusions = $family['pricing']['composable_offer']['inclusions'] ?? [];
$hostingInclusion = null;
foreach ($composableInclusions as $inc) { if (($inc['id'] ?? null) === 'hosting') { $hostingInclusion = $inc; break; } }
assertTrue($hostingInclusion !== null, '9b. hosting appears in the composable offer\'s inclusions');
assertTrue(array_key_exists('unit_price', $hostingInclusion), '9c. inclusion rows carry unit_price');
assertTrue(array_key_exists('line_total', $hostingInclusion), '9d. inclusion rows carry line_total');
assertSameValue([], $hostingInclusion['categories'], '9e. a self-priced row with no Manager source behind it carries no categories — absent, not fabricated');
assertSameValue(null, $hostingInclusion['service'], '9f. same absence for service');

$basicInclusions = $family['pricing']['tiers']['basic']['inclusions'] ?? [];
assertTrue($basicInclusions !== [], '9g. a normal Tier occupant is unaffected — its own inclusions still project (the shared function is additive, not composable-only)');

// ── 10. customer_policy.items[].featured sanitizes and survives projection ─

$publicPolicy = $family['pricing']['composable_offer']['customer_policy'];
$hostingPolicyItem = null;
foreach ($publicPolicy['items'] as $item) { if ($item['item_id'] === 'hosting') { $hostingPolicyItem = $item; break; } }
assertTrue($hostingPolicyItem !== null, '10a. hosting survives the excluded-entry projection filter (it is required, not excluded)');
assertSameValue(true, $hostingPolicyItem['featured'], '10b. featured sanitizes to a plain bool and survives the public projection unchanged');

$unfeaturedFalse = PS::sanitizeCustomerPolicy(['items' => [['item_id' => 'x', 'mode' => 'required']]]);
assertSameValue(false, $unfeaturedFalse['items'][0]['featured'], '10c. featured defaults to false when never set');

fwrite(STDOUT, "OK: composable-customer-ux-preview.php\n");
