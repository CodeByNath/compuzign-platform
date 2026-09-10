import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { PricingTiers, TierCard, TierInclusionCheckIcon, resolveEffectiveTierDisplay, resolveUpfrontPayment, buildLegPaymentSummaries, cycleSuffix, billingWording } from '@/components/cost-builder/PricingTiers';
import type { EffectiveTierDisplay, PeriodPriceOverride } from '@/components/cost-builder/PricingTiers';
import { formatPrice } from '@/utils/format';
import type { FamilyTierQuoteItem } from '@/components/cost-builder/types';
import type { CommercialLegComponent, CommercialLegPeriod, CommercialLegPricedItem, PackageBuilderFamily, ServiceInclusion, Tier, TierId } from '@/api/types/cost-builder';
import {
  periodLabel, availablePeriodComponents, availableComponents, componentPaymentName, PLAN_BILLING_CYCLE_LABELS,
  commercialLegInclusionGroups, commercialLegExtensionGroups, extensionHeading,
  buildQuotedCommercialBreakdown, buildQuotedCartBreakdown,
} from '@/utils/commercialLegPresentation';
export { commercialLegInclusionGroups, commercialLegExtensionGroups } from '@/utils/commercialLegPresentation';
export type { CommercialLegInclusionGroup, CommercialLegExtensionGroup } from '@/utils/commercialLegPresentation';
import { PlanDetailsModal } from './PlanDetailsModal';
import { ComposableOfferBrowser, resolveComposableEligibleRows } from './ComposableOfferBrowser';
import { UpgradeBuildSummary } from './UpgradeBuildSummary';

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

