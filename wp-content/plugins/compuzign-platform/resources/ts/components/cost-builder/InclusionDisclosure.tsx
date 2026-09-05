import { useEffect, useRef, useState } from 'preact/hooks';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import { periodBreakdownRows } from '@/utils/commercialLegPresentation';
import type { QuotedBreakdownInclusion } from '@/utils/paymentSummary';
import type { PeriodBreakdownRow } from '@/utils/commercialLegPresentation';
import type { FamilyTierQuoteItem } from './types';

// Price-line suffix for the two cycles formatCycleLabel() (utils/format.ts)
// doesn't cover — mirrors PricingTiers.tsx's own TIER_CYCLE_SUFFIX_OVERRIDES
// verbatim, kept as its own small local copy rather than a shared import:
// importing from PricingTiers.tsx here would pull that file's whole
// customer pricing UI component tree into the Admin print bundle, which
// this module (reused by NotificationTemplates.php's TS-free PHP mirror's
// sibling, and read by Admin print via disclosureRowsForFamilyTierItem())
// is deliberately kept free of — same reasoning as paymentSummary.ts's own
// CRM-1C extraction.
const BREAKDOWN_CYCLE_SUFFIX_OVERRIDES: Record<string, string> = {
  upfront: '/ upfront',
  'one-time': '/ once',
};

function breakdownCycleSuffix(cycle: string | null): string {
  if (cycle === null) return '';
  return BREAKDOWN_CYCLE_SUFFIX_OVERRIDES[cycle] ?? formatCycleLabel(cycle);
}

// Live-validation correction (project-work/2026-09-03-composable-tier-
// admin-to-customer-validation.md, "Add compact inclusion quick views to
// quote items", corrected in "deployed customer validation failed", then
// "deployed customer UI validation failed"): a shared inline-SVG-chevron
// disclosure — collapsed by default, expands IN FLOW (never a floating/
// absolutely-positioned overlay) into a compact Inclusion/Qty/Price table
// plus a right-aligned Total row.
//
// Auditor correction: this is now a CONTROLLED pair of components
// (InclusionDisclosureToggle + InclusionDisclosurePanel) instead of one
// self-contained stateful component. The prior self-contained version gave
// every quote line its OWN independent `open` boolean and its OWN
// independent outside-click listener — nothing coordinated them, so
// clicking a different item's chevron while one was already open could
// leave the click's own open-toggle racing an unrelated close, matching
// the auditor's exact live finding ("consumed by the outside-click close
// behavior instead of opening the requested item"). The caller (QuoteSummary.tsx,
// QuoteDetailsOverlay.tsx's Total Commitment rows) now owns ONE
// `openKey: string | null` for its whole list plus the one shared
// outside-click listener — structurally guaranteeing at most one open
// disclosure per list, and an atomic single-click switch between items,
// rather than relying on per-instance state to happen to stay in sync.
// Splitting into a Toggle and a Panel (rather than one component
// rendering both together) is what lets the toggle sit beside the quote
// line's own remove × (a different DOM position from the in-flow panel,
// which still renders lower in the same list item, pushing later content
// down) — see QuoteSummary.tsx's own corner-actions cluster.

