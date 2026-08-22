<?php

declare(strict_types=1);

/*
 * Commercial Legs resolver contract —
 * PackageManagerSchema::resolveCommercialLegTimeline().
 *
 * Locks the final resolver model reached across the "Commercial Legs
 * pricing boundary" project note's audit: the Tier occupant / Tier Edition
 * is one parent commercial object; Default and every Additional Leg are
 * independent, time-scoped commercial children of it, each contributing
 * its own identity, billing cadence, and priced inclusions for exactly the
 * months it is itself active.
 *
 * The rules this file proves, in one place:
 *
 *   - Default owns the base composition (its own top-level
 *     rate_sheet_items, unconditional whenever Default is itself active).
 *   - An Additional Leg never introduces a new inclusion — it only
 *     supersedes Default's own declared quantity/price_option_id for an
 *     inclusion it explicitly claims via leg_assignments[].leg_platform_id,
 *     for exactly the months that Leg is itself active. Default's own
 *     value for that inclusion is dropped, never summed with the Leg's.
 *   - Multiple simultaneously-active Legs claiming the SAME inclusion are
 *     never precedence-ordered against each other — each keeps its own
 *     component, resolved independently from its own leg_assignments[]
 *     entry. There is no winner-selection rule.
 *   - A claim naming a Leg that isn't active this period never supersedes
 *     Default — Default still owns that inclusion for as long as the
 *     claiming Leg itself isn't live.
 *   - Components are never collapsed across billing_cycle — mixed cadences
 *     coexist as separate, independently priced components.
 *   - Commitment is applied LAST, once, over the fully-resolved period
 *     list — never inside segmentation or a single child's own resolution.
 *     No commitment leaves every period exactly as authored.
 *   - Matching is by leg_platform_id only; array position/order carries no
 *     commercial meaning (Phase 1-4's own identity model, reused here).
 *
 * Pricing itself is untouched: every component is priced through the SAME
 * projectTierRateSheetWith()/evaluateTierPricing() every existing consumer
 * already uses — this file only proves the NEW segmentation/bucketing
 * layer feeds that engine correctly, never that the engine computes
 * anything differently.
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

// ── Fixture: a self-priced Rate Sheet — hosting/support/addon, two Price
//    Options on hosting. self_priced rows resolve on their own existence,
//    no Manager source/inclusion pool needed, exactly like
//    tests/commercial-leg-resolution.php's own minimal proof. ──────────────

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
                    'item_id' => 'addon', 'source_item_id' => '', 'self_priced' => true,
                    'label' => 'Addon', 'unit_price' => 30.0, 'per' => null, 'group_id' => null, 'includes' => null,
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
        'billing_cycle' => null,
        'from_month' => null,
        'to_month' => null,
        'minimum_term_value' => null,
        'minimum_term_unit' => null,
        'rate_sheet_items' => [],
        'legs' => [],
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

function periodAt(array $periods, int $month): ?array
{
    foreach ($periods as $p) {
        if ($p['from_month'] <= $month && ($p['to_month'] === null || $p['to_month'] >= $month)) return $p;
    }
    return null;
}

function componentBySource(array $period, string $source): ?array
{
    foreach ($period['components'] as $c) { if ($c['source'] === $source) return $c; }
    return null;
}

$readModel = readModelFixture();

// ── 1. Default only ─────────────────────────────────────────────────────

$c1 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'rate_sheet_items' => [item('hosting', 2)],
]);
$t1 = PMS::resolveCommercialLegTimeline($readModel, $c1);
assertSameValue(1, count($t1), '1. Default-only container resolves to exactly one period');
assertSameValue(1, $t1[0]['from_month'], '1. the period starts at Default\'s own from_month');
assertSameValue(null, $t1[0]['to_month'], '1. the period stays open-ended — indefinite Default, no commitment');
assertSameValue(1, count($t1[0]['components']), '1. exactly one component (Default)');
assertSameValue('default', $t1[0]['components'][0]['source'], '1. that component is Default');
assertSameValue(200.0, $t1[0]['components'][0]['price'], '1. Default\'s price is qty2 x $100 = $200');

// ── 2. Quantity increase: Leg's own claim supersedes Default, never adds ──

$c2 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'legs' => [leg('CZTL_2', 'monthly', 1, null)],
    'rate_sheet_items' => [item('hosting', 1, null, [claim('CZTL_2', 3)])],
]);
$t2 = PMS::resolveCommercialLegTimeline($readModel, $c2);
assertSameValue(1, count($t2), '2. one period (Default and Leg share the same window)');
assertSameValue(1, count($t2[0]['components']), '2. exactly one component — Default contributes nothing once its only item is claimed');
assertTrue(componentBySource($t2[0], 'default') === null, '2. no Default component appears — Hosting is fully superseded');
$leg2 = componentBySource($t2[0], 'CZTL_2');
assertTrue($leg2 !== null, '2. the Leg\'s own component exists');
assertSameValue(300.0, $leg2['price'], '2. result is qty3 x $100 = $300, never $100 (Default) + $300 (Leg) = $400');

// ── 3. Quantity decrease ────────────────────────────────────────────────

$c3 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'legs' => [leg('CZTL_3', 'monthly', 1, null)],
    'rate_sheet_items' => [item('hosting', 3, null, [claim('CZTL_3', 1)])],
]);
$t3 = PMS::resolveCommercialLegTimeline($readModel, $c3);
assertSameValue(100.0, componentBySource($t3[0], 'CZTL_3')['price'], '3. result is qty1 x $100 = $100, never $300 + $100 = $400');

// ── 4. More expensive Price Option ──────────────────────────────────────

$c4 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'legs' => [leg('CZTL_4', 'monthly', 1, null)],
    'rate_sheet_items' => [item('hosting', 1, null, [claim('CZTL_4', 1, 'po_expensive')])],
]);
$t4 = PMS::resolveCommercialLegTimeline($readModel, $c4);
assertSameValue(200.0, componentBySource($t4[0], 'CZTL_4')['price'], '4. the Leg\'s own Price Option resolves the component\'s price ($200)');

// ── 5. Cheaper Price Option ─────────────────────────────────────────────

$c5 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'legs' => [leg('CZTL_5', 'monthly', 1, null)],
    'rate_sheet_items' => [item('hosting', 1, null, [claim('CZTL_5', 1, 'po_cheap')])],
]);
$t5 = PMS::resolveCommercialLegTimeline($readModel, $c5);
assertSameValue(50.0, componentBySource($t5[0], 'CZTL_5')['price'], '5. the Leg\'s own cheaper Price Option resolves the component\'s price ($50)');

// ── 6. Sequential: Default ends, next Leg starts, no overlap ───────────

$c6 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => 12,
    'legs' => [leg('CZTL_6', 'monthly', 13, null)],
    'rate_sheet_items' => [
        item('hosting', 1),
        item('support', 1),
        item('addon', 2, null, [claim('CZTL_6', 2)]),
    ],
]);
$t6 = PMS::resolveCommercialLegTimeline($readModel, $c6);
assertSameValue(2, count($t6), '6. two periods — no overlap, no gap');
$p6a = periodAt($t6, 6);
$p6b = periodAt($t6, 20);
assertSameValue(12, $p6a['to_month'], '6. Default\'s own period ends at month 12');
assertSameValue(13, $p6b['from_month'], '6. the Leg\'s own period starts immediately at month 13');
assertSameValue(1, count($p6a['components']), '6. only Default is active in months 1-12');
assertSameValue(180.0, componentBySource($p6a, 'default')['price'], '6. before the Leg starts, addon is unclaimed and falls back to Default: hosting(100) + support(20) + addon(60) = 180');
assertSameValue(1, count($p6b['components']), '6. only the Leg is active from month 13 — Default has ended, not merely superseded');
assertSameValue(60.0, componentBySource($p6b, 'CZTL_6')['price'], '6. the Leg\'s own claimed addon prices independently (qty2 x $30 = $60)');

// ── 7. Same start, Additional continues after Default ends ─────────────

$c7 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => 12,
    'legs' => [leg('CZTL_7', 'monthly', 1, null)],
    'rate_sheet_items' => [
        item('hosting', 1),
        item('addon', 1, null, [claim('CZTL_7', 1)]),
    ],
]);
$t7 = PMS::resolveCommercialLegTimeline($readModel, $c7);
assertSameValue(2, count($t7), '7. two periods — both-active, then Leg-only');
$p7a = periodAt($t7, 6);
$p7b = periodAt($t7, 20);
assertSameValue(2, count($p7a['components']), '7. months 1-12: both Default and the Leg contribute');
assertSameValue(100.0, componentBySource($p7a, 'default')['price'], '7. Default\'s own component only carries hosting (addon is claimed)');
assertSameValue(30.0, componentBySource($p7a, 'CZTL_7')['price'], '7. the Leg\'s own component carries only its claimed addon');
assertSameValue(1, count($p7b['components']), '7. month 13+: only the Leg remains — Default has stopped');
assertTrue(componentBySource($p7b, 'default') === null, '7. no Default component past month 12');
assertSameValue(30.0, componentBySource($p7b, 'CZTL_7')['price'], '7. the Leg continues charging its own claimed addon unchanged');
foreach ($p7b['components'][0]['items'] as $row) {
    assertTrue($row['item_id'] !== 'hosting', '7. hosting never reappears once Default has stopped — it was never the Leg\'s to claim');
}

// ── 8. Additional outlives Default (starts mid-Default, continues after) ─

$c8 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => 24,
    'legs' => [leg('CZTL_8', 'monthly', 13, null)],
    'rate_sheet_items' => [
        item('support', 1),
        item('hosting', 1, null, [claim('CZTL_8', 2)]),
    ],
]);
$t8 = PMS::resolveCommercialLegTimeline($readModel, $c8);
assertSameValue(3, count($t8), '8. three periods: Default-only, both-active, Leg-only');
$p8a = periodAt($t8, 6);
$p8b = periodAt($t8, 18);
$p8c = periodAt($t8, 30);
assertSameValue(1, count($p8a['components']), '8. months 1-12: Default only, hosting not yet claimed');
assertSameValue(120.0, componentBySource($p8a, 'default')['price'], '8. Default carries hosting(100, unclaimed here) + support(20)');
assertSameValue(2, count($p8b['components']), '8. months 13-24: both active, hosting now superseded');
assertSameValue(20.0, componentBySource($p8b, 'default')['price'], '8. Default\'s own component drops to support only');
assertSameValue(200.0, componentBySource($p8b, 'CZTL_8')['price'], '8. the Leg\'s own component carries its claimed hosting at qty2');
assertSameValue(1, count($p8c['components']), '8. month 25+: Default has ended, only the Leg remains');
assertSameValue(200.0, componentBySource($p8c, 'CZTL_8')['price'], '8. the Leg keeps charging its own claim unchanged after Default stops');

// ── 9. Default outlives Additional (Leg ends, Default falls back) ──────

$c9 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'legs' => [leg('CZTL_9', 'monthly', 1, 6)],
    'rate_sheet_items' => [item('hosting', 1, null, [claim('CZTL_9', 3)])],
]);
$t9 = PMS::resolveCommercialLegTimeline($readModel, $c9);
assertSameValue(2, count($t9), '9. two periods — Leg active, then Leg ends and Default resumes');
$p9a = periodAt($t9, 3);
$p9b = periodAt($t9, 9);
assertTrue(componentBySource($p9a, 'default') === null, '9. months 1-6: Default superseded, no Default component');
assertSameValue(300.0, componentBySource($p9a, 'CZTL_9')['price'], '9. the Leg\'s own claim during its active window');
assertSameValue(1, count($p9b['components']), '9. month 7+: only Default remains, the Leg has ended');
assertSameValue(100.0, componentBySource($p9b, 'default')['price'], '9. Hosting falls back to Default\'s own qty1 value once the Leg stops claiming it');

// ── 10. Partial overlap ─────────────────────────────────────────────────

$c10 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => 12,
    'legs' => [leg('CZTL_10', 'monthly', 6, 18)],
    'rate_sheet_items' => [
        item('support', 1),
        item('hosting', 1, null, [claim('CZTL_10', 1)]),
    ],
]);
$t10 = PMS::resolveCommercialLegTimeline($readModel, $c10);
assertSameValue(3, count($t10), '10. three periods: Default-only, overlap, Leg-only');
assertSameValue(1, count(periodAt($t10, 3)['components']), '10. months 1-5: Default only');
assertSameValue(2, count(periodAt($t10, 9)['components']), '10. months 6-12: both active, contributing independently (Default: support, Leg: hosting)');
assertSameValue(1, count(periodAt($t10, 15)['components']), '10. months 13-18: Leg only, Default has ended');
assertTrue(periodAt($t10, 20) === null, '10. nothing exists past month 18 — both windows have closed');

// ── 11. Two Additional Legs, same inclusion, overlapping — additive, no
//        precedence; Default falls back once both Legs have ended ──────

$c11 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'legs' => [leg('CZTL_11A', 'monthly', 1, 12), leg('CZTL_11B', 'monthly', 6, 18)],
    'rate_sheet_items' => [item('hosting', 2, null, [claim('CZTL_11A', 1), claim('CZTL_11B', 3)])],
]);
$t11 = PMS::resolveCommercialLegTimeline($readModel, $c11);
assertSameValue(4, count($t11), '11. four periods across the two Legs\' independent windows plus Default\'s tail');
$p11a = periodAt($t11, 3);
$p11b = periodAt($t11, 9);
$p11c = periodAt($t11, 15);
$p11d = periodAt($t11, 25);
assertSameValue(1, count($p11a['components']), '11. months 1-5: only Leg A claims hosting, Default superseded');
assertSameValue(100.0, componentBySource($p11a, 'CZTL_11A')['price'], '11. Leg A\'s own qty1 claim');
assertSameValue(2, count($p11b['components']), '11. months 6-12: BOTH Legs active — additive, not one winner');
assertSameValue(100.0, componentBySource($p11b, 'CZTL_11A')['price'], '11. Leg A keeps its own qty1 component');
assertSameValue(300.0, componentBySource($p11b, 'CZTL_11B')['price'], '11. Leg B keeps its own qty3 component, independently — never merged with A');
assertTrue(componentBySource($p11b, 'default') === null, '11. Default still contributes nothing while either Leg claims hosting');
assertSameValue(1, count($p11c['components']), '11. months 13-18: Leg A has ended, only Leg B remains');
assertSameValue(300.0, componentBySource($p11c, 'CZTL_11B')['price'], '11. Leg B\'s own claim continues unchanged');
assertSameValue(1, count($p11d['components']), '11. month 19+: both Legs have ended, Default resumes');
assertSameValue(200.0, componentBySource($p11d, 'default')['price'], '11. hosting falls back to Default\'s own qty2 value');

// ── 12. Two Additional Legs, sequential, no Default at all ─────────────

$c12 = container([
    'billing_cycle' => null, // no Default configured — symmetric children, Default need not exist
    'legs' => [leg('CZTL_12A', 'monthly', 1, 12), leg('CZTL_12B', 'monthly', 13, 24)],
    'rate_sheet_items' => [
        item('hosting', 1, null, [claim('CZTL_12A', 1)]),
        item('support', 1, null, [claim('CZTL_12B', 2)]),
    ],
]);
$t12 = PMS::resolveCommercialLegTimeline($readModel, $c12);
assertSameValue(2, count($t12), '12. two periods, Default never appears anywhere');
assertTrue(componentBySource(periodAt($t12, 6), 'default') === null, '12. no Default component in period one — Default was never configured');
assertSameValue(1, count(periodAt($t12, 6)['components']), '12. only Leg A in months 1-12');
assertSameValue(1, count(periodAt($t12, 18)['components']), '12. only Leg B in months 13-24');
assertTrue(periodAt($t12, 30) === null, '12. nothing after month 24 — neither Leg is indefinite and Default does not exist');

// ── 13. Mixed cadence, concurrent — never collapsed into one number ────

$c13 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'legs' => [leg('CZTL_13', 'yearly', 1, null)],
    'rate_sheet_items' => [
        item('hosting', 1),
        item('addon', 1, null, [claim('CZTL_13', 1)]),
    ],
]);
$t13 = PMS::resolveCommercialLegTimeline($readModel, $c13);
assertSameValue(1, count($t13), '13. one period — identical windows');
assertSameValue(2, count($t13[0]['components']), '13. two separate components, one per cadence');
assertSameValue('monthly', componentBySource($t13[0], 'default')['billing_cycle'], '13. Default\'s own cadence is preserved');
assertSameValue('yearly', componentBySource($t13[0], 'CZTL_13')['billing_cycle'], '13. the Leg\'s own cadence is preserved, never normalized against Default\'s');

// ── 14. One-time + monthly, concurrent then monthly alone ──────────────

$c14 = container([
    'billing_cycle' => 'one-time', 'from_month' => 1, 'to_month' => 1,
    'legs' => [leg('CZTL_14', 'monthly', 1, null)],
    'rate_sheet_items' => [
        item('hosting', 1),
        item('addon', 1, null, [claim('CZTL_14', 1)]),
    ],
]);
$t14 = PMS::resolveCommercialLegTimeline($readModel, $c14);
assertSameValue(2, count($t14), '14. two periods — the one-time event, then monthly continuing alone');
$p14a = periodAt($t14, 1);
$p14b = periodAt($t14, 5);
assertSameValue(2, count($p14a['components']), '14. month 1: both the one-time event and the monthly Leg coexist');
assertSameValue('one-time', componentBySource($p14a, 'default')['billing_cycle'], '14. the one-time cadence is preserved');
assertSameValue(1, count($p14b['components']), '14. month 2+: the one-time event has passed, only the monthly Leg remains');
assertTrue(componentBySource($p14b, 'default') === null, '14. the one-time Default never recurs');

// ── 15/16. Indefinite Default + indefinite Additional, no commitment ───

$c15 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'legs' => [leg('CZTL_15', 'monthly', 1, null)],
    'rate_sheet_items' => [item('hosting', 1), item('addon', 1, null, [claim('CZTL_15', 1)])],
]);
$t15 = PMS::resolveCommercialLegTimeline($readModel, $c15);
assertSameValue(1, count($t15), '15/16. one period — both indefinite, same start');
assertSameValue(null, $t15[0]['to_month'], '15/16. no commitment set — the period stays open-ended, exactly as authored');

// ── 17. Commitment present — clamps the already-resolved timeline LAST ─

$c17 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'minimum_term_value' => 36, 'minimum_term_unit' => 'month',
    'legs' => [leg('CZTL_17', 'yearly', 13, null)],
    'rate_sheet_items' => [item('hosting', 1), item('addon', 1, null, [claim('CZTL_17', 1)])],
]);
$t17 = PMS::resolveCommercialLegTimeline($readModel, $c17);
assertSameValue(2, count($t17), '17. two periods — Default alone, then Default + the Leg, both clamped');
$p17a = periodAt($t17, 6);
$p17b = periodAt($t17, 20);
assertSameValue(12, $p17a['to_month'], '17. Default-only period is already finite (segmentation, not commitment) — the Leg starts at month 13');
assertSameValue(36, $p17b['to_month'], '17. the Leg\'s own indefinite window clamps to month 36 (anchor 1 + 36 - 1), never extended past commitment');
assertSameValue(13, $p17b['from_month'], '17. the Leg\'s own from_month is untouched by the clamp — only to_month is limited');
assertSameValue(30.0, componentBySource($p17b, 'CZTL_17')['price'], '17. the Leg\'s own claimed component still resolves correctly inside the clamped period');
assertTrue(periodAt($t17, 40) === null, '17. nothing exists past the commitment boundary');
// The PERIOD's own to_month is clamped (36); the COMPONENT's own to_month
// is that child's genuine authored window and is never itself clamped —
// resolve the Legs first, then clamp the final (period) timeline, never
// the child's own range.
assertSameValue(null, componentBySource($p17b, 'CZTL_17')['to_month'], '17. the Leg\'s own component reports its true authored to_month (null/indefinite), distinct from the clamped period it lives inside');
assertSameValue(13, componentBySource($p17b, 'CZTL_17')['from_month'], '17. the Leg\'s own component reports its true authored from_month');
assertSameValue(null, componentBySource($p17a, 'default')['to_month'], '17. Default\'s own component in the earlier, naturally-finite period ALSO reports its true authored to_month (null/indefinite) — the period boundary (12) is not the child\'s own range');
assertSameValue(1, componentBySource($p17a, 'default')['from_month'], '17. Default\'s own component reports its true authored from_month');

// ── 18. Leg starts after commitment ends — never creates state outside it ─

$c18 = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'minimum_term_value' => 12, 'minimum_term_unit' => 'month',
    'legs' => [leg('CZTL_18', 'yearly', 20, null)],
    'rate_sheet_items' => [item('hosting', 1)],
]);
$t18 = PMS::resolveCommercialLegTimeline($readModel, $c18);
assertSameValue(1, count($t18), '18. only Default\'s own clamped period exists');
assertSameValue(12, $t18[0]['to_month'], '18. Default clamps to the 12-month commitment boundary');
assertTrue(componentBySource($t18[0], 'CZTL_18') === null, '18. the Leg never appears — its own window starts entirely after commitment already ended');

// ── 22. Indefinite Default split by a later indefinite Leg, NO commitment —
//         each child's own range is read independently, never truncated by
//         the segmentation boundary the other child's start creates ──────

$c22 = container([
    'billing_cycle' => 'monthly', 'from_month' => 0, 'to_month' => null,
    'legs' => [leg('CZTL_22', 'monthly', 13, null)],
    'rate_sheet_items' => [
        item('hosting', 1),
        item('addon', 1, null, [claim('CZTL_22', 1)]),
    ],
]);
$t22 = PMS::resolveCommercialLegTimeline($readModel, $c22);
assertSameValue(2, count($t22), '22. two periods — the active-child set changes at month 13, that is a period boundary, not either child\'s own end');
$p22a = periodAt($t22, 6);
$p22b = periodAt($t22, 20);
assertSameValue(0, $p22a['from_month'], '22. first period starts at Default\'s own from_month (0)');
assertSameValue(12, $p22a['to_month'], '22. first period ends at month 12 — this is the SEGMENTATION boundary (Leg 1 starts at 13), not a truncation of Default\'s own range');
assertSameValue(null, $p22b['to_month'], '22. second period stays open-ended — no commitment to clamp it');
$default22a = componentBySource($p22a, 'default');
assertSameValue(0, $default22a['from_month'], '22. Default\'s own component reports its true authored from_month (0)');
assertSameValue(null, $default22a['to_month'], '22. Default\'s own component reports its true authored to_month: still indefinite, NOT 12 — this is the exact bug this scenario locks against');
$default22b = componentBySource($p22b, 'default');
assertTrue($default22b !== null, '22. Default is still active in the second period too — nothing claims hosting, so it keeps contributing after month 13');
assertSameValue(null, $default22b['to_month'], '22. Default\'s own component in the SECOND period also reports to_month: null — the SAME child, same authored range, regardless of which period it is resolved within');
$leg22b = componentBySource($p22b, 'CZTL_22');
assertSameValue(13, $leg22b['from_month'], '22. Leg 1\'s own component reports its true authored from_month (13)');
assertSameValue(null, $leg22b['to_month'], '22. Leg 1\'s own component reports its true authored to_month: null/indefinite, never forced finite by Default\'s own presence in the same period');

// ── 21. Reordering Legs changes no assignment relationship — matching is
//         by leg_platform_id only, array order carries no meaning ─────────

$legsInOrder   = [leg('CZTL_21A', 'monthly', 1, null), leg('CZTL_21B', 'monthly', 1, null)];
$legsReordered = [leg('CZTL_21B', 'monthly', 1, null), leg('CZTL_21A', 'monthly', 1, null)];
$rateSheetItems21 = [item('hosting', 1, null, [claim('CZTL_21B', 5)])];
$t21a = PMS::resolveCommercialLegTimeline($readModel, container(['billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null, 'legs' => $legsInOrder, 'rate_sheet_items' => $rateSheetItems21]));
$t21b = PMS::resolveCommercialLegTimeline($readModel, container(['billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null, 'legs' => $legsReordered, 'rate_sheet_items' => $rateSheetItems21]));
assertSameValue(500.0, componentBySource($t21a[0], 'CZTL_21B')['price'], '21. B\'s own claim resolves correctly with B listed first');
assertSameValue(500.0, componentBySource($t21b[0], 'CZTL_21B')['price'], '21. B\'s own claim resolves identically with B listed second — array order is not identity');
assertTrue(componentBySource($t21a[0], 'CZTL_21A') === null, '21. A never picks up B\'s claim regardless of order');
assertTrue(componentBySource($t21b[0], 'CZTL_21A') === null, '21. A never picks up B\'s claim regardless of order');

// ── 19. Real Tier acceptance case ───────────────────────────────────────
// Default: monthly, month 1 -> indefinite, full base composition (hosting +
// support). Additional Leg: yearly, month 13 -> indefinite, one inclusion
// (hosting) carries a different quantity on the Leg. Expected: before month
// 13, Default's own state; from month 13, Default's OTHER inclusion
// (support) is untouched while hosting is commercially replaced by the
// Leg's own claim — never duplicated.

$tierDefault = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'legs' => [leg('CZTL_TIER19', 'yearly', 13, null)],
    'rate_sheet_items' => [
        item('hosting', 2, null, [claim('CZTL_TIER19', 5)]),
        item('support', 1),
    ],
]);
$tier19 = PMS::resolveCommercialLegTimeline($readModel, $tierDefault);
assertSameValue(2, count($tier19), '19. two periods — before and from month 13');
$before13 = periodAt($tier19, 6);
$from13 = periodAt($tier19, 24);
assertSameValue(1, count($before13['components']), '19. before month 13: Default only');
assertSameValue(220.0, componentBySource($before13, 'default')['price'], '19. Default\'s own state: hosting(qty2 x $100) + support($20) = $220');
assertSameValue(2, count($from13['components']), '19. from month 13: Default (support) + the Leg (hosting) both contribute');
assertSameValue(20.0, componentBySource($from13, 'default')['price'], '19. Default\'s own remaining state is JUST support — hosting is not duplicated here');
assertSameValue(500.0, componentBySource($from13, 'CZTL_TIER19')['price'], '19. the Leg\'s own claimed hosting at its own qty5 = $500');

// ── 20. Real Edition acceptance case ────────────────────────────────────
// Edition Default Leg + one Additional Leg with a different Price Option
// AND quantity, commitment present. Each Leg prices independently from its
// own assignments, and commitment clamps the whole resolved timeline last.

$editionContainer = container([
    'billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => null,
    'minimum_term_value' => 24, 'minimum_term_unit' => 'month',
    'legs' => [leg('CZTEL_EDITION20', 'yearly', 1, null)],
    'rate_sheet_items' => [
        item('hosting', 1, null, [claim('CZTEL_EDITION20', 4, 'po_cheap')]),
        item('support', 1),
    ],
]);
$edition20 = PMS::resolveCommercialLegTimeline($readModel, $editionContainer);
assertSameValue(1, count($edition20), '20. one period — both Legs share the same start, both clamped by commitment');
assertSameValue(24, $edition20[0]['to_month'], '20. commitment clamps the Edition\'s own timeline to 24 months');
assertSameValue(2, count($edition20[0]['components']), '20. Default (support) and the Additional Leg (hosting) both contribute');
assertSameValue(20.0, componentBySource($edition20[0], 'default')['price'], '20. Default\'s own remaining state is support only — hosting is superseded');
assertSameValue(200.0, componentBySource($edition20[0], 'CZTEL_EDITION20')['price'], '20. the Additional Leg\'s own Price Option + quantity: qty4 x po_cheap($50) = $200');
assertSameValue('yearly', componentBySource($edition20[0], 'CZTEL_EDITION20')['billing_cycle'], '20. the Additional Leg\'s own cadence is preserved distinctly from Default\'s monthly cadence');

echo "Commercial Legs resolver contract: PASS\n";
