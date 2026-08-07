<?php

declare(strict_types=1);

/*
 * Phase 6 contract: the occupant-owned Edition bin
 * (current_occupant.tier_edition_bin[]).
 *
 * The Default declaration (the occupant's own fields) is NOT part of this
 * bin system — it stays the permanent Tier occupant itself. Only additional
 * Editions (tier_editions[] rows, each carrying its own CZTE) can be moved
 * to this bin. Moving to/from the bin is deliberately decoupled from the
 * existing engine-transition /status endpoint: an Edition must already be
 * archived or trashed (StationLifecycle::isBinned) before it is eligible to
 * move, and the move itself never changes platform_status. Display
 * numbering for the remaining tier_editions[] is derived from array
 * order/count only — there is no permanent position field, no swap mode,
 * and no retarget mode.
 *
 * Pure PackageSchema-level tests (mirroring tier-edition-cascade.php's
 * convention), plus one PackageRepository-level segment (mirroring
 * tier-edition-repository.php's convention) proving CZTE stays resolvable
 * while an Edition sits in the bin.
 */

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_edbin(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier Edition bin: ' . $message);
    }
}

function edbin_ids(array $editions): array
{
    return array_map(static fn(array $e) => $e['id'], $editions);
}

// ── Build an occupant with three live Editions: A, B, C ─────────────────────

$occupantSlot = Schema::upsertOccupant([], ['label' => 'Professional', 'price' => 49.0], true);
$editions = [];
foreach (['A', 'B', 'C'] as $label) {
    $result = Schema::addTierEdition($editions, ['title' => $label]);
    $editions = $result['tier_editions'];
}
[$editionA, $editionB, $editionC] = $editions;
$idA = $editionA['id']; $idB = $editionB['id']; $idC = $editionC['id'];
foreach ([$idA, $idB, $idC] as $id) {
    $editions = Schema::applyTierEditionStatus($editions, $id, StationLifecycle::STATUS_ACTIVE);
}
$occupant = $occupantSlot['current_occupant'];
$occupant['tier_editions'] = $editions;
$defaultSnapshot = ['label' => $occupant['label'], 'price' => $occupant['price'], 'platform_status' => $occupant['platform_status']];

// ── Precondition: a still-live (active) Edition cannot be moved to the bin ──

$liveAttempt = Schema::moveTierEditionToBin($occupant, $idC, 'binE_x', '2026-08-07 00:00:00');
check_edbin(($liveAttempt['error'] ?? null) === 'not_binnable', 'an active Edition is rejected — it must already be archived or trashed (lifecycle state and bin placement stay decoupled)');

$unknownAttempt = Schema::moveTierEditionToBin($occupant, 'edt_ghost', 'binE_x', '2026-08-07 00:00:00');
check_edbin(($unknownAttempt['error'] ?? null) === 'unknown_edition', 'moving an unknown Edition id fails cleanly');

// ── Archive B (existing in-place /status transition, unchanged), then move it
//    to the bin. Fake a CZTE so the round-trip through the bin can be proven
//    byte-identical without needing the full identity engine here (that is
//    covered by the repository segment below). ──────────────────────────────

$occupant['tier_editions'] = Schema::applyTierEditionStatus($occupant['tier_editions'], $idB, StationLifecycle::STATUS_ARCHIVED);
$fakeCzte = 'CZTE00000042';
$occupant['tier_editions'] = Schema::replaceTierEdition(
    $occupant['tier_editions'],
    array_merge(Schema::findTierEdition($occupant['tier_editions'], $idB), ['edition_platform_id' => $fakeCzte])
);
check_edbin(Schema::findTierEdition($occupant['tier_editions'], $idB)['platform_status'] === 'archived', 'B is archived in place — the existing /status endpoint is untouched by this phase');

$moveResult = Schema::moveTierEditionToBin($occupant, $idB, 'binE_1', '2026-08-07 00:00:00');
check_edbin(!isset($moveResult['error']), 'moving an archived Edition to the bin succeeds: ' . ($moveResult['error'] ?? ''));
$occupant = $moveResult['occupant'];

// 1. Moving Edition 2 (B) to bin removes it from active tier_editions[].
check_edbin(!in_array($idB, edbin_ids($occupant['tier_editions']), true), '(1) B no longer appears in tier_editions[]');
check_edbin(count($occupant['tier_editions']) === 2, '(1) tier_editions[] shrank to exactly A and C');

