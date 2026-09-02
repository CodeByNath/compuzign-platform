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
 *   - Every submitted choice is pre-validated against the effective
 *     policy and the container's own current rows: stale/unknown/
 *     not-offered/duplicate item_ids reject rather than being silently
 *     ignored or last-write-wins.
 *   - Out-of-policy choices reject the WHOLE selection with a
 *     structured reason — never a silent substitution, including an
 *     explicit null Price Option under 'choice' mode, which is never
 *     automatically authorized.
 *   - No `minimum_total_contract_value` floor exists in this shape —
 *     deferred (not shipped) after auditing Period boundary semantics
 *     found the existing frontend TCV occurrence-count algorithm this
 *     work was told to reuse disagrees with `to_month`'s own proven
 *     inclusive meaning (see sanitizeCustomerPolicy()'s own docblock).
 *   - Edition policy: absent/null inherits the occupant's Default
 *     policy wholesale; non-empty is a COMPLETE replacement (an item
 *     absent from a non-empty Edition policy is excluded, never
 *     falls back to Default's own entry for it).
 *   - `excluded` policy entries never leak into the customer-facing
 *     projection (PackageFamilyPricingBuilder) — server-side
 *     validation/resolution still sees the full stored policy, and a
 *     stored `excluded` entry naming a since-removed item is itself a
 *     dangling reference, rejected at save time like any other mode.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
$composablePolicyProjectionOption = null;
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-09-02 00:00:00'; }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $composablePolicyProjectionOption;
        return $key === 'cz_package_station' ? ($composablePolicyProjectionOption ?? $default) : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $composablePolicyProjectionOption;
        if ($key === 'cz_package_station') { $composablePolicyProjectionOption = $value; }
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

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema as PMS;
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

assertSameValue(['items' => []], PS::sanitizeCustomerPolicy([]), '1g. the sanitized shape carries no minimum_total_contract_value key at all (deferred)');

// ── 2. No occupant mutation ──────────────────────────────────────────────────

$c2 = container([
    'rate_sheet_items' => [item('hosting', 1), item('support', 1)],
    'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'required'],
        ['item_id' => 'support', 'mode' => 'optional', 'default_selected' => true],
    ]],
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
    ]],
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
    ]],
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
    ]],
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
    ]],
]);
$rBadOption = PMS::resolveCustomerComposableSelection($readModel, $c5b, [['item_id' => 'hosting', 'price_option_id' => 'po_expensive']]);
assertSameValue(false, $rBadOption['ok'], '5b. a disallowed Price Option choice rejects the whole selection, never silently substitutes po_cheap');
assertSameValue('price_option_not_allowed', $rBadOption['rejected_items'][0]['reason'], '5b. structured reason');

$c5c = container([
    'rate_sheet_items' => [item('hosting', 1, 'po_does_not_exist')],
    'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'required'], // 'fixed' price option — the row's own published (unresolved) choice
    ]],
]);
$rUnresolved = PMS::resolveCustomerComposableSelection($readModel, $c5c, [['item_id' => 'hosting']]);
assertSameValue(false, $rUnresolved['ok'], '5c. an unresolved published Price Option rejects rather than silently falling back to base price');
assertSameValue('price_option_unresolved', $rUnresolved['code'], '5c. structured code');

// A submitted choice for an item with NO policy entry at all (never
// offered) is a structured rejection, not a silent no-op — a
// stale/unknown/not-offered submitted item_id must never be silently ignored.
$c5d = container(['rate_sheet_items' => [item('hosting', 1), item('support', 1)],
    'customer_policy' => ['items' => [['item_id' => 'support', 'mode' => 'required']]]]);
$rNoPolicy = PMS::resolveCustomerComposableSelection($readModel, $c5d, [['item_id' => 'hosting'], ['item_id' => 'support']]);
assertSameValue(false, $rNoPolicy['ok'], '5d. submitting a choice for an item with no policy entry (not offered) rejects rather than being silently ignored');
assertSameValue('not_selectable', $rNoPolicy['rejected_items'][0]['reason'], '5d. structured reason');

// A submitted choice naming an item_id that isn't even in the container's
// own current rate_sheet_items at all (e.g. removed since the customer's
// browser last loaded the policy) is rejected the same way.
$c5e = container(['rate_sheet_items' => [item('support', 1)],
    'customer_policy' => ['items' => [['item_id' => 'support', 'mode' => 'required']]]]);
