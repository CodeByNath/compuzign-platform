import { ServiceCard } from './ServiceCard';
import type { ServiceItem, Tier } from '@/api/types/cost-builder';

interface ServiceGridProps {
  services: ServiceItem[];
  tiers: Tier[];
}

export function ServiceGrid({ services, tiers }: ServiceGridProps) {
  if (services.length === 0) {
    return <p class="cz-muted cz-cost-builder__empty">No services in this category.</p>;
  }

  return (
    <div class="cz-cost-builder__grid cz-grid cz-grid-2">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} tiers={tiers} />
      ))}
    </div>
  );
}
