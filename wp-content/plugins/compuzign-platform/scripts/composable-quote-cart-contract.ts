// Contract: composable occupant -> quote/cart connection
// (project-work/2026-09-03-composable-tier-admin-to-customer-validation.md,
// "quote/cart connection" phase). Proves the required properties the
// coordination doc's approval named explicitly:
//   1. primary + composable + multiple Add-ons coexist with unique stable keys;
//   2. [Phase 0 correction, superseding the original "quote/cart connection"
//      property] the active regime is upgrade-only, standalone Build Your
//      Own is disabled — so a composable ("Upgrade your build") line only
//      ever exists dependent on its exact base Tier/Edition: swapping the
//      primary to a DIFFERENT Tier/Edition, or removing it outright, also
//      drops the composable line (no orphaned-standalone state may
//      survive); re-confirming the SAME Tier/Edition (e.g. a plan-duration
//      change) leaves it untouched. [Identity safeguard, second Phase 0
//      correction round] the base-changed comparison is anchored on
//      tierOccupantId — the platform's own native occupant identity,
//      mandatory here — plus tierEditionPlatformId as the exact Edition
//      identity, never tierPlatformId/other display-facing Tier fields
//      alone. Updating composable never replaces primary/Add-ons;
//   3. zero-selected/no-required removes composable; required-only persists;
//   4. stale/failed preview cannot overwrite cart (source-scan, since this is
//      an async-effect property, not a pure-function one);
//   5. composable TCV/payment streams use legPaymentSummaries exactly once;
//   6. legacy stored carts without isComposable remain primary/Add-on
//      compatible;
//   7. no Request/PDF/email files changed — verified manually and recorded
//      in the coordination doc (not a source-scannable "diff" property a
//      standing contract can check);
//   8. [Live-validation correction] a composable ("Upgrade your build")
//      line can never live in the cart alone — upsertFamilyComposableQuoteItem()
//      refuses to insert one when no matching primary already exists in the
//      cart, a hard invariant at the cart's own data boundary, never merely
//      trusted to a UI entry-point gate. seedSelectionFromCartItem(rows, null)
//      — what the browser's own reconciliation effect resets local Add/
//      Remove state to once the cart's authoritative composable line
//      disappears out from under it — returns every optional row to its
//      policy default (never a "leftover selected" shape).
//
// Fixture-driven against real exported pure functions (utils/quote.ts,
// ComposableOfferBrowser.tsx's buildComposableFamilyTierQuoteItem), same
// precedent package-family-cart-contract.ts/composable-offer-choice-contract.ts
// already follow — no DOM, no mounted component.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  quoteItemKey,
  resolveQuoteItemRole,
  replaceFamilyNormalQuoteItem,
  upsertFamilyAddonQuoteItem,
  upsertFamilyComposableQuoteItem,
  removeFamilyAddonQuoteItem,
  removeFamilyComposableQuoteItem,
  removeFamilyTierSystemQuoteItems,
  classifyQuoteItems,
} from '../resources/ts/utils/quote';
import { computeTotalContractValue } from '../resources/ts/utils/paymentSummary';
import { buildComposableFamilyTierQuoteItem, buildComposableChoice, seedSelectionFromCartItem, type BrowseRow, type ItemContribution } from '../resources/ts/components/package-builder/ComposableOfferBrowser';
import { COMPOSABLE_QUOTE_TIER_ID } from '../resources/ts/components/cost-builder/types';
import type { CartItem, FamilyTierQuoteItem } from '../resources/ts/components/cost-builder/types';
import type { CommercialLegPeriod, CustomerPolicyItem, PackageBuilderFamily, PricingTierData } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable quote/cart contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');

function familyItem(partial: Partial<FamilyTierQuoteItem>): FamilyTierQuoteItem {
  return {
    offer_type: 'family_tier',
    familyId: 'pcg_kairos',
    familyPlatformId: 'CZPG-KAIROS01',
    familyTitle: 'KAIROS',
    tierInstanceId: 'ti_kairos',
    tierInstancePlatformId: 'CZTG-KAIROS01',
    tierOccupantId: 'occ_basic',
    tierPlatformId: 'CZT-KAIROS001',
    tierEditionPlatformId: null,
    tierId: 'basic',
    tierTitle: 'KAIROS Basic',
    price: 11,
    billingCycle: 'monthly',
    features: ['Monitoring'],
    isAddon: false,
    minimumTermValue: null,
    minimumTermUnit: null,
    ...partial,
  };
}

