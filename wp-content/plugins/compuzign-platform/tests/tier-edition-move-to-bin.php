<?php

declare(strict_types=1);

/*
 * Admin-intent "Move Edition to Bin" — the atomic composition backing
 * PackageStationController::moveTierEditionToBinCommand(). This is a SEPARATE
 * command from the narrow PackageSchema::moveTierEditionToBin() exercised by
 * tests/tier-edition-bin.php (that primitive still means exactly what it
 * always meant: relocate an ALREADY archived/trashed Edition). This file
 * proves the composition the controller performs — trash-if-not-already-
 * binnable, then relocate, entirely in memory before any persistence exists
 * — is correct across every reachable Edition status, is side-effect-free
 * until applied, and never touches CZTE.
 *
 * There is no WP_REST_Request harness in this repository's PHP test suite
 * (every existing PHP test exercises PackageSchema/PackageRepository
 * directly — see tier-edition-bin.php's own convention); the controller's
 * own route registration and its "exactly one persistTierInstance() call"
 * structural guarantee are covered separately by source-scanning in
 * scripts/tier-edition-move-to-bin-contract.ts. This file proves the
 * PackageSchema-level composition those two call sites rely on is correct.
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

function check_move_to_bin(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Move Edition to Bin (atomic): ' . $message);
    }
}

/**
 * Mirrors PackageStationController::moveTierEditionToBinCommand() exactly:
 * trash-if-not-already-binnable, then relocate, both purely in memory. No
 * persistence exists at this layer — that boundary is the controller's own,
 * covered by the JS contract script.
 *
 * @param  array<string, mixed> $occupant
 * @return array{occupant: array<string, mixed>, entry: array<string, mixed>}|array{error: string}
 */
function move_to_bin_command(array $occupant, string $editionId): array
{
    $editions = $occupant['tier_editions'];
    $edition  = Schema::findTierEdition($editions, $editionId);
    if ($edition === null) {
        return ['error' => 'unknown_edition'];
    }
    if (!StationLifecycle::isBinned((string) $edition['platform_status'])) {
        $editions = Schema::applyTierEditionStatus($editions, $editionId, StationLifecycle::STATUS_TRASHED);
    }
    $occupant['tier_editions'] = $editions;
    return Schema::moveTierEditionToBin($occupant, $editionId, Schema::generateBinId(), '2026-08-09 00:00:00');
}

// ── Build an occupant with five Editions, one per reachable status ──────────

$occupantSlot = Schema::upsertOccupant([], ['label' => 'Professional', 'price' => 49.0], true);
$editions = [];
foreach (['Pending', 'Active', 'Disabled', 'Archived', 'Trashed'] as $label) {
    $result = Schema::addTierEdition($editions, ['title' => $label]);
    $editions = $result['tier_editions'];
}
[$pending, $active, $disabled, $archived, $trashed] = $editions;
$idPending = $pending['id']; $idActive = $active['id']; $idDisabled = $disabled['id'];
$idArchived = $archived['id']; $idTrashed = $trashed['id'];

// Pending stays exactly as addTierEdition() left it: disabled, never
// published, no CZTE — the "never-published" branch every other Edition
// surface already keys off (deriveTierEditionFooterState's hasBeenPublished).
$editions = Schema::applyTierEditionStatus($editions, $idActive, StationLifecycle::STATUS_ACTIVE);
$editions = Schema::replaceTierEdition($editions, array_merge(
    Schema::findTierEdition($editions, $idActive),
    ['edition_platform_id' => 'CZTE00000099'],
));
$editions = Schema::applyTierEditionStatus($editions, $idDisabled, StationLifecycle::STATUS_ACTIVE);
$editions = Schema::applyTierEditionDisabledMask($editions, $idDisabled, 'disable');
$editions = Schema::applyTierEditionStatus($editions, $idArchived, StationLifecycle::STATUS_ARCHIVED);
$editions = Schema::applyTierEditionStatus($editions, $idTrashed, StationLifecycle::STATUS_TRASHED);

check_move_to_bin(Schema::findTierEdition($editions, $idPending)['platform_status'] === 'disabled', 'sanity: Pending is disabled with no prior activation');
check_move_to_bin(Schema::findTierEdition($editions, $idPending)['previous_platform_status'] === null, 'sanity: Pending has never captured a previous status');
check_move_to_bin(Schema::findTierEdition($editions, $idActive)['platform_status'] === 'active', 'sanity: Active is active');
check_move_to_bin(Schema::findTierEdition($editions, $idDisabled)['platform_status'] === 'disabled', 'sanity: Disabled is disabled');
check_move_to_bin(Schema::findTierEdition($editions, $idDisabled)['previous_platform_status'] === 'active', 'sanity: Disabled captured its prior active status via the explicit mask');
check_move_to_bin(Schema::findTierEdition($editions, $idArchived)['platform_status'] === 'archived', 'sanity: Archived is archived');
check_move_to_bin(Schema::findTierEdition($editions, $idTrashed)['platform_status'] === 'trashed', 'sanity: Trashed is trashed');

$occupant = $occupantSlot['current_occupant'];
$occupant['tier_editions'] = $editions;

// ── 1. Pending -> Bin in one composed request: never a persisted Trashed-
//    but-unrelocated intermediate. No CZTE ever existed, none is created. ───

