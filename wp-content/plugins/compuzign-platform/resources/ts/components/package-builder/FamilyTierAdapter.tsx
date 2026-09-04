import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { PricingTiers, TierCard, TierInclusionCheckIcon, resolveEffectiveTierDisplay, resolveUpfrontPayment, buildLegPaymentSummaries, cycleSuffix, billingWording } from '@/components/cost-builder/PricingTiers';
import type { EffectiveTierDisplay, PeriodPriceOverride } from '@/components/cost-builder/PricingTiers';
import { formatPrice } from '@/utils/format';
import type { FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { CommercialLegComponent, CommercialLegPeriod, CommercialLegPricedItem, PackageBuilderFamily, ServiceInclusion, Tier, TierId } from '@/api/types/cost-builder';
import { periodLabel, availablePeriodComponents, availableComponents, componentPaymentName, PLAN_BILLING_CYCLE_LABELS } from './commercialLegPresentation';
import { PlanDetailsModal } from './PlanDetailsModal';
import { ComposableOfferBrowser } from './ComposableOfferBrowser';

// Phase 7E: the Plan Details popup's own explicit target identity, resolved
// once at "View plan details" click time from whichever Tier/Edition is
// focused at that exact moment — never inferred from tab position/index,
// array order, or carried over from a previous popup open. `tierId`/
// `editionId` are the SAME internal identifiers periodsForVariant() and
// family.pricing.tiers already key on (never a second ID scheme); platformId
// is the popup's own stable EXTERNAL identity — the Tier occupant's real
// tier_platform_id, or the selected Edition's real edition_platform_id when
// one is active (the exact same Platform ID fields itemFor() below already
// puts on a quote item — not invented here). Identity only: the actual
// Periods/pricing this identity resolves to are derived fresh from `family`
// on every render (see planDetailsData in the focused branch), never copied
// into this object.
interface PlanDetailsTarget {
  tierId: TierId;
  editionId: string | null;
  platformId: string;
}

// The active focused variant's own resolved Commercial Period list — the
// occupant's own commercial_legs for Default, or the matching Edition's own,
// never a frontend reconstruction. See PackageManagerSchema::
// resolveCommercialLegTimeline(); Period itself carries no Platform ID, only
// the component(s) inside it do.
export function periodsForVariant(
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
// `declaredInclusionItems` is the SAME complete "What's included" list the
// normal/front card already resolves (resolveEffectiveTierDisplay()'s own
// inclusionItems) — read-only here, only to look up a matching declared
// item's existing bundle_id/includes by its exact item_id. This is the
// normal card's own Bundle data/rendering path (TierCard already expands
// bundle_id/includes into child rows); never a second Bundle resolver or a
// new shape, just carrying the same fields through onto the Period's own
// price/quantity override.
function periodPriceOverride(period: CommercialLegPeriod | null, declaredInclusionItems: ServiceInclusion[]): PeriodPriceOverride | null {
  if (!period) return null;
  const components = availablePeriodComponents(period);
  if (components.length !== 1) return null;
  const component = components[0];
  const declaredById = new Map(declaredInclusionItems.map((inclusion) => [inclusion.id, inclusion]));
  return {
    price: component.price,
    billingCycle: component.billing_cycle,
    inclusionItems: component.items.map((item): ServiceInclusion => {
      const declared = declaredById.get(item.item_id);
      return {
        id: item.item_id,
        label: item.label,
        quantity: item.quantity,
        ...(declared?.bundle_id ? { bundle_id: declared.bundle_id, includes: declared.includes } : {}),
      };
    }),
  };
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

// Focused-card "Extensions" — Phase 5C. Same shape as CommercialLegInclusionGroup
// (a distinct name only so a future renderer reads as Extension-specific,
// never a second interface to keep in sync).
export type CommercialLegExtensionGroup = CommercialLegInclusionGroup;

// Headline-Leg-relative, not "any two Legs collide": the Headline Leg
// (component.source === headlineLegId — the same real Leg resolveHeadlinePrice()
// already resolves the card's own headline price/cycle from) is the one
// fixed reference point every other Leg is compared against. An Other Leg
// is an Extension candidate only if IT SPECIFICALLY overlaps the Headline
// Leg in some resolved Period (never a generic pairwise collision among
// arbitrary Legs); once eligible, only its differences/additions relative
// to the Headline Leg's own items[] (by exact item_id) are shown — an item
// identical to the Headline Leg's own claim (same item_id, same quantity)
// is already fully explained there and is never repeated as an Extension.
export function commercialLegExtensionGroups(
  periods: CommercialLegPeriod[],
  headlineLegId: string | null | undefined,
): CommercialLegExtensionGroup[] {
  if (!headlineLegId) return [];
  const legGroups = commercialLegInclusionGroups(periods);
  const headlineGroup = legGroups.find((group) => group.source === headlineLegId);
  if (!headlineGroup) return [];
  const headlineItemsById = new Map(headlineGroup.items.map((item) => [item.item_id, item]));

  // Other Leg sources that are available in the SAME resolved Period as the
  // Headline Leg — Headline <-> Other only, read straight off activePeriods.
  const overlappingOtherSources = new Set<string>();
  for (const period of periods) {
    const availableSources = availablePeriodComponents(period).map((component) => component.source);
    if (!availableSources.includes(headlineLegId)) continue;
    for (const source of availableSources) {
      if (source !== headlineLegId) overlappingOtherSources.add(source);
    }
  }

  const groups: CommercialLegExtensionGroup[] = [];
  for (const group of legGroups) {
    if (group.source === headlineLegId) continue; // the Headline Leg is the baseline, never its own Extension
    if (!overlappingOtherSources.has(group.source)) continue; // never overlaps the Headline Leg -> no Extension group at all
    const items = group.items.filter((item) => {
      const headlineItem = headlineItemsById.get(item.item_id);
      return !headlineItem || headlineItem.quantity !== item.quantity; // addition (Headline doesn't claim it) or a differing quantity
    });
    if (items.length === 0) continue;
    groups.push({ source: group.source, billingCycle: group.billingCycle, items });
  }
  return groups;
}

// Short, subordinate explanation of one component's own calculation rhythm
// — the same billing-cycle vocabulary componentPaymentName() (see
// commercialLegPresentation.ts) already uses,
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

// Phase 6C: "N inclusions" under a payment card — this component's OWN
// items[], straight from the resolved component occurrence (the same
// unfiltered `items` commercialLegInclusionGroups()/commercialLegExtensionGroups()
// already render elsewhere; there is no item-level availability filter in
// this render path to reuse, only the component-level one availablePeriodComponents()
// already applied before this component ever reaches here). Never deduped by
// item_id, never summed across Legs/Periods — one component occurrence's own
// items only.
//
// A Bundle row is still exactly ONE Rate Sheet inclusion commercially (never
// split into per-supplied-content Leg assignments), but the customer-facing
// right card expands its `includes[]` into that many visible rows — so the
// plain "N inclusions" count alone reads as wrong next to that expansion.
// Detected by `includes` being non-null (the only field this row shape
// carries for a Bundle; `bundle_id` itself isn't projected onto
// CommercialLegPricedItem). M is always the real
// `includes.length` sum, never a hardcoded assumption.
function inclusionCountLabel(items: CommercialLegPricedItem[]): string {
  let plain = 0;
  let bundles = 0;
  let bundleContents = 0;
  for (const item of items) {
    if (item.includes != null) {
      bundles += 1;
      bundleContents += item.includes.length;
    } else {
      plain += 1;
    }
  }
  const inclusionWord = (n: number) => `${n} inclusion${n === 1 ? '' : 's'}`;
  const bundleWord = (n: number) => `${n} bundle${n === 1 ? '' : 's'}`;
  if (bundles === 0) return inclusionWord(plain);
  if (plain === 0) return `${bundleWord(bundles)} · ${inclusionWord(bundleContents)}`;
  return `${inclusionWord(plain)} + ${bundleWord(bundles)} · ${inclusionWord(bundleContents)}`;
}

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
  // The quoted primary item's own tierEditionPlatformId (see itemFor() below)
  // — null means the quote holds that Tier's Default declaration, a string
  // means it holds that specific Edition. Exact quote identity is Tier +
  // this, never Tier alone; used only inside the focused shell (Phase 2) to
  // tell "this exact Default/Edition is the quoted one" from "some other
  // variant of the same Tier is quoted" — the landing card's own isActive
  // (PricingTiers.tsx) stays intentionally Tier-only, unchanged from Phase 1.
  selectedTierEditionPlatformId: string | null;
  // Phase 8E: the full quoted add-on items (not just their tierIds) — an
  // add-on's exact quoted identity is Tier + Edition, same as the primary's
  // selectedTierEditionPlatformId above, and there can be several
  // independently-quoted add-ons at once, each with its own Edition. A flat
  // TierId[] (the pre-Phase-8E shape) cannot represent that, so the focused
  // shell's own isExactQuotedOption (below) can resolve an add-on's exact
  // match the same way it already does for the primary.
  selectedAddonItems: FamilyTierQuoteItem[];
  onAdd: (item: FamilyTierQuoteItem) => void;
  onRemovePrimary: () => void;
  onRemoveAddon: (tierPlatformId: string) => void;
  // Quote/cart connection phase: the already-quoted composable ("Build Your
  // Own") line for this Family+Instance, or null — forwarded to
  // ComposableOfferBrowser to re-seed its own Add/Remove state. Independent
  // of selectedTierId/selectedAddonItems above; the composable occupant is
  // never the primary and never an Add-on.
  selectedComposableItem: FamilyTierQuoteItem | null;
  onComposableCommit: (item: FamilyTierQuoteItem) => void;
  onComposableRemove: () => void;
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
  selectedTierEditionPlatformId,
  selectedAddonItems,
  onAdd,
  onRemovePrimary,
  onRemoveAddon,
  selectedComposableItem,
  onComposableCommit,
  onComposableRemove,
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
  // Phase 6: which left payment component (by its own component.source —
  // never array/Period index, billing cycle, or label) is currently
  // hovered/keyboard-focused, driving the right focused card's inclusion/
  // Extension dimming below. Inspection-only, no click/tap pinning yet.
  const [hoveredLegSource, setHoveredLegSource] = useState<string | null>(null);
  // Phase 7E: the Plan Details popup's own explicit target identity — null
  // means closed. Identity ONLY (tierId/editionId locate the data in
  // `family`; platformId is the popup's stable external identity — the
  // Tier occupant's own tier_platform_id, or the selected Edition's own
  // edition_platform_id when one is active). Never the copied Periods/
  // pricing data itself — that's re-derived from `family` + this identity
  // on every render (see planDetailsData below), never snapshotted here.
  const [planDetailsTarget, setPlanDetailsTarget] = useState<PlanDetailsTarget | null>(null);
  // Bumped on every "View plan details" click, independent of whether the
  // resolved identity is byte-identical to the previous open (re-opening
  // the SAME plan still counts as a new open) — folded into the modal's
  // own `key` below so each open mounts a genuinely fresh instance (fresh
  // refs, fresh scroll-lock/focus-trap effect), never the same instance
  // with its props merely updated.
  const [planDetailsOpenGeneration, setPlanDetailsOpenGeneration] = useState(0);
  const focusedTier = focusedTierId ? visibleTiers.find((tier) => tier.id === focusedTierId) ?? null : null;

  // Cleared on Edition switch, focused Tier switch, and close — selectVariant()
  // (the one path every variant change goes through) always updates both
  // focusedTierId and focusedEditionId together, and the close button sets
  // focusedTierId back to null, so this single effect covers all three.
  useEffect(() => {
    setHoveredLegSource(null);
    setPlanDetailsTarget(null);
  }, [focusedTierId, focusedEditionId]);

  // The Package Family selector (PackageBuilderApp.tsx's own "Package
  // Families" tablist) is a SIBLING of this whole component, outside every
  // one of its focused/staged/default render branches — clicking it only
  // ever swaps the `family` prop, never touches this component's own
  // focused-mode state. Without this, a stale focusedTierId from the OLD
  // Family survives here: TierId ('basic'/'standard'/etc) is a shared enum
  // across every Family, not Family-scoped, and visibleTiers' own
  // `?? [...]` audience_groups fallback lets a same-named Tier id from the
  // NEW Family still pass the filter — so focusedTier keeps resolving
  // non-null and the component stays on the focused branch, now silently
  // rendering the NEW Family's data for that id. To the customer that reads
  // exactly as "the focused shell swapped to a different Tier" without ever
  // exiting focused mode. Same reset scope commitSelection()/the close
  // button already use below — never a second convention.
  //
  // This is the mechanism behind the earlier "focused timeline sometimes
  // renders blank after 2-3 Tier/Edition switches" reports: an audit of the
  // switch/effect ordering inside this component found no race there, and
  // that audit was correct — the missing reset was always one level up, at
  // this Family boundary, not inside the switch itself.
  useEffect(() => {
    setFocusedTierId(null);
    setFocusedEditionId(null);
    setSelectedPeriodFromMonth(null);
    setHoveredLegSource(null);
    setPlanDetailsTarget(null);
  }, [family.family_id]);

  // Selects a Default/Edition variant and seeds its own first resolved
  // Period — the one path every variant change goes through, whether that's
  // the entry point into the focused shell (the normal card's Choose Plan
  // button, editionId null, or one of its Edition chips), the top variant
  // tab row, or the focused card's own Edition switch. Both land on the same
  // shell, just on a different starting tab.
  const selectVariant = (tierId: TierId, editionId: string | null) => {
    setFocusedTierId(tierId);
    setFocusedEditionId(editionId);
    // Closed HERE, synchronously in the same batch as the variant change —
    // never left to the [focusedTierId, focusedEditionId] effect below,
    // which only runs after this render has already committed. Switching
    // Tier/Edition must never mutate an already-open popup from one plan's
    // identity into another's — it closes immediately instead; the NEXT
    // "View plan details" click resolves a fresh target for whichever plan
    // is focused at that moment (see the button's onClick below).
    setPlanDetailsTarget(null);
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
  // Tier-level presence only — the outer/unfocused add-on card's own
  // "Added" state stays exactly as it already was (unchanged scope this
  // phase); selectedAddonItems above is what the FOCUSED shell reads for
  // Tier+Edition exactness.
  // An Add-on item's own tierId is always one of the five fixed Tier ids —
  // isAddon and isComposable are mutually exclusive roles (resolveQuoteItemRole()
  // in utils/quote.ts) — so this cast reflects a runtime-true fact about
  // selectedAddonItems' own contents, not a widening of what's accepted here.
  const selectedAddonTierIds = selectedAddonItems.map((item) => item.tierId as TierId);

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
    // Phase 5: the exact quoted option's own resolved commercial payment
    // streams, captured now alongside the Headline price/billingCycle
    // below — same "commercial_legs source of truth, Default vs. Edition"
    // pattern selectVariant()/PricingTiers' own activeCommercialLegs already
    // use (never a second/parallel resolution). effective.minimumTermUnit
    // mirrors PlanDetailsModal's own commitmentMonths gate exactly (only a
    // month-unit commitment caps an open-ended Leg's schedule).
    const activeCommercialLegs = effective.selectedEdition
      ? effective.selectedEdition.commercial_legs
      : tierData?.commercial_legs;
    const commitmentMonths = effective.minimumTermUnit && /month/i.test(effective.minimumTermUnit)
      ? effective.minimumTermValue
      : null;
    const legPaymentSummaries = activeCommercialLegs
      ? buildLegPaymentSummaries(activeCommercialLegs, commitmentMonths)
      : null;
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
      tierEditionTitle: effective.selectedEdition?.label ?? null,
      price: effective.price,
      billingCycle: effective.billingCycle,
      features: effective.inclusionLabels,
      inclusionItems: effective.inclusionItems,
      isAddon,
      minimumTermValue: effective.minimumTermValue,
      minimumTermUnit: effective.minimumTermUnit,
      planDurationMonths,
      legPaymentSummaries,
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
    setPlanDetailsTarget(null);
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

  // Phase 7E-correction: computed ONCE here, before any of the three views
  // below, and independent of all of them — never reads focusedData/
  // activePeriods/focusedDeclaredEffective (those views' own live locals),
  // only `family`/`tiers` (stable props) and planDetailsTarget's own stored
  // identity. This is what makes the popup a genuinely separate overlay
  // surface rather than a child that continues reading whichever tab
  // happens to be focused after it opened — see the shared final `return`
  // at the bottom of this component, where it renders as mainContent's
  // sibling regardless of which of the three views produced mainContent.
  const planDetailsOverlay = planDetailsTarget && (() => {
    const targetTierData = family.pricing.tiers[planDetailsTarget.tierId];
    const targetDeclaredEffective = resolveEffectiveTierDisplay(targetTierData, '', planDetailsTarget.editionId);
    const targetPeriods = periodsForVariant(family, planDetailsTarget.tierId, planDetailsTarget.editionId);
    const targetTier = tiers.find((tier) => tier.id === planDetailsTarget.tierId);
    // Development-only trace — never rendered into the DOM/customer UI,
    // visible only in the browser console. Confirms exactly which identity
    // each open resolved, for tracing repeated Tier/Edition switching
    // (Starter -> Business -> Enterprise -> Starter, or
    // Tier -> Edition 1 -> Edition 2 -> Tier).
    console.debug('[CZ PlanDetails] open', {
      platformId: planDetailsTarget.platformId,
      tierId: planDetailsTarget.tierId,
      editionId: planDetailsTarget.editionId,
      periodsLength: targetPeriods.length,
    });
    return (
      <PlanDetailsModal
        // Platform ID + open generation: re-opening the SAME plan still
        // mounts a genuinely fresh instance (fresh refs, fresh scroll-lock/
        // focus-trap effect), never the same instance with its props
        // merely updated.
        key={`${planDetailsTarget.platformId}:${planDetailsOpenGeneration}`}
        onClose={() => setPlanDetailsTarget(null)}
        familyTitle={family.title}
        planLabel={targetDeclaredEffective.selectedEdition?.label ?? targetTierData?.label ?? targetTier?.title ?? planDetailsTarget.tierId}
        commitmentValue={targetDeclaredEffective.minimumTermValue}
        commitmentUnit={targetDeclaredEffective.minimumTermUnit}
        periods={targetPeriods}
      />
    );
  })();

  let mainContent: ComponentChildren;

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
    // Phase 2: exact quote identity is Tier + Edition Platform ID (or null
    // for Default), never Tier alone — focusedEditionId is only a selector
    // key (never a Platform ID, per PricingEditionOption.id), so the
    // comparison reads the currently-viewed variant's own RESOLVED
    // edition_platform_id here, the same field itemFor() below already
    // writes into the quote item at Add to Quote time. True only when this
    // exact Default/Edition — not just this Tier — is the one already
    // quoted.
    // Phase 8E: add-on status is read from canonical Tier pricing data
    // (is_addon) — never card position, label, or which entry point was
    // used to focus it. An add-on's own exact match looks at
    // selectedAddonItems (there can be several, each independently
    // Tier+Edition-identified) instead of the single primary
    // selectedTierId/selectedTierEditionPlatformId pair — same exactness
    // rule, generalized to every occupant.
    const focusedIsAddon = !!focusedData?.is_addon;
    const focusedEditionPlatformId = focusedDeclaredEffective.selectedEdition?.edition_platform_id ?? null;
    const isExactQuotedOption = focusedIsAddon
      ? selectedAddonItems.some((item) =>
          item.tierId === focusedTier.id && (item.tierEditionPlatformId ?? null) === focusedEditionPlatformId,
        )
      : selectedTierId === focusedTier.id && focusedEditionPlatformId === selectedTierEditionPlatformId;
    // Computed after focusedDeclaredEffective so the Bundle parity lookup
    // above has the normal card's own declared inclusion list to read from.
    const cardPeriodOverride = periodPriceOverride(selectedPeriod, focusedDeclaredEffective.inclusionItems);
    const upfrontAmount = resolveUpfrontPayment(activePeriods);
    const focusedAvailableComponents = availableComponents(activePeriods);
    const billingSummary = planBillingSummary(focusedAvailableComponents);
    // Same Headline Leg pointer TierCard's own resolveHeadlinePrice() reads
    // (see PricingTiers.tsx) — the Default/Edition's own headline_leg_id,
    // never a second/independent resolution of "which Leg is headline."
    const focusedHeadlineLegId = focusedDeclaredEffective.selectedEdition
      ? focusedDeclaredEffective.selectedEdition.headline_leg_id
      : focusedData?.headline_leg_id;
    const extensionGroups = commercialLegExtensionGroups(activePeriods, focusedHeadlineLegId);
    // Phase 6A dimming, derived from hoveredLegSource — inspection only, no
    // new presentation data, no row injected/removed/reordered. The main
    // "What's included" list and the Extension groups are two DIFFERENT
    // presentation layers (Headline/base vs. differences-from-Headline), so
    // a hovered Leg never keeps a same-item_id main row full just because an
    // Extension group also claims that item_id — the two lists dim/stay-full
    // independently of each other:
    // - Headline Leg hovered, or nothing hovered: main list stays entirely
    //   full opacity (relatedInclusionIds === null means "don't dim" —
    //   TierCard never adds is-dimmed to any row). The Headline Leg never
    //   has its own Extension group, so this branch alone can't tell "idle"
    //   from "Headline hovered" — that's fine, both want the exact same
    //   main-list result.
    // - Non-Headline Leg hovered WITH a rendered Extension group (this Leg
    //   overlapped the Headline Leg and has differing/additional items —
    //   see extensionGroups above): the main list is Headline-only
    //   presentation, so it has nothing of THIS Leg's own to keep full —
    //   every main row dims (an empty Set, truthy, `.has()` always false —
    //   never null, which would mean "don't dim"). The matching Extension
    //   group itself stays full via extensionsContent's own isDimmed check
    //   below; that's where this Leg's items are shown.
    // - Non-Headline Leg hovered WITHOUT a rendered Extension group (never
    //   overlapped the Headline Leg in any Period, so it has no diffed
    //   items to show as an Extension): existing inspection behavior — that
    //   Leg's OWN full claimed item set (commercialLegInclusionGroups — the
    //   unfiltered per-Leg claim) stays full opacity in the main list,
    //   every other main row dims.
    const hoveredExtensionGroup = hoveredLegSource !== null
      ? extensionGroups.find((group) => group.source === hoveredLegSource)
      : undefined;
    const relatedInclusionIds = (hoveredLegSource === null || hoveredLegSource === focusedHeadlineLegId)
      ? null
      : hoveredExtensionGroup
        ? new Set<string>()
        : new Set(
            (commercialLegInclusionGroups(activePeriods).find((group) => group.source === hoveredLegSource)?.items ?? [])
              .map((item) => item.item_id),
          );
    // Rendered INSIDE TierCard itself (via extensionsContent), directly
    // after its own inclusion list and before its footer notes — never a
    // sibling panel below the card's own bordered/padded box (that box is
    // .cz-cost-builder__tier, one level inside .cz-package-builder__focused-card).
    const extensionsContent = extensionGroups.length > 0 ? (
      <div class="cz-package-builder__extensions">
        {extensionGroups.map((group) => {
          // Dimmed whenever something else is hovered — covers idle (never
          // dimmed, hoveredLegSource null), the hovered Leg's own group
          // (never dimmed, source matches), the Headline Leg hovered (every
          // group dims — the Headline Leg never has its own group here, so
          // group.source !== headlineLegId always holds), and every other
          // Leg's group (dims, source doesn't match).
          const isDimmed = hoveredLegSource !== null && group.source !== hoveredLegSource;
          return (
            <div class={`cz-package-builder__extension-group${isDimmed ? ' is-dimmed' : ''}`} key={group.source}>
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
          );
        })}
      </div>
    ) : null;
    mainContent = (
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
            onClick={() => { setFocusedTierId(null); setFocusedEditionId(null); setSelectedPeriodFromMonth(null); setPlanDetailsTarget(null); }}
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
              picked down to one. No click handlers yet (Phase 6 adds only
              hover/keyboard-focus dimming on the right card, keyed by each
              component's own source — see hoveredLegSource above), no
              highlighted "active" Period, no effect on Add to Quote:
              selectedPeriod/cardPeriodOverride/selectedPeriodFromMonth
              below are an unrelated internal compatibility path (Phase 5,
              preserving existing quote features/fallback pricing) that
              this timeline never reads from or writes to. Payment
              explanation sentences land in a later phase — for now each
              card shows only name/billing wording/price. */}
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
                      {components.map((component) => (
                        // Stable Leg identity is component.source alone —
                        // never array index (a Leg can repeat across
                        // Periods with a different index each time),
                        // Period index, billing cycle, or label. Hover and
                        // keyboard focus both set the same state, so both
                        // produce identical dimming below (see
                        // relatedInclusionIds/extension-group dimming).
                        <div
                          class="cz-package-builder__stage-component"
                          key={component.source}
                          tabIndex={0}
                          aria-label={`Highlight inclusions billed by this ${componentPaymentName(component.billing_cycle)} payment`}
                          onMouseEnter={() => setHoveredLegSource(component.source)}
                          onMouseLeave={() => setHoveredLegSource((current) => (current === component.source ? null : current))}
                          onFocus={() => setHoveredLegSource(component.source)}
                          onBlur={() => setHoveredLegSource((current) => (current === component.source ? null : current))}
                        >
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
                          {/* Phase 6B: this component occurrence's own claimed
                              item count — presentation only, matches the same
                              set the hover/focus dimming above already keys
                              off of (commercialLegInclusionGroups' unfiltered
                              per-Leg items, for a non-Headline Leg with no
                              rendered Extension group; the Extension group's
                              own diffed items when one renders). */}
                          <span class="cz-package-builder__stage-component-count">
                            {inclusionCountLabel(component.items)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Phase 7: informational-only entry point to the Plan Details
                popup — quiet text control (reuses .cz-package-builder__focused-back's
                own visual recipe), right-aligned below the last rendered
                Leg/payment card, never the primary yellow CTA. */}
            <div class="cz-package-builder__details-trigger-row">
              <button
                type="button"
                class="cz-package-builder__details-trigger"
                onClick={() => {
                  // Resolved HERE, at click time, from whichever Tier/Edition
                  // is actually focused in THIS render — never a stale/
                  // previous target, never inferred from array position. The
                  // Edition's own real Platform ID wins when one is
                  // selected and has one; otherwise the Tier occupant's own
                  // — the exact same fields itemFor() below puts on a quote
                  // item, not a second identity scheme. focusedTier.id is a
                  // last-resort fallback only for a never-configured Tier
                  // with no tier_platform_id on file, so this always stays a
                  // non-empty, stable string to key the modal by.
                  const platformId = focusedDeclaredEffective.selectedEdition?.edition_platform_id
                    ?? focusedData?.tier_platform_id
                    ?? focusedTier.id;
                  setPlanDetailsTarget({ tierId: focusedTier.id, editionId: focusedEditionId, platformId });
                  setPlanDetailsOpenGeneration((generation) => generation + 1);
                }}
              >
                View plan details
              </button>
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
              isActive={isExactQuotedOption}
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
              //
              // Phase 8E: an add-on's own mutation is independent of the
              // primary's — it must never replace/remove the primary
              // occupant, so it never calls commitSelection/onRemovePrimary
              // (those are primary-only paths that also drive stagedTierId).
              // Instead it uses the SAME independent upsert/remove path the
              // outer add-on card's own Add to Quote button already uses
              // (onAdd(itemFor(..., true)) / onRemoveAddon by stable Tier
              // Platform ID) and simply closes focus afterward — leaving
              // stagedTierId untouched returns the customer to the
              // selected-primary staged view with Recommendations, exactly
              // as closing focus without acting already does.
              onClick={(effective) => {
                if (focusedIsAddon) {
                  if (isExactQuotedOption) {
                    onRemoveAddon(focusedData?.tier_platform_id ?? '');
                  } else {
                    onAdd(itemFor(focusedTier.id, effective, true));
                  }
                  setFocusedTierId(null);
                  setFocusedEditionId(null);
                  setSelectedPeriodFromMonth(null);
                  setPlanDetailsTarget(null);
                  return;
                }
                // Exact identity, not just Tier: switching to a different
                // Edition of an already-quoted Tier and clicking must
                // replace the quote (commitSelection -> the existing
                // replaceFamilyNormalQuoteItem path), never remove it —
                // only clicking the exact already-quoted Default/Edition
                // again is a removal.
                if (isExactQuotedOption) {
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
              // Phase 6: null (idle, or the Headline Leg hovered) means "no
              // dimming" — every main row stays full opacity. A Set means
              // only its item_ids stay full opacity; every other row dims.
              relatedInclusionIds={relatedInclusionIds}
            />
          </div>
        </div>
      </div>
    );
  // Selected-Tier view: the chosen Tier alone, with Recommendations beside
  // it. Reached only when recommendation content exists — today that means
  // the Tier System offers Add-ons — so this view always has something to
  // choose. It is the same PricingTiers as the comparison: narrowing the Tier
  // list is what hides the other cards and reveals Recommendations, so there
  // is no second Add-on, recommendation, or quote flow here.
  } else if (stagedTier) {
    mainContent = (
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
          // Phase 1: this staged card is a quoted landing card, not a
          // separate view — it must keep the same focused-shell route the
          // comparison grid already offers (Choose Option; the small
          // Editions button itself hides via isActive, see PricingTiers.tsx).
          // Omitting this here was why the staged card previously showed no
          // route into the focused shell at all.
          onChoosePlan={selectVariant}
          // Phase 3: steers this exact quoted Tier's own card to render the
          // exact quoted Default/Edition (name, price, inclusions, Bundle
          // expansion, etc. — all already resolved inside TierCard's own
          // resolveEffectiveTierDisplay()), rather than always its Default.
          quotedTierEditionPlatformId={selectedTierEditionPlatformId}
        />
      </>
    );
  } else {
    mainContent = (
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
        // Phase 3: same as the staged view above — only ever resolves to a
        // defined value for whichever card's tier.id matches selectedTierId,
        // so every other card in this grid stays fully uncontrolled/
        // unaffected (and pre-quote, selectedTierId is null, so no card is
        // affected at all).
        quotedTierEditionPlatformId={selectedTierEditionPlatformId}
        isEnterpriseView={customerGroup === 'enterprise'}
      />
      </>
    );
  }

  // Phase 7E-correction: rendered as a true sibling of whichever view above
  // produced mainContent — never nested inside the focused branch's own
  // subtree, so it never depends on that branch's own live locals
  // (focusedData/activePeriods/focusedDeclaredEffective) once open. See
  // planDetailsOverlay above: derived entirely from `family` +
  // planDetailsTarget's own stored identity, closes automatically on
  // Tier/Edition switch (the effect and selectVariant() above).
  return (
    <>
      {mainContent}
      {planDetailsOverlay}
      {/* Phase 2B1 — same sibling posture as planDetailsOverlay above: reads
          only `family` (composable_offer/customer_policy) plus its own
          candidate state, never mainContent's live locals. context flips
          purely on whether a normal Tier/Edition is currently selected —
          it never changes which occupant this reads or how it resolves. */}
      <ComposableOfferBrowser
        family={family}
        context={selectedTierId === null ? 'build_your_own' : 'upgrade_your_build'}
        initialCartItem={selectedComposableItem}
        onCommit={onComposableCommit}
        onRemoveFromQuote={onComposableRemove}
      />
    </>
  );
}
