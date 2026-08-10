import { useState } from 'preact/hooks';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import { calcQuoteTotals, quoteItemKey } from '@/utils/quote';
import { isFamilyTierQuoteItem } from '@/utils/quote';
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
          const cycleSuffix = formatCycleLabel(item.billingCycle);
          return (
            <li key={quoteItemKey(item)} class="cz-quote-summary__item">
              <div class="cz-quote-summary__item-info">
                <span class="cz-quote-summary__item-title">{isFamilyTierQuoteItem(item) ? item.familyTitle : item.serviceTitle}</span>
                <span class="cz-quote-summary__item-tier">{item.tierTitle}</span>
                {isFamilyTierQuoteItem(item) && <span class="cz-quote-summary__item-tier">{item.familyPlatformId} · {item.tierInstancePlatformId} · {item.tierPlatformId}{item.tierEditionPlatformId ? ` · ${item.tierEditionPlatformId}` : ''}</span>}
              </div>
              <div class="cz-quote-summary__item-right">
                <span class="cz-quote-summary__item-price">
                  {item.price !== null ? (
                    <>
                      {formatPrice(item.price)}
                      {cycleSuffix && (
                        <span class="cz-quote-summary__item-cycle">{' '}{cycleSuffix}</span>
                      )}
                    </>
                  ) : 'Custom'}
                </span>
                <button
                  type="button"
                  class="cz-quote-summary__remove"
                  onClick={() => onRemove(item)}
                  aria-label={`Remove ${isFamilyTierQuoteItem(item) ? item.familyTitle : item.serviceTitle}`}
                >
                  ×
                </button>
              </div>
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
