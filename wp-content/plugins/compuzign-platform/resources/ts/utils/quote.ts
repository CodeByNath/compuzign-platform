import { COMPOSABLE_QUOTE_TIER_ID } from '@/components/cost-builder/types';
import type { CartItem, ComposedUpgradeBase, ComposedUpgradeExtras, FamilyTierQuoteItem, QuoteItem, QuoteItemTierId } from '@/components/cost-builder/types';
import type { TierId } from '@/api/types/cost-builder';

// ── Cart identity and mutation ──────────────────────────────────────────────
//
// A quote cart line is no longer uniquely identified by serviceId alone: one
// Service can carry one normal (non-add-on) selection plus zero or more
// add-on Tier selections at once. The stable identity of a line is therefore
// serviceId + (isAddon ? tierId : the fact that it is the one non-add-on
// line for that serviceId) — used for both React/Preact list keys and
// mutation. Every helper below is pure so the cart-key contract can be
// exercised without mounting a component.

/** Stable list key / identity string for one cart line. */
export function isFamilyTierQuoteItem(item: CartItem): item is FamilyTierQuoteItem {
  return item.offer_type === 'family_tier';
}

export function familyTierSystemKey(item: FamilyTierQuoteItem): string {
  return `family:${item.familyPlatformId}:instance:${item.tierInstancePlatformId}`;
}

export type FamilyTierQuoteItemRole = 'primary' | 'addon' | 'composable';

/**
 * The one place that resolves primary/addon/composable for a
 * FamilyTierQuoteItem — every call site below reads through this rather
 * than re-deriving the same isAddon/isComposable branch independently, so
 * the three roles can never drift out of agreement with each other. Every
 * writer in this module sets isComposable only inside a freshly built
 * composable snapshot (ComposableOfferBrowser.tsx's own builder), always
 * paired with isAddon: false, so the two are never both true in practice;
 * this still resolves deterministically (composable takes priority) rather
 * than throwing, so a read path over a hand-edited/corrupted persisted cart
 * degrades to a defensible classification instead of crashing the cart UI.
 */
export function resolveQuoteItemRole(item: FamilyTierQuoteItem): FamilyTierQuoteItemRole {
  if (item.isComposable) return 'composable';
  return item.isAddon ? 'addon' : 'primary';
}

/**
 * Live-correction round: whether a composable ("Build Your Own") line has a
 * sibling primary Tier for the SAME Family+Tier-Instance in the same cart —
 * i.e. it was reached via the "upgrade your build" entry point rather than
 * standing alone. Contextual, not a stored fact: the same composable line
 * can gain or lose a sibling primary as the customer edits the cart, so this
 * is computed at render time from the cart array, never cached on the item
 * itself. Customer quote/cart + review surfaces (QuoteSummary.tsx,
 * OrderSummary.tsx) use this to show "Upgrades" instead of "Build Your Own"
 * for exactly this coexistence case — internal identity/keys and every
 * Admin-facing surface (requestItemDisplay.ts, the Request drawer,
 * QuoteProposalPreview.tsx shared with Admin PDF print) are unaffected and
 * keep "Build Your Own" unconditionally.
 */
export function composableCoexistsWithPrimary(item: FamilyTierQuoteItem, items: CartItem[]): boolean {
  if (resolveQuoteItemRole(item) !== 'composable') return false;
  const systemKey = familyTierSystemKey(item);
  return items.some((other) => isFamilyTierQuoteItem(other)
    && resolveQuoteItemRole(other) === 'primary'
    && familyTierSystemKey(other) === systemKey);
}

export function quoteItemKey(item: CartItem): string {
  if (isFamilyTierQuoteItem(item)) {
    const systemKey = familyTierSystemKey(item);
    const role = resolveQuoteItemRole(item);
    if (role === 'composable') return `${systemKey}:composable`;
    return role === 'addon' ? `${systemKey}:addon:${item.tierPlatformId}` : `${systemKey}:primary`;
  }
  return item.isAddon ? `${item.serviceId}:addon:${item.tierId}` : `${item.serviceId}:primary`;
}