$rGhost = PMS::resolveCustomerComposableSelection($readModel, $c5e, [['item_id' => 'support'], ['item_id' => 'ghost_item']]);
assertSameValue(false, $rGhost['ok'], '5e. a submitted item_id absent from the container entirely rejects');
assertSameValue('not_selectable', $rGhost['rejected_items'][0]['reason'], '5e. structured reason');

// A duplicate item_id in the submitted choice is rejected rather than
// silently resolved by last-write-wins (no such ordering rule exists in
// the accepted contract).
$c5f = container(['rate_sheet_items' => [item('support', 1)],
    'customer_policy' => ['items' => [['item_id' => 'support', 'mode' => 'required']]]]);
$rDup = PMS::resolveCustomerComposableSelection($readModel, $c5f, [['item_id' => 'support'], ['item_id' => 'support', 'quantity' => 2]]);
assertSameValue(false, $rDup['ok'], '5f. a duplicate submitted item_id rejects rather than silently picking one');
assertSameValue('duplicate_item_choice', $rDup['rejected_items'][0]['reason'], '5f. structured reason');

// An explicit null Price Option under 'choice' mode is NEVER automatically
// authorized — null/base pricing is what 'fixed' mode is for. Silently
// accepting null here would bypass the whole allowed-list authorization.
$c5g = container([
    'rate_sheet_items' => [item('hosting', 1)],
    'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'required',
            'price_option' => ['mode' => 'choice', 'allowed_price_option_ids' => ['po_cheap']]],
    ]],
]);
$rNullBypass = PMS::resolveCustomerComposableSelection($readModel, $c5g, [['item_id' => 'hosting', 'price_option_id' => null]]);
assertSameValue(false, $rNullBypass['ok'], '5g. an explicit null Price Option under choice mode rejects rather than silently reverting to base price');
assertSameValue('price_option_not_allowed', $rNullBypass['rejected_items'][0]['reason'], '5g. structured reason');

// Defense-in-depth: a policy whose own configured default has drifted
// outside its allowed list (simulating stale/tampered stored data — never
// producible via sanitizeCustomerPolicy() itself, which already enforces
// this invariant at save time) is rejected at resolve time too, never
// silently applied.
$c5h = container(['rate_sheet_items' => [item('hosting', 1)],
    'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'required', 'default_selected' => false,
            'price_option' => ['mode' => 'choice', 'allowed_price_option_ids' => ['po_cheap'], 'default_price_option_id' => 'po_expensive']],
    ]]]);
$rBadDefault = PMS::resolveCustomerComposableSelection($readModel, $c5h, [['item_id' => 'hosting']]); // no explicit choice — falls to the (invalid) default
assertSameValue(false, $rBadDefault['ok'], '5h. a configured default Price Option outside its own allowed list rejects rather than silently applying it');
assertSameValue('price_option_not_allowed', $rBadDefault['rejected_items'][0]['reason'], '5h. structured reason');

// ── 6. Edition policy: inherit-when-absent, complete-replacement-when-set ──

$occFixture = [
    'inclusions_override' => [], 'customer_policy' => ['items' => [
        ['item_id' => 'hosting', 'mode' => 'required'],
        ['item_id' => 'support', 'mode' => 'optional', 'default_selected' => false],
    ]],
    'tier_editions' => [
        // No customer_policy key at all — inherits the occupant's Default policy wholesale.
        ['id' => 'edt_inherit', 'platform_status' => 'active', 'title' => 'Inherits'],
        // Explicit non-empty policy — complete replacement (hosting absent => excluded, not inherited).
        ['id' => 'edt_override', 'platform_status' => 'active', 'title' => 'Overrides',
            'customer_policy' => ['items' => [['item_id' => 'support', 'mode' => 'required']]]],
    ],
];
$extracted = PS::extractTierForCostBuilder(['current_occupant' => $occFixture]);
$editionsByI = [];
foreach ($extracted['edition_options'] as $opt) { $editionsByI[$opt['id']] = $opt; }
assertSameValue(
    $extracted['customer_policy'],
    $editionsByI['edt_inherit']['customer_policy'],
    '6a. an Edition with no customer_policy at all inherits the occupant\'s Default policy verbatim'
);
$overridePolicy = $editionsByI['edt_override']['customer_policy'];
assertSameValue(1, count($overridePolicy['items']), '6b. a non-empty Edition policy is a COMPLETE replacement, not merged with Default\'s');
assertSameValue('support', $overridePolicy['items'][0]['item_id'], '6c. only the Edition\'s own explicit entry survives — hosting is absent (excluded), never inherited from Default');

// ── 7. Bundle-backed row: no special-casing, item_id stays opaque ──────────