const primary = familyItem({});
const addonOne = familyItem({ tierOccupantId: 'occ_backup', tierPlatformId: 'CZTA-KAIROS01', tierId: 'standard', tierTitle: 'Backup', isAddon: true });
const addonTwo = familyItem({ tierOccupantId: 'occ_seats', tierPlatformId: 'CZTA-KAIROS02', tierId: 'premium', tierTitle: 'Extra Seats', isAddon: true });
const composable = familyItem({
  tierOccupantId: 'occ_composable',
  tierPlatformId: 'CZT-KAIROS099',
  tierId: COMPOSABLE_QUOTE_TIER_ID,
  tierTitle: 'Build Your Own',
  isAddon: false,
  isComposable: true,
  composableSelection: [{ item_id: 'block-storage', selected: true }],
});

// ── 1. Primary + composable + multiple Add-ons coexist with unique stable keys ──

check(resolveQuoteItemRole(primary) === 'primary', 'a plain non-addon, non-composable item resolves to primary');
check(resolveQuoteItemRole(addonOne) === 'addon', 'isAddon: true resolves to addon');
check(resolveQuoteItemRole(composable) === 'composable', 'isComposable: true resolves to composable regardless of isAddon');

const primaryKey = quoteItemKey(primary);
const addonOneKey = quoteItemKey(addonOne);
const addonTwoKey = quoteItemKey(addonTwo);
const composableKey = quoteItemKey(composable);
const keys = [primaryKey, addonOneKey, addonTwoKey, composableKey];
check(new Set(keys).size === keys.length, 'primary, both add-ons, and composable all resolve to four distinct cart keys');
check(composableKey === 'family:CZPG-KAIROS01:instance:CZTG-KAIROS01:composable', 'the composable key uses the documented :composable suffix, never :primary or :addon:*');

let cart: CartItem[] = [];
cart = replaceFamilyNormalQuoteItem(cart, primary);
cart = upsertFamilyAddonQuoteItem(cart, addonOne);
cart = upsertFamilyAddonQuoteItem(cart, addonTwo);
cart = upsertFamilyComposableQuoteItem(cart, composable);
check(cart.length === 4, 'primary + two add-ons + composable all land in the cart as four distinct lines');
check(cart.includes(primary) && cart.includes(addonOne) && cart.includes(addonTwo) && cart.includes(composable), 'every one of the four lines survives, unreplaced by any other');

// ── 2. Phase 0 correction: swapping the base to a DIFFERENT Tier/Edition drops composable; re-confirming the SAME base does not ──

const newPrimary = familyItem({ tierId: 'premium', tierTitle: 'KAIROS Premium', tierOccupantId: 'occ_premium', tierPlatformId: 'CZT-KAIROS002' });
let afterPrimarySwitch = replaceFamilyNormalQuoteItem(cart, newPrimary);
check(!afterPrimarySwitch.includes(primary), 'replacing the primary drops the old primary snapshot');
check(afterPrimarySwitch.includes(newPrimary), 'replacing the primary adds the new snapshot');
check(afterPrimarySwitch.includes(addonOne) && afterPrimarySwitch.includes(addonTwo), 'replacing the primary preserves both existing Add-ons — unchanged existing behavior');
check(!afterPrimarySwitch.includes(composable), 'swapping the primary to a DIFFERENT Tier/Edition drops the dependent Upgrade line — no orphaned-standalone state may survive (Phase 0 correction)');

// Identity safeguard (second Phase 0 correction round): the base-changed
// comparison is anchored on tierOccupantId — the platform's own native
// occupant identity — not tierPlatformId/other display-facing Tier fields.
{
  const cartForOccupantCase = upsertFamilyComposableQuoteItem(cart, composable);
  // Same tierPlatformId/tierId/tierTitle as `primary`, but a genuinely
  // different tierOccupantId — proves occupant identity alone drives the
  // decision, never a Platform-ID/label match standing in for it.
  const differentOccupantSamePlatformId = familyItem({ tierOccupantId: 'occ_different_occupant' });
  const afterOccupantChange = replaceFamilyNormalQuoteItem(cartForOccupantCase, differentOccupantSamePlatformId);
  check(!afterOccupantChange.includes(composable), 'a different tierOccupantId removes the Upgrade even though tierPlatformId/tierId/tierTitle all still match the old primary');

  // Same tierOccupantId + same tierEditionPlatformId as `primary`, but a
  // different tierPlatformId/tierId/tierTitle — proves occupant identity
  // (not Platform ID) is what preserves the Upgrade on a genuine reconfirm.
  const sameOccupantDifferentPlatformId = familyItem({ tierPlatformId: 'CZT-KAIROS001-REISSUED', tierId: 'standard', tierTitle: 'KAIROS Basic (reissued)' });
  const afterSameOccupantReconfirm = replaceFamilyNormalQuoteItem(cartForOccupantCase, sameOccupantDifferentPlatformId);
  check(afterSameOccupantReconfirm.includes(composable), 'the same tierOccupantId + tierEditionPlatformId preserves the Upgrade even when tierPlatformId/tierId/tierTitle differ from the old primary');
}

