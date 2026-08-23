<?php

declare(strict_types=1);

/*
 * Headline Leg pointer (headline_leg_id) — customer-UI presentation
 * metadata, not a pricing resolver. Two things are exercised, deliberately
 * narrow:
 *
 * 1. PackageSchema::extractTierForCostBuilder()'s public-projection
 *    resolution: an empty stored pointer (Leg Default is Headline) must
 *    resolve to the occupant's own real default_leg_platform_id once
 *    minted, else the literal 'default' — never leak the raw empty/
 *    internal state to the customer response — while a non-empty pointer
 *    (an Additional Leg) passes through unchanged. This is the same
 *    fallback resolveCommercialLegTimeline() already computes internally
 *    for the Default component's own 'source', so the two must always
 *    agree.
 * 2. PackageStationController::rewriteHeadlineLegId() — the Publish-time
 *    draft-id -> real-Platform-ID rewrite, exercised via Reflection against
 *    a constructor-free instance (a pure, dependency-free private method:
 *    no WordPress/DB/identity-service stack needed to prove its own logic).
 *
 * No resolver, minting, pricing, or Commercial Legs segmentation logic is
 * touched by either.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as PS;
use CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationController;

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

function assertSameValue(mixed $expected, mixed $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, "FAIL: {$message}\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true) . "\n");
        exit(1);
    }
}

// ── 1. extractTierForCostBuilder(): customer projection resolution ─────────

function occupantShell(array $overrides): array
{
    return array_merge([
        'id' => 'occ_headline_test',
        'cz_platform_id' => 'CZT123',
        'platform_status' => 'active',
        'label' => 'Starter Cloud',
        'price' => 157.0,
        'billing_cycle' => 'monthly',
        'headline_leg_id' => '',
        'default_leg_platform_id' => '',
        'legs' => [],
        'from_month' => null,
        'to_month' => null,
        'minimum_term_value' => null,
        'minimum_term_unit' => null,
    ], $overrides);
}

// 1a. Empty stored pointer + no minted Default identity yet -> literal 'default',
//     matching resolveCommercialLegTimeline()'s own legacy fallback exactly.
$noIdentity = PS::extractTierForCostBuilder(['current_occupant' => occupantShell([])]);
assertSameValue('default', $noIdentity['headline_leg_id'], 'empty pointer + unminted Default -> literal default sentinel');

// 1b. Empty stored pointer + a real minted Default identity -> that real CZTL,
//     never the raw empty/internal state.
$withIdentity = PS::extractTierForCostBuilder(['current_occupant' => occupantShell([
    'default_leg_platform_id' => 'CZTL111',
])]);
assertSameValue('CZTL111', $withIdentity['headline_leg_id'], 'empty pointer + minted Default -> real default_leg_platform_id, never empty');

// 1c. Non-empty stored pointer (an Additional Leg) passes through unchanged,
//     regardless of whether the Default Leg itself has a minted identity.
$additionalHeadline = PS::extractTierForCostBuilder(['current_occupant' => occupantShell([
    'default_leg_platform_id' => 'CZTL111',
    'headline_leg_id' => 'CZTL222',
])]);
assertSameValue('CZTL222', $additionalHeadline['headline_leg_id'], 'stored pointer at an Additional Leg passes through unchanged');

// ── 2. Publish-time rewrite: draft id -> real Platform ID ───────────────────

final class HeadlineTestReservation
{
    public function __construct(private string $platformId) {}
    public function platformId(): string { return $this->platformId; }
}

$reflection = new ReflectionClass(PackageStationController::class);
$controller = $reflection->newInstanceWithoutConstructor();
$rewrite = $reflection->getMethod('rewriteHeadlineLegId');

// 2a. headline_leg_id names the SAME Leg this reservation pass just minted an
//     Additional Leg identity for -> rewritten to that real platform_id.
$reservations = [
    ['legId' => 'default', 'reservation' => new HeadlineTestReservation('CZTL111'), 'resumed' => false],
    ['legId' => 'draft_leg_a', 'reservation' => new HeadlineTestReservation('CZTL222'), 'resumed' => false],
];
$rewritten = $rewrite->invoke($controller, ['headline_leg_id' => 'draft_leg_a'], $reservations);
assertSameValue('CZTL222', $rewritten['headline_leg_id'], 'draft Additional-Leg id rewrites to its own newly-minted platform_id');

// 2b. headline_leg_id names the Default Leg's own internal bucketing key ->
//     rewrites to the real minted default_leg_platform_id too (Default is
//     addressable by headline_leg_id, unlike leg_assignments[]).
$rewrittenDefault = $rewrite->invoke($controller, ['headline_leg_id' => 'default'], $reservations);
assertSameValue('CZTL111', $rewrittenDefault['headline_leg_id'], "the literal 'default' legId rewrites to the real default_leg_platform_id too");

// 2c. Empty (Default-is-Headline, no explicit pointer) is left untouched — it
//     never matches any legId, so nothing needs rewriting for that case.
$rewrittenEmpty = $rewrite->invoke($controller, ['headline_leg_id' => ''], $reservations);
assertSameValue('', $rewrittenEmpty['headline_leg_id'], 'empty pointer is never rewritten');

// 2d. A pointer naming a Leg this pass did NOT reserve an identity for
//     (already identified, or unrelated) passes through unchanged — never
//     silently reassigned.
$rewrittenUnrelated = $rewrite->invoke($controller, ['headline_leg_id' => 'CZTL999'], $reservations);
assertSameValue('CZTL999', $rewrittenUnrelated['headline_leg_id'], 'a pointer not matching this reservation pass is left unchanged, never reassigned');

// 2e. No reservations at all (nothing newly minted this pass) — pointer
//     passes through unchanged.
$rewrittenNoReservations = $rewrite->invoke($controller, ['headline_leg_id' => 'draft_leg_a'], []);
assertSameValue('draft_leg_a', $rewrittenNoReservations['headline_leg_id'], 'no reservations this pass -> pointer unchanged');

echo "Headline Leg pointer contract: PASS\n";
