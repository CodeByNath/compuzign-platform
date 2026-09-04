import { useEffect, useRef, useState } from 'preact/hooks';
import type { FamilyTierQuoteItem } from './types';

// Live-validation correction (project-work/2026-09-03-composable-tier-
// admin-to-customer-validation.md, "Add compact inclusion quick views to
// quote items"): one shared chevron/× disclosure — collapsed by default,
// opens a compact inclusion list beneath its trigger, closes on outside
// click or a second click on its own now-× control. Reused verbatim by
// QuoteSummary.tsx's own per-quote-line quick view AND
// QuoteDetailsOverlay.tsx's Total Commitment per-plan rows (the doc
// explicitly asks for "the same disclosure behavior" in both places) —
// never two separate implementations of the same open/close/outside-click
// rule.

export interface DisclosureInclusionRow {
  id: string;
  label: string;
  quantity?: number;
}

// Shared row derivation for every family_tier quote line (primary, add-on,
// and Upgrade alike) — the exact same inclusionItems snapshot
// QuoteDetailsOverlay's own ComposableInclusionsTable/PlanDetailsContent
// already render, falling back to the flat `features` labels for a
// pre-Phase-8G cart entry that predates inclusionItems. One resolver for
// both this component's callers (QuoteSummary.tsx's quote-line quick view,
// QuoteDetailsOverlay.tsx's Total Commitment rows) — never a second
// derivation of what a quoted item includes.
export function disclosureRowsForFamilyTierItem(item: FamilyTierQuoteItem): DisclosureInclusionRow[] {
  if (item.inclusionItems && item.inclusionItems.length > 0) {
    return item.inclusionItems.flatMap((inclusion, i) => [
      {
        id: inclusion.id || `inclusion-${i}`,
        label: inclusion.label,
        quantity: inclusion.bundle_id ? undefined : inclusion.quantity,
      },
      ...(inclusion.includes ?? []).map((child, ci) => ({
        id: `${inclusion.id || i}:child:${child.id || ci}`,
        label: child.label,
        quantity: child.quantity,
      })),
    ]);
  }
  return item.features.map((feature, i) => ({ id: `feature-${i}`, label: feature }));
}

interface InclusionDisclosureProps {
  // Accessible name for the thing being disclosed (e.g. the quote item's
  // own title) — never rendered as visible text, only used to compose the
  // toggle's aria-label so a screen reader hears "Show <label> inclusions"
  // rather than a bare "Show inclusions" repeated identically on every row.
  label: string;
  rows: DisclosureInclusionRow[];
}

export function InclusionDisclosure({ label, rows }: InclusionDisclosureProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  if (rows.length === 0) return null;

  return (
    <div class="cz-inclusion-disclosure" ref={wrapRef}>
      <button
        type="button"
        class="cz-inclusion-disclosure__toggle"
        aria-expanded={open}
        aria-label={open ? `Hide ${label} inclusions` : `Show ${label} inclusions`}
        onClick={() => setOpen((current) => !current)}
      >
        <span class="cz-inclusion-disclosure__toggle-glyph" aria-hidden="true">{open ? '×' : '⌄'}</span>
      </button>
      {open && (
        <ul class="cz-inclusion-disclosure__list">
          {rows.map((row) => (
            <li key={row.id} class="cz-inclusion-disclosure__row">
              <span class="cz-inclusion-disclosure__row-label">{row.label}</span>
              {row.quantity !== undefined && (
                <span class="cz-inclusion-disclosure__row-qty">×{row.quantity}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
