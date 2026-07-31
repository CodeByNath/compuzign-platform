import { useRef, useState } from 'preact/hooks';
import { Badge } from '@/components/ui/Badge';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import type { Tier, ServicePricing, TierId } from '@/api/types/cost-builder';
import type { QuoteItemTierId } from './types';

interface PricingTiersProps {
  tiers: Tier[];
  pricing: ServicePricing;
  popularTier: TierId | null;
  popularLabel?: string | null;
  selectedTierId: QuoteItemTierId | null;
  // Add-on Tiers currently selected alongside the normal Tier, for this Service.
  selectedAddonTierIds: TierId[];
  billingCycle: string;
  onSelect: (tierId: TierId) => void;
  onToggleAddon: (tierId: TierId) => void;
}

// One Tier/add-on card. Shared by both strips below so the visual language and
// interaction primitives (card, price, feature list, action button) are defined
// exactly once — the strips differ only in which Tiers they list, whether the
// popular badge applies, the active flag, and which handler a click reaches.
function TierCard({
  tier,
  data,
  isPopular,
  popularLabel,
  isActive,
  billingCycle,
  addedLabel,
  onClick,
}: {
  tier: Tier;
  data: ServicePricing['tiers'][TierId] | undefined;
  isPopular: boolean;
  popularLabel?: string | null;
  isActive: boolean;
  billingCycle: string;
  addedLabel: string;
  onClick: () => void;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const isRemoving = isActive && isHovering;
  const tierBillingCycle = data?.billing_cycle || billingCycle;
  const suffix = formatCycleLabel(tierBillingCycle);
  const displayList = data?.inclusions?.length
    ? data.inclusions.map((inc) => inc.label)
    : (data?.features ?? []);

  return (
    <div
      class={[
        'cz-cost-builder__tier',
        isPopular && 'cz-cost-builder__tier--popular',
        isActive && 'cz-cost-builder__tier--selected',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div class="cz-cost-builder__tier-name">
        <span>{data?.label || tier.title}</span>
        {isPopular && <Badge variant="accent">{popularLabel || 'Best'}</Badge>}
      </div>
      <div class="cz-cost-builder__tier-price">
        <span class="cz-cost-builder__tier-amount">
          {formatPrice(data?.price ?? null)}
        </span>
        {data?.price !== null && data?.price !== undefined && suffix && (
          <span class="cz-cost-builder__tier-cycle">{suffix}</span>
        )}
      </div>
      {displayList.length > 0 && (
        <ul class="cz-cost-builder__tier-features">
          {displayList.map((label, i) => (
            <li key={i}>{label}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        class={`cz-cost-builder__tier-action${isActive ? ' is-selected' : ''}${isRemoving ? ' is-removing' : ''}`}
        onClick={onClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {isRemoving ? '× Remove' : isActive ? addedLabel : 'Add to Quote'}
      </button>
    </div>
  );
}

export function PricingTiers({
  tiers,
  pricing,
  popularTier,
  popularLabel,
  selectedTierId,
  selectedAddonTierIds,
  billingCycle,
  onSelect,
  onToggleAddon,
}: PricingTiersProps) {
  // DEBUG — remove after diagnosis
  console.log('[CZ PricingTiers] pricing:', pricing);
  console.log('[CZ PricingTiers] pricing.tiers:', pricing.tiers);
  console.log('[CZ PricingTiers] pricing.tiers.basic:', pricing.tiers['basic']);

  const scrollRef = useRef<HTMLDivElement>(null);
  const addonScrollRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: typeof scrollRef, dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  // The customer's one normal Tier vs. zero-or-more add-on Tiers, both drawn
  // from the same Tier System — compatibility is implicit within it, so no
  // separate rule set gates which add-ons are offered alongside which normal
  // Tier.
  const normalTiers = tiers.filter((tier) => tier.id in pricing.tiers && !pricing.tiers[tier.id].is_addon);
  const addonTiers = tiers.filter((tier) => tier.id in pricing.tiers && pricing.tiers[tier.id].is_addon);

  return (
    <>
      <div class="cz-cost-builder__tiers-wrap">
        <button
          type="button"
          class="cz-cost-builder__tiers-nav cz-cost-builder__tiers-prev"
          onClick={() => scroll(scrollRef, -1)}
          aria-label="Scroll tiers left"
        >
          ‹
        </button>
        <div class="cz-cost-builder__tiers" ref={scrollRef}>
          {normalTiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              data={pricing.tiers[tier.id]}
              isPopular={tier.id === popularTier}
              popularLabel={popularLabel}
              isActive={tier.id === selectedTierId}
              billingCycle={billingCycle}
              addedLabel="✓ Selected"
              onClick={() => onSelect(tier.id)}
            />
          ))}
        </div>
        <button
          type="button"
          class="cz-cost-builder__tiers-nav cz-cost-builder__tiers-next"
          onClick={() => scroll(scrollRef, 1)}
          aria-label="Scroll tiers right"
        >
          ›
        </button>
      </div>

      {addonTiers.length > 0 && (
        <div class="cz-cost-builder__addons">
          <h4 class="cz-cost-builder__addons-heading">Optional add-ons</h4>
          <div class="cz-cost-builder__tiers-wrap">
            <button
              type="button"
              class="cz-cost-builder__tiers-nav cz-cost-builder__tiers-prev"
              onClick={() => scroll(addonScrollRef, -1)}
              aria-label="Scroll add-ons left"
            >
              ‹
            </button>
            <div class="cz-cost-builder__tiers" ref={addonScrollRef}>
              {addonTiers.map((tier) => (
                <TierCard
                  key={tier.id}
                  tier={tier}
                  data={pricing.tiers[tier.id]}
                  isPopular={tier.id === popularTier}
                  popularLabel={popularLabel}
                  isActive={selectedAddonTierIds.includes(tier.id)}
                  billingCycle={billingCycle}
                  addedLabel="✓ Added"
                  onClick={() => onToggleAddon(tier.id)}
                />
              ))}
            </div>
            <button
              type="button"
              class="cz-cost-builder__tiers-nav cz-cost-builder__tiers-next"
              onClick={() => scroll(addonScrollRef, 1)}
              aria-label="Scroll add-ons right"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}
