import { useState } from 'preact/hooks';
import { PricingTiers } from '@/components/cost-builder/PricingTiers';
import type { EffectiveTierDisplay } from '@/components/cost-builder/PricingTiers';
import type { FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { PackageBuilderFamily, Tier, TierId } from '@/api/types/cost-builder';

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
      />
    </>
  );
}
