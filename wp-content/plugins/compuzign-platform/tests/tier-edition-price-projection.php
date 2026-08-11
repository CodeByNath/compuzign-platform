<?php

declare(strict_types=1);

/*
 * Parity repair contract: PackageManagerSchema::projectEditionPrices() —
 * the thin batch wrapper around the SAME projectTierRateSheetWith() the
 * Default Tier occupant already uses, so a Tier Edition's own
 * rate_sheet_id + rate_sheet_items resolve through the one authoritative
 * Rate Sheet pricing boundary instead of leaving `price` a raw, never-
 * derived stored scalar (see docs/code-map/tier-edition.md).
 *
 * This file exercises the projection function directly, at the same layer
 * package-manager-schema.php already tests projectTierRateSheetWith at.
 * The two live call sites (PackageStationController::getPackageStation()
 * for the admin read, PackageRepository::findAllActiveIndexedByServiceId()
 * for the public/Cost Builder projection) are each a single verified line
 * calling this same function — the public path is additionally proven
 * end-to-end in tier-instance-public-projection.php. No existing test in
 * this suite exercises PackageStationController's REST methods directly
 * (they are covered at the Schema/Repository layer instead); this file
 * keeps that same convention rather than inventing a new REST harness.
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

// ── Fixture: one connected/settled inclusion, one Rate Sheet with two rows ──

$incPool = [['id' => 'inc-a', 'label' => 'Feature A']];
$manager = PMS::commitConfiguration(
    PMS::defaultManager(),
    [],
    [['source_type' => 'inclusion', 'source_id' => 'inc-a', 'disabled' => false]],
    $incPool,
    [],
    [[
        'rate_sheet_id' => 'rs_test',
        'title'  => 'Test Rates',
        'status' => 'active',
        'groups' => [],
        'items'  => [
            ['item_id' => 'rate-1', 'source_item_id' => PMS::deriveItemId('inclusion', 'inc-a'), 'unit_price' => 36, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null],
            ['item_id' => 'rate-2', 'source_item_id' => PMS::deriveItemId('inclusion', 'inc-a'), 'unit_price' => 10, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null],
        ],
    ]]
);
$readModel = PMS::buildReadModel(10, $manager, $incPool, [], 'active');

// ── 1. One item at quantity 1 derives price from the row's unit_price ───────

$single = PMS::projectEditionPrices($readModel, [
    ['id' => 'edt_1', 'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => [['item_id' => 'rate-1', 'quantity' => 1]], 'price' => 999999.0],
]);
assertSameValue(36.0, $single[0]['price'], 'a single selected item derives price from its row unit_price');
assertSameValue('edt_1', $single[0]['id'], 'every other key on the row passes through untouched');

// ── 9. No client-supplied price is ever authoritative ───────────────────────
// (the 999999.0 seeded above is unconditionally overwritten, never blended)
assertSameValue(36.0, $single[0]['price'], 'a caller-supplied price on the input row is discarded, never treated as authoritative');

// ── 2. Quantity multiplies the derived unit price ────────────────────────────

$qty3 = PMS::projectEditionPrices($readModel, [
    ['id' => 'edt_2', 'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => [['item_id' => 'rate-1', 'quantity' => 3]]],
]);
assertSameValue(108.0, $qty3[0]['price'], 'quantity multiplies the row unit_price (36 x 3)');

// ── 3. Multiple items sum correctly ──────────────────────────────────────────

$multi = PMS::projectEditionPrices($readModel, [
    ['id' => 'edt_3', 'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => [
        ['item_id' => 'rate-1', 'quantity' => 1],
        ['item_id' => 'rate-2', 'quantity' => 2],
    ]],
]);
assertSameValue(56.0, $multi[0]['price'], 'multiple selected items sum correctly (36 + 2x10)');

// ── 4. Each row in a batch uses its OWN selections, never mixed with a sibling ──

$independent = PMS::projectEditionPrices($readModel, [
    ['id' => 'occupant_style', 'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => [['item_id' => 'rate-1', 'quantity' => 1]]],
    ['id' => 'edition_style',  'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => [['item_id' => 'rate-2', 'quantity' => 5]]],
]);
assertSameValue(36.0, $independent[0]['price'], 'the first row in a batch prices from its own selections only');
assertSameValue(50.0, $independent[1]['price'], 'a second row in the SAME batch call prices from its own distinct selections, never blended with the first — an Edition never inherits its parent Tier\'s selection');

// ── 5. Changing selections changes the projected price ───────────────────────

$before = PMS::projectEditionPrices($readModel, [
    ['id' => 'edt_5', 'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => [['item_id' => 'rate-1', 'quantity' => 1]]],
])[0]['price'];
$after = PMS::projectEditionPrices($readModel, [
    ['id' => 'edt_5', 'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => [
        ['item_id' => 'rate-1', 'quantity' => 1],
        ['item_id' => 'rate-2', 'quantity' => 1],
    ]],
])[0]['price'];
assertSameValue(36.0, $before, 'baseline price before adding an inclusion');
assertSameValue(46.0, $after, 'adding a selected inclusion changes the projected price (36 + 10)');

// ── 6. Byte-identical to the Default Tier's own direct call — one shared authority ──

$occupantStyle = PMS::projectTierRateSheetWith($readModel, [['item_id' => 'rate-1', 'quantity' => 2]], 'rs_test');
$editionStyle  = PMS::projectEditionPrices($readModel, [
    ['id' => 'x', 'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => [['item_id' => 'rate-1', 'quantity' => 2]]],
]);
assertSameValue(
    $occupantStyle['price'],
    $editionStyle[0]['price'],
    'for the same selections, the Edition wrapper produces a byte-identical price to the occupant\'s own direct projectTierRateSheetWith() call — one shared pricing authority, never a second calculation'
);

// ── Edge cases: empty/missing selections fail safe to null, never throw ─────

$noSelections = PMS::projectEditionPrices($readModel, [
    ['id' => 'edt_6', 'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => []],
]);
assertSameValue(null, $noSelections[0]['price'], 'an Edition with no selections projects a null price, matching the occupant\'s own empty-selection behavior');

$missingKeys = PMS::projectEditionPrices($readModel, [['id' => 'edt_7']]);
assertSameValue(null, $missingKeys[0]['price'], 'a row missing rate_sheet_id/rate_sheet_items entirely fails safe to null rather than throwing');

echo "Tier Edition price projection contract: PASS\n";
