import { useEffect, useRef, useState } from 'preact/hooks';
import { resolveEffectiveTierDisplay } from '@/components/cost-builder/PricingTiers';
import { computeTotalContractValue, startingPaymentsByCycle, chargeTypeLabel } from '@/utils/paymentSummary';
import { formatPrice } from '@/utils/format';
import { isFamilyTierQuoteItem, quoteItemKey } from '@/utils/quote';
import type { CartItem, FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { PackageBuilderFamily, Tier, TierId } from '@/api/types/cost-builder';
import { periodsForVariant } from './FamilyTierAdapter';
import { PlanDetailsContent } from './PlanDetailsModal';

// Phase 8D: one overlay covering every quoted plan in the cart, tabbed by
// plan, plus a final "Total Commitment" tab — replacing the idea of a
// separate modal per cart row.
//
// Live-validation correction: EVERY quoted family_tier item — primary AND
// add-on alike — gets its own plan tab (an earlier round excluded add-ons
// here and routed them into a separate direct-focus shortcut instead;
// that bypassed this overlay entirely and was reversed). Total
// Commitment stays PRIMARY-only, matching the exact population
// QuoteSummary.tsx's own Contract Value / Initial Payment math already
// restricts itself to (no canonical finite-contract math exists for
// add-ons yet) — so the plan tabs and the Total Commitment tab can
// legitimately describe different populations: every quoted plan has its
// own Details tab, but only primaries roll up into the cart-level
// commitment figure.

interface QuoteDetailsOverlayProps {
  items: CartItem[];
  families: PackageBuilderFamily[];
  tiers: Tier[];
  initialTarget: FamilyTierQuoteItem | 'cart';
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const TOTAL_COMMITMENT_KEY = '__total_commitment__';

// Re-derives the SAME facts PlanDetailsModal's own single-target trigger in
// FamilyTierAdapter.tsx resolves (family/tierData -> editionId via the
// quoted tierEditionPlatformId -> resolveEffectiveTierDisplay/
// periodsForVariant) — never a second resolver, and never against the
// currently-active Family: `families` here is the FULL list
// (usePackageBuilder's own data.families), so an item quoted from a
// Family that isn't the one currently open in the builder still resolves
// against its own real data.
//
// Fail-closed exact identity: a resolution failure returns null (the
// caller shows "Details unavailable") rather than silently substituting
// Default for a stale/mismatched Edition Platform ID — the same
// correction FamilyTierAdapter's own external-focus resolver applies.
// Showing the wrong plan's details would be worse than showing none.
function resolvePlanDetails(item: FamilyTierQuoteItem, families: PackageBuilderFamily[], tiers: Tier[]) {
  // The composable occupant has no fixed-slot Tier/Edition declaration to
  // resolve here — family.pricing.tiers only ever holds the five fixed
  // slots, never family.pricing.composable_offer — so this per-plan Details
  // tab falls back to the generic "Details unavailable" state below rather
  // than a composable-specific resolver this phase doesn't build. The
  // composable line's own commercial facts (price/legPaymentSummaries) are
  // still fully correct everywhere else (cart list, Total Commitment tab).
  if (item.isComposable) return null;
  // Every non-composable FamilyTierQuoteItem's tierId is a real fixed-slot
  // TierId — the type is widened only to admit the composable sentinel
  // (types.ts), and the branch above already excludes that case.
  const tierId = item.tierId as TierId;
  const family = families.find((candidate) => candidate.family_id === item.familyId);
  if (!family) return null;
  const tierData = family.pricing.tiers[tierId];
  if (!tierData) return null;
  let editionId: string | null = null;
  if (item.tierEditionPlatformId !== null) {
    const edition = (tierData.edition_options ?? []).find(
      (option) => option.edition_platform_id === item.tierEditionPlatformId,
    );
    if (!edition) return null;
    editionId = edition.id;
  }
  const effective = resolveEffectiveTierDisplay(tierData, '', editionId);
  const tier = tiers.find((candidate) => candidate.id === tierId);
  const planLabel = effective.selectedEdition?.label ?? tierData?.label ?? tier?.title ?? tierId;
  return {
    familyTitle: family.title,
    planLabel,
    commitmentValue: effective.minimumTermValue,
    commitmentUnit: effective.minimumTermUnit,
    periods: periodsForVariant(family, tierId, editionId),
  };
}

function TotalCommitmentTab({ items, families, tiers }: { items: FamilyTierQuoteItem[]; families: PackageBuilderFamily[]; tiers: Tier[] }) {
  // Same math as QuoteSummary.tsx's own footer (combinedPrimaryTotalContractValue/
  // initialPaymentTotal) — reused via the same exported primitives, never a
  // second re-derivation of Total Contract Value or the starting-payment rule.
  const totalContractValues = items.map((item) =>
    item.legPaymentSummaries && item.legPaymentSummaries.length > 0
      ? computeTotalContractValue(item.legPaymentSummaries)
      : null,
  );
  const allFinite = items.length > 0 && totalContractValues.every((value) => value !== null);
  const combinedTotalContractValue = allFinite
    ? totalContractValues.reduce((sum, value) => sum + (value as number), 0)
    : null;
  const startingPayments = startingPaymentsByCycle(items.map((item) => item.legPaymentSummaries ?? []));
  const initialPaymentTotal = startingPayments.reduce((sum, [, amount]) => sum + amount, 0);

  return (
    <div class="cz-package-builder__details-body">
      <section class="cz-package-builder__details-section">
        {items.map((item, index) => {
          const resolved = resolvePlanDetails(item, families, tiers);
          const planLabel = resolved?.planLabel ?? item.tierTitle;
          const streams = item.legPaymentSummaries ?? [];
          const total = totalContractValues[index];
          return (
            <div key={quoteItemKey(item)} class="cz-package-builder__commitment-plan">
              <h5 class="cz-package-builder__details-period-heading">{item.familyTitle} — {planLabel}</h5>
              {streams.length > 0 ? (
                <>
                  {streams.map((stream) => (
                    <div key={stream.source} class="cz-package-builder__commitment-row">
                      <span>{chargeTypeLabel(stream.billingCycle)}</span>
                      <span>{formatPrice(stream.price)}</span>
                    </div>
                  ))}
                  {total !== null && (
                    <div class="cz-package-builder__commitment-row cz-package-builder__commitment-row--total">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div class="cz-package-builder__commitment-row">
                  <span>{chargeTypeLabel(item.billingCycle)}</span>
                  <span>{formatPrice(item.price)}</span>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section class="cz-package-builder__details-section cz-package-builder__commitment-summary">
        {combinedTotalContractValue !== null ? (
          <div class="cz-package-builder__commitment-row cz-package-builder__commitment-row--grand-total">
            <span>Contract Value</span>
            <span>{formatPrice(combinedTotalContractValue)}</span>
          </div>
        ) : (
          <>
            <div class="cz-package-builder__commitment-row cz-package-builder__commitment-row--grand-total">
              <span>Contract Value</span>
              <span>Ongoing</span>
            </div>
            <p class="cz-package-builder__details-fact">Includes charges without a fixed end date.</p>
          </>
        )}
        {startingPayments.length > 0 && (
          <div class="cz-package-builder__commitment-row cz-package-builder__commitment-row--grand-total">
            <span>Initial Payment</span>
            <span>{formatPrice(initialPaymentTotal)}</span>
          </div>
        )}
      </section>
    </div>
  );
}

export function QuoteDetailsOverlay({ items, families, tiers, initialTarget, onClose }: QuoteDetailsOverlayProps) {
  // Every quoted plan — primary and add-on alike — gets its own tab.
  const allFamilyTierItems = items.filter(isFamilyTierQuoteItem);
  // Total Commitment stays primary-only — see the file header comment.
  const primaryFamilyTierItems = allFamilyTierItems.filter((item) => !item.isAddon);

  const [activeKey, setActiveKey] = useState<string>(
    initialTarget === 'cart' ? TOTAL_COMMITMENT_KEY : quoteItemKey(initialTarget),
  );

  const modalRef = useRef<HTMLDivElement>(null);

  // Same scroll-lock/ESC/focus-trap pattern as PlanDetailsModal.tsx/
  // PdfModal.tsx — reused verbatim rather than a second implementation.
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

  const activeItem = allFamilyTierItems.find((item) => quoteItemKey(item) === activeKey) ?? null;
  const activeResolved = activeItem ? resolvePlanDetails(activeItem, families, tiers) : null;

  return (
    <div class="cz-package-builder__details-backdrop" role="presentation" onClick={onClose}>
      <div class="cz-package-builder__details-panel">
        <button
          type="button"
          class="cz-package-builder__details-close"
          aria-label="Close quote details"
          onClick={onClose}
        >
          <span class="cz-package-builder__focused-close-x" aria-hidden="true" />
        </button>
        <div
          class="cz-package-builder__details-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Quote details"
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
        >
          <div class="cz-package-builder__details-tabs" role="tablist" aria-label="Quoted plans">
            {allFamilyTierItems.map((item) => {
              const key = quoteItemKey(item);
              const resolved = resolvePlanDetails(item, families, tiers);
              const planLabel = resolved?.planLabel ?? item.tierTitle;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activeKey === key}
                  class={`cz-package-builder__details-tab${activeKey === key ? ' is-active' : ''}`}
                  onClick={() => setActiveKey(key)}
                >
                  {item.familyTitle} — {planLabel} Details
                </button>
              );
            })}
            <button
              type="button"
              role="tab"
              aria-selected={activeKey === TOTAL_COMMITMENT_KEY}
              class={`cz-package-builder__details-tab${activeKey === TOTAL_COMMITMENT_KEY ? ' is-active' : ''}`}
              onClick={() => setActiveKey(TOTAL_COMMITMENT_KEY)}
            >
              Total Commitment
            </button>
          </div>

          {activeKey === TOTAL_COMMITMENT_KEY ? (
            <TotalCommitmentTab items={primaryFamilyTierItems} families={families} tiers={tiers} />
          ) : activeResolved ? (
            <PlanDetailsContent
              familyTitle={activeResolved.familyTitle}
              planLabel={activeResolved.planLabel}
              commitmentValue={activeResolved.commitmentValue}
              commitmentUnit={activeResolved.commitmentUnit}
              periods={activeResolved.periods}
            />
          ) : (
            <div class="cz-package-builder__details-body">
              <p class="cz-package-builder__details-fact">Details unavailable for this plan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
