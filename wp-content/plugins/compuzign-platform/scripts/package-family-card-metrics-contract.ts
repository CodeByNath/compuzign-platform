import {
  formatActiveTierSlots,
  toPackageFamilyCard,
} from '../resources/ts/package-station/surface/packageFamily/cardAdapter';
import type { PackageFamilyItem } from '../resources/ts/package-station/types';

// Focused contract for the Package Family summary card's metric labels and
// count semantics (Service Home wall). Guards three regressions specifically:
// a relabelled metric silently keeping its old meaning, the Tiers metric
// drifting back to `dependents.tier_selections` (a per-rate-sheet-selection
// tally, not a slot count — see cardAdapter.ts's Truthfulness rules), and the
// three Tier occupancy states — no assignment, assigned with nothing active,
// assigned with active occupants — collapsing into indistinguishable text.

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Family card metrics contract: ${message}`);
}

function family(overrides: Partial<PackageFamilyItem> = {}): PackageFamilyItem {
  return {
    group_id: 'pcg_kairos', label: 'KAIROS', description: '', platform_status: 'active',
    previous_platform_status: null, module_status: { overview: 'settled' }, has_draft: false,
    sort_order: 0, assigned_service_count: 3,
    // A deliberately large tier_selections proves the card never reads it:
    // real Tier occupancy for this family is only ever 0-5 (five fixed slots).
    dependents: { services: 3, rate_sheet_rows: 7, tier_selections: 41 },
    ...overrides,
  };
}

// ── formatActiveTierSlots — the three Tier occupancy states stay distinct ──

// State 1: no Tier assignment at all. Reads "Not assigned" (the platform's
// existing vocabulary — tierInstanceModel.ts's `consumerName: 'Unassigned'`,
// PackageTierWorkspace's "No Tier system assigned") rather than "0 of 0
// active", which would misread as zero Tier capacity rather than no instance.
check(formatActiveTierSlots(undefined) === 'Not assigned', 'missing active_tier_slots reads as unassigned, never a guess');
check(formatActiveTierSlots({ occupied: 0, capacity: 0 }) === 'Not assigned', 'zero capacity means no assignment, so it reads Not assigned, not zero of zero');

// State 2: assigned instance, nothing active yet. Must NOT collapse into
// "Not assigned" — capacity is the real fixed 5-slot count, occupied is 0.
check(formatActiveTierSlots({ occupied: 0, capacity: 5 }) === '0 of 5 active', 'an assigned instance with no active occupants reads "0 of 5 active", staying visibly distinct from Not assigned');

// State 3: assigned instance with active occupants.
check(formatActiveTierSlots({ occupied: 2, capacity: 5 }) === '2 of 5 active', 'an assigned instance reports occupied of its fixed 5-slot capacity');
check(formatActiveTierSlots({ occupied: 5, capacity: 5 }) === '5 of 5 active', 'a fully occupied instance reports 5 of 5');

// ── toPackageFamilyCard metric identity, labels, and values ───────────────

const unassignedCard = toPackageFamilyCard(family());
const metricById = new Map(unassignedCard.metrics.map((metric) => [metric.id, metric]));

check(metricById.get('services')?.label === 'Services', 'Services label is unchanged');
check(metricById.get('services')?.value === 3, 'Services value is dependents.services, unchanged');

check(metricById.get('inclusions') !== undefined, 'the Rate Sheet rows metric is now identified as inclusions');
check(metricById.get('inclusions')?.label === 'Inclusions', 'Rate Sheet rows is relabelled Inclusions');
check(metricById.get('inclusions')?.value === 7, 'Inclusions reuses dependents.rate_sheet_rows verbatim, unchanged in meaning');
check(metricById.get('rate-sheet-rows') === undefined, 'the old rate-sheet-rows metric id is retired, not duplicated');

check(metricById.get('tiers') !== undefined, 'the Tier selections metric is now identified as tiers');
check(metricById.get('tiers')?.label === 'Tiers', 'Tier selections is relabelled Tiers');
check(metricById.get('tiers')?.value === 'Not assigned', 'an unassigned Family shows Not assigned, never dependents.tier_selections (41)');
check(metricById.get('tier-selections') === undefined, 'the old tier-selections metric id is retired, not duplicated');

const assignedIdleCard = toPackageFamilyCard(family({ active_tier_slots: { occupied: 0, capacity: 5 } }));
check(
  assignedIdleCard.metrics.find((metric) => metric.id === 'tiers')?.value === '0 of 5 active',
  'a Family with an assigned instance but no active occupants reads "0 of 5 active", distinct from an unassigned Family',
);

const assignedCard = toPackageFamilyCard(family({ active_tier_slots: { occupied: 3, capacity: 5 } }));
check(
  assignedCard.metrics.find((metric) => metric.id === 'tiers')?.value === '3 of 5 active',
  'an assigned Family with 3 active occupied slots of 5 reads "3 of 5 active", not the raw tier_selections tally',
);

console.log('Package Family card metrics contract passed.');
