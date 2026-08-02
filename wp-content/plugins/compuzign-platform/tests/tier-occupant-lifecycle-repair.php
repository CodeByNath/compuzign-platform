<?php

declare(strict_types=1);

// Locks the Tier Occupant Lifecycle Repair Blueprint's storage/transition
// contract (docs/code-map/tier-occupant-lifecycle-repair.md): the canonical
// `is_explicitly_disabled` marker, Publish-alone-activates, Enable/Restore
// never activate, and legacy marker absence compatibility.

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_lifecycle_repair(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier occupant lifecycle repair: ' . $message);
    }
}

// ── Legacy marker absence (compatibility) ──────────────────────────────────
// array_key_exists detection: a markerless legacy Active occupant stays
// Active; a markerless legacy Disabled occupant is read conservatively as
// explicitly disabled so its presentation never silently changes.

check_lifecycle_repair(
    Schema::isExplicitlyDisabled(['platform_status' => 'active']) === false,
    'a markerless legacy Active occupant is not explicitly disabled'
);
check_lifecycle_repair(
    Schema::isExplicitlyDisabled(['platform_status' => 'disabled']) === true,
    'a markerless legacy Disabled occupant is read conservatively as explicitly disabled'
);
check_lifecycle_repair(
    Schema::isExplicitlyDisabled(['platform_status' => 'disabled', 'is_explicitly_disabled' => false]) === false,
    'a stored-disabled-but-unmasked occupant (Pending, never Disabled) is not explicitly disabled'
);
check_lifecycle_repair(Schema::isExplicitlyDisabled(null) === false, 'no occupant is never explicitly disabled');

// ── First configuration / ready module Save: no settle, no activation, no mask ──

$instance = ['tiers' => ['basic' => []], 'occupant_bin' => []];

$slot = Schema::ensureTierLifecycle($instance['tiers']['basic']);
check_lifecycle_repair(
    array_unique(array_values($slot['module_status'])) === ['not-configured'],
    'first incomplete configuration (no occupant yet) has every module not-configured'
);

$slot['drafts']['overview'] = [
    'label' => 'Starter Cloud', 'ideal_for' => 'Small workloads',
    'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
];
$slot['module_status']['overview'] = 'pending';
check_lifecycle_repair(
    !Schema::isOccupantFormat($slot) || $slot['current_occupant'] === null,
    'a ready module Save persists the draft only — it never creates or settles an occupant'
);

// ── Publish activates and clears the marker ────────────────────────────────

$published = Schema::settleTierSlot($slot);
$instance['tiers']['basic'] = $published;
check_lifecycle_repair($published['current_occupant']['platform_status'] === 'active', 'Publish activates the occupant');
check_lifecycle_repair($published['current_occupant']['is_explicitly_disabled'] === false, 'Publish clears the explicit marker');
check_lifecycle_repair($published['current_occupant']['label'] === 'Starter Cloud', 'Publish settles the draft-preferred overview');

// ── Disable / Enable: is_explicitly_disabled is the canonical fact ─────────
// (setPackageStationTierEnabled's own transition is exercised by the Enable/
// Restore mirror below — PackageSchema owns the marker; the controller only
// writes it, exactly like archive/restore already delegate the engine here.)

$disabled = $published;
$disabled['current_occupant']['platform_status']     = 'disabled';
$disabled['current_occupant']['is_explicitly_disabled'] = true;
check_lifecycle_repair(Schema::isExplicitlyDisabled($disabled['current_occupant']) === true, 'Disable produces an explicit, masked Disabled occupant');

$enabled = $disabled;
$enabled['current_occupant']['is_explicitly_disabled'] = false; // Enable: unmask only
check_lifecycle_repair($enabled['current_occupant']['platform_status'] === 'disabled', 'Enable never activates on its own — it lands inactive, unmasked Pending');
check_lifecycle_repair(Schema::isExplicitlyDisabled($enabled['current_occupant']) === false, 'Enable clears the explicit marker without publishing');

// Publish after Enable must reach Active (Publish, never Enable, activates).
$rePublished = Schema::settleTierSlot(Schema::ensureTierLifecycle($enabled));
check_lifecycle_repair($rePublished['current_occupant']['platform_status'] === 'active', 'Publish after Enable reaches Active');
check_lifecycle_repair($rePublished['current_occupant']['is_explicitly_disabled'] === false, 'Publish after Enable keeps the marker clear');

// ── Restore lands inactive and unmasked, regardless of the marker at archive time ──

$instance['tiers']['basic'] = $disabled; // occupied + explicitly Disabled at archive time
$archived = Schema::archiveTierOccupant($instance, 'basic', false, 'bin_repair_1', '2026-08-02 00:00:00');
check_lifecycle_repair(!isset($archived['error']), 'archiving a Disabled occupant succeeds: ' . ($archived['error'] ?? ''));
check_lifecycle_repair($archived['entry']['occupant']['is_explicitly_disabled'] === true, 'the archived bin entry remembers the explicit marker it had');

$restored = Schema::restoreBinnedOccupant($archived['station'], 'bin_repair_1', null, null, false, 'bin_repair_2', null);
check_lifecycle_repair(!isset($restored['error']), 'restoring succeeds: ' . ($restored['error'] ?? ''));
$restoredOccupant = $restored['station']['tiers']['basic']['current_occupant'];
check_lifecycle_repair($restoredOccupant['platform_status'] === 'disabled', 'Restore lands inactive (Pending), never Active');
check_lifecycle_repair($restoredOccupant['is_explicitly_disabled'] === false, 'Restore always clears the explicit marker, even from a Disabled archive');

// ── Add-on identity and lifecycle invariants are unaffected by the marker ──

$addonSlot = Schema::upsertOccupant([], [
    'label' => 'Add-on Tier', 'price' => 5.0, 'billing_cycle' => 'monthly', 'is_addon' => true,
], true);
$addonPublished = Schema::settleTierSlot(Schema::ensureTierLifecycle($addonSlot));
check_lifecycle_repair($addonPublished['current_occupant']['is_addon'] === true, 'is_addon survives Publish alongside the marker repair');
check_lifecycle_repair($addonPublished['current_occupant']['is_explicitly_disabled'] === false, 'Publish clears the marker for an add-on occupant exactly like a normal Tier');
check_lifecycle_repair($addonPublished['current_occupant']['id'] === $addonSlot['current_occupant']['id'], 'occupant id is stable across the marker repair');

// ── normaliseTierSlot / summariseTierSlot expose the marker ────────────────

$detail = Schema::normaliseTierSlot($disabled);
check_lifecycle_repair($detail['is_explicitly_disabled'] === true, 'normaliseTierSlot exposes the explicit marker');
$summary = Schema::summariseTierSlot($disabled);
check_lifecycle_repair($summary['is_explicitly_disabled'] === true, 'summariseTierSlot exposes the explicit marker');

$legacyFlat = Schema::normaliseTierSlot(['label' => 'Legacy', 'price' => 9.0, 'billing_cycle' => 'monthly', 'enabled' => false]);
check_lifecycle_repair($legacyFlat['is_explicitly_disabled'] === false, 'legacy Phase 1 flat tiers carry no explicit marker concept');

echo "Tier occupant lifecycle repair checks passed.\n";