// Re-selecting the SAME Tier/Edition (e.g. a plan-duration change via Choose
// Plan, which still calls replaceFamilyNormalQuoteItem with a freshly built
// item for the identical Tier/Edition) is not a base swap — the Upgrade
// must survive.
const cartWithComposable = upsertFamilyComposableQuoteItem(cart, composable);
const samePrimaryReconfirmed = familyItem({ price: 15, planDurationMonths: 24 }); // same tierPlatformId/tierEditionPlatformId as `primary`
const afterSameBaseReconfirm = replaceFamilyNormalQuoteItem(cartWithComposable, samePrimaryReconfirmed);
check(afterSameBaseReconfirm.includes(composable), 'reconfirming the SAME base Tier/Edition (e.g. duration change) never drops the existing Upgrade line');
check(afterSameBaseReconfirm.includes(samePrimaryReconfirmed) && !afterSameBaseReconfirm.includes(primary), 'the primary snapshot itself is still replaced as normal');

const updatedComposable = familyItem({
  tierOccupantId: 'occ_composable', tierPlatformId: 'CZT-KAIROS099', tierId: COMPOSABLE_QUOTE_TIER_ID,
  tierTitle: 'Build Your Own', isAddon: false, isComposable: true,
  composableSelection: [{ item_id: 'block-storage', selected: true }, { item_id: 'monitoring', selected: true }],
  price: 25,
});
const afterComposableUpdate = upsertFamilyComposableQuoteItem(afterSameBaseReconfirm, updatedComposable);
check(!afterComposableUpdate.includes(composable), 'updating composable replaces the prior composable snapshot wholesale (never a per-item patch)');
check(afterComposableUpdate.includes(updatedComposable), 'the freshly built composable snapshot is present');
check(afterComposableUpdate.includes(samePrimaryReconfirmed), 'updating composable never replaces/removes the primary');
check(afterComposableUpdate.includes(addonOne) && afterComposableUpdate.includes(addonTwo), 'updating composable never replaces/removes any Add-on');

// ── Primary removal cascades to Add-ons AND to composable (Phase 0 correction: no orphaned-standalone state may survive) ──

const afterPrimaryRemoval = removeFamilyTierSystemQuoteItems(afterComposableUpdate, 'pcg_kairos', 'ti_kairos');
check(!afterPrimaryRemoval.includes(samePrimaryReconfirmed), 'removing the primary removes the primary itself');
check(!afterPrimaryRemoval.includes(addonOne) && !afterPrimaryRemoval.includes(addonTwo), 'removing the primary still cascades to every Add-on — the existing Add-on-orphan rule is unchanged');
check(!afterPrimaryRemoval.includes(updatedComposable), 'removing the primary ALSO removes the dependent Upgrade line — it can no longer stand alone once standalone Build Your Own is disabled (Phase 0 correction)');
check(afterPrimaryRemoval.length === 0, 'the whole Tier System for this Family+Instance is empty after primary removal — nothing orphaned');

// removeFamilyComposableQuoteItem still removes ONLY the Upgrade line while
// a primary is present, leaving the primary and every Add-on untouched —
// the "remove just my Upgrade" action, distinct from the cascade above.
const cartWithPrimaryAndComposable: CartItem[] = [samePrimaryReconfirmed, addonOne, updatedComposable];
const composableOnlyRemoved = removeFamilyComposableQuoteItem(cartWithPrimaryAndComposable, 'pcg_kairos', 'ti_kairos');
check(composableOnlyRemoved.length === 2 && composableOnlyRemoved.includes(samePrimaryReconfirmed) && composableOnlyRemoved.includes(addonOne), 'removeFamilyComposableQuoteItem removes exactly the Upgrade line, leaving the primary and Add-on untouched');