// Project-standard inline-SVG icon convention (viewBox 0 0 24 24, stroke-
// based, currentColor, aria-hidden — see PricingTiers.tsx's
// TierInclusionCheckIcon docblock) rather than a text glyph. Rotates via
// its own is-open class rather than swapping to a different glyph — this
// toggle is deliberately independent of the quote line's own cart remove
// ×, never repurposed as it.
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class={`cz-inclusion-disclosure__chevron${open ? ' is-open' : ''}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export interface DisclosureInclusionRow {
  id: string;
  label: string;
  // null = no authoritative fact for this row (quantity not applicable, or
  // a pre-Phase-8G legacy line with no resolved quantity at all) — the
  // cell renders blank rather than a fabricated 0 or "n/a".
  quantity: number | null;
  // Live-gate correction (2026-09-05, "leg-level breakdown presentation"):
  // the per-unit price, kept distinct from lineTotal (quantity * unit) —
  // e.g. Static IP Block qty 2 reads Unit price $40 / Line total $80, never
  // collapsed into one figure. null for every row the legacy
  // inclusionItems/features fallback below produces (that shape never
  // carried a separate unit price fact) — the cell renders blank there,
  // preserving today's exact legacy look; never derived here by dividing
  // lineTotal, which would be a second, unauthoritative pricing source.
  unitPrice: number | null;
  // null = no authoritative Rate Sheet-resolved line total for this row —
  // rendered blank, never computed here from quantity * some other value
  // (that would be a second pricing source). A Bundle child is never
  // separately priced, so it carries null here unless the underlying data
  // genuinely resolves one.
  lineTotal: number | null;
  // Live-gate correction (2026-09-05, "leg-level breakdown presentation"):
  // stable internal identity for this row's commercialBreakdown component
  // OCCURRENCE — one distinct value per Period+component, deliberately
  // never derived from sectionLabel's own human-readable text, so two
  // independent same-cadence components active in the same Period never
  // collapse into a single visual section merely because their headings
  // read identically. Never rendered. Undefined for the legacy flat-list
  // fallback (inclusionItems/features), in which case the panel renders no
  // section headings at all, exactly as it always has.
  sectionKey?: string;
  // Display heading text for this row's section — e.g. "Month
  // 11–Indefinite · Yearly". May legitimately repeat verbatim across two
  // different sectionKeys (two independent same-cadence components in the
  // same Period); when that happens a neutral " (charge N/M)" suffix is
  // appended (see disclosureRowsForFamilyTierItem() below) — never a Leg
  // ID/Rate Sheet key.
  sectionLabel?: string;
  // The component's OWN authoritative snapshot price
  // (QuotedBreakdownComponent.price), pre-formatted with the existing
  // customer cadence wording (e.g. "$80.00 / yr") — rendered once, on this
  // row's section heading, never a sum of this section's own inclusion
  // rows (row sums are a test-only reconciliation check, never the
  // displayed source of truth — see composable-quote-cart-contract.ts).
  // null when the component itself carries no resolved price; undefined
  // for the legacy fallback.
  sectionSubtotal?: string | null;
}

function breakdownInclusionRows(
  inclusion: QuotedBreakdownInclusion,
  keyPrefix: string,
  sectionKey?: string,
  sectionLabel?: string,
  sectionSubtotal?: string | null,
): DisclosureInclusionRow[] {
  return [
    {
      id: keyPrefix,
      label: inclusion.label,
      quantity: inclusion.quantity,
      unitPrice: inclusion.unitPrice,
      lineTotal: inclusion.lineTotal,
      sectionKey,
      sectionLabel,
      sectionSubtotal,
    },
    ...(inclusion.includes ?? []).flatMap((child, ci) =>
      breakdownInclusionRows(child, `${keyPrefix}:child:${ci}`, sectionKey, sectionLabel, sectionSubtotal)),
  ];
}

// Shared row derivation for the CART quick-view (QuoteSummary.tsx) and
// Total Commitment overlay (QuoteDetailsOverlay.tsx) ONLY — auditor
// correction (2026-09-05, "leg-level breakdown presentation customer
// view"): the fuller PDF/Review/View-Print/email "View Details" experience
// now reads periodBreakdownRowsForFamilyTierItem() below instead, since a
// raw Period-table dump was rejected as compact cart presentation. This
// function reads item.cartBreakdown — the pre-computed "base once +
// Extensions billed X" shape (buildQuotedCartBreakdown(),
// cost-builder/PricingTiers.tsx) — falling back to bare labels for a
// pre-Phase-8G cart entry that predates inclusionItems entirely.
export function disclosureRowsForFamilyTierItem(item: FamilyTierQuoteItem): DisclosureInclusionRow[] {
  // Same "captured once at Add-to-Quote time, never re-resolved" rule as
  // every other snapshot field on this item. Absent/empty for every cart
  // item that predates this field (falls through to the existing flat
  // rendering, unchanged) or has no resolved commercial_legs at all.
  if (item.cartBreakdown && (item.cartBreakdown.baseInclusions.length > 0 || item.cartBreakdown.extensionGroups.length > 0)) {
    const baseRows = item.cartBreakdown.baseInclusions.flatMap((inclusion, i) =>
      breakdownInclusionRows(inclusion, `base:${i}`));
    const extensionRows = item.cartBreakdown.extensionGroups.flatMap((group, groupIndex) => {
      const sectionKey = `extension:${groupIndex}`;
      const cadenceSuffix = breakdownCycleSuffix(group.billingCycle);
      const sectionSubtotal = group.price !== null
        ? `${formatPrice(group.price)}${cadenceSuffix ? ` ${cadenceSuffix}` : ''}`
        : null;
      return group.inclusions.flatMap((inclusion, i) =>
        breakdownInclusionRows(inclusion, `${sectionKey}:${i}`, sectionKey, group.heading, sectionSubtotal));
    });
    return [...baseRows, ...extensionRows];
  }
  if (item.inclusionItems && item.inclusionItems.length > 0) {
    return item.inclusionItems.flatMap((inclusion, i) => [
      {
        id: inclusion.id || `inclusion-${i}`,
        label: inclusion.label,
        quantity: inclusion.bundle_id ? null : (inclusion.quantity ?? null),
        unitPrice: null,
        lineTotal: inclusion.line_total ?? null,
      },
      ...(inclusion.includes ?? []).map((child, ci) => ({
        id: `${inclusion.id || i}:child:${child.id || ci}`,
        label: child.label,
        quantity: child.quantity ?? null,
        unitPrice: null,
        lineTotal: child.line_total ?? null,
      })),
    ]);
  }
  return item.features.map((feature, i) => ({ id: `feature-${i}`, label: feature, quantity: null, unitPrice: null, lineTotal: null }));
}

// Auditor correction (2026-09-05, "leg-level breakdown presentation
// customer view" follow-up "incomplete View Details parity"): the fuller
// PDF/Review/customer View-Print/email "View Details" experience now calls
// the ONE shared periodBreakdownRows() (@/utils/commercialLegPresentation)
// — the SAME function PlanDetailsModal.tsx's own live popup calls (after
// converting its own periods via buildQuotedCommercialBreakdown(), same
// file) — rather than a second/hand-copied implementation of that file's
// Billing Breakdown by Period semantics. Thin wrapper only: this item's
// own durable commercialBreakdown snapshot IS already the
// QuotedBreakdownPeriod[] shape that function expects.
export function periodBreakdownRowsForFamilyTierItem(item: FamilyTierQuoteItem): PeriodBreakdownRow[] {
  if (!item.commercialBreakdown || item.commercialBreakdown.length === 0) return [];
  return periodBreakdownRows(item.commercialBreakdown);
}

// The one CSS hook the caller's own shared outside-click listener matches
// against (via closest()) to recognize ANY chevron toggle — the open
// one's own, or a different item's — and exclude it from the generic
// dismiss path, so that button's own onClick is always the sole authority
// over what happens next. Exported so callers never hand-type the class
// name themselves.
export const INCLUSION_DISCLOSURE_TOGGLE_CLASS = 'cz-inclusion-disclosure__toggle';

// One shared "at most one open, atomic switch, outside-click closes"
// coordinator — reused verbatim by QuoteSummary.tsx's own quote-line list
// and QuoteDetailsOverlay.tsx's Total Commitment list, never two separate
// implementations of the same rule. `toggle(key)` is race-safe by
// construction: it always reads the LATEST openKey via the functional
// setState form, so a mousedown-triggered outside-close and a click's own
// toggle — two genuinely separate native events for the same user
// interaction — resolve correctly regardless of exactly when each commits.
// The outside-click listener itself still explicitly excludes any
// chevron toggle (via closest(), matching every toggle rendered anywhere,
// not just the currently-open one) and the open panel's own subtree, per
// the auditor's explicit requirement that chevron controls never fall
// through the generic dismiss path.
export function useSingleOpenDisclosure() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openKey === null) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current && panelRef.current.contains(target)) return;
      if (target instanceof Element && target.closest(`.${INCLUSION_DISCLOSURE_TOGGLE_CLASS}`)) return;
      setOpenKey(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openKey]);

  const toggle = (key: string) => setOpenKey((current) => (current === key ? null : key));

  return { openKey, toggle, panelRef };
}

interface InclusionDisclosureToggleProps {
  // Accessible name for the thing being disclosed (e.g. the quote item's
  // own title) — never rendered as visible text, only used to compose the
  // toggle's aria-label so a screen reader hears "Show <label> inclusions"
  // rather than a bare "Show inclusions" repeated identically on every row.
  label: string;
  rows: DisclosureInclusionRow[];
  open: boolean;
  onClick: () => void;
}

export function InclusionDisclosureToggle({ label, rows, open, onClick }: InclusionDisclosureToggleProps) {
  if (rows.length === 0) return null;
  return (
    <button
      type="button"
      class={INCLUSION_DISCLOSURE_TOGGLE_CLASS}
      aria-expanded={open}
      aria-label={open ? `Hide ${label} inclusions` : `Show ${label} inclusions`}
      onClick={onClick}
    >
      <ChevronIcon open={open} />
    </button>
  );
}

interface InclusionDisclosurePanelProps {
  rows: DisclosureInclusionRow[];
  // Preact ref callback/object for the caller's own shared outside-click
  // listener to recognize a click as "inside the open panel" — same
  // purpose as INCLUSION_DISCLOSURE_TOGGLE_CLASS above, just for the
  // panel's own DOM subtree instead of the toggle button.
  panelRef?: { current: HTMLDivElement | null };
}

export function InclusionDisclosurePanel({ rows, panelRef }: InclusionDisclosurePanelProps) {
  if (rows.length === 0) return null;

  // Live-gate correction (2026-09-05, "leg-level breakdown presentation"):
  // a combined grand total across the whole disclosure is only ever shown
  // for the legacy flat-list rendering (no row carries a sectionKey) —
  // once ANY row belongs to a commercialBreakdown section, each section
  // shows its OWN authoritative subtotal instead (the group-heading row
  // below), since summing across sections here could be mistaken for one
  // Leg's own subtotal across mixed Periods/components. The existing
  // top-level Monthly/Yearly/Total elsewhere on the page remains the one
  // commercial summary in that case.
  const hasSections = rows.some((row) => row.sectionKey !== undefined);
  const pricedRows = rows.filter((row): row is DisclosureInclusionRow & { lineTotal: number } => row.lineTotal !== null);
  const total = pricedRows.reduce((sum, row) => sum + row.lineTotal, 0);

  return (
    <div class="cz-inclusion-disclosure__panel" ref={panelRef}>
      <table class="cz-inclusion-disclosure__table">
        <thead>
          <tr>
            <th>Inclusion</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Line total</th>
          </tr>
        </thead>
        <tbody>
          {/* Live-gate correction (2026-09-05, "preserve period/leg
              inclusion attribution"; corrected "leg-level breakdown
              presentation"): a section-heading row precedes the first row
              of each distinct sectionKey run, showing that component's own
              authoritative subtotal — never for the legacy flat rendering,
              where every row's sectionKey is undefined and no heading ever
              renders. */}
          {(() => {
            let previousSectionKey: string | undefined;
            return rows.flatMap((row) => {
              const showSectionHeading = row.sectionKey !== undefined && row.sectionKey !== previousSectionKey;
              previousSectionKey = row.sectionKey;
              return [
                ...(showSectionHeading ? [
                  <tr key={`${row.id}:section`} class="cz-inclusion-disclosure__group-row">
                    <td colSpan={3}>{row.sectionLabel}</td>
                    <td class="cz-inclusion-disclosure__section-subtotal">{row.sectionSubtotal ?? ''}</td>
                  </tr>,
                ] : []),
                <tr key={row.id}>
                  <td>{row.label}</td>
                  <td>{row.quantity ?? ''}</td>
                  <td>{row.unitPrice !== null ? formatPrice(row.unitPrice) : ''}</td>
                  <td>{row.lineTotal !== null ? formatPrice(row.lineTotal) : ''}</td>
                </tr>,
              ];
            });
          })()}
        </tbody>
      </table>
      {!hasSections && pricedRows.length > 0 && (
        <div class="cz-inclusion-disclosure__total">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      )}
    </div>
  );
}