$c7 = container([
    'rate_sheet_items' => [item('addon_bundle', 1)],
    'customer_policy' => ['items' => [['item_id' => 'addon_bundle', 'mode' => 'required']]],
]);
$result7 = PMS::resolveCustomerComposableSelection($readModel, $c7, [['item_id' => 'addon_bundle']]);
assertTrue($result7['ok'], '7. a Bundle-backed row (bundle_id set on the Rate Sheet row) resolves through the exact same one-row path as any other item_id — no policy special-casing needed');

// ── 8. Save-time semantic validation against live published data ──────────
//    PackageManagerSchema::validateCustomerPolicyAgainstContainer() — the
//    authoritative check sanitizeCustomerPolicy() deliberately does not
//    perform itself (structural-only). Never repairs/drops an invalid
//    reference; returns the first violation for the caller to reject the
//    whole save with, leaving stored/draft state untouched.

$c8 = container(['rate_sheet_items' => [item('hosting', 1), item('support', 1)]]);

$policyDangling = PS::sanitizeCustomerPolicy(['items' => [['item_id' => 'ghost_item', 'mode' => 'required']]]);
$vDangling = PMS::validateCustomerPolicyAgainstContainer($policyDangling, $c8, $readModel);
assertSameValue('dangling_item_id', $vDangling['code'] ?? null, '8a. a policy item_id absent from the container\'s own rate_sheet_items rejects at save time');

// A stored 'excluded' entry naming a since-removed item is a dangling
// reference too — never silently accumulated just because it's "not
// offered" anyway. A complete-replacement policy contract means every
// entry it stores is meaningful.
$policyDanglingExcluded = PS::sanitizeCustomerPolicy(['items' => [['item_id' => 'ghost_item', 'mode' => 'excluded']]]);
$vDanglingExcluded = PMS::validateCustomerPolicyAgainstContainer($policyDanglingExcluded, $c8, $readModel);
assertSameValue('dangling_item_id', $vDanglingExcluded['code'] ?? null, '8b. a stored EXCLUDED entry naming a since-removed item also rejects at save time — not exempted just because it is never offered');

$policyBadAllowed = PS::sanitizeCustomerPolicy(['items' => [
    ['item_id' => 'hosting', 'mode' => 'required',
        'price_option' => ['mode' => 'choice', 'allowed_price_option_ids' => ['po_does_not_exist']]],
]]);
$vBadAllowed = PMS::validateCustomerPolicyAgainstContainer($policyBadAllowed, $c8, $readModel);
assertSameValue('disallowed_price_option', $vBadAllowed['code'] ?? null, '8c. an allowed_price_option_id not on the row\'s own live price_options[] rejects at save time');

// Defense-in-depth: a policy whose own default has drifted outside its
// allowed list (hand-built, bypassing sanitizeCustomerPolicy()'s own
// invariant, simulating stale data reaching this validator directly).
$policyBadDefault = $policyBadAllowed;
$policyBadDefault['items'][0]['price_option']['allowed_price_option_ids'] = ['po_cheap'];
$policyBadDefault['items'][0]['price_option']['default_price_option_id'] = 'po_expensive';
$vBadDefault = PMS::validateCustomerPolicyAgainstContainer($policyBadDefault, $c8, $readModel);
assertSameValue('invalid_default_price_option', $vBadDefault['code'] ?? null, '8d. a default_price_option_id outside the row\'s own live options rejects at save time');

$policyValid = PS::sanitizeCustomerPolicy(['items' => [
    ['item_id' => 'hosting', 'mode' => 'required', 'price_option' => ['mode' => 'choice', 'allowed_price_option_ids' => ['po_cheap']]],
    ['item_id' => 'support', 'mode' => 'optional', 'default_selected' => true],
]]);
$vValid = PMS::validateCustomerPolicyAgainstContainer($policyValid, $c8, $readModel);
assertSameValue(null, $vValid, '8e. a fully valid policy against live data passes save-time validation');

// ── 9. Excluded entries never leak into the customer-facing projection ─────
//    PackageFamilyPricingBuilder::presentOccupant() — the full stored
//    policy (including 'excluded' entries) exists server-side for
//    validation/resolution, but the public response omits them entirely:
//    'excluded' means "not offered", never "customer-visible and disabled".