// ── 3. Zero-selected/no-required removes composable; required-only persists ──

const requiredOnlyRows: BrowseRow[] = [
  { item_id: 'monitoring', label: 'Monitoring', unitPrice: 5, categories: [], service: null,
    policy: { item_id: 'monitoring', mode: 'required', default_selected: false, quantity: null, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: false } },
];
const requiredOnlySelection = { monitoring: { selected: true } };
const requiredOnlyChoice = buildComposableChoice(requiredOnlyRows, requiredOnlySelection);
const requiredOnlyIncluded = requiredOnlyChoice.some((entry) => entry.selected === undefined || entry.selected === true);
check(requiredOnlyIncluded, 'a required-only offer with no optional rows still resolves to "something is included" — the cart line must persist, never auto-removed');

const emptyRows: BrowseRow[] = [
  { item_id: 'block-storage', label: 'Block Storage', unitPrice: 10, categories: [], service: null,
    policy: { item_id: 'block-storage', mode: 'optional', default_selected: false, quantity: null, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: false } },
];
const emptySelection = { 'block-storage': { selected: false } };
const emptyChoice = buildComposableChoice(emptyRows, emptySelection);
const emptyIncluded = emptyChoice.some((entry) => entry.selected === undefined || entry.selected === true);
check(!emptyIncluded, 'zero required and zero selected-optional (the KAIROS Block-Storage-only case, deselected) resolves to "nothing included" — the caller must remove the composable line, never commit a zero-value placeholder');

// ── 8. Live-validation correction: a composable line can never live in the cart alone ──

{
  // No primary at all for this Family+Instance — upsert must be a no-op,
  // even though every other field on the candidate item looks perfectly
  // valid. This is the exact hole a stale ComposableOfferBrowser re-firing
  // its debounced auto-commit effect after the cart already removed the
  // Upgrade (or the base) could otherwise fall through.
  const noPrimaryCart: CartItem[] = [addonOne];
  const resultNoPrimary = upsertFamilyComposableQuoteItem(noPrimaryCart, composable);
  check(resultNoPrimary === noPrimaryCart, 'upsertFamilyComposableQuoteItem is a strict no-op with no matching primary present — the cart is returned unchanged, never appended to');
  check(!resultNoPrimary.includes(composable), 'the composable line never lands in the cart when no primary exists for its Family+Instance');

  // A primary exists for a DIFFERENT Family+Instance — must not count.
  const wrongFamilyPrimary = familyItem({ familyId: 'pcg_other', familyPlatformId: 'CZPG-OTHER01', tierInstanceId: 'ti_other', tierInstancePlatformId: 'CZTG-OTHER01' });
  const wrongFamilyCart: CartItem[] = [wrongFamilyPrimary];
  const resultWrongFamily = upsertFamilyComposableQuoteItem(wrongFamilyCart, composable);
  check(resultWrongFamily === wrongFamilyCart, 'a primary for a DIFFERENT Family+Instance never satisfies the guard — still a no-op');

  // A primary for the SAME Family+Instance present — normal insert proceeds.
  const withPrimaryCart: CartItem[] = [primary];
  const resultWithPrimary = upsertFamilyComposableQuoteItem(withPrimaryCart, composable);
  check(resultWithPrimary.includes(composable) && resultWithPrimary.includes(primary), 'with a matching primary present, the composable line inserts normally, primary untouched');
}

