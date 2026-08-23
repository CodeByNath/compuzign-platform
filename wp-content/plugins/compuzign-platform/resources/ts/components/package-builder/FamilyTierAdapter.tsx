import { useEffect, useRef, useState } from 'preact/hooks';
import { PricingTiers, TierCard } from '@/components/cost-builder/PricingTiers';
import type { EffectiveTierDisplay, PeriodPriceOverride, PeriodPriceComponent } from '@/components/cost-builder/PricingTiers';
import type { FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { CommercialLegPeriod, PackageBuilderFamily, ServiceInclusion, Tier, TierId } from '@/api/types/cost-builder';

// The active focused variant's own resolved Commercial Period list — the
// occupant's own commercial_legs for Default, or the matching Edition's own,
// never a frontend reconstruction. See PackageManagerSchema::
// resolveCommercialLegTimeline(); Period itself carries no Platform ID, only
// the component(s) inside it do.
function periodsForVariant(
  family: PackageBuilderFamily,
  tierId: TierId,
  editionId: string | null,
): CommercialLegPeriod[] {
  const tierData = family.pricing.tiers[tierId];
  if (!tierData) return [];
  if (editionId === null) return tierData.commercial_legs ?? [];
  const edition = (tierData.edition_options ?? []).find((option) => option.id === editionId);
  return edition?.commercial_legs ?? [];
}

// "Month 1–12" / "Month 13–Indefinite" — built entirely from the Period's
// own resolved from_month/to_month, the same "Indefinite" convention the
// Commercial Legs Debug tool already uses for a null to_month. Not a
// marketing label: there is no other existing customer-facing terminology
// for a resolved Period to reuse instead.
function periodLabel(period: CommercialLegPeriod): string {
  const to = period.to_month === null ? 'Indefinite' : String(period.to_month);
  return `Month ${period.from_month}–${to}`;
}

// The focused card's display for a selected Period: EVERY active commercial
// component of it, straight from the resolved projection — the exact same
// Period → components → { billing_cycle, price, items } structure
// Commercial Legs Debug renders, with no frontend interpretation beyond
// mapping field names for display. Never picks one component, never merges
// or sums them, never drops a component whose items happen to repeat an
// item_id already seen under a sibling component — two components carrying
// the same underlying item are two independent commercial identities, not a
// duplicate to collapse.
function periodPriceOverride(period: CommercialLegPeriod | null): PeriodPriceOverride | null {
  if (!period) return null;
  return {
    components: period.components.map((component): PeriodPriceComponent => ({
      identityKey: component.source,
      billingCycle: component.billing_cycle,
      price: component.price,
      inclusionItems: component.items.map((item): ServiceInclusion => ({
        id: item.item_id,
        label: item.label,
        quantity: item.quantity,
      })),
    })),
  };
}

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
  // Which Default/Edition variant is active inside the focused shell. Hoisted
  // here (rather than left card-local) because the top variant tab row and
  // the focused card's own Edition switch must stay in sync as one value —
  // see the `selectedEditionId`/`onEditionChange` controlled pair handed to
  // TierCard below. `null` means Default. Entry point (Choose Plan vs. an
  // Edition chip) seeds this; it is not itself a new selection concept.
  const [focusedEditionId, setFocusedEditionId] = useState<string | null>(null);
  // Which Commercial Period is selected for the CURRENTLY active variant,
  // keyed by that Period's own from_month (a Period carries no Platform ID
  // of its own — from_month is genuine resolved data, not a rendered array
  // index). Reset to the new variant's own first resolved Period every time
  // the active variant changes, so a Period never leaks from one Edition's
  // timeline into another's or into Default's — each variant's timeline is
  // independently resolved and never genuinely the same object as another's.
  const [selectedPeriodFromMonth, setSelectedPeriodFromMonth] = useState<number | null>(null);
  const focusedTier = focusedTierId ? visibleTiers.find((tier) => tier.id === focusedTierId) ?? null : null;

  // Selects a Default/Edition variant and seeds its own first resolved
  // Period — the one path every variant change goes through, whether that's
  // the entry point into the focused shell (the normal card's Choose Plan
  // button, editionId null, or one of its Edition chips), the top variant
  // tab row, or the focused card's own Edition switch. Both land on the same
  // shell, just on a different starting tab.
  const selectVariant = (tierId: TierId, editionId: string | null) => {
    setFocusedTierId(tierId);
    setFocusedEditionId(editionId);
    const periods = periodsForVariant(family, tierId, editionId);
    setSelectedPeriodFromMonth(periods[0]?.from_month ?? null);
  };

  // Keeps the active top variant tab visible when the tab row overflows —
  // fires on entry (Choose Plan/Edition chip) and on every in-shell tab
  // switch, since both change focusedTierId/focusedEditionId.
  const activeVariantTabRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeVariantTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [focusedTierId, focusedEditionId]);

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
    planDurationMonths: number | null = null,
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
      planDurationMonths,
    };
  };

  /**
   * The one Add to Quote action, reached from either entry point: a Tier
   * card's own button, or the focused Choose Plan view. `planDurationMonths`
   * is a reserved, currently-unpopulated field on the quote item (see
   * itemFor) — a resolved Commercial Period is a from/to range, not a single
   * "plan duration in months" value, so wiring it through here would
   * misrepresent the field rather than genuinely use it; every caller below
   * passes null, exactly as every caller already did before Commercial
   * Periods existed. It always performs today's quote action, then isolates
   * the Tier and reveals Add-ons when the Tier System offers any — with none
   * there is nothing to choose, so it stays exactly as it was.
   */
  const commitSelection = (
    tierId: TierId,
    effective: EffectiveTierDisplay,
    planDurationMonths: number | null,
  ) => {
    onAdd(itemFor(tierId, effective, false, planDurationMonths));
    setFocusedTierId(null);
    setFocusedEditionId(null);
    setSelectedPeriodFromMonth(null);
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
    const focusedEditionOptions = focusedData?.edition_options ?? [];
    // The active variant's own resolved Commercial Period list, and the one
    // currently selected within it — falls back to the first resolved
    // Period whenever selectedPeriodFromMonth doesn't (yet, or no longer)
    // match one, which is exactly the state right after selectVariant seeds
    // it and covers the first render with no separate effect needed.
    const activePeriods = periodsForVariant(family, focusedTier.id, focusedEditionId);
    const selectedPeriod = activePeriods.find((period) => period.from_month === selectedPeriodFromMonth)
      ?? activePeriods[0]
      ?? null;
    const cardPeriodOverride = periodPriceOverride(selectedPeriod);
    return (
      <div class="cz-package-builder__focused">
        {/* Default/Edition navigation only — which commercial variant of
            this SAME Tier occupant is being viewed. Not Commercial Period,
            Leg, duration, or billing-cycle navigation; those are wired in a
            later phase. Spans both columns, above the detail/card split. */}
        <div class="cz-package-builder__focused-variants" role="tablist" aria-label={`${focusedData?.label || focusedTier.title} variant`}>
          <button
            ref={focusedEditionId === null ? activeVariantTabRef : undefined}
            type="button"
            role="tab"
            class={`cz-package-builder__focused-variant${focusedEditionId === null ? ' is-active' : ''}`}
            aria-selected={focusedEditionId === null}
            onClick={() => selectVariant(focusedTier.id, null)}
          >
            Default
          </button>
          {focusedEditionOptions.map((edition) => (
            <button
              key={edition.id}
              ref={focusedEditionId === edition.id ? activeVariantTabRef : undefined}
              type="button"
              role="tab"
              class={`cz-package-builder__focused-variant${focusedEditionId === edition.id ? ' is-active' : ''}`}
              aria-selected={focusedEditionId === edition.id}
              onClick={() => selectVariant(focusedTier.id, edition.id)}
            >
              {edition.label}
            </button>
          ))}
        </div>
        <div class="cz-package-builder__focused-detail">
          {/* Return path out of the focused view. It only clears this local
              focused-Tier state, restoring the card comparison — no
              navigation, routing, or persisted builder state. */}
          <button
            type="button"
            class="cz-package-builder__focused-back"
            onClick={() => { setFocusedTierId(null); setFocusedEditionId(null); setSelectedPeriodFromMonth(null); }}
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
              value={selectedPeriod ? String(selectedPeriod.from_month) : ''}
              disabled={activePeriods.length === 0}
              onChange={(event) => {
                const next = Number((event.target as HTMLSelectElement).value);
                setSelectedPeriodFromMonth(Number.isFinite(next) ? next : null);
              }}
            >
              {activePeriods.length === 0 ? (
                <option value="">Standard pricing</option>
              ) : activePeriods.map((period) => (
                <option key={period.from_month} value={String(period.from_month)}>{periodLabel(period)}</option>
              ))}
            </select>
          </label>
          {selectedPeriod && (
            <p class="cz-package-builder__focused-plan-line">{periodLabel(selectedPeriod)}</p>
          )}
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
              // Controlled by the top variant tab row above, so the card's
              // own Edition switch and the tab row always agree on which
              // variant is active — one shared value, not two. Routed
              // through selectVariant (not setFocusedEditionId directly) so
              // the card's own chip also resets the Period selection to the
              // newly active variant's own timeline, same as the tab row.
              selectedEditionId={focusedEditionId}
              onEditionChange={(editionId) => selectVariant(focusedTier.id, editionId)}
              // Every active component of the selected Commercial Period,
              // displayed exactly as Commercial Legs Debug shows them — see
              // periodPriceOverride(). What Add to Quote actually captures
              // (`effective`, below) is a separate concern TierCard resolves
              // on its own: only an unambiguous single-component Period
              // feeds it, since one quote line can't represent 2+
              // independent components without merging them (out of scope).
              // Commitment is untouched either way — it belongs to the
              // Tier/Edition parent, resolved the same as always.
              periodOverride={cardPeriodOverride}
              // Same single selection action as a card's own button. Add to
              // Quote leaves the focused presentation and lands in the
              // selected-Tier view; removing an already-selected Tier is not
              // that action, so it stays here.
              onClick={(effective) => {
                if (selectedTierId === focusedTier.id) {
                  onRemovePrimary();
                  setStagedTierId(null);
                  return;
                }
                commitSelection(focusedTier.id, effective, null);
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
        onChoosePlan={selectVariant}
        isEnterpriseView={customerGroup === 'enterprise'}
      />
    </>
  );
}
