<?php

declare(strict_types=1);

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_key')) {
    function sanitize_key(mixed $value): string
    {
        return preg_replace('/[^a-z0-9_-]/', '', strtolower((string) $value)) ?? '';
    }
}

require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageCapabilityAssignments.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCapabilityAssignments as Assignments;

function check_package_capability(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Package capability assignment: ' . $message);
    }
}

$station = ['tiers' => [], 'package_manager' => ['capability_assignments' => []]];
$tiersBefore = $station['tiers'];
$station['package_manager']['capability_assignments'] = Assignments::upsert(
    $station['package_manager']['capability_assignments'],
    Assignments::OWNER_PACKAGE_MANAGER,
    Assignments::PACKAGE_MANAGER_ID,
    Assignments::CAPABILITY_TIERS,
    true
);

check_package_capability($station['tiers'] === $tiersBefore, 'enabling Tiers must not create or change Tier slots');
check_package_capability(
    Assignments::isEnabled(
        $station['package_manager']['capability_assignments'],
        Assignments::OWNER_PACKAGE_MANAGER,
        Assignments::PACKAGE_MANAGER_ID,
        Assignments::CAPABILITY_TIERS
    ),
    'the singleton Package Manager assignment resolves enabled'
);

$station['package_manager']['capability_assignments'] = Assignments::upsert(
    $station['package_manager']['capability_assignments'],
    Assignments::OWNER_PACKAGE_MANAGER,
    Assignments::PACKAGE_MANAGER_ID,
    Assignments::CAPABILITY_TIERS,
    false
);
check_package_capability(count($station['package_manager']['capability_assignments']) === 1, 'assignment upsert is idempotent');
check_package_capability(
    Assignments::sanitize([[
        'owner_type' => Assignments::OWNER_PACKAGE_MANAGER,
        'owner_id' => Assignments::PACKAGE_MANAGER_ID,
        'capability_key' => Assignments::CAPABILITY_TIERS,
        'enabled' => true,
        'order' => -500,
    ]])[0]['order'] === 10,
    'assignment input cannot override registry-owned section order'
);
check_package_capability(
    !Assignments::isEnabled(
        $station['package_manager']['capability_assignments'],
        Assignments::OWNER_PACKAGE_MANAGER,
        Assignments::PACKAGE_MANAGER_ID,
        Assignments::CAPABILITY_TIERS
    ),
    'disabled assignment resolves disabled without deleting its row'
);

$unsupported = Assignments::sanitize([[
    'owner_type' => 'package-family',
    'owner_id' => 'kairos-iaas',
    'capability_key' => 'tiers',
    'enabled' => true,
]]);
check_package_capability($unsupported === [], 'unsupported Family ownership is not invented');

try {
    Assignments::upsert([], Assignments::OWNER_PACKAGE_MANAGER, Assignments::PACKAGE_MANAGER_ID, 'promotion', true);
    check_package_capability(false, 'unregistered future capability must be rejected');
} catch (InvalidArgumentException) {
    // Expected: no fake Promotion capability entry exists.
}

echo "Package capability assignment checks passed.\n";
