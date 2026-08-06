<?php

declare(strict_types=1);

/*
 * Phase 4 contract: parent-to-child cascade between a Tier occupant and its
 * Editions.
 *
 * The required rule (from the agreed design): a Tier-level archive/trash/
 * restore may carry eligible LIVE Editions with it, but must record exactly
 * which ids it touched on that same bin entry — never recomputed — so a
 * later trash/restore of that entry only ever revisits the ids it originally
 * carried. An Edition already independently archived or trashed before the
 * parent moved must never be swept up by a later Tier-level cascade. Parent
 * permanent deletion removes every child structurally (no per-child call);
 * individual Edition permanent delete stays separately guarded.
 *
 * Pure PackageSchema-level test — no WordPress stubs needed beyond
 * sanitize_text_field/sanitize_textarea_field, matching tier-edition-
 * schema.php and tier-edition-repository.php's convention for the parts of
 * this feature that don't need a live PlatformIdentifierStation.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_cascade(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier Edition cascade: ' . $message);
    }
}

function cascade_edition(array $occupant, string $id): ?array
{
    foreach ($occupant['tier_editions'] ?? [] as $edition) {
        if (($edition['id'] ?? null) === $id) return $edition;
    }
    return null;
}

// ── Build an occupant with three Editions: A (to be independently archived
//    BEFORE the Tier-level archive), B and C (still live at Tier-archive time). ──

$occupantSlot = Schema::upsertOccupant([], ['label' => 'Professional'], true);
$editions = [];
foreach (['A', 'B', 'C'] as $label) {
    $result = Schema::addTierEdition($editions, ['title' => $label]);
    $editions = $result['tier_editions'];
}
[$editionA, $editionB, $editionC] = $editions;
$idA = $editionA['id']; $idB = $editionB['id']; $idC = $editionC['id'];

// Publish A, B, C to Active (mirrors first-Publish CZT assignment being
// irrelevant here — cascade only cares about platform_status).
foreach ([$idA, $idB, $idC] as $id) {
    $editions = Schema::applyTierEditionStatus($editions, $id, StationLifecycle::STATUS_ACTIVE);
}

// A is independently archived by its own admin action BEFORE anything
// happens to the parent Tier — this is the "already independently archived"
// case the cascade rule must never touch.
$editions = Schema::applyTierEditionStatus($editions, $idA, StationLifecycle::STATUS_ARCHIVED);
check_cascade(Schema::findTierEdition($editions, $idA)['platform_status'] === 'archived', 'A is independently archived before any Tier-level action');
check_cascade(Schema::findTierEdition($editions, $idB)['platform_status'] === 'active', 'B is still live');
check_cascade(Schema::findTierEdition($editions, $idC)['platform_status'] === 'active', 'C is still live');

$occupantSlot['current_occupant']['tier_editions'] = $editions;
$occupantSlot = Schema::commitTierLifecycle($occupantSlot);

$instance = [
    'tier_instance_id' => 'ti_primary', 'tiers' => \CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema::emptyTierMap(),
    'occupant_bin' => [],
];
$instance['tiers']['basic'] = $occupantSlot;

// ── Tier-level archive: only B and C (live) are carried; A is untouched ─────

$archiveResult = Schema::archiveTierOccupant($instance, 'basic', false, 'bin_1', '2026-08-06 00:00:00');
check_cascade(!isset($archiveResult['error']), 'Tier-level archive succeeds: ' . ($archiveResult['error'] ?? ''));
$instance = $archiveResult['station'];
$binEntry = $instance['occupant_bin'][0];

$carriedSorted = $binEntry['cascaded_edition_ids'];
sort($carriedSorted);
$expectedSorted = [$idB, $idC];
sort($expectedSorted);
check_cascade($carriedSorted === $expectedSorted, 'the cascade record carries exactly B and C, never A');
check_cascade(!in_array($idA, $binEntry['cascaded_edition_ids'], true), 'A (already independently archived) is never recorded as cascaded');
check_cascade(cascade_edition($binEntry['occupant'], $idA)['platform_status'] === 'archived', 'A remains archived (its own prior state, not touched again)');
check_cascade(cascade_edition($binEntry['occupant'], $idB)['platform_status'] === 'archived', 'B is cascade-archived alongside the parent');
check_cascade(cascade_edition($binEntry['occupant'], $idC)['platform_status'] === 'archived', 'C is cascade-archived alongside the parent');
check_cascade(cascade_edition($binEntry['occupant'], $idB)['previous_platform_status'] === 'active', 'B\'s cascade-archive captures its prior live state, same as the engine\'s own archive() rule');

// ── Tier-level trash: only the carried ids (B, C) are trashed; A is still untouched ──

$trashResult = Schema::trashBinnedOccupant($instance, 'bin_1');
check_cascade(!isset($trashResult['error']), 'Tier-level trash succeeds: ' . ($trashResult['error'] ?? ''));
$instance = $trashResult['station'];
$trashedEntry = $instance['occupant_bin'][0];

check_cascade($trashedEntry['status'] === 'trashed', 'the bin entry itself is trashed');
check_cascade(cascade_edition($trashedEntry['occupant'], $idA)['platform_status'] === 'archived', 'A remains independently archived — the Tier-level trash never touches it, since it was never carried');
check_cascade(cascade_edition($trashedEntry['occupant'], $idB)['platform_status'] === 'trashed', 'B is cascade-trashed (it was carried)');
check_cascade(cascade_edition($trashedEntry['occupant'], $idC)['platform_status'] === 'trashed', 'C is cascade-trashed (it was carried)');

// ── Tier-level restore: only the carried ids (B, C) return to disabled; A remains archived ──

$restoreResult = Schema::restoreBinnedOccupant($instance, 'bin_1', null, null, false, 'bin_unused', null);
check_cascade(!isset($restoreResult['error']), 'Tier-level restore succeeds: ' . ($restoreResult['error'] ?? ''));
$restoredOccupant = $restoreResult['station']['tiers']['basic']['current_occupant'];

check_cascade($restoredOccupant['platform_status'] === 'disabled', 'the parent occupant lands at disabled, same as any restore');
check_cascade(cascade_edition($restoredOccupant, $idA)['platform_status'] === 'archived', 'A remains archived after the Tier is restored — it was never carried by this bin entry\'s cascade, so restore never touches it (the required rule)');
check_cascade(cascade_edition($restoredOccupant, $idB)['platform_status'] === 'disabled', 'B is cascade-restored to disabled alongside the parent');
check_cascade(cascade_edition($restoredOccupant, $idC)['platform_status'] === 'disabled', 'C is cascade-restored to disabled alongside the parent');
check_cascade(cascade_edition($restoredOccupant, $idB)['previous_platform_status'] === null, 'the cascade-restored Edition\'s mask is cleared, same as the engine\'s own restore() rule');

// ── Retarget: cascade restore still works when landing in a DIFFERENT slot ──

$instance2 = [
    'tier_instance_id' => 'ti_primary', 'tiers' => \CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema::emptyTierMap(),
    'occupant_bin' => [],
];
$occupantSlot2 = Schema::upsertOccupant([], ['label' => 'Retarget Test'], true);
$editionsR = Schema::addTierEdition([], ['title' => 'Live'])['tier_editions'];
$idR = $editionsR[0]['id'];
$editionsR = Schema::applyTierEditionStatus($editionsR, $idR, StationLifecycle::STATUS_ACTIVE);
$occupantSlot2['current_occupant']['tier_editions'] = $editionsR;
$occupantSlot2 = Schema::commitTierLifecycle($occupantSlot2);
$instance2['tiers']['basic'] = $occupantSlot2;

$archive2 = Schema::archiveTierOccupant($instance2, 'basic', false, 'bin_r1', '2026-08-06 00:00:00');
check_cascade(!isset($archive2['error']), 'archiving before retarget succeeds');
$restoreRetarget = Schema::restoreBinnedOccupant($archive2['station'], 'bin_r1', 'retarget', 'standard', false, 'bin_unused', null);
check_cascade(!isset($restoreRetarget['error']), 'retargeting restore succeeds: ' . ($restoreRetarget['error'] ?? ''));
check_cascade($restoreRetarget['tier_id'] === 'standard', 'the occupant lands in the retargeted slot');
$retargetedOccupant = $restoreRetarget['station']['tiers']['standard']['current_occupant'];
check_cascade(cascade_edition($retargetedOccupant, $idR)['platform_status'] === 'disabled', 'the cascade-carried Edition is correctly restored even when the parent lands in a different slot');

// ── Swap: the DISPLACED occupant gets its own independent cascade record ────

$instance3 = [
    'tier_instance_id' => 'ti_primary', 'tiers' => \CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema::emptyTierMap(),
    'occupant_bin' => [],
];
// Occupant currently live in 'basic', with one live Edition D — this is the
// one that will be DISPLACED by the swap.
$liveOccupant = Schema::upsertOccupant([], ['label' => 'Currently in basic'], true);
$editionsD = Schema::addTierEdition([], ['title' => 'D'])['tier_editions'];
$idD = $editionsD[0]['id'];
$editionsD = Schema::applyTierEditionStatus($editionsD, $idD, StationLifecycle::STATUS_ACTIVE);
$liveOccupant['current_occupant']['tier_editions'] = $editionsD;
$liveOccupant = Schema::commitTierLifecycle($liveOccupant);
$instance3['tiers']['basic'] = $liveOccupant;

// A second, already-binned occupant to swap INTO 'basic'.
$binnedOccupant = Schema::upsertOccupant([], ['label' => 'Coming back via swap'], true);
$instance3['occupant_bin'][] = [
    'bin_id' => 'bin_swap', 'origin_tier' => 'basic', 'occupant' => $binnedOccupant['current_occupant'],
    'status' => 'archived', 'previous_enabled' => true, 'displaced_at' => null, 'cascaded_edition_ids' => [],
];

$swapResult = Schema::restoreBinnedOccupant($instance3, 'bin_swap', 'swap', null, false, 'bin_displaced', '2026-08-06 00:00:00');
check_cascade(!isset($swapResult['error']), 'swap succeeds: ' . ($swapResult['error'] ?? ''));
$displacedEntry = null;
foreach ($swapResult['station']['occupant_bin'] as $entry) {
    if ($entry['bin_id'] === 'bin_displaced') { $displacedEntry = $entry; break; }
}
check_cascade($displacedEntry !== null, 'the previously-live occupant is displaced into its own new bin entry');
check_cascade(in_array($idD, $displacedEntry['cascaded_edition_ids'], true), 'the displaced occupant\'s own live Edition is recorded in ITS OWN cascade history');
check_cascade(cascade_edition($displacedEntry['occupant'], $idD)['platform_status'] === 'archived', 'the displaced occupant\'s live Edition is cascade-archived by the swap, exactly like a normal archive');

// ── Parent permanent deletion removes every child structurally ──────────────

$deleteResult = Schema::deleteBinnedOccupant($trashResult['station'], 'bin_1');
check_cascade(!isset($deleteResult['error']), 'permanently deleting the trashed bin entry succeeds');
$remainingBinIds = array_column($deleteResult['station']['occupant_bin'], 'bin_id');
check_cascade(!in_array('bin_1', $remainingBinIds, true), 'the bin entry (occupant AND every nested Edition — B, C, and independently-archived A) is gone in one structural removal, no per-child call required');

echo "Tier Edition cascade contract: PASS\n";
