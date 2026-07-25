<?php

declare(strict_types=1);

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_peer_isolation(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Package capability peer isolation: ' . $message);
    }
}

$family = PackageCategoryGroups::sanitizeAll([[
    'group_id' => 'pcg_peer',
    'label' => 'Peer Family',
    'platform_status' => 'active',
]])[0];
$instance = TierInstanceSchema::sanitizeInstance([
    'tier_instance_id' => 'ti_peer',
    'title' => 'Peer Tiers',
    'status' => 'active',
    'allowed_rate_sheet_ids' => ['rs_peer'],
    'popular_tier' => 'basic',
    'popular_label' => 'Popular',
    'tiers' => [
        'basic' => ['current_occupant' => ['id' => 'occ_peer', 'platform_status' => 'active']],
    ],
    'occupant_bin' => [],
]);
$assignments = TierAssignmentSchema::assign(
    [], 'package_family', 'pcg_peer', 'ti_peer', ['pcg_peer' => true], [$instance]
);

$familyBytes = serialize($family);
$instanceBytes = serialize($instance);
$withoutAssignment = TierAssignmentSchema::unassign($assignments, $assignments[0]['assignment_id']);
check_peer_isolation($withoutAssignment === [], 'P1 removes exactly one assignment row');
check_peer_isolation(serialize($family) === $familyBytes, 'P1 leaves the Family byte-identical');
check_peer_isolation(serialize($instance) === $instanceBytes, 'P1 leaves the Tier instance byte-identical');

// P2 — exercise every Tier-instance mutation class through the authoritative
// PackageSchema operations and the one-instance replacement boundary. A Family
// is a peer, never an input or output of any operation, and must remain bytesame.
$peerStation = [
    'tier_instances' => [$instance],
    'tiers' => $instance['tiers'],
    'occupant_bin' => [],
    'popular_tier' => $instance['popular_tier'],
    'popular_label' => $instance['popular_label'],
];
$peerInstance = $instance;
$assertFamilyAfter = static function (string $operation) use (&$family, $familyBytes): void {
    check_peer_isolation(serialize($family) === $familyBytes, "P2 {$operation} leaves the Family byte-identical");
};
$storePeer = static function (array $next, string $operation) use (&$peerStation, &$peerInstance, $assertFamilyAfter): void {
    $peerInstance = $next;
    $peerStation = TierInstanceSchema::withInstance($peerStation, 'ti_peer', $peerInstance);
    $peerInstance = TierInstanceSchema::findInstance($peerStation['tier_instances'], 'ti_peer') ?? [];
    $assertFamilyAfter($operation);
};

$slot = PackageSchema::commitTierLifecycle(PackageSchema::upsertOccupant(
    $peerInstance['tiers']['basic'],
    ['label' => 'Edited', 'rate_sheet_id' => 'rs_peer', 'rate_sheet_items' => [], 'billing_cycle' => 'monthly'],
    true
));
$peerInstance['tiers']['basic'] = $slot;
$storePeer($peerInstance, 'occupant save');

$slot = PackageSchema::ensureTierLifecycle($peerInstance['tiers']['basic']);
$slot['drafts']['overview'] = ['label' => 'Draft', 'rate_sheet_id' => 'rs_peer'];
$slot['module_status']['overview'] = 'pending';
$peerInstance['tiers']['basic'] = $slot;
$storePeer($peerInstance, 'module edit');

$peerInstance['tiers']['basic'] = PackageSchema::revertTierModuleDraft($peerInstance['tiers']['basic'], 'overview');
$storePeer($peerInstance, 'revert');

$slot = PackageSchema::ensureTierLifecycle($peerInstance['tiers']['basic']);
$slot['drafts']['overview'] = ['label' => 'Settled', 'rate_sheet_id' => 'rs_peer'];
$slot['module_status']['overview'] = 'pending';
$peerInstance['tiers']['basic'] = PackageSchema::settleTierSlot($slot);
$storePeer($peerInstance, 'settle');

$peerInstance['tiers']['basic']['current_occupant']['platform_status'] = 'disabled';
$storePeer($peerInstance, 'enabled toggle and status change');
$peerInstance['popular_tier'] = 'basic';
$peerInstance['popular_label'] = 'Peer popular';
$storePeer($peerInstance, 'popular');

$archived = PackageSchema::archiveTierOccupant($peerInstance, 'basic', false, 'bin_peer_a', '2026-07-25 01:02:03');
$storePeer($archived['station'], 'archive');
$restored = PackageSchema::restoreBinnedOccupant(
    $peerInstance, 'bin_peer_a', null, null, false, 'bin_unused', '2026-07-25 01:03:03'
);
$storePeer($restored['station'], 'restore');

$archived = PackageSchema::archiveTierOccupant($peerInstance, 'basic', false, 'bin_peer_b', '2026-07-25 01:04:03');
$storePeer($archived['station'], 'archive for swap');
$peerInstance['tiers']['basic'] = PackageSchema::commitTierLifecycle(PackageSchema::upsertOccupant(
    $peerInstance['tiers']['basic'],
    ['label' => 'Replacement', 'rate_sheet_id' => 'rs_peer', 'rate_sheet_items' => [], 'billing_cycle' => 'monthly'],
    true
));
$storePeer($peerInstance, 'replacement occupant save');
$swapped = PackageSchema::restoreBinnedOccupant(
    $peerInstance, 'bin_peer_b', 'swap', null, false, 'bin_peer_displaced', '2026-07-25 01:05:03'
);
$storePeer($swapped['station'], 'swap');
$trashed = PackageSchema::trashBinnedOccupant($peerInstance, 'bin_peer_displaced');
$storePeer($trashed['station'], 'trash');
$deleted = PackageSchema::deleteBinnedOccupant($peerInstance, 'bin_peer_displaced');
$storePeer($deleted['station'], 'bin delete');

$peerInstance['allowed_rate_sheet_ids'] = ['rs_peer', 'rs_secondary'];
$peerInstance['title'] = 'Renamed peer Tiers';
$storePeer($peerInstance, 'allowed sheets and title change');

$familyWithForbiddenInput = PackageCategoryGroups::sanitizeAll([[
    ...$family,
    'tier_instance_id' => 'ti_illegal',
    'tier_assignments' => [['assignment_id' => 'illegal']],
    'assignment_id' => 'illegal',
]])[0];
foreach (array_keys($familyWithForbiddenInput) as $key) {
    check_peer_isolation(!preg_match('/^tier|assignment/', $key), 'P4 Family sanitiser cannot emit Tier or assignment fields');
}

$instanceWithForbiddenInput = TierInstanceSchema::sanitizeInstance([
    ...$instance,
    'consumer_type' => 'package_family',
    'consumer_id' => 'pcg_peer',
    'family_id' => 'pcg_peer',
    'group_id' => 'pcg_peer',
]);
foreach (array_keys($instanceWithForbiddenInput ?? []) as $key) {
    check_peer_isolation(!preg_match('/^consumer|family|group/', $key), 'P5 Tier instance sanitiser cannot emit consumer, Family, or Group fields');
}

echo "Package capability peer-isolation checks passed.\n";
