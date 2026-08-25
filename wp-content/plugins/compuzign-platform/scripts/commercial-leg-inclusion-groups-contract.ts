// Contract: commercialLegInclusionGroups() (FamilyTierAdapter.tsx) — the
// Phase 2 pure derivation helper for the focused Tier/Edition inclusion
// blueprint. Exercises the actual production function against fixtures
// shaped exactly like PackageManagerSchema::resolveCommercialLegTimeline()'s
// real proven output (tests/commercial-leg-timeline.php scenario 11: Default
// plus two overlapping Additional Legs, all three independently claiming the
// same inclusion at their own quantity) — never a synthetic shape the real
// resolver couldn't produce.

import { commercialLegInclusionGroups } from '../resources/ts/components/package-builder/FamilyTierAdapter';
import type { CommercialLegComponent, CommercialLegPeriod, CommercialLegPricedItem } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Commercial Leg inclusion groups contract: ${message}`);
}

function hostingItem(quantity: number, unitPrice: number): CommercialLegPricedItem {
  return {
    item_id: 'hosting', label: 'Hosting', quantity, price_option_id: null,
    unit_price: unitPrice, line_total: unitPrice * quantity, available: true,
  };
}

function component(source: string, billingCycle: string | null, quantity: number, unitPrice: number): CommercialLegComponent {
  return {
    source, billing_cycle: billingCycle, price: quantity * unitPrice, available: true,
    items: [hostingItem(quantity, unitPrice)],
  };
}

// Mirrors commercial-leg-timeline.php scenario 11 exactly: Default (qty 2)
// runs the whole timeline; Leg A (qty 1) is active months 1-12; Leg B (qty 3)
// is active months 6-18. Four resolved Periods; 'default' appears in all
// four, Leg A in two, Leg B in two.
const periods: CommercialLegPeriod[] = [
  { from_month: 1, to_month: 5, components: [component('default', 'monthly', 2, 100)] },
  {
    from_month: 6, to_month: 12,
    components: [
      component('default', 'monthly', 2, 100),
      component('CZTL_A', 'monthly', 1, 100),
      component('CZTL_B', 'monthly', 3, 100),
    ],
  },
  { from_month: 13, to_month: 18, components: [component('default', 'monthly', 2, 100), component('CZTL_B', 'monthly', 3, 100)] },
  { from_month: 19, to_month: null, components: [component('default', 'monthly', 2, 100)] },
];

const groups = commercialLegInclusionGroups(periods);

// 1. same component.source repeated in multiple Periods → one group.
const defaultGroups = groups.filter((g) => g.source === 'default');
check(defaultGroups.length === 1, "'default' appears in all four Periods but collapses to exactly one group");

// 2. two different component.source values sharing a billing cycle → two groups, never merged.
const legAGroup = groups.find((g) => g.source === 'CZTL_A');
const legBGroup = groups.find((g) => g.source === 'CZTL_B');
check(legAGroup !== undefined && legBGroup !== undefined, 'both Additional Legs resolve their own group');
check(legAGroup !== legBGroup, 'Leg A and Leg B both bill monthly but are never merged into one group');
check(groups.length === 3, 'exactly three groups total: default, Leg A, Leg B — never four (one per repeated Period appearance)');

// 3. same item_id in two (here, three) groups → remains in each independently.
check(
  defaultGroups[0].items.some((i) => i.item_id === 'hosting')
    && legAGroup!.items.some((i) => i.item_id === 'hosting')
    && legBGroup!.items.some((i) => i.item_id === 'hosting'),
  "the 'hosting' item_id is claimed by Default and both Legs at once — it is never deduplicated across groups",
);

// 4. quantities stay independent per Leg.
check(defaultGroups[0].items[0].quantity === 2, "Default's own claimed quantity (2) is untouched by either Leg's claim");
check(legAGroup!.items[0].quantity === 1, "Leg A's own claimed quantity (1) is independent of Default's and Leg B's");
check(legBGroup!.items[0].quantity === 3, "Leg B's own claimed quantity (3) is independent of Default's and Leg A's");

console.log('Commercial Leg inclusion groups contract checks passed.');
