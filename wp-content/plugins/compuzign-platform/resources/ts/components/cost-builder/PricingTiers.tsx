import { Badge } from '@/components/ui/Badge';
import { formatPrice } from '@/utils/format';
import type { Tier, ServicePricing, TierId } from '@/api/types/cost-builder';

interface PricingTiersProps {
  tiers: Tier[];
  pricing: ServicePricing;
  popularTier: TierId | null;
}

export function PricingTiers({ tiers, pricing, popularTier }: PricingTiersProps) {
  return (
    <div class="cz-cost-builder__tiers">
      {tiers.map((tier) => {
        const data = pricing.tiers[tier.id];
        const isPopular = tier.id === popularTier;

        return (
          <div
            key={tier.id}
            class={[
              'cz-cost-builder__tier',
              isPopular && 'cz-cost-builder__tier--popular',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div class="cz-cost-builder__tier-name">
              <span class="cz-muted">{tier.title}</span>
              {isPopular && <Badge variant="accent">Best</Badge>}
            </div>
            <div class="cz-cost-builder__tier-price cz-accent">
              {formatPrice(data?.price ?? null)}
            </div>
            {data?.features && data.features.length > 0 && (
              <ul class="cz-cost-builder__tier-features">
                {data.features.map((f, i) => (
                  <li key={i} class="cz-copy">
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
