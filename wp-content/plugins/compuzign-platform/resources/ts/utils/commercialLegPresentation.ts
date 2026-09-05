import { formatCycleLabel } from './format';
import type { CommercialLegComponent, CommercialLegPeriod, CommercialLegPricedItem } from '@/api/types/cost-builder';
import type { QuotedBreakdownComponent, QuotedBreakdownInclusion, QuotedBreakdownPeriod, QuotedCartBreakdown, QuotedExtensionGroup } from './paymentSummary';

// Relocated from package-builder/commercialLegPresentation.ts (auditor
// correction, 2026-09-05, "leg-level breakdown presentation customer
// view" follow-up "incomplete View Details parity"): PDF/Review/customer
// View-Print/email needed the SAME Billing Breakdown by Period semantics
// PlanDetailsModal.tsx already established, and the cart quick-view needed
// FamilyTierAdapter.tsx's own base/Extensions grouping — both package-
// builder components. A prior round hand-copied both rule sets into
// cost-builder/PricingTiers.tsx and cost-builder/InclusionDisclosure.tsx,
// which the auditor rejected as duplicated logic that can drift. This file
// is the one place both layers import these rules from: package-builder
// (PlanDetailsModal.tsx, FamilyTierAdapter.tsx — the live, catalog-
// resolved callers) and cost-builder (InclusionDisclosure.tsx, reused by
// Admin print — the durable, already-captured-snapshot callers). Living
// in utils/ (not package-builder/) is what makes that legal: package-
// builder already depends on cost-builder (see buildLegPaymentSummaries()
// imports below), never the reverse, so shared logic needs a home neither
// owns. Every helper here is pure presentation math with no React/Preact
// import, so pulling it into any bundle costs nothing beyond its own
// function bodies — unlike cost-builder/PricingTiers.tsx's whole customer
// pricing UI component tree, which is why THAT file is still never
// imported from here.

// "Month 1–12" / "Month 13–Indefinite" — built entirely from the Period's
// own resolved from_month/to_month, the same "Indefinite" convention the
// Commercial Legs Debug tool already uses for a null to_month. Not a
// marketing label: there is no other existing customer-facing terminology
// for a resolved Period to reuse instead.
export function periodLabel(period: CommercialLegPeriod): string {
  const to = period.to_month === null ? 'Indefinite' : String(period.to_month);
  return `Month ${period.from_month}–${to}`;
}

// One Period's own AVAILABLE commercial components, in the resolver's own
// order — the single place "available" is defined. Never counts an
// unavailable component; never re-sorts or re-groups what the resolver
// already returned.
export function availablePeriodComponents(period: CommercialLegPeriod): CommercialLegComponent[] {
  return period.components.filter((component) => component.available);
}

// Every AVAILABLE commercial component across a variant's resolved Periods,
// in the Periods'/components' own resolved order — the flattened form of
// availablePeriodComponents() above.
export function availableComponents(periods: CommercialLegPeriod[]): CommercialLegComponent[] {
  return periods.flatMap(availablePeriodComponents);
}

// Customer-facing name for one resolved commercial component — the exact
// billing-cycle vocabulary already audited elsewhere in this codebase
// (PricingTiers.tsx's own maps, utils/format.ts's CYCLE_LABELS): monthly/
// annual/annually/quarterly/one-time/upfront. A neutral fallback ('Payment')
// covers both a genuinely null billing_cycle and any future/unmapped value.
const COMPONENT_PAYMENT_NAMES: Record<string, string> = {
  monthly: 'Monthly payment',
  annual: 'Annual payment',
  annually: 'Annual payment',
  quarterly: 'Quarterly payment',
  'one-time': 'One-time payment',
  upfront: 'Upfront payment',
};

export function componentPaymentName(cycle: string | null): string {
  if (cycle === null) return 'Payment';
  return COMPONENT_PAYMENT_NAMES[cycle] ?? 'Payment';
}

// Short, capitalized billing-cycle labels — used by the focused shell's
// "Plan billing" fact and, since Phase 7, the Plan Details popup's own
// Frequency column/sentence labels.
export const PLAN_BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
  annually: 'Annual',
  quarterly: 'Quarterly',
  'one-time': 'One-time',
  upfront: 'Upfront',
};

