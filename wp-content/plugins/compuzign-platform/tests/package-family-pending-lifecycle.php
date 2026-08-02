<?php

declare(strict_types=1);

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string
    {
        return trim(strip_tags((string) $value));
    }
}

require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageCategoryGroups.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;

function package_family_pending_check(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

function package_family_pending_throws(callable $operation, string $message): void
{
    try {
        $operation();
    } catch (InvalidArgumentException) {
        return;
    }
    fwrite(STDERR, "FAIL: {$message}\n");
    exit(1);
}

$created = PackageCategoryGroups::create([], 'KAIROS', 'Initial text.', 'pcg_kairos');
$family = $created['groups'][0];
package_family_pending_check($family['platform_status'] === 'disabled', 'new Family uses raw disabled storage');
package_family_pending_check($family['previous_platform_status'] === null, 'new Family has no explicit Disable mask');
package_family_pending_check($family['module_status']['overview'] === 'pending', 'new Family Overview remains pending');

package_family_pending_throws(
    fn() => PackageCategoryGroups::saveOverviewDraft($created['groups'], 'pcg_kairos', ' ', 'Rejected'),
    'blank existing Overview save must be rejected'
);

$groups = PackageCategoryGroups::saveOverviewDraft($created['groups'], 'pcg_kairos', 'KAIROS', '');
$groups = PackageCategoryGroups::settleOverview($groups, 'pcg_kairos');
package_family_pending_check($groups[0]['description'] === '', 'empty description clears the authoritative value');
package_family_pending_check($groups[0]['module_status']['overview'] === 'settled', 'settle affects the existing Family only');

echo "Package Family pending lifecycle contract passed.\n";
