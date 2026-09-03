import type { CartItem, FamilyTierQuoteItem, QuoteItem, QuoteItemTierId } from '@/components/cost-builder/types';

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
  return [
    ...items.filter((existing) => isFamilyTierQuoteItem(existing)
      // Replacing the primary must never disturb an existing Add-on OR an
      // existing composable line for the same Family+Instance — only the
      // prior primary line itself is dropped.
      ? resolveQuoteItemRole(existing) !== 'primary' || familyTierSystemKey(existing) !== systemKey
      : true),
    item,
  ];
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
 * never a composable line: unlike an Add-on, a composable ("Build Your
 * Own") selection is designed to stand alone with no primary Tier at all
 * (the composable browser's own 'build_your_own' context), so clearing the
 * primary must not also clear it, unlike the existing Add-on-orphan
 * cascade this function already performs.
 */
export function removeFamilyTierSystemQuoteItems(
  items: CartItem[],
  familyId: string,
  tierInstanceId: string,
): CartItem[] {
  return items.filter((item) => !isFamilyTierQuoteItem(item)
    || item.familyId !== familyId
    || item.tierInstanceId !== tierInstanceId
    || resolveQuoteItemRole(item) === 'composable');
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
