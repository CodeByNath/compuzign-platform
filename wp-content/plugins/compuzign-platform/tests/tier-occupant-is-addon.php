<?php

declare(strict_types=1);

// Focused contract for the Tier add-on capability's occupant-level field:
// PackageSchema::upsertOccupant/normaliseTierSlot/summariseTierSlot/
// extractTierForCostBuilder/settleTierSlot/archiveTierOccupant/
// restoreBinnedOccupant all carry `is_addon` the same way they already carry
// `platform_status`, without letting it influence any other occupant field.

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_is_addon(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier occupant is_addon: ' . $message);
    }
}

// ── Defaulting ──────────────────────────────────────────────────────────────

$emptyDetail = Schema::normaliseTierSlot([]);
check_is_addon($emptyDetail['is_addon'] === false, 'an empty shell normalises to is_addon: false');

$legacyFlatNoField = Schema::normaliseTierSlot([
    'label' => 'Legacy Flat', 'price' => 10.0, 'contact' => false, 'billing_cycle' => 'monthly',
    'inclusions_override' => [], 'features' => [], 'faq_refs' => [], 'enabled' => true,
]);
check_is_addon($legacyFlatNoField['is_addon'] === false, 'a legacy flat tier missing is_addon defaults to false');

$firstConfigured = Schema::upsertOccupant([], ['label' => 'Standard'], true);
check_is_addon($firstConfigured['current_occupant']['is_addon'] === false, 'a first-configured occupant with no is_addon in the payload defaults to false');

// ── Round-trip through upsertOccupant / normaliseTierSlot ───────────────────

$addon = Schema::upsertOccupant([], ['label' => 'Backup & DR Shield', 'is_addon' => true], true);
check_is_addon($addon['current_occupant']['is_addon'] === true, 'upsertOccupant stores an explicit true');
$addonDetail = Schema::normaliseTierSlot($addon);
check_is_addon($addonDetail['is_addon'] === true, 'normaliseTierSlot surfaces the stored true');
check_is_addon(is_string($addonDetail['occupant_id']) && str_starts_with($addonDetail['occupant_id'], 'occ_'), 'the occupant keeps a stable occ_ identity');

$backToNormal = Schema::upsertOccupant($addon, ['label' => 'Backup & DR Shield', 'is_addon' => false], true);
check_is_addon($backToNormal['current_occupant']['is_addon'] === false, 'upsertOccupant round-trips an explicit false');
check_is_addon($backToNormal['current_occupant']['id'] === $addon['current_occupant']['id'], 'flipping is_addon preserves the stable occupant id');

// ── Orthogonality: is_addon never affects platform_status, id, or Rate Sheet ─

$bound = Schema::upsertOccupant([], [
    'label' => 'Bound', 'rate_sheet_id' => 'rs_a',
    'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 2]],
], true);
$flippedBound = Schema::upsertOccupant($bound, [
    'label' => 'Bound', 'rate_sheet_id' => 'rs_a', 'is_addon' => true,
    'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 2]],
], true);
check_is_addon($flippedBound['current_occupant']['rate_sheet_id'] === 'rs_a', 'marking an occupant an add-on does not clear or change its bound Rate Sheet');
check_is_addon($flippedBound['current_occupant']['rate_sheet_items'] === [['item_id' => 'rate-vm', 'quantity' => 2, 'price_option_id' => null]], 'marking an occupant an add-on does not touch its Rate Sheet selections');
check_is_addon($flippedBound['current_occupant']['platform_status'] === 'active', 'marking an occupant an add-on does not change platform_status');

$disabledAddon = Schema::upsertOccupant([], ['label' => 'Disabled Addon', 'is_addon' => true], false);
check_is_addon($disabledAddon['current_occupant']['is_addon'] === true, 'is_addon persists independently of the enabled flag');
check_is_addon($disabledAddon['current_occupant']['platform_status'] === 'disabled', 'platform_status is independently settable');

// Simulates the enabled/disabled toggle endpoint, which mutates only
// current_occupant.platform_status in place (PackageStationController::
// setPackageStationTierEnabled). Proves that surgical mutation leaves
// is_addon (and every other occupant field) untouched.
$toggled = $addon;
$toggled['current_occupant']['platform_status'] = 'disabled';
check_is_addon($toggled['current_occupant']['is_addon'] === true, 'toggling enabled/disabled in place does not alter is_addon');

// ── summariseTierSlot / extractTierForCostBuilder ────────────────────────────

$summary = Schema::summariseTierSlot($addon);
check_is_addon($summary['is_addon'] === true, 'summariseTierSlot surfaces is_addon for admin list rows');

$costBuilderOccupant = Schema::extractTierForCostBuilder($addon);
check_is_addon($costBuilderOccupant !== null && $costBuilderOccupant['is_addon'] === true, 'extractTierForCostBuilder surfaces is_addon for the occupant-format branch');