function occupantShapeWithPolicy(string $idSuffix, ?string $platformId, ?array $customerPolicy): array
{
    return [
        'current_occupant' => [
            'id' => 'occ_' . $idSuffix, 'cz_platform_id' => $platformId ?? '', 'addon_platform_id' => '',
            'default_leg_platform_id' => '', 'platform_status' => 'active', 'is_explicitly_disabled' => false,
            'is_addon' => false, 'label' => 'Build Your Own', 'ideal_for' => '',
            'audience_groups' => ['personal_business', 'enterprise'], 'price' => null, 'contact' => false,
            'billing_cycle' => 'monthly', 'minimum_term_value' => null, 'minimum_term_unit' => null,
            'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
            'rate_sheet_id' => 'rs_projection',
            'inclusions_override' => [],
            'rate_sheet_items' => [
                ['item_id' => 'hosting', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []],
                ['item_id' => 'support', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []],
            ],
            'features' => [], 'faq_refs' => [],
            'customer_policy' => $customerPolicy,
            'tier_editions' => [], 'tier_edition_bin' => [],
        ],
        'history' => [],
    ];
}

$instance = [
    'tier_instance_id' => 'ti_projection', 'cz_platform_id' => 'CZTG-PROJECTION', 'title' => 'Projection Set',
    'status' => 'active', 'allowed_rate_sheet_ids' => ['rs_projection'], 'popular_tier' => null, 'popular_label' => '',
    'tiers' => TIS::emptyTierMap(), 'occupant_bin' => [],
];
// deriveInstanceStatus() never reads composable_occupant (Phase 1's own
// documented boundary) — a fixed-Tier occupant is required here just to
// make the instance itself "active" at all, unrelated to what this test
// actually proves.
$instance['tiers']['basic'] = occupantShapeWithPolicy('primary', 'CZT-PRIMARY', null);
$instance['composable_occupant'] = occupantShapeWithPolicy('composable', 'CZT-COMPOSABLE', [
    'items' => [
        ['item_id' => 'hosting', 'mode' => 'required'],
        ['item_id' => 'support', 'mode' => 'excluded'], // stored — must never reach the public response
    ],
]);
$manager = [
    'sources' => [], 'groups' => [], 'category_groups' => [[
        'group_id' => 'pcg_projection', 'cz_platform_id' => 'CZPG-PROJECTION', 'label' => 'Projection Family',
        'description' => '', 'platform_status' => 'active', 'previous_platform_status' => null,
        'module_status' => ['overview' => 'settled'], 'overview_draft' => null, 'sort_order' => 0,
    ]], 'items' => [],
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_projection', 'title' => 'Projection Rates', 'status' => 'active', 'groups' => [],
        'items' => [
            ['item_id' => 'hosting', 'source_item_id' => 'inc_hosting', 'self_priced' => true, 'unit_price' => 100, 'per' => null, 'quantity' => 1, 'group_id' => null, 'price_options' => []],
            ['item_id' => 'support', 'source_item_id' => 'inc_support', 'self_priced' => true, 'unit_price' => 20, 'per' => null, 'quantity' => 1, 'group_id' => null, 'price_options' => []],
        ],
    ]],
];
$composablePolicyProjectionOption = [
    'platform_status' => 'active', 'tier_instances' => [$instance],
    'tier_assignments' => [[
        'assignment_id' => \CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_projection', 'ti_projection'),
        'consumer_type' => 'package_family', 'consumer_id' => 'pcg_projection', 'tier_instance_id' => 'ti_projection',
    ]],
    'popular_tier' => null, 'popular_label' => '', 'sort_position' => 0,
    'bundle' => ['title' => '', 'description' => '', 'price' => null], 'occupant_bin' => [], 'promotions' => [],
    'package_manager' => $manager, 'legacy_host_service_id' => 0, 'valid_from' => null, 'valid_until' => null,
];

$projectionResponse = (new PackageFamilyPricingBuilder(new PackageRepository()))->buildResponse();
$projectionFamily = $projectionResponse['families'][0] ?? null;
assertTrue($projectionFamily !== null, '9a. the projection Family renders publicly');
$publicPolicy = $projectionFamily['pricing']['composable_offer']['customer_policy'];
$publicIds = array_map(static fn(array $i): string => $i['item_id'], $publicPolicy['items']);
assertSameValue(['hosting'], $publicIds, '9b. the public customer_policy.items omits the excluded "support" entry entirely — only the required "hosting" entry survives');

// Confirm the exclusion is a PROJECTION-layer filter only — the full
// stored policy (including the excluded entry) is still what server-side
// validation/resolution actually sees.
$storedPolicy = $instance['composable_occupant']['current_occupant']['customer_policy'];
assertSameValue(2, count($storedPolicy['items']), '9c. the stored policy itself still carries both entries — only the public projection filters');

fwrite(STDOUT, "Composable customer policy resolver contract: PASS\n");
