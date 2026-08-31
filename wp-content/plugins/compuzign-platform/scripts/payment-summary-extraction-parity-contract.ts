// CRM-1C: proves the cost-builder -> admin-station bundle-boundary
// extraction (computeTotalContractValue/startingPaymentsByCycle/
// chargeTypeLabel + LegPaymentSummary, moved from
// components/cost-builder/PricingTiers.tsx to utils/paymentSummary.ts) is
// behavior-preserving — fixed fixtures with hand-computed expected results,
// plus a structural check that no source file still imports these symbols
// from their old location (which would mean two divergent implementations).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { computeTotalContractValue, startingPaymentsByCycle, chargeTypeLabel } from '../resources/ts/utils/paymentSummary';
import type { LegPaymentSummary } from '../resources/ts/utils/paymentSummary';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Payment summary extraction parity: ${message}`);
}

// ── computeTotalContractValue ────────────────────────────────────────────────

const finiteSummaries: LegPaymentSummary[] = [
  { source: 'leg_upfront', billingCycle: 'one-time', price: 200, startMonth: 0, endMonth: 0, isOngoing: false, occurrenceMonths: [0], subtotal: 200 },
  { source: 'leg_monthly', billingCycle: 'monthly', price: 100, startMonth: 0, endMonth: 12, isOngoing: false, occurrenceMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], subtotal: 1200 },
];
check(computeTotalContractValue(finiteSummaries) === 1400, 'computeTotalContractValue sums every finite subtotal (200 + 1200 = 1400)');

const ongoingSummaries: LegPaymentSummary[] = [
  ...finiteSummaries,
  { source: 'leg_ongoing', billingCycle: 'monthly', price: 50, startMonth: 0, endMonth: null, isOngoing: true, occurrenceMonths: [], subtotal: null },
];
check(computeTotalContractValue(ongoingSummaries) === null, 'a single ongoing (subtotal: null) Leg makes the whole total non-finite, not silently 0');

check(computeTotalContractValue([]) === 0, 'an empty summary list totals to 0, not null');

// ── startingPaymentsByCycle ──────────────────────────────────────────────────

const itemA: LegPaymentSummary[] = [
  { source: 'a_monthly', billingCycle: 'monthly', price: 100, startMonth: 0, endMonth: 12, isOngoing: false, occurrenceMonths: [0], subtotal: 1200 },
  { source: 'a_later', billingCycle: 'monthly', price: 999, startMonth: 6, endMonth: 12, isOngoing: false, occurrenceMonths: [6], subtotal: 999 },
];
const itemB: LegPaymentSummary[] = [
  { source: 'b_monthly', billingCycle: 'monthly', price: 50, startMonth: 0, endMonth: 12, isOngoing: false, occurrenceMonths: [0], subtotal: 600 },
  { source: 'b_upfront', billingCycle: 'upfront', price: 300, startMonth: 0, endMonth: 0, isOngoing: false, occurrenceMonths: [0], subtotal: 300 },
];
const starting = startingPaymentsByCycle([itemA, itemB]);
const startingMap = new Map(starting);
check(startingMap.get('monthly') === 150, 'same-cycle starting streams from different items combine (100 + 50 = 150), a later-starting stream within an item is excluded (999 not counted)');
check(startingMap.get('upfront') === 300, 'a different cycle starting at the same month stays a separate bucket, never summed with monthly');
check(starting.length === 2, 'exactly two buckets — monthly and upfront — no cross-cycle collapse');
check(startingPaymentsByCycle([[], []]).length === 0, 'items with no streams contribute no buckets');

// ── chargeTypeLabel ───────────────────────────────────────────────────────────

check(chargeTypeLabel('monthly') === 'Monthly', 'monthly -> Monthly');
check(chargeTypeLabel('annual') === 'Yearly' && chargeTypeLabel('annually') === 'Yearly', 'annual/annually both -> Yearly');
check(chargeTypeLabel('quarterly') === 'Quarterly', 'quarterly -> Quarterly');
check(chargeTypeLabel('upfront') === 'Upfront', 'upfront -> Upfront');
check(chargeTypeLabel('one-time') === 'One-time', "one-time -> One-time");
check(chargeTypeLabel(null) === 'Payment', 'null cycle -> the generic Payment fallback');
check(chargeTypeLabel('unknown-cycle') === 'Payment', 'an unrecognized cycle string also falls back to Payment, never throws or returns undefined');

// ── No divergent second implementation left behind ───────────────────────────

const root = resolve(import.meta.dirname, '..');
const pricingTiers = readFileSync(resolve(root, 'resources/ts/components/cost-builder/PricingTiers.tsx'), 'utf8');
check(!/export function computeTotalContractValue/.test(pricingTiers), 'PricingTiers.tsx no longer defines its own computeTotalContractValue');
check(!/export function startingPaymentsByCycle/.test(pricingTiers), 'PricingTiers.tsx no longer defines its own startingPaymentsByCycle');
check(!/export function chargeTypeLabel/.test(pricingTiers), 'PricingTiers.tsx no longer defines its own chargeTypeLabel');
check(!/export interface LegPaymentSummary/.test(pricingTiers), 'PricingTiers.tsx no longer declares its own LegPaymentSummary — imports the type from utils/paymentSummary instead');

const consumers = [
  'resources/ts/components/cost-builder/QuoteSummary.tsx',
  'resources/ts/components/package-builder/PlanDetailsModal.tsx',
  'resources/ts/components/package-builder/QuoteDetailsOverlay.tsx',
  'resources/ts/components/request-flow/OrderSummary.tsx',
  'resources/ts/components/request-flow/QuoteProposalPreview.tsx',
  'resources/ts/components/cost-builder/types.ts',
];
for (const relativePath of consumers) {
  const source = readFileSync(resolve(root, relativePath), 'utf8');
  check(source.includes("from '@/utils/paymentSummary'"), `${relativePath} imports from utils/paymentSummary`);

  const pricingTiersImportLines = source.split('\n').filter((line) => /from ['"](@\/components\/cost-builder\/)?\.?\/?PricingTiers['"]/.test(line));
  const leaked = pricingTiersImportLines.some((line) => /computeTotalContractValue|startingPaymentsByCycle|chargeTypeLabel|LegPaymentSummary/.test(line));
  check(!leaked, `${relativePath} does not import the extracted symbols from PricingTiers`);
}

console.log('Payment summary extraction parity contract passed.');
