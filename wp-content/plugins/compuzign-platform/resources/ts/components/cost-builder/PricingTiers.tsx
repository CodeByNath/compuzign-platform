import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/utils/format';
import type { Tier, ServicePricing, TierId } from '@/api/types/cost-builder';

interface PricingTiersProps {
  tiers: Tier[];
  pricing: ServicePricing;
  popularTier: TierId | null;
  selectedTierId: TierId | null;
  billingCycle: string;
  onSelect: (tierId: TierId) => void;
}

const cycleLabel: Record<string, string> = {
  monthly:   '/ mo',
  annual:    '/ yr',
  quarterly: '/ qtr',
  'one-time': '',
};

export function PricingTiers({ tiers, pricing, popularTier, selectedTierId, billingCycle, onSelect }: PricingTiersProps) {
  const suffix = cycleLabel[billingCycle] ?? '';

  return (
    <div class="cz-cost-builder__tiers">
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
  );
}
