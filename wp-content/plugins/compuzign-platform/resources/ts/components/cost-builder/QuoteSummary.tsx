import { useState } from 'preact/hooks';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import { calcQuoteTotals, composableCoexistsWithPrimary, quoteItemKey } from '@/utils/quote';
import { isFamilyTierQuoteItem } from '@/utils/quote';
import { chargeTypeLabel, computeTotalContractValue, startingPaymentsByCycle } from '@/utils/paymentSummary';
import { InclusionDisclosureToggle, InclusionDisclosurePanel, disclosureRowsForFamilyTierItem, useSingleOpenDisclosure } from './InclusionDisclosure';
import type { CartItem, FamilyTierQuoteItem } from './types';

interface QuoteSummaryProps {
  items: CartItem[];
  onRemove: (item: CartItem) => void;
  onClear: () => void;
  onOpenReview: () => void;
  // Phase 8D: optional so this component's other caller (CostBuilderApp.tsx,
  // which has no Package Family/Plan Details concept at all) is completely
  // unaffected — omitting this prop simply hides the "View details"
  // affordance below, never importing anything package-builder-specific
  // into this cost-builder-layer component. `null` means "cart-level"
  // (opens the overlay on Total Commitment); a specific item means "open
  // on that item's own tab". This file now only ever calls it with a real
  // item (the first quoted plan, from its one consolidated footer button
  // — see below) — `null` stays a valid, supported target on the overlay
  // itself, just not one this caller currently reaches for.
  onOpenDetails?: (item: FamilyTierQuoteItem | null) => void;
}