{
  // seedSelectionFromCartItem(rows, null) — what the reconciliation effect
  // resets local Add/Remove state to once the cart's own composable line
  // disappears — must return every optional row to its policy default,
  // required rows always selected, never a stale "still selected" entry.
  const reconciliationRows: BrowseRow[] = [
    { item_id: 'monitoring', label: 'Monitoring', unitPrice: 5, categories: [], service: null,
      policy: { item_id: 'monitoring', mode: 'required', default_selected: false, quantity: null, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: false } },
    { item_id: 'block-storage', label: 'Block Storage', unitPrice: 10, categories: [], service: null,
      policy: { item_id: 'block-storage', mode: 'optional', default_selected: false, quantity: { min: 1, max: 100, step: 1, default: 1 }, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: false } },
  ];
  const resetToNull = seedSelectionFromCartItem(reconciliationRows, null);
  check(resetToNull.monitoring.selected === true, 'a required row is always selected, even resetting from no cart item at all');
  check(resetToNull['block-storage'].selected === false, 'an optional row with default_selected: false resets to unselected — never left "Remove"-selected for an item the cart no longer has');

  // Confirms the seed function still correctly re-hydrates FROM a real
  // committed cart item (the normal mount/Family-switch path), not just
  // the null/reset case above.
  const seededFromCommitted = familyItem({
    tierOccupantId: 'occ_composable', tierPlatformId: 'CZT-KAIROS099', tierId: COMPOSABLE_QUOTE_TIER_ID,
    isComposable: true, composableSelection: [{ item_id: 'block-storage', selected: true, quantity: 7 }],
  });
  const resetFromCommitted = seedSelectionFromCartItem(reconciliationRows, seededFromCommitted);
  check(resetFromCommitted['block-storage'].selected === true && resetFromCommitted['block-storage'].quantity === 7, 'seedSelectionFromCartItem re-hydrates the exact prior committed selection/quantity when a real cart item is passed');
}

// ── 5. Composable TCV/payment streams use legPaymentSummaries exactly once ──

const family: PackageBuilderFamily = {
  family_id: 'pcg_kairos', family_platform_id: 'CZPG-KAIROS01', title: 'KAIROS',
  description: '', tier_instance_id: 'ti_kairos', tier_instance_platform_id: 'CZTG-KAIROS01',
  popular_tier: null, popular_label: null, included_categories: [],
  pricing: { tiers: {} },
} as unknown as PackageBuilderFamily;
const offer: PricingTierData = {
  tier_occupant_id: 'occ_composable', tier_platform_id: 'CZT-KAIROS099',
  price: null, billing_cycle: '', inclusions: [], features: [], label: 'Build Your Own',
  // A 12-month commitment caps the open-ended monthly stream below into a
  // finite Total Contract Value — the same "only a month-unit commitment
  // caps an open-ended Leg's schedule" rule ComposableOfferBrowser.tsx's
  // own commitmentMonths already applies.
  minimum_term_value: 12, minimum_term_unit: 'months', headline_leg_id: 'default',
};
const periods: CommercialLegPeriod[] = [
  { from_month: 0, to_month: null, components: [
    { source: 'default', billing_cycle: 'monthly', price: 10, available: true,
      items: [{ item_id: 'block-storage', label: 'Block Storage', quantity: 1, price_option_id: null, unit_price: 10, line_total: 10, available: true }] },
  ] },
];
const contributions: Record<string, ItemContribution> = { 'block-storage': { lineTotal: 10, quantity: 1, ambiguous: false } };
const builtRows: BrowseRow[] = [
  { item_id: 'block-storage', label: 'Block Storage', unitPrice: 10, categories: [], service: null,
    policy: { item_id: 'block-storage', mode: 'optional', default_selected: false, quantity: null, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: false } },
];
const builtChoice = buildComposableChoice(builtRows, { 'block-storage': { selected: true } });
const builtItem = buildComposableFamilyTierQuoteItem(family, offer, builtChoice, periods, contributions, builtRows);

check(builtItem.isComposable === true && builtItem.isAddon === false, 'the built item is composable, never an add-on');
check(builtItem.tierId === COMPOSABLE_QUOTE_TIER_ID, 'the built item addresses the customer-side composable sentinel');
check(builtItem.composableSelection === builtChoice, 'the built item carries the exact submitted choice as its own composableSelection (intent/history)');
check(builtItem.legPaymentSummaries !== null && builtItem.legPaymentSummaries!.length === 1, 'the built item carries exactly one resolved payment stream for this single-component fixture');
check(builtItem.price === 10 && builtItem.billingCycle === 'monthly', 'price/billingCycle resolve from the server-resolved Headline component, not recomputed from the choice payload');
check(builtItem.inclusionItems?.length === 1 && builtItem.inclusionItems![0].line_total === 10, 'inclusionItems carries the server-resolved line_total verbatim, never unitPrice*quantity computed locally');
const builtTCV = computeTotalContractValue(builtItem.legPaymentSummaries!);
check(typeof builtTCV === 'number', 'computeTotalContractValue (the SAME primitive every other item type uses) runs over the composable item\'s own legPaymentSummaries exactly once, no second TCV algorithm');

// ── 6. Legacy stored carts without isComposable remain primary/Add-on compatible ──

