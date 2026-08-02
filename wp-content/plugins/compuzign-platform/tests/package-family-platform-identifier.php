<?php

declare(strict_types=1);

$packageFamilyIdentifierOptions = [];

if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $packageFamilyIdentifierOptions;
        return $packageFamilyIdentifierOptions[$key] ?? $default;
    }
}
if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', string|bool $autoload = 'yes'): bool
    {
        global $packageFamilyIdentifierOptions;
        if (array_key_exists($key, $packageFamilyIdentifierOptions)) return false;
        $packageFamilyIdentifierOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $packageFamilyIdentifierOptions;
        $packageFamilyIdentifierOptions[$key] = $value;
        return true;
    }
}

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string
    {
        return trim(strip_tags((string) $value));
    }
}

require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageCategoryGroups.php';
require_once __DIR__ . '/../src/PlatformIdentifier/PlatformIdentifierConflict.php';
require_once __DIR__ . '/../src/PlatformIdentifier/PlatformIdentifierPolicy.php';
require_once __DIR__ . '/../src/PlatformIdentifier/PlatformIdentifier.php';
require_once __DIR__ . '/../src/PlatformIdentifier/PlatformIdentifierReservation.php';
require_once __DIR__ . '/../src/PlatformIdentifier/PlatformIdentifierBinding.php';
require_once __DIR__ . '/../src/PlatformIdentifier/PlatformIdentifierBatchResult.php';
require_once __DIR__ . '/../src/PlatformIdentifier/PlatformIdentifierStation.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageCategoryGroups;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function package_family_identifier_check(bool $condition, string $message): void
{
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

package_family_identifier_check(
    PlatformIdentifierPolicy::prefix(PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP) === 'CZPG',
    'Package Family uses the locked CZPG prefix'
);
package_family_identifier_check(
    PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP, 'CZPG2A7KZ'),
    'CZPG identifier validates for package_family_group'
);

$created = PackageCategoryGroups::create([], 'KAIROS', '', 'pcg_kairos', 'CZPG2A7KZ');
$stored = $created['groups'][0];
package_family_identifier_check($stored['group_id'] === 'pcg_kairos', 'native string identity remains authoritative');
package_family_identifier_check($stored['cz_platform_id'] === 'CZPG2A7KZ', 'Package row owns the scalar identity');

$sanitized = PackageCategoryGroups::sanitizeAll([$stored]);
package_family_identifier_check($sanitized[0]['cz_platform_id'] === 'CZPG2A7KZ', 'sanitization preserves immutable scalar identity');
$projection = PackageCategoryGroups::projection($sanitized[0]);
package_family_identifier_check($projection['platform_id'] === 'CZPG2A7KZ', 'projection exposes output-only Platform identity');

$ownerRows = ['pcg_runtime' => ''];
$identifiers = new PlatformIdentifierStation(static fn(int $minimum, int $maximum): int => 0);
$reservation = $identifiers->reserve(PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP);
$binding = $identifiers->assign(
    $reservation,
    'pcg_runtime',
    static function (int|string $nativeReference) use (&$ownerRows): string {
        return $ownerRows[(string) $nativeReference] ?? '';
    },
    static function (int|string $nativeReference, string $platformId) use (&$ownerRows): bool {
        $key = (string) $nativeReference;
        if (($ownerRows[$key] ?? '') !== '') return false;
        $ownerRows[$key] = $platformId;
        return true;
    }
);
package_family_identifier_check($binding->platformId() === 'CZPG22222', 'reservation binds CZPG to the string native identity');
package_family_identifier_check($ownerRows['pcg_runtime'] === 'CZPG22222', 'owner scalar reads back the exact reservation');
package_family_identifier_check(
    $identifiers->lookupNative(PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP, 'pcg_runtime')?->platformId() === 'CZPG22222',
    'reverse lookup preserves the Package-owned string identity'
);
$identifiers->markDeleted(PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP, 'pcg_runtime');
package_family_identifier_check(
    $identifiers->resolve('CZPG22222')?->isDeleted() === true,
    'permanent deletion retains the CZPG tombstone'
);

$controller = file_get_contents(__DIR__ . '/../src/Modules/SurfacePackages/Http/PackageFamiliesController.php');
$module = file_get_contents(__DIR__ . '/../src/Modules/SurfacePackages/SurfacePackagesModule.php');
$plugin = file_get_contents(__DIR__ . '/../src/Core/Plugin.php');
package_family_identifier_check(str_contains($controller, 'PACKAGE_FAMILY_GROUP'), 'controller reserves the closed Package Family entity type');
package_family_identifier_check(str_contains($controller, 'assignIdentifier($reservation, $groupId)'), 'create binds after native identity is known');
package_family_identifier_check(str_contains($controller, 'rejectPlatformIdMutation'), 'writable Family routes reject identity mutation');
package_family_identifier_check(str_contains($controller, 'markDeleted(PlatformIdentifierPolicy::PACKAGE_FAMILY_GROUP'), 'permanent deletion tombstones identity');
package_family_identifier_check(str_contains($module, 'PackageFamiliesController($this->platformIdentifiers)'), 'SurfacePackages injects the shared Station into the controller');
package_family_identifier_check(str_contains($plugin, 'SurfacePackagesModule($platformIdentifiers)'), 'Core supplies the one shared Station');
package_family_identifier_check(str_contains($controller, '/admin/package-families/'), 'approved canonical Platform-ID GET route is present');

echo "Package Family Platform identifier contract passed.\n";
