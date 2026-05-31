import { formatPrice, formatCycleLabel } from '@/utils/format';
import type { QuoteItem } from './types';

interface MobileQuoteBarProps {
  items: QuoteItem[];
  summaryId: string;
}

export function MobileQuoteBar({ items, summaryId }: MobileQuoteBarProps) {
  if (items.length === 0) return null;

  const pricedItems = items.filter((i) => i.price !== null);
  const hasUnpriced = pricedItems.length < items.length;
  const cycles = [...new Set(pricedItems.map((i) => i.billingCycle))];
  const hasMixedCycles = cycles.length > 1;

  let totalDisplay: string;
  if (pricedItems.length === 0) {
    totalDisplay = 'Custom pricing';
  } else if (hasMixedCycles) {
    totalDisplay = 'Mixed billing — view details';
  } else {
    const total = pricedItems.reduce((sum, i) => sum + (i.price as number), 0);
    const suffix = formatCycleLabel(cycles[0]);
    totalDisplay = `${formatPrice(total)}${suffix ? ` ${suffix}` : ''}${hasUnpriced ? ' + custom' : ''}`;
  }

  const handleView = () => {
    const target = document.getElementById(summaryId);
    if (!target) return;
    const nav = document.querySelector<HTMLElement>('.cz-cost-builder__nav');
    const navHeight = nav?.offsetHeight ?? 0;
    const y = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <div class="cz-mobile-quote-bar" role="status" aria-live="polite">
      <div class="cz-mobile-quote-bar__info">
        <span class="cz-mobile-quote-bar__count">
          {items.length} item{items.length === 1 ? '' : 's'} in quote
        </span>
        <span class="cz-mobile-quote-bar__total">{totalDisplay}</span>
      </div>
      <button
        type="button"
        class="cz-btn cz-btn-primary cz-mobile-quote-bar__btn"
        onClick={handleView}
      >
        View quote ↓
      </button>
    </div>
  );
}
