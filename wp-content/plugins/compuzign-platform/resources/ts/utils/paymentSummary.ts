// CRM-1C: extracted out of cost-builder/PricingTiers.tsx so Admin Station's
// Request print (a pure presentational reuse of the customer proposal) can
// consume these three payment helpers without importing PricingTiers.tsx's
// whole customer pricing UI component tree into the admin-station bundle.
// No arithmetic, labels, or behavior changed from the original — every
// existing customer caller (QuoteSummary.tsx, PlanDetailsModal.tsx,
// QuoteDetailsOverlay.tsx, OrderSummary.tsx, QuoteProposalPreview.tsx) now
// imports these three symbols from here instead, byte-for-byte unchanged.
// `PricingTiers.tsx` itself imports `LegPaymentSummary` from here for
// `buildLegPaymentSummaries()`'s return type — that function stays there,
// since it isn't needed by admin print (a durable Request snapshot already
// carries precomputed `legPaymentSummaries`, never raw commercial Periods).

// One continuous Commercial Leg/payment stream's own resolved facts —
// deduplicated by component.source across every Period it appears in (see
// `buildLegPaymentSummaries()` in cost-builder/PricingTiers.tsx). NOT a
// Period fragment: a Leg repeating across two adjacent Periods (because a
// different Leg starts or stops) collapses to exactly one of these.
export interface LegPaymentSummary {
  source: string;
  billingCycle: string | null;
  price: number | null;
  startMonth: number;
  // The Leg's own resolved last appearance's to_month, falling back to the
  // Tier/Edition parent's own commitment when that appearance is open-ended
  // (to_month === null). Still null when neither is available (genuinely
  // open-ended, no commitment on file).
  endMonth: number | null;
  // True only for a RECURRING Leg (never one-time/upfront) whose endMonth is
  // still null after the commitment fallback — genuinely open-ended, no
  // numeric cap anywhere to project a finite schedule from. occurrenceMonths
  // is empty and subtotal is null in this case: a single known first charge
  // is not "1 occurrence" of a finite stream, and must never be presented as
  // a finite Total Contract Value contributor.
  isOngoing: boolean;
  occurrenceMonths: number[];
  subtotal: number | null;
}

// A finite Total Contract Value is only meaningful when EVERY contributing
// Leg has one — a single ongoing Leg (subtotal === null) makes the whole
// total non-finite, never silently skipped/treated as 0 while still
// producing a numeric sum from the other Legs.
export function computeTotalContractValue(summaries: LegPaymentSummary[]): number | null {
  if (summaries.some((s) => s.subtotal === null)) return null;
  return summaries.reduce((sum, s) => sum + (s.subtotal ?? 0), 0);
}

// What's due right now, across multiple quoted items, kept strictly separate
// by billing cycle — never a cross-cycle sum (a $160,000 Upfront charge and
// a $156.50 Monthly charge both starting at their own item's month 0 must
// never collapse into one number), but genuinely same-cycle streams from
// DIFFERENT items DO add (two items each billing Monthly from their own
// start is one real combined Monthly charge).
//
// Takes one stream list per item (never a FamilyTierQuoteItem itself, which
// would pull a cost-builder/types.ts-shaped dependency in here) — a pure
// function over the same LegPaymentSummary[] shape computeTotalContractValue()
// already operates on, so callers pass `item.legPaymentSummaries ?? []` per item.
//
// "Starting" is each item's OWN earliest resolved startMonth (never month 0
// literally, never a shared/global start — two items added to the quote at
// different times each have their own independent commercial timeline) —
// only streams AT that minimum count; a stream beginning later within the
// same item (e.g. a Leg that only starts in Month 6) is correctly excluded.
export function startingPaymentsByCycle(itemStreams: LegPaymentSummary[][]): Array<[string, number]> {
  const order: string[] = [];
  const totals = new Map<string, number>();
  for (const streams of itemStreams) {
    if (streams.length === 0) continue;
    const earliestStart = Math.min(...streams.map((s) => s.startMonth));
    for (const stream of streams) {
      if (stream.startMonth !== earliestStart || stream.price === null || stream.billingCycle === null) continue;
      if (!totals.has(stream.billingCycle)) {
        order.push(stream.billingCycle);
        totals.set(stream.billingCycle, 0);
      }
      totals.set(stream.billingCycle, totals.get(stream.billingCycle)! + stream.price);
    }
  }
  return order.map((cycle) => [cycle, totals.get(cycle)!]);
}

// Full charge-type word for an order-summary-style layout where the cycle is
// its own left-hand label ("Monthly  $157.00") — the OPPOSITE convention
// from PricingTiers.tsx's own cycleSuffix() (a slash suffix attached to the
// price itself, "$157 / mo"). Never both on the same row: a caller using
// this label never also appends cycleSuffix()/formatCycleLabel() to the
// price beside it. "Yearly" (not Plan Details' "Annual" — see
// PLAN_BILLING_CYCLE_LABELS in package-builder/commercialLegPresentation.ts)
// matches the existing admin billing-cycle vocabulary already used for the
// customer-facing word elsewhere (TierPricingRulesEditor.tsx/
// TierEditionOverviewFields.tsx's own 'annually' -> 'Yearly' option label).
const CHARGE_TYPE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'Yearly',
  annually: 'Yearly',
  quarterly: 'Quarterly',
  upfront: 'Upfront',
  'one-time': 'One-time',
};

export function chargeTypeLabel(cycle: string | null): string {
  if (cycle === null) return 'Payment';
  return CHARGE_TYPE_LABELS[cycle] ?? 'Payment';
}

// Live-gate correction (2026-09-05, "preserve period/leg inclusion
// attribution in quote snapshots"): the additive, attribution-preserving
// sibling of LegPaymentSummary above. LegPaymentSummary answers "what do I
// pay and when" by deduplicating every Period a Leg source appears in down
// to one continuous stream — deliberately discarding which specific
// inclusion, at what quantity/unit price/line total, produced that figure
// (see buildLegPaymentSummaries(), cost-builder/PricingTiers.tsx, which
// never reads component.items at all). These three types answer "what does
// that charge actually include": one entry per Period, per available
// component, per priced inclusion — the ORIGINAL occurrences, never
// deduplicated across Periods, since the same Leg's own inclusion set can
// genuinely differ Period to Period. See buildQuotedCommercialBreakdown()
// (cost-builder/PricingTiers.tsx) for the producer, and
// FamilyTierQuoteItem.commercialBreakdown (cost-builder/types.ts) for where
// it's captured once at Add-to-Quote time.

// One priced inclusion's full commercial attribution, mirroring
// CommercialLegPricedItem (@/api/types/cost-builder) field-for-field.
// Bundle children travel via `includes`, same display-only convention as
// ServiceInclusion.includes/CommercialLegPricedItem.includes — never
// separately priced/selectable entries of their own.
export interface QuotedBreakdownInclusion {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  includes?: QuotedBreakdownInclusion[] | null;
}

// One resolved commercial component's (a Leg's) own priced inclusions
// within ONE Period. `source` is kept ONLY for stable internal grouping —
// it matches CommercialLegComponent.source (a Leg Platform ID, or the
// literal 'default' legacy fallback) and must never be shown to a
// customer.
export interface QuotedBreakdownComponent {
  source: string;
  billingCycle: string | null;
  price: number | null;
  inclusions: QuotedBreakdownInclusion[];
}

// One resolved, time-scoped Period's own available components.
export interface QuotedBreakdownPeriod {
  fromMonth: number;
  toMonth: number | null;
  components: QuotedBreakdownComponent[];
}
