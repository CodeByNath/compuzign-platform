import { useEffect, useRef, useState } from 'preact/hooks';
import { formatPrice } from '@/utils/format';
import type { FamilyTierQuoteItem } from './types';

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
  // null = no authoritative Rate Sheet-resolved line total for this row —
  // rendered blank, never computed here from quantity * some other value
  // (that would be a second pricing source). A Bundle child is never
  // separately priced, so it carries null here unless the underlying data
  // genuinely resolves one.
  lineTotal: number | null;
}

// Shared row derivation for every family_tier quote line (primary, add-on,
// and Upgrade alike) — the exact same inclusionItems snapshot
// QuoteDetailsOverlay's own ComposableInclusionsTable/PlanDetailsContent
// already render (unit_price/line_total, Phase 2B1 ServiceInclusion —
// additive on every occupant-sourced inclusion, composable and normal Tier
// alike), falling back to bare labels for a pre-Phase-8G cart entry that
// predates inclusionItems (no quantity/price facts exist for those at
// all — both cells stay blank, never invented). One resolver for both this
// component's callers — never a second derivation of what a quoted item
// includes.
export function disclosureRowsForFamilyTierItem(item: FamilyTierQuoteItem): DisclosureInclusionRow[] {
  if (item.inclusionItems && item.inclusionItems.length > 0) {
    return item.inclusionItems.flatMap((inclusion, i) => [
      {
        id: inclusion.id || `inclusion-${i}`,
        label: inclusion.label,
        quantity: inclusion.bundle_id ? null : (inclusion.quantity ?? null),
        lineTotal: inclusion.line_total ?? null,
      },
      ...(inclusion.includes ?? []).map((child, ci) => ({
        id: `${inclusion.id || i}:child:${child.id || ci}`,
        label: child.label,
        quantity: child.quantity ?? null,
        lineTotal: child.line_total ?? null,
      })),
    ]);
  }
  return item.features.map((feature, i) => ({ id: `feature-${i}`, label: feature, quantity: null, lineTotal: null }));
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

  // The right-aligned Total sums only the rows this disclosure actually
  // displays a Price for — never a fabricated figure for a row with no
  // authoritative lineTotal, and never double-counted against the cart/
  // Details/commitment totals elsewhere (this is a read-only presentation
  // sum over the SAME already-resolved figures, computed once, per row,
  // right here).
  const pricedRows = rows.filter((row): row is DisclosureInclusionRow & { lineTotal: number } => row.lineTotal !== null);
  const total = pricedRows.reduce((sum, row) => sum + row.lineTotal, 0);

  return (
    <div class="cz-inclusion-disclosure__panel" ref={panelRef}>
      <table class="cz-inclusion-disclosure__table">
        <thead>
          <tr>
            <th>Inclusion</th>
            <th>Qty</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.label}</td>
              <td>{row.quantity ?? ''}</td>
              <td>{row.lineTotal !== null ? formatPrice(row.lineTotal) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pricedRows.length > 0 && (
        <div class="cz-inclusion-disclosure__total">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      )}
    </div>
  );
}