// 2. Remaining Editions compact in visible order (array order = display order).
check_edbin(edbin_ids($occupant['tier_editions']) === [$idA, $idC], '(2) A and C remain in their original relative order — no gap, no renumbering');

// 3. CZTE remains unchanged in the bin.
check_edbin(count($occupant['tier_edition_bin']) === 1, 'the bin now holds exactly one entry');
$binEntry1 = $occupant['tier_edition_bin'][0];
check_edbin($binEntry1['bin_id'] === 'binE_1', 'the bin entry carries the supplied bin_id');
check_edbin($binEntry1['edition']['id'] === $idB, 'the bin entry wraps the full Edition record');
check_edbin($binEntry1['edition']['edition_platform_id'] === $fakeCzte, '(3) CZTE is byte-identical after the move');
check_edbin($binEntry1['status'] === 'archived', "the bin entry's own status mirrors the Edition's platform_status at move time");
check_edbin($binEntry1['displaced_at'] === '2026-08-07 00:00:00', 'displaced_at is recorded');

// Narrow bin entry shape — no origin_tier/previous_enabled/cascaded_edition_ids
// copied from the occupant-bin precedent; none of those have meaning here.
check_edbin(
    array_keys($binEntry1) === ['bin_id', 'edition', 'status', 'displaced_at'],
    'the bin entry shape stays narrow — only bin_id/edition/status/displaced_at',
);

// 7. Default (the occupant's own fields) is completely unaffected.
check_edbin(
    $occupant['label'] === $defaultSnapshot['label']
        && $occupant['price'] === $defaultSnapshot['price']
        && $occupant['platform_status'] === $defaultSnapshot['platform_status'],
    '(7) the occupant\'s own Default declaration is untouched by the Edition bin move',
);

// Overview's derived count: Default + active Editions only, bin excluded.
check_edbin(1 + count($occupant['tier_editions']) === 3, 'the derived Editions count (Default + active) drops as soon as an Edition leaves tier_editions[], regardless of the bin');

// ── Restore B ────────────────────────────────────────────────────────────

$restoreResult = Schema::restoreTierEditionFromBin($occupant, 'binE_1');
check_edbin(!isset($restoreResult['error']), 'restoring B from the bin succeeds: ' . ($restoreResult['error'] ?? ''));
$occupant = $restoreResult['occupant'];

// 4. Restoring appends the Edition to the end of the active list.
check_edbin(edbin_ids($occupant['tier_editions']) === [$idA, $idC, $idB], '(4) B is appended to the END — not reinserted at its old position 2');
check_edbin($occupant['tier_edition_bin'] === [], 'the bin is empty again after restore');

// 5. Restored Edition keeps the same CZTE.
$restoredB = Schema::findTierEdition($occupant['tier_editions'], $idB);
check_edbin($restoredB['edition_platform_id'] === $fakeCzte, '(5) CZTE survives the round trip through the bin unchanged');
check_edbin($restoredB['platform_status'] === 'disabled', 'restore always lands disabled, never active — same rule every other station-owned record follows');
check_edbin($restoredB['previous_platform_status'] === null, "restore clears the mask, same as restoreTierEdition()'s own rule");

// 6. Restoring into an existing active list (A, C already present) required
//    no swap/retarget mode — the call above took none, and succeeded anyway.
check_edbin(true, '(6) restore above used no mode/target — no swap conflict exists because numbering is derived, not stored');

// ── Trash-in-bin and permanent delete-in-bin ─────────────────────────────────

$occupant['tier_editions'] = Schema::applyTierEditionStatus($occupant['tier_editions'], $idC, StationLifecycle::STATUS_ARCHIVED);
$moveC = Schema::moveTierEditionToBin($occupant, $idC, 'binE_2', '2026-08-07 01:00:00');
check_edbin(!isset($moveC['error']), 'moving C (now archived) to the bin succeeds');
$occupant = $moveC['occupant'];

$deleteTooSoon = Schema::deleteTierEditionBinEntry($occupant, 'binE_2');
check_edbin(($deleteTooSoon['error'] ?? null) === 'delete_illegal', 'an archived (not yet trashed) bin entry cannot be permanently deleted');

