import { useEffect, useState } from 'preact/hooks';
import { PricingTiers, TierCard, TierInclusionCheckIcon, resolveEffectiveTierDisplay, resolveUpfrontPayment, cycleSuffix, billingWording } from '@/components/cost-builder/PricingTiers';
import type { EffectiveTierDisplay, PeriodPriceOverride } from '@/components/cost-builder/PricingTiers';
import { formatPrice } from '@/utils/format';
import type { FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { CommercialLegComponent, CommercialLegPeriod, CommercialLegPricedItem, PackageBuilderFamily, ServiceInclusion, Tier, TierId } from '@/api/types/cost-builder';

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

// The focused card's price/cycle/inclusions for a selected Period — ONLY
// when that Period resolves to exactly one active commercial component, the
// one case with no ambiguity about which component to show. A Period with
// two or more simultaneously active components (the occupant's/Edition's own
// Default Leg plus a concurrently active Additional Leg) has no
// backend-exposed field telling the frontend which one is "the" component to
// show on this one card slot — picking the first would be exactly the
// forbidden array-position identification, and combining them would be a new
// frontend pricing calculation. Both are out of scope for this phase; such a
// Period is left on the Tier's/Edition's own flat declaration instead. See
// the Phase 2 report for the exact missing field this would need.
function periodPriceOverride(period: CommercialLegPeriod | null): PeriodPriceOverride | null {
  if (!period) return null;
  const components = availablePeriodComponents(period);
  if (components.length !== 1) return null;
  const component = components[0];
  return {
    price: component.price,
    billingCycle: component.billing_cycle,
    inclusionItems: component.items.map((item): ServiceInclusion => ({
      id: item.item_id,
      label: item.label,
      quantity: item.quantity,
    })),
  };
}

// One Period's own AVAILABLE commercial components, in the resolver's own
// order — the single place "available" is defined. Both the flattened
// cross-Period reader below (Commercial Terms) and the per-Period Periods
// timeline read through this same predicate, so a Period's rendered
// component count, its "N payments active" note, and whether it renders at
// all always agree with each other. Never counts an unavailable component;
// never re-sorts or re-groups what the resolver already returned.
function availablePeriodComponents(period: CommercialLegPeriod): CommercialLegComponent[] {
  return period.components.filter((component) => component.available);
}

// Every AVAILABLE commercial component across a variant's resolved Periods,
// in the Periods'/components' own resolved order — the flattened form of
// availablePeriodComponents() above, read by the Commercial Terms facts.
function availableComponents(periods: CommercialLegPeriod[]): CommercialLegComponent[] {
  return periods.flatMap(availablePeriodComponents);
}

// One resolved commercial identity's (Default or one Additional Leg) own
// billing cadence + claimed inclusions, collapsed to a SINGLE entry no
// matter how many resolved Periods that same `source` appears active in —
// Phase 2 of the focused Tier/Edition inclusion blueprint (see the Phase 1
// audit report). Grouping key is component.source alone, never billing_cycle
// (two different Legs sharing a cadence stay two groups) and never Default-
// vs-Additional classification (deliberately out of scope this phase).
export interface CommercialLegInclusionGroup {
  source: string;
  billingCycle: string | null;
  items: CommercialLegPricedItem[];
}

// First-seen-wins per source is safe, not an unproven shortcut: a Leg's own
// billing_cycle and claimed items[] are built ONCE from the container's
// static declaration (PackageManagerSchema::commercialLegTimelineChildren()
// / bucketRateSheetItemsByCommercialLegChild()) — every Period only decides
// WHETHER that Leg is active, never re-derives what it claims. So every
// repeated appearance of the same source is structurally guaranteed
// identical; there is nothing to reconcile between them.
export function commercialLegInclusionGroups(periods: CommercialLegPeriod[]): CommercialLegInclusionGroup[] {
  const groups: CommercialLegInclusionGroup[] = [];
  const seen = new Set<string>();
  for (const component of availableComponents(periods)) {
    if (seen.has(component.source)) continue;
    seen.add(component.source);
    groups.push({ source: component.source, billingCycle: component.billing_cycle, items: component.items });
  }
  return groups;
}

// Focused-card "Extensions" — Phase 4B. Same shape as CommercialLegInclusionGroup
// (a distinct name only so a future renderer reads as Extension-specific,
// never a second interface to keep in sync). Deliberately NOT a
// classification of any Leg as Default/Main/Extra: every commercialLegInclusionGroups()
// group is reduced to only the items it shares with the focused card's own
// already-rendered "What's included" list — identity match is by
// item_id ONLY (never label, billing_cycle, or array position), and a
// group left with zero matching items is omitted entirely, never rendered
// empty.
export type CommercialLegExtensionGroup = CommercialLegInclusionGroup;

// A Leg only overlaps another when some resolved Period actually runs it
// alongside a second AVAILABLE component at the same time — never inferred
// from the flattened/deduplicated group list above, which has already lost
// which Legs were ever simultaneously active in the same Period. A Leg
// active alone across every Period (or active in sequence with another,
// never concurrently) never lands in this set.
function overlappingLegSources(periods: CommercialLegPeriod[]): Set<string> {
  const sources = new Set<string>();
  for (const period of periods) {
    const components = availablePeriodComponents(period);
    if (components.length < 2) continue;
    for (const component of components) sources.add(component.source);
  }
  return sources;
}

export function commercialLegExtensionGroups(
  periods: CommercialLegPeriod[],
  focusedInclusions: ServiceInclusion[],
): CommercialLegExtensionGroup[] {
  const focusedItemIds = new Set(focusedInclusions.map((inclusion) => inclusion.id));
  const eligibleSources = overlappingLegSources(periods);
  const groups: CommercialLegExtensionGroup[] = [];
  for (const group of commercialLegInclusionGroups(periods)) {
    // Rule 1: no overlap with another available Leg anywhere → never an
    // Extension candidate, regardless of what it claims.
    if (!eligibleSources.has(group.source)) continue;
    const items = group.items.filter((item) => focusedItemIds.has(item.item_id));
    if (items.length === 0) continue;
    // Rule 3 (presentation dedup only, not a Default/Main/Headline role):
    // a group whose matched item_id set is the SAME complete set already
    // rendered by the focused card's own "What's included" list would just
    // repeat it verbatim underneath — suppress that one group, never the
    // list itself.
    const matchedIds = new Set(items.map((item) => item.item_id));
    if (matchedIds.size === focusedItemIds.size) continue;
    groups.push({ source: group.source, billingCycle: group.billingCycle, items });
  }
  return groups;
}

// Customer-facing name for one resolved commercial component — the exact
// billing-cycle vocabulary Phase 4 audited (PricingTiers.tsx's own maps,
// utils/format.ts's CYCLE_LABELS): monthly/annual/annually/quarterly/
// one-time/upfront. A neutral fallback ('Payment') covers both a genuinely
// null billing_cycle and any future/unmapped value — never throws, never
// exposes the raw cycle string or any Leg identity.
const COMPONENT_PAYMENT_NAMES: Record<string, string> = {
  monthly: 'Monthly payment',
  annual: 'Annual payment',
  annually: 'Annual payment',
  quarterly: 'Quarterly payment',
  'one-time': 'One-time payment',
  upfront: 'Upfront payment',
};

function componentPaymentName(cycle: string | null): string {
  if (cycle === null) return 'Payment';
  return COMPONENT_PAYMENT_NAMES[cycle] ?? 'Payment';
}

// Short, subordinate explanation of one component's own calculation rhythm
// — the same billing-cycle vocabulary as COMPONENT_PAYMENT_NAMES above,
// `joined` distinguishing whether it's the only active component in its
// Period (`alone`) or shares the Period with another (`joined`, from the
// SAME available-components-only count the stage header's own "N payments
// active" note reads — never period.components.length). Never exposes the
// raw cycle string; unknown/null falls back to one neutral sentence.
//
// `joined` copy is deliberately generic/plural-safe ("other active
// charges", never "the other active payment"): the resolver allows any
// number of simultaneously active, overlapping Legs in one Period, and this
// helper is never told how many or what cycle they are — singular/"the"
// wording would misdescribe a Period with 3+ available components or a
// non-recurring co-active component.
const COMPONENT_NOTES: Record<string, { alone: string; joined: string }> = {
  monthly: {
    alone: 'Repeats each month while this stage is active.',
    joined: 'Repeats monthly alongside other active charges.',
  },
  annual: {
    alone: 'Charged yearly while this stage is active.',
    joined: 'Charged yearly in addition to other active charges.',
  },
  annually: {
    alone: 'Charged yearly while this stage is active.',
    joined: 'Charged yearly in addition to other active charges.',
  },
  quarterly: {
    alone: 'Charged every quarter while this stage is active.',
    joined: 'Charged quarterly in addition to other active charges.',
  },
  'one-time': {
    alone: 'Charged once when this stage begins.',
    joined: 'Charged once when this stage begins, alongside other active charges.',
  },
  upfront: {
    alone: 'Charged once when this stage begins.',
    joined: 'Charged once when this stage begins, alongside other active charges.',
  },
};

function componentNote(billingCycle: string | null, joined: boolean): string {
  const entry = billingCycle !== null ? COMPONENT_NOTES[billingCycle] : undefined;
  if (!entry) return 'Applies while this stage is active.';
  return joined ? entry.joined : entry.alone;
}

// Short standalone billing-cycle labels for the Plan Billing fact — a third,
// deliberately separate map from TIER_CYCLE_SUFFIX_OVERRIDES ('/mo') and
// TIER_BILLING_WORDING ('Billed monthly') in PricingTiers.tsx, which already
// coexist as separate maps for their own different string shapes. Keys are
// exactly the billing_cycle vocabulary already in use across this codebase
// (PricingTiers.tsx's own two maps, utils/format.ts's CYCLE_LABELS) — no
// 'yearly' alias, since nothing in the current data model emits it.
const PLAN_BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
  annually: 'Annual',
  quarterly: 'Quarterly',
  'one-time': 'One-time',
  upfront: 'Upfront',
};

