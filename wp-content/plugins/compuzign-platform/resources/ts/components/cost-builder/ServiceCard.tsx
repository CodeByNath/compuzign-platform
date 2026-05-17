import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PricingTiers } from './PricingTiers';
import type { ServiceItem, Tier, TierId } from '@/api/types/cost-builder';
import type { QuoteItem } from './types';

interface ServiceCardProps {
  service: ServiceItem;
  tiers: Tier[];
  selectedTierId: TierId | null;
  onAddToQuote: (item: QuoteItem) => void;
  onRemoveFromQuote: (serviceId: number) => void;
}

export function ServiceCard({ service, tiers, selectedTierId, onAddToQuote, onRemoveFromQuote }: ServiceCardProps) {
  const { meta, pricing } = service;

  const handleSelect = (tierId: TierId) => {
    if (selectedTierId === tierId) {
      onRemoveFromQuote(service.id);
      return;
    }
    const tier = tiers.find((t) => t.id === tierId);
    onAddToQuote({
      serviceId: service.id,
      serviceTitle: service.title,
      tierId,
      tierTitle: tier?.title ?? tierId,
      price: pricing.tiers[tierId]?.price ?? null,
      billingCycle: meta.billing_cycle,
    });
  };

  return (
    <Card class={`cz-cost-builder__card${selectedTierId ? ' cz-cost-builder__card--selected' : ''}`}>
      <div class="cz-cost-builder__card-header">
        <h3 class="cz-heading-md">{service.title}</h3>
        {meta.popular_tier !== null && <Badge variant="accent">Popular</Badge>}
      </div>
      {meta.short_description && (
        <p class="cz-copy cz-cost-builder__description">
          {meta.short_description}
        </p>
      )}
      <PricingTiers
        tiers={tiers}
        pricing={pricing}
        popularTier={meta.popular_tier}
        selectedTierId={selectedTierId}
        billingCycle={meta.billing_cycle}
        onSelect={handleSelect}
      />
    </Card>
  );
}
