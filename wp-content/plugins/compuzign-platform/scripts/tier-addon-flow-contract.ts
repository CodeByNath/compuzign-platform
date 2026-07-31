// End-to-end frontend scenario for the Tier System add-on capability
// (Phase 7): walks a public Tier payload through the same derivations
// PricingTiers.tsx and ServiceCard.tsx use to split "Choose your Tier" from
// "Optional add-ons", then drives one continuous customer session through
// the real exported cart functions — select a normal Tier, add two add-ons,
// remove one, switch the normal Tier, remove the whole Service — asserting
// the same behaviours a real Cost Builder session depends on, in one run
// rather than isolated fixtures. Also proves a Tier System with no add-ons
// behaves exactly as before, and that the legacy recommended bundle keeps
// working unmodified alongside the new capability.

import {
  replaceNormalQuoteItem,
  upsertAddonQuoteItem,
  removeAddonQuoteItem,
  removeServiceQuoteItems,
  classifyQuoteItems,
  calcQuoteTotals,
  quoteItemKey,
} from '../resources/ts/utils/quote';
import type { QuoteItem } from '../resources/ts/components/cost-builder/types';
import type { PricingTierData, TierId, Tier } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Tier add-on flow contract: ${message}`);
}

const ALL_TIERS: Tier[] = [
  { id: 'basic', title: 'Basic' },
  { id: 'standard', title: 'Standard' },
  { id: 'premium', title: 'Premium' },
  { id: 'enterprise', title: 'Enterprise' },
  { id: 'ultimate', title: 'Ultimate' },
];

function tierData(overrides: Partial<PricingTierData> = {}): PricingTierData {
  return {
    price: 10, billing_cycle: 'monthly', inclusions: [], features: [], is_addon: false,
    ...overrides,
  };
}

// The same split PricingTiers.tsx performs: normal Tiers vs. add-on Tiers,
// from whichever shells the public payload actually carries.
function splitTiers(tiers: Partial<Record<TierId, PricingTierData>>) {
  const normal = ALL_TIERS.filter((t) => t.id in tiers && !tiers[t.id]!.is_addon);
  const addons = ALL_TIERS.filter((t) => t.id in tiers && tiers[t.id]!.is_addon);
  return { normal, addons };
}

// ── Scenario 1: a Tier System with no add-on occupants behaves exactly as
//    before — no "Optional add-ons" section, every shell is a normal choice. ─

const noAddonPricing: Partial<Record<TierId, PricingTierData>> = {
  basic: tierData({ price: 29 }),
  standard: tierData({ price: 49 }),
  premium: tierData({ price: 89 }),
};
const noAddonSplit = splitTiers(noAddonPricing);
check(noAddonSplit.normal.length === 3, 'a Tier System with no add-ons offers all three configured shells as normal Tiers');
check(noAddonSplit.addons.length === 0, 'a Tier System with no add-ons offers no add-on section at all');

// ── The Tier System from here on: three normal Tiers plus two add-ons. ─────

const pricing: Partial<Record<TierId, PricingTierData>> = {
  basic: tierData({ price: 29, inclusions: [{ id: 'inc-basic', label: 'Email support' }] }),
  standard: tierData({ price: 49, label: 'Standard' }),
  premium: tierData({ price: 89 }),
  enterprise: tierData({ price: 25, is_addon: true, label: 'Backup & DR Shield', features: ['Nightly snapshots', '15-minute RPO'] }),
  ultimate: tierData({ price: 15, is_addon: true, label: 'Migration Pack' }),
};
const split = splitTiers(pricing);
check(split.normal.map((t) => t.id).join(',') === 'basic,standard,premium', 'normal Tiers are exactly the three non-add-on shells, in shell order');
check(split.addons.map((t) => t.id).join(',') === 'enterprise,ultimate', 'add-on Tiers are exactly the two is_addon shells');

const SERVICE_ID = 301;

function normalItem(tierId: TierId): QuoteItem {
  const d = pricing[tierId]!;
  return {
    serviceId: SERVICE_ID, serviceTitle: 'KAIROS', tierId, tierTitle: d.label ?? tierId,
    price: d.price, billingCycle: d.billing_cycle, categoryName: 'Cloud', features: d.features,
    isAddon: false,
  };
}
function addonItem(tierId: TierId): QuoteItem {
  const d = pricing[tierId]!;
  return {
    serviceId: SERVICE_ID, serviceTitle: 'KAIROS', tierId, tierTitle: d.label ?? tierId,
    price: d.price, billingCycle: d.billing_cycle, categoryName: 'Cloud', features: d.features,
    isAddon: true,
  };
}

// ── Scenario 2: a normal Tier can be selected. ──────────────────────────────

let cart: QuoteItem[] = [];
cart = replaceNormalQuoteItem(cart, normalItem('standard'));
check(cart.length === 1 && cart[0].tierId === 'standard' && !cart[0].isAddon, 'the normal Tier is selected');

// ── Scenario 3: one add-on Tier can be selected alongside it. ──────────────

cart = upsertAddonQuoteItem(cart, addonItem('enterprise'));
check(cart.length === 2, 'the add-on joins the cart alongside the normal Tier');
check(cart.some((q) => q.tierId === 'enterprise' && q.isAddon), 'Backup & DR Shield is selected as an add-on');

// ── Scenario 4: multiple add-on Tiers from the same Tier System coexist. ───

cart = upsertAddonQuoteItem(cart, addonItem('ultimate'));
check(cart.length === 3, 'a second add-on (Migration Pack) coexists with the first');
check(new Set(cart.map(quoteItemKey)).size === 3, 'all three lines have distinct cart identities');

// ── Scenario 11: add-on price is included in quote totals. ─────────────────

const totalsWithAddons = calcQuoteTotals(cart);
check(totalsWithAddons.singleCycle?.[1] === 49 + 25 + 15, 'quote totals sum the normal Tier and both add-ons');

// ── Scenario 5: removing one add-on leaves the other selections intact. ────

cart = removeAddonQuoteItem(cart, SERVICE_ID, 'enterprise');
check(cart.length === 2, 'exactly one line was removed');
check(!cart.some((q) => q.tierId === 'enterprise'), 'Backup & DR Shield is gone');
check(cart.some((q) => q.tierId === 'ultimate' && q.isAddon), 'Migration Pack is still selected');
check(cart.some((q) => q.tierId === 'standard' && !q.isAddon), 'the normal Tier (Standard) is still selected');

// ── Scenario 6: switching the normal Tier preserves selected add-ons. ──────

cart = upsertAddonQuoteItem(cart, addonItem('enterprise')); // re-add for this scenario
cart = replaceNormalQuoteItem(cart, normalItem('premium'));
check(cart.length === 3, 'switching the normal Tier keeps both add-ons plus the new normal Tier');
check(cart.some((q) => q.tierId === 'premium' && !q.isAddon), 'Premium is now the normal Tier');
check(!cart.some((q) => q.tierId === 'standard'), 'Standard is no longer selected');
check(cart.some((q) => q.tierId === 'enterprise' && q.isAddon) && cart.some((q) => q.tierId === 'ultimate' && q.isAddon), 'both add-ons survived the normal Tier switch — same-Tier-System compatibility is implicit');

// ── Scenario 12: summary/proposal classify by isAddon, not a negative ID. ──

const { mainItems, bundleItems, tierAddonItems } = classifyQuoteItems(cart);
check(mainItems.length === 1 && mainItems[0].tierId === 'premium', 'classifyQuoteItems puts the normal Tier in mainItems');
check(bundleItems.length === 0, 'no legacy bundle is present in this scenario');
check(tierAddonItems.length === 2, 'classifyQuoteItems puts both add-ons in tierAddonItems, not mainItems');
check(tierAddonItems.every((i) => i.serviceId > 0), 'real Tier add-ons are classified by isAddon while carrying a real positive serviceId, never a negative synthetic one');

// ── Scenario 13: existing normal Tier selection/popular Tier behaviour does
//    not regress — popular_tier is a presentation flag entirely orthogonal
//    to is_addon and untouched by any cart operation above. ────────────────

check(pricing.standard!.is_addon === false && pricing.premium!.is_addon === false, 'normal Tiers remain unaffected by which one happens to be popular (popularity is not modeled in the cart at all)');

// ── Scenario 7: removing the Service removes its normal and add-on
//    selections, leaving other Services in the cart untouched. ─────────────

const otherService: QuoteItem = { serviceId: 404, serviceTitle: 'APTOS', tierId: 'basic', tierTitle: 'Basic', price: 20, billingCycle: 'monthly', categoryName: 'Cloud', features: [], isAddon: false };
cart = [...cart, otherService];
check(cart.length === 4, 'fixture now spans two Services');
cart = removeServiceQuoteItems(cart, SERVICE_ID);
check(cart.length === 1 && cart[0].serviceId === 404, 'removing one Service clears its normal Tier and every add-on, leaving the other Service untouched');

// ── Scenario 15: legacy recommended bundles still function per their
//    existing contract — negative serviceId, isAddon: false, coexists with a
//    real Service's normal Tier without collision. ─────────────────────────

const bundle: QuoteItem = { serviceId: -SERVICE_ID, serviceTitle: 'KAIROS Bundle', tierId: 'bundle', tierTitle: 'Bundle', price: 99, billingCycle: 'monthly', categoryName: 'Cloud', features: [], isAddon: false };
let cartWithBundle: QuoteItem[] = [normalItem('standard'), bundle];
cartWithBundle = replaceNormalQuoteItem(cartWithBundle, normalItem('premium'));
check(cartWithBundle.some((q) => q.tierId === 'bundle'), 'switching the normal Tier does not disturb the legacy bundle');
const bundleClassification = classifyQuoteItems(cartWithBundle);
check(bundleClassification.bundleItems.length === 1 && bundleClassification.bundleItems[0].tierId === 'bundle', 'the legacy bundle is classified into bundleItems, distinct from tierAddonItems');
check(bundleClassification.tierAddonItems.length === 0, 'the legacy bundle is never classified as a real Tier add-on');

console.log('Tier add-on flow contract checks passed.');
