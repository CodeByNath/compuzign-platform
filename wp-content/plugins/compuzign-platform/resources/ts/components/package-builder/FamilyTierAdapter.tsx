import { useEffect, useState } from 'preact/hooks';
import { PricingTiers, TierCard, resolveEffectiveTierDisplay } from '@/components/cost-builder/PricingTiers';
import type { EffectiveTierDisplay } from '@/components/cost-builder/PricingTiers';
import { capitalize, formatCycleLabel, formatPrice } from '@/utils/format';
import type { FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { PackageBuilderFamily, PricingCommercialLeg, Tier, TierId } from '@/api/types/cost-builder';

// Same small fixed vocabulary PackageSchema::BILLING_CYCLES owns server-side
// — mirrored locally rather than imported, since this component stays out
// of the admin-only package-station tree (see TierBundleIcon in
// PricingTiers.tsx for the same precedent).
const LEG_CYCLE_LABELS: Record<string, string> = { monthly: 'Monthly', annually: 'Annually', 'one-time': 'One-time' };

const legLabel = (leg: PricingCommercialLeg): string => {
  const cycle = LEG_CYCLE_LABELS[leg.billing_cycle] ?? capitalize(leg.billing_cycle);
  return leg.start_month === leg.end_month
    ? `${cycle} · Month ${leg.start_month}`
    : `${cycle} · Months ${leg.start_month}–${leg.end_month}`;
};

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

// Applies equally to every Tier occupant, normal or add-on — audience_groups
// is a general occupant field, not an add-on-specific one. An occupant
// belongs to its Tier Group; audience_groups only says which customer tabs
// it additionally appears under, defaulting to every tab when unset (see
// PackageSchema::DEFAULT_TIER_AUDIENCE_GROUPS), so a never-configured
// add-on shows up regardless of which tab the customer is browsing.
export function filterTiersByCustomerGroup(
  tiers: Tier[],
  pricing: PackageBuilderFamily['pricing'],
  customerGroup: 'personal_business' | 'enterprise',
): Tier[] {
  return tiers.filter((tier) => {
    const groups = pricing.tiers[tier.id]?.audience_groups ?? ['personal_business', 'enterprise'];
    return groups.includes(customerGroup);
  });
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
  // Which declaration (Default/Edition) and which of ITS OWN commercial legs
  // the left column currently shows — lifted here (not left inside TierCard)
  // specifically so the left column can read them too and stay in sync with
  // whatever the card's own Edition switch is doing. Reset whenever a
  // different Tier is focused, and the leg resets whenever the declaration
  // changes under it — a leg id from one declaration is never carried into
  // another's, the same independence its own billing cycle/price already has.
  const [focusedEditionId, setFocusedEditionId] = useState<string | null>(null);
  const [focusedLegId, setFocusedLegId] = useState<string | null>(null);
  const focusedTier = focusedTierId ? visibleTiers.find((tier) => tier.id === focusedTierId) ?? null : null;

  useEffect(() => {
    setFocusedEditionId(null);
    setFocusedLegId(null);
  }, [focusedTierId]);

  const changeFocusedEdition = (editionId: string | null) => {
    setFocusedEditionId(editionId);
    setFocusedLegId(null);
  };

  // Add-ons come from this Family's one Tier System, where compatibility is
  // implicit — there is no per-Tier compatibility ledger, so "does this Tier
  // have Add-ons" is answered by the Tier System offering any at all.
  const normalTiers = visibleTiers.filter((tier) => !family.pricing.tiers[tier.id]?.is_addon);
  const addonTiers = visibleTiers.filter((tier) => family.pricing.tiers[tier.id]?.is_addon);

  // The selected-Tier view both Add to Quote entry points land in: the chosen
  // Tier alone, with its Add-ons revealed. Derived against the live selection
  // rather than stored independently, so removing the line anywhere (quote
  // summary included) or switching customer group drops straight back to the
  // card comparison without a second piece of state to keep in sync. Seeded
  // from selectedTierId on mount (not just null) so a page reload — which
  // restores the cart synchronously before first render — lands back in this
  // view instead of the full comparison strip.
  const [stagedTierId, setStagedTierId] = useState<TierId | null>(selectedTierId);
  const stagedTier = stagedTierId !== null && stagedTierId === selectedTierId
    ? normalTiers.find((tier) => tier.id === stagedTierId) ?? null
    : null;

  const itemFor = (
    tierId: TierId,
    effective: EffectiveTierDisplay,
    isAddon: boolean,
    commercialLegId: string | null = null,
  ): FamilyTierQuoteItem => {
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
      commercialLegId,
    };
  };

  /**
   * The one Add to Quote action, reached from either entry point: a Tier
   * card's own button, or the focused Choose Plan view (which supplies the
   * leg its own left column collected). It always performs today's quote
   * action, then isolates the Tier and reveals Add-ons when the Tier System
   * offers any — with none there is nothing to choose, so it stays exactly
   * as it was.
   */
  const commitSelection = (
    tierId: TierId,
    effective: EffectiveTierDisplay,
    commercialLegId: string | null,
  ) => {
    onAdd(itemFor(tierId, effective, false, commercialLegId));
    setFocusedTierId(null);
    setStagedTierId(addonTiers.length > 0 ? tierId : null);
  };

  const select = (tierId: TierId, effective: EffectiveTierDisplay) => {
    if (selectedTierId === tierId) {
      onRemovePrimary();
      setStagedTierId(null);
      return;
    }
    commitSelection(tierId, effective, null);
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
    // Resolved once here so the left column's own leg dropdown and the right
    // column's card (via the controlled props below) always agree on which
    // declaration and which leg are showing — the same resolver both the
    // card and every other Tier card in this file already call.
    const focusedEffective = resolveEffectiveTierDisplay(focusedData, '', focusedEditionId, focusedLegId);
    return (
      <div class="cz-package-builder__focused">
        <div class="cz-package-builder__focused-detail">
          {/* Return path out of the focused view. It only clears this local
              focused-Tier state, restoring the card comparison — no
              navigation, routing, or persisted builder state. */}
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
          {/* Only when the currently-showing declaration (Default, or
              whichever Edition the card's own switch selected) actually has
              its own commercial legs — absent for every Simple Mode Tier,
              which is most of them, exactly like the card's own Edition
              switch already only appears when edition_options exist. */}
          {focusedEffective.commercialLegs.length > 0 && (
            <label class="cz-package-builder__focused-field">
              <span class="cz-package-builder__focused-field-label">Billing cycle</span>
              <select
                class="cz-package-builder__plan-select"
                value={focusedLegId ?? ''}
                onChange={(event) => {
                  const next = (event.target as HTMLSelectElement).value;
                  setFocusedLegId(next === '' ? null : next);
                }}
              >
                <option value="">Full schedule</option>
                {focusedEffective.commercialLegs.map((leg) => (
                  <option key={leg.id} value={leg.id}>{legLabel(leg)}</option>
                ))}
              </select>
            </label>
          )}
          {focusedEffective.selectedLeg && (
            <p class="cz-package-builder__focused-plan-line">
              {formatPrice(focusedEffective.selectedLeg.price)}
              {formatCycleLabel(focusedEffective.selectedLeg.billing_cycle) && ` ${formatCycleLabel(focusedEffective.selectedLeg.billing_cycle)}`}
            </p>
          )}
          {/* Reserved: the rest of the left column is intentionally empty for
              now. Future focused-plan content (term comparison, commitment
              detail, plan-specific messaging) belongs here, beneath the
              controls above, without disturbing the card on the right. */}
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
              // Lifted (controlled) here — not the card's own internal state
              // — so the left column's leg dropdown above can read which
              // declaration the card's own Edition switch is currently
              // showing, and scope its own options to that SAME declaration.
              selectedEditionId={focusedEditionId}
              onEditionChange={changeFocusedEdition}
              selectedLegId={focusedLegId}
              // Same single selection action as a card's own button — it just
              // hands over the leg this view's own dropdown collected. Add to
              // Quote leaves the focused presentation and lands in the
              // selected-Tier view; removing an already-selected Tier is not
              // that action, so it stays here.
              onClick={(effective) => {
                if (selectedTierId === focusedTier.id) {
                  onRemovePrimary();
                  setStagedTierId(null);
                  return;
                }
                commitSelection(focusedTier.id, effective, focusedLegId);
              }}
              hideOverview
            />
          </div>
        </div>
      </div>
    );
  }

  // Selected-Tier view: the chosen Tier alone, with Recommendations beside
  // it. Reached only when recommendation content exists — today that means
  // the Tier System offers Add-ons — so this view always has something to
  // choose. It is the same PricingTiers as the comparison: narrowing the Tier
  // list is what hides the other cards and reveals Recommendations, so there
  // is no second Add-on, recommendation, or quote flow here.
  if (stagedTier) {
    return (
      <>
        <div class="cz-package-builder__staged-header">
          <button
            type="button"
            class="cz-package-builder__focused-back"
            onClick={() => setStagedTierId(null)}
          >
            ← All plans
          </button>
        </div>
        <PricingTiers
          tiers={[stagedTier, ...addonTiers]}
          pricing={family.pricing}
          popularTier={family.popular_tier}
          popularLabel={family.popular_label}
          selectedTierId={selectedTierId}
          selectedAddonTierIds={selectedAddonTierIds}
          billingCycle=""
          onSelect={select}
          onToggleAddon={toggleAddon}
          recommendationsAside
        />
      </>
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
      {/* Add-ons stay out of the comparison view — they are offered once a
          Tier is selected, in the selected-Tier view above. */}
      <PricingTiers
        tiers={normalTiers}
        pricing={family.pricing}
        popularTier={family.popular_tier}
        popularLabel={family.popular_label}
        selectedTierId={selectedTierId}
        selectedAddonTierIds={selectedAddonTierIds}
        billingCycle=""
        onSelect={select}
        onToggleAddon={toggleAddon}
        onChoosePlan={setFocusedTierId}
        isEnterpriseView={customerGroup === 'enterprise'}
      />
    </>
  );
}
