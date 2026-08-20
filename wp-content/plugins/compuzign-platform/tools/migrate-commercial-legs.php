<?php

declare(strict_types=1);

/**
 * One-off migration: persist Tier Pricing Rules' legacy synthesis
 * (PackageSchema::synthesizeFirstCommercialLeg()) for every occupant/Edition
 * still storing commercial_legs: [] alongside a real, usable billing_cycle.
 *
 *   wp eval-file tools/migrate-commercial-legs.php          # dry run
 *   wp eval-file tools/migrate-commercial-legs.php apply    # persist
 *
 * WHY THIS EXISTS
 * PackageSchema::normaliseTierSlot()/settleTierSlot()/sanitizeTierEdition()
 * already derive this same leg on every read/settle (see
 * docs/code-map/tier-pricing-rules-plan.md, Phase 3) — a record self-heals
 * the moment anyone touches it again, in the admin drawer or via Publish.
 * This tool exists only for records nobody happens to touch again: it makes
 * the derivation permanent in storage, so commercial_legs: [] genuinely
 * stops existing for a record that HAS a usable cadence to derive from,
 * rather than relying on it never being read.
 *
 * SCOPE
 * Only a record with commercial_legs: [] AND a real, recognised
 * billing_cycle (one-time/monthly/annually) is touched — the EXACT SAME
 * condition PackageSchema::synthesizeFirstCommercialLeg() already enforces,
 * reused here directly rather than re-implemented, so this tool can never
 * drift from what the live read/settle paths already do. A record with Rate
 * Sheet selections but no billing_cycle at all is explicitly OUT of scope,
 * same as a genuinely fresh record — left for an admin to complete through
 * the Tier Pricing Rules UI, never auto-resolved.
 *
 * Walks tier_instances[]'s own occupants and their tier_editions[] only —
 * occupant_bin[]/tier_edition_bin[] are never touched, mirroring
 * repair-legacy-contact-override.php's own boundary; a binned/archived
 * record self-heals through the same on-read synthesis if it is ever
 * restored.
 *
 * Defining CZ_COMMERCIAL_LEGS_MIGRATION_DEFINE_ONLY before including this
 * file loads the pure helpers without running the command (used by
 * tests/commercial-legs-migration.php).
 */

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema;

/**
 * This record's own effective commitment bound — the same
 * commitment_enabled-gated conversion draftPreferredCommitmentMonths() and
 * settleTierSlot() already apply, reproduced here (both are private/scoped
 * to the settle path) so a commitment stored while Commitment was Yes still
 * correctly bounds the migrated leg's end_month, and one stored while
 * Commitment is No is correctly ignored (Indefinite).
 *
 * @param  array<string, mixed> $record  current_occupant or one Edition row
 */
function cz_commercial_legs_commitment_months(array $record): ?float
{
    if (empty($record['commitment_enabled'])) {
        return null;
    }
    $value = isset($record['minimum_term_value']) && $record['minimum_term_value'] !== null
        ? (float) $record['minimum_term_value']
        : null;
    $unit = is_string($record['minimum_term_unit'] ?? null) ? $record['minimum_term_unit'] : null;
    return PackageSchema::commitmentMonths($value, $unit);
}

/**
 * Decide what to do with one occupant/Edition record. Pure — reads, never
 * writes.
 *
 * @param  array<string, mixed> $record  current_occupant or one Edition row
 * @return array{decision: string, reason: string, result?: array{commercial_legs: array, rate_sheet_items: array}}
 */
function cz_commercial_legs_decision(array $record): array
{
    $commercialLegs = is_array($record['commercial_legs'] ?? null) ? $record['commercial_legs'] : [];
    if ($commercialLegs !== []) {
        return ['decision' => 'skip', 'reason' => 'already has a leg'];
    }
    $billingCycle = (is_string($record['billing_cycle'] ?? null) && $record['billing_cycle'] !== '')
        ? $record['billing_cycle']
        : null;
    $rateSheetItems = is_array($record['rate_sheet_items'] ?? null) ? $record['rate_sheet_items'] : [];
    $synthesized = PackageSchema::synthesizeFirstCommercialLeg(
        $billingCycle,
        cz_commercial_legs_commitment_months($record),
        $rateSheetItems
    );
    if ($synthesized['commercial_legs'] === []) {
        return [
            'decision' => 'skip',
            'reason'   => $billingCycle === null
                ? ($rateSheetItems === [] ? 'nothing configured yet' : 'has selections but no billing_cycle — left for the admin to complete')
                : 'unrecognised billing_cycle',
        ];
    }
    return ['decision' => 'migrate', 'reason' => 'derives from billing_cycle=' . $billingCycle, 'result' => $synthesized];
}

