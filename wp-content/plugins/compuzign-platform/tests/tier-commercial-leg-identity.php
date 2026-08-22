<?php

declare(strict_types=1);

/*
 * Commercial Leg identity contract — Phase 1 of the Leg identity model.
 *
 * PackageSchema::sanitizeCommercialLegs() used to be documented as: "array
 * order is its identity" — a Leg had no id of its own, so removing/adding a
 * sibling or changing display order silently reassigned which Leg a stored
 * index pointed at. This contract proves the replacement rule: every Leg now
 * carries its own stable `id`, independent of `sort_order` (its current
 * display position). Moving a Leg changes `sort_order` only — id and
 * billing terms (billing_cycle/from_month/to_month) never change, and
 * output is always read back in `sort_order` order regardless of input
 * array order.
 *
 * Exact scenario from the Leg identity spec:
 *   1 A / 2 B / 3 C / 4 D  --move D to position 2-->  1 A / 2 D / 3 B / 4 C
 * A/B/C/D must keep their own id and their own billing terms; only their
 * sort_order (display position) changes. Proven directly against the
 * sanitizer, then end-to-end through both the Tier occupant's own save path
 * (upsertOccupant) and a Tier Edition's own save path (addTierEdition /
 * saveTierEditionDraft / settleTierEditionOverview) — Phase 1 covers Tier
 * and Edition together since both route through the same sanitizer.
 *
 * Explicitly NOT covered here (later phases, out of scope for Phase 1):
 * CZTL/CZTEL Platform identity, leg_index/leg_assignments inclusion
 * references, pricing, and any migration/backfill.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_leg_identity(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Commercial Leg identity: ' . $message);
    }
}

function fourLegsInput(): array
{
    // Distinct billing terms per leg so any accidental swap is detectable.
    return [
        ['billing_cycle' => 'A-cycle', 'from_month' => 1,  'to_month' => 10],
        ['billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20],
        ['billing_cycle' => 'C-cycle', 'from_month' => 21, 'to_month' => 30],
        ['billing_cycle' => 'D-cycle', 'from_month' => 31, 'to_month' => 40],
    ];
}

function byCycle(array $legs, string $cycle): array
{
    foreach ($legs as $leg) {
        if ($leg['billing_cycle'] === $cycle) { return $leg; }
    }
    throw new RuntimeException("No leg with billing_cycle {$cycle}");
}

// ── 1. First save: every leg mints a fresh, distinct leg_ id, sort_order === input position ──

$firstSave = Schema::sanitizeCommercialLegs(fourLegsInput());
check_leg_identity(count($firstSave) === 4, 'four valid legs survive sanitization');
[$a, $b, $c, $d] = $firstSave;
foreach ([$a, $b, $c, $d] as $leg) {
    check_leg_identity(is_string($leg['id']) && str_starts_with($leg['id'], 'leg_'), 'every leg is minted a leg_ id on first save');
}
check_leg_identity(count(array_unique(array_column($firstSave, 'id'))) === 4, 'all four minted ids are distinct');
check_leg_identity([$a['sort_order'], $b['sort_order'], $c['sort_order'], $d['sort_order']] === [0, 1, 2, 3], 'sort_order defaults to input array position on first save');
check_leg_identity($a['billing_cycle'] === 'A-cycle' && $d['billing_cycle'] === 'D-cycle', 'billing terms pass through unchanged on first save');

// ── 2. The exact move: D (position 4) -> position 2. A/B/C/D keep their ids and terms. ──

$idA = $a['id']; $idB = $b['id']; $idC = $c['id']; $idD = $d['id'];

// Simulates a reorder resave: the same four leg objects (unchanged id and
// billing terms) resubmitted with new sort_order values reflecting the move
// — A stays first; D's sort_order moves from 3 to 1; B and C each shift up
// by one, exactly as the spec's worked example describes. Submission order
// itself is deliberately left as the original array order (id/terms are the
// only things a real caller would still have handy) to prove sort_order,
// not array position, decides the read-back order.
$movedInput = [
    ['id' => $idA, 'billing_cycle' => 'A-cycle', 'from_month' => 1,  'to_month' => 10, 'sort_order' => 0],
    ['id' => $idB, 'billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20, 'sort_order' => 2],
    ['id' => $idC, 'billing_cycle' => 'C-cycle', 'from_month' => 21, 'to_month' => 30, 'sort_order' => 3],
    ['id' => $idD, 'billing_cycle' => 'D-cycle', 'from_month' => 31, 'to_month' => 40, 'sort_order' => 1],
];
$afterMove = Schema::sanitizeCommercialLegs($movedInput);

check_leg_identity(
    array_column($afterMove, 'billing_cycle') === ['A-cycle', 'D-cycle', 'B-cycle', 'C-cycle'],
    'read-back order after the move is A, D, B, C — sorted by sort_order, not by input array order'
);
check_leg_identity(byCycle($afterMove, 'A-cycle')['id'] === $idA, 'A keeps its own id after the move');
check_leg_identity(byCycle($afterMove, 'B-cycle')['id'] === $idB, 'B keeps its own id after the move');
check_leg_identity(byCycle($afterMove, 'C-cycle')['id'] === $idC, 'C keeps its own id after the move');
check_leg_identity(byCycle($afterMove, 'D-cycle')['id'] === $idD, 'D keeps its own id after the move');
check_leg_identity(byCycle($afterMove, 'D-cycle')['from_month'] === 31 && byCycle($afterMove, 'D-cycle')['to_month'] === 40, 'D keeps its own billing terms after the move — not swapped with whatever now sits at its old position');
check_leg_identity(byCycle($afterMove, 'B-cycle')['from_month'] === 11 && byCycle($afterMove, 'C-cycle')['from_month'] === 21, 'B and C keep their own billing terms after shifting position');

// A genuinely new leg (no id) added in the same resave still mints its own fresh id, distinct from A/B/C/D.
$movedInputWithNewLeg = array_merge($movedInput, [
    ['billing_cycle' => 'E-cycle', 'from_month' => 41, 'to_month' => null, 'sort_order' => 4],
]);
$afterMoveWithNew = Schema::sanitizeCommercialLegs($movedInputWithNewLeg);
$newLeg = byCycle($afterMoveWithNew, 'E-cycle');
check_leg_identity(str_starts_with($newLeg['id'], 'leg_') && !in_array($newLeg['id'], [$idA, $idB, $idC, $idD], true), 'a genuinely new leg added alongside a reorder still mints its own distinct id');

// ── 3. Tier occupant end-to-end: upsertOccupant preserves Leg identity across saves ──

$occupantFirstSave = Schema::upsertOccupant([], ['label' => 'Standard', 'legs' => fourLegsInput()], true);
$occupantLegs = $occupantFirstSave['current_occupant']['legs'];
check_leg_identity(count($occupantLegs) === 4, 'occupant upsert sanitizes all four legs');
$occIdA = byCycle($occupantLegs, 'A-cycle')['id'];
$occIdD = byCycle($occupantLegs, 'D-cycle')['id'];

$occupantResave = Schema::upsertOccupant($occupantFirstSave, [
    'label' => 'Standard',
    'legs'  => [
        ['id' => byCycle($occupantLegs, 'A-cycle')['id'], 'billing_cycle' => 'A-cycle', 'from_month' => 1,  'to_month' => 10, 'sort_order' => 0],
        ['id' => byCycle($occupantLegs, 'B-cycle')['id'], 'billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20, 'sort_order' => 2],
        ['id' => byCycle($occupantLegs, 'C-cycle')['id'], 'billing_cycle' => 'C-cycle', 'from_month' => 21, 'to_month' => 30, 'sort_order' => 3],
        ['id' => byCycle($occupantLegs, 'D-cycle')['id'], 'billing_cycle' => 'D-cycle', 'from_month' => 31, 'to_month' => 40, 'sort_order' => 1],
    ],
], true);
$occupantLegsAfterMove = $occupantResave['current_occupant']['legs'];
check_leg_identity(
    array_column($occupantLegsAfterMove, 'billing_cycle') === ['A-cycle', 'D-cycle', 'B-cycle', 'C-cycle'],
    'occupant resave reorders read-back to A, D, B, C'
);
check_leg_identity(byCycle($occupantLegsAfterMove, 'A-cycle')['id'] === $occIdA, 'occupant resave preserves A\'s id across saves');
check_leg_identity(byCycle($occupantLegsAfterMove, 'D-cycle')['id'] === $occIdD, 'occupant resave preserves D\'s id across saves');
check_leg_identity($occupantResave['current_occupant']['label'] === 'Standard', 'reordering legs does not touch unrelated occupant fields');
check_leg_identity($occupantResave['current_occupant']['id'] === $occupantFirstSave['current_occupant']['id'], 'reordering legs does not touch the occupant\'s own stable id');

// ── 4. Tier Edition end-to-end: create -> draft -> settle preserves Leg identity ──

$added = Schema::addTierEdition([], ['title' => 'Annual', 'legs' => fourLegsInput()]);
$editionId = $added['edition']['id'];
$editionLegs = $added['edition']['legs'];
check_leg_identity(count($editionLegs) === 4, 'addTierEdition sanitizes all four legs');
$edIdA = byCycle($editionLegs, 'A-cycle')['id'];
$edIdD = byCycle($editionLegs, 'D-cycle')['id'];

$withDraft = Schema::saveTierEditionDraft($added['tier_editions'], $editionId, [
    'title' => 'Annual',
    'legs'  => [
        ['id' => byCycle($editionLegs, 'A-cycle')['id'], 'billing_cycle' => 'A-cycle', 'from_month' => 1,  'to_month' => 10, 'sort_order' => 0],
        ['id' => byCycle($editionLegs, 'B-cycle')['id'], 'billing_cycle' => 'B-cycle', 'from_month' => 11, 'to_month' => 20, 'sort_order' => 2],
        ['id' => byCycle($editionLegs, 'C-cycle')['id'], 'billing_cycle' => 'C-cycle', 'from_month' => 21, 'to_month' => 30, 'sort_order' => 3],
        ['id' => byCycle($editionLegs, 'D-cycle')['id'], 'billing_cycle' => 'D-cycle', 'from_month' => 31, 'to_month' => 40, 'sort_order' => 1],
    ],
]);
$settled = Schema::settleTierEditionOverview($withDraft, $editionId);
$settledEdition = Schema::findTierEdition($settled, $editionId);
check_leg_identity($settledEdition !== null, 'the settled Edition is still found by its own id');
$editionLegsAfterMove = $settledEdition['legs'];
check_leg_identity(
    array_column($editionLegsAfterMove, 'billing_cycle') === ['A-cycle', 'D-cycle', 'B-cycle', 'C-cycle'],
    'Edition settle reorders read-back to A, D, B, C'
);
check_leg_identity(byCycle($editionLegsAfterMove, 'A-cycle')['id'] === $edIdA, 'Edition settle preserves A\'s id across draft -> settle');
check_leg_identity(byCycle($editionLegsAfterMove, 'D-cycle')['id'] === $edIdD, 'Edition settle preserves D\'s id across draft -> settle');
check_leg_identity($settledEdition['title'] === 'Annual', 'reordering an Edition\'s legs does not touch its own unrelated fields');
check_leg_identity($settledEdition['id'] === $editionId, 'reordering an Edition\'s legs does not touch the Edition\'s own stable id');

echo "Commercial Leg identity contract (Phase 1): PASS\n";
