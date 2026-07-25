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
