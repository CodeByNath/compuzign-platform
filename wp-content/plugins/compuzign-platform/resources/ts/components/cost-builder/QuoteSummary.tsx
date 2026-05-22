import { formatPrice } from '@/utils/format';
import type { QuoteItem } from './types';

interface QuoteSummaryProps {
  items: QuoteItem[];
  contactUrl: string | undefined;
  onRemove: (serviceId: number) => void;
  onClear: () => void;
  onOpenPdfModal: () => void;
}

export function QuoteSummary({ items, contactUrl, onRemove, onClear, onOpenPdfModal }: QuoteSummaryProps) {
  const pricedItems = items.filter((item) => item.price !== null);
  const hasUnpriced = pricedItems.length < items.length;
  const monthlyTotal = pricedItems.reduce((sum, item) => sum + (item.price as number), 0);

  return (
    <div class="cz-quote-summary">
      <div class="cz-quote-summary__header">
        <h3 class="cz-heading-sm">
          Your Quote
          {items.length > 0 && (
            <span class="cz-quote-summary__badge">{items.length}</span>
          )}
        </h3>
        <button type="button" class="cz-quote-summary__clear" onClick={onClear}>
          Clear all
        </button>
      </div>

      <ul class="cz-quote-summary__list">
        {items.map((item) => (
          <li key={item.serviceId} class="cz-quote-summary__item">
            <div class="cz-quote-summary__item-info">
              <span class="cz-quote-summary__item-title">{item.serviceTitle}</span>
              <span class="cz-quote-summary__item-tier">{item.tierTitle}</span>
            </div>
            <div class="cz-quote-summary__item-right">
              <span class="cz-quote-summary__item-price">
                {item.price !== null ? formatPrice(item.price) : 'Custom'}
              </span>
              <button
                type="button"
                class="cz-quote-summary__remove"
                onClick={() => onRemove(item.serviceId)}
                aria-label={`Remove ${item.serviceTitle}`}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div class="cz-quote-summary__footer">
        <div class="cz-quote-summary__total">
          <span class="cz-quote-summary__total-label">
            {hasUnpriced ? 'Estimate (custom pricing applies)' : 'Est. monthly total'}
          </span>
          <span class="cz-quote-summary__total-price">
            {hasUnpriced && monthlyTotal === 0
              ? 'Contact Us'
              : formatPrice(monthlyTotal)}
          </span>
        </div>
        <button
          type="button"
          class="cz-btn cz-btn-secondary cz-quote-summary__pdf"
          onClick={onOpenPdfModal}
        >
          Generate PDF Quote
        </button>
        {contactUrl ? (
          <a href={contactUrl} class="cz-btn cz-btn-primary cz-quote-summary__cta">
            Request Consultation
          </a>
        ) : (
          <button type="button" class="cz-btn cz-btn-primary cz-quote-summary__cta" disabled>
            Request Consultation
          </button>
        )}
      </div>
    </div>
  );
}
