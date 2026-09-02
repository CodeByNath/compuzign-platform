// Contract: resolveItemContributions() (ComposableOfferBrowser.tsx) —
// Phase 2B1 final correction round. The auditor found the composable
// browse card was displaying the published, static unitPrice regardless of
// the customer's selected quantity — misleading once a configurable
// inclusion's quantity changed, since the card price never moved. The fix
// must derive each card's "resolved individual contribution" from the
// server's own resolved Period/component rows, never from a client-side
// unitPrice * quantity computation — and must not blindly sum an item_id
// that legally appears under more than one concurrent commercial stream
// (Default + an Additional Leg may both independently claim the same
// item_id — see the Commercial Legs pricing boundary).

import { resolveItemContributions } from '../resources/ts/components/package-builder/ComposableOfferBrowser';
import type { CommercialLegComponent, CommercialLegPeriod, CommercialLegPricedItem } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable offer contribution contract: ${message}`);
}

function item(itemId: string, quantity: number, unitPrice: number, lineTotal: number, available = true): CommercialLegPricedItem {
  return { item_id: itemId, label: itemId, quantity, price_option_id: null, unit_price: unitPrice, line_total: lineTotal, available };
}

function component(source: string, billingCycle: string | null, items: CommercialLegPricedItem[], available = true): CommercialLegComponent {
  return { source, billing_cycle: billingCycle, price: 0, available, items };
}

function period(fromMonth: number, toMonth: number | null, components: CommercialLegComponent[]): CommercialLegPeriod {
  return { from_month: fromMonth, to_month: toMonth, components };
}

// ── 1. The displayed contribution is the server's own line_total verbatim —
//    never unit_price * quantity recomputed here. unit_price(10) *
//    quantity(2) would be 20; line_total is deliberately set to 999 so a
//    passing test proves no client-side multiplication occurred. ──────────

const singleSourcePeriods: CommercialLegPeriod[] = [
  period(1, null, [component('default', 'monthly', [item('extra_seats', 2, 10, 999)])]),
];
const singleContrib = resolveItemContributions(singleSourcePeriods);
check(singleContrib.extra_seats !== undefined, 'extra_seats resolves a contribution');
check(singleContrib.extra_seats.lineTotal === 999, 'the resolved line_total is read VERBATIM from the server row (999), never unit_price*quantity (which would be 20) — no client-side multiplication');
check(singleContrib.extra_seats.quantity === 2, 'quantity is carried through unchanged, for display purposes only');
check(singleContrib.extra_seats.ambiguous === false, 'a single distinct commercial stream is unambiguous');

// ── 2. Changing the resolved server quantity changes the displayed
//    contribution — proving this reacts to server state, not local state ──

const higherQtyPeriods: CommercialLegPeriod[] = [
  period(1, null, [component('default', 'monthly', [item('extra_seats', 5, 10, 2500)])]),
];
const higherContrib = resolveItemContributions(higherQtyPeriods);
check(higherContrib.extra_seats.lineTotal === 2500, 'a different resolved quantity/line_total from the server produces a different displayed contribution (2500 vs the previous 999)');
check(higherContrib.extra_seats.lineTotal !== singleContrib.extra_seats.lineTotal, 'the two resolves are genuinely different values, not a coincidental match');

// ── 3. The SAME source repeated across multiple Periods is NOT summed ──────
//    (first-seen-wins per source — the identical invariant
//    commercialLegInclusionGroups() already relies on: a Leg's own claimed
//    items[] never changes between Periods, only whether it's active).

const repeatedSourcePeriods: CommercialLegPeriod[] = [
  period(1, 6, [component('default', 'monthly', [item('hosting', 1, 100, 100)])]),
  period(7, null, [component('default', 'monthly', [item('hosting', 1, 100, 100)])]),
];
const repeatedContrib = resolveItemContributions(repeatedSourcePeriods);
check(repeatedContrib.hosting.lineTotal === 100, 'the same source appearing across two Periods still resolves to 100, not summed to 200 — repeated appearances of one source are structurally identical, never accumulated');

// ── 4. Two DIFFERENT commercial streams claiming the same item_id is
//    ambiguous — never summed, never picks one arbitrarily ─────────────────

const twoStreamsPeriods: CommercialLegPeriod[] = [
  period(1, null, [
    component('default', 'monthly', [item('support', 1, 20, 20)]),
    component('CZTL_ONBOARDING', 'one-time', [item('support', 3, 20, 60)]),
  ]),
];
const ambiguousContrib = resolveItemContributions(twoStreamsPeriods);
check(ambiguousContrib.support.ambiguous === true, 'support is claimed by two distinct commercial streams (default + CZTL_ONBOARDING) — flagged ambiguous');
check(ambiguousContrib.support.lineTotal === null, 'an ambiguous contribution carries no lineTotal at all — never summed (80) or picked arbitrarily (20 or 60)');

// ── 5. Unavailable components/items are excluded entirely ──────────────────

const unavailablePeriods: CommercialLegPeriod[] = [
  period(1, null, [
    component('default', 'monthly', [item('hosting', 1, 100, 100)]),
    component('CZTL_UNAVAILABLE', 'monthly', [item('hosting', 1, 999, 999)], false),
  ]),
];
const unavailableContrib = resolveItemContributions(unavailablePeriods);
check(unavailableContrib.hosting.lineTotal === 100, 'an unavailable component never contributes — only the available default stream is read, not summed or blended with the unavailable one');

console.log('Composable offer contribution contract: PASS');
