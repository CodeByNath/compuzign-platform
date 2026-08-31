import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  formatMoney,
  occurrencesCell,
  subtotalCell,
  totalContractValueCell,
  periodItemsTotalDisplay,
  dueAtPlanStartDisplay,
} from '../resources/ts/components/package-builder/PlanDetailsModal';
import type { LegPaymentSummary } from '../resources/ts/utils/paymentSummary';
import type { CommercialLegPricedItem } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Plan Details value states: ${message}`);
}

function summary(overrides: Partial<LegPaymentSummary>): LegPaymentSummary {
  return {
    source: 'leg_x',
    billingCycle: 'monthly',
    price: null,
    startMonth: 0,
    endMonth: null,
    isOngoing: false,
    occurrenceMonths: [],
    subtotal: null,
    ...overrides,
  };
}

// 1. Bundle child cells read "Included" for Unit Price/Total, never a dash
// — source-verified against the actual ItemBreakdownTable, not just a
// pattern that could exist anywhere else in the file.
const root = resolve(import.meta.dirname, '..');
const planDetails = readFileSync(resolve(root, 'resources/ts/components/package-builder/PlanDetailsModal.tsx'), 'utf8');
const itemBreakdownBody = planDetails.match(/function ItemBreakdownTable[\s\S]*?\n}\n/);
check(!!itemBreakdownBody, 'ItemBreakdownTable is present');
const childRowMatch = itemBreakdownBody![0].match(/item\.includes[\s\S]*?<\/tr>\s*\)\),/);
check(!!childRowMatch, 'ItemBreakdownTable renders a child row per Bundle-supplied include');
check((childRowMatch![0].match(/<td>Included<\/td>/g) ?? []).length === 2, 'child row shows "Included" for both Unit Price and Total cells');
check(!childRowMatch![0].includes('<td>—</td>'), 'child row no longer renders a bare dash for its price cells');

// 2. Until Canceled occurrences — an open-ended stream, regardless of
// whether its own rate is known.
check(occurrencesCell(summary({ isOngoing: true, price: 4000 }), 'Monthly') === 'Until Canceled', 'open-ended stream shows "Until Canceled" for Charge Occurrences');
check(occurrencesCell(summary({ isOngoing: true, price: null }), 'Monthly') === 'Until Canceled', 'open-ended stream with unresolved price still shows "Until Canceled" for Charge Occurrences (unresolved-ness is the Subtotal cell\'s concern, not this one)');

// 3. Open-ended Subtotal repeats the known Rate figure exactly — never a
// lifetime multiplication.
check(subtotalCell(summary({ isOngoing: true, price: 4000, subtotal: null })) === formatMoney(4000), 'open-ended Subtotal with a known rate repeats that same Rate amount, not a fabricated lifetime total');

// 4. Finite minimum-term subtotal remains calculated (unchanged behavior) —
// both Charge Occurrences' count and Subtotal's own figure.
const finiteMonthly = summary({ isOngoing: false, price: 80, occurrenceMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], subtotal: 960 });
check(occurrencesCell(finiteMonthly, 'Monthly') === '12 monthly charges', 'a finite stream keeps its existing calculated occurrence count untouched');
check(subtotalCell(finiteMonthly) === formatMoney(960), 'a finite stream keeps its existing calculated Subtotal untouched');

// 5. Unresolved price reads "To be confirmed" — for a non-ongoing stream
// with no calculated subtotal, for an open-ended stream with no known
// rate, and for the combined Total Contract Value when any contributor's
// price is genuinely unresolved (as opposed to genuinely open-ended).
check(subtotalCell(summary({ isOngoing: false, subtotal: null })) === 'To be confirmed', 'a finite stream with an unresolved subtotal reads "To be confirmed", never a bare dash');
check(subtotalCell(summary({ isOngoing: true, price: null, subtotal: null })) === 'To be confirmed', 'an open-ended stream with no known rate reads "To be confirmed" for Subtotal');
const unresolvedPriceSummaries = [summary({ isOngoing: false, subtotal: null }), summary({ source: 'leg_y', isOngoing: false, subtotal: 100 })];
check(totalContractValueCell(unresolvedPriceSummaries, null) === 'To be confirmed', 'Total Contract Value reads "To be confirmed" when a contributor\'s price is genuinely unresolved (not merely open-ended)');

// Genuinely open-ended with every applicable rate known reads "Until
// Canceled" instead — the two null-causing scenarios must never collapse
// into the same wording.
const openEndedKnownRateSummaries = [summary({ isOngoing: true, price: 4000, subtotal: null })];
check(totalContractValueCell(openEndedKnownRateSummaries, null) === 'Until Canceled', 'Total Contract Value reads "Until Canceled" when every null contributor is open-ended with a known rate');
check(totalContractValueCell([summary({ subtotal: 500 })], 500) === formatMoney(500), 'a finite Total Contract Value is rendered as formatted money, untouched');

// 6. Mixed finite+null Period never shows a partial total — a null
// top-level line_total makes the WHOLE Period total "To be confirmed",
// never a sum that silently skipped the unresolved item.
const partiallyPricedItems: CommercialLegPricedItem[] = [
  { item_id: 'a', label: 'Priced Item', quantity: 1, price_option_id: null, unit_price: 500, line_total: 500, available: true },
  { item_id: 'b', label: 'Unresolved Item', quantity: 1, price_option_id: null, unit_price: null, line_total: null, available: true },
];
check(periodItemsTotalDisplay(partiallyPricedItems) === 'To be confirmed', 'a Period with any top-level null line_total shows "To be confirmed", never a partial sum of only the priced items');
const fullyPricedItems: CommercialLegPricedItem[] = [
  { item_id: 'a', label: 'Priced Item', quantity: 1, price_option_id: null, unit_price: 500, line_total: 500, available: true },
];
check(periodItemsTotalDisplay(fullyPricedItems) === formatMoney(500), 'a fully priced Period still shows its real, unchanged total');

// 7. Null starting rate never becomes a false $0.00 — the whole "Due at
// plan start" figure reads "To be confirmed" instead when any stream
// starting at plan start has an unresolved price.
const unresolvedStartingStream = [summary({ startMonth: 0, price: null })];
check(dueAtPlanStartDisplay(unresolvedStartingStream, 0) === 'To be confirmed', 'a null starting rate reads "To be confirmed", never a false $0.00');
check(dueAtPlanStartDisplay(unresolvedStartingStream, 0) !== formatMoney(0), 'a null starting rate is never literally rendered as $0.00');
const resolvedStartingStream = [summary({ startMonth: 0, price: 200 })];
check(dueAtPlanStartDisplay(resolvedStartingStream, 0) === formatMoney(200), 'a resolved starting rate still shows its real, unchanged total');

// Real numeric zero is still $0.00, never confused with an unresolved
// price — the null-check (`!== null`), not a falsy-check, is what makes
// this distinction possible everywhere above.
check(formatMoney(0) === '$0.00', 'a real numeric zero still formats as $0.00');
check(subtotalCell(summary({ isOngoing: true, price: 0, subtotal: null })) === '$0.00', 'a real zero rate on an open-ended stream reads $0.00, not "To be confirmed"');
check(dueAtPlanStartDisplay([summary({ startMonth: 0, price: 0 })], 0) === '$0.00', 'a real zero starting rate reads $0.00, not "To be confirmed"');

console.log('Plan Details value states contract passed.');
