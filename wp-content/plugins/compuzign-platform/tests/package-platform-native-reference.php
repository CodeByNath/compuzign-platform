<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference as NativeReference;

function check_package_reference(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Package Platform native reference: ' . $message);
    }
}

$tierGroup = NativeReference::tierGroup('ti_primary');
check_package_reference(
    NativeReference::parse($tierGroup, 'tier-group', 1) === ['ti_primary'],
    'Tier Group uses tier_instance_id'
);

$occupant = NativeReference::tierOccupant('ti:instance', 'occ:traveller');
check_package_reference(
    NativeReference::parse($occupant, 'tier-occupant', 2) === ['ti:instance', 'occ:traveller'],
    'Tier and Add-on share one reversible instance-qualified occupant reference'
);
check_package_reference(
    NativeReference::tierOccupant('ti_a', 'occ_same') !== NativeReference::tierOccupant('ti_b', 'occ_same'),
    'the same occupant_id in different Tier Groups cannot collide'
);

$sheet = NativeReference::rateSheet('rs_primary');
check_package_reference(
    NativeReference::parse($sheet, 'rate-sheet', 1) === ['rs_primary'],
    'Rate Sheet uses rate_sheet_id'
);

$group = NativeReference::rateSheetGroup('rs:a', 'group:b');
check_package_reference(
    NativeReference::parse($group, 'rate-sheet-group', 2) === ['rs:a', 'group:b'],
    'Rate Sheet Group is qualified by Rate Sheet'
);
check_package_reference(
    NativeReference::rateSheetGroup('rs_a', 'shared') !== NativeReference::rateSheetGroup('rs_b', 'shared'),
    'the same group_id in different Rate Sheets cannot collide'
);

$item = NativeReference::rateSheetItem('rs:a', 'item:b');
check_package_reference(
    NativeReference::parse($item, 'rate-sheet-item', 2) === ['rs:a', 'item:b'],
    'Rate Sheet row is qualified only by rate_sheet_id + item_id'
);
check_package_reference(
    $item === NativeReference::rateSheetItem('rs:a', 'item:b'),
    'mutable group assignment cannot alter a Rate Sheet row native reference'
);

$rejected = false;
try {
    NativeReference::tierOccupant('', 'occ_a');
} catch (InvalidArgumentException) {
    $rejected = true;
}
check_package_reference($rejected, 'empty native-reference segments fail closed');

echo "Package Platform native-reference contract: OK\n";
