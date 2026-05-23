import { Card } from '@/components/ui/Card';
import { PricingTiers } from './PricingTiers';
import type { ServiceItem, Tier, TierId } from '@/api/types/cost-builder';
import type { QuoteItem, QuoteItemTierId } from './types';

interface ServiceCardProps {
  service: ServiceItem;
  tiers: Tier[];
  selectedTierId: QuoteItemTierId | null;
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
      categoryName: service.categories[0]?.name ?? '',
      features: pricing.tiers[tierId]?.features ?? [],
    });
  };

  const tierSelected = selectedTierId !== null && selectedTierId !== 'bundle';

  return (
    <Card class={`cz-cost-builder__card${tierSelected ? ' cz-cost-builder__card--selected' : ''}`}>
      <div class="cz-cost-builder__card-header">
        <div class="cz-cost-builder__card-meta">
          {service.categories[0] && (
            <span class="cz-cost-builder__card-eyebrow">{service.categories[0].name}</span>
          )}
          <h3 class="cz-heading-sm">{service.title}</h3>
        </div>
      </div>
      {meta.short_description && (
        <p class="cz-copy cz-cost-builder__description">
          {meta.short_description}
        </p>
      )}
      {meta.billing_cycle && (
        <div class="cz-cost-builder__billing-cycle">
          <span class="cz-cost-builder__billing-label">Billing:</span>
          <span class="cz-cost-builder__billing-value">{meta.billing_cycle}</span>
        </div>
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
