<?php

declare(strict_types=1);

/**
 * One-off reconciliation: clear the stale legacy "Contact Us" override from
 * Tier occupants inside the MIGRATED Tier Instance.
 *
 *   wp eval-file tools/repair-legacy-contact-override.php                 # dry run
 *   wp eval-file tools/repair-legacy-contact-override.php apply KAIROS    # persist, scoped
 *
 * WHY THE OVERRIDE EXISTS
 * The pre-Rate-Sheet, Service-hosted station published an unpriced Tier by
 * setting `contact => true`. PackageRepository::migrateFromLegacyServiceMeta()
 * copied that station into the option RAW (`update_option`, no field
 * normalisation), TierInstanceSchema::liftLegacyStation() copied `tiers`
 * verbatim into ti_primary, and every write since has preserved the value
 * through `??` fallbacks (PackageSchema::buildOccupantSlot,
 * PackageSchema::settleTierSlot). Nothing in the codebase derives or clears it,
 * and PackageStationSchema::evaluateTierPricing tests `$contact` BEFORE
 * completeness — so the stale flag beats a fully healthy Rate Sheet binding.
 *
 * SCOPE OF THE RECONCILIATION CRITERION
 * "Complete numeric price + contact === true" is NOT treated as a
 * platform-wide invariant — an administrator may legitimately run internal
 * calculated pricing behind a contact-only sales model. It is used here only
 * as the historical fingerprint of THIS migration, and is therefore
 * additionally constrained to the migrated Tier Instance
 * (TierInstanceSchema::PRIMARY_INSTANCE_ID). An occupant carrying the same
 * combination in any later, natively-created instance is left alone.
 *
 * NEVER TOUCHED
 *   - tier_editions[] / tier_edition_bin[] — an Edition owns its own separate
 *     `contact`; this file only ever assigns current_occupant['contact'] and a
 *     pre-existing overview draft's own 'contact' key.
 *   - occupant_bin[] (archived/trashed occupants).
 *   - Occupants that cannot produce a price without the override.
 *
 * Defining CZ_LEGACY_CONTACT_DEFINE_ONLY before including this file loads the
 * pure helpers without running the command (used by
 * tests/legacy-contact-override-repair.php).
 */

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

/**
 * Decide what to do with one Tier slot. Pure — reads, never writes.
 *
 * @param  array<string, mixed> $slot      raw tier slot (occupant format or legacy flat)
 * @param  array<string, mixed> $readModel PackageManagerSchema::buildReadModel() output
 * @param  bool $isMigratedInstance        slot belongs to PRIMARY_INSTANCE_ID
 * @return array{decision: string, reason: string, price: float|null}
 */
function cz_legacy_contact_decision(array $slot, array $readModel, bool $isMigratedInstance): array
{
    $skip = static fn(string $reason): array => ['decision' => 'skip', 'reason' => $reason, 'price' => null];

    if (!PackageSchema::isOccupantFormat($slot) || !is_array($slot['current_occupant'] ?? null)) {
        return $skip('no occupant');
    }
    if (empty($slot['current_occupant']['contact'])) {
        return $skip('no override');
    }

    // The historical constraint. A natively-created instance never inherited
    // anything, so its override is an administrator's own decision.
    if (!$isMigratedInstance) {
        return ['decision' => 'keep', 'reason' => 'not the migrated instance', 'price' => null];
    }

    $extracted = PackageSchema::extractTierForCostBuilder($slot);
    if ($extracted === null) {
        return $skip('no occupant');
    }

    // Deliberately projects with contact = false: "would this occupant price
    // itself if the override were gone?" is the entire test.
    $projection = PackageManagerSchema::projectTierRateSheetWith(
        $readModel,
        $extracted['rate_sheet_items'] ?? [],
        $extracted['rate_sheet_id'] ?? null,
        false
    );

    if ($projection['price'] === null) {
        $reasons = [];
        foreach ($projection['selections'] as $row) {
            foreach ($row['health_reasons'] ?? [] as $reason) {
                $reasons[$reason] = true;
            }
        }
        return [
            'decision' => 'keep',
            'reason'   => $projection['selections'] === []
                ? 'no Rate Sheet selections'
                : (implode(',', array_keys($reasons)) ?: 'incomplete pricing'),
            'price'    => null,
        ];
    }

    return ['decision' => 'clear', 'reason' => 'stale migrated override', 'price' => (float) $projection['price']];
}

/**
 * Clear the override on one slot. Pure — returns a new slot, mutates nothing
 * else. Assigns exactly two keys and never reads or writes Editions, the
 * Edition bin, history, or any other occupant field.
 *
 * @param  array<string, mixed> $slot
 * @return array{0: array<string, mixed>, 1: bool} [$slot, $clearedAPendingDraft]
 */
function cz_legacy_contact_clear(array $slot): array
{
    $slot['current_occupant']['contact'] = false;

    // settleTierSlot() resolves `$ov['contact'] ?? ($occ['contact'] ?? false)`,
    // so a pending Overview draft still saying true would re-apply the override
    // on the next Publish. Clear it only when such a draft already exists —
    // never create one.
    $clearedDraft = false;
    if (is_array($slot['drafts']['overview'] ?? null) && !empty($slot['drafts']['overview']['contact'])) {
        $slot['drafts']['overview']['contact'] = false;
        $clearedDraft = true;
    }

    return [$slot, $clearedDraft];
}

if (defined('CZ_LEGACY_CONTACT_DEFINE_ONLY')) {
    return;
}

// ── Command ─────────────────────────────────────────────────────────────────