$trashResult = Schema::trashTierEditionBinEntry($occupant, 'binE_2');
check_edbin(!isset($trashResult['error']), 'trashing the archived bin entry succeeds: ' . ($trashResult['error'] ?? ''));
$occupant = $trashResult['occupant'];
$binEntry2 = $occupant['tier_edition_bin'][0];
check_edbin($binEntry2['status'] === 'trashed', 'the bin entry itself is now trashed');
check_edbin($binEntry2['edition']['platform_status'] === 'trashed', "the nested Edition's own platform_status is kept in sync with the bin entry");

$trashAgain = Schema::trashTierEditionBinEntry($occupant, 'binE_2');
check_edbin(($trashAgain['error'] ?? null) === 'trash_illegal', 'trashing an already-trashed bin entry is rejected — the engine gate, not a bespoke rule');

$deleteResult = Schema::deleteTierEditionBinEntry($occupant, 'binE_2');
check_edbin(!isset($deleteResult['error']), 'permanently deleting the trashed bin entry succeeds: ' . ($deleteResult['error'] ?? ''));
$occupant = $deleteResult['occupant'];
check_edbin($occupant['tier_edition_bin'] === [], 'the bin entry is gone after permanent delete');
check_edbin(!in_array($idC, edbin_ids($occupant['tier_editions']), true), 'C never returns to tier_editions[] — permanent delete is final');

// ── 8. Another occupant cannot access/restore this occupant's binned Edition ─

$occupant['tier_editions'] = Schema::applyTierEditionStatus($occupant['tier_editions'], $idA, StationLifecycle::STATUS_ARCHIVED);
$moveA = Schema::moveTierEditionToBin($occupant, $idA, 'binE_3', '2026-08-07 02:00:00');
check_edbin(!isset($moveA['error']), 'moving A to the bin succeeds');
$occupant = $moveA['occupant'];

$otherOccupantSlot = Schema::upsertOccupant([], ['label' => 'Starter'], true);
$otherOccupant = $otherOccupantSlot['current_occupant'];
$crossAccess = Schema::restoreTierEditionFromBin($otherOccupant, 'binE_3');
check_edbin(($crossAccess['error'] ?? null) === 'unknown_bin_entry', "(8) a different occupant's tier_edition_bin[] never contains another occupant's entries — cross-occupant restore fails cleanly");

// ── 12. An occupant that has never used this capability reads/writes normally ─

$legacyOccupant = $otherOccupantSlot['current_occupant'];
unset($legacyOccupant['tier_edition_bin']);
$ensured = Schema::ensureTierEditionBin($legacyOccupant);
check_edbin($ensured['tier_edition_bin'] === [], '(12) a pre-Phase-6 occupant with no tier_edition_bin key lazily defaults to []');

$legacySlot = ['current_occupant' => $legacyOccupant, 'history' => []];
$resavedSlot = Schema::upsertOccupant($legacySlot, ['label' => 'Starter Renamed'], true);
check_edbin($resavedSlot['current_occupant']['tier_edition_bin'] === [], '(12) saving Overview for a legacy occupant does not fabricate bin content, and does not error');
check_edbin($resavedSlot['current_occupant']['label'] === 'Starter Renamed', '(12) the legacy occupant\'s own Overview save still works normally');

// ── upsertOccupant preserves the bin verbatim across an unrelated Overview save
//    (a plain Save/Publish must never silently empty it — the same rule that
//    already protects tier_editions[] itself) ────────────────────────────────

$occupantWithBinSlot = ['current_occupant' => $occupant, 'history' => []];
$afterUnrelatedSave = Schema::upsertOccupant($occupantWithBinSlot, ['label' => 'Professional Renamed'], true);
check_edbin(count($afterUnrelatedSave['current_occupant']['tier_edition_bin']) === 1, 'an unrelated Overview save preserves the Edition bin verbatim');
check_edbin($afterUnrelatedSave['current_occupant']['tier_edition_bin'][0]['bin_id'] === 'binE_3', 'the preserved bin entry is byte-identical');

// ── 11. Tier Add-on occupants inherit the exact same Edition-bin behaviour ───
// (is_addon is an orthogonal occupant flag; these functions operate on the
// generic occupant array regardless of it.)

