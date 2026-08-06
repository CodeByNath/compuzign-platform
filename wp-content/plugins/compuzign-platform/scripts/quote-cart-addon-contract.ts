// Contract: the quote cart's identity and mutation rules once a Service can
// carry one normal selection plus zero or more Tier add-ons at once (Tier
// System add-on capability, Phase 5).
//
// serviceId alone stopped being a unique cart-line identity the moment a
// second selectable line (an add-on) could exist for the same Service. Every
// rule here is enforced by utils/quote.ts's pure helpers, the same functions
// CostBuilderApp.tsx calls — so this exercises the real cart logic, not a
// reimplementation of it.

import {
  replaceNormalQuoteItem,
  upsertAddonQuoteItem,
  removeAddonQuoteItem,
  removeServiceQuoteItems,
  quoteItemKey,
  calcQuoteTotals,
} from '../resources/ts/utils/quote';
import type { QuoteItem } from '../resources/ts/components/cost-builder/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Quote cart add-on contract: ${message}`);
}

function item(partial: Partial<QuoteItem> & { serviceId: number; tierId: QuoteItem['tierId'] }): QuoteItem {
  return {
    serviceTitle: 'Service',
    tierTitle: 'Tier',
    price: 10,
    billingCycle: 'monthly',
    categoryName: 'Category',
    features: [],
    isAddon: false,
    minimumTermValue: null,
    minimumTermUnit: null,
    ...partial,
  };
}

const standard = item({ serviceId: 101, tierId: 'standard', tierTitle: 'Standard', price: 49 });
const premium = item({ serviceId: 101, tierId: 'premium', tierTitle: 'Premium', price: 89 });
const backupAddon = item({ serviceId: 101, tierId: 'enterprise', tierTitle: 'Backup & DR Shield', price: 25, isAddon: true });
const migrationAddon = item({ serviceId: 101, tierId: 'ultimate', tierTitle: 'Migration Pack', price: 15, isAddon: true });
const otherServiceNormal = item({ serviceId: 202, tierId: 'basic', tierTitle: 'Other Service Basic', price: 20 });

// ── Selecting a normal Tier replaces only the existing normal line ─────────

let cart: QuoteItem[] = [];
cart = replaceNormalQuoteItem(cart, standard);
check(cart.length === 1 && cart[0].tierId === 'standard', 'selecting a normal Tier adds it');

cart = upsertAddonQuoteItem(cart, backupAddon);
cart = upsertAddonQuoteItem(cart, migrationAddon);
check(cart.length === 3, 'two add-ons coexist alongside the normal Tier');

// This is the documented rule: switching the normal Tier preserves the
// currently selected add-ons, because same-Tier-System compatibility is
// implicit — there is no compatibility check to fail.
cart = replaceNormalQuoteItem(cart, premium);
check(cart.length === 3, 'switching the normal Tier does not drop the item count');
check(cart.some((q) => q.tierId === 'premium' && !q.isAddon), 'the new normal Tier (premium) is now selected');
check(!cart.some((q) => q.tierId === 'standard'), 'the old normal Tier (standard) is gone');
check(cart.some((q) => q.tierId === 'enterprise' && q.isAddon), 'the Backup & DR Shield add-on survives switching the normal Tier');
check(cart.some((q) => q.tierId === 'ultimate' && q.isAddon), 'the Migration Pack add-on survives switching the normal Tier');

// ── Multiple add-ons for the same Service coexist independently ────────────

check(quoteItemKey(cart.find((q) => q.tierId === 'enterprise')!) !== quoteItemKey(cart.find((q) => q.tierId === 'ultimate')!), 'two add-ons for the same Service have distinct cart-line identities');
check(quoteItemKey(cart.find((q) => q.tierId === 'premium')!) !== quoteItemKey(cart.find((q) => q.tierId === 'enterprise')!), 'the normal Tier and an add-on for the same Service have distinct identities');

// Re-adding the same add-on (e.g. re-clicking a stale card) upserts, not duplicates.
cart = upsertAddonQuoteItem(cart, { ...backupAddon, price: 30 });
check(cart.filter((q) => q.tierId === 'enterprise').length === 1, 'upserting the same add-on again does not duplicate it');
check(cart.find((q) => q.tierId === 'enterprise')?.price === 30, 'upserting the same add-on again updates its data');

// ── Removing one add-on leaves the other selections intact ─────────────────

cart = removeAddonQuoteItem(cart, 101, 'enterprise');
check(cart.length === 2, 'removing one add-on removes exactly one line');
check(!cart.some((q) => q.tierId === 'enterprise'), 'the removed add-on is gone');
check(cart.some((q) => q.tierId === 'ultimate' && q.isAddon), 'the other add-on (Migration Pack) is untouched');
check(cart.some((q) => q.tierId === 'premium' && !q.isAddon), 'the normal Tier (premium) is untouched');

// ── Removing the whole Service removes the normal Tier and every add-on ────

cart = upsertAddonQuoteItem(cart, backupAddon);
cart = [...cart, otherServiceNormal];
check(cart.length === 4, 'fixture now has premium + 2 add-ons for service 101, plus a normal item for service 202');
cart = removeServiceQuoteItems(cart, 101);
check(cart.length === 1 && cart[0].serviceId === 202, 'removing a Service removes its normal Tier and every add-on, leaving other Services untouched');

// ── Legacy recommended-bundle items (negative serviceId) never collide ─────

const bundle = item({ serviceId: -101, tierId: 'bundle', tierTitle: 'Bundle', isAddon: false });
let cartWithBundle: QuoteItem[] = [standard, bundle];
cartWithBundle = replaceNormalQuoteItem(cartWithBundle, premium);
check(cartWithBundle.some((q) => q.tierId === 'bundle'), 'the legacy bundle (a different, negative serviceId) is untouched by a normal Tier switch on the real Service');
check(quoteItemKey(bundle) !== quoteItemKey(standard), 'a bundle line and the real Service normal line never share a cart-line identity');

// ── Totals sum every line regardless of isAddon, same as before ────────────

const totals = calcQuoteTotals([premium, migrationAddon]);
check(totals.singleCycle?.[1] === 89 + 15, 'totals include add-on price alongside the normal Tier price');

console.log('Quote cart add-on contract checks passed.');