$czOut = static function (string $line = ''): void { echo $line, PHP_EOL; };

$apply       = in_array('apply', $args ?? [], true);
$familyScope = '';
foreach ($args ?? [] as $arg) {
    if ($arg !== 'apply') { $familyScope = strtolower(trim((string) $arg)); break; }
}

$repo    = new PackageRepository();
$station = $repo->loadStation();
if ($station === null) {
    $czOut('No cz_package_station option found.');
    return;
}

$manager = is_array($station['package_manager'] ?? null)
    ? PackageManagerSchema::sanitize($station['package_manager'])
    : PackageManagerSchema::defaultManager();
[$inclusionPool, $faqPool] = $repo->sourcePools($station);
$readModel = PackageManagerSchema::buildReadModel(
    (int) ($station['legacy_host_service_id'] ?? 0),
    $manager,
    $inclusionPool,
    $faqPool,
    'active'
);

$sanitizedInstances = TierInstanceSchema::sanitizeInstances($station['tier_instances'] ?? []);
$assignments = TierAssignmentSchema::sanitizeAssignments(
    $station['tier_assignments'] ?? [],
    ['package_family' => TierAssignmentSchema::consumerRegistryFor('package_family', $manager)],
    $sanitizedInstances
);
$familyByInstance = [];
foreach ($manager['category_groups'] as $family) {
    $assignment = TierAssignmentSchema::findForConsumer($assignments, 'package_family', (string) ($family['group_id'] ?? ''));
    if ($assignment !== null) {
        $familyByInstance[(string) ($assignment['tier_instance_id'] ?? '')][] = (string) ($family['title'] ?? '');
    }
}

$czOut($apply
    ? '*** APPLY — changes will be persisted ***'
    : '*** DRY RUN — nothing is written (append "apply" to persist) ***');

$cleared = 0; $kept = 0; $draftsCleared = 0;
$editionsInspected = 0; $editionsChanged = 0;
$archivedInspected = 0; $archivedChanged = 0;
$touched = false;

foreach ($station['occupant_bin'] ?? [] as $binEntry) {
    if (is_array($binEntry)) { $archivedInspected++; }
}
foreach ($station['tier_instances'] ?? [] as $instance) {
    foreach ($instance['occupant_bin'] ?? [] as $binEntry) {
        if (is_array($binEntry)) { $archivedInspected++; }
    }
}

foreach ($station['tier_instances'] ?? [] as $instanceIndex => $instance) {
    $instanceId = (string) ($instance['tier_instance_id'] ?? '');
    $families   = $familyByInstance[$instanceId] ?? [];
    $familyName = $families === [] ? '(unassigned)' : implode(' + ', $families);

    if ($familyScope !== '' && stripos($familyName, $familyScope) === false) {
        continue;
    }

    $isMigrated = $instanceId === TierInstanceSchema::PRIMARY_INSTANCE_ID;

    $czOut();
    $czOut(sprintf('%s   [%s "%s"%s]',
        strtoupper($familyName), $instanceId, (string) ($instance['title'] ?? ''),
        $isMigrated ? ', migrated' : ', natively created'));
    $czOut();

    foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
        $slot = $instance['tiers'][$tierId] ?? [];
        if (!is_array($slot)) { continue; }

        $occupant = PackageSchema::isOccupantFormat($slot) ? ($slot['current_occupant'] ?? null) : null;
        if (is_array($occupant)) {
            $editionsInspected += count(is_array($occupant['tier_editions'] ?? null) ? $occupant['tier_editions'] : [])
                + count(is_array($occupant['tier_edition_bin'] ?? null) ? $occupant['tier_edition_bin'] : []);
        }

        $verdict = cz_legacy_contact_decision($slot, $readModel, $isMigrated);
        if ($verdict['decision'] === 'skip') { continue; }

        $label = substr((string) ($occupant['label'] ?? ''), 0, 24);
        $addon = !empty($occupant['is_addon']) ? ' (add-on)' : '';

        if ($verdict['decision'] === 'keep') {
            $kept++;
            $czOut(sprintf('  %-26s KEEP  — %s', $label . $addon, $verdict['reason']));
            continue;
        }

        $cleared++;
        $touched = true;
        $czOut(sprintf('  %-26s CLEAR — prices cleanly at %s',
            $label . $addon, number_format((float) $verdict['price'], 2)));

        if ($apply) {
            [$repaired, $clearedDraft] = cz_legacy_contact_clear($slot);
            $station['tier_instances'][$instanceIndex]['tiers'][$tierId] = $repaired;
            if ($clearedDraft) {
                $draftsCleared++;
                $czOut('                             + cleared a pending Overview draft that would have re-applied it');
            }
        }
    }
}

$czOut();
$czOut(sprintf('Occupants cleared:          %d', $cleared));
$czOut(sprintf('Occupants kept:             %d', $kept));
$czOut(sprintf('Overview drafts cleared:    %d', $draftsCleared));
$czOut(sprintf('Editions inspected:         %d', $editionsInspected));
$czOut(sprintf('Editions changed:           %d', $editionsChanged));
$czOut(sprintf('Archived occupants:         %d', $archivedInspected));
$czOut(sprintf('Archived occupants changed: %d', $archivedChanged));
$czOut();

if (!$apply) {
    $czOut('Dry run only — re-run with "apply" to persist.');
    return;
}
if (!$touched) {
    $czOut('Nothing to change.');
    return;
}
$repo->saveStation($station);
$czOut('Persisted through PackageRepository::saveStation().');