// "Manage build" / Cart footer "Upgrade your build" (project-work/2026-09-
// 06-tier-catalogue-admin-ux-consolidation.md) — the Cart's own one-shot
// re-entry signal into this component's existing 'browsing' stage, shared
// by both entry points (a line-level Manage build re-opening an existing
// composable line, or the footer's recovery route starting a fresh one).
// Identity only (which Family + Instance the click targeted, plus a
// requestId that changes on every click so the SAME target can be
// requested again after an exit): this component alone decides
// whether/how to act on it (see the consuming effect below), never a
// payload the caller drives navigation with directly.
//
// Auditor correction ("intent-safe shared Cart-to-browsing request"): a
// single shared open guard (composable exists OR catalogue eligible) could
// not tell these two entry points apart across a race — a `manage_existing`
// request whose composable line disappeared before consumption (removed,
// or the Family re-rendered late) could still open a FRESH Upgrade merely
// because the catalogue remained eligible, silently substituting
// start_upgrade's own behavior for Manage build's. `intent` is the minimal
// fact needed to keep the two open guards from ever substituting for one
// another while still sharing this one request/consumer — never a second
// navigation state machine.
export interface ManageBuildRequest {
  familyId: string;
  tierInstanceId: string;
  requestId: number;
  intent: 'manage_existing' | 'start_upgrade';
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

// Auditor correction (2026-09-05, "leg-level breakdown presentation
// customer view" follow-up "incomplete View Details parity"):
// CommercialLegInclusionGroup/commercialLegInclusionGroups()/
// CommercialLegExtensionGroup/commercialLegExtensionGroups() relocated to
// @/utils/commercialLegPresentation — the durable customer snapshot
// builder (buildQuotedCartBreakdown(), same file) needed this exact rule
// too, and a prior round hand-copied it there instead of sharing one
// definition. Re-exported above so every existing importer of this file
// (contract scripts included) keeps working unchanged.

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

// extensionHeading() relocated to @/utils/commercialLegPresentation
// alongside commercialLegExtensionGroups() above.

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
  showLabels,
}: {
  destinations: CueDestination[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  // Live-validation correction (2026-09-09): the composable Build Your Own
  // occupant's own Default/Edition set is never shown anywhere else on this
  // surface (unlike a normal Tier's, whose h3 name above already reflects
  // the active one) — dots-only leaves the customer with no way to see
  // which real names are even available to switch between. Opt-in per
  // caller rather than a global behavior change: the normal-Tier callers
  // keep today's exact dots-only track untouched.
  showLabels?: boolean;
}) {
  const hasEditions = destinations.length > 1;
  const activeIndex = Math.max(0, destinations.findIndex((destination) => destination.id === activeId));
  // Plain percentage of the rail's own (already-inset) width — true 50% when
  // there's nothing to switch between, exactly matching the rail's own
  // horizontal center regardless of the inset's size.
  const cuePercent = hasEditions ? (activeIndex / (destinations.length - 1)) * 100 : 50;

  return (
    <div
      class={`cz-package-builder__cue-track${showLabels && hasEditions ? ' cz-package-builder__cue-track--labeled' : ''}`}
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
      {/* Visible Default/Edition names, dynamically from `destinations`
          (never a hardcoded name/count/index) — additive to the click
          targets above, not a replacement; those keep owning both the tap
          area and the accessible name (aria-label), so this row is purely
          presentational. Renders for one Edition exactly like many — same
          even slice, one label per destination. */}
      {showLabels && hasEditions && (
        <div class="cz-package-builder__cue-labels" aria-hidden="true">
          {destinations.map((destination, index) => (
            <span
              key={destination.id ?? 'default'}
              class={`cz-package-builder__cue-label${destination.id === activeId ? ' is-active' : ''}`}
              style={{ left: `${(index * 100) / destinations.length}%`, width: `${100 / destinations.length}%` }}
            >
              {destination.label}
            </span>
          ))}
        </div>
      )}
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
  // Live-validation correction: the full quoted primary item, or null —
  // forwarded to ComposableOfferBrowser as its own primaryItem prop so it
  // can independently verify an exact ready base exists, rather than
  // relying solely on this component's own render gate below (Phase 3:
  // upgradeGateActive === 'browsing', which itself can only ever be true
  // once a primary is already committed) to keep it from ever committing/
  // pricing an Upgrade with no base. Same "belt and suspenders" reasoning
  // as selectedComposableItem above — a second, domain-boundary layer, not
  // a replacement for the render gate.
  selectedPrimaryItem: FamilyTierQuoteItem | null;
  // Simple rule, once for every focused shell this component owns: whenever
  // EITHER a normal Tier's Choose Plan view (focusedTierId !== null) OR the
  // composable occupant's own Upgrade gate (upgradeGateActive !== null,
  // Phase 2 project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md)
  // is active, called with true — so PackageBuilderApp can hide QuoteSummary/
  // MobileQuoteBar and collapse the sidebar grid track while ANY of them is
  // up, without touching `items` at all and without needing to separately
  // track each shell's own state itself. This component owns no cart-
  // visibility logic of its own, same "caller performs the actual mutation/
  // visibility" posture as onCommit/onRemoveFromQuote above.
  onFocusedShellActiveChange: (active: boolean) => void;
  // "Manage build" — Cart's one-shot request to re-enter this Family's
  // existing 'browsing' stage directly for its already-committed composable
  // line. null means no pending request. A request for a Family/Instance
  // other than the one this component is currently rendering is left
  // untouched (not consumed) until that Family/Instance actually renders
  // here — see the consuming effect below. onManageBuildConsumed is called
  // exactly once a matching Family/Instance has been resolved (opened or
  // dropped), so the caller can clear it and a later exit from browsing
  // (dismissUpgradeGate) can never re-trigger the same request.
  manageBuildRequest: ManageBuildRequest | null;
  onManageBuildConsumed: () => void;
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
    // Family membership is resolved BEFORE any audience question. `tiers` is
    // the global Tier vocabulary every Family is measured against, while
    // `pricing.tiers` is one Family's own Partial<Record<...>> of the slots
    // it actually occupies. A Tier this Family never occupies has no entry at
    // all, and the old `?.audience_groups ?? [both]` read that absence as
    // "appears under every customer group" — inventing a phantom occupant out
    // of a global slot the Family does not own. Absence is non-membership; it
    // is never a default audience. Only a real occupancy entry may fall back
    // to the unset-audience default (see PackageSchema's own
    // DEFAULT_TIER_AUDIENCE_GROUPS). Same "a real pricing entry is required
    // first" rule PricingTiers.tsx already applies to its own normalTiers.
    const occupancy = pricing.tiers[tier.id];
    if (!occupancy) {
      return false;
    }
    const groups = occupancy.audience_groups ?? ['personal_business', 'enterprise'];
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
  selectedPrimaryItem,
  onFocusedShellActiveChange,
  manageBuildRequest,
  onManageBuildConsumed,
}: FamilyTierAdapterProps) {
  // null means "no explicit choice yet" — deliberately NOT the same value
  // as a resolved default. The old version defaulted this straight to
  // 'personal_business', which meant a customer's own first-render landing
  // was represented identically to them having actually clicked that tab —
  // an initial/default resolution and a deliberate customer selection
  // collapsed into one indistinguishable value. Reset to null on Family
  // switch below, so every Family gets its own clean landing resolution.
  const [selectedCustomerGroup, setSelectedCustomerGroup] = useState<'personal_business' | 'enterprise' | null>(null);
  // Which global Tier slots this Family actually occupies — resolved once,
  // ahead of every audience/focus derivation below, for the same reason the
  // filter above guards: a global slot without a `family.pricing.tiers` entry
  // is not this Family's occupant and must not reach any count.
  const familyOccupants = tiers.filter((tier) => family.pricing.tiers[tier.id] !== undefined);
  // Availability is resolved from normal Tier occupants ONLY — Add-ons are
  // offered in Recommendations after a primary plan is already known, so
  // an Add-on visible under a group must never make that group appear to
  // have a real choice when it has no primary Tier to land on. A real
  // occupancy entry is required first as well: a Tier the Family does not
  // occupy is not a "normal" occupant either, and must never be counted as
  // one merely because a missing entry carries no `is_addon: true` to
  // exclude it.
  const normalOccupants = familyOccupants.filter((tier) => family.pricing.tiers[tier.id]?.is_addon !== true);
  const hasPersonalBusinessTiers = filterTiersByCustomerGroup(normalOccupants, family.pricing, 'personal_business').length > 0;
  const hasEnterpriseTiers = filterTiersByCustomerGroup(normalOccupants, family.pricing, 'enterprise').length > 0;
  // The tab bar is a real choice only when BOTH groups actually have a
  // normal occupant to show — a Family whose Tiers are entirely
  // Enterprise-only (or entirely Personal & Business-only) offers no real
  // toggle, just one side that always renders empty.
  const showCustomerTabs = hasPersonalBusinessTiers && hasEnterpriseTiers;
  // The resolved landing group when nothing has been explicitly clicked —
  // whichever side actually has a normal occupant, preferring Personal &
  // Business when both do (matches the tab bar's own left-to-right order).
  const defaultCustomerGroup = hasPersonalBusinessTiers ? 'personal_business' : 'enterprise';
  const effectiveCustomerGroup = selectedCustomerGroup ?? defaultCustomerGroup;
  const visibleTiers = filterTiersByCustomerGroup(familyOccupants, family.pricing, effectiveCustomerGroup);
  // One shared render, used both above the plain comparison grid AND above
  // the single-Tier auto-view's focused shell (see isImplicitSingleTierView
  // below) — the same control, never two copies that could drift.
  const customerTabsBar = showCustomerTabs && (
    <div class="cz-package-builder__customer-tabs" role="tablist" aria-label="Customer group">
      {CUSTOMER_GROUPS.map((group) => (
        <button
          key={group.value}
          type="button"
          role="tab"
          class="cz-package-builder__customer-tab"
          aria-selected={effectiveCustomerGroup === group.value}
          onClick={() => {
            // A deliberate group change resolves a fresh landing, so a
            // dismissal recorded against the previous group's single Tier
            // must not survive into it.
            setSingleTierDismissedTierId(null);
            setSelectedCustomerGroup(group.value);
          }}
        >
          {group.label}
        </button>
      ))}
    </div>
  );

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
    // Same TierId-collision-across-Families reasoning as every other reset
    // above: upgradeGateTierId is a TierId, not itself Family-scoped, so a
    // same-named Tier in the NEW Family could otherwise let a stale gate
    // reappear without ever having been re-triggered by commitSelection.
    setUpgradeGateTierId(null);
    setUpgradeGateStage(null);
    setComposableEditionId(null);
    // Same TierId-collision reasoning again: a dismissal recorded for this
    // Family's single Tier must never be inherited by a same-named Tier in
    // the next Family.
    setSingleTierDismissedTierId(null);
    // A new Family gets its own clean landing resolution — see
    // selectedCustomerGroup's own declaration above.
    setSelectedCustomerGroup(null);
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

  // Add-ons come from this Family's one Tier System, where compatibility is
  // implicit — there is no per-Tier compatibility ledger, so "does this Tier
  // have Add-ons" is answered by the Tier System offering any at all.
  const normalTiers = visibleTiers.filter((tier) => family.pricing.tiers[tier.id] && !family.pricing.tiers[tier.id]?.is_addon);
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

  // Phase 2 — "Upgrade your build" gate (project-work/2026-09-06-tier-
  // catalogue-admin-ux-consolidation.md). Same shape/validity pattern as
  // stagedTierId/stagedTier above: the gate belongs to the exact tierId that
  // opened it, so if the primary is later removed or swapped to a different
  // Tier, upgradeGateActive derives back to null on its own — no separate
  // reset call needed for that case (the family-switch effect below still
  // hard-resets it, for the identical same-TierId-different-Family reason
  // that effect already exists for focusedTierId/stagedTierId's siblings).
  // `stage` stays 'pending' | 'browsing' | null so Phase 3 can wire
  // 'browsing' into this same state without a shape change; Phase 2 only
  // ever sets 'pending' (Browse Catalogue is rendered but inert this phase).
  const [upgradeGateTierId, setUpgradeGateTierId] = useState<TierId | null>(null);
  const [upgradeGateStage, setUpgradeGateStage] = useState<'pending' | 'browsing' | null>(null);
  // The customer's own dismissal of the QUOTED single-Tier focused shell,
  // stored as the exact TierId it belongs to — the same validity-scoped shape
  // as stagedTierId/upgradeGateTierId above.
  //
  // Unlike those two, deriving validity is NOT sufficient here, and this is
  // the one real trap in this feature. Checking `stored === selectedTierId`
  // only makes a stale dismissal DORMANT while the primary is absent; it
  // becomes live again the moment the customer re-quotes that same Tier, and
  // would then suppress a genuinely fresh quoted focused shell:
  //
  //   quote -> X (stores id) -> remove primary (dormant, locked landing
  //   correctly returns) -> quote the SAME Tier again -> stored id matches
  //   once more and wrongly suppresses the fallback.
  //
  // So the id is genuinely CLEARED whenever the selected primary is not the
  // dismissed Tier (see the reset effect below), and the derivation is kept
  // only as the synchronous same-render guard that stops X bouncing back.
  // Referenced inside the customer-tab click handler declared earlier in this
  // render — a closure reads it at click time, never during the render that
  // creates it.
  const [singleTierDismissedTierId, setSingleTierDismissedTierId] = useState<TierId | null>(null);
  const upgradeGateStageForSelectedTier = upgradeGateTierId !== null && upgradeGateTierId === selectedTierId
    ? upgradeGateStage
    : null;
  // Live correction (2026-09-10, project-work/2026-09-10-cart-bundle-and-
  // upgrade-refinements.md): once this Family+Instance already has a quoted
  // Upgrade line, the 'pending' CTA inside Recommendations must not offer a
  // SECOND "Upgrade your build / Browse Catalogue" entry alongside it. The
  // Cart footer's own recovery route already applies exactly this rule
  // (PackageBuilderApp's showUpgradeYourBuildFooter -> composableItem ===
  // null); Recommendations simply never got it, so a quoted Upgrade could
  // be advertised as if it were still unstarted. `selectedComposableItem`
  // is the parent's own resolveQuoteItemRole()-derived line for this exact
  // Family+Instance — a real cart-role fact, never a rendered label.
  //
  // Resolved HERE, at the shell-level state this component already derives,
  // rather than inside the Recommendations branch: every consumer below
  // (the focused-shell active signal, hideAddonsInRecommendations, the CTA
  // itself) then reads one consistent gate instead of each re-testing the
  // cart independently and risking drift.
  //
  // Deliberately narrowed to 'pending' only. 'browsing' is the Manage-build
  // route INTO an existing Upgrade — suppressing that would break re-entry
  // for exactly the line this gate exists because of.
  const upgradeGateActive = upgradeGateStageForSelectedTier === 'pending' && selectedComposableItem !== null
    ? null
    : upgradeGateStageForSelectedTier;
  // Single-Tier auto-view: a customer group filtering down to exactly one
  // Tier has nothing to compare, so it PERMANENTLY shows in the focused
  // Choose Plan shell instead of ever existing as a one-card grid — a pure
  // render-time fallback over the SAME focusedTier every other consumer
  // below already reads, never a useEffect state-mutation chain. Three
  // consecutive prior attempts used exactly that (an effect calling
  // selectVariant()) and failed live for reasons never diagnosed despite
  // the effect logic reading correctly on every static trace — see project
  // memory on this incident. This approach sidesteps that whole class of
  // failure: nothing here ever calls a setter to "open" the view, so there
  // is no effect-timing/ordering question to get wrong.
  //
  // Composable browsing and an already-staged Tier both take precedence —
  // this is strictly a passive default, never an override of a shell the
  // customer is already actively in.
  //
  // Whether that landing is dismissible depends on ONE thing: is this single
  // Tier already the quoted primary?
  //
  //   locked implicit landing  = one real primary, NOT quoted. The focused
  //     shell IS the landing presentation; there is no Close action, because
  //     dismissing it would fall through to an orphan one-card grid (a real
  //     reported defect in an earlier version of this feature). The
  //     customer-group tab bar stays the only way off it.
  //   quoted single-Tier view  = one real primary that IS the quoted primary.
  //     The customer now has a Cart line to return to, so the ordinary sticky
  //     X applies and dismissing lands on that Tier's own normal card — not
  //     an orphan, because the card carries its quoted state and its View
  //     Plan route straight back into this same shell.
  //
  // The dismissal is honoured HERE, at the fallback itself, so pressing X can
  // never be immediately re-triggered by this same render-time default (the
  // bounce-back that would otherwise make X look broken). It stays a passive
  // render-time derivation — nothing below ever calls a setter to "open" this
  // view, which is the property that made this approach work where three
  // effect-driven attempts failed live.
  const singleVisibleTier = normalTiers.length === 1 ? normalTiers[0] : null;
  // Quoted means THIS exact single Tier is the selected primary — never
  // merely "something is in the Cart".
  const singleTierIsQuoted = singleVisibleTier !== null && selectedTierId === singleVisibleTier.id;
  // Valid only while that same Tier stays quoted: removing the primary
  // (selectedTierId null) or swapping to a different Tier makes this false by
  // derivation, restoring the locked landing rule with no reset call.
  const singleTierDismissed = singleTierDismissedTierId !== null
    && singleTierDismissedTierId === selectedTierId;
  const effectiveFocusedTierId = focusedTierId
    ?? (upgradeGateActive !== 'browsing' && stagedTier === null && singleVisibleTier && !singleTierDismissed
      ? singleVisibleTier.id
      : null);
  const focusedTier = effectiveFocusedTierId ? visibleTiers.find((tier) => tier.id === effectiveFocusedTierId) ?? null : null;
  // True only when this render's focused shell exists purely via the
  // fallback above (no explicit Choose Plan click ever happened) — drives
  // hiding the Close button and showing the customer-group tabs above the
  // shell instead, both below.
  const isImplicitSingleTierView = focusedTierId === null && effectiveFocusedTierId !== null;
  // Only the UNQUOTED implicit landing is locked (no Close). Once this Tier is
  // the quoted primary the shell keeps the ordinary sticky X, whether it was
  // reached implicitly or by an explicit View Plan click.
  const isLockedSingleTierLanding = isImplicitSingleTierView && !singleTierIsQuoted;

  // Composable-focused-shell reuse: which Default/Edition of the composable
  // occupant's OWN declaration (family.pricing.composable_offer) is active
  // in the top tab row while browsing — the exact same
  // EditionCueSelector/id-null-means-Default vocabulary a normal Tier's
  // focusedEditionId already uses, kept as its own separate piece of state
  // rather than widening focusedEditionId itself: the composable occupant
  // is never the normal-focused-shell's own focusedTier, so reusing that
  // state would let the two unrelated shells' Edition selections leak into
  // each other. Reset alongside the gate itself (dismissUpgradeGate,
  // Family switch below) — never left stale across a fresh browsing entry.
  const [composableEditionId, setComposableEditionId] = useState<string | null>(null);

  // Sticky close (X) button elevation — stronger shadow once the page has
  // scrolled, subtle otherwise. Listener attaches while either focused shell
  // (a normal Tier, or the composable occupant's own browsing stage) is
  // actually open — the button's only rendered then — so it costs nothing in
  // the card-comparison/staged views and is removed on leaving either focus
  // state or unmount.
  const [isCloseElevated, setIsCloseElevated] = useState(false);
  useEffect(() => {
    if (effectiveFocusedTierId === null && upgradeGateActive !== 'browsing') return;
    const onScroll = () => setIsCloseElevated(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [effectiveFocusedTierId, upgradeGateActive]);

  useEffect(() => {
    onFocusedShellActiveChange(effectiveFocusedTierId !== null || upgradeGateActive !== null);
    // onFocusedShellActiveChange is PackageBuilderApp's raw useState setter,
    // a stable identity by React/Preact guarantee (no useCallback needed);
    // omitted from deps so a caller re-render can never spuriously re-fire
    // this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveFocusedTierId, upgradeGateActive]);

  // Genuine reset of a stale dismissal, keyed on the EXTERNALLY owned primary
  // identity — the cart line lives in PackageBuilderApp, so the primary can
  // disappear from anywhere (Quote Summary, Cart, this component's own remove
  // action) and this component only ever sees selectedTierId change. Clearing
  // here rather than at each removal site is what makes "removed from Cart
  // outside this component" behave identically to removing it in here.
  //
  // This is a synchronisation/cleanup effect ONLY: it clears stale
  // presentation state and never opens, focuses, or selects anything. The
  // focused shell is still produced purely by the render-time fallback above
  // — the property that made this feature work where three effect-driven
  // auto-open attempts failed live.
  useEffect(() => {
    if (singleTierDismissedTierId !== null && singleTierDismissedTierId !== selectedTierId) {
      setSingleTierDismissedTierId(null);
    }
  }, [selectedTierId, singleTierDismissedTierId]);

  const dismissUpgradeGate = () => {
    setUpgradeGateTierId(null);
    setUpgradeGateStage(null);
    setComposableEditionId(null);
  };

  // "Manage build" — consumes manageBuildRequest. Declared AFTER the
  // family-reset effect above (in hook registration order — see that
  // effect, keyed on family.family_id) so, on the same commit where a Cart
  // click also switched activeFamilyId (a different Family than was
  // already open), that reset runs first and this effect is the one that
  // leaves upgradeGateTierId/Stage set, never the other way around.
  //
  // Auditor correction ("race-safe cross-Family Manage build re-entry"):
  // PackageBuilderApp's handler performs two separate setState calls
  // (setActiveFamilyId, then setManageBuildRequest) — relying on both
  // being observed by this component in the exact same render/commit is
  // not something a static contract can prove, so this effect no longer
  // assumes it. A request for a Family/Instance OTHER than the one
  // currently rendered here is left completely untouched (NOT consumed) —
  // it waits. family.family_id/family.tier_instance_id are now in the
  // dependency array specifically so this effect re-fires the moment the
  // target Family/Instance actually renders, at which point the SAME
  // still-pending request is re-evaluated and, now matching, is resolved.
  // Only once the Family/Instance genuinely matches is the request ever
  // resolved — opened when the primary exists AND the request's own
  // `intent` is satisfied, or silently dropped (matched but the guard
  // failed) — never both left pending and later fired unexpectedly once
  // conditions happen to change.
  //
  // Auditor correction ("intent-safe shared Cart-to-browsing request"): the
  // two intents are deliberately NOT a plain disjunction anymore — each has
  // its OWN complete guard, so one can never substitute for the other
  // across a race:
  //   - 'manage_existing' (a line-level Manage build click) requires the
  //     composable line to STILL be committed at consumption time — the
  //     same belt-and-suspenders posture as ComposableOfferBrowser's own
  //     primaryItem gate elsewhere in this file. If that line disappeared
  //     before this Family/Instance rendered (removed, or superseded), the
  //     request is dropped WITHOUT opening — it must never fall back to
  //     starting a fresh Upgrade just because the catalogue happens to
  //     remain eligible.
  //   - 'start_upgrade' (the Cart footer's recovery route) requires NO
  //     composable line to be committed AND a genuinely eligible catalogue
  //     (resolveComposableEligibleRows() — the SAME shared authority
  //     commitSelection's own hasCatalogue check below already uses). If a
  //     composable line now exists (e.g. auto-sync landed one moments
  //     earlier), the request is dropped WITHOUT opening — line-level
  //     Manage build is the correct route once a line exists, never a
  //     second fresh-Upgrade entry alongside it.
  useEffect(() => {
    if (!manageBuildRequest) return;
    const familyMatches = manageBuildRequest.familyId === family.family_id
      && manageBuildRequest.tierInstanceId === family.tier_instance_id;
    if (!familyMatches) return;
    const intentSatisfied = manageBuildRequest.intent === 'manage_existing'
      ? !!selectedComposableItem
      : selectedComposableItem === null && resolveComposableEligibleRows(family).length > 0;
    if (selectedTierId !== null && selectedPrimaryItem && intentSatisfied) {
      setUpgradeGateTierId(selectedTierId);
      setUpgradeGateStage('browsing');
    }
    // Reached only once the Family/Instance matches — resolved here
    // exactly once, whether opened above or dropped because a guard
    // failed, so it can never linger and fire later once the customer
    // happens to re-add a composable line or otherwise change state.
    // Preserves one-shot behavior after a successful open: this same
    // request has already been consumed by the time browsing later exits
    // (dismissUpgradeGate), so an exit can never re-trigger it.
    onManageBuildConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageBuildRequest, family.family_id, family.tier_instance_id]);

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
    // Live-gate correction (2026-09-05, "preserve period/leg inclusion
    // attribution"): captured from the SAME activeCommercialLegs alongside
    // legPaymentSummaries above, never re-derived from it — see
    // buildQuotedCommercialBreakdown()'s own docblock for why this can't be
    // reconstructed from legPaymentSummaries after the fact.
    const commercialBreakdown = activeCommercialLegs
      ? buildQuotedCommercialBreakdown(activeCommercialLegs)
      : null;
    // Auditor correction (2026-09-05, "leg-level breakdown presentation
    // customer view"): the cart quick-view's own compact shape, captured
    // alongside commercialBreakdown above from the SAME activeCommercialLegs
    // — same Headline Leg pointer used elsewhere in this file (focusedHeadlineLegId)
    // and by TierCard's own resolveHeadlinePrice() (PricingTiers.tsx), never
    // a second/independent resolution of "which Leg is headline."
    const headlineLegId = effective.selectedEdition
      ? effective.selectedEdition.headline_leg_id
      : tierData?.headline_leg_id;
    const cartBreakdown = activeCommercialLegs
      ? buildQuotedCartBreakdown(activeCommercialLegs, headlineLegId ?? null)
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
      commercialBreakdown,
      cartBreakdown,
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
    // A Family reaches Recommendations when it has add-on Tiers to choose
    // from OR a real Upgrade Your Build catalogue to offer (Phase 1's shared
    // eligibility truth) — either alone is enough content for that view;
    // a catalogue-only Family (no add-on Tiers at all) must still stage,
    // since the CTA itself lives inside Recommendations, not a separate view.
    const hasCatalogue = resolveComposableEligibleRows(family).length > 0;
    setStagedTierId(addonTiers.length > 0 || hasCatalogue ? tierId : null);
    // The gate takes priority over the Recommendations/staged view above —
    // it is shown first, immediately after Add to Quote, whenever this
    // Family/Tier has a real Upgrade Your Build catalogue at all. stagedTierId
    // is still set unconditionally above so "Maybe next time"/the derived
    // fallback below lands on exactly today's existing continuation once the
    // gate ends.
    setUpgradeGateTierId(hasCatalogue ? tierId : null);
    setUpgradeGateStage(hasCatalogue ? 'pending' : null);
  };

  const select = (tierId: TierId, effective: EffectiveTierDisplay) => {
    if (selectedTierId === tierId) {
      onRemovePrimary();
      setStagedTierId(null);
      dismissUpgradeGate();
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
      <>
      {/* A single-Tier Family/group has no plain-card grid to speak of —
          the focused shell IS its landing presentation, permanently, so
          there is no Close action to dismiss it (see
          isImplicitSingleTierView/effectiveFocusedTierId above). The
          customer-group tabs are the only legitimate way off it, shown
          here — above the shell, not inside the grid branch below — only
          when a genuinely different, non-empty group actually exists to
          switch to. */}
      {isImplicitSingleTierView && customerTabsBar}
      <div class="cz-package-builder__focused">
        <div class="cz-package-builder__focused-detail">
          {/* Return path out of the focused view. Same clear action as
              before ("← All plans") — only this local focused-Tier state,
              restoring the card comparison; no navigation, routing, browser
              history, or persisted builder state. Circular X rather than a
              text link because this isn't back-navigation: it's the one
              action that exits the focused view.
              Also clears stagedTierId — without it, closing focused for a
              Tier OTHER than the one already in the cart fell through to
              the staged single-Tier view for whatever WAS staged (stale
              re-derivation: stagedTier resolves true whenever stagedTierId
              still equals selectedTierId, regardless of which Tier this
              close actually belongs to), never the comparison grid this
              comment already promised — the one real path back to "every
              plan" once the cart holds something became unreachable. Close
              is now a single deterministic shell transition to the grid,
              every time, matching what it already claimed to do.
              Hidden only for the LOCKED single-Tier landing — one real
              primary that is not yet quoted, which has no non-orphan card to
              fall back to. Once that Tier is the quoted primary this button
              returns, because its own normal card (quoted state + View Plan
              back into this shell) is a real destination. */}
          {!isLockedSingleTierLanding && (
          <button
            type="button"
            class={`cz-package-builder__focused-close${isCloseElevated ? ' is-elevated' : ''}`}
            aria-label="Close focused plan"
            onClick={() => {
              // Records the dismissal for the quoted single-Tier case, so the
              // render-time fallback above does not immediately reopen the
              // shell this click just closed. Set for the explicit (View
              // Plan) route too, not only the implicit one — both land back
              // on the same single card, and both would otherwise bounce.
              if (singleTierIsQuoted && selectedTierId !== null) {
                setSingleTierDismissedTierId(selectedTierId);
              }
              setFocusedTierId(null); setFocusedEditionId(null); setSelectedPeriodFromMonth(null); setPlanDetailsTarget(null); setStagedTierId(null);
            }}
          >
            <span class="cz-package-builder__focused-close-x" aria-hidden="true" />
          </button>
          )}
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
      </>
    );
  // Composable focused shell — Build Your Own is a real occupant, entered
  // from the Recommendations CTA below and presented in the exact SAME
  // `.cz-package-builder__focused` two-column shell a normal Tier's
  // selectVariant() opens: left detail (name, EditionCueSelector over the
  // composable occupant's OWN edition_options, then the existing
  // ComposableOfferBrowser catalogue, completely untouched internally) and
  // a right, sticky card. Takes priority over stagedTier below, exactly as
  // the old browsing stage did — the catalogue never renders stacked
  // underneath Recommendations.
  //
  // Unlike a normal Tier, there is no single resolved Commercial Period
  // timeline to show here (the composable price is whatever the customer is
  // currently composing, resolved live by ComposableOfferBrowser's own
  // debounced preview) — so Commercial Terms/Periods-timeline are
  // deliberately not rendered on this left column; UpgradeBuildSummary on
  // the right already carries the resolved running total.
  } else if (upgradeGateActive === 'browsing' && selectedTierId !== null) {
    const composableData = family.pricing.composable_offer ?? undefined;
    const composableEditionOptions = composableData?.edition_options ?? [];
    const composableDeclaredEffective = resolveEffectiveTierDisplay(composableData, '', composableEditionId);
    mainContent = (
      <div class="cz-package-builder__focused">
        <div class="cz-package-builder__focused-detail">
          <button
            type="button"
            class={`cz-package-builder__focused-close${isCloseElevated ? ' is-elevated' : ''}`}
            aria-label="Close Build Your Own"
            onClick={dismissUpgradeGate}
          >
            <span class="cz-package-builder__focused-close-x" aria-hidden="true" />
          </button>
          {/* project-work/2026-09-10-focused-edition-selector-visual-
              refinement.md — the ONE stable heading for this focused
              composable surface, independent of which cue destination is
              active. It used to render the active declaration's own label
              (`Default`/`Subscriptions`/…), duplicating what the cue's own
              labels below already say. The cue labels remain the only place
              declaration names appear; ComposableOfferBrowser no longer
              renders its own copy of this title in this context either. */}
          <h3 class="cz-package-builder__focused-name">Upgrade your build</h3>
          {composableData?.ideal_for && (
            <p class="cz-package-builder__focused-ideal-for">{composableData.ideal_for}</p>
          )}
          {/* Same Default/Edition navigation grammar a normal Tier's own
              focused shell uses, over the composable occupant's OWN
              edition_options — never the already-quoted primary's. A
              never-configured composable offer (edition_options empty)
              renders EditionCueSelector's own existing static single-ball
              "no Editions" state, exactly like a Tier with none.
              Live-validation correction (2026-09-09): showLabels — unlike a
              normal Tier's focused shell, nothing else on this surface
              already names the composable occupant's own Default/Edition
              set, so the control itself must render the real names here. */}
          <EditionCueSelector
            destinations={[{ id: null, label: 'Default' }, ...composableEditionOptions.map((edition) => ({ id: edition.id, label: edition.label }))]}
            activeId={composableEditionId}
            onSelect={setComposableEditionId}
            showLabels
          />
          <ComposableOfferBrowser
            family={family}
            context="upgrade_your_build"
            activeEditionId={composableEditionId}
            initialCartItem={selectedComposableItem}
            primaryItem={selectedPrimaryItem}
            onCommit={onComposableCommit}
            onRemoveFromQuote={onComposableRemove}
          />
        </div>
        <div class="cz-package-builder__focused-card">
          <UpgradeBuildSummary
            primaryItem={selectedPrimaryItem}
            composableItem={selectedComposableItem}
            onExit={dismissUpgradeGate}
          />
        </div>
      </div>
    );
  // Selected-Tier view: the chosen Tier alone, with Recommendations beside
  // it. Reached only when recommendation content exists — today that means
  // the Tier System offers Add-ons, or this Family/Tier has a real Upgrade
  // Your Build catalogue (Phase 1's shared eligibility truth) — so this view
  // always has something to choose. It is the same PricingTiers as the
  // comparison: narrowing the Tier list is what hides the other cards and
  // reveals Recommendations, so there is no second Add-on, recommendation,
  // or quote flow here.
  } else if (stagedTier) {
    // The "Upgrade your build" CTA now lives INSIDE Recommendations, right
    // beside (or, while it's up, in place of) the add-on choices — never a
    // separate full-bleed panel that replaces the whole staged view. Only
    // ever rendered in the 'pending' stage (the same tier-scoped derivation
    // upgradeGateActive already applies above); 'browsing' takes priority as
    // its own mainContent branch above, so this never renders stacked
    // underneath it. Reuses the exact same eyebrow/heading copy and the two
    // actions the old standalone gate panel had.
    const recommendationsCta = upgradeGateActive === 'pending' ? (
      <div class="cz-package-builder__upgrade-gate-inline">
        <div class="cz-package-builder__upgrade-gate-copy">
          <p class="cz-package-builder__upgrade-gate-eyebrow">Your plan is already in the quote</p>
          <h3 class="cz-package-builder__upgrade-gate-heading">Upgrade your build</h3>
        </div>
        <div class="cz-package-builder__upgrade-gate-actions">
          {/* Same filled/outline pairing Choose Plan (secondary) + Add to
              Quote (primary) already use elsewhere in this file — Browse
              Catalogue is this CTA's one primary action, so it reuses the
              exact same solid-accent treatment (.tier-choose--filled),
              never a bespoke button style. */}
          <button
            type="button"
            class="cz-cost-builder__tier-action cz-cost-builder__tier-choose--filled"
            onClick={() => setUpgradeGateStage('browsing')}
          >
            Browse Catalogue
          </button>
          {/* The secondary/dismiss action reuses .tier-action's own bare
              outline-muted treatment — the exact default look Browse
              Catalogue used to have before the --filled modifier above —
              rather than the plain borderless text link
              .focused-back uses elsewhere for "back" navigation; this is a
              real decision (skip the upgrade), not a navigation control. */}
          <button
            type="button"
            class="cz-cost-builder__tier-action"
            onClick={dismissUpgradeGate}
          >
            Maybe next time
          </button>
        </div>
      </div>
    ) : null;
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
          // The CTA card above, and whether it should stand alone in
          // Recommendations rather than sit beside the ordinary add-on
          // choices — see PricingTiers.tsx's own recommendationsShell.
          recommendationsCta={recommendationsCta}
          hideAddonsInRecommendations={upgradeGateActive === 'pending'}
        />
      </>
    );
  } else {
    mainContent = (
      <>
      {/* No real choice to offer — either no occupants at all, or every
          occupant belongs to just one group — when showCustomerTabs is
          false; see its own declaration above. */}
      {customerTabsBar}
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
        isEnterpriseView={effectiveCustomerGroup === 'enterprise'}
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
    </>
  );
}