$costBuilderFlat = Schema::extractTierForCostBuilder([
    'label' => 'Legacy Flat', 'price' => 10.0, 'contact' => false, 'billing_cycle' => 'monthly',
    'inclusions_override' => [], 'features' => [], 'faq_refs' => [], 'enabled' => true,
]);
check_is_addon($costBuilderFlat !== null && $costBuilderFlat['is_addon'] === false, 'extractTierForCostBuilder defaults is_addon: false for the legacy flat branch');

check_is_addon(Schema::extractTierForCostBuilder([]) === null, 'an empty shell still projects nothing to Cost Builder');

// ── Overview draft save + settle (draft-preferred, then committed) ──────────

$settledNormal = Schema::commitTierLifecycle(Schema::upsertOccupant([], [
    'label' => 'Standard', 'billing_cycle' => 'monthly', 'rate_sheet_id' => 'rs_a',
    'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 3]],
], true));
$originalOccupantId = $settledNormal['current_occupant']['id'];

// Stage an Overview draft that only changes is_addon — mirrors
// savePackageStationTierModule's overview draftValue shape.
$slot = Schema::ensureTierLifecycle($settledNormal);
$slot['drafts']['overview'] = [
    'label' => 'Standard', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'monthly', 'is_addon' => true,
];
$slot['module_status']['overview'] = 'pending';
check_is_addon($slot['module_status']['overview'] === 'pending', 'staging an is_addon change marks the overview module pending');
check_is_addon($slot['current_occupant']['is_addon'] === false, 'a pending draft does not touch the settled occupant until settle');

$settled = Schema::settleTierSlot($slot);
check_is_addon($settled['current_occupant']['is_addon'] === true, 'settle commits the draft-preferred is_addon value');
check_is_addon($settled['current_occupant']['id'] === $originalOccupantId, 'settle preserves the stable occupant id');
check_is_addon($settled['current_occupant']['platform_status'] === 'active', 'settle does not alter platform_status');
check_is_addon($settled['current_occupant']['rate_sheet_id'] === 'rs_a', 'settle does not clear the bound Rate Sheet when only is_addon changes');
// billing_cycle 'monthly' + no legs yet fires Tier Pricing Rules' legacy
// synthesis (PackageSchema::synthesizeFirstCommercialLeg()) on this settle —
// the selection's own item_id/quantity/price_option_id survive exactly,
// backfilled with a leg_assignments entry for the one synthesized leg.
check_is_addon(count($settled['current_occupant']['commercial_legs']) === 1, 'settle synthesizes exactly one Commercial Leg from the existing billing_cycle');
check_is_addon(
    $settled['current_occupant']['rate_sheet_items'] === [[
        'item_id' => 'rate-vm', 'quantity' => 3, 'price_option_id' => null,
        'leg_assignments' => [['leg_id' => $settled['current_occupant']['commercial_legs'][0]['id'], 'price_option_id' => null, 'quantity' => 3]],
    ]],
    'settle preserves existing Rate Sheet selections when only is_addon changes, backfilled onto the synthesized leg',
);
check_is_addon(array_unique(array_values($settled['module_status'])) === ['settled'], 'settle marks every module settled exactly once');

// A settle with NO overview draft at all must keep the previously settled
// is_addon value (draft-preferred falls back to the occupant, not to false).
$untouchedDraftSlot = Schema::ensureTierLifecycle($settled);
$untouchedDraftSlot['drafts']['features'] = [['item_id' => 'rate-vm', 'quantity' => 4]];
$untouchedDraftSlot['module_status']['features'] = 'pending';
$settledAgain = Schema::settleTierSlot($untouchedDraftSlot);
check_is_addon($settledAgain['current_occupant']['is_addon'] === true, 'settling an unrelated module (features) preserves the previously settled is_addon');

// ── Revert ────────────────────────────────────────────────────────────────

$slotForRevert = Schema::ensureTierLifecycle($settled);
$slotForRevert['drafts']['overview'] = [
    'label' => 'Standard', 'ideal_for' => '', 'price' => null, 'contact' => false,
    'billing_cycle' => 'monthly', 'is_addon' => false, // staged flip back to normal
];
$slotForRevert['module_status']['overview'] = 'pending';
$reverted = Schema::revertTierModuleDraft($slotForRevert, 'overview');
check_is_addon($reverted !== null, 'revert accepts the overview module');
check_is_addon($reverted['drafts']['overview'] === null, 'revert clears the pending draft');
check_is_addon($reverted['module_status']['overview'] === 'settled', 'revert re-derives settled status from the existing occupant');
$revertedDetail = Schema::normaliseTierSlot($reverted);
check_is_addon($revertedDetail['is_addon'] === true, 'reverting discards the staged flip; the settled is_addon: true survives untouched');

