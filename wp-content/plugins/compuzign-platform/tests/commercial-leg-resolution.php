<?php

declare(strict_types=1);

/*
 * Commercial Leg resolution contract — PackageManagerSchema::resolveLeg().
 *
 * The canonical Default Leg resolved object: ONE declaration combining the
 * already-resolved inclusion pricing (projectTierRateSheetWith()'s own
 * output) with the Default Leg's own commercial terms (billing_cycle/
 * from_month/to_month/commitment_months). See the "Commercial Legs pricing
 * boundary" project note: this is deliberately pure assembly — no duration
 * math, no payment-count math, no contract total, not called anywhere yet.
 * commitment_months mirrors the frontend's own totalCommitmentMonths()
 * (tierDetailModel.ts) for the now-only-allowed 'month' unit — it collapses
 * $legTerms' minimum_term_value/minimum_term_unit pair into one field,
 * never reintroducing day/week/year conversion. These checks prove that
 * boundary holds: the same price in produces the same price out regardless
 * of what the leg terms say, and no field beyond the declared six ever
 * appears in the result.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema as PMS;

function assertSameValue(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

// ── 1. Full input -> exact union, nothing derived beyond the months collapse ──

$priced = [
    'price' => 8000.0,
    'valid_count' => 3,
    'pricing' => ['complete' => true, 'total' => 8000.0],
];
$legTerms = [
    'billing_cycle' => 'monthly',
    'from_month' => 1,
    'to_month' => 48,
    'minimum_term_value' => 48,
    'minimum_term_unit' => 'month',
];
$resolved = PMS::resolveLeg($priced, $legTerms);

assertSameValue(8000.0, $resolved['price'], 'price is the priced selection\'s own price, carried through unchanged');
assertSameValue(true, $resolved['available'], 'available reflects pricing.complete');
assertSameValue('monthly', $resolved['billing_cycle'], 'billing_cycle passes through from legTerms unchanged');
assertSameValue(1, $resolved['from_month'], 'from_month passes through unchanged');
assertSameValue(48, $resolved['to_month'], 'to_month passes through unchanged');
assertSameValue(48, $resolved['commitment_months'], 'minimum_term_value collapses straight to commitment_months when the unit is month');
assertSameValue(
    ['price', 'available', 'billing_cycle', 'from_month', 'to_month', 'commitment_months'],
    array_keys($resolved),
    'resolveLeg() returns exactly these six fields — no derived payment count or total ever appears'
);

// ── 2. available reflects pricing.complete, independent of price's own value ──

$incompletePriced = ['price' => null, 'pricing' => ['complete' => false, 'total' => null]];
$incompleteResolved = PMS::resolveLeg($incompletePriced, $legTerms);
assertSameValue(null, $incompleteResolved['price'], 'an incomplete pricing projection carries its null price through unchanged');
assertSameValue(false, $incompleteResolved['available'], 'available is false when pricing.complete is false');

// ── 3. No duration/payment math — price is identical regardless of leg terms ──

$longLeg = ['billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => 48, 'minimum_term_value' => 48, 'minimum_term_unit' => 'month'];
$shortLeg = ['billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => 1, 'minimum_term_value' => null, 'minimum_term_unit' => null];
$resolvedLong = PMS::resolveLeg($priced, $longLeg);
$resolvedShort = PMS::resolveLeg($priced, $shortLeg);
assertSameValue(
    $resolvedLong['price'],
    $resolvedShort['price'],
    'the SAME priced selection resolves to the SAME price regardless of the leg\'s own duration — never multiplied by from_month/to_month/commitment_months (no commitment-total is ever produced here)'
);
assertSameValue(8000.0, $resolvedLong['price'], 'a 48-month Default Leg still resolves to the periodic price, never a multiplied total (e.g. never 384000.0)');

// ── 4. commitment_months is null unless the unit is exactly 'month' ───────────

$legacyYearLeg = ['billing_cycle' => 'annual', 'from_month' => 1, 'to_month' => 12, 'minimum_term_value' => 4, 'minimum_term_unit' => 'year'];
$legacyResolved = PMS::resolveLeg($priced, $legacyYearLeg);
assertSameValue(null, $legacyResolved['commitment_months'], 'a non-month unit (legacy data) resolves to null rather than reintroducing day/week/year conversion');

$noUnitLeg = ['billing_cycle' => 'monthly', 'from_month' => 1, 'to_month' => 12, 'minimum_term_value' => 12, 'minimum_term_unit' => null];
$noUnitResolved = PMS::resolveLeg($priced, $noUnitLeg);
assertSameValue(null, $noUnitResolved['commitment_months'], 'a minimum_term_value with no unit resolves commitment_months to null, not the raw value');

// ── 5. Missing/absent keys default to null gracefully ─────────────────────────

$empty = PMS::resolveLeg([], []);
assertSameValue(null, $empty['price'], 'absent price key resolves to null');
assertSameValue(false, $empty['available'], 'absent pricing key resolves available to false');
assertSameValue(null, $empty['billing_cycle'], 'absent billing_cycle resolves to null');
assertSameValue(null, $empty['from_month'], 'absent from_month resolves to null');
assertSameValue(null, $empty['to_month'], 'absent to_month resolves to null');
assertSameValue(null, $empty['commitment_months'], 'absent minimum_term_value/unit resolves commitment_months to null');

echo "Commercial Leg resolution contract: PASS\n";