export function frequencyLabel(cycle: string | null): string {
  return cycle !== null ? (PLAN_BILLING_CYCLE_LABELS[cycle] ?? 'Payment') : 'Payment';
}

// Phase 7C: Payment Category — the exact same billing_cycle-derived
// synthesis the admin Pricing Rules/Edition editors already use
// (paymentCategoryOf() in TierPricingRulesEditor.tsx /
// TierEditionOverviewFields.tsx: "No separate stored field: derived from
// billing_cycle itself"). billing_cycle stays the one source of truth; no
// payment_category field added anywhere. A `null` cycle is never
// confidently called Fixed or Recurring, same neutral-fallback convention
// frequencyLabel()/componentPaymentName() above already use.
export function paymentCategoryLabel(cycle: string | null): string {
  if (cycle === null) return 'Payment';
  return cycle === 'one-time' || cycle === 'upfront' ? 'Fixed payment' : 'Recurring payment';
}

// Cents-precise currency — deliberately NOT utils/format.ts's formatPrice()
// (which rounds to whole dollars for the card/summary price displays
// elsewhere). The Plan Details/View Details experience's own per-item Unit
// Price/Total figures are genuinely sub-dollar (see e.g. a $0.05 unit
// price) and would silently round to $0 under that helper, misstating a
// real line item — so this is a second formatter covering a different
// display need, not a duplicate of the same one.
export function formatMoney(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Spelled-out cadence suffix ("/ month", "/ year") for the Plan Details/
// View Details experience's own longer-form copy — the focused shell's
// compact stage cards use PricingTiers.tsx's own cycleSuffix()'s
// abbreviated "/ mo"/"/ yr" instead (a deliberately different established
// wording convention for a different, more compact surface — not
// duplicated logic prone to drift, since the two are never asked to agree).
// Folded into one flat override map (rather than falling back to
// PricingTiers.tsx's cycleSuffix() the way an earlier revision did) so
// this file never depends on that component-tree-heavy module.
const LONG_CADENCE_SUFFIX_OVERRIDES: Record<string, string> = {
  monthly: '/ month',
  annual: '/ year',
  annually: '/ year',
  quarterly: '/ quarter',
  upfront: '/ upfront',
  'one-time': '/ once',
};

export function billingSuffixLong(cycle: string | null): string {
  if (cycle === null) return '';
  return LONG_CADENCE_SUFFIX_OVERRIDES[cycle] ?? formatCycleLabel(cycle);
}

export function priceWithCadence(price: number | null, cycle: string | null): string {
  const suffix = billingSuffixLong(cycle);
  return suffix ? `${formatMoney(price)} ${suffix}` : formatMoney(price);
}

// Customer-facing month range — this popup's own presentation only, never
// the resolver's/backend's raw from_month/to_month values, which are
// untouched everywhere else (the left timeline's own stage headers still
// read periodLabel() above unchanged; this is a separate, View
// Details-only formatter so that unrelated surface is never affected).
//
// A technical `0` start reads to a customer as if it were itself a whole
// extra month inside a range ("0–48" looks like 49 months against a
// 48-month commitment) — "Plan start" replaces the bare 0 instead. Every
// other start month is unambiguous as a plain number. The end side stays a
// real month number (or "Ongoing" for a still-open range) either way; it
// only needs its own "Month" word when the start side didn't already
// supply one (i.e. "Plan start–Month 10", vs "Month 11–48" where "Month"
// is read once for the whole range).
export function customerFacingRange(from: number, to: number | null): string {
  const startsAtPlanStart = from === 0;
  const startLabel = startsAtPlanStart ? 'Plan start' : `Month ${from}`;
  const endLabel = to === null ? 'Ongoing' : (startsAtPlanStart ? `Month ${to}` : `${to}`);
  return `${startLabel}–${endLabel}`;
}

// Same payment/inclusion composition as another component of the SAME
// source — billing_cycle, price, and every claimed item (id/quantity/unit
// price/line total) all identical. Used only to decide whether a Period's
// rendered breakdown for this component is a genuine repeat of the
// IMMEDIATELY PRECEDING Period's own (never any earlier one, never a
// same-Period different-source comparison) — never a resolver-level
// dedupe, never merges/changes what's rendered elsewhere.
export function sameComposition(a: CommercialLegComponent, b: CommercialLegComponent): boolean {
  if (a.billing_cycle !== b.billing_cycle || a.price !== b.price) return false;
  if (a.items.length !== b.items.length) return false;
  return a.items.every((item, i) => {
    const other = b.items[i];
    return !!other
      && item.item_id === other.item_id
      && item.quantity === other.quantity
      && item.unit_price === other.unit_price
      && item.line_total === other.line_total;
  });
}

// Phase 2 of the focused Tier/Edition inclusion blueprint. First-seen-wins
// per source across every resolved Period — a Leg's own billing_cycle and
// claimed items[] are built ONCE from the container's static declaration,
// so every repeated appearance of the same source is structurally
// guaranteed identical; there is nothing to reconcile between Periods.
// Grouping key is component.source alone, never billing_cycle (two
// different Legs sharing a cadence stay two groups) and never Default-vs-
// Additional classification.
export interface CommercialLegInclusionGroup {
  source: string;
  billingCycle: string | null;
  price: number | null;
  items: CommercialLegPricedItem[];
}

export function commercialLegInclusionGroups(periods: CommercialLegPeriod[]): CommercialLegInclusionGroup[] {
  const groups: CommercialLegInclusionGroup[] = [];
  const seen = new Set<string>();
  for (const component of availableComponents(periods)) {
    if (seen.has(component.source)) continue;
    seen.add(component.source);
    groups.push({ source: component.source, billingCycle: component.billing_cycle, price: component.price, items: component.items });
  }
  return groups;
}

// Focused-card "Extensions" — Phase 5C. Same shape as CommercialLegInclusionGroup
// (a distinct name only so a renderer reads as Extension-specific, never a
// second interface to keep in sync).
export type CommercialLegExtensionGroup = CommercialLegInclusionGroup;

// Headline-Leg-relative, not "any two Legs collide": the Headline Leg
// (component.source === headlineLegId — the same real Leg
// resolveHeadlinePrice() (PricingTiers.tsx) already resolves the card's own
// headline price/cycle from) is the one fixed reference point every other
// Leg is compared against. An Other Leg is an Extension candidate only if
// IT SPECIFICALLY overlaps the Headline Leg in some resolved Period (never
// a generic pairwise collision among arbitrary Legs); once eligible, only
// its differences/additions relative to the Headline Leg's own items[] (by
// exact item_id) are shown — an item identical to the Headline Leg's own
// claim (same item_id, same quantity) is already fully explained there and
// is never repeated as an Extension.
export function commercialLegExtensionGroups(
  periods: CommercialLegPeriod[],
  headlineLegId: string | null | undefined,
): CommercialLegExtensionGroup[] {
  if (!headlineLegId) return [];
  const legGroups = commercialLegInclusionGroups(periods);
  const headlineGroup = legGroups.find((group) => group.source === headlineLegId);
  if (!headlineGroup) return [];
  const headlineItemsById = new Map(headlineGroup.items.map((item) => [item.item_id, item]));

  // Other Leg sources that are available in the SAME resolved Period as the
  // Headline Leg — Headline <-> Other only, read straight off periods.
  const overlappingOtherSources = new Set<string>();
  for (const period of periods) {
    const availableSources = availablePeriodComponents(period).map((component) => component.source);
    if (!availableSources.includes(headlineLegId)) continue;
    for (const source of availableSources) {
      if (source !== headlineLegId) overlappingOtherSources.add(source);
    }
  }

  const groups: CommercialLegExtensionGroup[] = [];
  for (const group of legGroups) {
    if (group.source === headlineLegId) continue; // the Headline Leg is the baseline, never its own Extension
    if (!overlappingOtherSources.has(group.source)) continue; // never overlaps the Headline Leg -> no Extension group at all
    const items = group.items.filter((item) => {
      const headlineItem = headlineItemsById.get(item.item_id);
      return !headlineItem || headlineItem.quantity !== item.quantity; // addition (Headline doesn't claim it) or a differing quantity
    });
    if (items.length === 0) continue;
    groups.push({ source: group.source, billingCycle: group.billingCycle, price: group.price, items });
  }
  return groups;
}

// Extension group heading — "Extensions billed {cycle}" (e.g. "Extensions
// billed Annually"). A fourth, deliberately separate cycle-word map: none
// of frequencyLabel()/componentPaymentName()/billingSuffixLong() above fit
// verbatim (this heading needs "Annually", not "Annual"/"Annual payment"/
// "/ year"). Same never-leak-the-raw-cycle-string rule as every other map
// in this file: an unmapped/null cycle falls back to the bare 'Extensions'
// heading, never the raw backend string.
const EXTENSION_BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'Annually',
  annually: 'Annually',
  quarterly: 'Quarterly',
  'one-time': 'One-time',
  upfront: 'Upfront',
};

