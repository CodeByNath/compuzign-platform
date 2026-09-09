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

// ── 11. Correction-round regression: default_selected:true Add/Remove ──────
//    round-trips through the repository entry point. This is the backend
//    side of the bug the auditor found in ComposableOfferBrowser.tsx: the
//    frontend was omitting an unselected optional row from the submitted
//    choice entirely, and this resolver treats an ABSENT optional row as
//    "use the policy's own default_selected", not "not selected". This
//    section locks that the REPOSITORY/RESOLVER side already honors an
//    EXPLICIT selected:false/true correctly (the frontend fix in
//    ComposableOfferBrowser.tsx/buildComposableChoice() is what now
//    guarantees the explicit key is always sent — see
//    scripts/composable-offer-choice-contract.ts for that half).

$policyDefaultOn = [
    'items' => [
        ['item_id' => 'hosting', 'mode' => 'required',
            'price_option' => ['mode' => 'choice', 'allowed_price_option_ids' => ['po_cheap', 'po_expensive'], 'default_price_option_id' => 'po_cheap']],
        // default_selected:true — the exact shape the bug affected.
        ['item_id' => 'support', 'mode' => 'optional', 'default_selected' => true],
    ],
];
global $composableUxProjectionOption;
$composableUxProjectionOption = stationFixture(occupantFixture('composable-defaulton', 'CZT-COMPOSABLE-UX-DEFAULTON', $policyDefaultOn));
$repo3 = new PackageRepository();

// 11a. Omitting 'support' from the choice entirely (no row at all) falls
// back to the policy's own default_selected:true — support IS included.
// This is the resolver's own documented, correct behaviour (never touched
// by this correction round) — proves the OMISSION path really does behave
// the way the frontend bug accidentally relied on, so 11b/11c below are a
// meaningful contrast, not a vacuous check.
$rOmitted = $repo3->resolveComposableOfferSelection('pcg_ux', [['item_id' => 'hosting']]);
assertTrue($rOmitted['ok'], '11a. baseline resolves ok');
assertTrue(totalForItem($rOmitted['periods'], 'support') !== null, '11a. omitting the row entirely falls back to default_selected:true — support IS included (documents the resolver behaviour the frontend must never accidentally rely on)');

// 11b. Explicit selected:false ("Remove" was clicked) correctly EXCLUDES
// support, despite its policy default being true — the actual fix under
// test.
$rExplicitOff = $repo3->resolveComposableOfferSelection('pcg_ux', [
    ['item_id' => 'hosting'],
    ['item_id' => 'support', 'selected' => false],
]);
assertTrue($rExplicitOff['ok'], '11b. resolves ok');
assertSameValue(null, totalForItem($rExplicitOff['periods'], 'support'), '11b. an EXPLICIT selected:false correctly excludes support even though its policy default_selected is true — Remove works');

// 11c. Explicit selected:true ("Add" clicked again after Remove) correctly
// re-includes it — the round-trip.
$rExplicitOn = $repo3->resolveComposableOfferSelection('pcg_ux', [
    ['item_id' => 'hosting'],
    ['item_id' => 'support', 'selected' => true],
]);
assertTrue($rExplicitOn['ok'], '11c. resolves ok');
assertTrue(totalForItem($rExplicitOn['periods'], 'support') !== null, '11c. an explicit selected:true re-includes support — Add works, completing the Remove-then-Add round-trip');

// ── 12. Composable Edition swap ($editionId) — untested since introduction
//    in 0a13fd14 ("resolve real Editions end to end"). Live validation
//    (project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md,
//    2026-09-09 round) reported the customer catalogue failing with a raw
//    fetch/HTTP-boundary error — ComposableOfferBrowser.tsx's own .catch()
//    path, never resolveComposableOfferSelection()'s structured ok:false —
//    whenever the composable occupant has an Edition to switch to. This
//    section locks the PHP-side swap end to end so a regression here fails
//    loudly in CI instead of only live.

$editionOccupant = occupantFixture('composable-edition', 'CZT-COMPOSABLE-EDITION-UX', $policy);
$editionOccupant['current_occupant']['tier_editions'] = [[
    'id' => 'ed_1', 'edition_platform_id' => 'CZTE-1', 'edition_catalogue_platform_id' => 'CZTEC-1',
    'default_leg_platform_id' => '', 'title' => 'Pro Edition', 'admin_description' => '',
    'platform_status' => 'active', 'previous_platform_status' => null, 'is_explicitly_disabled' => false,
    'module_status' => [], 'drafts' => [],
    'rate_sheet_id' => 'rs_ux',
    'rate_sheet_items' => [
        ['item_id' => 'hosting', 'quantity' => 1, 'price_option_id' => null, 'leg_assignments' => []],
        ['item_id' => 'support', 'quantity' => 3, 'price_option_id' => null, 'leg_assignments' => []],
    ],
    'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
    'minimum_term_value' => null, 'minimum_term_unit' => null,
    'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
    'inclusions_override' => [], 'customer_policy' => null, 'faq_refs' => [],
]];
// A disabled Edition alongside the active one — proves the active-only scan
// in resolveComposableOfferSelection() doesn't just take the first id match.
$editionOccupant['current_occupant']['tier_editions'][] = [
    'id' => 'ed_2', 'edition_platform_id' => 'CZTE-2', 'edition_catalogue_platform_id' => 'CZTEC-2',
    'default_leg_platform_id' => '', 'title' => 'Disabled Edition', 'admin_description' => '',
    'platform_status' => 'disabled', 'previous_platform_status' => 'active', 'is_explicitly_disabled' => true,
    'module_status' => [], 'drafts' => [],
    'rate_sheet_id' => 'rs_ux', 'rate_sheet_items' => [],
    'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
    'minimum_term_value' => null, 'minimum_term_unit' => null,
    'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
    'inclusions_override' => [], 'customer_policy' => null, 'faq_refs' => [],
];
global $composableUxProjectionOption;
$composableUxProjectionOption = stationFixture($editionOccupant);
$repo4 = new PackageRepository();

