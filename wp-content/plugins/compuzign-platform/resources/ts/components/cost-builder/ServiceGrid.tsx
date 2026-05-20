import { ServiceCard } from './ServiceCard';
import type { ServiceItem, Tier } from '@/api/types/cost-builder';
import type { QuoteItem } from './types';

interface ServiceGridProps {
  services: ServiceItem[];
  tiers: Tier[];
  quoteItems: QuoteItem[];
  onAddToQuote: (item: QuoteItem) => void;
  onRemoveFromQuote: (serviceId: number) => void;
}

export function ServiceGrid({ services, tiers, quoteItems, onAddToQuote, onRemoveFromQuote }: ServiceGridProps) {
  if (services.length === 0) {
    return <p class="cz-muted cz-cost-builder__empty">No services in this category.</p>;
  }

  return (
    <div class="cz-cost-builder__grid">
      {services.map((service) => {
        const selectedTierId = quoteItems.find((q) => q.serviceId === service.id)?.tierId ?? null;
        return (
          <ServiceCard
            key={service.id}
            service={service}
            tiers={tiers}
            selectedTierId={selectedTierId}
            onAddToQuote={onAddToQuote}
            onRemoveFromQuote={onRemoveFromQuote}
          />
        );
      })}
    </div>
  );
}
