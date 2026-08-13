import { useState } from 'preact/hooks';
import { PricingTiers, TierCard } from '@/components/cost-builder/PricingTiers';
import type { EffectiveTierDisplay } from '@/components/cost-builder/PricingTiers';
import type { FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { PackageBuilderFamily, Tier, TierId } from '@/api/types/cost-builder';

// Focused-plan durations. Presentation only: the selection prints the plan
// line below the dropdown and nothing else. It deliberately does not touch
// price, billing cycle, Editions, or the quote — those stay owned by the
// Tier's own declaration exactly as before.
const PLAN_DURATIONS = [1, 12, 24] as const;
type PlanDuration = (typeof PLAN_DURATIONS)[number];

const durationLabel = (months: PlanDuration): string =>
  `${months} ${months === 1 ? 'month' : 'months'}`;

const planLine = (months: PlanDuration): string => `${durationLabel(months)} plan`;

interface FamilyTierAdapterProps {
  family: PackageBuilderFamily;
  tiers: Tier[];
  selectedTierId: TierId | null;
  selectedAddonTierIds: TierId[];
  onAdd: (item: FamilyTierQuoteItem) => void;
  onRemovePrimary: () => void;
  onRemoveAddon: (tierPlatformId: string) => void;
}

const CUSTOMER_GROUPS = [
  { value: 'personal_business', label: 'Personal & Business' },
  { value: 'enterprise', label: 'Enterprise' },
] as const;

export function filterTiersByCustomerGroup(
  tiers: Tier[],
  pricing: PackageBuilderFamily['pricing'],
  customerGroup: 'personal_business' | 'enterprise',
): Tier[] {
  return tiers.filter(
    (tier) => (pricing.tiers[tier.id]?.audience_group ?? 'personal_business') === customerGroup,
  );
}

export function FamilyTierAdapter({
  family,
  tiers,
  selectedTierId,
  selectedAddonTierIds,
  onAdd,
  onRemovePrimary,
  onRemoveAddon,
}: FamilyTierAdapterProps) {
  const [customerGroup, setCustomerGroup] = useState<'personal_business' | 'enterprise'>('personal_business');
  const visibleTiers = filterTiersByCustomerGroup(tiers, family.pricing, customerGroup);

  // Focused-plan state. Choosing a plan hides the other Tier cards and
  // presents the one Tier beside its plan details; it changes nothing about
  // which Tier is selected in the quote.
  const [focusedTierId, setFocusedTierId] = useState<TierId | null>(null);
  const [planDuration, setPlanDuration] = useState<PlanDuration>(1);
  const focusedTier = focusedTierId ? visibleTiers.find((tier) => tier.id === focusedTierId) ?? null : null;

  const itemFor = (tierId: TierId, effective: EffectiveTierDisplay, isAddon: boolean): FamilyTierQuoteItem => {
    const tier = tiers.find((candidate) => candidate.id === tierId);
    const tierData = family.pricing.tiers[tierId];
    return {
      offer_type: 'family_tier',
      familyId: family.family_id,
      familyPlatformId: family.family_platform_id,
      familyTitle: family.title,
      tierInstanceId: family.tier_instance_id,
      tierInstancePlatformId: family.tier_instance_platform_id,
      tierOccupantId: tierData?.tier_occupant_id ?? '',
      tierPlatformId: tierData?.tier_platform_id ?? '',
      tierEditionPlatformId: effective.selectedEdition?.edition_platform_id ?? null,
      tierId,
      tierTitle: tierData?.label || tier?.title || tierId,
      price: effective.price,
      billingCycle: effective.billingCycle,
      features: effective.inclusionLabels,
      isAddon,
      minimumTermValue: effective.minimumTermValue,
      minimumTermUnit: effective.minimumTermUnit,
    };
  };

  const select = (tierId: TierId, effective: EffectiveTierDisplay) => {
    if (selectedTierId === tierId) {
      onRemovePrimary();
      return;
    }
    onAdd(itemFor(tierId, effective, false));
  };

  const toggleAddon = (tierId: TierId, effective: EffectiveTierDisplay) => {
    const tierPlatformId = family.pricing.tiers[tierId]?.tier_platform_id ?? '';
    if (selectedAddonTierIds.includes(tierId)) {
      onRemoveAddon(tierPlatformId);
      return;
    }
    onAdd(itemFor(tierId, effective, true));
  };

  // Focused Tier: the other cards are hidden and the chosen Tier is presented
  // beside its plan details. The card itself is the SAME TierCard the strip
  // renders — only its Overview section moves to the left column here, and
  // Choose Plan is withheld because this is already that Tier's focused view.
  if (focusedTier) {
    const focusedData = family.pricing.tiers[focusedTier.id];
    return (
      <div class="cz-package-builder__focused">
        <div class="cz-package-builder__focused-detail">
          {/* Return path out of the focused view. It only clears this local
              focused-Tier state, restoring the card comparison — no
              navigation, routing, or persisted builder state. The chosen
              duration simply stays in state, since nothing unmounts. */}
          <button
            type="button"
            class="cz-package-builder__focused-back"
            onClick={() => setFocusedTierId(null)}
          >
            ← All plans
          </button>
          <h3 class="cz-package-builder__focused-name">
            {focusedData?.label || focusedTier.title}
          </h3>
          {focusedData?.ideal_for && (
            <p class="cz-package-builder__focused-ideal-for">{focusedData.ideal_for}</p>
          )}
          <label class="cz-package-builder__focused-field">
            <span class="cz-package-builder__focused-field-label">Plan duration</span>
            <select
              class="cz-package-builder__plan-select"
              value={String(planDuration)}
              onChange={(event) => {
                const next = Number((event.target as HTMLSelectElement).value) as PlanDuration;
                setPlanDuration(next);
              }}
            >
              {PLAN_DURATIONS.map((months) => (
                <option key={months} value={String(months)}>{durationLabel(months)}</option>
              ))}
            </select>
          </label>
          <p class="cz-package-builder__focused-plan-line">{planLine(planDuration)}</p>
          {/* Reserved: the rest of the left column is intentionally empty for
              now. Future focused-plan content (term comparison, commitment
              detail, plan-specific messaging) belongs here, beneath the
              duration control, without disturbing the card on the right. */}
          <div class="cz-package-builder__focused-reserved" />
        </div>
        <div class="cz-package-builder__focused-card">
          {/* The strip's own grid context, so the one focused card keeps the
              exact 8-row section structure it has everywhere else. */}
          <div class="cz-cost-builder__tiers">
            <TierCard
              tier={focusedTier}
              data={focusedData}
              isPopular={focusedTier.id === family.popular_tier}
              popularLabel={family.popular_label}
              isActive={focusedTier.id === selectedTierId}
              billingCycle=""
              addedLabel="✓ Selected"
              onClick={(effective) => select(focusedTier.id, effective)}
              hideOverview
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div class="cz-package-builder__customer-tabs" role="tablist" aria-label="Customer group">
        {CUSTOMER_GROUPS.map((group) => (
          <button
            key={group.value}
            type="button"
            role="tab"
            class="cz-package-builder__customer-tab"
            aria-selected={customerGroup === group.value}
            onClick={() => setCustomerGroup(group.value)}
          >
            {group.label}
          </button>
        ))}
      </div>
      <PricingTiers
        tiers={visibleTiers}
        pricing={family.pricing}
        popularTier={family.popular_tier}
        popularLabel={family.popular_label}
        selectedTierId={selectedTierId}
        selectedAddonTierIds={selectedAddonTierIds}
        billingCycle=""
        onSelect={select}
        onToggleAddon={toggleAddon}
        onChoosePlan={setFocusedTierId}
      />
    </>
  );
}
