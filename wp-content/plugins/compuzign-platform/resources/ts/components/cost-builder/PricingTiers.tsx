import { useRef, useState } from 'preact/hooks';
import { Badge } from '@/components/ui/Badge';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import type { Tier, ServicePricing, TierId } from '@/api/types/cost-builder';
import type { QuoteItemTierId } from './types';

interface PricingTiersProps {
  tiers: Tier[];
  pricing: ServicePricing;
  popularTier: TierId | null;
  popularLabel?: string | null;
  selectedTierId: QuoteItemTierId | null;
  billingCycle: string;
  onSelect: (tierId: TierId) => void;
}

export function PricingTiers({ tiers, pricing, popularTier, popularLabel, selectedTierId, billingCycle, onSelect }: PricingTiersProps) {
  // DEBUG — remove after diagnosis
  console.log('[CZ PricingTiers] pricing:', pricing);
  console.log('[CZ PricingTiers] pricing.tiers:', pricing.tiers);
  console.log('[CZ PricingTiers] pricing.tiers.basic:', pricing.tiers['basic']);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredTierId, setHoveredTierId] = useState<TierId | null>(null);

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
        {tiers.filter((tier) => tier.id in pricing.tiers).map((tier) => {
          const data = pricing.tiers[tier.id];
          // DEBUG — remove after diagnosis
          console.log('[CZ PricingTiers] tier=' + tier.id, '| data:', data, '| label:', data?.label, '| price:', data?.price, '| billing_cycle:', data?.billing_cycle);
          const isPopular = tier.id === popularTier;
          const isSelected = tier.id === selectedTierId;
          const isHoveringSelected = isSelected && hoveredTierId === tier.id;
          const tierBillingCycle = data?.billing_cycle || billingCycle;
          const suffix = formatCycleLabel(tierBillingCycle);
          const displayList = data?.inclusions?.length
            ? data.inclusions.map((inc) => inc.label)
            : (data?.features ?? []);

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
                <span>{data?.label || tier.title}</span>
                {isPopular && <Badge variant="accent">{popularLabel || 'Best'}</Badge>}
              </div>
              <div class="cz-cost-builder__tier-price">
                <span class="cz-cost-builder__tier-amount">
                  {formatPrice(data?.price ?? null)}
                </span>
                {data?.price !== null && data?.price !== undefined && suffix && (
                  <span class="cz-cost-builder__tier-cycle">{suffix}</span>
                )}
              </div>
              {displayList.length > 0 && (
                <ul class="cz-cost-builder__tier-features">
                  {displayList.map((label, i) => (
                    <li key={i}>{label}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                class={`cz-cost-builder__tier-action${isSelected ? ' is-selected' : ''}${isHoveringSelected ? ' is-removing' : ''}`}
                onClick={() => onSelect(tier.id)}
                onMouseEnter={() => setHoveredTierId(tier.id)}
                onMouseLeave={() => setHoveredTierId(null)}
              >
                {isHoveringSelected ? '× Remove' : isSelected ? '✓ Selected' : 'Add to Quote'}
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
