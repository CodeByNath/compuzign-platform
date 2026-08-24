import { useRef, useState } from 'preact/hooks';
import { Badge } from '@/components/ui/Badge';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import type { CommercialLegPeriod, PricingEditionOption, PricingTierData, ServiceInclusion, Tier, TierId } from '@/api/types/cost-builder';
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

// Focused shell only (Commercial Period wiring): the resolved price/cycle/
// inclusions for the one unambiguous commercial component of a selected
// Commercial Period, substituted for the card's own flat/Edition-resolved
// values wherever supplied. Never computed here — see
// FamilyTierAdapter.tsx's periodPriceOverride(), which only ever produces
// one from a Period with exactly one active commercial component (Default
// alone, no simultaneously active Additional Leg); commitment stays
// completely untouched, since it belongs to the Tier/Edition parent, never
// a Leg or Period.
export interface PeriodPriceOverride {
  price: number | null;
  billingCycle: string | null;
  inclusionItems: ServiceInclusion[];
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

// Payment Category values that mean a one-time/upfront obligation rather than
// a recurring one — the exact same vocabulary the Tier/Edition admin editors
// already use (see paymentCategoryOf() in TierPricingRulesEditor.tsx /
// TierEditionOverviewFields.tsx): billing_cycle 'one-time' or 'upfront' is
// Fixed, everything else is Recurring. There is no separate stored "Payment
// Category" field on the public projection — this is the one field that
// carries it.
const UPFRONT_BILLING_CYCLES = new Set(['one-time', 'upfront']);

/**
 * Finds the active Default/Edition's own resolved one-time/upfront
 * commercial obligation, if any — pure and exported for the same
 * testability reason resolveEffectiveTierDisplay is. Scans every resolved
 * Period's own components (not just one Period, and not the focused shell's
 * currently selected one): Upfront Payment is a standing commercial fact
 * about the variant, independent of which Commercial Period is being
 * browsed. Matches only by each component's own tagged billing_cycle field
 * — never array position — and returns the first available match's own
 * resolved price; never sums multiple matches together.
 */
export function resolveUpfrontPayment(commercialLegs: CommercialLegPeriod[] | undefined): number | null {
  for (const period of commercialLegs ?? []) {
    for (const component of period.components) {
      if (
        component.available
        && component.price !== null
        && component.billing_cycle
        && UPFRONT_BILLING_CYCLES.has(component.billing_cycle)
      ) {
        return component.price;
      }
    }
  }
  return null;
}

export interface HeadlinePrice {
  price: number | null;
  billing_cycle: string | null;
}

/**
 * Finds the active Default/Edition's own admin-selected Headline Leg among
 * its already-resolved commercial_legs — presentation metadata only, never
 * a pricing calculation. `headlineLegId` is already resolved server-side
 * (PackageSchema::extractTierForCostBuilder()) to a real Leg identity or the
 * literal 'default', matching exactly the same identity
 * commercial_legs[].components[].source already carries — so this is a
 * plain identity match, never array position, billing_cycle, price,
 * item_id, or label. Scans every resolved Period in order (not just the
 * focused shell's currently selected one — Headline is a standing card fact,
 * independent of which Commercial Period is being browsed) and returns the
 * first available match's own resolved price/billing_cycle; `null` when
 * nothing matches (e.g. `headlineLegId` names a since-removed Leg), letting
 * the caller fall back to today's existing behavior.
 */
export function resolveHeadlinePrice(
  commercialLegs: CommercialLegPeriod[] | undefined,
  headlineLegId: string | undefined,
): HeadlinePrice | null {
  if (!headlineLegId) return null;
  for (const period of commercialLegs ?? []) {
    for (const component of period.components) {
      if (component.available && component.source === headlineLegId) {
        return { price: component.price, billing_cycle: component.billing_cycle };
      }
    }
  }
  return null;
}

// Price-line suffix for the two cycles the shared formatCycleLabel()
// (utils/format.ts) doesn't cover — 'upfront' isn't in its map at all, and
// 'one-time' resolves to '' there. Kept local rather than extending that
// shared helper: it's also read by QuoteProposalPreview.tsx/OrderSummary.tsx,
// which this phase doesn't touch. monthly/annual/annually/quarterly still
// resolve through formatCycleLabel() unchanged — they're simply absent from
// the override map below.
const TIER_CYCLE_SUFFIX_OVERRIDES: Record<string, string> = {
  upfront: '/ upfront',
  'one-time': '/ once',
};

// Billing wording line under the price — same local-vs-shared reasoning as
// the suffix override above. "One-time Payment" is deliberately not "Billed
// one-time": a one-time obligation isn't a recurring billing cadence, so it
// reads as its own phrase rather than forcing the "Billed X" pattern onto it.
const TIER_BILLING_WORDING: Record<string, string> = {
  monthly: 'Billed monthly',
  annual: 'Billed annually',
  annually: 'Billed annually',
  quarterly: 'Billed quarterly',
  upfront: 'Billed upfront',
  'one-time': 'One-time Payment',
};

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

// Bundle-parent marker — reuses the same "package" glyph (Heroicons cube)
// already used for Bundles/Packages elsewhere in the admin UI (e.g.
// admin-station/shell/icons.tsx PackagesIcon), inlined locally rather than
// imported since customer-facing components don't cross into admin-only
// trees. Takes the quantity column's place on a Bundle parent row.
function TierBundleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      class="cz-cost-builder__tier-feature-bundle-icon"
    >
      <path d="M12.378 1.602a.75.75 0 00-.756 0L3.366 6.39a.75.75 0 000 1.298l8.256 4.768a.75.75 0 00.756 0l8.256-4.768a.75.75 0 000-1.298L12.378 1.602zM3 9.46v7.788a.75.75 0 00.378.65l8.25 4.764V13.41L3 9.46zm9.75 13.452l8.25-4.764a.75.75 0 00.378-.65V9.46l-8.628 4.984v8.468z" />
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
  // Package Builder only. Supplying it adds a "Choose Plan" action to each
  // normal Tier card and turns each Edition chip into an entry point into
  // the focused Tier shell on that Edition; Cost Builder passes nothing and
  // renders as before (chips stay a local, in-card swap).
  onChoosePlan?: (tierId: TierId, editionId: string | null) => void;
  // Package Builder only. Places the Recommendations area beside the Tier
  // strip instead of below it — used once a Tier is selected and the strip
  // has been narrowed to that one Tier. Cost Builder passes nothing and keeps
  // the stacked arrangement.
  recommendationsAside?: boolean;
  // Package Builder only. True while the customer's browsing the Enterprise
  // group tab — every card in that tab is an Enterprise-audience Tier, so
  // its Choose Plan renders with the same filled emphasis as the Popular
  // card. Cost Builder passes nothing.
  isEnterpriseView?: boolean;
}

