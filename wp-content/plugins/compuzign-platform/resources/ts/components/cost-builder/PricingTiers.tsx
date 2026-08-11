import { useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Badge } from '@/components/ui/Badge';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import type { PricingEditionOption, PricingTierData, Tier, TierId } from '@/api/types/cost-builder';
import type { QuoteItemTierId } from './types';

export interface EffectiveTierDisplay {
  price: number | null;
  billingCycle: string;
  inclusionLabels: string[];
  selectedEdition: PricingEditionOption | null;
  minimumTermValue: number | null;
  minimumTermUnit: string | null;
}

/**
 * Resolve what a Tier card should currently show — pure and exported so the
 * Tier Edition switch's actual logic (not just its JSX) is independently
 * testable, the same reason draftPreferredDetail exists for is_addon.
 *
 * `selectedEditionId: null` means Default — the occupant's own permanent
 * declaration, always `data.price`/`billing_cycle`/`inclusions` as the
 * server already sends them (PackageSchema::extractTierForCostBuilder never
 * blends an Edition's terms into these fields). A Tier with no Editions, or
 * whose switch was never touched, renders from exactly these fields.
 * Switching to a non-null id overlays that ONE Edition's own declaration in
 * place; it can never change which Tier is selected, and switching back to
 * Default is always available, never a one-way trip.
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
  const minimumTermValue = selectedEdition ? selectedEdition.minimum_term_value : (data?.minimum_term_value ?? null);
  const minimumTermUnit  = selectedEdition ? selectedEdition.minimum_term_unit  : (data?.minimum_term_unit  ?? null);

  return { price, billingCycle: effectiveCycle, inclusionLabels, selectedEdition, minimumTermValue, minimumTermUnit };
}

interface PricingTiersProps {
  tiers: Tier[];
  pricing: { tiers: Partial<Record<TierId, PricingTierData>> };
  popularTier: TierId | null;
  popularLabel?: string | null;
  selectedTierId: QuoteItemTierId | null;
  // Add-on Tiers currently selected alongside the normal Tier, for this Service.
  selectedAddonTierIds: TierId[];
  billingCycle: string;
  // `effective` carries whichever Edition (if any) the customer switched to
  // in this card at the moment of clicking — see resolveEffectiveTierDisplay.
  // Required, not optional: every click resolves one, even when no switch
  // was ever touched (it then equals the Tier's own server-resolved
  // default, so existing single-declaration Tiers behave identically).
  onSelect: (tierId: TierId, effective: EffectiveTierDisplay) => void;
  onToggleAddon: (tierId: TierId, effective: EffectiveTierDisplay) => void;
  renderFullBuild?: (inclusionLabels: string[]) => ComponentChildren;
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
  renderFullBuild,
}: {
  tier: Tier;
  data: PricingTierData | undefined;
  isPopular: boolean;
  popularLabel?: string | null;
  isActive: boolean;
  billingCycle: string;
  addedLabel: string;
  onClick: (effective: EffectiveTierDisplay) => void;
  renderFullBuild?: (inclusionLabels: string[]) => ComponentChildren;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const isRemoving = isActive && isHovering;

  // Tier Edition switch — an in-card, mutually-exclusive choice between this
  // Tier's own permanent Default declaration and any additional Editions.
  // It never selects a different Tier: the customer still clicks Add to
  // Quote/Selected exactly once for this card; switching only changes which
  // declaration is currently shown — and, via `effective` passed to onClick
  // below, which one is captured into the quote when that click happens.
  const editionOptions = data?.edition_options ?? [];
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);
  const effective = resolveEffectiveTierDisplay(data, billingCycle, selectedEditionId);
  const { price: effectivePrice, billingCycle: effectiveBillingCycle, inclusionLabels: displayList, selectedEdition } = effective;

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
      {editionOptions.length >= 1 && (
        <div class="cz-cost-builder__tier-editions" role="group" aria-label={`${data?.label || tier.title} payment options`}>
          <button
            type="button"
            class={`cz-cost-builder__tier-edition${selectedEditionId === null ? ' is-active' : ''}`}
            aria-pressed={selectedEditionId === null}
            onClick={(e) => { e.stopPropagation(); setSelectedEditionId(null); }}
          >
            Default
          </button>
          {editionOptions.map((edition) => {
            const active = selectedEditionId === edition.id;
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
      {renderFullBuild?.(displayList)}
      <button
        type="button"
        class={`cz-cost-builder__tier-action${isActive ? ' is-selected' : ''}${isRemoving ? ' is-removing' : ''}`}
        onClick={() => onClick(effective)}
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
  renderFullBuild,
}: PricingTiersProps) {
  // DEBUG — remove after diagnosis

  const scrollRef = useRef<HTMLDivElement>(null);
  const addonScrollRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: typeof scrollRef, dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  // The customer's one normal Tier vs. zero-or-more add-on Tiers, both drawn
  // from the same Tier System — compatibility is implicit within it, so no
  // separate rule set gates which add-ons are offered alongside which normal
  // Tier.
  const normalTiers = tiers.filter((tier) => pricing.tiers[tier.id] && !pricing.tiers[tier.id]?.is_addon);
  const addonTiers = tiers.filter((tier) => pricing.tiers[tier.id]?.is_addon);

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
              onClick={(effective) => onSelect(tier.id, effective)}
              renderFullBuild={renderFullBuild}
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
                  onClick={(effective) => onToggleAddon(tier.id, effective)}
                  renderFullBuild={renderFullBuild}
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