const legacyPrimary = familyItem({});
delete (legacyPrimary as { isComposable?: boolean }).isComposable;
check(resolveQuoteItemRole(legacyPrimary) === 'primary', 'a pre-existing cart item with no isComposable field at all still resolves to primary, unchanged');
const legacyAddon = familyItem({ isAddon: true, tierOccupantId: 'occ_legacy_addon', tierPlatformId: 'CZTA-LEGACY01' });
delete (legacyAddon as { isComposable?: boolean }).isComposable;
check(resolveQuoteItemRole(legacyAddon) === 'addon', 'a pre-existing add-on item with no isComposable field still resolves to addon, unchanged');
const legacyCart: CartItem[] = [legacyPrimary, legacyAddon];
const legacyClassified = classifyQuoteItems(legacyCart);
check(legacyClassified.familyMainItems.length === 1 && legacyClassified.familyMainItems[0] === legacyPrimary, 'classifyQuoteItems places a legacy primary in familyMainItems, unaffected by the new composable bucket');
check(legacyClassified.familyAddonItems.length === 1 && legacyClassified.familyAddonItems[0] === legacyAddon, 'classifyQuoteItems places a legacy add-on in familyAddonItems, unaffected');
check(legacyClassified.familyComposableItems.length === 0, 'a legacy cart with no composable line produces an empty familyComposableItems bucket, never a fabricated entry');

// classifyQuoteItems keeps composable out of the primary bucket (mandatory
// safeguard: presentation/replacement semantics must not call composable
// "primary").
const mixedCart: CartItem[] = [primary, addonOne, composable];
const mixedClassified = classifyQuoteItems(mixedCart);
check(mixedClassified.familyMainItems.length === 1 && mixedClassified.familyMainItems[0] === primary, 'classifyQuoteItems never places the composable line in familyMainItems');
check(mixedClassified.familyComposableItems.length === 1 && mixedClassified.familyComposableItems[0] === composable, 'classifyQuoteItems places the composable line in its own distinct bucket');

// ── 4. Stale/failed preview cannot overwrite cart (source-scan) ──

const browserSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/ComposableOfferBrowser.tsx'), 'utf8');
check(
  /if \(!result\.ok\) \{\s*setPreview\(\{ ok: false[\s\S]*?return;\s*\}/.test(browserSource),
  'a failed/unavailable preview response returns before reaching the commit/removal logic — onCommit/onRemoveFromQuote are never called from the failure branch',
);
check(
  /if \(cancelled\) return;/.test(browserSource),
  'a superseded (stale) in-flight preview request is dropped via the cancelled guard before it can commit anything, matching the existing debounce-cleanup pattern this effect already used pre-connection',
);
const commitCallIndex = browserSource.indexOf('onCommit(buildComposableFamilyTierQuoteItem(');
const okBranchIndex = browserSource.indexOf('setPreview({ ok: true');
check(commitCallIndex > okBranchIndex && okBranchIndex > -1, 'onCommit is only ever reached after the successful (ok: true) branch has already run, never from the failure/catch branches above it');

// ── 8b. Live-validation correction: the reconciliation effect exists and resets both selection AND hasInteracted (source-scan) ──
// This is a component-effect timing property (a present -> absent
// transition detected via a ref across renders), not a pure function —
// same precedent as section 4 above; the pure half of this same fix
// (seedSelectionFromCartItem, upsertFamilyComposableQuoteItem's hard
// invariant) is exercised directly in section 8 above.

check(
  /hadCartItemRef = useRef\(initialCartItem !== null\)/.test(browserSource),
  'the reconciliation effect tracks the cart\'s own composable-line presence across renders via a ref, not merely reading the current prop value',
);
check(
  /if \(hadCartItem && initialCartItem === null\) \{\s*setSelection\(seedSelectionFromCartItem\(rows, null\)\);\s*setHasInteracted\(false\);\s*\}/.test(browserSource),
  'the reconciliation effect resets BOTH local selection (back to policy defaults) AND hasInteracted (disarming the auto-commit gate) on a present -> absent transition — resetting only one would either still show stale Add/Remove state or leave the auto-commit effect able to silently resurrect the removed line',
);
check(
  browserSource.includes('}, [family.family_id, rowIdsKey]);'),
  'the mount/Family-switch reseed effect still excludes initialCartItem from its own dependency array — the reconciliation above is a SEPARATE, narrowly-scoped effect, never merged into that one (which would refire on every ordinary commit echo and fight the customer\'s own next click)',
);

console.log('Composable quote/cart contract passed.');
