<?php

declare(strict_types=1);

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../src/Modules/Admin/Support/StationLifecycle.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageManagerSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/PackageSchema.php';
require_once __DIR__ . '/../src/Modules/SurfacePackages/Support/TierInstanceSchema.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema as Schema;

function check_tier_instance(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier instance schema: ' . $message);
    }
}

check_tier_instance(Schema::defaultInstances() === [], 'default collection is empty');
check_tier_instance(Schema::sanitizeInstances([]) === [], 'empty input sanitises to an empty collection');
check_tier_instance(Schema::sanitizeInstances([['title' => 'Missing id']]) === [], 'instance without an id is dropped');

$base = [
    'tier_instance_id' => 'ti_a',
    'title' => 'A',
    'status' => 'disabled',
    'allowed_rate_sheet_ids' => ['rs_a'],
    'popular_tier' => null,
    'popular_label' => '',
    'tiers' => Schema::emptyTierMap(),
    'occupant_bin' => [],
];
$duplicates = Schema::sanitizeInstances([$base, [...$base, 'title' => 'Duplicate']]);
check_tier_instance(count($duplicates) === 1 && $duplicates[0]['title'] === 'A', 'duplicate ids are first-wins');
check_tier_instance(array_keys(Schema::emptyTierMap()) === PackageSchema::ALLOWED_TIERS, 'empty map has all five fixed slots in order');

// A description is the instance's own optional field. It survives a round trip,
// defaults to empty rather than absent, and carries no Family vocabulary — the
// consumer link stays in TierAssignmentSchema.
$described = Schema::sanitizeInstances([[...$base, 'description' => "  Shared plans  \n"]]);
check_tier_instance($described[0]['description'] === 'Shared plans', 'description is stored sanitised');
$undescribed = Schema::sanitizeInstances([$base]);
check_tier_instance(
    array_key_exists('description', $undescribed[0]) && $undescribed[0]['description'] === '',
    'an absent description is stored as empty rather than dropped'
);
$smuggled = Schema::sanitizeInstances([[...$base, 'consumer_id' => 'pf_a', 'family_id' => 'pf_a']]);
check_tier_instance(
    !array_key_exists('consumer_id', $smuggled[0]) && !array_key_exists('family_id', $smuggled[0]),
    'an instance stores no consumer or Family field'
);

$allowed = Schema::sanitizeAllowedRateSheetIds(
    ['rs_b', 'unknown', 'rs_a', 'rs_b', ''],
    [['rate_sheet_id' => 'rs_a'], ['rate_sheet_id' => 'rs_b']]
);
check_tier_instance($allowed === ['rs_b', 'rs_a'], 'allow-list drops unknown ids, dedupes, and preserves order');

$active = $base;
$active['tiers']['basic'] = [
    'current_occupant' => ['id' => 'occ_a', 'platform_status' => 'active'],
    'history' => [],
];
$disabled = $active;
$disabled['tiers']['basic']['current_occupant']['platform_status'] = 'disabled';
check_tier_instance(Schema::deriveInstanceStatus($active) === 'active', 'live active occupant makes the instance active');
check_tier_instance(Schema::deriveInstanceStatus($disabled) === 'disabled', 'non-active occupants leave the instance disabled');
check_tier_instance(Schema::deriveStationStatusFromInstances([$disabled, $active]) === 'active', 'station status derives across instances');

$once = Schema::sanitizeInstances([$active]);
check_tier_instance(Schema::sanitizeInstances($once) === $once, 'sanitisation is idempotent');
check_tier_instance(!array_key_exists('consumer', $once[0]), 'sanitiser emits no consumer field');
foreach (array_keys($once[0]) as $key) {
    check_tier_instance(!str_starts_with($key, 'consumer'), 'sanitiser emits no consumer-prefixed key');
}

$minted = Schema::mintInstanceId();
check_tier_instance((bool) preg_match('/^ti_[0-9a-f]{12}$/', $minted), 'minted id has the canonical shape');
$source = file_get_contents(__DIR__ . '/../src/Modules/SurfacePackages/Support/TierInstanceSchema.php');
$sanitizeBody = substr($source, strpos($source, 'public static function sanitizeInstances'), strpos($source, 'public static function mintInstanceId') - strpos($source, 'public static function sanitizeInstances'));
check_tier_instance(!str_contains($sanitizeBody, 'mintInstanceId('), 'sanitisers never mint ids');

echo "Tier instance schema checks passed.\n";
