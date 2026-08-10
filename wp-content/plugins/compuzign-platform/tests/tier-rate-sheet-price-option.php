<?php

declare(strict_types=1);

/*
 * Rate Sheet Price Option selection contract — TierRateSheetSelection's
 * optional price_option_id, resolved through the SAME single pricing
 * authority (PackageManagerSchema::projectTierRateSheetWith()) both Default
 * Tier and Tier Edition already share (see docs/code-map/rate-sheet.md,
 * docs/code-map/tier-edition.md). Price Options are a row's own alternative
 * unit prices — never a second row, never Rate-Sheet-wide, and never the
 * legacy `option_selections` pricing contract, which stays untouched.
 *
 * Semantics under test:
 *   price_option_id absent/null           -> row's own Default Price
 *   price_option_id present and resolves  -> that option's unit_price
 *   price_option_id present, unresolved   -> unresolved; NEVER a silent
 *                                             fallback to Default Price
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema as PMS;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;

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

// ── Fixture: one connected inclusion, one Rate Sheet row with two Price Options ──

$incPool = [['id' => 'inc-a', 'label' => 'Feature A']];
$sourceItemId = PMS::deriveItemId('inclusion', 'inc-a');
$manager = [
    'sources' => [['source_type' => 'inclusion', 'source_id' => 'inc-a', 'disabled' => false]],
    'groups' => [],
    'category_groups' => [],
    'items' => [['item_id' => $sourceItemId, 'source_type' => 'inclusion', 'source_id' => 'inc-a', 'group_id' => null, 'sort_order' => 0, 'disabled' => false, 'decorated_label' => null, 'draft' => null, 'module_transition' => 'settled']],
    'rate_sheets' => [[
        'rate_sheet_id' => 'rs_test',
        'title'  => 'Test Rates',
        'status' => 'active',
        'groups' => [],
        'items'  => [
            [
                'item_id' => 'rate-1', 'source_item_id' => $sourceItemId, 'unit_price' => 36,
                'per' => 'Per item', 'quantity' => 1, 'group_id' => null,
                'price_options' => [
                    ['option_id' => 'opt-bulk', 'cz_platform_id' => 'CZPRCIO-1', 'label' => 'Bulk', 'unit_price' => 30],
                    ['option_id' => 'opt-premium', 'cz_platform_id' => 'CZPRCIO-2', 'label' => 'Premium', 'unit_price' => 50],
                ],
            ],
            // A row with no Price Options at all — proves the no-options case
            // is entirely unaffected.
            ['item_id' => 'rate-2', 'source_item_id' => $sourceItemId, 'unit_price' => 10, 'per' => 'Per item', 'quantity' => 1, 'group_id' => null, 'price_options' => []],
        ],
    ]],
];
$readModel = PMS::buildReadModel(10, $manager, $incPool, [], 'active');

// ── 1. No Price Options on the row -> existing Default Price behavior unchanged ──

$noOptions = PMS::projectTierRateSheetWith($readModel, [['item_id' => 'rate-2', 'quantity' => 1]], 'rs_test');
assertSameValue(10.0, $noOptions['selections'][0]['unit_price'], 'a row with no price_options prices at its own Default Price, unchanged');
assertSameValue(null, $noOptions['selections'][0]['price_option_id'], 'no price_option_id was selected');
assertSameValue(10.0, $noOptions['price'], 'projected Tier price for a no-options row is unaffected');

// ── 2. Null price_option_id -> Default Price ─────────────────────────────────

$nullOption = PMS::projectTierRateSheetWith($readModel, [['item_id' => 'rate-1', 'quantity' => 1, 'price_option_id' => null]], 'rs_test');
assertSameValue(36.0, $nullOption['selections'][0]['unit_price'], 'null price_option_id resolves to the row\'s own Default Price');
assertSameValue(36.0, $nullOption['price'], 'projected Tier price uses Default Price when price_option_id is null');

// ── 3. Valid option -> option unit price, not Default Price ─────────────────

$bulk = PMS::projectTierRateSheetWith($readModel, [['item_id' => 'rate-1', 'quantity' => 1, 'price_option_id' => 'opt-bulk']], 'rs_test');
assertSameValue(30.0, $bulk['selections'][0]['unit_price'], 'a valid price_option_id resolves to that option\'s own unit_price');
assertSameValue('opt-bulk', $bulk['selections'][0]['price_option_id'], 'the resolved selection echoes price_option_id back for UI round-trip');
assertSameValue(30.0, $bulk['price'], 'projected Tier price reflects the selected option, not Default Price');
assertTrue($bulk['selections'][0]['available'], 'a resolved Price Option selection remains available');

// ── 4. Quantity multiplies the SELECTED option's price, not Default Price ───

$bulkQty3 = PMS::projectTierRateSheetWith($readModel, [['item_id' => 'rate-1', 'quantity' => 3, 'price_option_id' => 'opt-bulk']], 'rs_test');
assertSameValue(90.0, $bulkQty3['selections'][0]['line_total'], 'quantity multiplies the selected option price (30 x 3), never Default Price (36 x 3)');
assertSameValue(90.0, $bulkQty3['price'], 'projected Tier total reflects option price x quantity');

// ── 5. Changing the Price Option changes the projected Tier price ───────────

$asBulk = PMS::projectTierRateSheetWith($readModel, [['item_id' => 'rate-1', 'quantity' => 1, 'price_option_id' => 'opt-bulk']], 'rs_test');
$asPremium = PMS::projectTierRateSheetWith($readModel, [['item_id' => 'rate-1', 'quantity' => 1, 'price_option_id' => 'opt-premium']], 'rs_test');
assertSameValue(30.0, $asBulk['price'], 'baseline: Bulk option price');
assertSameValue(50.0, $asPremium['price'], 'switching the SAME row to Premium changes the projected Tier price (30 -> 50)');

// ── 6. Changing the Price Option changes the projected Edition price too ────

$editionAsBulk = PMS::projectEditionPrices($readModel, [
    ['id' => 'edt_1', 'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => [['item_id' => 'rate-1', 'quantity' => 1, 'price_option_id' => 'opt-bulk']]],
]);
$editionAsPremium = PMS::projectEditionPrices($readModel, [
    ['id' => 'edt_1', 'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => [['item_id' => 'rate-1', 'quantity' => 1, 'price_option_id' => 'opt-premium']]],
]);
assertSameValue(30.0, $editionAsBulk[0]['price'], 'Edition projection also resolves the selected option (Bulk)');
assertSameValue(50.0, $editionAsPremium[0]['price'], 'switching the Edition\'s own selection to Premium changes ONLY the Edition\'s projected price');

// ── 7. Default Tier and Edition choose DIFFERENT options for the SAME item_id ──

$occupantSelection = PMS::projectTierRateSheetWith($readModel, [['item_id' => 'rate-1', 'quantity' => 1, 'price_option_id' => 'opt-premium']], 'rs_test');
$editionSelection = PMS::projectEditionPrices($readModel, [
    ['id' => 'edt_2', 'rate_sheet_id' => 'rs_test', 'rate_sheet_items' => [['item_id' => 'rate-1', 'quantity' => 1, 'price_option_id' => 'opt-bulk']]],
]);
assertSameValue(50.0, $occupantSelection['price'], 'the occupant\'s own selection of Premium prices independently');
assertSameValue(30.0, $editionSelection[0]['price'], 'the Edition\'s own selection of Bulk on the SAME row prices independently — never blended with the occupant\'s choice');

// ── 8. Invalid/missing referenced Price Option is unresolved, never silently defaulted ──

$invalid = PMS::projectTierRateSheetWith($readModel, [['item_id' => 'rate-1', 'quantity' => 2, 'price_option_id' => 'opt-does-not-exist']], 'rs_test');
assertSameValue(null, $invalid['selections'][0]['unit_price'], 'an unresolved price_option_id never falls back to Default Price (36) — it resolves to no price at all');
assertSameValue(null, $invalid['selections'][0]['line_total'], 'an unresolved price_option_id selection has no line total');
assertTrue(!$invalid['selections'][0]['available'], 'an unresolved price_option_id makes the row unavailable, even though the row itself (rate-1) resolves fine');
assertTrue(in_array('price_option_unresolved', $invalid['selections'][0]['health_reasons'], true), 'the unresolved price option is reported in health_reasons');
assertSameValue(null, $invalid['price'], 'an unresolved price_option_id selection makes the WHOLE projected Tier price null, exactly like any other unresolved/unavailable line — never a partial total that silently drops the bad line');
assertTrue($invalid['selections'][0]['resolved'], 'the ROW itself still resolves (its source connects) — only the price is unresolved, a distinct fact from row resolution');

// ── 9. sanitizeTierRateSheetSelections preserves price_option_id (quantity-only edits) ──

$sanitized = PackageSchema::sanitizeTierRateSheetSelections([
    ['item_id' => 'rate-1', 'quantity' => 5, 'price_option_id' => 'opt-bulk'],
    ['item_id' => 'rate-2', 'quantity' => 1],
]);
assertSameValue('opt-bulk', $sanitized[0]['price_option_id'], 'sanitizeTierRateSheetSelections preserves price_option_id through persistence, unrelated to a quantity edit');
assertSameValue(5, $sanitized[0]['quantity'], 'quantity is preserved alongside price_option_id');
assertSameValue(null, $sanitized[1]['price_option_id'], 'a selection with no price_option_id sanitizes to null, not an absent/undefined key');

$sanitizedBlank = PackageSchema::sanitizeTierRateSheetSelections([
    ['item_id' => 'rate-1', 'quantity' => 1, 'price_option_id' => ''],
]);
assertSameValue(null, $sanitizedBlank[0]['price_option_id'], 'an empty-string price_option_id sanitizes to null (Default Price), not an empty-string identity');

// ── 10. option_selections (the separate legacy pricing contract) is untouched ──

$pricingUnaffected = PMS::projectTierRateSheetWith($readModel, [['item_id' => 'rate-1', 'quantity' => 1, 'price_option_id' => 'opt-bulk']], 'rs_test');
assertTrue(array_key_exists('pricing', $pricingUnaffected), 'the shared evaluateTierPricing() engine still runs and returns its own pricing block');
assertSameValue(30.0, $pricingUnaffected['pricing']['total'], 'the shared pricing engine total reflects the resolved option price, fed in as the item\'s effective unit_price — option_selections/options plumbing itself is never touched');

echo "Rate Sheet Price Option selection contract: PASS\n";
