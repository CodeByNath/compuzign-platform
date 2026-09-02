<?php

declare(strict_types=1);

/*
 * Composable Tier customer configuration policy — Phase 2A backend slice.
 *
 * Locks the accepted contract in
 * project-work/2026-09-02-composable-tier-customer-policy.md:
 *
 *   - PackageSchema::sanitizeCustomerPolicy() is structural-only: an
 *     unrecognized mode always falls back to 'excluded' (never
 *     "always included"), quantity bounds are clamped sane, and a
 *     'choice' Price Option policy with nothing actually allowed
 *     collapses back to 'fixed' rather than storing a dead state.
 *   - PackageManagerSchema::resolveCustomerComposableSelection() never
 *     mutates its $container argument.
 *   - Whole-inclusion exclusion: excluding an item_id drops it from
 *     Default's own component AND every Additional Leg's own component
 *     at once, because leg_assignments[] lives nested inside the same
 *     rate_sheet_items[] row being dropped — never a per-Leg toggle.
 *   - Quantity/Price-Option customer customization touches only the
 *     row's own top-level fields; an Additional Leg's own
 *     leg_assignments[] value for a DIFFERENT, still-included item is
 *     never touched.
 *   - Out-of-policy choices reject the WHOLE selection with a
 *     structured reason — never a silent substitution.
 *   - The TCV floor rejects as 'floor_unverifiable' against an
 *     open-ended timeline, never a silent skip.
 *   - Edition policy: absent/null inherits the occupant's Default
 *     policy wholesale; non-empty is a COMPLETE replacement (an item
 *     absent from a non-empty Edition policy is excluded, never
 *     falls back to Default's own entry for it).
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema as PMS;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as PS;

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

// ── Fixture: self-priced rows, one carrying two Price Options ──────────────

function readModelFixture(): array
{
    return [
        'items' => [],
        'rate_sheets' => [[
            'rate_sheet_id' => 'rs_test',
            'items' => [
                [
                    'item_id' => 'hosting', 'source_item_id' => '', 'self_priced' => true,
                    'label' => 'Hosting', 'unit_price' => 100.0, 'per' => null, 'group_id' => null, 'includes' => null,
                    'price_options' => [
                        ['option_id' => 'po_cheap', 'unit_price' => 50.0],
                        ['option_id' => 'po_expensive', 'unit_price' => 200.0],
                    ],
                ],
                [
                    'item_id' => 'support', 'source_item_id' => '', 'self_priced' => true,
                    'label' => 'Support', 'unit_price' => 20.0, 'per' => null, 'group_id' => null, 'includes' => null,
                    'price_options' => [],
                ],
                [
                    'item_id' => 'addon_bundle', 'source_item_id' => '', 'self_priced' => true, 'bundle_id' => 'bnd_1',
                    'label' => 'Addon Bundle', 'unit_price' => 30.0, 'per' => null, 'group_id' => null, 'includes' => null,
                    'price_options' => [],
                ],
            ],
        ]],
    ];
}

function container(array $overrides): array
{
    return array_merge([
        'rate_sheet_id' => 'rs_test',
        'contact' => false,
        'billing_cycle' => 'monthly',
        'from_month' => 1,
        'to_month' => null,
        'minimum_term_value' => null,
        'minimum_term_unit' => null,
        'rate_sheet_items' => [],
        'legs' => [],
        'default_leg_platform_id' => '',
        'customer_policy' => null,
    ], $overrides);
}

function item(string $id, int $qty, ?string $priceOptionId = null, array $legAssignments = []): array
{
    return ['item_id' => $id, 'quantity' => $qty, 'price_option_id' => $priceOptionId, 'leg_assignments' => $legAssignments];
}

function claim(string $legPlatformId, int $qty, ?string $priceOptionId = null): array
{
    return ['leg_platform_id' => $legPlatformId, 'quantity' => $qty, 'price_option_id' => $priceOptionId];
}

function leg(string $platformId, string $cycle, int $from, ?int $to): array
{
    return ['id' => $platformId, 'platform_id' => $platformId, 'sort_order' => 0, 'billing_cycle' => $cycle, 'from_month' => $from, 'to_month' => $to];
}

function componentBySource(array $period, string $source): ?array
{
    foreach ($period['components'] as $c) { if ($c['source'] === $source) return $c; }
    return null;
}

function itemInComponent(array $component, string $itemId): ?array
{
    foreach ($component['items'] as $row) { if ($row['item_id'] === $itemId) return $row; }
    return null;
}

$readModel = readModelFixture();

// ── 1. sanitizeCustomerPolicy(): structural safety ──────────────────────────

assertSameValue(null, PS::sanitizeCustomerPolicy(null), '1a. non-array input is no policy at all');
assertSameValue(null, PS::sanitizeCustomerPolicy('garbage'), '1b. non-array input (string) is no policy at all');

$p1 = PS::sanitizeCustomerPolicy(['items' => [
    ['item_id' => 'hosting', 'mode' => 'not-a-real-mode'],
    ['item_id' => 'hosting', 'mode' => 'required'], // duplicate item_id — first wins
    ['item_id' => '', 'mode' => 'required'], // blank id dropped
]]);
assertSameValue(1, count($p1['items']), '1c. blank id dropped, duplicate item_id deduped');
assertSameValue('excluded', $p1['items'][0]['mode'], '1d. unrecognized mode falls back to excluded, never required/optional');

$p2 = PS::sanitizeCustomerPolicy(['items' => [
    ['item_id' => 'hosting', 'mode' => 'optional', 'quantity' => ['default' => 50, 'min' => 5, 'max' => 10, 'step' => 1]],
]]);
assertSameValue(10, $p2['items'][0]['quantity']['default'], '1e. an out-of-range default clamps into [min,max]');

$p3 = PS::sanitizeCustomerPolicy(['items' => [
    ['item_id' => 'hosting', 'mode' => 'optional', 'price_option' => ['mode' => 'choice', 'allowed_price_option_ids' => []]],
]]);
assertSameValue('fixed', $p3['items'][0]['price_option']['mode'], '1f. choice with nothing allowed collapses to fixed, never a dead choice state');

$p4 = PS::sanitizeCustomerPolicy(['minimum_total_contract_value' => -50]);
assertSameValue(0.0, $p4['minimum_total_contract_value'], '1g. a negative floor clamps to zero, never negative');

// ── 2. No occupant mutation ──────────────────────────────────────────────────

$c2 = container([
    'rate_sheet_items' => [item('hosting', 1), item('support', 1)],
    'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'required'],
        ['item_id' => 'support', 'mode' => 'optional', 'default_selected' => true],
    ], 'minimum_total_contract_value' => null],
]);
$c2Before = $c2;
$result2 = PMS::resolveCustomerComposableSelection($readModel, $c2, [['item_id' => 'hosting'], ['item_id' => 'support']]);
assertSameValue($c2Before, $c2, '2. resolver never mutates its own $container argument');
assertTrue($result2['ok'], '2. baseline selection resolves ok');

// ── 3. Whole-inclusion exclusion: cross-Leg consistency ──────────────────────
//    'hosting' is claimed by BOTH Default (top-level) AND Additional Leg
//    CZTL_X (via leg_assignments). Customer excludes 'hosting' entirely —
//    it must vanish from EVERY component, not just Default's own.

$c3 = container([
    'legs' => [leg('CZTL_X', 'monthly', 1, null)],
    'rate_sheet_items' => [
        item('hosting', 2, null, [claim('CZTL_X', 5)]),
        item('support', 1),
    ],
    'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'optional', 'default_selected' => false],
        ['item_id' => 'support', 'mode' => 'required'],
    ], 'minimum_total_contract_value' => null],
]);
$result3 = PMS::resolveCustomerComposableSelection($readModel, $c3, [['item_id' => 'support']]);
assertTrue($result3['ok'], '3. selection resolves ok');
$period3 = $result3['periods'][0];
$default3 = componentBySource($period3, 'default');
$leg3 = componentBySource($period3, 'CZTL_X');
assertTrue($default3 !== null, '3. Default component still exists (support remains)');
assertSameValue(null, itemInComponent($default3, 'hosting'), '3. excluded hosting is absent from Default\'s own component');
assertSameValue(null, $leg3, '3. the Additional Leg has NO component at all once its only claimed item (hosting) is excluded — proves the exclusion removed the nested leg_assignments claim too, not just Default\'s own row');

// Sanity control: WITHOUT excluding hosting, the Leg's own component exists
// independently of Default's, confirming the fixture's own claim wiring is correct.
$c3b = $c3;
$c3b['customer_policy']['items'][0]['default_selected'] = true;
$result3b = PMS::resolveCustomerComposableSelection($readModel, $c3b, [['item_id' => 'hosting'], ['item_id' => 'support']]);
$period3b = $result3b['periods'][0];
assertTrue(componentBySource($period3b, 'CZTL_X') !== null, '3-control. with hosting included, the Additional Leg DOES have its own independent component');

// ── 4. Quantity/Price-Option customization stays scoped to the row's own
//    top-level fields; a DIFFERENT item's Leg assignment is untouched ──────

$c4 = container([
    'legs' => [leg('CZTL_Y', 'monthly', 1, null)],
    'rate_sheet_items' => [
        item('hosting', 1, null, [claim('CZTL_Y', 9, 'po_expensive')]), // Leg's own fixed override
        item('support', 1),
    ],
    'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'required', 'quantity' => ['default' => 1, 'min' => 1, 'max' => 5, 'step' => 1]],
        ['item_id' => 'support', 'mode' => 'required'],
    ], 'minimum_total_contract_value' => null],
]);
$result4 = PMS::resolveCustomerComposableSelection($readModel, $c4, [['item_id' => 'hosting', 'quantity' => 3]]);
assertTrue($result4['ok'], '4. quantity change within bounds resolves ok');
$period4 = $result4['periods'][0];
$defaultHosting4 = itemInComponent(componentBySource($period4, 'default'), 'hosting');
assertSameValue(300.0, $defaultHosting4['line_total'], '4. Default\'s own hosting reflects the customer\'s chosen quantity 3 x $100');
$legHosting4 = itemInComponent(componentBySource($period4, 'CZTL_Y'), 'hosting');
assertSameValue(9, $legHosting4['quantity'], '4. the Leg\'s own separately-authored quantity (9) is untouched by the customer\'s Default-level change');
assertSameValue('po_expensive', $legHosting4['price_option_id'], '4. the Leg\'s own Price Option is untouched too');

// ── 5. Structured rejection, never silent substitution ──────────────────────

$c5 = container([
    'rate_sheet_items' => [item('hosting', 1)],
    'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'optional', 'default_selected' => true,
            'quantity' => ['default' => 1, 'min' => 1, 'max' => 3, 'step' => 1]],
    ], 'minimum_total_contract_value' => null],
]);
$rOutOfBounds = PMS::resolveCustomerComposableSelection($readModel, $c5, [['item_id' => 'hosting', 'quantity' => 99]]);
assertSameValue(false, $rOutOfBounds['ok'], '5a. a quantity outside policy bounds rejects the whole selection');
assertSameValue('selection_invalid', $rOutOfBounds['code'], '5a. structured rejection code');
assertSameValue('quantity_out_of_bounds', $rOutOfBounds['rejected_items'][0]['reason'], '5a. structured reason names the exact violation');

$c5b = container([
    'rate_sheet_items' => [item('hosting', 1)],
    'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'required',
            'price_option' => ['mode' => 'choice', 'allowed_price_option_ids' => ['po_cheap']]],
    ], 'minimum_total_contract_value' => null],
]);
$rBadOption = PMS::resolveCustomerComposableSelection($readModel, $c5b, [['item_id' => 'hosting', 'price_option_id' => 'po_expensive']]);
assertSameValue(false, $rBadOption['ok'], '5b. a disallowed Price Option choice rejects the whole selection, never silently substitutes po_cheap');
assertSameValue('price_option_not_allowed', $rBadOption['rejected_items'][0]['reason'], '5b. structured reason');

$c5c = container([
    'rate_sheet_items' => [item('hosting', 1, 'po_does_not_exist')],
    'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'required'], // 'fixed' price option — the row's own published (unresolved) choice
    ], 'minimum_total_contract_value' => null],
]);
$rUnresolved = PMS::resolveCustomerComposableSelection($readModel, $c5c, [['item_id' => 'hosting']]);
assertSameValue(false, $rUnresolved['ok'], '5c. an unresolved published Price Option rejects rather than silently falling back to base price');
assertSameValue('price_option_unresolved', $rUnresolved['code'], '5c. structured code');

// An item with no policy entry at all is simply absent — not a rejection.
$c5d = container(['rate_sheet_items' => [item('hosting', 1), item('support', 1)],
    'customer_policy' => ['items' => [['item_id' => 'support', 'mode' => 'required']], 'minimum_total_contract_value' => null]]);
$rNoPolicy = PMS::resolveCustomerComposableSelection($readModel, $c5d, [['item_id' => 'hosting'], ['item_id' => 'support']]);
assertTrue($rNoPolicy['ok'], '5d. an item with no policy entry does not reject the selection');
assertSameValue(null, itemInComponent(componentBySource($rNoPolicy['periods'][0], 'default'), 'hosting'), '5d. it is simply absent, never offered');

// ── 6. TCV floor ──────────────────────────────────────────────────────────

$c6Open = container([
    'to_month' => null, // open-ended — no scalar total is well-defined
    'rate_sheet_items' => [item('support', 1)],
    'customer_policy' => ['items' => [['item_id' => 'support', 'mode' => 'required']], 'minimum_total_contract_value' => 100.0],
]);
$rOpen = PMS::resolveCustomerComposableSelection($readModel, $c6Open, [['item_id' => 'support']]);
assertSameValue(false, $rOpen['ok'], '6a. a configured floor against an open-ended timeline rejects rather than silently skipping');
assertSameValue('floor_unverifiable', $rOpen['code'], '6a. structured code');

$c6Low = container([
    'to_month' => 3,
    'rate_sheet_items' => [item('support', 1)],
    'customer_policy' => ['items' => [['item_id' => 'support', 'mode' => 'required']], 'minimum_total_contract_value' => 1000.0],
]);
$rLow = PMS::resolveCustomerComposableSelection($readModel, $c6Low, [['item_id' => 'support']]);
assertSameValue(false, $rLow['ok'], '6b. a finite total below the floor rejects');
assertSameValue('below_minimum_total_contract_value', $rLow['code'], '6b. structured code');

$c6Ok = container([
    'to_month' => 3,
    'rate_sheet_items' => [item('hosting', 1)],
    'customer_policy' => ['items' => [['item_id' => 'hosting', 'mode' => 'required']], 'minimum_total_contract_value' => 50.0],
]);
$rOk = PMS::resolveCustomerComposableSelection($readModel, $c6Ok, [['item_id' => 'hosting']]);
assertTrue($rOk['ok'], '6c. a finite total at/above the floor resolves ok');
assertSameValue(100.0, $rOk['total_contract_value'], '6c. TCV is the resolved total (qty1 x $100 for one month, single period)');

// ── 7. Edition policy: inherit-when-absent, complete-replacement-when-set ──

$occFixture = [
    'inclusions_override' => [], 'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'required'],
        ['item_id' => 'support', 'mode' => 'optional', 'default_selected' => false],
    ], 'minimum_total_contract_value' => null],
    'tier_editions' => [
        // No customer_policy key at all — inherits the occupant's Default policy wholesale.
        ['id' => 'edt_inherit', 'platform_status' => 'active', 'title' => 'Inherits'],
        // Explicit non-empty policy — complete replacement (hosting absent => excluded, not inherited).
        ['id' => 'edt_override', 'platform_status' => 'active', 'title' => 'Overrides',
            'customer_policy' => ['items' => [['item_id' => 'support', 'mode' => 'required']], 'minimum_total_contract_value' => null]],
    ],
];
$extracted = PS::extractTierForCostBuilder(['current_occupant' => $occFixture]);
$editionsByI = [];
foreach ($extracted['edition_options'] as $opt) { $editionsByI[$opt['id']] = $opt; }
assertSameValue(
    $extracted['customer_policy'],
    $editionsByI['edt_inherit']['customer_policy'],
    '7a. an Edition with no customer_policy at all inherits the occupant\'s Default policy verbatim'
);
$overridePolicy = $editionsByI['edt_override']['customer_policy'];
assertSameValue(1, count($overridePolicy['items']), '7b. a non-empty Edition policy is a COMPLETE replacement, not merged with Default\'s');
assertSameValue('support', $overridePolicy['items'][0]['item_id'], '7c. only the Edition\'s own explicit entry survives — hosting is absent (excluded), never inherited from Default');

// ── 8. Bundle-backed row: no special-casing, item_id stays opaque ──────────

$c8 = container([
    'rate_sheet_items' => [item('addon_bundle', 1)],
    'customer_policy' => ['items' => [['item_id' => 'addon_bundle', 'mode' => 'required']], 'minimum_total_contract_value' => null],
]);
$result8 = PMS::resolveCustomerComposableSelection($readModel, $c8, [['item_id' => 'addon_bundle']]);
assertTrue($result8['ok'], '8. a Bundle-backed row (bundle_id set on the Rate Sheet row) resolves through the exact same one-row path as any other item_id — no policy special-casing needed');

fwrite(STDOUT, "Composable customer policy resolver contract: PASS\n");
