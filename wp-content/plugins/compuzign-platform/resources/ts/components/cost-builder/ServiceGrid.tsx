import { ServiceCard } from './ServiceCard';
import type { ServiceItem, Tier, TierId } from '@/api/types/cost-builder';
import type { QuoteItem } from './types';

interface ServiceGridProps {
  services: ServiceItem[];
  tiers: Tier[];
  quoteItems: QuoteItem[];
  onAddToQuote: (item: QuoteItem) => void;
  onRemoveFromQuote: (serviceId: number, addonTierId?: TierId) => void;
}

export function ServiceGrid({ services, tiers, quoteItems, onAddToQuote, onRemoveFromQuote }: ServiceGridProps) {
  if (services.length === 0) {
    return <p class="cz-muted cz-cost-builder__empty">No services in this category.</p>;
  }

  return (
    <div class="cz-cost-builder__grid">
      {services.map((service) => {
        const selectedTierId = quoteItems.find((q) => q.serviceId === service.id && !q.isAddon)?.tierId ?? null;
        const selectedAddonTierIds = quoteItems
          .filter((q) => q.serviceId === service.id && q.isAddon)
          .map((q) => q.tierId as TierId);
        return (
          <ServiceCard
            key={service.id}
            service={service}
            tiers={tiers}
            selectedTierId={selectedTierId}
            selectedAddonTierIds={selectedAddonTierIds}
            onAddToQuote={onAddToQuote}
            onRemoveFromQuote={onRemoveFromQuote}
          />
        );
      })}
    </div>
  );
}
