import { useEffect, useRef } from 'preact/hooks';
import { buildLegPaymentSummaries, computeTotalContractValue, cycleSuffix } from '@/components/cost-builder/PricingTiers';
import type { LegPaymentSummary } from '@/components/cost-builder/PricingTiers';
import type { CommercialLegComponent, CommercialLegPeriod, CommercialLegPricedItem } from '@/api/types/cost-builder';
import { availablePeriodComponents, PLAN_BILLING_CYCLE_LABELS } from './commercialLegPresentation';

// Phase 7 — View Plan Details popup. Presentation only: every number here is
// read straight from the SAME resolved Periods/components/items the focused
// shell's own timeline already renders (see FamilyTierAdapter.tsx's
// activePeriods) — no new resolver call, no second commercial model.
//
// Phase 7E: no `isOpen` prop — the caller only ever mounts this component
// while a Plan Details target identity is set, keyed by
// `${platformId}:${openGeneration}` (see FamilyTierAdapter.tsx), so mounting
// IS opening and unmounting IS closing. Every open is therefore a genuinely
// fresh component instance — fresh refs, fresh scroll-lock/focus-trap effect
// — never the same instance with its props merely updated.

interface PlanDetailsModalProps {
  onClose: () => void;
  familyTitle: string;
  planLabel: string;
  commitmentValue: number | null;
  commitmentUnit: string | null;
  periods: CommercialLegPeriod[];
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Cents-precise currency — deliberately NOT utils/format.ts's formatPrice()
// (which rounds to whole dollars for the card/summary price displays
// elsewhere). This popup's own per-item Unit Price/Total figures are
// genuinely sub-dollar (see e.g. a $0.05 unit price) and would silently
// round to $0 under that helper, misstating a real line item — so this is a
// second formatter covering a different display need, not a duplicate of
// the same one.
function formatMoney(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Spelled-out cadence suffix ("/ month", "/ year") for this document-style
// popup's own longer-form copy — the focused shell's compact stage cards use
// cycleSuffix()'s abbreviated "/ mo"/"/ yr" instead (see
// commercialLegPresentation.ts); one-time/upfront already read as full words
// there ('/ once', '/ upfront'), so those fall through to it unchanged.
const LONG_CADENCE_SUFFIX: Record<string, string> = {
  monthly: '/ month',
  annual: '/ year',
  annually: '/ year',
  quarterly: '/ quarter',
};

function billingSuffixLong(cycle: string | null): string {
  if (cycle === null) return '';
  return LONG_CADENCE_SUFFIX[cycle] ?? cycleSuffix(cycle);
}

function priceWithCadence(price: number | null, cycle: string | null): string {
  const suffix = billingSuffixLong(cycle);
  return suffix ? `${formatMoney(price)} ${suffix}` : formatMoney(price);
}

// Phase 7B: customer-facing month range — this popup's own presentation
// only, never the resolver's/backend's raw from_month/to_month values,
// which are untouched everywhere else (the left timeline's own stage
// headers still read periodLabel() in commercialLegPresentation.ts
// unchanged; this is a separate, Plan-Details-only formatter so that
// unrelated surface is never affected).
//
// A technical `0` start reads to a customer as if it were itself a whole
// extra month inside a range ("0–48" looks like 49 months against a
// 48-month commitment) — "Plan start" replaces the bare 0 instead. Every
// other start month is unambiguous as a plain number. The end side stays a
// real month number (or "Ongoing" for a still-open range) either way; it
// only needs its own "Month" word when the start side didn't already
// supply one (i.e. "Plan start–Month 10", vs "Month 11–48" where "Month"
// is read once for the whole range).
function customerFacingRange(from: number, to: number | null): string {
  const startsAtPlanStart = from === 0;
  const startLabel = startsAtPlanStart ? 'Plan start' : `Month ${from}`;
  const endLabel = to === null ? 'Ongoing' : (startsAtPlanStart ? `Month ${to}` : `${to}`);
  return `${startLabel}–${endLabel}`;
}

const CADENCE_WORD: Record<string, string> = {
  monthly: 'month',
  quarterly: 'quarter',
  annual: 'year',
  annually: 'year',
};

// Same payment/inclusion composition as another component of the SAME
// source — billing_cycle, price, and every claimed item (id/quantity/unit
// price/line total) all identical. Used only to decide whether a Period's
// rendered breakdown for this component is a genuine repeat of the
// IMMEDIATELY PRECEDING Period's own (never any earlier one, never a
// same-Period different-source comparison) — never a resolver-level
// dedupe, never merges/changes what's rendered elsewhere.
function sameComposition(a: CommercialLegComponent, b: CommercialLegComponent): boolean {
  if (a.billing_cycle !== b.billing_cycle || a.price !== b.price) return false;
  if (a.items.length !== b.items.length) return false;
  return a.items.every((item, i) => {
    const other = b.items[i];
    return other
      && item.item_id === other.item_id
      && item.quantity === other.quantity
      && item.unit_price === other.unit_price
      && item.line_total === other.line_total;
  });
}

function frequencyLabel(cycle: string | null): string {
  return cycle !== null ? (PLAN_BILLING_CYCLE_LABELS[cycle] ?? 'Payment') : 'Payment';
}

// Phase 7C: Payment Category — the exact same billing_cycle-derived
// synthesis the admin Pricing Rules/Edition editors already use
// (paymentCategoryOf() in TierPricingRulesEditor.tsx /
// TierEditionOverviewFields.tsx: "No separate stored field: derived from
// billing_cycle itself"). billing_cycle stays the one source of truth; no
// payment_category field added anywhere. The one addition beyond the raw
// admin rule: a `null` cycle is never confidently called Fixed or
// Recurring, same neutral-fallback convention frequencyLabel() above and
// componentPaymentName() (commercialLegPresentation.ts) already use for a
// null cycle.
function paymentCategoryLabel(cycle: string | null): string {
  if (cycle === null) return 'Payment';
  return cycle === 'one-time' || cycle === 'upfront' ? 'Fixed payment' : 'Recurring payment';
}

// Phase 7D: Payment Timing's own single-point month mentions — the same
// customer-facing "don't show a raw 0" semantic customerFacingRange()
// already applies to ranges, extended to these single-point sentences.
// Never touches monthsPhrase() below: a LATER occurrence can never be month
// 0 (occurrences only increase from a Leg's own start), so only each
// sentence's own first/start mention ever needs this substitution.
function pointInPlanPhrase(month: number): string {
  return month === 0 ? 'at plan start' : `in Month ${month}`;
}

function monthsPhrase(months: number[]): string {
  if (months.length === 1) return `Month ${months[0]}`;
  return `Months ${months.slice(0, -1).join(', ')} and ${months[months.length - 1]}`;
}

// One Payment Timing sentence per continuous Leg — "every {cadence}
// throughout the commitment" only when this Leg has been active since the
// plan's own first resolved month AND runs the full commitment (or is
// genuinely open-ended); a Leg starting later, or ending before the full
// commitment, reads as its own explicit month list instead so the sentence
// never implies coverage it doesn't have.
function paymentTimingSentence(
  summary: LegPaymentSummary,
  planStartMonth: number,
  commitmentValue: number | null,
  commitmentUnit: string | null,
): string {
  const label = frequencyLabel(summary.billingCycle);
  const price = formatMoney(summary.price);

  // Open-ended, no commitment to project a schedule against: state the
  // first payment and its recurrence only — never a count or an implied end.
  if (summary.isOngoing) {
    const cadenceWord = summary.billingCycle !== null ? (CADENCE_WORD[summary.billingCycle] ?? 'period') : 'period';
    return `${label} Payment: ${price} every ${cadenceWord}, beginning ${pointInPlanPhrase(summary.startMonth)}, continuing indefinitely.`;
  }

  const [first, ...rest] = summary.occurrenceMonths;

  if (rest.length === 0) {
    return `${label} Payment: ${price} charged once, ${pointInPlanPhrase(first)}.`;
  }

  // summary.isOngoing already returned above, so endMonth is guaranteed
  // finite here — "runs full commitment" only means it matches the parent's
  // own commitment value.
  const runsFullCommitment = commitmentValue !== null && summary.endMonth === commitmentValue;

  if (summary.startMonth === planStartMonth && runsFullCommitment) {
    const cadenceWord = summary.billingCycle !== null ? (CADENCE_WORD[summary.billingCycle] ?? 'period') : 'period';
    const commitmentPhrase = commitmentValue !== null && commitmentUnit
      ? `the ${commitmentValue}-${commitmentUnit.toLowerCase().replace(/s$/, '')} commitment`
      : 'the plan';
    return `${label} Payment: ${price} every ${cadenceWord} throughout ${commitmentPhrase}.`;
  }

  return `${label} Payment: ${price} charged ${pointInPlanPhrase(first)}, then again in ${monthsPhrase(rest)}.`;
}

function ItemBreakdownTable({ items, cycle }: { items: CommercialLegPricedItem[]; cycle: string | null }) {
  const totalLabel = cycle !== null ? `${frequencyLabel(cycle)} total` : 'Total';
  const total = items.reduce((sum, item) => (item.line_total !== null ? sum + item.line_total : sum), 0);
  return (
    <>
      <div class="cz-package-builder__details-table-wrap">
        <table class="cz-package-builder__details-table">
          <thead>
            <tr>
              <th>Item Included</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={`${item.item_id}-${i}`}>
                <td>{item.label}</td>
                <td>{item.quantity}</td>
                <td>{formatMoney(item.unit_price)}</td>
                <td>{formatMoney(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="cz-package-builder__details-table-total">{totalLabel}: {formatMoney(total)}</p>
    </>
  );
}

export function PlanDetailsModal({
  onClose,
  familyTitle,
  planLabel,
  commitmentValue,
  commitmentUnit,
  periods,
}: PlanDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Same scroll-lock/ESC/focus-trap pattern as PdfModal.tsx (cost-builder's
  // own existing modal) — reused verbatim rather than a second
  // implementation of the same behavior. Phase 7E: runs once on mount and
  // cleans up once on unmount (empty dependency array) — this component is
  // only ever mounted while open (see the caller's key-based fresh-mount
  // above), so there is no separate "isOpen toggled while still mounted"
  // transition to react to; mount/unmount IS the open/close signal.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const getFocusable = () =>
      Array.from(modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
    getFocusable()[0]?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const els = getFocusable();
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const commitmentMonths = commitmentUnit && /month/i.test(commitmentUnit) ? commitmentValue : null;
  const planStartMonth = periods[0]?.from_month ?? 0;
  const legSummaries = buildLegPaymentSummaries(periods, commitmentMonths);
  // Phase 7D/Phase 5: Total Contract Value math itself now lives in
  // computeTotalContractValue() (cost-builder/PricingTiers.tsx) so the quote
  // panel (QuoteSummary.tsx) computes it identically, never a second
  // re-derivation of the same "every Leg must be finite" rule.
  const totalContractValue = computeTotalContractValue(legSummaries);
  const dueAtStart = legSummaries.reduce(
    (sum, s) => (s.startMonth === planStartMonth && s.price !== null ? sum + s.price : sum),
    0,
  );

  // Available components of the IMMEDIATELY PRECEDING Period only, keyed by
  // source — never any earlier Period, never a running "ever seen" set. A
  // component "continues unchanged" only when its own source was active in
  // that one preceding Period with an identical composition (see
  // sameComposition above); a gap, a genuinely new source, or a changed
  // composition all read as "not continuing" and get their own breakdown.

  return (
    <div class="cz-package-builder__details-backdrop" role="presentation" onClick={onClose}>
      {/* Positioning wrapper only — the close button and the scrolling
          dialog are SIBLINGS here, not parent/child, so the button sits
          outside the panel's own scrolling content and never scrolls with
          it (no sticky trick needed: it simply isn't inside the scrollable
          box at all). */}
      <div class="cz-package-builder__details-panel">
        {/* Same circular X pattern as the focused shell's own exit control
            (.cz-package-builder__focused-close / -close-x in
            FamilyTierAdapter.tsx) — positioned outside the panel's own
            top-right edge instead of the sticky page column that button
            lives in elsewhere; visual treatment (border/background/glyph)
            unchanged. */}
        <button
          type="button"
          class="cz-package-builder__details-close"
          aria-label="Close plan details"
          onClick={onClose}
        >
          <span class="cz-package-builder__focused-close-x" aria-hidden="true" />
        </button>
        <div
          class="cz-package-builder__details-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Plan details"
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
        >
        <div class="cz-package-builder__details-body">
          <section class="cz-package-builder__details-section">
            <h4 class="cz-package-builder__details-heading">Plan Overview</h4>
            <dl class="cz-package-builder__details-overview">
              <div class="cz-package-builder__details-overview-row">
                <dt>Family</dt>
                <dd>{familyTitle}</dd>
              </div>
              <div class="cz-package-builder__details-overview-row">
                <dt>Plan Tier</dt>
                <dd>{planLabel}</dd>
              </div>
              <div class="cz-package-builder__details-overview-row">
                <dt>Commitment</dt>
                <dd>{commitmentValue != null ? `${commitmentValue} ${commitmentUnit ?? ''}` : 'Cancel anytime'}</dd>
              </div>
            </dl>
          </section>

          <section class="cz-package-builder__details-section">
            <h4 class="cz-package-builder__details-heading">Billing Breakdown by Period</h4>
            {periods.map((period, index) => {
              const components = availablePeriodComponents(period);
              if (components.length === 0) return null;
              const recurringCostLine = components
                .map((component) => priceWithCadence(component.price, component.billing_cycle))
                .join(' + ');
              const collision = components.length > 1;
              const previousComponentsBySource = new Map(
                (index > 0 ? availablePeriodComponents(periods[index - 1]) : []).map((c) => [c.source, c]),
              );
              return (
                <div class="cz-package-builder__details-period" key={period.from_month}>
                  <h5 class="cz-package-builder__details-period-heading">{customerFacingRange(period.from_month, period.to_month)}</h5>
                  {/* Phase 7C: a sole active component gets its own real
                      Payment Category label (Fixed/Recurring, derived from
                      its own billing_cycle — never assumed "Recurring" for
                      a one-time/upfront Leg); multiple simultaneously
                      active components keep the existing neutral aggregate,
                      since a mixed Period isn't itself Fixed or Recurring. */}
                  <p class="cz-package-builder__details-fact">
                    <strong>{collision ? 'Active payments' : paymentCategoryLabel(components[0].billing_cycle)}:</strong> {recurringCostLine}
                  </p>
                  {/* Collision-Period wording only — a sole active component
                      never gets a standalone "Begins in Month X" line (the
                      Payment Category line above already says everything a
                      first/only appearance needs to say). A CONTINUING sole
                      component still gets this line, though, since that's
                      the one thing "describe it as continuing unchanged"
                      requires regardless of collision. */}
                  {components.map((component) => {
                    const previous = previousComponentsBySource.get(component.source);
                    const continuing = previous !== undefined && sameComposition(previous, component);
                    if (!collision && !continuing) return null;
                    return (
                      <p class="cz-package-builder__details-fact" key={component.source}>
                        <strong>{frequencyLabel(component.billing_cycle)} payment:</strong>{' '}
                        {continuing
                          ? `Continues unchanged at ${priceWithCadence(component.price, component.billing_cycle)}`
                          : `Begins in Month ${period.from_month} at ${priceWithCadence(component.price, component.billing_cycle)}`}
                      </p>
                    );
                  })}
                  {components.map((component) => {
                    const previous = previousComponentsBySource.get(component.source);
                    const continuing = previous !== undefined && sameComposition(previous, component);
                    if (continuing) return null; // already active with this exact composition last Period — no repeated table
                    return (
                      <div key={component.source}>
                        {collision && (
                          <p class="cz-package-builder__details-table-label">
                            {frequencyLabel(component.billing_cycle)} payment breakdown:
                          </p>
                        )}
                        <ItemBreakdownTable items={component.items} cycle={component.billing_cycle} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>

          <section class="cz-package-builder__details-section">
            <h4 class="cz-package-builder__details-heading">Your Plan Summary</h4>
            <div class="cz-package-builder__details-table-wrap">
              <table class="cz-package-builder__details-table cz-package-builder__details-summary-table">
                <thead>
                  <tr>
                    <th>Billing Schedule</th>
                    <th>Frequency</th>
                    <th>Rate</th>
                    <th>Charge Occurrences</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {legSummaries.map((s) => {
                    const label = frequencyLabel(s.billingCycle);
                    return (
                      <tr key={s.source}>
                        <td>{customerFacingRange(s.startMonth, s.endMonth)}</td>
                        <td>{label}</td>
                        <td>{formatMoney(s.price)}</td>
                        <td>
                          {s.isOngoing
                            ? 'Ongoing'
                            : `${s.occurrenceMonths.length} ${label.toLowerCase()} charge${s.occurrenceMonths.length === 1 ? '' : 's'}`}
                        </td>
                        <td>{s.isOngoing ? '—' : formatMoney(s.subtotal)}</td>
                      </tr>
                    );
                  })}
                  <tr class="cz-package-builder__details-summary-total">
                    <td colSpan={4}>Total Contract Value</td>
                    <td>{formatMoney(totalContractValue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="cz-package-builder__details-section">
            <h4 class="cz-package-builder__details-heading">Payment Timing</h4>
            <ul class="cz-package-builder__details-timing-list">
              <li><strong>Due at plan start:</strong> {formatMoney(dueAtStart)}</li>
              {legSummaries.map((s) => (
                <li key={s.source}>{paymentTimingSentence(s, planStartMonth, commitmentValue, commitmentUnit)}</li>
              ))}
            </ul>
          </section>
        </div>
        </div>
      </div>
    </div>
  );
}
