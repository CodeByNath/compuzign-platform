<?php

declare(strict_types=1);

// End-to-end backend scenario for the Tier System add-on capability
// (Phase 7): walks one Tier Instance through the actual admin lifecycle —
// configure a normal Tier, mark a second Tier as an add-on, settle both,
// disable the add-on, re-enable and archive it, restore it, then project the
// instance the way PricingBuilder consumes it — asserting the same
// behaviours a real admin session and a real Cost Builder page load would
// depend on, in one continuous run rather than isolated unit fixtures.

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_addon_e2e(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier add-on end-to-end: ' . $message);
    }
}

// ── Scenario 1: a Tier System with no add-on occupants behaves exactly as
//    before — no occupant anywhere carries is_addon: true. ──────────────────

$instance = ['tiers' => ['basic' => [], 'standard' => [], 'premium' => [], 'enterprise' => [], 'ultimate' => []], 'occupant_bin' => []];

$instance['tiers']['standard'] = Schema::commitTierLifecycle(Schema::upsertOccupant([], [
    'label' => 'Standard', 'ideal_for' => 'Growing teams', 'billing_cycle' => 'monthly',
    'rate_sheet_id' => 'rs_a', 'rate_sheet_items' => [['item_id' => 'rate-vm', 'quantity' => 3]],
    'inclusions_override' => [['id' => 'inc_1', 'label' => 'Managed backups']],
    'faq_refs' => ['faq_1'],
], true));

foreach (['basic', 'standard', 'premium', 'enterprise', 'ultimate'] as $tierId) {
    $projected = Schema::extractTierForCostBuilder($instance['tiers'][$tierId]);
    if ($projected !== null) {
        check_addon_e2e($projected['is_addon'] === false, "{$tierId} projects is_addon: false before any add-on is configured");
    }
}

// ── Admin configures a second Tier ("Backup & DR Shield") and marks it an
//    add-on through the Overview module save/settle flow (Scenario: admin
//    marks a Tier as an add-on). ─────────────────────────────────────────

$slot = Schema::ensureTierLifecycle($instance['tiers']['enterprise']);
$slot['drafts']['overview'] = [
    'label' => 'Backup & DR Shield', 'ideal_for' => 'Disaster recovery for critical workloads',
    'price' => null, 'contact' => false, 'billing_cycle' => 'monthly', 'is_addon' => true,
];
$slot['module_status']['overview'] = 'pending';
$slot['drafts']['faqs'] = ['faq_addon_1'];
$slot['module_status']['faqs'] = 'pending';
check_addon_e2e($slot['module_status']['overview'] === 'pending', 'the add-on designation change is staged as a pending Overview draft, not committed immediately');

$settledAddon = Schema::settleTierSlot($slot);
$instance['tiers']['enterprise'] = $settledAddon;
$addonOccupantId = $settledAddon['current_occupant']['id'];

check_addon_e2e($settledAddon['current_occupant']['is_addon'] === true, 'settling the draft commits the add-on designation');
check_addon_e2e($settledAddon['current_occupant']['label'] === 'Backup & DR Shield', 'the add-on keeps its own Overview label');
check_addon_e2e($settledAddon['current_occupant']['faq_refs'] === ['faq_addon_1'], 'the add-on keeps its own FAQs (Scenario 14: FAQs remain intact)');
check_addon_e2e($settledAddon['current_occupant']['platform_status'] === 'active', 'the add-on is enabled by default, independent of its add-on designation');
check_addon_e2e(array_unique(array_values($settledAddon['module_status'])) === ['settled'], 'every module settles exactly once');

// ── Both occupants now project publicly (Scenario 2/3 backend half: a normal
//    Tier and an add-on Tier both resolve for the same Tier System). ───────

$normalProjected = Schema::extractTierForCostBuilder($instance['tiers']['standard']);
$addonProjected  = Schema::extractTierForCostBuilder($instance['tiers']['enterprise']);
check_addon_e2e($normalProjected['is_addon'] === false, 'the normal Tier still projects is_addon: false');
check_addon_e2e($addonProjected['is_addon'] === true, 'the add-on Tier projects is_addon: true');
check_addon_e2e($normalProjected['rate_sheet_items'] === [['item_id' => 'rate-vm', 'quantity' => 3, 'price_option_id' => null, 'leg_assignments' => []]], 'the normal Tier keeps its Rate Sheet selections (Scenario 14: pricing remains intact)');
check_addon_e2e($normalProjected['inclusions_override'] === [['id' => 'inc_1', 'label' => 'Managed backups']], 'the normal Tier keeps its inclusions (Scenario 14: inclusions remain intact)');

// ── Scenario 8: a disabled add-on Tier is not shown. ────────────────────────

$slot = Schema::ensureTierLifecycle($instance['tiers']['enterprise']);
$slot['current_occupant']['platform_status'] = 'disabled'; // mirrors setPackageStationTierEnabled's surgical mutation
$instance['tiers']['enterprise'] = $slot;
check_addon_e2e(Schema::extractTierForCostBuilder($slot)['is_addon'] === true, 'disabling does not clear the add-on designation');
check_addon_e2e(Schema::extractTierForCostBuilder($slot)['enabled'] === false, 'disabling is independently visible to the projection, ready for PricingBuilder to suppress it');

// Re-enable for the archive/restore leg of the scenario.
$slot['current_occupant']['platform_status'] = 'active';
$instance['tiers']['enterprise'] = $slot;

// ── Scenario 9/10: an archived add-on occupant is not shown, and restoring
//    the same occupant preserves its is_addon designation. ─────────────────

$archived = Schema::archiveTierOccupant($instance, 'enterprise', false, 'bin_e2e_1', '2026-07-31 00:00:00');
check_addon_e2e(!isset($archived['error']), 'archiving the add-on succeeds: ' . ($archived['error'] ?? ''));
check_addon_e2e(Schema::extractTierForCostBuilder($archived['station']['tiers']['enterprise']) === null, 'an archived add-on Tier projects nothing — the shell is empty');
check_addon_e2e($archived['entry']['occupant']['is_addon'] === true, 'the archived bin entry remembers the add-on designation');

$restored = Schema::restoreBinnedOccupant($archived['station'], 'bin_e2e_1', null, null, false, 'bin_unused', null);
check_addon_e2e(!isset($restored['error']), 'restoring the add-on succeeds: ' . ($restored['error'] ?? ''));
$restoredProjected = Schema::extractTierForCostBuilder($restored['station']['tiers']['enterprise']);
check_addon_e2e($restoredProjected['is_addon'] === true, 'restoring preserves the is_addon designation');
check_addon_e2e($restoredProjected['label'] === 'Backup & DR Shield', 'restoring preserves the Overview content');
check_addon_e2e($restoredProjected['faq_refs'] === ['faq_addon_1'], 'restoring preserves FAQs');
check_addon_e2e(Schema::normaliseTierSlot($restored['station']['tiers']['enterprise'])['occupant_id'] === $addonOccupantId, 'restoring preserves the stable occupant id throughout the whole archive/restore round trip');

// The restore engine lands every restored occupant disabled — this is the
// existing, unrelated bin-travel rule (never active on restore); confirm it
// still applies identically to add-ons as to normal Tiers.
check_addon_e2e($restoredProjected['enabled'] === false, 'restore lands disabled — the same rule as any other occupant, unaffected by is_addon');

echo "Tier add-on end-to-end checks passed.\n";
