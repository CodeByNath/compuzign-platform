// Contract: commercialLegExtensionGroups() (FamilyTierAdapter.tsx) — Phase
// 4B of the focused Tier/Edition card blueprint. Exercises the actual
// production function: each commercialLegInclusionGroups() group reduced to
// only the items it shares with the focused card's own "What's included"
// list, matched by item_id only.

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

// The focused card's own already-rendered "What's included" list — 'support'
// and 'phone_support' are deliberately absent from it.
const focusedInclusions: ServiceInclusion[] = [
  { id: 'hosting', label: 'Hosting' },
  { id: 'block_storage', label: 'Block Storage' },
  { id: 'backup_storage', label: 'Backup Storage — BaaS' },
];

const periods: CommercialLegPeriod[] = [
  {
    from_month: 1, to_month: null,
    components: [
      component('CZTL_MAIN', 'monthly', [item('hosting', 2), item('support', 1)]),
      component('CZTL_ANNUAL_A', 'annually', [item('block_storage', 100), item('backup_storage', 50)]),
      component('CZTL_ANNUAL_B', 'annually', [item('block_storage', 10)]),
      component('CZTL_NOMATCH', 'quarterly', [item('phone_support', 1)]),
    ],
  },
];

const groups = commercialLegExtensionGroups(periods, focusedInclusions);

// 1. same item_id in the focused list + a Leg's own claim → appears in that Leg's Extension group.
const mainGroup = groups.find((g) => g.source === 'CZTL_MAIN');
check(mainGroup !== undefined && mainGroup.items.some((i) => i.item_id === 'hosting'), "'hosting' is in both the focused list and CZTL_MAIN's claim, so it appears in CZTL_MAIN's Extension group");

// 2. a Leg's own item not present in the focused list → excluded from its group; a Leg with NO matching items → omitted entirely.
check(mainGroup!.items.every((i) => i.item_id !== 'support'), "'support' is claimed by CZTL_MAIN but absent from the focused list, so it is excluded from CZTL_MAIN's group");
check(groups.find((g) => g.source === 'CZTL_NOMATCH') === undefined, "CZTL_NOMATCH's only claimed item ('phone_support') is absent from the focused list, so the whole group is omitted, never rendered empty");

// 3. same item_id under two different Leg sources → preserved independently in both groups.
const annualA = groups.find((g) => g.source === 'CZTL_ANNUAL_A');
const annualB = groups.find((g) => g.source === 'CZTL_ANNUAL_B');
check(
  annualA !== undefined && annualA.items.some((i) => i.item_id === 'block_storage')
    && annualB !== undefined && annualB.items.some((i) => i.item_id === 'block_storage'),
  "'block_storage' is claimed by both CZTL_ANNUAL_A and CZTL_ANNUAL_B — it is never deduplicated across their Extension groups",
);

// 4. quantities stay Leg-specific.
check(annualA!.items.find((i) => i.item_id === 'block_storage')!.quantity === 100, "CZTL_ANNUAL_A's own block_storage quantity (100) is preserved from component.items[]");
check(annualB!.items.find((i) => i.item_id === 'block_storage')!.quantity === 10, "CZTL_ANNUAL_B's own block_storage quantity (10) is independent of CZTL_ANNUAL_A's");

// 5. two Legs sharing a billing cycle remain separate groups by source, never merged.
check(annualA !== annualB, 'CZTL_ANNUAL_A and CZTL_ANNUAL_B both bill annually but stay two distinct Extension groups');
check(groups.length === 3, 'exactly three Extension groups: CZTL_MAIN, CZTL_ANNUAL_A, CZTL_ANNUAL_B — CZTL_NOMATCH omitted');

console.log('Commercial Leg extension groups contract checks passed.');
