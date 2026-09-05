import { useEffect, useRef, useState } from 'preact/hooks';
import { resolveEffectiveTierDisplay } from '@/components/cost-builder/PricingTiers';
import { computeTotalContractValue, startingPaymentsByCycle, chargeTypeLabel } from '@/utils/paymentSummary';
import { formatPrice } from '@/utils/format';
import { composableCoexistsWithPrimary, isFamilyTierQuoteItem, orderedQuoteItems, quoteItemKey } from '@/utils/quote';
import { InclusionDisclosureToggle, InclusionDisclosurePanel, disclosureRowsForFamilyTierItem, useSingleOpenDisclosure } from '@/components/cost-builder/InclusionDisclosure';
import type { CartItem, FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { PackageBuilderFamily, ServiceInclusion, Tier, TierId } from '@/api/types/cost-builder';
import { periodsForVariant } from './FamilyTierAdapter';
import { PlanDetailsContent, formatMoney } from './PlanDetailsModal';

// Phase 8D: one overlay covering every quoted plan in the cart, tabbed by
// plan, plus a final "Total Commitment" tab — replacing the idea of a
// separate modal per cart row.
//
// Live-validation correction: EVERY quoted family_tier item — primary AND
// add-on alike — gets its own plan tab (an earlier round excluded add-ons
// here and routed them into a separate direct-focus shortcut instead;
// that bypassed this overlay entirely and was reversed).
//
// Live-gate correction (2026-09-05, "Complete Total Commitment"): Total
// Commitment used to filter to primary-only (`!item.isAddon`), on the
// stated assumption that "no canonical finite-contract math exists for
// add-ons yet" — that assumption was itself wrong: computeTotalContractValue()/
// startingPaymentsByCycle() (utils/paymentSummary.ts) are already fully
// generic over any item's own legPaymentSummaries, with no primary-only
// special-casing anywhere in either function. Excluding add-ons here just
// silently under-counted the cart's real combined commitment whenever an
// add-on carried its own finite Leg schedule. Total Commitment now
// aggregates the COMPLETE quoted Family population for every Family/Tier
// system — primary, Upgrade (composable), and add-ons alike, each exactly
// once — using the exact same per-item helpers, never a second pricing
// calculator and never inferred from which plan tabs happen to be open.

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

// Auditor correction (project-work/2026-09-03-composable-tier-admin-to-
// customer-validation.md, "Customer Details still leaks Build Your Own"):
// a composable ("Upgrade your build") line reached with a sibling primary
// already in the cart must read as "Upgrades" on every customer-facing
// surface in this file — the SAME rule QuoteSummary.tsx's own quote-line
// label already applies via composableCoexistsWithPrimary(), reused
// verbatim rather than a second "is this Build Your Own" heuristic.
// Presentation only: never touches stored occupant identity/title
// (item.tierTitle) or Admin/internal representation. `contextItems` need
// only contain the sibling primary for the SAME Family+Tier-Instance, not
// literally the whole cart — every call site below already has such a
// list in scope (the full cart, or Total Commitment's own complete
// primary+Upgrade+add-on population for every family).
function planDisplayLabel(item: FamilyTierQuoteItem, contextItems: CartItem[], fallback: string): string {
  return composableCoexistsWithPrimary(item, contextItems) ? 'Upgrades' : fallback;
}

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
  // slots, never family.pricing.composable_offer — so this resolver still
  // returns null for it. Live-correction round: the caller (QuoteDetailsOverlay
  // below) no longer falls through to "Details unavailable" for that null —
  // it renders ComposablePlanDetails() instead, straight from the item's own
  // stored snapshot (inclusionItems/legPaymentSummaries), never re-resolved.
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

// Live-correction round: the composable ("Build Your Own") occupant's own
// Details tab body — rendered straight from the quoted item's own stored
// snapshot (inclusionItems/legPaymentSummaries/price/billingCycle, the exact
// same fields QuoteProposalPreview.tsx/OrderSummary.tsx already render for
// it), never re-resolved against current Rate Sheet/occupant/policy state.
// A Bundle parent stays quantity-less with its real children nested beneath
// it, mirroring FamilyInclusionsList's own bundle_id treatment in the
// request-flow components (a separate, deliberately non-shared
// implementation — this file's own cz-package-builder__* class family,
// theirs cz-proposal__cz-os__).
// Live-validation correction: matches PlanDetailsModal.tsx's own
// ItemBreakdownTable column set (Item Included, Quantity, Unit Price,
// Total) exactly — the Upgrade quote's own detail table read only Item
// Included + Quantity before, an incomplete pricing view compared to the
// established Tier/Edition detail. unit_price/line_total are the SAME
// resolved Rate Sheet facts already carried on the quoted item's own
// inclusionItems snapshot (Phase 2B1, ServiceInclusion) — never a second
// pricing source, never recomputed here.
function ComposableInclusionsTable({ items }: { items: ServiceInclusion[] }) {
  return (
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
          {items.flatMap((inclusion, i) => [
            <tr key={inclusion.id || i}>
              <td>{inclusion.label}</td>
              <td>{inclusion.bundle_id ? '' : (inclusion.quantity ?? '')}</td>
              <td>{formatMoney(inclusion.unit_price ?? null)}</td>
              <td>{formatMoney(inclusion.line_total ?? null)}</td>
            </tr>,
            ...(inclusion.includes ?? []).map((child, ci) => (
              <tr key={`${inclusion.id || i}:child:${child.id || ci}`} class="cz-package-builder__details-table-row--child">
                <td class="cz-package-builder__details-table-child-label">{child.label}</td>
                <td>{child.quantity ?? ''}</td>
                <td>Included</td>
                <td>Included</td>
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
  );
}

function ComposablePlanDetails({ item, items }: { item: FamilyTierQuoteItem; items: CartItem[] }) {
  const streams = item.legPaymentSummaries ?? [];
  const hasStreams = streams.length > 0;
  const total = hasStreams ? computeTotalContractValue(streams) : null;
  return (
    <div class="cz-package-builder__details-body">
      <section class="cz-package-builder__details-section">
        <h4 class="cz-package-builder__details-heading">Plan Overview</h4>
        <dl class="cz-package-builder__details-overview">
          <div class="cz-package-builder__details-overview-row">
            <dt>Family</dt>
            <dd>{item.familyTitle}</dd>
          </div>
          <div class="cz-package-builder__details-overview-row">
            <dt>Plan Tier</dt>
            <dd>{planDisplayLabel(item, items, item.tierTitle)}</dd>
          </div>
        </dl>
      </section>

      {item.inclusionItems && item.inclusionItems.length > 0 && (
        <section class="cz-package-builder__details-section">
          <h4 class="cz-package-builder__details-heading">Included</h4>
          <ComposableInclusionsTable items={item.inclusionItems} />
        </section>
      )}

      <section class="cz-package-builder__details-section">
        <h4 class="cz-package-builder__details-heading">Billing</h4>
        {hasStreams ? (
          <>
            {streams.map((stream) => (
              <div key={stream.source} class="cz-package-builder__commitment-row">
                <span>{chargeTypeLabel(stream.billingCycle)}</span>
                <span>{formatPrice(stream.price)}</span>
              </div>
            ))}
            {total !== null ? (
              <div class="cz-package-builder__commitment-row cz-package-builder__commitment-row--total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            ) : (
              <p class="cz-package-builder__details-fact">Includes charges without a fixed end date.</p>
            )}
          </>
        ) : (
          <div class="cz-package-builder__commitment-row">
            <span>{chargeTypeLabel(item.billingCycle)}</span>
            <span>{formatPrice(item.price)}</span>
          </div>
        )}
      </section>
    </div>
  );
}

function TotalCommitmentTab({ items, families, tiers }: { items: FamilyTierQuoteItem[]; families: PackageBuilderFamily[]; tiers: Tier[] }) {
  const { openKey: openDisclosureKey, toggle: toggleDisclosure, panelRef: disclosurePanelRef } = useSingleOpenDisclosure();
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
          const planLabel = planDisplayLabel(item, items, resolved?.planLabel ?? item.tierTitle);
          const streams = item.legPaymentSummaries ?? [];
          const total = totalContractValues[index];
          const key = quoteItemKey(item);
          const disclosureRows = disclosureRowsForFamilyTierItem(item);
          const disclosureOpen = openDisclosureKey === key;
          return (
            <div key={key} class="cz-package-builder__commitment-plan">
              <div class="cz-package-builder__commitment-plan-header">
                <h5 class="cz-package-builder__details-period-heading">{item.familyTitle} — {planLabel}</h5>
                <InclusionDisclosureToggle
                  label={`${item.familyTitle} — ${planLabel}`}
                  rows={disclosureRows}
                  open={disclosureOpen}
                  onClick={() => toggleDisclosure(key)}
                />
              </div>
              {disclosureOpen && (
                <InclusionDisclosurePanel rows={disclosureRows} panelRef={disclosurePanelRef} />
              )}
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
              <span>Until Cancelled</span>
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
  // Every quoted plan — primary, Upgrade, and add-on alike — gets its own
  // tab, and (see the file header comment) Total Commitment now aggregates
  // this exact same complete population, each item exactly once.
  // orderedQuoteItems() (utils/quote.ts) is the SAME shared hierarchy
  // derivation QuoteSummary.tsx's cart list uses — reused here rather than
  // a second hand-sort — so both the tab order and the Total Commitment
  // breakdown read main plan, then Upgrade, then add-ons, matching the
  // cart's own presentation.
  const allFamilyTierItems = orderedQuoteItems(items).filter(isFamilyTierQuoteItem);

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
              const planLabel = planDisplayLabel(item, items, resolved?.planLabel ?? item.tierTitle);
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
            <TotalCommitmentTab items={allFamilyTierItems} families={families} tiers={tiers} />
          ) : activeItem?.isComposable ? (
            <ComposablePlanDetails item={activeItem} items={items} />
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
