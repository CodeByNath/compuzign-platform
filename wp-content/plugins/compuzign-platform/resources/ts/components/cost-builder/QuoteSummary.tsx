import { useState } from 'preact/hooks';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import { calcQuoteTotals, quoteItemKey } from '@/utils/quote';
import { isFamilyTierQuoteItem } from '@/utils/quote';
import { cycleSuffix, computeTotalContractValue } from './PricingTiers';
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

  // Phase 6: calcQuoteTotals()'s own cycle-bucket math is untouched — it
  // still only ever sees each item's single flat Headline price/cycle, so
  // its "Est. X total" is only trustworthy when NO item actually has more
  // than one real payment stream. Rather than teach that function a second,
  // per-stream bucketing model (an invented cross-cycle summation this phase
  // was told not to build), a multi-stream item's presence is classified
  // here and the footer branches BEFORE reaching calcQuoteTotals' own
  // labels at all.
  const familyTierItems = items.filter(isFamilyTierQuoteItem);
  const hasMultiStreamItem = familyTierItems.some((item) => (item.legPaymentSummaries?.length ?? 0) > 1);
  // "One finite multi-stream primary offer": the cart's only priced line is
  // that one multi-stream item — its own already-computed
  // computeTotalContractValue() is reused as-is (never re-derived) as the
  // footer's headline number. Two or more priced items (e.g. an add-on
  // alongside it) can't be reduced to one truthful figure without summing
  // across genuinely different offers, so that case — and an ongoing/
  // unbounded stream with no finite total — falls through to the neutral
  // "see pricing above" note instead of a fabricated aggregate.
  const pricedItemCount = items.filter((item) => item.price !== null).length;
  const soleMultiStreamItem = hasMultiStreamItem && pricedItemCount === 1
    ? familyTierItems.find((item) => (item.legPaymentSummaries?.length ?? 0) > 1) ?? null
    : null;
  const soleItemTotalContractValue = soleMultiStreamItem
    ? computeTotalContractValue(soleMultiStreamItem.legPaymentSummaries!)
    : null;

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
          // Phase 5: this quoted option's own resolved commercial payment
          // streams (buildLegPaymentSummaries(), captured at Add to Quote
          // time — see FamilyTierAdapter.tsx's itemFor()). A single stream
          // (or none, e.g. a Cost Builder QuoteItem, which never has this
          // field) keeps today's one flat price/cycle line unchanged — only
          // 2+ distinct streams switch to showing each its own amount, never
          // summed into one fake cycle total (a real $160k upfront charge
          // alongside a $16k/year Leg must never collapse into one "annual"
          // number).
          const streams = isFamilyTierQuoteItem(item) ? item.legPaymentSummaries : null;
          const isMultiStream = !!streams && streams.length > 1;
          const totalContractValue = isMultiStream ? computeTotalContractValue(streams!) : null;
          return (
            <li key={quoteItemKey(item)} class="cz-quote-summary__item">
              {/* Phase 6: fixed top-right corner, independent of the content
                  column's own height below (1 line for a simple item,
                  several for a multi-stream one with its own Total Contract
                  Value block) — never competing with price text for
                  horizontal space. */}
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
                {isMultiStream ? (
                  streams!.map((stream) => (
                    <span key={stream.source} class="cz-quote-summary__item-price">
                      {formatPrice(stream.price)}
                      {cycleSuffix(stream.billingCycle) && (
                        <span class="cz-quote-summary__item-cycle">{' '}{cycleSuffix(stream.billingCycle)}</span>
                      )}
                    </span>
                  ))
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
              {/* Phase 6: Total Contract Value is its own labeled block,
                  visually set apart from the payment-stream amounts above —
                  never squeezed into the same line as a stream's own price. */}
              {isMultiStream && totalContractValue !== null && (
                <div class="cz-quote-summary__item-tcv">
                  <span class="cz-quote-summary__item-tcv-label">Total Contract Value</span>
                  <span class="cz-quote-summary__item-tcv-value">{formatPrice(totalContractValue)}</span>
                </div>
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
            // Phase 6: calcQuoteTotals' own Headline-cycle bucketing is
            // untrustworthy once any item has more than one real payment
            // stream (see hasMultiStreamItem above) — never fall through to
            // its hasMixedCycles/singleCycle labels below in that case.
            soleItemTotalContractValue !== null ? (
              <>
                <span class="cz-quote-summary__total-label">Total Contract Value</span>
                <span class="cz-quote-summary__total-price">{formatPrice(soleItemTotalContractValue)}</span>
              </>
            ) : (
              <>
                <span class="cz-quote-summary__total-label">Multiple payment streams</span>
                <span class="cz-quote-summary__custom-note">
                  See pricing above for the full payment structure
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