// Descriptive-only summary of which billing cycles are represented among the
// active variant's own available components — e.g. "Monthly + Annual". A
// unique, first-seen-order set of DISPLAY labels (so 'annual' and 'annually'
// collapse to one "Annual" instead of appearing twice); never sums prices,
// merges components, or reads only the headline component.
function planBillingSummary(components: CommercialLegComponent[]): string {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const component of components) {
    if (!component.billing_cycle) continue;
    const label = PLAN_BILLING_CYCLE_LABELS[component.billing_cycle] ?? component.billing_cycle;
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels.join(' + ');
}

// Extension group heading — "Extensions billed {cycle}" (e.g. "Extensions
// billed Annually"). A fourth, deliberately separate cycle-word map: neither
// billingWording() ('Billed annually'/'One-time Payment' — full sentences,
// wrong shape for this heading) nor PLAN_BILLING_CYCLE_LABELS above (collapses
// annual/annually to 'Annual', not the 'Annually' this heading needs) fits
// verbatim. Same never-leak-the-raw-cycle-string rule as every other map in
// this file: an unmapped/null cycle falls back to the bare 'Extensions'
// heading, never the raw backend string.
const EXTENSION_BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'Annually',
  annually: 'Annually',
  quarterly: 'Quarterly',
  'one-time': 'One-time',
  upfront: 'Upfront',
};