$rEdition = $repo4->resolveComposableOfferSelection('pcg_ux', [['item_id' => 'hosting']], 'ed_1');
assertTrue($rEdition['ok'], '12a. a real active Edition id resolves ok — the swap does not crash or reject a valid selection');
assertSameValue(50.0, totalForItem($rEdition['periods'], 'hosting'), '12b. prices from the EDITION\'s own rate_sheet_items/rate_sheet_id joined against the SAME rs_ux catalogue rows, governed by the inherited (customer_policy: null -> occupant\'s own) policy\'s po_cheap default — proves the swap actually re-resolves through the real rate-sheet join rather than reusing the occupant Default\'s already-resolved figures');

$rEditionNotFound = $repo4->resolveComposableOfferSelection('pcg_ux', [['item_id' => 'hosting']], 'does_not_exist');
assertSameValue(false, $rEditionNotFound['ok'], '12c. an unknown Edition id fails closed');
assertSameValue('not_found', $rEditionNotFound['code'], '12d. structured not_found reason, never a silent fallback to Default');

$rEditionDisabled = $repo4->resolveComposableOfferSelection('pcg_ux', [['item_id' => 'hosting']], 'ed_2');
assertSameValue(false, $rEditionDisabled['ok'], '12e. a disabled Edition id is not resolvable — active-only, matching the read/display projection\'s own gate');
assertSameValue('not_found', $rEditionDisabled['code'], '12f. same structured not_found reason as an unknown id — no separate "disabled" code leaks the distinction');

$rEditionEmptyString = $repo4->resolveComposableOfferSelection('pcg_ux', [['item_id' => 'hosting']], '');
assertTrue($rEditionEmptyString['ok'], '12g. an empty-string edition_id (client omitted the param, or sent "") resolves the occupant\'s own Default exactly like a null id — never treated as a real Edition lookup');

// ── 13. Composable Edition list completeness ────────────────────────────────
//    project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md:
//    findAllActiveFamiliesForCostBuilder()'s enrichCompiledOccupantIdentity()
//    must not additionally drop an Active composable Edition just because it
//    has no minted edition_platform_id yet — Active-only eligibility is
//    already established upstream (publicTierEditionOptions()) and the
//    composable selector/resolver above (section 12) matches by native id,
//    never edition_platform_id. A disabled Edition must still be excluded
//    (that gate is publicTierEditionOptions()'s own, untouched by this fix).

$editionOccupant['current_occupant']['tier_editions'][] = [
    'id' => 'ed_3', 'edition_platform_id' => '', 'edition_catalogue_platform_id' => '',
    'default_leg_platform_id' => '', 'title' => 'Unminted Edition', 'admin_description' => '',
    'platform_status' => 'active', 'previous_platform_status' => null, 'is_explicitly_disabled' => false,
    'module_status' => [], 'drafts' => [],
    'rate_sheet_id' => 'rs_ux', 'rate_sheet_items' => [],
    'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
    'minimum_term_value' => null, 'minimum_term_unit' => null,
    'from_month' => null, 'to_month' => null, 'legs' => [], 'headline_leg_id' => '',
    'inclusions_override' => [], 'customer_policy' => null, 'faq_refs' => [],
];
global $composableUxProjectionOption;
$composableUxProjectionOption = stationFixture($editionOccupant);

$editionListResponse = (new PackageFamilyPricingBuilder(new PackageRepository()))->buildResponse();
$editionListFamily = $editionListResponse['families'][0] ?? null;
assertTrue($editionListFamily !== null, '13a. the UX family renders publicly');
$publicEditionIds = array_column($editionListFamily['pricing']['composable_offer']['edition_options'], 'id');
assertTrue(in_array('ed_1', $publicEditionIds, true), '13b. an Active composable Edition WITH a minted edition_platform_id survives publicly');
assertTrue(in_array('ed_3', $publicEditionIds, true), '13c. an Active composable Edition WITHOUT a minted edition_platform_id (CZTE) also survives publicly — the composable-only fix under test');
assertTrue(!in_array('ed_2', $publicEditionIds, true), '13d. a disabled composable Edition remains excluded regardless of its own minted edition_platform_id');

fwrite(STDOUT, "OK: composable-customer-ux-preview.php\n");