export function replaceFamilyNormalQuoteItem(items: CartItem[], item: FamilyTierQuoteItem): CartItem[] {
  const systemKey = familyTierSystemKey(item);
  // Replacing the primary must never disturb an existing Add-on OR an
  // existing composable line for the same Family+Instance — only the prior
  // primary line itself is dropped.
  const withoutOldPrimary = items.filter((existing) => !(isFamilyTierQuoteItem(existing)
    && resolveQuoteItemRole(existing) === 'primary'
    && familyTierSystemKey(existing) === systemKey));
  // ...UNLESS an existing composable line is an in-progress Upgrade draft
  // tied to the exact base Tier/Edition this replace swaps away — checked
  // against the TRUE post-replace state (old primary already gone, new
  // `item` already present), never against the state mid-removal, so the
  // old primary can never accidentally still "count" as matching. See
  // composableDraftIsStale()'s own docblock for why a draft (unlike a
  // finalised composed result) must not silently survive its base changing.
  const nextItems = [...withoutOldPrimary, item];
  return nextItems.filter((existing) => existing === item
    || !isFamilyTierQuoteItem(existing)
    || !composableDraftIsStale(existing, nextItems));
}

export function upsertFamilyAddonQuoteItem(items: CartItem[], item: FamilyTierQuoteItem): CartItem[] {
  const key = quoteItemKey(item);
  return [...items.filter((existing) => quoteItemKey(existing) !== key), item];
}

/**
 * Add or replace the one aggregate composable ("Build Your Own") line for
 * this Family+Instance — full-snapshot replace, never a per-item patch,
 * mirroring upsertFamilyAddonQuoteItem's own shape. Independent of the
 * primary Tier and every Add-on: it never removes them, and it is reachable
 * with or without a primary Tier already selected (the composable browser's
 * own 'build_your_own' vs 'upgrade_your_build' context).
 */
export function upsertFamilyComposableQuoteItem(items: CartItem[], item: FamilyTierQuoteItem): CartItem[] {
  const key = quoteItemKey(item);
  return [...items.filter((existing) => quoteItemKey(existing) !== key), item];
}

export function removeFamilyAddonQuoteItem(
  items: CartItem[],
  familyId: string,
  tierInstanceId: string,
  tierPlatformId: string,
): CartItem[] {
  return items.filter((item) => !isFamilyTierQuoteItem(item)
    || item.familyId !== familyId
    || item.tierInstanceId !== tierInstanceId
    || item.tierPlatformId !== tierPlatformId);
}

/**
 * Remove the one composable line for this Family+Instance, if any —
 * independent of the primary Tier and every Add-on. Deliberately NOT routed
 * through removeFamilyTierSystemQuoteItems(): that function's whole-system
 * cascade is correct for Add-ons (which only make sense paired with a
 * primary Tier) but wrong here, since a standalone composable selection has
 * no primary to be "orphaned" from and must survive the primary's own
 * removal — see removeFamilyTierSystemQuoteItems()'s own comment below.
 */
export function removeFamilyComposableQuoteItem(
  items: CartItem[],
  familyId: string,
  tierInstanceId: string,
): CartItem[] {
  return items.filter((item) => !isFamilyTierQuoteItem(item)
    || item.familyId !== familyId
    || item.tierInstanceId !== tierInstanceId
    || resolveQuoteItemRole(item) !== 'composable');
}

/**
 * Removes the primary Tier and every Add-on for this Family+Instance — but
 * never a FINALISED composable line: unlike an Add-on, a composable ("Build
 * Your Own") selection is designed to stand alone with no primary Tier at
 * all (the composable browser's own 'build_your_own' context, or a
 * finalised Upgrade result — see FamilyTierQuoteItem.isComposedUpgrade), so
 * clearing the primary must not also clear it, unlike the existing
 * Add-on-orphan cascade this function already performs. An UN-finalised
 * Upgrade draft is different: once its exact base Tier/Edition is gone,
 * composableDraftIsStale() makes it stale too, and it is dropped in the
 * same pass rather than surviving as an orphaned reference to a base that
 * no longer exists.
 */
export function removeFamilyTierSystemQuoteItems(
  items: CartItem[],
  familyId: string,
  tierInstanceId: string,
): CartItem[] {
  const withoutPrimaryAndAddons = items.filter((item) => !isFamilyTierQuoteItem(item)
    || item.familyId !== familyId
    || item.tierInstanceId !== tierInstanceId
    || resolveQuoteItemRole(item) === 'composable');
  return withoutPrimaryAndAddons.filter((item) => !isFamilyTierQuoteItem(item)
    || !composableDraftIsStale(item, withoutPrimaryAndAddons));
}

// ── Upgrade Journey Finalisation ─────────────────────────────────────────────
//
// "Upgrade your build" and standalone "Build Your Own" are different customer
// journeys (see project-work/2026-09-03-composable-tier-admin-to-customer-
// validation.md for the full accepted design/review history). An Upgrade
// draft is a composable line reached with an already-selected primary
// Tier/Edition — it stays dependent on that EXACT base while in progress
// (composableDraftIsStale() below), and only becomes an independent result
// through the explicit finaliseUpgradeQuoteDraft() transition, which folds
// the base's own commercial facts in rather than leaving "primary + loose
// upgrades" as two separate cart lines.

