import { Card } from '@/components/ui/Card';
import { PricingTiers } from './PricingTiers';
import { decodeHtml } from '@/utils/format';
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
  const { meta, pricing, availability } = service;

  if (!availability.is_available) {
    return (
      <Card class="cz-cost-builder__card cz-cost-builder__card--unavailable">
        <div class="cz-cost-builder__card-header">
          <div class="cz-cost-builder__card-meta">
            {service.categories[0] && (
              <span class="cz-cost-builder__card-eyebrow">{decodeHtml(service.categories[0].name)}</span>
            )}
            <h3 class="cz-heading-sm">{decodeHtml(service.title)}</h3>
          </div>
        </div>
        <p class="cz-copy cz-cost-builder__unavailable-message">
          {availability.message || 'This service is not currently available.'}
        </p>
      </Card>
    );
  }

  const handleSelect = (tierId: TierId) => {
    if (selectedTierId === tierId) {
      onRemoveFromQuote(service.id);
      return;
    }
    const tier = tiers.find((t) => t.id === tierId);
    const tierData = pricing.tiers[tierId];
    onAddToQuote({
      serviceId: service.id,
      serviceTitle: decodeHtml(service.title),
      tierId,
      tierTitle: tierData?.label || tier?.title || tierId,
      price: tierData?.price ?? null,
      billingCycle: tierData?.billing_cycle || meta.billing_cycle,
      categoryName: decodeHtml(service.categories[0]?.name ?? ''),
      features: tierData?.inclusions?.length
        ? tierData.inclusions.map((inc) => inc.label)
        : (tierData?.features ?? []),
    });
  };

  const tierSelected = selectedTierId !== null && selectedTierId !== 'bundle';

  return (
    <Card class={`cz-cost-builder__card${tierSelected ? ' cz-cost-builder__card--selected' : ''}`}>
      <div class="cz-cost-builder__card-header">
        <div class="cz-cost-builder__card-meta">
          {service.categories[0] && (
            <span class="cz-cost-builder__card-eyebrow">{decodeHtml(service.categories[0].name)}</span>
          )}
          <h3 class="cz-heading-sm">{decodeHtml(service.title)}</h3>
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
