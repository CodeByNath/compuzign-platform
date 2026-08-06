import { Card } from '@/components/ui/Card';
import { PricingTiers } from './PricingTiers';
import type { EffectiveTierDisplay } from './PricingTiers';
import { decodeHtml } from '@/utils/format';
import type { ServiceItem, Tier, TierId } from '@/api/types/cost-builder';
import type { QuoteItem, QuoteItemTierId } from './types';

interface ServiceCardProps {
  service: ServiceItem;
  tiers: Tier[];
  selectedTierId: QuoteItemTierId | null;
  // Add-on Tiers currently in the quote for this Service.
  selectedAddonTierIds: TierId[];
  onAddToQuote: (item: QuoteItem) => void;
  // Removes the whole Service's normal Tier (and, by the same cascade as
  // today, any of its selected add-ons) when called with one argument.
  // Removes exactly one add-on Tier, leaving everything else untouched, when
  // called with the second argument.
  onRemoveFromQuote: (serviceId: number, addonTierId?: TierId) => void;
}

export function ServiceCard({
  service,
  tiers,
  selectedTierId,
  selectedAddonTierIds,
  onAddToQuote,
  onRemoveFromQuote,
}: ServiceCardProps) {
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

  // `effective` is whichever Edition (if any) was showing in the card's own
  // switch at the moment of this click — see PricingTiers.
  // resolveEffectiveTierDisplay. When no switch was ever touched it already
  // equals this Tier's server-resolved default, so an existing Tier with no
  // Editions is captured identically to before this capability existed.
  const handleSelect = (tierId: TierId, effective: EffectiveTierDisplay) => {
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
      // The Tier's own customer-facing title, never the switched Edition's
      // label — a cart line stays "Professional" whichever Edition
      // (Monthly/Annual) was showing at the moment of the click. The chosen
      // Edition's commercial terms (price/cycle/commitment) still travel via
      // `effective` below; only the display title is deliberately excluded.
      tierTitle: tierData?.label || tier?.title || tierId,
      price: effective.price,
      billingCycle: effective.billingCycle,
      categoryName: decodeHtml(service.categories[0]?.name ?? ''),
      features: effective.inclusionLabels,
      isAddon: false,
      minimumTermValue: effective.minimumTermValue,
      minimumTermUnit: effective.minimumTermUnit,
    });
  };

  // Independent toggle: never touches the normal Tier selection or any other
  // add-on, and never replaces the normal selected Tier.
  const handleToggleAddon = (tierId: TierId, effective: EffectiveTierDisplay) => {
    if (selectedAddonTierIds.includes(tierId)) {
      onRemoveFromQuote(service.id, tierId);
      return;
    }
    const tier = tiers.find((t) => t.id === tierId);
    const tierData = pricing.tiers[tierId];
    onAddToQuote({
      serviceId: service.id,
      serviceTitle: decodeHtml(service.title),
      tierId,
      // The Tier's own customer-facing title, never the switched Edition's
      // label — a cart line stays "Professional" whichever Edition
      // (Monthly/Annual) was showing at the moment of the click. The chosen
      // Edition's commercial terms (price/cycle/commitment) still travel via
      // `effective` below; only the display title is deliberately excluded.
      tierTitle: tierData?.label || tier?.title || tierId,
      price: effective.price,
      billingCycle: effective.billingCycle,
      categoryName: decodeHtml(service.categories[0]?.name ?? ''),
      features: effective.inclusionLabels,
      isAddon: true,
      minimumTermValue: effective.minimumTermValue,
      minimumTermUnit: effective.minimumTermUnit,
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
        popularLabel={meta.popular_label}
        selectedTierId={selectedTierId}
        selectedAddonTierIds={selectedAddonTierIds}
        billingCycle={meta.billing_cycle}
        onSelect={handleSelect}
        onToggleAddon={handleToggleAddon}
      />
    </Card>
  );
}
