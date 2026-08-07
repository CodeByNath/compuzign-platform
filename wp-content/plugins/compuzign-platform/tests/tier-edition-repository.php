<?php

declare(strict_types=1);

/*
 * Phase 2 contract: Package Station Edition repository operations.
 *
 * Covers PackageSchema::findTierEdition/replaceTierEdition/addTierEdition/
 * deleteTierEdition (the array-of-records "find -> validate -> mutate ->
 * replace" pattern mirrored from PackageCategoryGroups::find()/replace()/
 * delete()), plus the identity guarantee that actually justifies an
 * occupant-qualified (not slot-qualified) native reference: a Tier
 * Edition's CZTE must keep resolving to the same Edition after its parent
 * occupant is archived, sits in the bin, and is restored into a DIFFERENT
 * slot (mode=retarget) — exercised against the real PackageRepository,
 * PlatformIdentifierStation, and PackagePlatformIdentifierService/Adapters,
 * only WordPress core functions stubbed (matching tier-occupant-platform-
 * identity.php's convention).
 */

$terOptions = [];

if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $terOptions;
        if (array_key_exists($key, $terOptions)) return false;
        $terOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $terOptions;
        return array_key_exists($key, $terOptions) ? $terOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $terOptions;
        $terOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier\PackagePlatformIdentifierAdapters;
use CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier\PackagePlatformIdentifierService;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function check_edition_repo(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier Edition repository: ' . $message);
    }
}

// ── findTierEdition / replaceTierEdition ─────────────────────────────────────

$editions = Schema::sanitizeTierEditions([
    ['id' => 'edt_a', 'title' => 'Monthly'],
    ['id' => 'edt_b', 'title' => 'Annual'],
]);
check_edition_repo(Schema::findTierEdition($editions, 'edt_b')['title'] === 'Annual', 'findTierEdition locates the matching row');
check_edition_repo(Schema::findTierEdition($editions, 'edt_ghost') === null, 'findTierEdition returns null for an unknown id');

$renamed = Schema::findTierEdition($editions, 'edt_b');
$renamed['title'] = 'Yearly';
$replaced = Schema::replaceTierEdition($editions, $renamed);
check_edition_repo(Schema::findTierEdition($replaced, 'edt_b')['title'] === 'Yearly', 'replaceTierEdition updates the matching row');
check_edition_repo(Schema::findTierEdition($replaced, 'edt_a')['title'] === 'Monthly', 'replaceTierEdition leaves the sibling row untouched');
check_edition_repo(count(Schema::replaceTierEdition($editions, ['id' => 'edt_ghost', 'title' => 'X'])) === 2, 'replaceTierEdition against an unknown id is a no-op, not an insert');

// ── addTierEdition ────────────────────────────────────────────────────────────

try {
    Schema::addTierEdition([], []);
    check_edition_repo(false, 'addTierEdition rejects a missing title');
} catch (InvalidArgumentException) {
    check_edition_repo(true, 'addTierEdition rejects a missing title');
}

$added = Schema::addTierEdition([], ['title' => 'Monthly', 'billing_cycle' => 'monthly']);
check_edition_repo(count($added['tier_editions']) === 1, 'addTierEdition appends exactly one row');
check_edition_repo(str_starts_with($added['edition']['id'], 'edt_'), 'addTierEdition mints its own id');
check_edition_repo($added['edition']['platform_status'] === 'disabled', 'a new Edition is born disabled, mirroring Package Family row creation');
check_edition_repo($added['edition']['edition_platform_id'] === '', 'a new Edition mints no Platform identifier at creation time — that is the settlement boundary\'s job');
check_edition_repo($added['edition']['billing_cycle'] === 'monthly', 'addTierEdition applies the supplied editable fields');

$addedSecond = Schema::addTierEdition($added['tier_editions'], ['title' => 'Annual']);
check_edition_repo(count($addedSecond['tier_editions']) === 2, 'a second addTierEdition call appends alongside the first, not replacing it');
check_edition_repo($addedSecond['tier_editions'][0]['id'] !== $addedSecond['tier_editions'][1]['id'], 'the two Editions have distinct minted ids');

// ── deleteTierEdition guards ──────────────────────────────────────────────────

$twoEditions = $addedSecond['tier_editions'];
$firstId  = $twoEditions[0]['id'];
$secondId = $twoEditions[1]['id'];

try {
    Schema::deleteTierEdition($twoEditions, $firstId);
    check_edition_repo(false, 'a disabled (not trashed) Edition cannot be permanently deleted');
} catch (InvalidArgumentException) {
    check_edition_repo(true, 'a disabled (not trashed) Edition cannot be permanently deleted');
}