export function extensionHeading(billingCycle: string | null): string {
  const label = billingCycle !== null ? EXTENSION_BILLING_CYCLE_LABELS[billingCycle] : undefined;
  return label ? `Extensions billed ${label}` : 'Extensions';
}

// Auditor correction (2026-09-05, "leg-level breakdown presentation
// customer view"): deliberately drops item.item_id — a Rate Sheet item key
// — since this snapshot is submitted/persisted/returned to the customer
// verbatim (see QuotedBreakdownInclusion's own docblock, ./paymentSummary).
function mapBreakdownInclusion(item: CommercialLegPricedItem): QuotedBreakdownInclusion {
  return {
    label: item.label,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    lineTotal: item.line_total,
    includes: item.includes ? item.includes.map(mapBreakdownInclusion) : null,
  };
}

// Preserves every Period/component/inclusion occurrence from the resolved
// CommercialLegPeriod[] EXACTLY ONCE — the deliberate opposite of
// buildLegPaymentSummaries() (cost-builder/PricingTiers.tsx, which
// deduplicates by component.source into one continuous stream, discarding
// component.items entirely) and never commercialLegInclusionGroups()'s
// first-seen-wins live-display shape either — both exist to answer a
// different question, and neither retains which specific inclusion, at
// what quantity/unit price/line total, produced a given Period's charge.
// This is the one place that preserves it, captured once at Add-to-Quote
// time (FamilyTierAdapter.tsx's itemFor(), ComposableOfferBrowser.tsx's
// buildComposableFamilyTierQuoteItem()) so customer-facing surfaces can
// EXPLAIN — not just state — a quoted charge, without ever re-resolving
// live catalog/Rate Sheet data. Also called directly by PlanDetailsModal.tsx
// itself (the LIVE popup) immediately before periodBreakdownRows() below —
// the auditor's required "same semantic derivation" for both the live
// popup and the durable PDF/email/View-Print rendering.
//
// Each component also carries continuesFromPrevious, computed here (while
// live Leg identity is still available to pair a component with its own
// predecessor in the immediately preceding Period) via sameComposition()
// above — periodBreakdownRows() never needs Leg identity to know whether
// to repeat an inclusion table.
export function buildQuotedCommercialBreakdown(periods: CommercialLegPeriod[]): QuotedBreakdownPeriod[] {
  return periods.map((period, periodIndex) => {
    const previousAvailable = periodIndex > 0
      ? periods[periodIndex - 1].components.filter((c) => c.available)
      : [];
    const previousBySource = new Map(previousAvailable.map((c) => [c.source, c] as const));
    return {
      fromMonth: period.from_month,
      toMonth: period.to_month,
      components: period.components
        .filter((component) => component.available)
        .map((component) => {
          const previous = previousBySource.get(component.source);
          const continuesFromPrevious = previous !== undefined && sameComposition(previous, component);
          return {
            // component.source (a Leg Platform ID) deliberately dropped —
            // see QuotedBreakdownComponent's own docblock (./paymentSummary).
            // Distinct component occurrences are identified by snapshot
            // position when rendering (periodBreakdownRows() below).
            billingCycle: component.billing_cycle,
            price: component.price,
            inclusions: component.items.map(mapBreakdownInclusion),
            continuesFromPrevious,
          };
        }),
    };
  });
}

