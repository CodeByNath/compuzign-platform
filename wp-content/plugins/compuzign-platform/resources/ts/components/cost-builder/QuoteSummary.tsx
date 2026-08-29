import { useState } from 'preact/hooks';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import { calcQuoteTotals, quoteItemKey } from '@/utils/quote';
import { isFamilyTierQuoteItem } from '@/utils/quote';
import { chargeTypeLabel, computeTotalContractValue, startingPaymentsByCycle } from './PricingTiers';
import type { CartItem } from './types';

interface QuoteSummaryProps {
  items: CartItem[];
  onRemove: (item: CartItem) => void;
  onClear: () => void;
  onOpenReview: () => void;
}

export function QuoteSummary({ items, onRemove, onClear, onOpenReview }: QuoteSummaryProps) {
  const [clearPending, setClearPending] = useState(false);

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
  const startingPayments = startingPaymentsByCycle(
    primaryFamilyTierItems.map((item) => item.legPaymentSummaries ?? []),
  );

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
          return (
            <li key={quoteItemKey(item)} class="cz-quote-summary__item">
              {/* Phase 6: fixed top-right corner, independent of the content
                  column's own height below (1 line for a simple item,
                  several for a multi-stream one with its own Total row) —
                  never competing with price text for horizontal space. */}
              <button
                type="button"
                class="cz-quote-summary__remove"
                onClick={() => onRemove(item)}
                aria-label={`Remove ${isFamilyTierQuoteItem(item) ? item.familyTitle : item.serviceTitle}`}
              >
                ×
              </button>
              <div class="cz-quote-summary__item-info">
                <span class="cz-quote-summary__item-title">{isFamilyTierQuoteItem(item) ? item.familyTitle : item.serviceTitle}</span>
                <span class="cz-quote-summary__item-tier">{item.tierTitle}</span>
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
            </li>
          );
        })}
      </ul>

      <div class="cz-quote-summary__footer">
        {/* Phase 8B: a new, independent fact — deliberately a sibling of
            .cz-quote-summary__total below, not nested inside its ternary,
            so the existing TCV/fallback branches there stay byte-for-byte
            untouched. Only shown once any item is multi-stream (the same
            hasMultiStreamItem gate .total's own branch already uses) — a
            simple single-stream cart's existing compact "Est. X total"
            already answers this same question, so nothing new renders
            there. */}
        {hasMultiStreamItem && startingPayments.length > 0 && (
          <div class="cz-quote-summary__starting-payments">
            <span class="cz-quote-summary__total-label">Starting payments</span>
            {startingPayments.map(([cycle, amount]) => (
              <div key={cycle} class="cz-quote-summary__cycle-row">
                <span class="cz-quote-summary__cycle-name">{chargeTypeLabel(cycle)}</span>
                <span class="cz-quote-summary__cycle-amount">{formatPrice(amount)}</span>
              </div>
            ))}
          </div>
        )}
        <div class="cz-quote-summary__total">
          {cycleEntries.length === 0 ? (
            <>
              <span class="cz-quote-summary__total-label">Pricing on request</span>
              <span class="cz-quote-summary__total-price">Contact Us</span>
            </>
          ) : hasMultiStreamItem ? (
            // Phase 6/7: calcQuoteTotals' own Headline-cycle bucketing is
            // untrustworthy once any item has more than one real payment
            // stream (see hasMultiStreamItem above) — never fall through to
            // its hasMixedCycles/singleCycle labels below in that case.
            // combinedPrimaryTotalContractValue sums every primary item's
            // own already-computed TCV (reducing to that single item's own
            // TCV when there's only one) — only when EVERY primary item is
            // finite; any ongoing primary, or no primary items at all,
            // means the cart's own contract length is genuinely unbounded,
            // which Phase 8C states explicitly rather than falling back to
            // a generic "Multiple payment streams" non-answer.
            combinedPrimaryTotalContractValue !== null ? (
              <>
                <span class="cz-quote-summary__total-label">Total Contract Value</span>
                <span class="cz-quote-summary__total-price">{formatPrice(combinedPrimaryTotalContractValue)}</span>
              </>
            ) : (
              <>
                <span class="cz-quote-summary__total-label">Contract Value</span>
                <span class="cz-quote-summary__total-price">Ongoing</span>
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
