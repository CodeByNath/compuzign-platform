import { useRef } from 'preact/hooks';
import { Badge } from '@/components/ui/Badge';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import type { Tier, ServicePricing, TierId } from '@/api/types/cost-builder';
import type { QuoteItemTierId } from './types';

interface PricingTiersProps {
  tiers: Tier[];
  pricing: ServicePricing;
  popularTier: TierId | null;
  selectedTierId: QuoteItemTierId | null;
  billingCycle: string;
  onSelect: (tierId: TierId) => void;
}

export function PricingTiers({ tiers, pricing, popularTier, selectedTierId, billingCycle, onSelect }: PricingTiersProps) {
  const suffix = formatCycleLabel(billingCycle);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  return (
    <div class="cz-cost-builder__tiers-wrap">
      <button
        type="button"
        class="cz-cost-builder__tiers-nav cz-cost-builder__tiers-prev"
        onClick={() => scroll(-1)}
        aria-label="Scroll tiers left"
      >
        ‹
      </button>
      <div class="cz-cost-builder__tiers" ref={scrollRef}>
        {tiers.map((tier) => {
          const data = pricing.tiers[tier.id];
          const isPopular = tier.id === popularTier;
          const isSelected = tier.id === selectedTierId;

          return (
            <div
              key={tier.id}
              class={[
                'cz-cost-builder__tier',
                isPopular && 'cz-cost-builder__tier--popular',
                isSelected && 'cz-cost-builder__tier--selected',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div class="cz-cost-builder__tier-name">
                <span>{tier.title}</span>
                {isPopular && <Badge variant="accent">Best</Badge>}
              </div>
              <div class="cz-cost-builder__tier-price">
                <span class="cz-cost-builder__tier-amount">
                  {formatPrice(data?.price ?? null)}
                </span>
                {data?.price !== null && data?.price !== undefined && suffix && (
                  <span class="cz-cost-builder__tier-cycle">{suffix}</span>
                )}
              </div>
              {data?.features && data.features.length > 0 && (
                <ul class="cz-cost-builder__tier-features">
                  {data.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                class={`cz-cost-builder__tier-action${isSelected ? ' is-selected' : ''}`}
                onClick={() => onSelect(tier.id)}
              >
                {isSelected ? '✓ Selected' : 'Add to Quote'}
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        class="cz-cost-builder__tiers-nav cz-cost-builder__tiers-next"
        onClick={() => scroll(1)}
        aria-label="Scroll tiers right"
      >
        ›
      </button>
    </div>
  );
}
