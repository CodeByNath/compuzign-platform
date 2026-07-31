import type { QuoteItem, QuoteItemTierId } from '@/components/cost-builder/types';

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
export function quoteItemKey(item: QuoteItem): string {
  return item.isAddon ? `${item.serviceId}:addon:${item.tierId}` : `${item.serviceId}:primary`;
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
export function replaceNormalQuoteItem(items: QuoteItem[], item: QuoteItem): QuoteItem[] {
  return [...items.filter((q) => q.isAddon || q.serviceId !== item.serviceId), item];
}

/**
 * Add or update one add-on line, identified by serviceId + tierId. Never
 * touches the normal selection or any other add-on for the same Service.
 */
export function upsertAddonQuoteItem(items: QuoteItem[], item: QuoteItem): QuoteItem[] {
  return [
    ...items.filter((q) => !(q.isAddon && q.serviceId === item.serviceId && q.tierId === item.tierId)),
    item,
  ];
}

/**
 * Remove exactly one add-on line (serviceId + tierId), leaving the normal
 * selection and every other add-on for the same Service untouched.
 */
export function removeAddonQuoteItem(items: QuoteItem[], serviceId: number, tierId: QuoteItemTierId): QuoteItem[] {
  return items.filter((q) => !(q.isAddon && q.serviceId === serviceId && q.tierId === tierId));
}

/**
 * Remove a whole Service from the quote: its normal selection AND every
 * add-on selected alongside it. This is also the correct behaviour for
 * deselecting the normal Tier outright (clicking an already-selected Tier to
 * remove it) — add-ons only make sense paired with a normal Tier, so clearing
 * the normal selection clears its add-ons too, rather than leaving them
 * orphaned with nothing to attach to.
 */
export function removeServiceQuoteItems(items: QuoteItem[], serviceId: number): QuoteItem[] {
  return items.filter((q) => q.serviceId !== serviceId);
}

export interface ClassifiedQuoteItems {
  mainItems: QuoteItem[];
  bundleItems: QuoteItem[];
  tierAddonItems: QuoteItem[];
}

/**
 * The three explicitly distinct, never-merged cart-line classifications used
 * by both OrderSummary and QuoteProposalPreview: the customer's one normal
 * Tier/promotion per Service, the legacy recommended bundle (still its own
 * negative serviceId, unchanged), and real Tier add-ons (isAddon, regardless
 * of serviceId sign — never inferred from it).
 */
export function classifyQuoteItems(items: QuoteItem[]): ClassifiedQuoteItems {
  return {
    mainItems: items.filter((item) => item.serviceId > 0 && !item.isAddon),
    bundleItems: items.filter((item) => item.serviceId < 0),
    tierAddonItems: items.filter((item) => item.isAddon),
  };
}

export interface QuoteTotals {
  pricedItems: QuoteItem[];
  unpricedItems: QuoteItem[];
  cycleGroups: Record<string, number>;
  cycleEntries: [string, number][];
  hasMixedCycles: boolean;
  singleCycle: [string, number] | null;
}

export function calcQuoteTotals(items: QuoteItem[]): QuoteTotals {
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