if (defined('CZ_COMMERCIAL_LEGS_MIGRATION_DEFINE_ONLY')) {
    return;
}

// ── Command ─────────────────────────────────────────────────────────────────

$czOut = static function (string $line = ''): void { echo $line, PHP_EOL; };

$apply = in_array('apply', $args ?? [], true);

$repo    = new PackageRepository();
$station = $repo->loadStation();
if ($station === null) {
    $czOut('No cz_package_station option found.');
    return;
}

$czOut($apply
    ? '*** APPLY — changes will be persisted ***'
    : '*** DRY RUN — nothing is written (append "apply" to persist) ***');

$occupantsMigrated = 0; $occupantsSkipped = 0;
$editionsMigrated  = 0; $editionsSkipped  = 0;
$touched = false;

foreach ($station['tier_instances'] ?? [] as $instanceIndex => $instance) {
    $instanceId = (string) ($instance['tier_instance_id'] ?? '');

    foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
        $slot = $instance['tiers'][$tierId] ?? [];
        if (!is_array($slot) || !PackageSchema::isOccupantFormat($slot) || !is_array($slot['current_occupant'] ?? null)) {
            continue;
        }
        $occ = $slot['current_occupant'];
        $label = substr((string) ($occ['label'] ?? ''), 0, 24);

        $verdict = cz_commercial_legs_decision($occ);
        if ($verdict['decision'] === 'skip') {
            $occupantsSkipped++;
        } else {
            $occupantsMigrated++;
            $touched = true;
            $leg = $verdict['result']['commercial_legs'][0];
            $czOut(sprintf('  [%s/%s] %-26s MIGRATE — %s (%s, %s, month %d-%s)',
                $instanceId, $tierId, $label, $verdict['reason'],
                $leg['payment_category'], $leg['billing_cycle'], $leg['start_month'],
                $leg['end_month'] === null ? 'Indefinite' : (string) $leg['end_month']));
            if ($apply) {
                $station['tier_instances'][$instanceIndex]['tiers'][$tierId]['current_occupant']['commercial_legs'] = $verdict['result']['commercial_legs'];
                $station['tier_instances'][$instanceIndex]['tiers'][$tierId]['current_occupant']['rate_sheet_items'] = $verdict['result']['rate_sheet_items'];
            }
        }

        $editions = is_array($occ['tier_editions'] ?? null) ? $occ['tier_editions'] : [];
        foreach ($editions as $editionIndex => $edition) {
            if (!is_array($edition)) { continue; }
            $editionVerdict = cz_commercial_legs_decision($edition);
            if ($editionVerdict['decision'] === 'skip') {
                $editionsSkipped++;
                continue;
            }
            $editionsMigrated++;
            $touched = true;
            $editionLabel = substr((string) ($edition['title'] ?? ''), 0, 24);
            $leg = $editionVerdict['result']['commercial_legs'][0];
            $czOut(sprintf('  [%s/%s] %-26s MIGRATE (Edition) — %s (%s, %s, month %d-%s)',
                $instanceId, $tierId, $editionLabel, $editionVerdict['reason'],
                $leg['payment_category'], $leg['billing_cycle'], $leg['start_month'],
                $leg['end_month'] === null ? 'Indefinite' : (string) $leg['end_month']));
            if ($apply) {
                $station['tier_instances'][$instanceIndex]['tiers'][$tierId]['current_occupant']['tier_editions'][$editionIndex]['commercial_legs'] = $editionVerdict['result']['commercial_legs'];
                $station['tier_instances'][$instanceIndex]['tiers'][$tierId]['current_occupant']['tier_editions'][$editionIndex]['rate_sheet_items'] = $editionVerdict['result']['rate_sheet_items'];
            }
        }
    }
}

$czOut();
$czOut(sprintf('Occupants migrated: %d', $occupantsMigrated));
$czOut(sprintf('Occupants skipped:  %d', $occupantsSkipped));
$czOut(sprintf('Editions migrated:  %d', $editionsMigrated));
$czOut(sprintf('Editions skipped:   %d', $editionsSkipped));
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
