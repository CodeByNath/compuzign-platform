<?php

declare(strict_types=1);

/*
 * Commercial-leg schedule contract (Tier Pricing Rules — see
 * docs/code-map/tier-pricing-rules-plan.md). A Tier occupant/Edition may
 * declare `commercial_legs` (each a scheduled application of one Payment
 * Category + Commercial Leg Billing Cycle across an inclusive month range)
 * and, independently, a `commitment_enabled` commitment
 * (minimum_term_value/unit). Commitment and Legs are separate concerns:
 * Commitment only conditions Commitment Unit/Minimum Commitment and, when
 * enabled, bounds a leg's end_month; it never gates whether Commercial Legs
 * are usable. With no commitment (or commitment_enabled false regardless of
 * any stored minimum_term_value), a leg's end_month may be omitted
 * (Indefinite). An existing inclusion attaches to one or more legs via
 * `leg_assignments` on its own TierRateSheetSelection row — never a second
 * row, never a duplicate inclusion. This file exercises PackageSchema's
 * sanitize/settle layer only; price resolution and public projection are a
 * later phase.
 *
 * Simple Mode boundary under test (Phase 1 of the mandatory-leg rollout —
 * legacy on-read synthesis and the fresh-creation leg requirement are a
 * later phase, not yet active here): a record with no commercial_legs is not
 * merely "one implicit leg" — it carries no leg concept at all, and its
 * legacy billing_cycle/price_option_id stay exactly as they were before this
 * capability existed. No synthetic leg is ever fabricated at read time.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_commercial_schedule(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Commercial schedule: ' . $message);
    }
}

// ── TIER_MODULES gains the new module for free ──────────────────────────────

check_commercial_schedule(
    in_array('commercial_schedule', Schema::TIER_MODULES, true),
    'commercial_schedule is a registered Tier module',
);
$lifecycle = Schema::emptyTierLifecycle();
check_commercial_schedule(
    array_key_exists('commercial_schedule', $lifecycle['drafts']) && $lifecycle['drafts']['commercial_schedule'] === null,
    'a fresh lifecycle layer carries a null commercial_schedule draft slot',
);
check_commercial_schedule(
    ($lifecycle['module_status']['commercial_schedule'] ?? null) === 'not-configured',
    'a fresh lifecycle layer defaults commercial_schedule to not-configured',
);

// ── Commercial Leg vocabulary — fixed, independent of active_billing_cycles ─

check_commercial_schedule(Schema::PAYMENT_CATEGORIES === ['one-time', 'recurring'], 'PAYMENT_CATEGORIES is the confirmed closed vocabulary');
check_commercial_schedule(Schema::COMMERCIAL_LEG_BILLING_CYCLES === ['upfront', 'monthly', 'yearly'], 'COMMERCIAL_LEG_BILLING_CYCLES is the confirmed closed vocabulary');

// ── Module-save route regex fix (PackageStationController.php) ──────────────
// The real route-registration proof (actual registerRoutes() call, captured
// route strings) lives in tests/tier-capability-invariants.php. This is just
// the character-class semantics that made 'commercial_schedule' unreachable
// in the first place: `[a-z]+` excludes `_`, `[a-z_]+` accepts it.

check_commercial_schedule(preg_match('/^[a-z]+$/', 'commercial_schedule') === 0, 'the OLD module route character class did not match commercial_schedule — this was the real routing bug');
check_commercial_schedule(preg_match('/^[a-z_]+$/', 'commercial_schedule') === 1, 'the FIXED module route character class matches commercial_schedule');

// ── A never-configured occupant carries no commercial schedule ──────────────

$bare = Schema::upsertOccupant([], ['label' => 'Starter', 'billing_cycle' => 'monthly'], true);
check_commercial_schedule($bare['current_occupant']['active_billing_cycles'] === [], 'a never-configured occupant defaults active_billing_cycles to []');
check_commercial_schedule($bare['current_occupant']['commercial_legs'] === [], 'a never-configured occupant defaults commercial_legs to []');
check_commercial_schedule($bare['current_occupant']['commitment_enabled'] === false, 'a never-configured occupant defaults commitment_enabled to false');
check_commercial_schedule(
    Schema::normaliseTierSlot($bare)['active_billing_cycles'] === [] && Schema::normaliseTierSlot($bare)['commercial_legs'] === [],
    'the admin read model carries no fabricated leg for a Simple Mode occupant',
);

// ── sanitizeActiveBillingCycles(): closed vocabulary, deduped, order-preserved ─
// Unchanged — active_billing_cycles is the legacy scalar's own back-compat
// field now, no longer a leg-validation gate (see sanitizeCommercialLegs()).

check_commercial_schedule(
    Schema::sanitizeActiveBillingCycles(['monthly', 'bogus', 'monthly', 'annually']) === ['monthly', 'annually'],
    'active cycles are filtered to the closed vocabulary, deduped, and order-preserved',
);
check_commercial_schedule(Schema::sanitizeActiveBillingCycles('not-an-array') === [], 'a non-array input sanitises to []');

// ── sanitizeCommercialLegs(): the leg validation invariants ─────────────────

$validLegs = Schema::sanitizeCommercialLegs([
    ['id' => 'leg_a', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 1, 'end_month' => 24],
    ['id' => 'leg_b', 'payment_category' => 'recurring', 'billing_cycle' => 'yearly', 'start_month' => 25, 'end_month' => 48],
], 48.0);
check_commercial_schedule(count($validLegs) === 2, 'two legs within the 48-month commitment both survive');
check_commercial_schedule(
    $validLegs[0] === ['id' => 'leg_a', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 1, 'end_month' => 24],
    'leg A round-trips exactly',
);
check_commercial_schedule(
    $validLegs[1] === ['id' => 'leg_b', 'payment_category' => 'recurring', 'billing_cycle' => 'yearly', 'start_month' => 25, 'end_month' => 48],
    'leg B round-trips exactly',
);

check_commercial_schedule(
    Schema::sanitizeCommercialLegs([['id' => 'leg_x', 'payment_category' => 'recurring', 'billing_cycle' => 'weekly', 'start_month' => 1, 'end_month' => 12]], 48.0) === [],
    'a leg naming a cycle outside the fixed Commercial Leg Billing Cycle vocabulary is dropped, not fabricated into it',
);
check_commercial_schedule(
    Schema::sanitizeCommercialLegs([['id' => 'leg_x', 'payment_category' => 'subscription', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => 12]], 48.0) === [],
    'a leg naming a Payment Category outside PAYMENT_CATEGORIES is dropped',
);
check_commercial_schedule(
    Schema::sanitizeCommercialLegs([['id' => 'leg_x', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 24, 'end_month' => 1]], 48.0) === [],
    'a leg with end_month before start_month is dropped',
);
check_commercial_schedule(
    Schema::sanitizeCommercialLegs([['id' => 'leg_x', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 0, 'end_month' => 12]], 48.0) === [],
    'a leg with a zero/negative start_month is dropped — months are 1-based',
);
check_commercial_schedule(
    Schema::sanitizeCommercialLegs([['id' => 'leg_x', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 40, 'end_month' => 60]], 48.0) === [],
    'a leg whose end_month exceeds the declared 48-month commitment is dropped — the commitment bound is enforced, never silently clamped',
);
check_commercial_schedule(
    count(Schema::sanitizeCommercialLegs([['id' => 'leg_x', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 40, 'end_month' => 60]], null)) === 1,
    'with no commitment, a leg has no commitment bound to violate (still capped by the absolute sanity ceiling only)',
);
check_commercial_schedule(
    Schema::sanitizeCommercialLegs([['id' => '', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 1, 'end_month' => 12]], 48.0) === [],
    'a leg with no id is unrecoverable and dropped, never fabricated — the same posture sanitizeTierEdition() uses',
);
check_commercial_schedule(
    Schema::sanitizeCommercialLegs([
        ['id' => 'leg_dup', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 1, 'end_month' => 12],
        ['id' => 'leg_dup', 'payment_category' => 'recurring', 'billing_cycle' => 'yearly', 'start_month' => 13, 'end_month' => 24],
    ], 48.0)[0]['billing_cycle'] === 'upfront',
    'a duplicate leg id keeps the first occurrence, mirroring sanitizeTierEditions()',
);

// Indefinite (null end_month) — valid with no commitment, invalid under a real one.
check_commercial_schedule(
    count(Schema::sanitizeCommercialLegs([['id' => 'leg_indef', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 13]], null)) === 1,
    'a leg with no end_month (Indefinite) is valid when there is no commitment',
);
check_commercial_schedule(
    Schema::sanitizeCommercialLegs([['id' => 'leg_indef', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 13]], 48.0) === [],
    'a leg with no end_month is dropped under a real commitment — a leg under a real commitment must state where it ends',
);

$mintedId = Schema::mintCommercialLegId();
check_commercial_schedule(str_starts_with($mintedId, 'leg_') && strlen($mintedId) === 12, 'mintCommercialLegId() mints a plain local id, not a Platform ID');
check_commercial_schedule(
    Schema::sanitizeCommercialLegs([['id' => $mintedId, 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 1, 'end_month' => 1]], 48.0)[0]['id'] === $mintedId,
    'a freshly-minted leg id survives sanitize unchanged — ids are never re-minted on re-sanitize',
);

// ── leg_assignments on an inclusion selection ────────────────────────────────

$legs = $validLegs; // leg_a: upfront 1-24, leg_b: yearly 25-48

$selections = Schema::sanitizeTierRateSheetSelections([
    [
        'item_id' => 'rate_foundation', 'quantity' => 1, 'price_option_id' => null,
        'leg_assignments' => [
            ['leg_id' => 'leg_a', 'price_option_id' => 'opt_upfront', 'quantity' => 2],
            ['leg_id' => 'leg_b', 'price_option_id' => 'opt_annual'],
            ['leg_id' => 'leg_unknown', 'price_option_id' => 'opt_ghost'],
        ],
    ],
], $legs);
check_commercial_schedule(
    $selections[0]['leg_assignments'] === [
        ['leg_id' => 'leg_a', 'price_option_id' => 'opt_upfront', 'quantity' => 2],
        ['leg_id' => 'leg_b', 'price_option_id' => 'opt_annual', 'quantity' => 1],
    ],
    'an inclusion attaches to two different legs, each with its own Price Option selection and quantity (default 1 when omitted); an unknown leg_id is dropped, never fabricated',
);
check_commercial_schedule(
    $selections[0]['item_id'] === 'rate_foundation' && count($selections) === 1,
    'the inclusion keeps exactly one identity/row — multi-leg participation never duplicates it',
);

check_commercial_schedule(
    !array_key_exists('leg_assignments', Schema::sanitizeTierRateSheetSelections([['item_id' => 'rate_x', 'quantity' => 1, 'leg_assignments' => [['leg_id' => 'leg_a', 'price_option_id' => null]]]])[0]),
    'a call site that omits $legs (every pre-existing caller) omits the leg_assignments key entirely — Simple Mode\'s exact pre-existing shape is unaffected by this parameter existing',
);

// Same inclusion + same cycle + overlapping coverage is a double-charge shape and is rejected.
$overlappingSameCycleLegs = Schema::sanitizeCommercialLegs([
    ['id' => 'leg_m1', 'payment_category' => 'recurring', 'billing_cycle' => 'yearly', 'start_month' => 1, 'end_month' => 24],
    ['id' => 'leg_m2', 'payment_category' => 'recurring', 'billing_cycle' => 'yearly', 'start_month' => 12, 'end_month' => 36],
], 48.0);
$overlapSelections = Schema::sanitizeTierRateSheetSelections([
    [
        'item_id' => 'rate_hosting', 'quantity' => 1,
        'leg_assignments' => [
            ['leg_id' => 'leg_m1', 'price_option_id' => 'opt_a'],
            ['leg_id' => 'leg_m2', 'price_option_id' => 'opt_b'],
        ],
    ],
], $overlappingSameCycleLegs);
check_commercial_schedule(
    count($overlapSelections[0]['leg_assignments']) === 1 && $overlapSelections[0]['leg_assignments'][0]['leg_id'] === 'leg_m1',
    'two assignments on the same inclusion naming the same billing cycle with overlapping months: the later one is dropped, never double-booked',
);

// An Indefinite leg's overlap range must be treated as unbounded, never as
// ending at month 0 (a null-to-int coercion bug caught while adding
// Indefinite support) — proven by a second same-cycle leg starting well
// after leg_indef's own start still correctly overlapping it.
$indefiniteOverlapLegs = Schema::sanitizeCommercialLegs([
    ['id' => 'leg_indef', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1],
    ['id' => 'leg_after', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 100, 'end_month' => 120],
], null);
$indefiniteOverlapSelections = Schema::sanitizeTierRateSheetSelections([
    [
        'item_id' => 'rate_hosting', 'quantity' => 1,
        'leg_assignments' => [
            ['leg_id' => 'leg_indef', 'price_option_id' => 'opt_a'],
            ['leg_id' => 'leg_after', 'price_option_id' => 'opt_b'],
        ],
    ],
], $indefiniteOverlapLegs);
check_commercial_schedule(
    count($indefiniteOverlapSelections[0]['leg_assignments']) === 1 && $indefiniteOverlapSelections[0]['leg_assignments'][0]['leg_id'] === 'leg_indef',
    'an Indefinite leg (null end_month) correctly overlaps a later same-cycle leg rather than being treated as ending at month 0',
);

// Same inclusion + different cycles + overlapping coverage is a normal shape (e.g. a
// one-time setup fee alongside a monthly/annual service spanning the same months).
$differentCycleLegs = Schema::sanitizeCommercialLegs([
    ['id' => 'leg_setup', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 1, 'end_month' => 1],
    ['id' => 'leg_service', 'payment_category' => 'recurring', 'billing_cycle' => 'yearly', 'start_month' => 1, 'end_month' => 48],
], 48.0);
$differentCycleSelections = Schema::sanitizeTierRateSheetSelections([
    [
        'item_id' => 'rate_hosting', 'quantity' => 1,
        'leg_assignments' => [
            ['leg_id' => 'leg_setup', 'price_option_id' => 'opt_setup'],
            ['leg_id' => 'leg_service', 'price_option_id' => 'opt_service'],
        ],
    ],
], $differentCycleLegs);
check_commercial_schedule(
    count($differentCycleSelections[0]['leg_assignments']) === 2,
    'the same inclusion overlapping across two DIFFERENT cycles is never rejected',
);

// ── Overview settle: active_billing_cycles is draft-preferred like billing_cycle ─

$drafted = Schema::ensureTierLifecycle($bare);
$drafted['drafts']['overview'] = [
    'label' => 'Professional', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'annually', 'minimum_term_value' => 48, 'minimum_term_unit' => 'month',
    'commitment_enabled' => true,
    'active_billing_cycles' => ['one-time', 'annually'],
];
$settled = Schema::settleTierSlot($drafted);
check_commercial_schedule(
    $settled['current_occupant']['active_billing_cycles'] === ['one-time', 'annually'],
    'Overview settle commits the draft-preferred active_billing_cycles set',
);
check_commercial_schedule($settled['current_occupant']['commitment_enabled'] === true, 'Overview settle commits the draft-preferred commitment_enabled flag');

// ── Commercial Schedule module settle: its own module, own draft-preferred merge ─

$csDrafted = Schema::ensureTierLifecycle($settled);
$csDrafted['drafts']['commercial_schedule'] = [
    'commercial_legs' => [
        ['id' => 'leg_a', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 1, 'end_month' => 24],
        ['id' => 'leg_b', 'payment_category' => 'recurring', 'billing_cycle' => 'yearly', 'start_month' => 25, 'end_month' => 48],
    ],
];
$csSettled = Schema::settleTierSlot($csDrafted);
check_commercial_schedule(
    count($csSettled['current_occupant']['commercial_legs']) === 2,
    'the Commercial Schedule module settles its own draft into commercial_legs independently of the Overview module',
);
check_commercial_schedule(
    $csSettled['current_occupant']['active_billing_cycles'] === ['one-time', 'annually'],
    'settling the Commercial Schedule module leaves the already-settled Overview module (active_billing_cycles) untouched',
);

// Omitting the module draft preserves the settled value, exactly like every other module.
$csOmitted = Schema::ensureTierLifecycle($csSettled);
$csOmittedResult = Schema::settleTierSlot($csOmitted);
check_commercial_schedule(
    count($csOmittedResult['current_occupant']['commercial_legs']) === 2,
    'settling with no pending commercial_schedule draft preserves the previously-settled legs',
);

// An explicit empty array in the draft (administrator removing every leg) is honoured.
$csCleared = Schema::ensureTierLifecycle($csOmittedResult);
$csCleared['drafts']['commercial_schedule'] = ['commercial_legs' => []];
$csClearedResult = Schema::settleTierSlot($csCleared);
check_commercial_schedule(
    $csClearedResult['current_occupant']['commercial_legs'] === [],
    'an explicit empty array in the draft clears previously-configured legs back to Simple Mode (Phase 1: mandatory-leg enforcement is a later phase, not yet active here)',
);

// ── Shortening the commitment re-validates existing legs on next settle ─────

$longCommitment = Schema::ensureTierLifecycle($settled);
$longCommitment['drafts']['commercial_schedule'] = [
    'commercial_legs' => [
        ['id' => 'leg_a', 'payment_category' => 'one-time', 'billing_cycle' => 'upfront', 'start_month' => 1, 'end_month' => 24],
        ['id' => 'leg_b', 'payment_category' => 'recurring', 'billing_cycle' => 'yearly', 'start_month' => 25, 'end_month' => 48],
    ],
];
$withLegs = Schema::settleTierSlot($longCommitment);
check_commercial_schedule(count($withLegs['current_occupant']['commercial_legs']) === 2, 'setup: both legs settled under the original 48-month commitment');

$shortened = Schema::ensureTierLifecycle($withLegs);
$shortened['drafts']['overview'] = [
    'label' => 'Professional', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'annually', 'minimum_term_value' => 24, 'minimum_term_unit' => 'month',
    'commitment_enabled' => true,
    'active_billing_cycles' => ['one-time', 'annually'],
];
$afterShortening = Schema::settleTierSlot($shortened);
check_commercial_schedule(
    count($afterShortening['current_occupant']['commercial_legs']) === 1
        && $afterShortening['current_occupant']['commercial_legs'][0]['id'] === 'leg_a',
    'shortening the commitment to 24 months drops leg B (months 25-48) on the very next settle — an automatic bounds re-check, not a silent orphan',
);

// ── commitment_enabled decouples the stored commitment from leg bounding ────
// Tier Commitment = No means no commitment term applies to legs, even if a
// stale minimum_term_value/unit is still sitting in storage from when
// Commitment was previously Yes — Commitment and Legs are independent
// concerns, never nested. See docs/code-map/tier-pricing-rules-plan.md.

$staleCommitment = Schema::ensureTierLifecycle($bare);
$staleCommitment['drafts']['overview'] = [
    'label' => 'Starter', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'monthly', 'minimum_term_value' => 6, 'minimum_term_unit' => 'month',
    'commitment_enabled' => false,
];
$staleCommitment['drafts']['commercial_schedule'] = [
    'commercial_legs' => [
        ['id' => 'leg_indef', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1],
        ['id' => 'leg_over',  'payment_category' => 'recurring', 'billing_cycle' => 'yearly',   'start_month' => 2, 'end_month' => 200],
    ],
];
$staleSettled = Schema::settleTierSlot($staleCommitment);
check_commercial_schedule(
    $staleSettled['current_occupant']['commitment_enabled'] === false
        && $staleSettled['current_occupant']['minimum_term_value'] === 6.0,
    'commitment_enabled persists as false independently of a stored minimum_term_value — the two are separate fields, neither implies the other',
);
check_commercial_schedule(
    count($staleSettled['current_occupant']['commercial_legs']) === 2,
    'with commitment_enabled false, both an Indefinite leg and a leg extending to month 200 survive — the stored minimum_term_value=6 never bounds them',
);

// ── draftPreferredCommercialLegs(): Features' own cross-module lookup ───────

check_commercial_schedule(
    count(Schema::draftPreferredCommercialLegs($withLegs)) === 2,
    'draftPreferredCommercialLegs() reads the settled occupant\'s legs once no pending Commercial Schedule draft exists',
);

$pendingLegsSlot = Schema::ensureTierLifecycle($bare);
$pendingLegsSlot['drafts']['overview'] = [
    'label' => 'Starter', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'monthly', 'minimum_term_value' => 12, 'minimum_term_unit' => 'month',
    'commitment_enabled' => true,
    'active_billing_cycles' => ['monthly'],
];
$pendingLegsSlot['drafts']['commercial_schedule'] = [
    'commercial_legs' => [['id' => 'leg_pending', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => 12]],
];
$pendingLegs = Schema::draftPreferredCommercialLegs($pendingLegsSlot);
check_commercial_schedule(
    count($pendingLegs) === 1 && $pendingLegs[0]['id'] === 'leg_pending',
    'draftPreferredCommercialLegs() sees a leg that exists only in a not-yet-settled Commercial Schedule draft — declare legs, then assign inclusions to them, both before Publish',
);

// ── sanitizeCommercialLegsForSlot(): Commercial Schedule's own draft-save ───
// Commercial Legs are usable independent of Commitment/Overview ever being
// configured — the correction locked into docs/code-map/tier-pricing-rules-plan.md.

$freshSlot = Schema::ensureTierLifecycle($bare);
check_commercial_schedule(
    count(Schema::sanitizeCommercialLegsForSlot($freshSlot, [
        ['id' => 'leg_x', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => 6],
    ])) === 1,
    'a leg with a valid Payment Category/Billing Cycle validates immediately on a fresh slot with no Overview draft at all — Commercial Legs never depend on Overview/Commitment being configured first',
);
check_commercial_schedule(
    Schema::sanitizeCommercialLegsForSlot($freshSlot, [
        ['id' => 'leg_x', 'payment_category' => 'recurring', 'billing_cycle' => 'weekly', 'start_month' => 1, 'end_month' => 6],
    ]) === [],
    'a leg naming a cycle outside the fixed Commercial Leg Billing Cycle vocabulary is still dropped',
);
check_commercial_schedule(
    count(Schema::sanitizeCommercialLegsForSlot($freshSlot, [
        ['id' => 'leg_indefinite', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1],
    ])) === 1,
    'with no commitment enabled anywhere in the slot, a leg with no end_month (Indefinite) is valid',
);

$committedSlot = Schema::ensureTierLifecycle($bare);
$committedSlot['drafts']['overview'] = [
    'label' => 'Starter', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'monthly', 'minimum_term_value' => 6, 'minimum_term_unit' => 'month',
    'commitment_enabled' => true,
];
check_commercial_schedule(
    Schema::sanitizeCommercialLegsForSlot($committedSlot, [
        ['id' => 'leg_over', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => 12],
    ]) === [],
    'once Overview\'s own pending draft enables a 6-month commitment, a leg extending to month 12 is dropped immediately at draft-save time — Overview may be saved first, in either order',
);
check_commercial_schedule(
    Schema::sanitizeCommercialLegsForSlot($committedSlot, [
        ['id' => 'leg_indefinite', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1],
    ]) === [],
    'once a real commitment is enabled, a leg may not be Indefinite — it must state an end_month within the bound',
);
check_commercial_schedule(
    count(Schema::sanitizeCommercialLegsForSlot($committedSlot, [
        ['id' => 'leg_within', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => 6],
    ])) === 1,
    'a leg within the enabled 6-month commitment validates',
);

// ── Backward compatibility: a legacy occupant predating this capability ─────

$legacyOccupant = [
    'current_occupant' => [
        'id' => 'occ_legacy01', 'cz_platform_id' => 'CZT-LEGACY', 'addon_platform_id' => '',
        'platform_status' => 'active', 'is_addon' => false,
        'label' => 'Legacy Tier', 'ideal_for' => '', 'price' => 49.0, 'contact' => false,
        'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rate_sheet_1',
        'rate_sheet_items' => [['item_id' => 'rate_legacy_item', 'quantity' => 1, 'price_option_id' => 'opt_legacy']],
        'inclusions_override' => [], 'features' => [], 'faq_refs' => [],
        // No active_billing_cycles/commercial_legs/commitment_enabled keys at
        // all — Simple Mode, a record stored before this capability existed.
    ],
    'history' => [],
];
$legacyDetail = Schema::normaliseTierSlot($legacyOccupant);
check_commercial_schedule($legacyDetail['active_billing_cycles'] === [], 'a legacy occupant reads active_billing_cycles as [], not an error');
check_commercial_schedule($legacyDetail['commercial_legs'] === [], 'a legacy occupant reads commercial_legs as [], not an error');
check_commercial_schedule($legacyDetail['commitment_enabled'] === false, 'a legacy occupant reads commitment_enabled as false, not an error');
check_commercial_schedule(
    $legacyDetail['billing_cycle'] === 'monthly',
    'Simple Mode\'s own legacy billing_cycle stays fully authoritative and untouched',
);
check_commercial_schedule(
    $legacyDetail['rate_sheet_items'][0]['price_option_id'] === 'opt_legacy'
        && !array_key_exists('leg_assignments', $legacyDetail['rate_sheet_items'][0]),
    'Simple Mode\'s own legacy price_option_id stays authoritative; leg_assignments is absent entirely, never a fabricated single-leg wrapper — the exact pre-existing { item_id, quantity, price_option_id } shape',
);

// ── Phase 1 flat (pre-occupant) format never fabricates a schedule ──────────

$flatTier = [
    'label' => 'Flat Legacy', 'billing_cycle' => 'monthly', 'inclusions_override' => [],
    'features' => [], 'faq_refs' => [], 'enabled' => true,
];
check_commercial_schedule(
    Schema::normaliseTierSlot($flatTier)['active_billing_cycles'] === [] && Schema::normaliseTierSlot($flatTier)['commercial_legs'] === [],
    'a Phase 1 flat tier slot (predating occupants entirely) carries no commercial schedule',
);
check_commercial_schedule(Schema::normaliseTierSlot($flatTier)['commitment_enabled'] === false, 'a Phase 1 flat tier slot defaults commitment_enabled to false');

// ── Tier Edition: same shape, fully independent of the parent occupant's ────

$editions = [];
['tier_editions' => $editions, 'edition' => $edition] = Schema::addTierEdition($editions, [
    'title' => 'Annual Plan', 'billing_cycle' => 'annually',
]);
check_commercial_schedule($edition['active_billing_cycles'] === [] && $edition['commercial_legs'] === [], 'a newly-created Edition starts in Simple Mode, same as a fresh occupant');
check_commercial_schedule($edition['commitment_enabled'] === false, 'a newly-created Edition defaults commitment_enabled to false');

$editionId = $edition['id'];
$editions = Schema::saveTierEditionDraft($editions, $editionId, [
    'title' => 'Annual Plan', 'billing_cycle' => 'annually',
    'minimum_term_value' => 12, 'minimum_term_unit' => 'month',
    'commitment_enabled' => true,
    'active_billing_cycles' => ['monthly', 'one-time'],
    'commercial_legs' => [
        ['id' => 'leg_e1', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => 12],
    ],
]);
$editions = Schema::settleTierEditionOverview($editions, $editionId);
$settledEdition = Schema::findTierEdition($editions, $editionId);
check_commercial_schedule(
    $settledEdition['active_billing_cycles'] === ['monthly', 'one-time'],
    'an Edition settles its own active_billing_cycles independently of the parent occupant',
);
check_commercial_schedule($settledEdition['commitment_enabled'] === true, 'an Edition settles its own commitment_enabled independently of the parent occupant');
check_commercial_schedule(
    count($settledEdition['commercial_legs']) === 1 && $settledEdition['commercial_legs'][0]['id'] === 'leg_e1',
    'an Edition settles its own commercial_legs independently of the parent occupant',
);
check_commercial_schedule(
    $settled['current_occupant']['commercial_legs'] !== $settledEdition['commercial_legs'],
    'the occupant\'s own commercial_legs and its Edition\'s are never blended — each stays its own independent declaration',
);

echo "Commercial schedule checks passed.\n";