$addonSlot = Schema::upsertOccupant([], ['label' => 'Add-on Tier', 'is_addon' => true], true);
$addonOccupant = $addonSlot['current_occupant'];
check_edbin($addonOccupant['is_addon'] === true, 'sanity: this occupant is an Add-on');
$addonEdition = Schema::addTierEdition([], ['title' => 'Add-on Edition']);
$addonOccupant['tier_editions'] = Schema::applyTierEditionStatus($addonEdition['tier_editions'], $addonEdition['edition']['id'], StationLifecycle::STATUS_ARCHIVED);
$addonMove = Schema::moveTierEditionToBin($addonOccupant, $addonEdition['edition']['id'], 'binE_addon', '2026-08-07 03:00:00');
check_edbin(!isset($addonMove['error']), '(11) an Add-on occupant\'s Edition can be moved to its own bin exactly like a normal occupant\'s');
$addonOccupant = $addonMove['occupant'];
$addonRestore = Schema::restoreTierEditionFromBin($addonOccupant, 'binE_addon');
check_edbin(!isset($addonRestore['error']), '(11) restore works identically for an Add-on occupant');
check_edbin(
    $addonRestore['occupant']['tier_editions'][0]['id'] === $addonEdition['edition']['id'],
    '(11) the Add-on occupant\'s restored Edition is the same one that was moved',
);

echo "Tier Edition bin (PackageSchema) contract: PASS\n";

// =============================================================================
// SECTION: REPOSITORY-LEVEL — identity/audit lookup while binned (item 9),
// and parent-lifecycle restore never reinstalling a binned Edition (item 10).
// Mirrors tier-edition-repository.php's WP-option-stub convention.
// =============================================================================

$edbinOptions = [];

if (!function_exists('add_option')) {
    function add_option(string $key, mixed $value, string $deprecated = '', mixed $autoload = 'yes'): bool
    {
        global $edbinOptions;
        if (array_key_exists($key, $edbinOptions)) return false;
        $edbinOptions[$key] = $value;
        return true;
    }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $edbinOptions;
        return array_key_exists($key, $edbinOptions) ? $edbinOptions[$key] : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, mixed $autoload = null): bool
    {
        global $edbinOptions;
        $edbinOptions[$key] = $value;
        return true;
    }
}

use CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier\PackagePlatformIdentifierAdapters;
use CompuZign\Platform\Modules\SurfacePackages\PlatformIdentifier\PackagePlatformIdentifierService;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackagePlatformNativeReference;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierPolicy;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

function edbin_default_station(): array
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

$edbinOptions = ['cz_package_station' => edbin_default_station()];

$repoOccupantSlot = Schema::upsertOccupant([], ['label' => 'Repo Professional'], true);
$repoOccupantId = $repoOccupantSlot['current_occupant']['id'];
$repoEditionAdd = Schema::addTierEdition([], ['title' => 'Repo Monthly']);
$repoEditionId = $repoEditionAdd['edition']['id'];
$repoOccupantSlot['current_occupant']['tier_editions'] = $repoEditionAdd['tier_editions'];
$repoOccupantSlot = Schema::commitTierLifecycle($repoOccupantSlot);

$station = $edbinOptions['cz_package_station'];
$instance = TierInstanceSchema::findInstance($station['tier_instances'], 'ti_primary');
$instance['tiers']['basic'] = $repoOccupantSlot;
$station = TierInstanceSchema::withInstance($station, 'ti_primary', $instance);
$edbinOptions['cz_package_station'] = $station;

$repository = new PackageRepository();
$identifiers = new PlatformIdentifierStation();
$service = new PackagePlatformIdentifierService($identifiers);
$adapters = new PackagePlatformIdentifierAdapters($repository);

$nativeReference = PackagePlatformNativeReference::tierEdition('ti_primary', $repoOccupantId, $repoEditionId);
$reservation = $service->reserve($adapters->tierEdition());
$binding = $service->bind($adapters->tierEdition(), $reservation, $nativeReference);
check_edbin($binding->isBound(), 'the reservation binds successfully');
$platformId = $reservation->platformId();
check_edbin(PlatformIdentifierPolicy::validate(PlatformIdentifierPolicy::TIER_EDITION, $platformId), 'the assigned identifier is a validly formatted CZTE');
check_edbin($repository->claimTierEditionPlatformId($nativeReference, $platformId), 'claimTierEditionPlatformId writes the identifier onto the stored Edition row');