// The cart quick-view's own compact shape — the Headline Leg's own claimed
// items shown once (never per-Period), any OTHER Leg overlapping the
// Headline Leg in some Period shown as a separate "Extensions billed X"
// group, containing only its differences/additions relative to the
// Headline Leg's own claims. Computed once at capture time from the same
// live-resolved CommercialLegPeriod[] buildQuotedCommercialBreakdown()
// reads — never re-derived from ITS output, which by design no longer
// carries the Leg identity this grouping needs.
export function buildQuotedCartBreakdown(
  periods: CommercialLegPeriod[],
  headlineLegId: string | null | undefined,
): QuotedCartBreakdown {
  const groups = commercialLegInclusionGroups(periods);

  if (!headlineLegId || !groups.some((group) => group.source === headlineLegId)) {
    // Auditor correction (2026-09-05, "leg-level breakdown presentation
    // customer view" follow-up "remaining breakdown parity defects"): no
    // distinguishable Headline Leg. A genuinely simple one-Leg Tier is
    // still harmless — that one group's own claims ARE the base quick-view
    // (there is nothing to extend against with only one Leg anyway). But
    // MULTIPLE resolved Legs with no valid headline must never be merged
    // into one fabricated base list (an earlier revision did exactly
    // that) — return no derived cart breakdown at all in that case, so the
    // caller's existing generic inclusionItems/features fallback renders
    // instead (disclosureRowsForFamilyTierItem(), cost-builder/
    // InclusionDisclosure.tsx, which already treats an empty
    // baseInclusions+extensionGroups pair as "absent").
    if (groups.length === 1) {
      return { baseInclusions: groups[0].items.map(mapBreakdownInclusion), extensionGroups: [] };
    }
    return { baseInclusions: [], extensionGroups: [] };
  }

  const headline = groups.find((group) => group.source === headlineLegId)!;
  const extensionGroups: QuotedExtensionGroup[] = commercialLegExtensionGroups(periods, headlineLegId).map((group) => ({
    billingCycle: group.billingCycle,
    price: group.price,
    heading: extensionHeading(group.billingCycle),
    inclusions: group.items.map(mapBreakdownInclusion),
  }));

  return {
    baseInclusions: headline.items.map(mapBreakdownInclusion),
    extensionGroups,
  };
}

