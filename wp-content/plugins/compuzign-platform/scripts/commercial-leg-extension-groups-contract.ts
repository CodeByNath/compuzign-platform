// Contract: commercialLegExtensionGroups() (FamilyTierAdapter.tsx) — Phase
// 5B: inclusion-first Extension eligibility. Eligibility is decided per
// Rate Sheet item_id, never by classifying a whole Leg as Default/Main/
// Extra — two Legs independently claiming the same item_id is normal
// (the platform's own identity-composition law), never a reason to
// suppress one of them wholesale. A repeated item_id qualifies only when
// its own Leg occurrences overlap in some resolved Period, or carry
// different Leg-specific quantities; an item claimed by exactly one Leg is
// already fully explained by the normal inclusion list and never qualifies.

import { commercialLegExtensionGroups } from '../resources/ts/components/package-builder/FamilyTierAdapter';
import type { CommercialLegComponent, CommercialLegPeriod, CommercialLegPricedItem, ServiceInclusion } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Commercial Leg extension groups contract: ${message}`);
}

function item(itemId: string, quantity: number): CommercialLegPricedItem {
  return { item_id: itemId, label: itemId, quantity, price_option_id: null, unit_price: 10, line_total: 10 * quantity, available: true };
}

function component(source: string, billingCycle: string | null, items: CommercialLegPricedItem[]): CommercialLegComponent {
  return { source, billing_cycle: billingCycle, price: 0, available: true, items };
}

function period(fromMonth: number, toMonth: number | null, components: CommercialLegComponent[]): CommercialLegPeriod {
  return { from_month: fromMonth, to_month: toMonth, components };
}

// The focused card's own already-rendered "What's included" list.
const focusedInclusions: ServiceInclusion[] = [
  { id: 'hosting', label: 'Hosting' },
  { id: 'suse_linux', label: 'SUSE Linux' },
  { id: 'static_ip', label: 'Static IP Block' },
  { id: 'block_storage', label: 'Block Storage' },
  { id: 'backup_storage', label: 'Backup Storage — BaaS' },
];

// 1. repeated item_id + overlapping Legs + SAME quantity → Extension for
// both occurrences. Overlap alone is meaningful, even when nothing differs
// numerically.
const overlapSameQtyPeriods: CommercialLegPeriod[] = [
  period(1, null, [
    component('CZTL_SUSE_MONTHLY', 'monthly', [item('suse_linux', 1)]),
    component('CZTL_SUSE_ANNUAL', 'annually', [item('suse_linux', 1)]),
  ]),
];
const overlapSameQtyGroups = commercialLegExtensionGroups(overlapSameQtyPeriods, focusedInclusions);
check(
  overlapSameQtyGroups.find((g) => g.source === 'CZTL_SUSE_MONTHLY')?.items.some((i) => i.item_id === 'suse_linux') === true
    && overlapSameQtyGroups.find((g) => g.source === 'CZTL_SUSE_ANNUAL')?.items.some((i) => i.item_id === 'suse_linux') === true,
  'suse_linux is claimed by two Legs active in the same Period (overlap) — Extension treatment applies to both occurrences even though their quantities are equal',
);

// 2. repeated item_id + overlapping Legs + DIFFERENT quantity → Extension.
const overlapDiffQtyPeriods: CommercialLegPeriod[] = [
  period(1, null, [
    component('CZTL_IP_MONTHLY', 'monthly', [item('static_ip', 1)]),
    component('CZTL_IP_ANNUAL', 'annually', [item('static_ip', 2)]),
  ]),
];
const overlapDiffQtyGroups = commercialLegExtensionGroups(overlapDiffQtyPeriods, focusedInclusions);
check(
  overlapDiffQtyGroups.find((g) => g.source === 'CZTL_IP_MONTHLY')?.items.find((i) => i.item_id === 'static_ip')?.quantity === 1
    && overlapDiffQtyGroups.find((g) => g.source === 'CZTL_IP_ANNUAL')?.items.find((i) => i.item_id === 'static_ip')?.quantity === 2,
  'static_ip is claimed by two overlapping Legs with different quantities (1 vs 2) — both occurrences get Extension treatment',
);

// 3. repeated item_id + NO overlap (sequential Periods) + SAME quantity →
// no Extension. The left timeline already explains the billing transition.
const sequentialSameQtyPeriods: CommercialLegPeriod[] = [
  period(1, 5, [component('CZTL_SEQ_A', 'monthly', [item('hosting', 1)])]),
  period(6, null, [component('CZTL_SEQ_B', 'annually', [item('hosting', 1)])]),
];
check(
  commercialLegExtensionGroups(sequentialSameQtyPeriods, focusedInclusions).length === 0,
  'hosting is claimed by two Legs that are never concurrent (CZTL_SEQ_A ends before CZTL_SEQ_B starts) and carry the same quantity — no Extension',
);

// 4. repeated item_id + NO overlap + DIFFERENT quantity → Extension. The
// inclusion itself changes, which the timeline alone doesn't explain.
const sequentialDiffQtyPeriods: CommercialLegPeriod[] = [
  period(1, 5, [component('CZTL_SEQ_IP_A', 'monthly', [item('static_ip', 1)])]),
  period(6, null, [component('CZTL_SEQ_IP_B', 'annually', [item('static_ip', 2)])]),
];
const sequentialDiffQtyGroups = commercialLegExtensionGroups(sequentialDiffQtyPeriods, focusedInclusions);
check(
  sequentialDiffQtyGroups.find((g) => g.source === 'CZTL_SEQ_IP_A')?.items.find((i) => i.item_id === 'static_ip')?.quantity === 1
    && sequentialDiffQtyGroups.find((g) => g.source === 'CZTL_SEQ_IP_B')?.items.find((i) => i.item_id === 'static_ip')?.quantity === 2,
  'static_ip changes quantity (1 -> 2) across two non-overlapping Legs — Extension treatment explains the change even with no overlap',
);

// 5. an item_id claimed by exactly one Leg is never a duplicate — no
// Extension for it, even alongside another item in the SAME Leg that IS
// eligible (repeated + overlapping) in the same resolved Period.
const singleLegPeriods: CommercialLegPeriod[] = [
  period(1, null, [
    component('CZTL_MAIN', 'monthly', [item('hosting', 2), item('block_storage', 100)]),
    component('CZTL_STORAGE_B', 'annually', [item('block_storage', 10)]),
  ]),
];
const singleLegGroups = commercialLegExtensionGroups(singleLegPeriods, focusedInclusions);
const mainGroup = singleLegGroups.find((g) => g.source === 'CZTL_MAIN');
check(mainGroup !== undefined, 'CZTL_MAIN has a qualifying item (block_storage, repeated + overlapping), so its group is present');
check(
  mainGroup!.items.every((i) => i.item_id !== 'hosting'),
  "hosting is claimed by only CZTL_MAIN — never repeated across Legs — so it's excluded from the group even though CZTL_MAIN has another qualifying item",
);
check(
  mainGroup!.items.some((i) => i.item_id === 'block_storage')
    && singleLegGroups.find((g) => g.source === 'CZTL_STORAGE_B')?.items.some((i) => i.item_id === 'block_storage'),
  'block_storage IS repeated across CZTL_MAIN and CZTL_STORAGE_B, overlapping in the same Period — it qualifies for Extension treatment in both groups',
);

// 6. two Legs sharing the same billing cycle stay two independent Extension
// groups by component.source — never merged just because both are Annual.
const sameCyclePeriods: CommercialLegPeriod[] = [
  period(1, null, [
    component('CZTL_ANNUAL_A', 'annually', [item('backup_storage', 50)]),
    component('CZTL_ANNUAL_B', 'annually', [item('backup_storage', 5)]),
  ]),
];
const sameCycleGroups = commercialLegExtensionGroups(sameCyclePeriods, focusedInclusions);
const annualA = sameCycleGroups.find((g) => g.source === 'CZTL_ANNUAL_A');
const annualB = sameCycleGroups.find((g) => g.source === 'CZTL_ANNUAL_B');
check(
  annualA !== undefined && annualB !== undefined && annualA !== annualB,
  'CZTL_ANNUAL_A and CZTL_ANNUAL_B both bill annually but remain two distinct Extension groups, identified by component.source',
);
check(
  annualA!.items.find((i) => i.item_id === 'backup_storage')!.quantity === 50
    && annualB!.items.find((i) => i.item_id === 'backup_storage')!.quantity === 5,
  'each Leg keeps its own independent quantity for the same repeated item_id',
);

console.log('Commercial Leg extension groups contract checks passed.');
