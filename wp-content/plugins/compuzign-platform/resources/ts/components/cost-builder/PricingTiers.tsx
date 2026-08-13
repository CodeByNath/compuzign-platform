import { useRef, useState } from 'preact/hooks';
import { Badge } from '@/components/ui/Badge';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import type { PricingEditionOption, PricingTierData, ServiceInclusion, Tier, TierId } from '@/api/types/cost-builder';
import type { QuoteItemTierId } from './types';

export interface EffectiveTierDisplay {
  price: number | null;
  billingCycle: string;
  inclusionLabels: string[];
  // Structured form of inclusionLabels (same resolved list), additive for the
  // card's own row rendering (e.g. per-inclusion quantity) — inclusionLabels
  // stays the flat string[] the quote cart already carries.
  inclusionItems: ServiceInclusion[];
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
  const inclusionItems = inclusions?.length
    ? inclusions
    : (data?.features ?? []).map((label): ServiceInclusion => ({ id: label, label }));
  const minimumTermValue = selectedEdition ? selectedEdition.minimum_term_value : (data?.minimum_term_value ?? null);
  const minimumTermUnit  = selectedEdition ? selectedEdition.minimum_term_unit  : (data?.minimum_term_unit  ?? null);

  return { price, billingCycle: effectiveCycle, inclusionLabels, inclusionItems, selectedEdition, minimumTermValue, minimumTermUnit };
}

// Inline check glyph for Tier Inclusions rows — follows this codebase's
// existing inline-SVG icon convention (viewBox 0 0 24 24, stroke-based,
// currentColor, aria-hidden) rather than the CSS '✓' pseudo-element it
// replaces, so the mark scales and themes exactly like other stroke icons.
function TierInclusionCheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class="cz-cost-builder__tier-feature-icon"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
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
  data: PricingTierData | undefined;
  isPopular: boolean;
  popularLabel?: string | null;
  isActive: boolean;
  billingCycle: string;
  addedLabel: string;
  onClick: (effective: EffectiveTierDisplay) => void;
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
  const { price: effectivePrice, billingCycle: effectiveBillingCycle, inclusionItems, selectedEdition } = effective;

  const suffix = formatCycleLabel(effectiveBillingCycle);

  const label = data?.label || tier.title;

  // Fixed card-section structure (1–8 below): every section renders on every
  // card, even carrying no content, so equivalent sections land on the same
  // subgrid row (see .cz-cost-builder__tier in cost-builder.css) and no card
  // collapses upward past a taller neighbor.
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
      {/* 1. Product Badge — Best/Popular. Reserved on every card so a
          non-popular neighbor's rows below still line up with the popular
          card's badge row instead of shifting up. */}
      <div class="cz-cost-builder__tier-badge">
        {isPopular && <Badge variant="accent">{popularLabel || 'Best'}</Badge>}
      </div>

      {/* 2. Tier Labels — sale badges or future Tier labels. No data source
          exists yet; the row is reserved so a future label doesn't shift
          every other card's rows down. */}
      <div class="cz-cost-builder__tier-labels" />

      {/* 3. Tier Overview — Tier name/title plus "Ideal For" content. */}
      <div class="cz-cost-builder__tier-overview">
        <div class="cz-cost-builder__tier-name">
          <span>{label}</span>
        </div>
        {data?.ideal_for && (
          <p class="cz-cost-builder__tier-ideal-for">{data.ideal_for}</p>
        )}
      </div>

      {/* 4. Price — Edition switch (if any), old price (reserved for a
          future discount/compare-at value), then the current price or its
          "Contact Us" replacement. */}
      <div class="cz-cost-builder__tier-price-block">
        {editionOptions.length >= 1 && (
          <div class="cz-cost-builder__tier-editions" role="group" aria-label={`${label} payment options`}>
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
        {/* Old price row: no discount/compare-at data source yet — reserved
            so a future sale price doesn't shift the current-price row. */}
        <div class="cz-cost-builder__tier-price-old" />
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
      </div>

      {/* 5. Action — Add to Quote / selected-state action, kept aligned
          across cards regardless of how tall the sections above it are. */}
      <div class="cz-cost-builder__tier-action-row">
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

      {/* 6. Notes — Tier notes. No content today; the row is created and
          retained now so a future note doesn't require another pass to
          re-align every card's rows. */}
      <div class="cz-cost-builder__tier-notes" />

      {/* 7. Tier Inclusions — check icon + inclusion + quantity. */}
      <div class="cz-cost-builder__tier-inclusions">
        {inclusionItems.length > 0 && (
          <ul class="cz-cost-builder__tier-features">
            {inclusionItems.map((item, i) => (
              <li key={item.id || i}>
                <TierInclusionCheckIcon />
                <span class="cz-cost-builder__tier-feature-label">{item.label}</span>
                {item.quantity != null && (
                  <span class="cz-cost-builder__tier-feature-qty">× {item.quantity}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 8. Tier Card Footer — kept now as a placeholder; special Tier
          notes can be surfaced here later without another restructure. */}
      <div class="cz-cost-builder__tier-footer">
        <span class="cz-cost-builder__tier-footer-note">Special notes for this Tier may appear here.</span>
      </div>
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