// ── Archive / restore (implicit origin) ──────────────────────────────────────

$station = ['tiers' => ['basic' => $settled], 'occupant_bin' => []];
$archived = Schema::archiveTierOccupant($station, 'basic', false, 'bin_addon_1', '2026-07-31 00:00:00');
check_is_addon(!isset($archived['error']), 'archiving a settled add-on occupant succeeds: ' . ($archived['error'] ?? ''));
check_is_addon($archived['entry']['occupant']['is_addon'] === true, 'the archived bin entry carries the occupant\'s is_addon unchanged');
check_is_addon($archived['station']['tiers']['basic']['current_occupant'] === null, 'the origin shell is emptied on archive');

$restored = Schema::restoreBinnedOccupant($archived['station'], 'bin_addon_1', null, null, false, 'bin_unused', null);
check_is_addon(!isset($restored['error']), 'restoring to the empty origin shell succeeds: ' . ($restored['error'] ?? ''));
check_is_addon($restored['tier_id'] === 'basic', 'implicit-mode restore returns to the origin shell');
$restoredDetail = Schema::normaliseTierSlot($restored['station']['tiers']['basic']);
check_is_addon($restoredDetail['is_addon'] === true, 'is_addon designation survives archive -> restore');
check_is_addon($restoredDetail['occupant_id'] === $originalOccupantId, 'occupant identity survives archive -> restore');
check_is_addon($restoredDetail['rate_sheet_id'] === 'rs_a', 'Rate Sheet binding survives archive -> restore');

// ── Retarget (restore into a different, explicitly empty shell) ─────────────

$archivedAgain = Schema::archiveTierOccupant($restored['station'], 'basic', false, 'bin_addon_2', '2026-07-31 00:00:00');
$retargeted = Schema::restoreBinnedOccupant($archivedAgain['station'], 'bin_addon_2', 'retarget', 'standard', false, 'bin_unused', null);
check_is_addon(!isset($retargeted['error']), 'retarget restore succeeds: ' . ($retargeted['error'] ?? ''));
check_is_addon($retargeted['tier_id'] === 'standard', 'retarget moves the occupant into the explicit target shell');
$retargetedDetail = Schema::normaliseTierSlot($retargeted['station']['tiers']['standard']);
check_is_addon($retargetedDetail['is_addon'] === true, 'is_addon designation survives retarget into a different shell');
check_is_addon($retargetedDetail['occupant_id'] === $originalOccupantId, 'occupant identity survives retarget');

// ── Swap (restore into an occupied shell, displacing its current occupant) ──
// Swap always targets the bin entry's own origin shell (never an arbitrary
// explicit target) — it restores an occupant back into the shell it was
// archived from, displacing whoever has since moved in there.

$normalOccupant = Schema::commitTierLifecycle(Schema::upsertOccupant([], [
    'label' => 'Basic', 'billing_cycle' => 'monthly', 'is_addon' => false,
], true));
$normalOccupantId = $normalOccupant['current_occupant']['id'];

$swapBaseStation = ['tiers' => ['basic' => $settled], 'occupant_bin' => []];
$archivedForSwap = Schema::archiveTierOccupant($swapBaseStation, 'basic', false, 'bin_addon_3', '2026-07-31 00:00:00');
check_is_addon(!isset($archivedForSwap['error']), 'archiving the add-on from basic for the swap fixture succeeds: ' . ($archivedForSwap['error'] ?? ''));
$swapStation = $archivedForSwap['station'];
$swapStation['tiers']['basic'] = $normalOccupant; // basic refilled by a normal Tier while the add-on sat in the bin
$swapped = Schema::restoreBinnedOccupant($swapStation, 'bin_addon_3', 'swap', null, false, 'bin_displaced', '2026-07-31 00:00:00');
check_is_addon(!isset($swapped['error']), 'swap restore succeeds: ' . ($swapped['error'] ?? ''));
check_is_addon($swapped['tier_id'] === 'basic', 'swap restore targets the occupied origin shell');

$restoredIntoBasic = Schema::normaliseTierSlot($swapped['station']['tiers']['basic']);
check_is_addon($restoredIntoBasic['is_addon'] === true, 'the add-on occupant keeps is_addon: true after swapping into basic');
check_is_addon($restoredIntoBasic['occupant_id'] === $originalOccupantId, 'the add-on occupant keeps its identity after swap');

check_is_addon($swapped['displaced'] !== null, 'swap displaces the previous occupant of the target shell into the bin');
check_is_addon($swapped['displaced']['occupant']['is_addon'] === false, 'the displaced normal Tier keeps is_addon: false in its new bin entry');
check_is_addon($swapped['displaced']['occupant']['id'] === $normalOccupantId, 'the displaced occupant keeps its identity');

echo "Tier occupant is_addon checks passed.\n";