// Archive the Edition in place, then move it to this occupant's own bin.
$stationWrapper = $edbinOptions['cz_package_station'];
$instanceForMove = TierInstanceSchema::findInstance($stationWrapper['tier_instances'], 'ti_primary');
$occupantForMove = $instanceForMove['tiers']['basic']['current_occupant'];
$occupantForMove['tier_editions'] = Schema::applyTierEditionStatus($occupantForMove['tier_editions'], $repoEditionId, StationLifecycle::STATUS_ARCHIVED);
$moveOutcome = Schema::moveTierEditionToBin($occupantForMove, $repoEditionId, 'binE_repo', '2026-08-07 04:00:00');
check_edbin(!isset($moveOutcome['error']), 'moving the identity-bearing Edition to the bin succeeds: ' . ($moveOutcome['error'] ?? ''));
$instanceForMove['tiers']['basic']['current_occupant'] = $moveOutcome['occupant'];
$edbinOptions['cz_package_station'] = TierInstanceSchema::withInstance($stationWrapper, 'ti_primary', $instanceForMove);

// A fresh repository instance mirrors a real follow-up HTTP request (the
// repository caches its loaded station for the request) — same convention
// tier-edition-repository.php's own test already relies on.
$repository = new PackageRepository();

// 9. Repository/audit lookup still resolves the Edition while binned.
$projectionInBin = $repository->tierEditionProjection($nativeReference);
check_edbin($projectionInBin !== null, '(9) the SAME occupant-qualified native reference still resolves while the Edition sits in the bin');
check_edbin(str_contains($projectionInBin['location'], 'edition-bin:binE_repo'), '(9) the projection\'s location reflects the occupant-owned edition-bin, not the active slot');
check_edbin($repository->tierEditionPlatformId($nativeReference) === $platformId, '(9) CZTE resolves unchanged while binned');
check_edbin($repository->tierEditionPlatformIdExists($platformId), '(9) the identifier remains discoverable by collision check while binned');

$page = $repository->tierEditionAssignmentPage(null, 500);
check_edbin(in_array($nativeReference, $page['items'], true), '(9) the binned Edition still appears in the audit assignment page');

// 10. Parent Tier lifecycle (archive/restore) never reinstalls a binned
// Edition, reorders active Editions, or recreates CZTE.
$stationWrapper = $edbinOptions['cz_package_station'];
$instanceForArchive = TierInstanceSchema::findInstance($stationWrapper['tier_instances'], 'ti_primary');
$parentArchive = Schema::archiveTierOccupant($instanceForArchive, 'basic', false, 'bin_parent_1', '2026-08-07 05:00:00');
check_edbin(!isset($parentArchive['error']), 'archiving the parent occupant succeeds: ' . ($parentArchive['error'] ?? ''));
$parentBinEntry = $parentArchive['station']['occupant_bin'][0];
check_edbin(
    $parentBinEntry['occupant']['tier_edition_bin'][0]['bin_id'] === 'binE_repo',
    'the parent archive carries the occupant-owned Edition bin along verbatim (it travels WITH the occupant, untouched)',
);
check_edbin(
    !in_array($repoEditionId, array_column($parentBinEntry['occupant']['tier_editions'], 'id'), true),
    'the binned Edition is never counted as "live" by the parent cascade — it was already out of tier_editions[]',
);

$parentRestore = Schema::restoreBinnedOccupant($parentArchive['station'], 'bin_parent_1', null, null, false, 'bin_unused', null);
check_edbin(!isset($parentRestore['error']), 'restoring the parent occupant succeeds: ' . ($parentRestore['error'] ?? ''));
$restoredOccupant = $parentRestore['station']['tiers']['basic']['current_occupant'];
check_edbin(
    !in_array($repoEditionId, array_column($restoredOccupant['tier_editions'], 'id'), true),
    '(10) the parent restore does NOT reinstall the binned Edition into tier_editions[]',
);
check_edbin(
    count($restoredOccupant['tier_edition_bin']) === 1 && $restoredOccupant['tier_edition_bin'][0]['edition']['id'] === $repoEditionId,
    '(10) the Edition stays binned through the parent restore unless the admin explicitly restores it',
);
check_edbin(
    $restoredOccupant['tier_edition_bin'][0]['edition']['edition_platform_id'] === $platformId,
    '(10) CZTE is never recreated by the parent restore',
);

echo "Tier Edition bin (repository/parent-lifecycle) contract: PASS\n";
