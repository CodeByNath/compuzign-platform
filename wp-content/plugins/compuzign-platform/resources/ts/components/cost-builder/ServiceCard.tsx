import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PricingTiers } from './PricingTiers';
import type { ServiceItem, Tier } from '@/api/types/cost-builder';

interface ServiceCardProps {
  service: ServiceItem;
  tiers: Tier[];
}

export function ServiceCard({ service, tiers }: ServiceCardProps) {
  const { meta, pricing } = service;

  return (
    <Card class="cz-cost-builder__card">
      <div class="cz-cost-builder__card-header">
        <h3 class="cz-heading-lg">{service.title}</h3>
        {meta.popular_tier !== null && <Badge variant="accent">Popular</Badge>}
      </div>
      {meta.short_description && (
        <p class="cz-copy cz-muted cz-cost-builder__description">
          {meta.short_description}
        </p>
      )}
      <PricingTiers tiers={tiers} pricing={pricing} popularTier={meta.popular_tier} />
    </Card>
  );
}