function extensionHeading(billingCycle: string | null): string {
  const label = billingCycle !== null ? EXTENSION_BILLING_CYCLE_LABELS[billingCycle] : undefined;
  return label ? `Extensions billed ${label}` : 'Extensions';
}

// One selectable destination on the cue-ball selector below — `id: null` is
// the Tier's own permanent Default declaration, matching the exact
// `selectVariant(tierId, editionId)` vocabulary everywhere else in this
// file (Choose Plan, an Edition chip, this control). Real Edition entries
// carry their own stable id from `edition_options`, never a derived index —
// the destination's position in this array decides only where its pot sits
// on the track, never which Edition it resolves to.
interface CueDestination {
  id: string | null;
  label: string;
}

// Full-width Default/Edition selector for the focused Tier shell — replaces
// the old textual tab row. No text labels render on the track itself (the
// Tier/Edition name above it already says which one is active); this is a
// position-only control over the same `selectVariant` path every other
// entry point already uses.
//
// Positioning: a physically-inset rail (.cz-package-builder__cue-rail, anchored
// `left`/`right` at the shared --cz-cue-inset) is the positioned ancestor for
// the pots/ball, so their `left` values are ordinary percentages (0%–100%)
// resolved against the rail's own already-inset width — never CSS calc()
// arithmetic. The multiplication (index / (destinations.length - 1)) happens
// once in TS, producing a plain percentage string; array index feeds only
// this visual placement, never which Edition a click resolves to (see
// destinations' own id below). No clientWidth/resize listener — the browser
// computes the rail's inset width itself, so this recalculates on resize.
//
// Accessibility follows the same `role="group"` + one active-state
// attribute convention TierCard's own Edition chips already use (see
// `.cz-cost-builder__tier-editions` in PricingTiers.tsx), not tab
// semantics — a full tablist implementation (keyboard roving focus, panel
// association) isn't warranted for a control that only ever changes which
// declaration one already-visible card shows.
function EditionCueSelector({
  destinations,
  activeId,
  onSelect,
}: {
  destinations: CueDestination[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const hasEditions = destinations.length > 1;
  const activeIndex = Math.max(0, destinations.findIndex((destination) => destination.id === activeId));
  // Plain percentage of the rail's own (already-inset) width — true 50% when
  // there's nothing to switch between, exactly matching the rail's own
  // horizontal center regardless of the inset's size.
  const cuePercent = hasEditions ? (activeIndex / (destinations.length - 1)) * 100 : 50;

  return (
    <div
      class="cz-package-builder__cue-track"
      role={hasEditions ? 'group' : undefined}
      aria-label={hasEditions ? 'Plan variant' : undefined}
    >
      <span class="cz-package-builder__cue-line" aria-hidden="true" />
      {/* The rail: left/right-anchored at --cz-cue-inset, so it IS the
          already-inset width — pots/ball inside it use plain 0%–100%
          percentages, never calc() arithmetic. */}
      <div class="cz-package-builder__cue-rail">
        {hasEditions && destinations.map((destination, index) => (
          <span
            key={destination.id ?? 'default'}
            class="cz-package-builder__cue-pot"
            style={{ left: `${(index / (destinations.length - 1)) * 100}%` }}
            aria-hidden="true"
          />
        ))}
        {/* No-Edition Tier: the track and a centered cue ball render as a
            static "you are here" indicator only — no pots, no buttons, no
            fake navigation affordance. */}
        <span
          class="cz-package-builder__cue-ball"
          style={{ left: `${cuePercent}%` }}
          aria-hidden="true"
        />
      </div>
      {hasEditions && destinations.map((destination, index) => {
        const active = destination.id === activeId;
        return (
          <button
            key={destination.id ?? 'default'}
            type="button"
            class="cz-package-builder__cue-target"
            style={{ left: `${(index * 100) / destinations.length}%`, width: `${100 / destinations.length}%` }}
            aria-label={destination.label}
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(destination.id)}
          />
        );
      })}
    </div>
  );
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

  // Sticky close (X) button elevation — stronger shadow once the page has
  // scrolled, subtle otherwise. Listener only attaches while a Tier is
  // actually focused (the button's only rendered then), so it costs nothing
  // in the card-comparison/staged views and is removed on leaving focus or
  // unmount.
  const [isCloseElevated, setIsCloseElevated] = useState(false);
  useEffect(() => {
    if (focusedTierId === null) return;
    const onScroll = () => setIsCloseElevated(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [focusedTierId]);

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
    // Commercial Terms facts — read-only presentation over data already
    // resolved above/elsewhere, never a new pricing calculation:
    // - Upfront: the exact same resolveUpfrontPayment() TierCard's own
    //   headline card uses, over this variant's own resolved Periods (never
    //   summed, never inferred from commitment or the Headline Leg).
    // - Commitment: resolveEffectiveTierDisplay()'s own minimumTermValue/
    //   Unit — the Tier/Edition parent's own commitment, the identical call
    //   TierCard makes internally for this same focused card, never a Leg
    //   from_month/to_month.
    // - Plan billing: only AVAILABLE components (availableComponents()),
    //   first-seen billing-cycle order, never merged/summed/headline-only.
    const focusedDeclaredEffective = resolveEffectiveTierDisplay(focusedData, '', focusedEditionId);
    const upfrontAmount = resolveUpfrontPayment(activePeriods);
    const focusedAvailableComponents = availableComponents(activePeriods);
    const billingSummary = planBillingSummary(focusedAvailableComponents);
    // Phase 5: the same complete "What's included" list already rendered
    // below by TierCard (focusedDeclaredEffective.inclusionItems — untouched,
    // read-only input here), reduced per Leg by commercialLegExtensionGroups()
    // itself. Never a second inclusion source, never a mutation of the list
    // TierCard renders.
    const extensionGroups = commercialLegExtensionGroups(activePeriods, focusedDeclaredEffective.inclusionItems);
    // Rendered INSIDE TierCard itself (via extensionsContent), directly
    // after its own inclusion list and before its footer notes — never a
    // sibling panel below the card's own bordered/padded box (that box is
    // .cz-cost-builder__tier, one level inside .cz-package-builder__focused-card).
    const extensionsContent = extensionGroups.length > 0 ? (
      <div class="cz-package-builder__extensions">
        {extensionGroups.map((group) => (
          <div class="cz-package-builder__extension-group" key={group.source}>
            <span class="cz-package-builder__extension-heading">{extensionHeading(group.billingCycle)}</span>
            <ul class="cz-cost-builder__tier-features">
              {group.items.map((item) => (
                <li key={item.item_id}>
                  <TierInclusionCheckIcon />
                  <span class="cz-cost-builder__tier-feature-label">{item.label}</span>
                  <span class="cz-cost-builder__tier-feature-qty">{item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    ) : null;
    return (
      <div class="cz-package-builder__focused">
        <div class="cz-package-builder__focused-detail">
          {/* Return path out of the focused view. Same clear action as
              before ("← All plans") — only this local focused-Tier state,
              restoring the card comparison; no navigation, routing, browser
              history, or persisted builder state. Circular X rather than a
              text link because this isn't back-navigation: it's the one
              action that exits the focused view. */}
          <button
            type="button"
            class={`cz-package-builder__focused-close${isCloseElevated ? ' is-elevated' : ''}`}
            aria-label="Close focused plan"
            onClick={() => { setFocusedTierId(null); setFocusedEditionId(null); setSelectedPeriodFromMonth(null); }}
          >
            <span class="cz-package-builder__focused-close-x" aria-hidden="true" />
          </button>
          <h3 class="cz-package-builder__focused-name">
            {focusedDeclaredEffective.selectedEdition?.label ?? focusedData?.label ?? focusedTier.title}
          </h3>
          {focusedData?.ideal_for && (
            <p class="cz-package-builder__focused-ideal-for">{focusedData.ideal_for}</p>
          )}
          {/* Default/Edition navigation only — which commercial variant of
              this SAME Tier occupant is being viewed. Not Commercial
              Period, Leg, duration, or billing-cycle navigation; those are
              wired in a later phase. */}
          <EditionCueSelector
            destinations={[{ id: null, label: 'Default' }, ...focusedEditionOptions.map((edition) => ({ id: edition.id, label: edition.label }))]}
            activeId={focusedEditionId}
            onSelect={(editionId) => selectVariant(focusedTier.id, editionId)}
          />
          <div class="cz-package-builder__terms">
            <span class="cz-package-builder__focused-field-label">Commercial Terms</span>
            <div class="cz-package-builder__terms-grid">
              <div class="cz-package-builder__term">
                <span class="cz-package-builder__term-label">Upfront payment</span>
                <span class="cz-package-builder__term-value">
                  {upfrontAmount !== null ? formatPrice(upfrontAmount) : 'Flexible'}
                </span>
                <span class="cz-package-builder__term-note">
                  {upfrontAmount !== null ? 'Paid at plan start' : 'No upfront payment required'}
                </span>
              </div>
              <div class="cz-package-builder__term">
                <span class="cz-package-builder__term-label">Commitment</span>
                <span class="cz-package-builder__term-value">
                  {focusedDeclaredEffective.minimumTermValue != null
                    ? `${focusedDeclaredEffective.minimumTermValue} ${focusedDeclaredEffective.minimumTermUnit ?? ''}`
                    : 'Cancel anytime'}
                </span>
                <span class="cz-package-builder__term-note">
                  {focusedDeclaredEffective.minimumTermValue != null ? 'Minimum commitment' : 'No minimum commitment'}
                </span>
              </div>
              <div class="cz-package-builder__term">
                <span class="cz-package-builder__term-label">Plan billing</span>
                <span class="cz-package-builder__term-value">{billingSummary || '—'}</span>
                <span class="cz-package-builder__term-note">Based on active commercial components</span>
              </div>
            </div>
          </div>
          {/* Periods timeline — informational only. Renders EVERY resolved
              Period (never a "selected" one), each with its own AVAILABLE
              components rendered as independent cards — colliding/
              overlapping Legs in the same Period never summed, merged, or
              picked down to one. No click handlers, no highlighted
              "active" Period, no effect on Add to Quote: selectedPeriod/
              cardPeriodOverride/selectedPeriodFromMonth below are an
              unrelated internal compatibility path (Phase 5, preserving
              existing quote features/fallback pricing) that this timeline
              never reads from or writes to. Payment explanation sentences
              land in a later phase — for now each card shows only name/
              billing wording/price. */}
          <div class="cz-package-builder__timeline">
            <h4 class="cz-package-builder__timeline-title">How this plan is charged</h4>
            <p class="cz-package-builder__timeline-sub">See when each payment starts and which charges run together.</p>
            <div class="cz-package-builder__stages">
              {activePeriods.map((period) => {
                const components = availablePeriodComponents(period);
                if (components.length === 0) return null;
                // Same available-components-only count for both the stage
                // header's "N payments active" note and each component's
                // own alone/joined explanation — never period.components.length.
                const joined = components.length > 1;
                return (
                  <div class="cz-package-builder__stage" key={period.from_month}>
                    <span class="cz-package-builder__stage-node" aria-hidden="true" />
                    <div class="cz-package-builder__stage-head">
                      <span class="cz-package-builder__stage-label">{periodLabel(period)}</span>
                      <span class="cz-package-builder__stage-count">
                        {joined ? `${components.length} payments active` : '1 payment active'}
                      </span>
                    </div>
                    <div class="cz-package-builder__stage-components">
                      {components.map((component, index) => (
                        <div class="cz-package-builder__stage-component" key={index}>
                          <div class="cz-package-builder__stage-component-row">
                            <div class="cz-package-builder__stage-component-info">
                              <span class="cz-package-builder__stage-component-name">{componentPaymentName(component.billing_cycle)}</span>
                              <span class="cz-package-builder__stage-component-meta">{billingWording(component.billing_cycle)}</span>
                            </div>
                            <span class="cz-package-builder__stage-component-price">
                              {formatPrice(component.price)} {cycleSuffix(component.billing_cycle)}
                            </span>
                          </div>
                          {/* Subordinate calculation-rhythm note. A future
                              Leg-level discount line belongs here too, as
                              another child of this same card — no
                              restructuring needed to add it later. */}
                          <p class="cz-package-builder__stage-component-note">
                            {componentNote(component.billing_cycle, joined)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
              // The selected Commercial Period's own resolved price/cycle/
              // inclusions, substituted in for the card's flat declaration —
              // see periodPriceOverride(). Commitment is untouched (it
              // belongs to the Tier/Edition parent, resolved the same as
              // always inside TierCard).
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
              // Static only this phase: no hover/focus/click dimming, no
              // price, no Period range, no Leg id, no affected-count text —
              // label + this Leg's own quantity, nothing else.
              extensionsContent={extensionsContent}
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