// Auditor correction (2026-09-05, "leg-level breakdown presentation
// customer view" follow-up "incomplete View Details parity"): the ONE
// shared row derivation for PlanDetailsModal.tsx's Billing Breakdown by
// Period section — both the LIVE popup (which converts its own periods via
// buildQuotedCommercialBreakdown() immediately before calling this) and
// the durable PDF/Review/customer View-Print/email rendering
// (periodBreakdownRowsForFamilyTierItem(), cost-builder/
// InclusionDisclosure.tsx, which already has the pre-built
// commercialBreakdown snapshot) call this exact function — never two
// separate implementations of the same rule. A discriminated union
// mirrors PlanDetailsModal's own JSX structure exactly:
// - periodHeading: customerFacingRange() heading for the Period;
// - periodPaymentFact: the ONE "Active payments"/payment-category line
//   summing every active component's own priceWithCadence();
// - componentNote: a component's own "Begins in Month X"/"Continues
//   unchanged" sentence, split into a bold cadenceLabel ("Monthly payment")
//   and plain statusText so a caller can style them like PlanDetailsModal's
//   own <strong> prefix — shown when the Period has multiple simultaneous
//   components (collision) or this one is continuing unchanged;
// - componentTableLabel: "{cadence} payment breakdown:" — only precedes a
//   component's own table when the Period has a collision;
// - inclusion: one priced row (a Bundle child sets isChild);
// - componentTotal: "{cadence} total: $X" (or "Total: $X" with no cadence)
//   for that component's own inclusion table — omitted entirely when the
//   component is continuing unchanged (no table, no total either).
export type PeriodBreakdownRow =
  | { kind: 'periodHeading'; id: string; label: string }
  | { kind: 'periodPaymentFact'; id: string; label: string; value: string }
  | { kind: 'componentNote'; id: string; cadenceLabel: string; statusText: string }
  | { kind: 'componentTableLabel'; id: string; text: string }
  | { kind: 'inclusion'; id: string; label: string; quantity: number | null; unitPrice: number | null; lineTotal: number | null; isChild: boolean }
  | { kind: 'componentTotal'; id: string; label: string; value: string };