try {
    Schema::deleteTierEdition($twoEditions, 'edt_ghost');
    check_edition_repo(false, 'deleting an unknown Edition id throws rather than silently no-op-ing');
} catch (InvalidArgumentException) {
    check_edition_repo(true, 'deleting an unknown Edition id throws rather than silently no-op-ing');
}

$firstTrashed = Schema::findTierEdition($twoEditions, $firstId);
$firstTrashed['platform_status'] = 'trashed';
$trashedEditions = Schema::replaceTierEdition($twoEditions, $firstTrashed);

// There is no "current default Edition" guard any more: the occupant's own
// declaration is the permanent Default and is never represented by a row in
// tier_editions[], so a trashed Edition — whichever one it is — can always
// be permanently deleted once trashed.
$afterDelete = Schema::deleteTierEdition($trashedEditions, $firstId);
check_edition_repo(count($afterDelete) === 1 && $afterDelete[0]['id'] === $secondId, 'a trashed Edition is permanently deleted, leaving its sibling untouched');

$parentDeletion = Schema::deleteTierEdition($twoEditions, $firstId, true);
check_edition_repo(count($parentDeletion) === 1 && $parentDeletion[0]['id'] === $secondId, 'isParentDeletion bypasses the trashed-only guard, for whole-occupant/Tier deletion');

// ── Occupant-qualified identity survives slot swap/retarget ─────────────────
//
// This is the guarantee the whole occupant-qualified (not slot-qualified)
// native reference design exists to prove: CZTE must keep resolving to the
// same Edition after its parent occupant moves to a different slot.

function ter_default_station(): array
{
    $primaryInstance = [
        'tier_instance_id' => 'ti_primary', 'cz_platform_id' => '',
        'title' => 'Primary Tier Set', 'description' => '', 'status' => 'disabled',
        'allowed_rate_sheet_ids' => [], 'popular_tier' => null, 'popular_label' => '',
        'tiers' => TierInstanceSchema::emptyTierMap(), 'occupant_bin' => [],
    ];
    return [
        'platform_status' => 'disabled',
        'tier_instances' => [$primaryInstance],
        'tier_assignments' => [], 'sort_position' => 0,
        'bundle' => ['title' => '', 'description' => '', 'price' => null],
        'promotions' => [], 'package_manager' => PackageManagerSchema::defaultManager(),
        'legacy_host_service_id' => 909,
    ];
}

$terOptions = ['cz_package_station' => ter_default_station()];

// Build a settled occupant carrying one Edition, in slot 'basic'.
$occupantSlot = Schema::upsertOccupant([], ['label' => 'Professional'], true);
$occupantId   = $occupantSlot['current_occupant']['id'];
$editionAdd   = Schema::addTierEdition([], ['title' => 'Monthly']);
$editionId    = $editionAdd['edition']['id'];
$occupantSlot['current_occupant']['tier_editions'] = $editionAdd['tier_editions'];
$occupantSlot = Schema::commitTierLifecycle($occupantSlot);

$station = $terOptions['cz_package_station'];
$instance = TierInstanceSchema::findInstance($station['tier_instances'], 'ti_primary');
$instance['tiers']['basic'] = $occupantSlot;
$station = TierInstanceSchema::withInstance($station, 'ti_primary', $instance);
$terOptions['cz_package_station'] = $station;

// Assign CZTE through the real identity engine (Phase 1's claim path),
// exactly as the settlement boundary will do starting Phase 3.
$repository = new PackageRepository();
$identifiers = new PlatformIdentifierStation();
$service = new PackagePlatformIdentifierService($identifiers);
$adapters = new PackagePlatformIdentifierAdapters($repository);

$nativeReference = PackagePlatformNativeReference::tierEdition('ti_primary', $occupantId, $editionId);
$reservation = $service->reserve($adapters->tierEdition());
$binding = $service->bind($adapters->tierEdition(), $reservation, $nativeReference);
check_edition_repo($binding->isBound(), 'the reservation binds successfully');
$platformId = $reservation->platformId();
check_edition_repo(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION, $platformId), 'the assigned identifier is a validly formatted CZTE');

// The bind() call above only updated the registry option, not the domain
// row — mirror the settlement boundary's own write-back (see
// settlePackageStationTier's `$slot['current_occupant']['cz_platform_id'] = ...`
// for the CZT/CZTA precedent this Edition follows).
check_edition_repo($repository->claimTierEditionPlatformId($nativeReference, $platformId), 'claimTierEditionPlatformId writes the identifier onto the stored Edition row');
check_edition_repo($repository->claimTierEditionPlatformId($nativeReference, $platformId), 'claiming the same identifier again is idempotent');

