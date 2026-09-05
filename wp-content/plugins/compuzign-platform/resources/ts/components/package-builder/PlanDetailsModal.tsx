import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { buildLegPaymentSummaries } from '@/components/cost-builder/PricingTiers';
import { computeTotalContractValue } from '@/utils/paymentSummary';
import type { LegPaymentSummary } from '@/utils/paymentSummary';
import type { CommercialLegPeriod, CommercialLegPricedItem } from '@/api/types/cost-builder';
import {
  frequencyLabel, formatMoney, customerFacingRange, buildQuotedCommercialBreakdown, periodBreakdownRows,
} from '@/utils/commercialLegPresentation';
export { formatMoney } from '@/utils/commercialLegPresentation';
import type { PeriodBreakdownRow } from '@/utils/commercialLegPresentation';

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

// Phase 8D: the modal's own content (Plan Overview / Billing Breakdown by
// Period / Your Plan Summary / Payment Timing), split out from the chrome
// below (backdrop/close/focus-trap) so a tabbed multi-plan overlay
// (QuoteDetailsOverlay.tsx) can render this SAME content per tab without a
// second details calculator — the chrome-only PlanDetailsModal below is
// unchanged and keeps rendering this as its one body.
export type PlanDetailsContentProps = Omit<PlanDetailsModalProps, 'onClose'>;

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Auditor correction (2026-09-05, "leg-level breakdown presentation
// customer view" follow-up "incomplete View Details parity"): formatMoney,
// billingSuffixLong/priceWithCadence, customerFacingRange, sameComposition,
// and frequencyLabel relocated to @/utils/commercialLegPresentation — the
// durable PDF/Review/customer View-Print/email rendering needed this exact
// same Billing Breakdown by Period semantic, and a prior round hand-copied
// it there instead of sharing one definition. formatMoney is re-exported
// above so every existing importer of this file keeps working unchanged.

const CADENCE_WORD: Record<string, string> = {
  monthly: 'month',
  quarterly: 'quarter',
  annual: 'year',
  annually: 'year',
};

// Phase 8H: three distinct value states a resolved commercial amount can be
// in — a genuinely known finite number (formatMoney handles this, including
// a real zero as "$0.00" via its own `!== null` check), a real known rate
// with no fixed number of occurrences (open-ended, never a fabricated
// finite total), and a price that hasn't been resolved at all. These three
// helpers are for the specific Summary/Total Contract Value cells the
// approved display rules name — formatMoney()'s own generic '—' for null
// stays correct everywhere else (e.g. a top-level priced item's own Unit
// Price/Total, never asked to change here).

// Charge Occurrences cell: "Until Cancelled" for an open-ended stream, never
// the old generic "Ongoing" wording — a finite stream keeps its existing
// calculated occurrence count untouched.
export function occurrencesCell(s: LegPaymentSummary, label: string): string {
  if (s.isOngoing) return 'Until Cancelled';
  return `${s.occurrenceMonths.length} ${label.toLowerCase()} charge${s.occurrenceMonths.length === 1 ? '' : 's'}`;
}

// Subtotal cell: an open-ended stream with a known rate repeats that same
// Rate figure here (never a lifetime multiplication — see the work item's
// own "Open-ended Subtotal = Rate" clarification); an open-ended stream
// with no known rate, or a finite stream whose own calculated subtotal is
// still null (unresolved pricing), reads as "To be confirmed" rather than
// a bare dash. A finite stream's own calculated subtotal is untouched.
export function subtotalCell(s: LegPaymentSummary): string {
  if (s.isOngoing) return s.price !== null ? formatMoney(s.price) : 'To be confirmed';
  return s.subtotal !== null ? formatMoney(s.subtotal) : 'To be confirmed';
}

// Total Contract Value cell: a finite computed value is untouched. When
// null, the reason matters — every subtotal-null contributor being an
// open-ended stream with a KNOWN rate means the plan is genuinely
// open-ended, never a data gap ("Until Cancelled"); any contributor with an
// unresolved price (ongoing or not) means the total is actually unknown
// ("To be confirmed"). No explanatory note is rendered in either case.
export function totalContractValueCell(summaries: LegPaymentSummary[], totalContractValue: number | null): string {
  if (totalContractValue !== null) return formatMoney(totalContractValue);
  const unresolved = summaries.filter((s) => s.subtotal === null);
  const allOpenEndedWithKnownRate = unresolved.length > 0 && unresolved.every((s) => s.isOngoing && s.price !== null);
  return allOpenEndedWithKnownRate ? 'Until Cancelled' : 'To be confirmed';
}

// Period breakdown total display: a null top-level line_total means that
// item's price is genuinely unresolved — never silently skip it into a
// partial sum that reads as the real total. Any such item makes the whole
// Period's total "To be confirmed" instead.
export function periodItemsTotalDisplay(items: CommercialLegPricedItem[]): string {
  const hasUnresolvedItem = items.some((item) => item.line_total === null);
  if (hasUnresolvedItem) return 'To be confirmed';
  const total = items.reduce((sum, item) => sum + (item.line_total ?? 0), 0);
  return formatMoney(total);
}

// Due-at-plan-start display: a null price on a stream starting at plan
// start means that charge is genuinely unresolved — never silently skip it
// into a sum that could read as a false "$0.00" when it was the only
// starting stream.
export function dueAtPlanStartDisplay(summaries: LegPaymentSummary[], planStartMonth: number): string {
  const startingStreams = summaries.filter((s) => s.startMonth === planStartMonth);
  const hasUnresolvedStartingPrice = startingStreams.some((s) => s.price === null);
  if (hasUnresolvedStartingPrice) return 'To be confirmed';
  const dueAtStart = startingStreams.reduce((sum, s) => sum + (s.price ?? 0), 0);
  return formatMoney(dueAtStart);
}

// paymentCategoryLabel() relocated to @/utils/commercialLegPresentation —
// periodBreakdownRows() there calls it directly; this file no longer needs
// its own copy for the Billing Breakdown by Period section.

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

// Auditor correction (2026-09-05, "leg-level breakdown presentation
// customer view" follow-up "incomplete View Details parity"): renders the
// shared periodBreakdownRows() output — reconstructs the exact same
// wrapper structure the original hand-written JSX produced (one
// .details-period div per Period, consecutive 'inclusion' rows grouped
// under one .details-table-wrap/table with ItemBreakdownTable's own Item
// Included/Quantity/Unit Price/Total header, closed at the next
// non-inclusion row or the end of the Period).
function renderPeriodBreakdownRows(rows: PeriodBreakdownRow[], formatMoneyFn: (value: number | null) => string) {
  const periodsOut: ComponentChildren[] = [];
  let currentPeriodKey: string | null = null;
  let currentPeriodChildren: ComponentChildren[] = [];
  let pendingInclusions: Extract<PeriodBreakdownRow, { kind: 'inclusion' }>[] = [];

  const flushTable = () => {
    if (pendingInclusions.length === 0) return;
    const tableRows = pendingInclusions;
    pendingInclusions = [];
    currentPeriodChildren.push(
      <div class="cz-package-builder__details-table-wrap" key={`table:${tableRows[0].id}`}>
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
            {tableRows.map((row) => (
              <tr key={row.id} class={row.isChild ? 'cz-package-builder__details-table-row--child' : undefined}>
                <td class={row.isChild ? 'cz-package-builder__details-table-child-label' : undefined}>{row.label}</td>
                <td>{row.quantity ?? ''}</td>
                <td>{row.isChild ? 'Included' : formatMoneyFn(row.unitPrice)}</td>
                <td>{row.isChild ? 'Included' : formatMoneyFn(row.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
  };

  const flushPeriod = () => {
    flushTable();
    if (currentPeriodKey !== null) {
      periodsOut.push(<div class="cz-package-builder__details-period" key={currentPeriodKey}>{currentPeriodChildren}</div>);
    }
    currentPeriodChildren = [];
  };

  for (const row of rows) {
    if (row.kind === 'periodHeading') {
      flushPeriod();
      currentPeriodKey = row.id;
      currentPeriodChildren.push(<h5 class="cz-package-builder__details-period-heading" key={row.id}>{row.label}</h5>);
      continue;
    }
    if (row.kind === 'inclusion') {
      pendingInclusions.push(row);
      continue;
    }
    flushTable();
    if (row.kind === 'periodPaymentFact') {
      currentPeriodChildren.push(<p class="cz-package-builder__details-fact" key={row.id}><strong>{row.label}:</strong> {row.value}</p>);
    } else if (row.kind === 'componentNote') {
      currentPeriodChildren.push(<p class="cz-package-builder__details-fact" key={row.id}><strong>{row.cadenceLabel}:</strong> {row.statusText}</p>);
    } else if (row.kind === 'componentTableLabel') {
      currentPeriodChildren.push(<p class="cz-package-builder__details-table-label" key={row.id}>{row.text}</p>);
    } else if (row.kind === 'componentTotal') {
      currentPeriodChildren.push(<p class="cz-package-builder__details-table-total" key={row.id}>{row.label}: {row.value}</p>);
    }
  }
  flushPeriod();

  return periodsOut;
}

function ItemBreakdownTable({ items, cycle }: { items: CommercialLegPricedItem[]; cycle: string | null }) {
  const totalLabel = cycle !== null ? `${frequencyLabel(cycle)} total` : 'Total';
  const totalDisplay = periodItemsTotalDisplay(items);
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
            {items.flatMap((item, i) => [
              <tr key={`${item.item_id}-${i}`}>
                <td>{item.label}</td>
                <td>{item.quantity}</td>
                <td>{formatMoney(item.unit_price)}</td>
                <td>{formatMoney(item.line_total)}</td>
              </tr>,
              /* Bundle supplied content (Phase 8G): display-only rows
                 immediately below their priced parent — mirrors the focused
                 card's own inclusionItems.flatMap treatment of `includes`
                 (PricingTiers.tsx) exactly, just in this table's own priced
                 column shape. Never separately priced/selectable, never
                 folded into `total` above (still summed from `items` only,
                 never these). */
              ...(item.includes ?? []).map((child, ci) => (
                <tr key={`${item.item_id}-child-${child.item_id}-${ci}`} class="cz-package-builder__details-table-row--child">
                  <td class="cz-package-builder__details-table-child-label">{child.label}</td>
                  <td>{child.quantity}</td>
                  <td>Included</td>
                  <td>Included</td>
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      <p class="cz-package-builder__details-table-total">{totalLabel}: {totalDisplay}</p>
    </>
  );
}

export function PlanDetailsContent({
  familyTitle,
  planLabel,
  commitmentValue,
  commitmentUnit,
  periods,
}: PlanDetailsContentProps) {
  const commitmentMonths = commitmentUnit && /month/i.test(commitmentUnit) ? commitmentValue : null;
  const planStartMonth = periods[0]?.from_month ?? 0;
  const legSummaries = buildLegPaymentSummaries(periods, commitmentMonths);
  // Phase 7D/Phase 5: Total Contract Value math itself now lives in
  // computeTotalContractValue() (cost-builder/PricingTiers.tsx) so the quote
  // panel (QuoteSummary.tsx) computes it identically, never a second
  // re-derivation of the same "every Leg must be finite" rule.
  const totalContractValue = computeTotalContractValue(legSummaries);
  const dueAtStartDisplay = dueAtPlanStartDisplay(legSummaries, planStartMonth);

  // Available components of the IMMEDIATELY PRECEDING Period only, keyed by
  // source — never any earlier Period, never a running "ever seen" set. A
  // component "continues unchanged" only when its own source was active in
  // that one preceding Period with an identical composition (see
  // sameComposition above); a gap, a genuinely new source, or a changed
  // composition all read as "not continuing" and get their own breakdown.

  return (
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
            {/* Auditor correction (2026-09-05, "leg-level breakdown
                presentation customer view" follow-up "incomplete View
                Details parity"): renders from periodBreakdownRows()
                (@/utils/commercialLegPresentation) — the SAME shared row
                derivation the durable PDF/Review/customer View-Print/email
                rendering calls too (periodBreakdownRowsForFamilyTierItem(),
                cost-builder/InclusionDisclosure.tsx), fed here by first
                converting this popup's own live periods through
                buildQuotedCommercialBreakdown() (same file) — never two
                separate implementations of the same rule. */}
            {renderPeriodBreakdownRows(periodBreakdownRows(buildQuotedCommercialBreakdown(periods)), formatMoney)}
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
                        <td>{occurrencesCell(s, label)}</td>
                        <td>{subtotalCell(s)}</td>
                      </tr>
                    );
                  })}
                  <tr class="cz-package-builder__details-summary-total">
                    <td colSpan={4}>Total Contract Value</td>
                    <td>{totalContractValueCell(legSummaries, totalContractValue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="cz-package-builder__details-section">
            <h4 class="cz-package-builder__details-heading">Payment Timing</h4>
            <ul class="cz-package-builder__details-timing-list">
              <li><strong>Due at plan start:</strong> {dueAtStartDisplay}</li>
              {legSummaries.map((s) => (
                <li key={s.source}>{paymentTimingSentence(s, planStartMonth, commitmentValue, commitmentUnit)}</li>
              ))}
            </ul>
          </section>
    </div>
  );
}

// Phase 7E's chrome (backdrop/close/focus-trap), unchanged behavior — the
// only difference from before Phase 8D is that its body is now
// PlanDetailsContent above instead of inline markup, so the single-target
// "View plan details" trigger in FamilyTierAdapter.tsx (its only caller)
// keeps working exactly as it did.
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
          <PlanDetailsContent
            familyTitle={familyTitle}
            planLabel={planLabel}
            commitmentValue={commitmentValue}
            commitmentUnit={commitmentUnit}
            periods={periods}
          />
        </div>
      </div>
    </div>
  );
}
