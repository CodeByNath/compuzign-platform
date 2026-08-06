import { useRef, useState } from 'preact/hooks';
import { Badge } from '@/components/ui/Badge';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import type { PricingEditionOption, PricingTierData, Tier, ServicePricing, TierId } from '@/api/types/cost-builder';
import type { QuoteItemTierId } from './types';

export interface EffectiveTierDisplay {
  price: number | null;
  billingCycle: string;
  inclusionLabels: string[];
  selectedEdition: PricingEditionOption | null;
}

/**
 * Resolve what a Tier card should currently show — pure and exported so the
 * Tier Edition switch's actual logic (not just its JSX) is independently
 * testable, the same reason draftPreferredDetail exists for is_addon.
 *
 * `selectedEditionId: null` means "nothing switched yet": the occupant's own
 * resolved default is already baked into `data.price`/`billing_cycle`/
 * `inclusions` server-side (PackageSchema::resolveDefaultTierEdition), so a
 * Tier with no Editions — or one whose switch was never touched — renders
 * from exactly the same fields it always has. Switching only overlays a
 * DIFFERENT Edition's own declaration in place; it can never change which
 * Tier is selected.
 */
export function resolveEffectiveTierDisplay(
  data: PricingTierData | undefined,
  billingCycle: string,
  selectedEditionId: string | null,
): EffectiveTierDisplay {
  const editionOptions = data?.edition_options ?? [];
  const selectedEdition = editionOptions.find((e) => e.id === selectedEditionId) ?? null;

  const price = selectedEdition ? selectedEdition.price : (data?.price ?? null);
  const effectiveCycle = selectedEdition
    ? (selectedEdition.billing_cycle ?? billingCycle)
    : (data?.billing_cycle || billingCycle);
  const inclusions = selectedEdition && selectedEdition.inclusions_override.length > 0
    ? selectedEdition.inclusions_override
    : data?.inclusions;
  const inclusionLabels = inclusions?.length
    ? inclusions.map((inc) => inc.label)
    : (data?.features ?? []);

  return { price, billingCycle: effectiveCycle, inclusionLabels, selectedEdition };
}

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

  // Tier Edition switch (Phase 7) — an in-card, mutually-exclusive choice
  // among this SAME Tier's Editions. It never selects a different Tier: the
  // customer still clicks Add to Quote/Selected exactly once for this card;
  // switching only changes which Edition's declaration is currently shown.
  const editionOptions = data?.edition_options ?? [];
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);
  const { price: effectivePrice, billingCycle: effectiveBillingCycle, inclusionLabels: displayList, selectedEdition } =
    resolveEffectiveTierDisplay(data, billingCycle, selectedEditionId);

  const suffix = formatCycleLabel(effectiveBillingCycle);

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
      {editionOptions.length > 1 && (
        <div class="cz-cost-builder__tier-editions" role="group" aria-label={`${data?.label || tier.title} payment options`}>
          {editionOptions.map((edition) => {
            const active = (selectedEditionId ?? editionOptions.find((e) => e.is_default)?.id ?? editionOptions[0].id) === edition.id;
            return (
              <button
                key={edition.id}
                type="button"
                class={`cz-cost-builder__tier-edition${active ? ' is-active' : ''}`}
                aria-pressed={active}
                onClick={(e) => { e.stopPropagation(); setSelectedEditionId(edition.id); }}
              >
                {edition.label}
              </button>
            );
          })}
        </div>
      )}
      <div class="cz-cost-builder__tier-price">
        <span class="cz-cost-builder__tier-amount">
          {formatPrice(effectivePrice)}
        </span>
        {effectivePrice !== null && suffix && (
          <span class="cz-cost-builder__tier-cycle">{suffix}</span>
        )}
      </div>
      {selectedEdition && (selectedEdition.minimum_term_value != null) && (
        <p class="cz-cost-builder__tier-commitment">
          Minimum {selectedEdition.minimum_term_value} {selectedEdition.minimum_term_unit ?? ''}
        </p>
      )}
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