$projectionBeforeMove = $repository->tierEditionProjection($nativeReference);
check_edition_repo($projectionBeforeMove['location'] === 'slot:basic', 'before any move, the Edition resolves to slot:basic');
check_edition_repo($repository->tierEditionPlatformId($nativeReference) === $platformId, 'the identifier resolves correctly while still in its original slot');
check_edition_repo($repository->tierEditionPlatformIdExists($platformId), 'the identifier is discoverable by collision check while in its original slot');

// Archive the occupant out of 'basic' — the whole occupant (Edition array
// included) travels into occupant_bin verbatim, exactly like CZT/CZTA/
// is_addon already do; see PackageSchema::archiveTierOccupant. Both
// archiveTierOccupant and restoreBinnedOccupant operate on the INSTANCE
// shape (top-level `tiers`/`occupant_bin`), not the full cz_package_station
// wrapper — the same convention TierInstanceSchema::withInstance() writes
// back through.
$stationWrapper = $terOptions['cz_package_station'];
$instanceForArchive = TierInstanceSchema::findInstance($stationWrapper['tier_instances'], 'ti_primary');
$archiveResult = Schema::archiveTierOccupant($instanceForArchive, 'basic', false, 'bin_1', '2026-08-06 00:00:00');
check_edition_repo(!isset($archiveResult['error']), 'archiving the occupant succeeds: ' . ($archiveResult['error'] ?? ''));
$terOptions['cz_package_station'] = TierInstanceSchema::withInstance($stationWrapper, 'ti_primary', $archiveResult['station']);

// PackageRepository caches its loaded station for the request (see
// $stationCache in loadStation()) — a fresh instance mirrors what a real
// follow-up HTTP request gets, exactly like the precedent
// tier-occupant-platform-identity.php test's topi_new_controller() helper.
$repository = new PackageRepository();

$projectionInBin = $repository->tierEditionProjection($nativeReference);
check_edition_repo($projectionInBin['location'] === 'bin:bin_1', 'while archived, the SAME native reference now resolves to the bin location');
check_edition_repo($repository->tierEditionPlatformId($nativeReference) === $platformId, 'the identifier is unchanged while the occupant sits in the bin');

// Restore into a DIFFERENT slot — mode=retarget is the actual swap/retarget
// mechanism PackageSchema::restoreBinnedOccupant already implements.
$stationWrapper = $terOptions['cz_package_station'];
$instanceForRestore = TierInstanceSchema::findInstance($stationWrapper['tier_instances'], 'ti_primary');
$restoreResult = Schema::restoreBinnedOccupant($instanceForRestore, 'bin_1', 'retarget', 'standard', false, 'bin_2', null);
check_edition_repo(!isset($restoreResult['error']), 'retargeting the occupant into a new slot succeeds: ' . ($restoreResult['error'] ?? ''));
check_edition_repo($restoreResult['tier_id'] === 'standard', 'the occupant lands in the requested target slot');
$terOptions['cz_package_station'] = TierInstanceSchema::withInstance($stationWrapper, 'ti_primary', $restoreResult['station']);
$repository = new PackageRepository();

$projectionAfterMove = $repository->tierEditionProjection($nativeReference);
check_edition_repo($projectionAfterMove !== null, 'the SAME occupant-qualified reference still resolves after the slot changed');
check_edition_repo($projectionAfterMove['location'] === 'slot:standard', 'the Edition now resolves to its occupant\'s new slot, not its old one');
check_edition_repo($repository->tierEditionPlatformId($nativeReference) === $platformId, 'CZTE is byte-identical after retarget — occupant-qualified addressing survived the slot change');
check_edition_repo($repository->tierEditionPlatformIdExists($platformId), 'the identifier remains discoverable by collision check after retarget');

$instanceAfterMove = TierInstanceSchema::findInstance($terOptions['cz_package_station']['tier_instances'], 'ti_primary');
check_edition_repo(
    ($instanceAfterMove['tiers']['basic']['current_occupant'] ?? null) === null,
    'the old slot (basic) is genuinely empty after retarget, not merely superseded'
);
check_edition_repo(
    count($instanceAfterMove['tiers']['standard']['current_occupant']['tier_editions'] ?? []) === 1,
    'the Edition array itself travelled intact into the new slot'
);

echo "Tier Edition repository contract: PASS\n";