export function QuoteSummary({ items, onRemove, onClear, onOpenReview, onOpenDetails }: QuoteSummaryProps) {
  const [clearPending, setClearPending] = useState(false);
  const { openKey: openDisclosureKey, toggle: toggleDisclosure, panelRef: disclosurePanelRef } = useSingleOpenDisclosure();

  const handleClear = () => {
    onClear();
    setClearPending(false);
  };

  const { unpricedItems, cycleEntries, hasMixedCycles, singleCycle } = calcQuoteTotals(items);

  // Phase 6/7: calcQuoteTotals()'s own cycle-bucket math is untouched — it
  // still only ever sees each item's single flat Headline price/cycle, so
  // its "Est. X total" is only trustworthy when NO item actually has more
  // than one real payment stream. Rather than teach that function a second,
  // per-stream bucketing model (an invented cross-cycle summation this phase
  // was told not to build), a multi-stream item's presence is classified
  // here and the footer branches BEFORE reaching calcQuoteTotals' own
  // labels at all.
  const familyTierItems = items.filter(isFamilyTierQuoteItem);
  const hasMultiStreamItem = familyTierItems.some((item) => (item.legPaymentSummaries?.length ?? 0) > 1);
  // Phase 7: sum every PRIMARY (non-add-on) Tier/Edition item's own finite
  // Total Contract Value — never add-ons (no canonical finite-contract math
  // exists for them yet; they stay represented by calcQuoteTotals' own
  // cycle totals wherever those still apply) and never a live re-derivation
  // (computeTotalContractValue() is reused exactly as Plan Details/the
  // per-item row below already call it). "No legPaymentSummaries at all" is
  // treated as unknown, not zero — it must never silently count as $0
  // toward the sum, and an empty primaries list must never vacuously read
  // as "all finite" (.every() on [] is true) and show a fabricated "$0
  // Total Contract Value".
  const primaryFamilyTierItems = familyTierItems.filter((item) => !item.isAddon);
  const primaryTotalContractValues = primaryFamilyTierItems.map((item) =>
    item.legPaymentSummaries && item.legPaymentSummaries.length > 0
      ? computeTotalContractValue(item.legPaymentSummaries)
      : null,
  );
  const allPrimariesFinite = primaryFamilyTierItems.length > 0
    && primaryTotalContractValues.every((value) => value !== null);
  const combinedPrimaryTotalContractValue = allPrimariesFinite
    ? primaryTotalContractValues.reduce((sum, value) => sum + (value as number), 0)
    : null;
  // Phase 8B: what's due at each primary item's own plan start, summed
  // across items by cycle only (never combining unlike cycles) — shown
  // independently of whether a finite Total Contract Value exists, so a
  // mixed finite+ongoing cart still reports something truthful instead of
  // nothing. Does not touch/replace the TCV/fallback logic above.
  // startingPaymentsByCycle() itself is untouched — still the same per-cycle
  // derivation over each item's own earliest resolved month. What changed
  // (presentation-only, per the customer-facing footer redesign) is the
  // LAST step: this footer's own single "Initial Payment" figure answers
  // one question only — the combined amount due when the quoted plans
  // start — so it deliberately collapses every cycle bucket into one sum
  // here. The individual quote-item rows above keep their own real
  // cycle-specific labels (Upfront/Monthly/Yearly) untouched; only this
  // cart-level summary number stops describing which Leg types make it up.
  const startingPayments = startingPaymentsByCycle(
    primaryFamilyTierItems.map((item) => item.legPaymentSummaries ?? []),
  );
  const initialPaymentTotal = startingPayments.reduce((sum, [, amount]) => sum + amount, 0);

  return (
    <div class="cz-quote-summary">
      <div class="cz-quote-summary__header">
        <h3 class="cz-heading-sm">
          Your Quote
          {items.length > 0 && (
            <span class="cz-quote-summary__badge">{items.length}</span>
          )}
        </h3>
        {clearPending ? (
          <div class="cz-quote-summary__clear-group">
            <button type="button" class="cz-quote-summary__clear-yes" onClick={handleClear}>
              Clear all?
            </button>
            <button type="button" class="cz-quote-summary__clear-cancel" onClick={() => setClearPending(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" class="cz-quote-summary__clear" onClick={() => setClearPending(true)}>
            Clear all
          </button>
        )}
      </div>

      <ul class="cz-quote-summary__list">
        {items.map((item) => {
          const flatCycleSuffix = formatCycleLabel(item.billingCycle);
          // Phase 5/7: this quoted option's own resolved commercial payment
          // streams (buildLegPaymentSummaries(), captured at Add to Quote
          // time — see FamilyTierAdapter.tsx's itemFor()). Any item with no
          // streams at all (a Cost Builder QuoteItem, which never has this
          // field, or a pre-Phase-5 legacy cart entry) keeps today's one
          // flat price/cycle line — there's no per-stream data to lay out.
          // An item WITH streams (1 or more) renders each as its own
          // order-summary row — charge-type label on the left, price on the
          // right, never a slash suffix duplicating what the label already
          // says — plus a "Total" row when computeTotalContractValue()
          // resolves finite (never shown for an ongoing/unbounded stream).
          const streams = isFamilyTierQuoteItem(item) ? item.legPaymentSummaries : null;
          const hasStreams = !!streams && streams.length > 0;
          const totalContractValue = hasStreams ? computeTotalContractValue(streams!) : null;
          const key = quoteItemKey(item);
          const disclosureRows = isFamilyTierQuoteItem(item) ? disclosureRowsForFamilyTierItem(item) : [];
          const disclosureOpen = openDisclosureKey === key;
          return (
            <li key={key} class="cz-quote-summary__item">
              {/* Phase 6: fixed top-right corner, independent of the content
                  column's own height below (1 line for a simple item,
                  several for a multi-stream one with its own Total row) —
                  never competing with price text for horizontal space.
                  Auditor correction: the inclusion chevron now sits in this
                  SAME corner cluster, immediately left of the remove × —
                  two separate controls, separate hit targets, never one
                  repurposed as the other. */}
              <div class="cz-quote-summary__corner-actions">
                {isFamilyTierQuoteItem(item) && (
                  <InclusionDisclosureToggle
                    label={item.familyTitle}
                    rows={disclosureRows}
                    open={disclosureOpen}
                    onClick={() => toggleDisclosure(key)}
                  />
                )}
                <button
                  type="button"
                  class="cz-quote-summary__remove"
                  onClick={() => onRemove(item)}
                  aria-label={`Remove ${isFamilyTierQuoteItem(item) ? item.familyTitle : item.serviceTitle}`}
                >
                  ×
                </button>
              </div>
              <div class="cz-quote-summary__item-info">
                <span class="cz-quote-summary__item-title">{isFamilyTierQuoteItem(item) ? item.familyTitle : item.serviceTitle}</span>
                {/* Live-correction round: a composable ("Build Your Own")
                    line reached via "upgrade your build" (a sibling primary
                    Tier already selected for the same Family) reads as
                    "Upgrades" here — the standalone Build Your Own naming
                    stays for a composable line with no primary sibling, and
                    for every Admin-facing surface regardless. */}
                <span class="cz-quote-summary__item-tier">
                  {isFamilyTierQuoteItem(item) && composableCoexistsWithPrimary(item, items) ? 'Upgrades' : item.tierTitle}
                </span>
                {/* Phase 6: raw CZ Platform IDs (familyPlatformId,
                    tierInstancePlatformId, tierPlatformId,
                    tierEditionPlatformId) are deliberately not rendered here
                    — customer-facing presentation only, human-readable
                    hierarchy only. The IDs stay on the underlying quote item
                    untouched (still read by quote capture/PDF/admin
                    surfaces); this component simply stops printing them. */}
              </div>
              <div class="cz-quote-summary__item-prices">
                {hasStreams ? (
                  <>
                    {streams!.map((stream) => (
                      <div key={stream.source} class="cz-quote-summary__stream-row">
                        <span class="cz-quote-summary__stream-label">{chargeTypeLabel(stream.billingCycle)}</span>
                        <span class="cz-quote-summary__stream-value">{formatPrice(stream.price)}</span>
                      </div>
                    ))}
                    {/* Phase 7: "Total" (this item's own subtotal) — deliberately
                        NOT "Total Contract Value" (that wording is reserved for
                        the whole-cart footer below, so the two numbers are never
                        confused for each other). Only when finite; an ongoing
                        stream leaves just its own row(s) above, never a fake
                        finite Total. */}
                    {totalContractValue !== null && (
                      <div class="cz-quote-summary__stream-row cz-quote-summary__stream-row--total">
                        <span class="cz-quote-summary__stream-label">Total</span>
                        <span class="cz-quote-summary__stream-value">{formatPrice(totalContractValue)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <span class="cz-quote-summary__item-price">
                    {item.price !== null ? (
                      <>
                        {formatPrice(item.price)}
                        {flatCycleSuffix && (
                          <span class="cz-quote-summary__item-cycle">{' '}{flatCycleSuffix}</span>
                        )}
                      </>
                    ) : 'Custom'}
                  </span>
                )}
              </div>
              {disclosureOpen && (
                <InclusionDisclosurePanel rows={disclosureRows} panelRef={disclosurePanelRef} />
              )}
            </li>
          );
        })}
      </ul>

      <div class="cz-quote-summary__footer">
        <div class="cz-quote-summary__total">
          {cycleEntries.length === 0 ? (
            <>
              <span class="cz-quote-summary__total-label">Pricing on request</span>
              <span class="cz-quote-summary__total-price">Contact Us</span>
            </>
          ) : hasMultiStreamItem ? (
            // Phase 6/7/9: calcQuoteTotals' own Headline-cycle bucketing is
            // untrustworthy once any item has more than one real payment
            // stream (see hasMultiStreamItem above) — never fall through to
            // its hasMixedCycles/singleCycle labels below in that case.
            // combinedPrimaryTotalContractValue sums every primary item's
            // own already-computed TCV (reducing to that single item's own
            // TCV when there's only one) — only when EVERY primary item is
            // finite; any ongoing primary, or no primary items at all,
            // means the cart's own contract length is genuinely unbounded,
            // which Phase 8C states explicitly rather than falling back to
            // a generic "Multiple payment streams" non-answer. Phase 9:
            // this block now sits ABOVE the Initial Payment figure below it
            // (dedicated contract-value-label/-amount classes, deliberately
            // NOT the shared total-label/total-price the simple-cart
            // branches below still use) — useful context, lower visual
            // weight than the final number the customer actually pays now.
            combinedPrimaryTotalContractValue !== null ? (
              <>
                <span class="cz-quote-summary__contract-value-label">Total Contract Value</span>
                <span class="cz-quote-summary__contract-value-amount">{formatPrice(combinedPrimaryTotalContractValue)}</span>
              </>
            ) : (
              <>
                <span class="cz-quote-summary__contract-value-label">Contract Value</span>
                <span class="cz-quote-summary__contract-value-amount">Ongoing</span>
                <span class="cz-quote-summary__custom-note">
                  Includes charges without a fixed end date.
                </span>
              </>
            )
          ) : hasMixedCycles ? (
            <>
              <span class="cz-quote-summary__total-label">
                Estimated totals{unpricedItems.length > 0 ? ' (custom pricing applies)' : ''}
              </span>
              {cycleEntries.map(([cycle, total]) => {
                const suffix = formatCycleLabel(cycle);
                return (
                  <div key={cycle} class="cz-quote-summary__cycle-row">
                    <span class="cz-quote-summary__cycle-name">{cycle}</span>
                    <span class="cz-quote-summary__cycle-amount">
                      {formatPrice(total)}{suffix ? ` ${suffix}` : ''}
                    </span>
                  </div>
                );
              })}
              {unpricedItems.length > 0 && (
                <span class="cz-quote-summary__custom-note">
                  + {unpricedItems.length} item{unpricedItems.length === 1 ? '' : 's'} at custom pricing
                </span>
              )}
            </>
          ) : (
            <>
              <span class="cz-quote-summary__total-label">
                Est. {singleCycle![0]} total
                {unpricedItems.length > 0 ? ' (custom pricing applies)' : ''}
              </span>
              <span class="cz-quote-summary__total-price">
                {formatPrice(singleCycle![1])}
                {formatCycleLabel(singleCycle![0]) && (
                  <span class="cz-quote-summary__total-cycle">
                    {' '}{formatCycleLabel(singleCycle![0])}
                  </span>
                )}
              </span>
              {unpricedItems.length > 0 && (
                <span class="cz-quote-summary__custom-note">
                  + {unpricedItems.length} item{unpricedItems.length === 1 ? '' : 's'} at custom pricing
                </span>
              )}
            </>
          )}
        </div>

        {/* Phase 9: the final, strongest number in the footer — deliberately
            last, directly above the CTA, since "what do I pay right now" is
            the most immediate checkout fact. A cart-level presentation
            label only: collapses every startingPaymentsByCycle() bucket
            into ONE combined figure (initialPaymentTotal above) — the
            underlying per-cycle math/derivation is untouched, and each
            quote item's own row above still shows its own real
            Upfront/Monthly/Yearly labels; only this summary number stops
            describing which Leg types make it up. Same hasMultiStreamItem
            gate as .total's own multi-stream branch — a simple
            single-stream cart's existing compact "Est. X total" already
            answers this question, so nothing new renders there. */}
        {hasMultiStreamItem && startingPayments.length > 0 && (
          <div class="cz-quote-summary__initial-payment">
            <span class="cz-quote-summary__initial-payment-label">Initial Payment</span>
            <span class="cz-quote-summary__initial-payment-amount">{formatPrice(initialPaymentTotal)}</span>
          </div>
        )}

        {/* Nath refinement: ONE cart-level "View details" entry point only
            — the earlier per-item buttons above are gone, so this is now
            the sole way into the quote-details overlay. Opens on the
            FIRST quoted plan's own tab (cart order — familyTierItems[0]
            is items.filter() in cart order, the same order
            QuoteDetailsOverlay's own tab list already follows), never
            Total Commitment; the customer reaches every other plan tab
            and Total Commitment by navigating inside that one overlay.
            Gated on any quoted family_tier item existing (a quoted
            add-on can never exist without its own primary — confirmed by
            the cart's whole-Tier-System removal rule — so this is exactly
            "is there anything to show a plan tab for"). */}
        {onOpenDetails && familyTierItems.length > 0 && (
          <button
            type="button"
            class="cz-quote-summary__view-details cz-quote-summary__view-details--cart"
            onClick={() => onOpenDetails(familyTierItems[0])}
          >
            View details
          </button>
        )}

        <button
          type="button"
          class="cz-btn cz-btn-primary cz-quote-summary__cta"
          onClick={onOpenReview}
        >
          Review &amp; Finalise Quote
        </button>
      </div>
    </div>
  );
}
