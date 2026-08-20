<?php

declare(strict_types=1);

/**
 * Regression lock for CommercialLegsMigration
 * (src/Modules/SurfacePackages/Support/CommercialLegsMigration.php) — shared
 * by tools/migrate-commercial-legs.php (CLI) and PackageStationController's
 * admin-triggered preview/apply routes behind the Commercial Legs Migration
 * popup. Same legacy-synthesis condition
 * PackageSchema::synthesizeFirstCommercialLeg() already enforces on every
 * read/settle (Phase 3), reused here directly so neither caller can drift
 * from it: only commercial_legs: [] + a real, recognised billing_cycle is
 * migrated; selections with no billing_cycle, or a genuinely fresh record,
 * are left alone. See docs/code-map/tier-pricing-rules-plan.md.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\CommercialLegsMigration;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_legs_migration(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: commercial legs migration: {$message}\n");
        exit(1);
    }
}

// ── 1. A real billing_cycle with no legs yet migrates ───────────────────────

$monthly = [
    'label' => 'Starter', 'billing_cycle' => 'monthly', 'commercial_legs' => [],
    'rate_sheet_items' => [['item_id' => 'rate_a', 'quantity' => 2, 'price_option_id' => 'opt_x']],
];
$verdict = CommercialLegsMigration::decision($monthly);
check_legs_migration($verdict['decision'] === 'migrate', 'a stored billing_cycle with no legs migrates');
check_legs_migration(count($verdict['result']['commercial_legs']) === 1, 'exactly one leg is synthesized');
$leg = $verdict['result']['commercial_legs'][0];
check_legs_migration($leg['payment_category'] === 'recurring' && $leg['billing_cycle'] === 'monthly', 'monthly derives to recurring/monthly');
check_legs_migration($leg['start_month'] === 1 && $leg['end_month'] === null, 'no commitment_enabled stored -> Indefinite');
check_legs_migration(
    $verdict['result']['rate_sheet_items'] === [[
        'item_id' => 'rate_a', 'quantity' => 2, 'price_option_id' => 'opt_x',
        'leg_assignments' => [['leg_id' => $leg['id'], 'price_option_id' => 'opt_x', 'quantity' => 2]],
    ]],
    'the existing selection\'s own price_option_id/quantity survive exactly, backfilled onto the synthesized leg — no duplicate pricing',
);

// ── 2. Cross-check: identical to what the live on-read synthesis produces ───
// The migration must never drift from PackageSchema's own derivation — both
// are driven by the SAME synthesizeFirstCommercialLeg() call.

$liveRead = Schema::normaliseTierSlot([
    'current_occupant' => array_merge($monthly, [
        'id' => 'occ_x', 'cz_platform_id' => '', 'addon_platform_id' => '', 'platform_status' => 'active',
        'is_addon' => false, 'ideal_for' => '', 'price' => null, 'contact' => false,
        'rate_sheet_id' => 'rs_a', 'inclusions_override' => [], 'features' => [], 'faq_refs' => [],
    ]),
    'history' => [],
]);
check_legs_migration(
    $liveRead['commercial_legs'][0]['payment_category'] === $leg['payment_category']
        && $liveRead['commercial_legs'][0]['billing_cycle'] === $leg['billing_cycle']
        && $liveRead['commercial_legs'][0]['start_month'] === $leg['start_month']
        && $liveRead['commercial_legs'][0]['end_month'] === $leg['end_month'],
    'the migration\'s synthesized leg is byte-identical to what a live read would already derive',
);
check_legs_migration(
    $liveRead['rate_sheet_items'] === $verdict['result']['rate_sheet_items'],
    'the migration\'s backfilled selections are byte-identical to what a live read would already derive',
);

// ── 3. A real commitment bounds the migrated leg's end_month ────────────────

$committed = [
    'billing_cycle' => 'annually', 'commercial_legs' => [], 'rate_sheet_items' => [],
    'commitment_enabled' => true, 'minimum_term_value' => 2, 'minimum_term_unit' => 'year',
];
$committedVerdict = CommercialLegsMigration::decision($committed);
check_legs_migration($committedVerdict['decision'] === 'migrate', 'annually + a real commitment migrates');
$committedLeg = $committedVerdict['result']['commercial_legs'][0];
check_legs_migration(
    $committedLeg['payment_category'] === 'recurring' && $committedLeg['billing_cycle'] === 'yearly' && $committedLeg['end_month'] === 24,
    'a 2-year commitment converts to a 24-month bound on the synthesized leg',
);

// ── 4. commitment_enabled false ignores a stale minimum_term_value ──────────

$staleCommitment = [
    'billing_cycle' => 'monthly', 'commercial_legs' => [], 'rate_sheet_items' => [],
    'commitment_enabled' => false, 'minimum_term_value' => 6, 'minimum_term_unit' => 'month',
];
$staleVerdict = CommercialLegsMigration::decision($staleCommitment);
check_legs_migration(
    $staleVerdict['result']['commercial_legs'][0]['end_month'] === null,
    'commitment_enabled false ignores a stored minimum_term_value — Indefinite, not bounded to 6 months',
);

// ── 5. Skip cases — never fabricated ─────────────────────────────────────────

check_legs_migration(
    CommercialLegsMigration::decision(['billing_cycle' => 'monthly', 'commercial_legs' => [['id' => 'leg_x', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => null]]])['decision'] === 'skip',
    'a record that already has a leg is skipped, never re-synthesized or duplicated',
);
check_legs_migration(
    CommercialLegsMigration::decision(['billing_cycle' => null, 'commercial_legs' => [], 'rate_sheet_items' => []])['decision'] === 'skip',
    'a genuinely fresh record (no billing_cycle, no selections) is skipped',
);
check_legs_migration(
    CommercialLegsMigration::decision(['billing_cycle' => null, 'commercial_legs' => [], 'rate_sheet_items' => [['item_id' => 'rate_a', 'quantity' => 1]]])['decision'] === 'skip',
    'selections with no billing_cycle are skipped — Rate Sheet rows are never used to fabricate Payment Category/Billing Cycle',
);
check_legs_migration(
    CommercialLegsMigration::decision(['billing_cycle' => 'weekly', 'commercial_legs' => [], 'rate_sheet_items' => []])['decision'] === 'skip',
    'an unrecognised legacy billing_cycle value is skipped, not guessed at',
);

// ── 6. The same decision function works identically for an Edition row ─────

$editionRecord = [
    'title' => 'Annual Plan', 'billing_cycle' => 'one-time', 'commercial_legs' => [],
    'rate_sheet_items' => [['item_id' => 'rate_setup', 'quantity' => 1]],
];
$editionVerdict = CommercialLegsMigration::decision($editionRecord);
check_legs_migration($editionVerdict['decision'] === 'migrate', 'an Edition row with a real billing_cycle migrates through the same decision function');
check_legs_migration(
    $editionVerdict['result']['commercial_legs'][0]['payment_category'] === 'one-time'
        && $editionVerdict['result']['commercial_legs'][0]['billing_cycle'] === 'upfront',
    'one-time derives to one-time/upfront for an Edition exactly as it does for the occupant',
);

// ── 7. plan() walks a whole station: occupants, Editions, and every skip ───
// reason — the shape the admin popup's preview and the CLI's dry-run both
// read. Also proves occupant_bin[]/tier_edition_bin[] are never reached: the
// fixture station carries none, and a record already migrated (leg_x below)
// is confirmed to be skipped rather than re-synthesized.

$station = [
    'tier_instances' => [
        [
            'tier_instance_id' => 'ti_a',
            'tiers' => [
                'basic' => [
                    'current_occupant' => array_merge($monthly, [
                        'id' => 'occ_a',
                        'tier_editions' => [
                            $editionRecord,
                            ['title' => 'Already Migrated', 'billing_cycle' => 'monthly', 'commercial_legs' => [
                                ['id' => 'leg_x', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => null],
                            ]],
                        ],
                    ]),
                ],
                'standard' => [
                    'current_occupant' => [
                        'id' => 'occ_b', 'label' => 'Nothing configured', 'billing_cycle' => null,
                        'commercial_legs' => [], 'rate_sheet_items' => [],
                    ],
                ],
            ],
        ],
    ],
];
$plan = CommercialLegsMigration::plan($station);
check_legs_migration(count($plan) === 4, 'plan() walks 2 occupants + 2 Editions from the fixture station (4 rows)');

$occupantRows = array_values(array_filter($plan, static fn (array $row): bool => $row['scope'] === 'occupant'));
$editionRows  = array_values(array_filter($plan, static fn (array $row): bool => $row['scope'] === 'edition'));
check_legs_migration(count($occupantRows) === 2 && count($editionRows) === 2, 'plan() tags each row with its own scope (occupant vs edition)');
check_legs_migration(
    $occupantRows[0]['decision'] === 'migrate' && $occupantRows[0]['instance_id'] === 'ti_a' && $occupantRows[0]['tier_id'] === 'basic',
    'the occupant with a real billing_cycle migrates, addressed by its own instance/tier',
);
check_legs_migration(
    $occupantRows[1]['decision'] === 'skip' && $occupantRows[1]['reason'] === 'nothing configured yet',
    'the occupant with nothing configured is skipped, not fabricated from having zero legs alone',
);
check_legs_migration(
    $editionRows[0]['decision'] === 'migrate' && $editionRows[0]['tier_id'] === 'basic',
    'the Edition with a real billing_cycle migrates, addressed by the same occupant slot',
);
check_legs_migration(
    $editionRows[1]['decision'] === 'skip' && $editionRows[1]['reason'] === 'already has a leg',
    'the already-migrated Edition is skipped, never re-synthesized or duplicated',
);

// ── 8. summarize() aggregates plan() into the one stats shape both the ─────
// preview and apply routes (and the CLI) report.

$stats = CommercialLegsMigration::summarize($plan);
check_legs_migration(
    $stats === ['occupants_migrated' => 1, 'occupants_skipped' => 1, 'editions_migrated' => 1, 'editions_skipped' => 1],
    'summarize() counts each scope/decision pair from the fixture plan exactly',
);

// ── 9. applyPlan() persists only the 'migrate' rows, leaving 'skip' rows ───
// byte-untouched, and never touches a record outside the plan's own
// addressing.

$applied = CommercialLegsMigration::applyPlan($station, $plan);
check_legs_migration(
    $applied['tier_instances'][0]['tiers']['basic']['current_occupant']['commercial_legs'] !== [],
    'applyPlan() writes the synthesized leg onto the migrated occupant',
);
check_legs_migration(
    $applied['tier_instances'][0]['tiers']['basic']['current_occupant']['tier_editions'][0]['commercial_legs'] !== [],
    'applyPlan() writes the synthesized leg onto the migrated Edition',
);
check_legs_migration(
    $applied['tier_instances'][0]['tiers']['basic']['current_occupant']['tier_editions'][1]['commercial_legs'] === [
        ['id' => 'leg_x', 'payment_category' => 'recurring', 'billing_cycle' => 'monthly', 'start_month' => 1, 'end_month' => null],
    ],
    'applyPlan() leaves the already-migrated Edition byte-untouched',
);
check_legs_migration(
    $applied['tier_instances'][0]['tiers']['standard']['current_occupant']['commercial_legs'] === [],
    'applyPlan() leaves the not-configured occupant byte-untouched — never fabricated',
);

echo "Commercial legs migration checks passed.\n";