/**
 * True iff `item` is an in-progress ("draft") Upgrade composable line whose
 * recorded base Tier/Edition (upgradeDraftBase) no longer matches any
 * primary currently in `items` for the same Family+Instance — covers both
 * the base being removed entirely and being replaced with a different
 * Tier/Edition. A FINALISED composable line (no upgradeDraftBase — either a
 * standalone Build Your Own item, or one that already went through
 * finaliseUpgradeQuoteDraft()) is never stale; this only ever returns true
 * for a genuine unfinished draft.
 */
export function composableDraftIsStale(item: FamilyTierQuoteItem, items: CartItem[]): boolean {
  if (resolveQuoteItemRole(item) !== 'composable' || !item.upgradeDraftBase) return false;
  const base = item.upgradeDraftBase;
  return !items.some((other) => isFamilyTierQuoteItem(other)
    && resolveQuoteItemRole(other) === 'primary'
    && other.familyId === item.familyId
    && other.tierInstanceId === item.tierInstanceId
    && other.tierPlatformId === base.tierPlatformId
    && other.tierEditionPlatformId === base.tierEditionPlatformId);
}

/** True iff any cart item is a still-un-finalised Upgrade draft (valid or stale) — used to hard-block Review/Request submission until every Upgrade in progress is either finalised or abandoned. */
export function hasUnfinalisedUpgradeDraft(items: CartItem[]): boolean {
  return items.some((item) => isFamilyTierQuoteItem(item)
    && resolveQuoteItemRole(item) === 'composable'
    && !!item.upgradeDraftBase);
}

/**
 * The single, deterministic derivation from a composed item's two
 * authoritative peer children to its top-level compatibility/display
 * projection — the ONLY place this concatenation/copy logic exists, called
 * by finaliseUpgradeQuoteDraft() below and mirrored server-side in
 * RequestSchema.php's own deriveComposedProjection() (same name,
 * deliberately — see that function's own docblock for the precedent this
 * follows). Pure concatenation, never a recomputation of either child's own
 * already-resolved commercial facts, and never a dedup across base/upgrade:
 * the same item_id may legitimately appear once per provenance (e.g. a
 * quantity already included in the base plan, plus more of it bought
 * through the upgrade) — see ServiceInclusion.provenance's own docblock.
 */
export function deriveComposedProjection(base: ComposedUpgradeBase, upgrade: ComposedUpgradeExtras): Pick<
FamilyTierQuoteItem,
'inclusionItems' | 'legPaymentSummaries' | 'price' | 'billingCycle' | 'minimumTermValue' | 'minimumTermUnit' | 'planDurationMonths'
> {
  return {
    inclusionItems: [
      ...base.inclusionItems.map((entry) => ({ ...entry, provenance: 'base' as const })),
      ...upgrade.inclusionItems.map((entry) => ({ ...entry, provenance: 'upgrade' as const })),
    ],
    legPaymentSummaries: [
      ...base.legPaymentSummaries.map((entry) => ({ ...entry, provenance: 'base' as const })),
      ...upgrade.legPaymentSummaries.map((entry) => ({ ...entry, provenance: 'upgrade' as const })),
    ],
    // Commitment/headline ownership: the base Tier/Edition is always the
    // customer-facing commitment source in this platform (a real selected
    // Edition carries "its own commitment"; the composable occupant's own
    // minimumTermValue exists only to give a STANDALONE Build Your Own
    // selection some commitment when there is no base Edition at all — see
    // buildComposableFamilyTierQuoteItem() in ComposableOfferBrowser.tsx).
    // Once a base exists, it governs unconditionally; upgrade's own term
    // stays readable only via composedUpgrade.minimumTermValue/Unit for
    // audit, never compared or merged here.
    price: base.price,
    billingCycle: base.billingCycle,
    minimumTermValue: base.minimumTermValue,
    minimumTermUnit: base.minimumTermUnit,
    planDurationMonths: base.planDurationMonths,
  };
}