// One Tier/add-on card. Shared by both strips below — and by the Package
// Builder's focused-plan view — so the visual language and interaction
// primitives (card, price, feature list, action button) are defined exactly
// once. Callers differ only in which Tiers they list, whether the popular
// badge applies, the active flag, and which handler a click reaches.
export function TierCard({
  tier,
  data,
  isPopular,
  popularLabel,
  isActive,
  billingCycle,
  addedLabel,
  onClick,
  onChoosePlan,
  hideOverview = false,
  isEnterpriseView = false,
  selectedEditionId: controlledSelectedEditionId,
  onEditionChange,
  periodOverride = null,
}: {
  tier: Tier;
  data: PricingTierData | undefined;
  isPopular: boolean;
  popularLabel?: string | null;
  isActive: boolean;
  billingCycle: string;
  addedLabel: string;
  onClick: (effective: EffectiveTierDisplay) => void;
  // Optional, Package Builder only — see PricingTiersProps.onChoosePlan.
  // Omitted while already focused, which is how the focused card hides it.
  // Also what makes the normal card's own Edition chips act as an entry
  // point into the focused shell instead of a local swap — see the chip
  // handler below.
  onChoosePlan?: (editionId: string | null) => void;
  // Focused view only: the Tier name and Ideal For are presented on its left
  // column instead, so the card must not repeat them.
  hideOverview?: boolean;
  // See PricingTiersProps.isEnterpriseView.
  isEnterpriseView?: boolean;
  // Focused shell only: lets the focused Tier card's own Edition switch stay
  // in sync with the focused shell's top variant tab row — one active-variant
  // value shared both ways instead of a second, disconnected one. Omitted by
  // every other caller, which keeps this card's switch fully self-contained
  // as it already was.
  selectedEditionId?: string | null;
  onEditionChange?: (editionId: string | null) => void;
  // Focused shell only (Commercial Period wiring) — see PeriodPriceOverride.
  // Omitted by every other caller, which keeps this card's price resolution
  // exactly as it already was (Default/Edition flat declaration only).
  periodOverride?: PeriodPriceOverride | null;
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
  const isControlledEdition = controlledSelectedEditionId !== undefined;
  const [internalSelectedEditionId, setInternalSelectedEditionId] = useState<string | null>(null);
  const selectedEditionId = isControlledEdition ? controlledSelectedEditionId : internalSelectedEditionId;
  const setSelectedEditionId = (editionId: string | null) => {
    onEditionChange?.(editionId);
    if (!isControlledEdition) setInternalSelectedEditionId(editionId);
  };
  const declaredEffective = resolveEffectiveTierDisplay(data, billingCycle, selectedEditionId);

  // Upfront Payment / Headline both read the active Default/Edition's own
  // resolved commercial_legs — never the focused shell's periodOverride,
  // which is scoped to one selected Commercial Period only; these facts
  // stand regardless of which Period is being browsed. See
  // resolveUpfrontPayment()/resolveHeadlinePrice() above.
  const activeCommercialLegs = declaredEffective.selectedEdition
    ? declaredEffective.selectedEdition.commercial_legs
    : data?.commercial_legs;
  const activeHeadlineLegId = declaredEffective.selectedEdition
    ? declaredEffective.selectedEdition.headline_leg_id
    : data?.headline_leg_id;
  const headlineOverride = resolveHeadlinePrice(activeCommercialLegs, activeHeadlineLegId);

  // Commitment (minimumTermValue/minimumTermUnit) and selectedEdition are
  // never overridden here — they belong to the Tier/Edition parent, not a
  // Commercial Period/Leg, and stay exactly as the Default/Edition
  // declaration already resolved them.
  //
  // Price/billing-cycle priority: the admin-selected Headline Leg (if it
  // resolves) always wins — in BOTH the normal card and the focused shell —
  // a selected Commercial Period never overrides the card's own Headline
  // choice; Period is for inspecting that period's own detail, a separate
  // concern from which price is "the" headline. periodOverride still
  // supplies inclusionItems/inclusionLabels unconditionally when present,
  // and still supplies price/billingCycle only as the fallback when the
  // Headline lookup returns null (e.g. a never-configured Tier, or a
  // headline_leg_id naming a since-removed Leg) — so every existing/
  // never-configured Tier keeps exactly today's behavior.
  const effective: EffectiveTierDisplay = {
    ...declaredEffective,
    ...(periodOverride
      ? {
          inclusionLabels: periodOverride.inclusionItems.map((item) => item.label),
          inclusionItems: periodOverride.inclusionItems,
        }
      : {}),
    ...(headlineOverride
      ? { price: headlineOverride.price, billingCycle: headlineOverride.billing_cycle ?? declaredEffective.billingCycle }
      : periodOverride
        ? { price: periodOverride.price, billingCycle: periodOverride.billingCycle ?? declaredEffective.billingCycle }
        : {}),
  };
  const { price: effectivePrice, billingCycle: effectiveBillingCycle, inclusionItems, minimumTermValue, minimumTermUnit } = effective;

  const suffix = TIER_CYCLE_SUFFIX_OVERRIDES[effectiveBillingCycle] ?? formatCycleLabel(effectiveBillingCycle);
  const billingWording = TIER_BILLING_WORDING[effectiveBillingCycle] ?? `Billed ${effectiveBillingCycle}`;

  const label = data?.label || tier.title;

  // Upfront Payment — see resolveUpfrontPayment() above; activeCommercialLegs
  // is already computed above, shared with the Headline lookup.
  const upfrontAmount = resolveUpfrontPayment(activeCommercialLegs);

  // Fixed card-section structure (1–9 below): every section renders on every
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

      {/* 2. Tier Labels — sale badges or future Tier labels; today just the
          Add-ons marker for add-on Tiers, right-aligned. The row is reserved
          on every card so a label doesn't shift other cards' rows down. */}
      <div class="cz-cost-builder__tier-labels">
        {data?.is_addon && <Badge variant="accent">Add-ons</Badge>}
      </div>

      {/* 3. Tier Overview — Tier name/title plus "Ideal For" content. The
          section wrapper is kept even when the focused view presents both on
          its own left column, so the card still has its 9 fixed sections. */}
      <div class="cz-cost-builder__tier-overview">
        {!hideOverview && (
          <>
            <div class="cz-cost-builder__tier-name">
              <span>{label}</span>
            </div>
            {data?.ideal_for && (
              <p class="cz-cost-builder__tier-ideal-for">{data.ideal_for}</p>
            )}
          </>
        )}
      </div>

      {/* 4. Price — Edition switch (if any), old price (reserved for a
          future discount/compare-at value), then the current price or its
          "Contact Us" replacement. */}
      <div class="cz-cost-builder__tier-price-block">
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
        {/* Billing wording — see TIER_BILLING_WORDING above. Gated the same
            as the cycle suffix above: no wording beside a "Contact Us"
            price. */}
        {effectivePrice !== null && effectiveBillingCycle && (
          <p class="cz-cost-builder__tier-billing-wording">{billingWording}</p>
        )}
        {minimumTermValue != null && (
          <p class="cz-cost-builder__tier-commitment">
            Minimum {minimumTermValue} {minimumTermUnit ?? ''}
          </p>
        )}
        {/* Edition switch — moved to the bottom of this block, below price/
            commitment. Focused shell: the left-side variant tab row
            (rendered by FamilyTierAdapter above this card) already offers
            Default/Edition navigation, so this in-card strip would be a
            redundant duplicate — omit it entirely there. Normal card:
            Default is always the already-active state you're looking at, so
            its own chip is a no-op — omit just that button and keep Edition
            chips as the entry point into the focused shell. Plain Cost
            Builder (no onChoosePlan) keeps today's Default + Edition
            local-swap switch unchanged. */}
        {!hideOverview && editionOptions.length >= 1 && (
          <div class="cz-cost-builder__tier-editions" role="group" aria-label={`${label} payment options`}>
            {!onChoosePlan && (
              <button
                type="button"
                class={`cz-cost-builder__tier-edition${selectedEditionId === null ? ' is-active' : ''}`}
                aria-pressed={selectedEditionId === null}
                onClick={(e) => { e.stopPropagation(); setSelectedEditionId(null); }}
              >
                Default
              </button>
            )}
            {editionOptions.map((edition) => {
              const active = selectedEditionId === edition.id;
              return (
                <button
                  key={edition.id}
                  type="button"
                  class={`cz-cost-builder__tier-edition${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Package Builder (onChoosePlan present): an Edition chip
                    // is an entry point into the focused shell on that
                    // Edition, not a local swap. Cost Builder (no
                    // onChoosePlan) keeps the local swap exactly as before.
                    if (onChoosePlan) {
                      onChoosePlan(edition.id);
                    } else {
                      setSelectedEditionId(edition.id);
                    }
                  }}
                >
                  {edition.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Commercial Facts — permanent two-row section, always rendered
          (Upfront Payment row, then Minimum Commitment row) regardless of
          whether either fact applies to this Tier/Edition, so the pricing
          section keeps one consistent footprint across the whole strip — no
          card-specific spacer or margin needed to line up Action below it.
          Follows the same active Default/Edition `effective`/
          `declaredEffective` values the price above already resolves; never
          a second Edition state. Each row is either a real label/value fact
          or a standalone fallback message — "Flexible"/"Cancel anytime" are
          NOT that row's value (they don't mean an amount or a commitment),
          so they never render paired with the "Upfront Payment"/"Minimum
          Commitment" label. Upfront Payment reads resolveUpfrontPayment()
          above (unchanged — still scans every resolved component, matches
          only available one-time/upfront billing_cycle, never sums).
          Minimum Commitment still reads the existing resolved commitment
          value/unit, never Leg periods. */}
      <div class="cz-cost-builder__tier-facts">
        <div class="cz-cost-builder__tier-fact">
          {upfrontAmount !== null ? (
            <>
              <span class="cz-cost-builder__tier-fact-label">Upfront Payment</span>
              <span class="cz-cost-builder__tier-fact-value">{formatPrice(upfrontAmount)}</span>
            </>
          ) : (
            // No matching upfront/one-time Leg. When the Tier/Edition still
            // carries a commitment, "Flexible" would misleadingly imply no
            // obligation at all — "Instant Access" says the right thing
            // instead (there's a term, just no separate upfront charge to
            // start). No commitment either -> "Flexible" stays exactly
            // right (nothing to pay upfront AND nothing to commit to).
            <span class="cz-cost-builder__tier-fact-fallback">
              {minimumTermValue != null ? 'Instant Access' : 'Flexible'}
            </span>
          )}
        </div>
        <div class="cz-cost-builder__tier-fact">
          {minimumTermValue != null ? (
            <>
              <span class="cz-cost-builder__tier-fact-label">Minimum Commitment</span>
              <span class="cz-cost-builder__tier-fact-value">{minimumTermValue} {minimumTermUnit ?? ''}</span>
            </>
          ) : (
            <span class="cz-cost-builder__tier-fact-fallback">Cancel anytime</span>
          )}
        </div>
      </div>

      {/* 6. Action — Choose Plan (Package Builder only, above) and the
          Add to Quote / selected-state action, kept aligned across cards
          regardless of how tall the sections above it are. */}
      <div class="cz-cost-builder__tier-action-row">
        {onChoosePlan && (
          <button
            type="button"
            class={`cz-cost-builder__tier-choose${(isPopular || isEnterpriseView) ? ' cz-cost-builder__tier-choose--filled' : ''}`}
            onClick={() => onChoosePlan(null)}
          >
            Choose Plan
          </button>
        )}
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

      {/* 7. Notes — Tier notes. No content today; the row is created and
          retained now so a future note doesn't require another pass to
          re-align every card's rows. */}
      <div class="cz-cost-builder__tier-notes" />

      {/* 8. Tier Inclusions — check icon + inclusion + quantity. */}
      <div class="cz-cost-builder__tier-inclusions">
        {inclusionItems.length > 0 && (
          <ul class="cz-cost-builder__tier-features">
            {inclusionItems.flatMap((item, i) => [
              /* A Bundle-backed row (bundle_id present) reads as a section
                 header for its own includes[] below it: no checkmark, no
                 quantity — a package glyph marks it instead, in the same
                 column the quantity would otherwise occupy. Still the same
                 alignment as every other row, just not a checkable one. */
              item.bundle_id ? (
                <li key={item.id || i}>
                  {/* Spans the icon + label columns so the Bundle name sits
                      flush at the row's left edge, like a section header,
                      rather than offset to where a checkmark would leave it. */}
                  <span class="cz-cost-builder__tier-feature-label cz-cost-builder__tier-feature-label--bundle">{item.label}</span>
                  <TierBundleIcon />
                </li>
              ) : (
                <li key={item.id || i}>
                  <TierInclusionCheckIcon />
                  <span class="cz-cost-builder__tier-feature-label">{item.label}</span>
                  {/* Always rendered (even empty) so every row keeps the same
                      3 grid children — a row with no quantity would otherwise
                      push the next row's icon into this column. */}
                  <span class="cz-cost-builder__tier-feature-qty">{item.quantity ?? ''}</span>
                </li>
              ),
              /* Bundle supplied content: display-only rows immediately below
                 their parent, at the SAME alignment as ordinary inclusions —
                 never priced, selected, or merged into the top-level list. */
              ...(item.includes ?? []).map((child, ci) => (
                <li key={child.id || `${item.id}-${ci}`}>
                  <TierInclusionCheckIcon />
                  <span class="cz-cost-builder__tier-feature-label">{child.label}</span>
                  <span class="cz-cost-builder__tier-feature-qty">{child.quantity ?? ''}</span>
                </li>
              )),
            ])}
          </ul>
        )}
      </div>

      {/* 9. Tier Card Footer — kept now as a placeholder; special Tier
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
  onChoosePlan,
  recommendationsAside = false,
  isEnterpriseView = false,
}: PricingTiersProps) {
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

  const renderAddonTierCard = (tier: Tier) => (
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
  );

  // Optional Add-ons — Recommendations' one group. Same data, same cards,
  // same independent toggle, same implicit same-Tier-System compatibility as
  // before.
  const addonsGroup = addonTiers.length > 0 ? (
    <div class="cz-cost-builder__addons">
      <h5 class="cz-cost-builder__addons-heading">Optional add-ons</h5>
      <div class="cz-cost-builder__tiers-wrap">
        <div class="cz-cost-builder__tiers-nav-row">
          <button
            type="button"
            class="cz-cost-builder__tiers-nav cz-cost-builder__tiers-prev"
            onClick={() => scroll(addonScrollRef, -1)}
            aria-label="Scroll add-ons left"
          >
            ‹
          </button>
          <button
            type="button"
            class="cz-cost-builder__tiers-nav cz-cost-builder__tiers-next"
            onClick={() => scroll(addonScrollRef, 1)}
            aria-label="Scroll add-ons right"
          >
            ›
          </button>
        </div>
        <div class="cz-cost-builder__tiers" ref={addonScrollRef}>
          {addonTiers.map(renderAddonTierCard)}
        </div>
      </div>
    </div>
  ) : null;

  // Recommendations — the area offered alongside the Tier itself. It holds
  // exactly one group today, the existing Optional Add-ons, and exists as its
  // own container so a later recommendation group is added inside it rather
  // than as a second parallel add-on/recommendation system. It renders only
  // when a group actually has content, which today means this Tier System
  // offers add-on Tiers at all. Stacked below the Tier strip — unchanged,
  // still how Cost Builder (and any non-isolated caller) shows Add-ons.
  const populatedRecommendations = addonsGroup ? (
    <div class="cz-cost-builder__recommendations">
      <h4 class="cz-cost-builder__recommendations-heading">Recommendations</h4>
      {addonsGroup}
    </div>
  ) : null;

  // Isolated selected-Tier view only: the Recommendations label plus the
  // Add-on cards themselves, directly — no "Optional add-ons" sub-heading,
  // no second carousel shell, just the cards as the trailing card in the
  // SAME Tier strip as the selected Tier. Renders exactly when Add-ons
  // exist, which is also exactly when a Tier occupant's Add to Quote has
  // fired and put this view on screen, so no separate show/hide wiring is
  // needed here.
  const recommendationsShell = recommendationsAside && addonTiers.length > 0 ? (
    <div class="cz-cost-builder__recommendations-shell">
      <h4 class="cz-cost-builder__recommendations-heading">Recommendations</h4>
      {addonTiers.map(renderAddonTierCard)}
    </div>
  ) : null;

  // Tier strip, with Recommendations trailing inside it as its own card when
  // isolated. Stacked Recommendations (populated Add-ons) still follows
  // below in every other case, unchanged.
  return (
    <div class="cz-cost-builder__tier-area">
      <div class="cz-cost-builder__tiers-wrap">
        <div class="cz-cost-builder__tiers-nav-row">
          <button
            type="button"
            class="cz-cost-builder__tiers-nav cz-cost-builder__tiers-prev"
            onClick={() => scroll(scrollRef, -1)}
            aria-label="Scroll tiers left"
          >
            ‹
          </button>
          <button
            type="button"
            class="cz-cost-builder__tiers-nav cz-cost-builder__tiers-next"
            onClick={() => scroll(scrollRef, 1)}
            aria-label="Scroll tiers right"
          >
            ›
          </button>
        </div>
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
              onChoosePlan={onChoosePlan && ((editionId) => onChoosePlan(tier.id, editionId))}
              isEnterpriseView={isEnterpriseView}
            />
          ))}
          {recommendationsShell}
        </div>
      </div>

      {!recommendationsAside && populatedRecommendations}
    </div>
  );
}
