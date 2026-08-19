<?php

declare(strict_types=1);

/*
 * Commercial-leg resolution contract (Phase 1 — resolution only, see
 * docs/code-map/tier-edition.md). PackageManagerSchema::projectCommercialLegs()
 * resolves each of a Tier/Edition's own commercial legs to its own aggregate
 * price by reusing projectTierRateSheetWith() UNCHANGED, once per leg, against
 * a synthetic selection list built from exactly the inclusions whose own
 * leg_assignments name that leg — never a second pricing calculation, never a
 * mutation of the Rate Sheet row/options it selects from.
 *
 * This file proves the resolver in isolation, the same hand-built-fixture
 * pattern tests/tier-rate-sheet-price-option.php already uses. It does not
 * touch PackageSchema's extraction or PackageRepository's public projection —
 * that wiring, and the resulting wire-shape decisions, are a later phase.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema as PMS;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;

function assertSameValueLegs(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

function assertTrueLegs(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

// ── Fixture: same shape as tier-rate-sheet-price-option.php's own ───────────

$incPool = [['id' => 'inc-a', 'label' => 'Feature A'], ['id' => 'inc-b', 'label' => 'Feature B']];
$sourceItemIdA = PMS::deriveItemId('inclusion', 'inc-a');
$sourceItemIdB = PMS::deriveItemId('inclusion', 'inc-b');
$manager = [
    'sources' => [
        ['source_type' => 'inclusion', 'source_id' => 'inc-a', 'disabled' => false],
        ['source_type' => 'inclusion', 'source_id' => 'inc-b', 'disabled' => false],
    ],
    'groups' => [],
    'category_groups' => [],
    'items' => [
        ['item_id' => $sourceItemIdA, 'source_type' => 'inclusion', 'source_id' => 'inc-a', 'group_id' => null, 'sort_order' => 0, 'disabled' => false, 'decorated_label' => null, 'draft' => null, 'module_transition' => 'settled'],
        ['item_id' => $sourceItemIdB, 'source_type' => 'inclusion', 'source_id' => 'inc-b', 'group_id' => null, 'sort_order' => 1, 'disabled' => false, 'decorated_label' => null, 'draft' => null, 'module_transition' => 'settled'],
    ],
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_test',
        'title'  => 'Test Rates',
        'status' => 'active',
        'groups' => [],
        'items'  => [
            [
                // Foundation Bundle equivalent: one row, two Price Options — an
                // Upfront-shaped one and an Annual-shaped one — exactly the
                // "same inclusion, two legs, two different Rate Sheet Price
                // Options" shape from the approved commercial-leg design.
                'item_id' => 'rate-foundation', 'source_item_id' => $sourceItemIdA, 'unit_price' => 40,
                'per' => 'Per item', 'quantity' => 1, 'group_id' => null,
                'price_options' => [
                    ['option_id' => 'opt-upfront', 'cz_platform_id' => 'CZPRCIO-1', 'label' => 'Upfront', 'unit_price' => 30],
                    ['option_id' => 'opt-annual', 'cz_platform_id' => 'CZPRCIO-2', 'label' => 'Annual', 'unit_price' => 50],
                ],
            ],
            // Managed Hosting equivalent: no Price Options, prices at Default.
            ['item_id' => 'rate-hosting', 'source_item_id' => $sourceItemIdB, 'unit_price' => 10, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'price_options' => []],
        ],
    ]],
];
$readModel = PMS::buildReadModel(10, $manager, $incPool, [], 'active');

$legs = PackageSchema::sanitizeCommercialLegs([
    ['id' => 'leg_a', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 1, 'end_month' => 24],
    ['id' => 'leg_b', 'payment_category' => 'recurring', 'billing_cycle' => 'yearly', 'start_month' => 25, 'end_month' => 48],
], 48.0);

// Foundation Bundle -> Leg A (Upfront) and Leg B (Annual); Managed Hosting -> Leg B only.
$selections = [
    [
        'item_id' => 'rate-foundation', 'quantity' => 1,
        'leg_assignments' => [
            ['leg_id' => 'leg_a', 'price_option_id' => 'opt-upfront'],
            ['leg_id' => 'leg_b', 'price_option_id' => 'opt-annual'],
        ],
    ],
    [
        'item_id' => 'rate-hosting', 'quantity' => 1,
        'leg_assignments' => [
            ['leg_id' => 'leg_b', 'price_option_id' => null],
        ],
    ],
];

// ── 1. Empty legs (Simple Mode) resolves nothing, no work performed ─────────

assertSameValueLegs([], PMS::projectCommercialLegs($readModel, [], $selections, 'rs_test'), 'no commercial legs -> an empty resolution, Simple Mode is a true no-op');

// ── 2. Each leg resolves through the SAME projectTierRateSheetWith() authority ──

$resolved = PMS::projectCommercialLegs($readModel, $legs, $selections, 'rs_test');
assertSameValueLegs(2, count($resolved), 'both declared legs are resolved, one entry each');

$legAResult = $resolved[0];
$legBResult = $resolved[1];
assertSameValueLegs('leg_a', $legAResult['id'], 'leg A round-trips its own id');
assertSameValueLegs('upfront', $legAResult['billing_cycle'], 'leg A round-trips its own billing_cycle');
assertSameValueLegs(1, $legAResult['start_month'], 'leg A round-trips its own start_month');
assertSameValueLegs(24, $legAResult['end_month'], 'leg A round-trips its own end_month');

// Leg A: only Foundation Bundle is assigned to it, priced at its own Upfront option (30).
assertSameValueLegs(30.0, $legAResult['price'], 'Leg A prices Foundation Bundle at its OWN Upfront Price Option — the same amount the Rate Sheet already owns, never recalculated');
assertSameValueLegs(1, $legAResult['valid_count'], 'Leg A resolves exactly the one inclusion assigned to it');

// Leg B: BOTH Foundation Bundle (Annual, 50) and Managed Hosting (Default, 10) are assigned.
assertSameValueLegs('leg_b', $legBResult['id'], 'leg B round-trips its own id');
assertSameValueLegs(25, $legBResult['start_month'] , 'leg B round-trips its own start_month');
assertSameValueLegs(48, $legBResult['end_month'], 'leg B round-trips its own end_month');
assertSameValueLegs(60.0, $legBResult['price'], 'Leg B sums BOTH inclusions assigned to it: Foundation Bundle at Annual (50) + Managed Hosting at Default (10) = 60');
assertSameValueLegs(2, $legBResult['valid_count'], 'Leg B resolves both inclusions assigned to it');

// ── 3. The SAME item_id resolves independently per leg — never blended ──────

assertTrueLegs($legAResult['price'] !== $legBResult['price'], 'Foundation Bundle prices differently under Leg A (Upfront) vs Leg B (Annual) — independent selections on the same row, mirroring Default-Tier-vs-Edition independence');

// ── 4. A leg's own resolution never reads the selection's top-level price_option_id ──

$withTopLevelOption = [
    [
        'item_id' => 'rate-foundation', 'quantity' => 1, 'price_option_id' => 'opt-annual',
        'leg_assignments' => [['leg_id' => 'leg_a', 'price_option_id' => 'opt-upfront']],
    ],
];
$ignoresTopLevel = PMS::projectCommercialLegs($readModel, $legs, $withTopLevelOption, 'rs_test');
assertSameValueLegs(30.0, $ignoresTopLevel[0]['price'], 'Leg A prices from its OWN leg_assignments price_option_id (Upfront=30), never the selection\'s unrelated top-level price_option_id (Annual=50)');

// ── 5. Per-leg quantity is its own independent value, multiplied exactly as ─
// ──    the shared resolver already does — never inherited from the         ─
// ──    selection's own top-level quantity, a separate concern (that one    ─
// ──    governs the Default declaration's own total, not any one leg).      ─

$withQuantity = [
    ['item_id' => 'rate-foundation', 'quantity' => 1, 'leg_assignments' => [['leg_id' => 'leg_a', 'price_option_id' => 'opt-upfront', 'quantity' => 3]]],
];
assertSameValueLegs(90.0, PMS::projectCommercialLegs($readModel, $legs, $withQuantity, 'rs_test')[0]['price'], 'the assignment\'s OWN quantity multiplies the leg-selected option price (30 x 3), the same rule projectTierRateSheetWith() already enforces');

$withMismatchedQuantities = [
    ['item_id' => 'rate-foundation', 'quantity' => 5, 'leg_assignments' => [['leg_id' => 'leg_a', 'price_option_id' => 'opt-upfront', 'quantity' => 2]]],
];
assertSameValueLegs(60.0, PMS::projectCommercialLegs($readModel, $legs, $withMismatchedQuantities, 'rs_test')[0]['price'], 'the leg prices from its OWN quantity (2) even though the selection\'s top-level quantity is a different value (5) — the two are independent, never blended');

$withNoLegQuantity = [
    ['item_id' => 'rate-foundation', 'quantity' => 5, 'leg_assignments' => [['leg_id' => 'leg_a', 'price_option_id' => 'opt-upfront']]],
];
assertSameValueLegs(30.0, PMS::projectCommercialLegs($readModel, $legs, $withNoLegQuantity, 'rs_test')[0]['price'], 'an assignment with no quantity of its own defaults to 1 — it never falls back to the selection\'s unrelated top-level quantity (5)');

// ── 6. An unresolved price_option_id makes THAT leg's price null, never partial ──

$withUnresolved = [
    ['item_id' => 'rate-foundation', 'quantity' => 1, 'leg_assignments' => [['leg_id' => 'leg_a', 'price_option_id' => 'opt-does-not-exist']]],
];
$unresolvedResult = PMS::projectCommercialLegs($readModel, $legs, $withUnresolved, 'rs_test');
assertSameValueLegs(null, $unresolvedResult[0]['price'], 'an unresolved Price Option makes the WHOLE leg price null, exactly like the existing single-selection invariant — never a silent fallback to Default Price');
assertTrueLegs(in_array('price_option_unresolved', $unresolvedResult[0]['selections'][0]['health_reasons'], true), 'the per-leg resolved selection still reports price_option_unresolved, same shape projectTierRateSheetWith() already returns');

// ── 7. A leg with nothing assigned to it resolves like any other empty set ──

$noAssignments = [['item_id' => 'rate-foundation', 'quantity' => 1, 'leg_assignments' => []]];
$emptyLegResult = PMS::projectCommercialLegs($readModel, $legs, $noAssignments, 'rs_test');
assertSameValueLegs(null, $emptyLegResult[0]['price'], 'a leg with no inclusions assigned to it prices as null (an empty selection set), the same as an occupant with no selections at all');
assertSameValueLegs(0, $emptyLegResult[0]['valid_count'], 'a leg with no inclusions assigned to it resolves zero rows');
assertSameValueLegs([], $emptyLegResult[0]['selections'], 'a leg with no inclusions assigned to it carries no selection rows, but IS still present in the result — a leg is never silently omitted for lacking assignments');

echo "Commercial-leg projection checks passed.\n";
