import type { FamilyTierQuoteItem } from '@/components/cost-builder/types';
import { QuoteItemPricePresentation, QuoteTotalsPresentation } from '@/components/cost-builder/QuoteSummary';
import { disclosureRowsForFamilyTierItem } from '@/components/cost-builder/InclusionDisclosure';

// Phase 4 correction (project-work/2026-09-06-tier-catalogue-admin-ux-
// consolidation.md, "scoped Cart presentation reuse") — the auditor
// rejected an earlier version of this component that computed its own
// simplified monetary presentation (a flat primary price/cycle, a
// composable-item inclusion-row list, and a fallback message pointing
// elsewhere for multi-stream items). That was a second, weaker
// presentation of cart state, not a reuse of the real one.
//
// This version renders the SAME per-item title/tier-label/payment-stream
// presentation and the SAME totals presentation QuoteSummary.tsx itself
// uses — QuoteItemPricePresentation/QuoteTotalsPresentation, extracted
// from QuoteSummary.tsx verbatim so there is exactly one place this
// presentation lives — scoped to only the two items relevant here: the
// already-quoted primary Tier/Edition and the current composable/Build
// Your Own line (whichever of the two actually exist; the composable one
// only once auto-sync has actually written it). No cart-mutating controls
// (no remove button, no inclusion disclosure, no Clear all) — those are
// QuoteSummary-only per the locked requirement — and no second pricing/
// totals implementation: QuoteTotalsPresentation is called directly on
// this same scoped list, producing the exact same truthful multi-stream/
// mixed-cycle/Total-Contract-Value/Initial-Payment reasoning QuoteSummary
// itself would show for these two items.
interface UpgradeBuildSummaryProps {
  primaryItem: FamilyTierQuoteItem | null;
  composableItem: FamilyTierQuoteItem | null;
  onExit: () => void;
}

export function UpgradeBuildSummary({ primaryItem, composableItem, onExit }: UpgradeBuildSummaryProps) {
  const scopedItems: FamilyTierQuoteItem[] = [primaryItem, composableItem].filter(
    (item): item is FamilyTierQuoteItem => item !== null,
  );
  // Correction round ("Require Upgrade inclusion rows in scoped Cart
  // presentation") — the same authoritative row derivation QuoteSummary's
  // own inclusion disclosure already uses for this exact item
  // (QuoteSummary.tsx's corner-actions chevron opens a panel over these
  // same rows), never composableItem.inclusionItems/composableSelection
  // read directly. No toggle/chevron here — this stage has no reason to
  // start collapsed, so the rows are simply always visible.
  const upgradeInclusionRows = composableItem ? disclosureRowsForFamilyTierItem(composableItem) : [];

  return (
    <div class="cz-package-builder__upgrade-summary">
      <h3 class="cz-heading-sm">Your build</h3>
      <ul class="cz-package-builder__upgrade-summary-list">
        {scopedItems.map((item) => (
          <li key={item.tierPlatformId} class="cz-package-builder__upgrade-summary-item">
            <QuoteItemPricePresentation item={item} items={scopedItems} />
          </li>
        ))}
      </ul>

      {upgradeInclusionRows.length > 0 && (
        <ul class="cz-package-builder__upgrade-summary-inclusions">
          {upgradeInclusionRows.map((row) => (
            <li
              key={row.id}
              class={`cz-package-builder__upgrade-summary-inclusion${row.isChild ? ' cz-package-builder__upgrade-summary-inclusion--child' : ''}`}
            >
              {row.label}
              {/* Never default/reconstruct a quantity — null means no
                  authoritative fact for this row (see
                  DisclosureInclusionRow's own docblock), so the label
                  renders alone rather than a fabricated "× 1". */}
              {row.quantity !== null && ` × ${row.quantity}`}
            </li>
          ))}
        </ul>
      )}

      <div class="cz-package-builder__upgrade-summary-total">
        <QuoteTotalsPresentation items={scopedItems} />
      </div>

      {/* Stage-control only — ends the Upgrade gate and resumes the
          existing Recommendations-if-present-else-Cart continuation. This
          component takes no cart-commit callback prop at all and mutates
          no quote data: the selection already live here was already
          written by the catalogue browser's own auto-sync. */}
      <button type="button" class="cz-cost-builder__tier-action" onClick={onExit}>
        Add to Quote
      </button>
    </div>
  );
}
