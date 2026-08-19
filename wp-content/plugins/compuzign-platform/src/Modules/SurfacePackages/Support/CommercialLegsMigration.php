<?php

declare(strict_types=1);

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

/**
 * Backfill for Tier Pricing Rules' legacy synthesis
 * (PackageSchema::synthesizeFirstCommercialLeg()) — persists one Commercial
 * Leg for every occupant/Edition still storing commercial_legs: [] alongside
 * a real, usable billing_cycle.
 *
 * WHY THIS EXISTS
 * PackageSchema::normaliseTierSlot()/settleTierSlot()/sanitizeTierEdition()
 * already derive this same leg on every read/settle (see
 * docs/code-map/tier-pricing-rules-plan.md, Phase 3) — a record self-heals
 * the moment anyone touches it again, in the admin drawer or via Publish.
 * This class exists only for records nobody happens to touch again: it makes
 * the derivation permanent in storage, so commercial_legs: [] genuinely
 * stops existing for a record that HAS a usable cadence to derive from,
 * rather than relying on it never being read.
 *
 * SCOPE
 * Only a record with commercial_legs: [] AND a real, recognised
 * billing_cycle (one-time/monthly/annually) is touched — the EXACT SAME
 * condition PackageSchema::synthesizeFirstCommercialLeg() already enforces,
 * reused here directly rather than re-implemented, so this can never drift
 * from what the live read/settle paths already do. A record with Rate Sheet
 * selections but no billing_cycle at all is explicitly OUT of scope, same as
 * a genuinely fresh record — left for an admin to complete through the Tier
 * Pricing Rules UI, never auto-resolved.
 *
 * plan() walks tier_instances[]'s own occupants and their tier_editions[]
 * only — occupant_bin[]/tier_edition_bin[] are never touched, mirroring
 * repair-legacy-contact-override.php's own boundary; a binned/archived
 * record self-heals through the same on-read synthesis if it is ever
 * restored.
 *
 * Two consumers share this one implementation: the CLI tool
 * (tools/migrate-commercial-legs.php, dry-run by default, "apply" to
 * persist) and PackageStationController's admin-triggered preview/apply
 * routes behind the Commercial Legs Migration popup
 * (presentation/package-tier-workspace). Neither reimplements the walk or
 * the decision — both call plan()/applyPlan()/summarize() here.
 */
class CommercialLegsMigration
{
    /**
     * This record's own effective commitment bound — the same
     * commitment_enabled-gated conversion draftPreferredCommitmentMonths()
     * and settleTierSlot() already apply, reproduced here (both are
     * private/scoped to the settle path) so a commitment stored while
     * Commitment was Yes still correctly bounds the migrated leg's
     * end_month, and one stored while Commitment is No is correctly ignored
     * (Indefinite).
     *
     * @param  array<string, mixed> $record  current_occupant or one Edition row
     */
    public static function commitmentMonths(array $record): ?float
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
     * Decide what to do with one occupant/Edition record. Pure — reads,
     * never writes.
     *
     * @param  array<string, mixed> $record  current_occupant or one Edition row
     * @return array{decision: string, reason: string, result?: array{commercial_legs: array, rate_sheet_items: array}}
     */
    public static function decision(array $record): array
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
            self::commitmentMonths($record),
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

    /**
     * Walk every occupant/Edition in the station and decide each. Pure —
     * reads, never writes. The returned rows carry enough addressing
     * (instance_index/tier_id/edition_index) for applyPlan() to locate and
     * mutate the same records without re-walking the station.
     *
     * @param  array<string, mixed> $station
     * @return list<array{scope: string, instance_index: int|string, instance_id: string, tier_id: string, edition_index?: int|string, label: string, decision: string, reason: string, result?: array}>
     */
    public static function plan(array $station): array
    {
        $rows = [];
        foreach ($station['tier_instances'] ?? [] as $instanceIndex => $instance) {
            if (!is_array($instance)) {
                continue;
            }
            $instanceId = (string) ($instance['tier_instance_id'] ?? '');

            foreach (PackageSchema::ALLOWED_TIERS as $tierId) {
                $slot = $instance['tiers'][$tierId] ?? [];
                if (!is_array($slot) || !PackageSchema::isOccupantFormat($slot) || !is_array($slot['current_occupant'] ?? null)) {
                    continue;
                }
                $occ = $slot['current_occupant'];
                $rows[] = array_merge(self::decision($occ), [
                    'scope'          => 'occupant',
                    'instance_index' => $instanceIndex,
                    'instance_id'    => $instanceId,
                    'tier_id'        => $tierId,
                    'label'          => substr((string) ($occ['label'] ?? ''), 0, 24),
                ]);

                $editions = is_array($occ['tier_editions'] ?? null) ? $occ['tier_editions'] : [];
                foreach ($editions as $editionIndex => $edition) {
                    if (!is_array($edition)) {
                        continue;
                    }
                    $rows[] = array_merge(self::decision($edition), [
                        'scope'          => 'edition',
                        'instance_index' => $instanceIndex,
                        'instance_id'    => $instanceId,
                        'tier_id'        => $tierId,
                        'edition_index'  => $editionIndex,
                        'label'          => substr((string) ($edition['title'] ?? ''), 0, 24),
                    ]);
                }
            }
        }
        return $rows;
    }

    /**
     * Apply every 'migrate' row in $plan onto $station. Pure — returns the
     * mutated array; the caller decides whether/how to persist it (the CLI
     * tool and the admin route each own their own PackageRepository
     * instance and save call).
     *
     * @param  array<string, mixed> $station
     * @param  list<array<string, mixed>> $plan
     * @return array<string, mixed>
     */
    public static function applyPlan(array $station, array $plan): array
    {
        foreach ($plan as $row) {
            if (($row['decision'] ?? null) !== 'migrate') {
                continue;
            }
            $instanceIndex = $row['instance_index'];
            $tierId        = $row['tier_id'];
            if ($row['scope'] === 'occupant') {
                $station['tier_instances'][$instanceIndex]['tiers'][$tierId]['current_occupant']['commercial_legs']  = $row['result']['commercial_legs'];
                $station['tier_instances'][$instanceIndex]['tiers'][$tierId]['current_occupant']['rate_sheet_items'] = $row['result']['rate_sheet_items'];
            } else {
                $editionIndex = $row['edition_index'];
                $station['tier_instances'][$instanceIndex]['tiers'][$tierId]['current_occupant']['tier_editions'][$editionIndex]['commercial_legs']  = $row['result']['commercial_legs'];
                $station['tier_instances'][$instanceIndex]['tiers'][$tierId]['current_occupant']['tier_editions'][$editionIndex]['rate_sheet_items'] = $row['result']['rate_sheet_items'];
            }
        }
        return $station;
    }

    /**
     * Aggregate counts for a plan — the one stats shape both the CLI tool
     * and the admin popup report (preview and apply alike).
     *
     * @param  list<array<string, mixed>> $plan
     * @return array{occupants_migrated: int, occupants_skipped: int, editions_migrated: int, editions_skipped: int}
     */
    public static function summarize(array $plan): array
    {
        $stats = [
            'occupants_migrated' => 0,
            'occupants_skipped'  => 0,
            'editions_migrated'  => 0,
            'editions_skipped'   => 0,
        ];
        foreach ($plan as $row) {
            $key = ($row['scope'] === 'occupant' ? 'occupants_' : 'editions_')
                . ($row['decision'] === 'migrate' ? 'migrated' : 'skipped');
            $stats[$key]++;
        }
        return $stats;
    }
}
