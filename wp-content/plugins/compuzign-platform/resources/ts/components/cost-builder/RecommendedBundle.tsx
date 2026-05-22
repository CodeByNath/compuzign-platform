import { formatPrice } from '@/utils/format';
import type { ServiceItem } from '@/api/types/cost-builder';
import type { QuoteItem } from './types';

interface RecommendedBundleProps {
  service: ServiceItem;
  isInQuote: boolean;
  onAdd: (item: QuoteItem) => void;
  onRemove: (serviceId: number) => void;
}

export function RecommendedBundle({ service, isInQuote, onAdd, onRemove }: RecommendedBundleProps) {
  const { bundle } = service.pricing;
  if (!bundle.title) return null;

  // Bundles use a negative service ID so they coexist alongside tier selections in the quote
  const bundleServiceId = -(service.id);

  const handleToggle = () => {
    if (isInQuote) {
      onRemove(bundleServiceId);
    } else {
      onAdd({
        serviceId: bundleServiceId,
        serviceTitle: bundle.title,
        tierId: 'bundle',
        tierTitle: 'Bundle',
        price: bundle.price,
        billingCycle: service.meta.billing_cycle,
      });
    }
  };

  return (
    <div class="cz-cost-builder__bundle">
      <div class="cz-cost-builder__bundle-inner">
        <div class="cz-cost-builder__bundle-text">
          <span class="cz-cost-builder__bundle-eyebrow">Recommended Bundle</span>
          <h4 class="cz-cost-builder__bundle-title">{bundle.title}</h4>
          {bundle.description && (
            <p class="cz-cost-builder__bundle-desc">{bundle.description}</p>
          )}
        </div>
        <div class="cz-cost-builder__bundle-footer">
          {bundle.price !== null && (
            <span class="cz-cost-builder__bundle-price">
              {formatPrice(bundle.price)}
              <span class="cz-cost-builder__bundle-cycle"> / mo</span>
            </span>
          )}
          <button
            type="button"
            class={`cz-btn cz-btn-secondary cz-cost-builder__bundle-cta${isInQuote ? ' is-selected' : ''}`}
            onClick={handleToggle}
          >
            {isInQuote ? '✓ Bundle Added' : 'Add Bundle'}
          </button>
        </div>
      </div>
    </div>
  );
}