/**
 * The explicit "Finalise build" transition: converts an in-progress Upgrade
 * draft into the final composed Build Your Own result. A pure no-op (no
 * change to `items`) when the draft is absent or composableDraftIsStale()
 * — the UI must gate the Finalise action on validity and never call this on
 * a stale/absent draft; this function does not throw, it simply declines.
 *
 * On a valid draft: builds composedBase from the current primary's own
 * resolved fields and composedUpgrade from the draft's own resolved fields
 * (both already-correct, independently-resolved snapshots — see
 * project-work's recorded rationale for why concatenating them, rather than
 * re-resolving either, is safe), derives the top-level projection via
 * deriveComposedProjection(), then removes the primary and any Add-ons for
 * this Family+Instance via the existing, unchanged
 * removeFamilyTierSystemQuoteItems() cascade (an Add-on only makes sense
 * paired with a primary that is about to stop existing — see that
 * function's own docblock) and replaces the draft line with the finalised
 * one. The composed item's own top-level identity stays the composable
 * occupant's (tierId: COMPOSABLE_QUOTE_TIER_ID, tierTitle: 'Build Your
 * Own') exactly as today's standalone composable item — truthful, since
 * that occupant genuinely mediated this build; the base's own distinct
 * identity lives in composedBase, never merged into these fields.
 */
export function finaliseUpgradeQuoteDraft(
  items: CartItem[],
  familyId: string,
  tierInstanceId: string,
): CartItem[] {
  const draft = items.find((item): item is FamilyTierQuoteItem => isFamilyTierQuoteItem(item)
    && item.familyId === familyId
    && item.tierInstanceId === tierInstanceId
    && resolveQuoteItemRole(item) === 'composable'
    && !!item.upgradeDraftBase);
  if (!draft) return items;

  const primary = items.find((item): item is FamilyTierQuoteItem => isFamilyTierQuoteItem(item)
    && item.familyId === familyId
    && item.tierInstanceId === tierInstanceId
    && resolveQuoteItemRole(item) === 'primary');
  if (!primary || composableDraftIsStale(draft, items)) return items;

  const composedBase: ComposedUpgradeBase = {
    tierOccupantId: primary.tierOccupantId,
    tierPlatformId: primary.tierPlatformId,
    tierEditionPlatformId: primary.tierEditionPlatformId,
    tierId: primary.tierId as TierId,
    tierTitle: primary.tierTitle,
    tierEditionTitle: primary.tierEditionTitle ?? null,
    inclusionItems: primary.inclusionItems ?? [],
    legPaymentSummaries: primary.legPaymentSummaries ?? [],
    price: primary.price,
    billingCycle: primary.billingCycle,
    minimumTermValue: primary.minimumTermValue,
    minimumTermUnit: primary.minimumTermUnit,
    planDurationMonths: primary.planDurationMonths ?? null,
  };
  const composedUpgrade: ComposedUpgradeExtras = {
    tierOccupantId: draft.tierOccupantId,
    tierPlatformId: draft.tierPlatformId,
    inclusionItems: draft.inclusionItems ?? [],
    legPaymentSummaries: draft.legPaymentSummaries ?? [],
    price: draft.price,
    billingCycle: draft.billingCycle,
    minimumTermValue: draft.minimumTermValue,
    minimumTermUnit: draft.minimumTermUnit,
    composableSelection: draft.composableSelection ?? [],
  };
  const projection = deriveComposedProjection(composedBase, composedUpgrade);

  const finalised: FamilyTierQuoteItem = {
    ...draft,
    ...projection,
    tierId: COMPOSABLE_QUOTE_TIER_ID,
    tierTitle: 'Build Your Own',
    tierEditionPlatformId: null,
    isComposedUpgrade: true,
    composedBase,
    composedUpgrade,
    upgradeDraftBase: undefined,
  };

  // Replace the draft with its finalised form BEFORE removing the primary —
  // removeFamilyTierSystemQuoteItems() itself now prunes a STALE draft
  // (composableDraftIsStale(), above) once its base is gone, and this
  // draft's base is about to be removed by this very call. Finalising
  // first (clearing upgradeDraftBase) makes the line immune to that pruning
  // — a finalised line is never stale — so it survives the removal exactly
  // as today's standalone composable item already does.
  const itemsWithFinalised = items.map((item) => (item === draft ? finalised : item));
  return removeFamilyTierSystemQuoteItems(itemsWithFinalised, familyId, tierInstanceId);
}

/**
 * Add or replace the one normal (non-add-on) selection for item.serviceId —
 * a normal Tier, a promotion, or the legacy recommended bundle. Removes only
 * the existing normal line for that serviceId; every add-on line for that
 * same serviceId (and every line for every other serviceId) is left exactly
 * as it was. This is the rule that lets switching the normal Tier, or
 * selecting a promotion, coexist with already-selected add-ons — same-Tier-
 * System add-on compatibility is implicit, so there is no separate rule set
 * to consult here.
 */