function inclusionRowsFor(inclusion: QuotedBreakdownInclusion, keyPrefix: string, isChild: boolean): PeriodBreakdownRow[] {
  return [
    { kind: 'inclusion', id: keyPrefix, label: inclusion.label, quantity: inclusion.quantity, unitPrice: inclusion.unitPrice, lineTotal: inclusion.lineTotal, isChild },
    ...(inclusion.includes ?? []).flatMap((child, ci) => inclusionRowsFor(child, `${keyPrefix}:child:${ci}`, true)),
  ];
}

// Auditor correction (2026-09-05, "leg-level breakdown presentation
// customer view" follow-up "remaining breakdown parity defects"): mirrors
// PlanDetailsModal.tsx's own periodItemsTotalDisplay() EXACTLY — top-level
// priced inclusions only. Bundle children (inclusion.includes) are
// display-only, same convention as ItemBreakdownTable's own "Included"
// cells for them (never a real unit price/line total of their own) — an
// earlier revision recursed into them here, which could turn a fully
// resolved Bundle parent into a fabricated "To be confirmed" (a null-ish
// display child) or silently double-count child facts never meant to be
// priced at all. A null lineTotal on any TOP-LEVEL inclusion still means
// the component's own total is genuinely unresolved — never silently
// skipped into a partial sum that reads as the real total.
function componentTotalValue(inclusions: QuotedBreakdownInclusion[]): string {
  if (inclusions.some((i) => i.lineTotal === null)) return 'To be confirmed';
  const total = inclusions.reduce((sum, i) => sum + (i.lineTotal ?? 0), 0);
  return formatMoney(total);
}

export function periodBreakdownRows(periods: QuotedBreakdownPeriod[]): PeriodBreakdownRow[] {
  const rows: PeriodBreakdownRow[] = [];
  periods.forEach((period, periodIndex) => {
    const components = period.components;
    if (components.length === 0) return;

    rows.push({ kind: 'periodHeading', id: `period:${periodIndex}`, label: customerFacingRange(period.fromMonth, period.toMonth) });

    const collision = components.length > 1;
    const recurringCostLine = components.map((c) => priceWithCadence(c.price, c.billingCycle)).join(' + ');
    rows.push({
      kind: 'periodPaymentFact',
      id: `fact:${periodIndex}`,
      label: collision ? 'Active payments' : paymentCategoryLabel(components[0].billingCycle),
      value: recurringCostLine,
    });

    components.forEach((component, componentIndex) => {
      if (collision || component.continuesFromPrevious) {
        const priceLabel = priceWithCadence(component.price, component.billingCycle);
        const statusText = component.continuesFromPrevious
          ? `Continues unchanged at ${priceLabel}`
          : `Begins in Month ${period.fromMonth} at ${priceLabel}`;
        rows.push({ kind: 'componentNote', id: `note:${periodIndex}:${componentIndex}`, cadenceLabel: `${frequencyLabel(component.billingCycle)} payment`, statusText });
      }
    });

    components.forEach((component, componentIndex) => {
      if (component.continuesFromPrevious) return; // already shown, unchanged, last Period — no repeated table
      const keyPrefix = `component:${periodIndex}:${componentIndex}`;
      if (collision) {
        rows.push({ kind: 'componentTableLabel', id: `${keyPrefix}:label`, text: `${frequencyLabel(component.billingCycle)} payment breakdown:` });
      }
      component.inclusions.forEach((inclusion, i) => {
        rows.push(...inclusionRowsFor(inclusion, `${keyPrefix}:${i}`, false));
      });
      const totalLabel = component.billingCycle !== null ? `${frequencyLabel(component.billingCycle)} total` : 'Total';
      rows.push({ kind: 'componentTotal', id: `${keyPrefix}:total`, label: totalLabel, value: componentTotalValue(component.inclusions) });
    });
  });
  return rows;
}
