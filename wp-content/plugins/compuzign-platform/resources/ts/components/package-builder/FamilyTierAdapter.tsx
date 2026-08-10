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

export function FamilyTierAdapter({
  family,
  tiers,
  selectedTierId,
  selectedAddonTierIds,
  onAdd,
  onRemovePrimary,
  onRemoveAddon,
}: FamilyTierAdapterProps) {
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
    <PricingTiers
      tiers={tiers}
      pricing={family.pricing}
      popularTier={family.popular_tier}
      popularLabel={family.popular_label}
      selectedTierId={selectedTierId}
      selectedAddonTierIds={selectedAddonTierIds}
      billingCycle=""
      onSelect={select}
      onToggleAddon={toggleAddon}
    />
  );
}