export function replaceNormalQuoteItem(items: CartItem[], item: QuoteItem): CartItem[] {
  return [...items.filter((q) => isFamilyTierQuoteItem(q) || q.isAddon || q.serviceId !== item.serviceId), item];
}

/**
 * Add or update one add-on line, identified by serviceId + tierId. Never
 * touches the normal selection or any other add-on for the same Service.
 */
export function upsertAddonQuoteItem(items: CartItem[], item: QuoteItem): CartItem[] {
  return [
    ...items.filter((q) => isFamilyTierQuoteItem(q) || !(q.isAddon && q.serviceId === item.serviceId && q.tierId === item.tierId)),
    item,
  ];
}

/**
 * Remove exactly one add-on line (serviceId + tierId), leaving the normal
 * selection and every other add-on for the same Service untouched.
 */
export function removeAddonQuoteItem(items: CartItem[], serviceId: number, tierId: QuoteItemTierId): CartItem[] {
  return items.filter((q) => isFamilyTierQuoteItem(q) || !(q.isAddon && q.serviceId === serviceId && q.tierId === tierId));
}

/**
 * Remove a whole Service from the quote: its normal selection AND every
 * add-on selected alongside it. This is also the correct behaviour for
 * deselecting the normal Tier outright (clicking an already-selected Tier to
 * remove it) — add-ons only make sense paired with a normal Tier, so clearing
 * the normal selection clears its add-ons too, rather than leaving them
 * orphaned with nothing to attach to.
 */
export function removeServiceQuoteItems(items: CartItem[], serviceId: number): CartItem[] {
  return items.filter((q) => isFamilyTierQuoteItem(q) || q.serviceId !== serviceId);
}

export interface ClassifiedQuoteItems {
  mainItems: QuoteItem[];
  bundleItems: QuoteItem[];
  tierAddonItems: QuoteItem[];
  familyMainItems: FamilyTierQuoteItem[];
  familyAddonItems: FamilyTierQuoteItem[];
  // The composable ("Build Your Own") occupant's own aggregate line(s) —
  // never merged into familyMainItems: presentation/replacement semantics
  // must not call it "primary", even though a combined commercial total may
  // legitimately aggregate both (see resolveQuoteItemRole()).
  familyComposableItems: FamilyTierQuoteItem[];
}

/**
 * The four explicitly distinct, never-merged cart-line classifications used
 * by OrderSummary: the customer's one normal Tier/promotion per Service, the
 * legacy recommended bundle (still its own negative serviceId, unchanged),
 * real Tier add-ons (isAddon, regardless of serviceId sign — never inferred
 * from it), and the composable occupant's own line, kept apart from
 * familyMainItems by the same resolveQuoteItemRole() every other Family-item
 * mutation in this module already goes through.
 */
export function classifyQuoteItems(items: CartItem[]): ClassifiedQuoteItems {
  const serviceItems = items.filter((item): item is QuoteItem => !isFamilyTierQuoteItem(item));
  const familyItems = items.filter(isFamilyTierQuoteItem);
  return {
    mainItems: serviceItems.filter((item) => item.serviceId > 0 && !item.isAddon),
    bundleItems: serviceItems.filter((item) => item.serviceId < 0),
    tierAddonItems: serviceItems.filter((item) => item.isAddon),
    familyMainItems: familyItems.filter((item) => resolveQuoteItemRole(item) === 'primary'),
    familyAddonItems: familyItems.filter((item) => resolveQuoteItemRole(item) === 'addon'),
    familyComposableItems: familyItems.filter((item) => resolveQuoteItemRole(item) === 'composable'),
  };
}

export interface QuoteTotals {
  pricedItems: CartItem[];
  unpricedItems: CartItem[];
  cycleGroups: Record<string, number>;
  cycleEntries: [string, number][];
  hasMixedCycles: boolean;
  singleCycle: [string, number] | null;
}

export function calcQuoteTotals(items: CartItem[]): QuoteTotals {
  const pricedItems = items.filter((item) => item.price !== null);
  const unpricedItems = items.filter((item) => item.price === null);

  const cycleGroups = pricedItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.billingCycle] = (acc[item.billingCycle] ?? 0) + (item.price as number);
    return acc;
  }, {});

  const cycleEntries = Object.entries(cycleGroups) as [string, number][];
  const hasMixedCycles = cycleEntries.length > 1;
  const singleCycle = cycleEntries.length === 1 ? cycleEntries[0] : null;

  return { pricedItems, unpricedItems, cycleGroups, cycleEntries, hasMixedCycles, singleCycle };
}