$pendingResult = move_to_bin_command($occupant, $idPending);
check_move_to_bin(!isset($pendingResult['error']), 'Pending moves to the bin in one composition: ' . ($pendingResult['error'] ?? ''));
$occupant = $pendingResult['occupant'];
check_move_to_bin(!in_array($idPending, array_column($occupant['tier_editions'], 'id'), true), '(1) Pending Edition leaves tier_editions[]');
check_move_to_bin(
    $pendingResult['entry']['edition']['id'] === $idPending && $pendingResult['entry']['status'] === 'trashed',
    '(1) Pending arrives in the bin already Trashed — the composed transition, not a separate visible step',
);
check_move_to_bin($pendingResult['entry']['edition']['edition_platform_id'] === '', '(1) a never-published Edition still carries no CZTE after Move to Bin');

// ── 2. Active -> Bin in one composed request. CZTE (already assigned) is
//    byte-identical; previous_platform_status is captured per the SAME
//    capturePrevious() rule the existing /status "Move to Trash" already
//    uses — this composition changes no lifecycle rule, only where the two
//    steps run and how many times the station is persisted. ────────────────

$activeResult = move_to_bin_command($occupant, $idActive);
check_move_to_bin(!isset($activeResult['error']), 'Active moves to the bin in one composition: ' . ($activeResult['error'] ?? ''));
$occupant = $activeResult['occupant'];
check_move_to_bin(!in_array($idActive, array_column($occupant['tier_editions'], 'id'), true), '(2) Active Edition leaves tier_editions[]');
check_move_to_bin($activeResult['entry']['status'] === 'trashed', '(2) Active arrives in the bin Trashed');
check_move_to_bin($activeResult['entry']['edition']['edition_platform_id'] === 'CZTE00000099', '(2) CZTE survives Move to Bin unchanged');
check_move_to_bin($activeResult['entry']['edition']['previous_platform_status'] === 'active', '(2) previous_platform_status captures the state Active left, exactly as applyTierEditionStatus already computes for any other caller');

// ── 3. Disabled -> Bin in one composed request. ──────────────────────────────

$disabledResult = move_to_bin_command($occupant, $idDisabled);
check_move_to_bin(!isset($disabledResult['error']), 'Disabled moves to the bin in one composition: ' . ($disabledResult['error'] ?? ''));
$occupant = $disabledResult['occupant'];
check_move_to_bin(!in_array($idDisabled, array_column($occupant['tier_editions'], 'id'), true), '(3) Disabled Edition leaves tier_editions[]');
check_move_to_bin($disabledResult['entry']['status'] === 'trashed', '(3) Disabled arrives in the bin Trashed');

// ── 4. Archived -> Bin DIRECTLY: the trash step is skipped entirely (already
//    binnable) — same underlying moveTierEditionToBin() the narrow endpoint
//    uses, proving the composition adds no extra transition when one isn't
//    needed. ────────────────────────────────────────────────────────────────

$archivedResult = move_to_bin_command($occupant, $idArchived);
check_move_to_bin(!isset($archivedResult['error']), 'Archived moves to the bin directly: ' . ($archivedResult['error'] ?? ''));
$occupant = $archivedResult['occupant'];
check_move_to_bin(!in_array($idArchived, array_column($occupant['tier_editions'], 'id'), true), '(4) Archived Edition leaves tier_editions[]');
check_move_to_bin($archivedResult['entry']['status'] === 'archived', '(4) Archived stays Archived in the bin — no trash step ran, because isBinned() was already true');

// ── 5. Trashed -> Bin DIRECTLY. ──────────────────────────────────────────────

$trashedResult = move_to_bin_command($occupant, $idTrashed);
check_move_to_bin(!isset($trashedResult['error']), 'Trashed moves to the bin directly: ' . ($trashedResult['error'] ?? ''));
$occupant = $trashedResult['occupant'];
check_move_to_bin(!in_array($idTrashed, array_column($occupant['tier_editions'], 'id'), true), '(5) Trashed Edition leaves tier_editions[]');
check_move_to_bin($trashedResult['entry']['status'] === 'trashed', '(5) Trashed stays Trashed in the bin');

// ── 6. Every Edition ended up binned; none reordered/duplicated/renumbered. ──

check_move_to_bin($occupant['tier_editions'] === [], '(6) every Edition left the active workspace; tier_editions[] is empty');
check_move_to_bin(count($occupant['tier_edition_bin']) === 5, '(6) all five land in tier_edition_bin[], one entry each');
check_move_to_bin(
    array_column($occupant['tier_edition_bin'], 'bin_id') === array_unique(array_column($occupant['tier_edition_bin'], 'bin_id')),
    '(6) each Move to Bin call mints its own distinct bin_id — no collision',
);

// ── 7. Unknown Edition id fails cleanly and mutates nothing — the same guard
//    the controller's try/catch relies on to skip persistTierInstance()
//    entirely on failure. ─────────────────────────────────────────────────────

$beforeUnknown = $occupant;
try {
    Schema::applyTierEditionStatus($occupant['tier_editions'], 'edt_ghost', StationLifecycle::STATUS_TRASHED);
    check_move_to_bin(false, '(7) applyTierEditionStatus must throw for an unknown Edition id');
} catch (InvalidArgumentException) {
    // Expected — the controller catches exactly this and returns 422 before
    // ever calling persistTierInstance().
}
check_move_to_bin($occupant === $beforeUnknown, '(7) a thrown exception before persistence leaves the in-memory occupant completely unmutated');

$unknownBinAttempt = move_to_bin_command($occupant, 'edt_ghost');
check_move_to_bin(($unknownBinAttempt['error'] ?? null) === 'unknown_edition', '(7) the composition helper itself reports unknown_edition cleanly for an id already trashed-checked away');

echo "Move Edition to Bin (atomic composition) contract: PASS\n";
