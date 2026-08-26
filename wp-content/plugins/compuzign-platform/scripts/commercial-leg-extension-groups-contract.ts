// Contract: commercialLegExtensionGroups() (FamilyTierAdapter.tsx) — Phase
// 5C: Headline-Leg-relative Extension eligibility. The Headline Leg
// (component.source === headline_leg_id, the same real Leg
// resolveHeadlinePrice() already resolves the card's own headline price
// from) is the one fixed reference point every other Leg is compared
// against — never a generic "any two Legs collide" test. An other Leg is a
// candidate only if IT overlaps the Headline Leg in some resolved Period;
// once eligible, only its differences/additions relative to the Headline
// Leg's own items[] (by exact item_id) are shown.

import { commercialLegExtensionGroups } from '../resources/ts/components/package-builder/FamilyTierAdapter';
import type { CommercialLegComponent, CommercialLegPeriod, CommercialLegPricedItem } from '../resources/ts/api/types/cost-builder';

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

const HEADLINE = 'CZTL_HEADLINE_MONTHLY';

// Headline Leg overlapping three other Legs in the same Period, plus one
// Leg active only in a later, non-overlapping Period.
const periods: CommercialLegPeriod[] = [
  period(1, null, [
    component(HEADLINE, 'monthly', [item('hosting', 2), item('static_ip', 1), item('suse_linux', 1)]),
    component('CZTL_ANNUAL_DIFF', 'annually', [item('static_ip', 2)]),
    component('CZTL_ANNUAL_ADD', 'annually', [item('backup_storage', 50)]),
    component('CZTL_ANNUAL_SAME', 'annually', [item('suse_linux', 1)]),
  ]),
];

const groups = commercialLegExtensionGroups(periods, HEADLINE);

// 1. overlaps Headline + same item_id, DIFFERENT quantity → shown as a difference.
const diffGroup = groups.find((g) => g.source === 'CZTL_ANNUAL_DIFF');
check(
  diffGroup !== undefined && diffGroup.items.find((i) => i.item_id === 'static_ip')?.quantity === 2,
  "CZTL_ANNUAL_DIFF overlaps the Headline Leg and claims static_ip at a different quantity (2 vs Headline's 1) — shown as an Extension difference",
);

// 2. overlaps Headline + item_id the Headline Leg doesn't claim at all → shown as an addition.
const addGroup = groups.find((g) => g.source === 'CZTL_ANNUAL_ADD');
check(
  addGroup !== undefined && addGroup.items.some((i) => i.item_id === 'backup_storage'),
  'CZTL_ANNUAL_ADD overlaps the Headline Leg and claims backup_storage, which the Headline Leg does not claim at all — shown as an Extension addition',
);

// 3. overlaps Headline + IDENTICAL item_id and quantity → already fully explained by the Headline Leg, excluded.
check(
  groups.find((g) => g.source === 'CZTL_ANNUAL_SAME') === undefined,
  'CZTL_ANNUAL_SAME overlaps the Headline Leg but claims suse_linux at the exact same quantity (1) the Headline Leg already claims — no Extension, it adds nothing new',
);

// 4. the Headline Leg itself is the baseline, never its own Extension group.
check(groups.find((g) => g.source === HEADLINE) === undefined, 'the Headline Leg is the comparison baseline and never produces an Extension group for itself');

// 5. a Leg that NEVER overlaps the Headline Leg produces no Extension group
// at all, even when its quantity for a shared item_id differs.
const noOverlapPeriods: CommercialLegPeriod[] = [
  period(1, 6, [component(HEADLINE, 'monthly', [item('static_ip', 1)])]),
  period(7, null, [component('CZTL_SEQ_LATER', 'annually', [item('static_ip', 5)])]),
];
check(
  commercialLegExtensionGroups(noOverlapPeriods, HEADLINE).length === 0,
  'CZTL_SEQ_LATER never shares a resolved Period with the Headline Leg (Headline ends before it starts) — no Extension group even though its static_ip quantity (5) differs from the Headline Leg\'s (1)',
);

// 6. no headline_leg_id resolved at all (e.g. never configured) → no Extensions, regardless of what any Leg claims.
check(commercialLegExtensionGroups(periods, null).length === 0, 'a null headline_leg_id means there is no Headline Leg to compare against — no Extension groups at all');
check(commercialLegExtensionGroups(periods, undefined).length === 0, 'an undefined headline_leg_id behaves the same as null — no Extension groups');

// 7. a headline_leg_id that never matches any available component's source
// (e.g. the literal 'default' fallback, which is never itself a Leg
// component) → no Extensions either.
check(commercialLegExtensionGroups(periods, 'default').length === 0, "a headline_leg_id with no matching component.source (e.g. the 'default' fallback) produces no Extension groups");

// 8. two overlapping other Legs sharing a billing cycle stay two independent
// Extension groups by component.source — never merged just because both are Annual.
check(
  diffGroup !== addGroup && diffGroup !== undefined && addGroup !== undefined,
  'CZTL_ANNUAL_DIFF and CZTL_ANNUAL_ADD both bill annually but remain two distinct Extension groups, identified by component.source',
);

console.log('Commercial Leg extension groups contract checks passed.');
