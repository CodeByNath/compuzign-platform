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
//      Remove state to once the cart's authoritative composable line OR the
//      primary itself disappears out from under it — returns every optional
//      row to its policy default (never a "leftover selected" shape).
//   9. [Live-validation correction, 2nd round] the Upgrade engine cannot be
//      fired at all without an exact ready primary already present — the
//      Add/Remove control and the debounced auto-commit effect both derive
//      a hasReadyPrimary boundary check straight from a primaryItem prop
//      (never re-derived from context/any other proxy) and refuse to
//      start preview/pricing/persistence/projection without it, enforced
//      independently of FamilyTierAdapter.tsx's own render gate.
//   10. [Live-validation correction, "live customer UI corrections" round]
//      the Upgrade quote detail table carries Unit Price/Total columns
//      identical to the established Tier detail table (never a second
//      pricing source); every quote line/Total Commitment row gets the
//      SAME shared InclusionDisclosure chevron/× quick view (source-scan,
//      an interactive component); the compact selection list's Add/Remove
//      control is icon-only with an accessible name/tooltip, preserving
//      the ready-primary disabled/early-return guard from item 9 above.
//   11. [Auditor correction, "UI CORRECTION FOLLOW-UP" round] QuoteDetailsOverlay.tsx's
//      three remaining item.tierTitle fallbacks (the quoted-plan chip,
//      ComposablePlanDetails' Plan Tier row, the Total Commitment row) all
//      read "Upgrades" — via the SAME composableCoexistsWithPrimary() check
//      QuoteSummary.tsx's own quote-line label already uses — for a
//      composable line with a sibling primary, never leaking the raw
//      Build Your Own occupant title on this customer surface. The
//      composable-quote-cart-loop-regression.mjs fixture is migrated to
//      seed a ready primary before mounting (the active architecture's
//      Upgrade engine refuses to act without one) rather than staying a
//      knowingly-failing standalone-only regression; doing so surfaced a
//      genuine redundant-preview-call defect in the reconciliation effect
//      (it could not tell a self-caused Remove-to-zero from an external
//      cart removal, despite its own docblock already saying it should),
//      fixed via a one-shot selfCausedRemovalRef consumed by that effect.
//   12. [Auditor correction, "deployed customer validation failed" round]
//      the shared money formatter (utils/format.ts::formatPrice()) no
//      longer rounds every price to a whole dollar — covered by its own
//      dedicated money-format-contract.ts, not repeated here. The quote
//      inclusion quick view (InclusionDisclosure.tsx) is redesigned:
//      in-flow expansion (never a floating/absolute overlay), a
//      project-standard inline-SVG chevron (never a text glyph), a real
//      Inclusion/Qty/Price table (Qty plain numeric, no × prefix; Price is
//      the authoritative row line_total when present, never invented),
//      and a right-aligned Total summing only the displayed priced rows.
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
import { disclosureRowsForFamilyTierItem } from '../resources/ts/components/cost-builder/InclusionDisclosure';
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
const contributions: Record<string, ItemContribution> = { 'block-storage': { lineTotal: 10, quantity: 1, ambiguous: false, billingCycle: 'monthly' } };
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

// ── 8b. Live-validation correction: the reconciliation effect exists and resets both selection AND hasInteracted on EITHER trigger (source-scan) ──
// This is a component-effect timing property (present -> absent
// transitions detected via refs across renders), not a pure function —
// same precedent as section 4 above; the pure half of this same fix
// (seedSelectionFromCartItem, upsertFamilyComposableQuoteItem's hard
// invariant) is exercised directly in section 8 above.

check(
  /hadCartItemRef = useRef\(initialCartItem !== null\)/.test(browserSource),
  'the reconciliation effect tracks the cart\'s own composable-line presence across renders via a ref, not merely reading the current prop value',
);
check(
  /hadReadyPrimaryRef = useRef\(hasReadyPrimary\)/.test(browserSource),
  'the reconciliation effect ALSO tracks primary readiness across renders via its own ref — a customer can interact before ever having a committed Upgrade line, so the cart-item ref alone cannot catch a primary disappearing',
);
const reconciliationBlockMatch = browserSource.match(
  /if \(cartItemJustRemoved \|\| primaryJustRemoved\) \{([\s\S]*?)\n {4}\}/,
);
check(
  /const cartItemJustRemoved = hadCartItem && initialCartItem === null;/.test(browserSource)
    && /const primaryJustRemoved = hadReadyPrimary && !hasReadyPrimary;/.test(browserSource)
    && !!reconciliationBlockMatch
    && /setSelection\(seedSelectionFromCartItem\(rows, null\)\);/.test(reconciliationBlockMatch[1])
    && /setHasInteracted\(false\);/.test(reconciliationBlockMatch[1]),
  'the reconciliation effect resets BOTH local selection (back to policy defaults) AND hasInteracted (disarming the auto-commit gate) whenever EITHER the cart\'s composable line OR the primary itself transitions present -> absent — resetting only one field, or reacting to only one trigger, would leave a gap the live-validation findings already caught',
);
// ── 8b-ii. Live-gate correction (2026-09-05, "filter option catalog
// collapses after selection" / stuck-filter finding): the SAME reconciliation
// branch (a completed transaction clears the cart without unmounting this
// component) must ALSO reset Category/Service/Sort/page back to fresh-route
// defaults — otherwise a customer returning to Pricing after checkout sees a
// stale filter (e.g. a malformed/truncated value) with no obvious way to see
// every eligible Upgrade item again.
check(
  !!reconciliationBlockMatch
    && /setCategory\(''\);/.test(reconciliationBlockMatch[1])
    && /setService\(''\);/.test(reconciliationBlockMatch[1])
    && /setSort\('featured'\);/.test(reconciliationBlockMatch[1])
    && /setPage\(0\);/.test(reconciliationBlockMatch[1]),
  'the same reconciliation branch that resets selection/hasInteracted on a genuine external clear must also reset Category/Service/Sort/page to their fresh-route defaults (All Categories, All Services, Featured, page 1) — a completed transaction must not leave the Upgrade browser stuck on a stale filter',
);
check(
  browserSource.includes('}, [family.family_id, rowIdsKey]);'),
  'the mount/Family-switch reseed effect still excludes initialCartItem from its own dependency array — the reconciliation above is a SEPARATE, narrowly-scoped effect, never merged into that one (which would refire on every ordinary commit echo and fight the customer\'s own next click)',
);

// ── 8c. Live-validation correction (2nd round): Add/Remove and the auto-commit effect refuse to act without an exact ready primary (source-scan) ──
// The auditor's exact finding: with the cart empty (no primary), the
// Upgrade card still showed an enabled Add button, and clicking it could
// locally reach "Remove"/a subtotal even though the cart correctly refused
// to represent it (an Upgrade-engine misfire, not a cart defect). Fixed at
// both the render gate (FamilyTierAdapter.tsx, unchanged this round) and
// here, independently, per the auditor's explicit "enforced at both UI and
// Upgrade-engine/domain boundaries" requirement.

check(
  /const hasReadyPrimary = primaryItem !== null;/.test(browserSource),
  'hasReadyPrimary is derived directly from the primaryItem prop — the domain-boundary readiness signal, not re-derived from context or any other proxy',
);
check(
  /if \(!hasReadyPrimary\) return;/.test(browserSource),
  'the debounced auto-commit effect bails out before starting a preview request at all when there is no ready primary — not merely before the eventual onCommit/onRemoveFromQuote call at the end of it',
);
check(
  browserSource.includes('hasInteracted, onCommit, onRemoveFromQuote, hasReadyPrimary]);'),
  'hasReadyPrimary is a dependency of the auto-commit effect — a primary disappearing mid-debounce tears down any in-flight preview request via this effect\'s own cleanup, exactly like a Family switch already does',
);
const addButtonSection = browserSource.slice(browserSource.indexOf('<button'), browserSource.indexOf('</button>'));
check(
  /disabled=\{!hasReadyPrimary\}/.test(addButtonSection) && /if \(!hasReadyPrimary\) return;/.test(addButtonSection),
  'the Add/Remove button is disabled AND its own click handler independently refuses to act without a ready primary — belt and suspenders against a stale handler or programmatic dispatch bypassing the disabled attribute',
);

// ── 10. Live-validation correction ("live customer UI corrections" round) — source-scan ──

const quoteDetailsOverlaySource = readFileSync(resolve(root, 'resources/ts/components/package-builder/QuoteDetailsOverlay.tsx'), 'utf8');
const quoteSummarySource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/QuoteSummary.tsx'), 'utf8');
const inclusionDisclosureSource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/InclusionDisclosure.tsx'), 'utf8');

// 10a. Upgrade detail table: Unit Price/Total columns, sourced from the
// item's own stored inclusionItems snapshot (unit_price/line_total) — never
// a second pricing source, matching PlanDetailsModal.tsx's ItemBreakdownTable.
const composableTableSection = quoteDetailsOverlaySource.slice(
  quoteDetailsOverlaySource.indexOf('function ComposableInclusionsTable'),
  quoteDetailsOverlaySource.indexOf('function ComposablePlanDetails'),
);
check(
  /<th>Unit Price<\/th>/.test(composableTableSection) && /<th>Total<\/th>/.test(composableTableSection),
  'the Upgrade detail table (ComposableInclusionsTable) has Unit Price and Total column headers, matching the established Tier detail table',
);
check(
  /formatMoney\(inclusion\.unit_price \?\? null\)/.test(composableTableSection)
    && /formatMoney\(inclusion\.line_total \?\? null\)/.test(composableTableSection),
  'the Upgrade detail table\'s Unit Price/Total cells read the quoted item\'s own stored inclusionItems.unit_price/line_total verbatim — never a second re-derivation of pricing in presentation code',
);

// 10b. One shared InclusionDisclosure toggle/panel pair, coordinated by
// the shared useSingleOpenDisclosure() hook — closes on outside click,
// used by BOTH the per-quote-line quick view and Total Commitment.
check(
  /aria-expanded=\{open\}/.test(inclusionDisclosureSource) && inclusionDisclosureSource.includes('setOpenKey(null)'),
  'InclusionDisclosure exposes its open state via aria-expanded and closes on an outside pointerdown',
);
check(
  quoteSummarySource.includes('<InclusionDisclosureToggle') && quoteSummarySource.includes('<InclusionDisclosurePanel'),
  'QuoteSummary.tsx renders the shared InclusionDisclosureToggle/Panel on its quote lines',
);
check(
  quoteDetailsOverlaySource.includes('<InclusionDisclosureToggle') && quoteDetailsOverlaySource.includes('<InclusionDisclosurePanel'),
  'QuoteDetailsOverlay.tsx renders the SAME shared InclusionDisclosureToggle/Panel on its Total Commitment rows — never a second implementation of the same open/close/outside-click behavior',
);

// 10c. Compact selection list: icon-only Add/Remove with an accessible
// name/tooltip, ready-primary guard from section 8c/9 above preserved.
check(
  /aria-label=\{`\$\{isSelected \? 'Remove' : 'Add'\}/.test(browserSource) && /title=\{isSelected \? 'Remove' : 'Add'\}/.test(browserSource),
  'the compact list\'s icon-only Add/Remove control still carries an accessible name (aria-label) and a native tooltip (title), even though its visible glyph is now +/×',
);

// ── 11. Auditor correction ("UI CORRECTION FOLLOW-UP" round) — source-scan ──

// 11a. Customer Details no longer leaks Build Your Own: all 3 sites use
// the shared planDisplayLabel() helper, itself built on
// composableCoexistsWithPrimary() — the SAME rule QuoteSummary.tsx's own
// quote-line label already applies, never a second heuristic.
check(
  /function planDisplayLabel\(item: FamilyTierQuoteItem, contextItems: CartItem\[\], fallback: string\): string \{\s*return composableCoexistsWithPrimary\(item, contextItems\) \? 'Upgrades' : fallback;/.test(quoteDetailsOverlaySource),
  'QuoteDetailsOverlay.tsx defines planDisplayLabel() on top of the SAME composableCoexistsWithPrimary() check QuoteSummary.tsx already uses for its own quote-line label',
);
const planDisplayLabelCallCount = (quoteDetailsOverlaySource.match(/planDisplayLabel\(item, items,/g) ?? []).length;
check(
  planDisplayLabelCallCount === 3,
  `all 3 customer-facing sites (quoted-plan tab chip, ComposablePlanDetails' Plan Tier row, Total Commitment row) call planDisplayLabel — found ${planDisplayLabelCallCount}`,
);
check(
  !/<dd>\{item\.tierTitle\}<\/dd>/.test(quoteDetailsOverlaySource),
  'ComposablePlanDetails\' Plan Tier row no longer falls back to the raw item.tierTitle unconditionally',
);

// 11b. composable-quote-cart-loop-regression.mjs is migrated to the active
// architecture (a ready primary seeded before mount), not left as a
// knowingly-failing standalone-only regression.
const loopRegressionSource = readFileSync(resolve(root, 'scripts/composable-quote-cart-loop-regression.mjs'), 'utf8');
check(
  loopRegressionSource.includes('PRIMARY_ITEM') && loopRegressionSource.includes("nativeSetItem.call(window.localStorage, CART_KEY"),
  'the loop regression fixture seeds a ready primary Tier into the cart (via the unpatched native setItem, so seeding itself is not counted as a customer interaction) before mounting — the active architecture\'s Upgrade engine refuses to act without one',
);

// 11c. The reconciliation effect distinguishes a self-caused Remove-to-zero
// from an external cart removal — its own docblock always said it should
// ("WITHOUT it having caused that itself"), but the implementation never
// actually checked that until this round's regression migration surfaced
// the redundant-preview-call defect.
check(
  /selfCausedRemovalRef\.current = true;\s*onRemoveFromQuote\(\);/.test(browserSource),
  'the self-caused-removal flag is set immediately before the ONE call that can drive initialCartItem to null from this component\'s own action',
);
check(
  /if \(cartItemJustRemoved && selfCausedRemovalRef\.current\) \{\s*selfCausedRemovalRef\.current = false;\s*if \(!primaryJustRemoved\) return;\s*\}/.test(browserSource),
  'the reconciliation effect consumes the self-caused-removal flag and skips its own reset when the cart-item transition was self-caused and the primary itself did not ALSO just disappear',
);

// ── 12. Auditor correction ("deployed customer validation failed" round) ──

// 12a. disclosureRowsForFamilyTierItem() (pure function): quantity/lineTotal
// pass through verbatim from the item's own inclusionItems snapshot, a
// Bundle parent's quantity stays null (never separately priced), a Bundle
// child's own quantity/lineTotal come through when the underlying data
// resolves them, and a pre-Phase-8G legacy item (no inclusionItems at all)
// falls back to its flat features with BOTH cells null — never a fabricated
// quantity or price for data that was never captured.
const pricedItem = familyItem({
  inclusionItems: [
    { id: 'seats', label: 'Seats', quantity: 3, unit_price: 10, line_total: 30 },
    {
      id: 'bundle-1', label: 'Starter Bundle', bundle_id: 'bnd_1', quantity: 1,
      includes: [{ id: 'child-1', label: 'Child Item', quantity: 2, line_total: 4 }],
    },
    { id: 'unresolved', label: 'Unresolved Extra' },
  ],
});
const pricedRows = disclosureRowsForFamilyTierItem(pricedItem);
check(pricedRows.length === 4, `every top-level inclusion plus every Bundle child gets its own row — got ${pricedRows.length}`);
const seatsRow = pricedRows.find((r) => r.id === 'seats');
check(seatsRow?.quantity === 3 && seatsRow?.lineTotal === 30, 'an ordinary inclusion carries its own quantity and line_total through verbatim');
const bundleParentRow = pricedRows.find((r) => r.id === 'bundle-1');
check(bundleParentRow?.quantity === null, 'a Bundle parent row\'s quantity is null (never separately quantified), matching the established bundle_id convention elsewhere');
const bundleChildRow = pricedRows.find((r) => r.id === 'bundle-1:child:child-1');
check(bundleChildRow?.quantity === 2 && bundleChildRow?.lineTotal === 4, 'a Bundle child row carries its own quantity/line_total through when the underlying data resolves them');
const unresolvedRow = pricedRows.find((r) => r.id === 'unresolved');
check(unresolvedRow?.quantity === null && unresolvedRow?.lineTotal === null, 'an inclusion with no resolved quantity/line_total renders both cells null — never invented');

const legacyItem = familyItem({ inclusionItems: undefined, features: ['Legacy Feature A'] });
const legacyRows = disclosureRowsForFamilyTierItem(legacyItem);
check(
  legacyRows.length === 1 && legacyRows[0].quantity === null && legacyRows[0].lineTotal === null,
  'a pre-Phase-8G legacy item with no inclusionItems falls back to its flat features, both cells null — never a fabricated quantity or price',
);

// 12b. InclusionDisclosure.tsx: in-flow expansion (no floating/absolute
// overlay), a project-standard inline-SVG chevron (never a text glyph),
// a real Inclusion/Qty/Price table, Qty with no × prefix, and a
// right-aligned Total summing only displayed priced rows.
const freshInclusionDisclosureSource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/InclusionDisclosure.tsx'), 'utf8');
check(
  !/position:\s*absolute/.test(freshInclusionDisclosureSource),
  'InclusionDisclosure.tsx never absolutely positions its panel — it expands in flow, per the auditor\'s explicit "no floating overlay" correction',
);
check(
  /<path d="M6 9l6 6 6-6" \/>/.test(freshInclusionDisclosureSource),
  'the toggle uses a project-standard inline-SVG chevron (viewBox 0 0 24 24, stroke-based), never a text glyph',
);
check(
  /<th>Inclusion<\/th>/.test(freshInclusionDisclosureSource)
    && /<th>Qty<\/th>/.test(freshInclusionDisclosureSource)
    && /<th>Price<\/th>/.test(freshInclusionDisclosureSource),
  'the expanded panel is a real Inclusion/Qty/Price table, matching the auditor\'s exact column spec',
);
check(
  /<td>\{row\.quantity \?\? ''\}<\/td>/.test(freshInclusionDisclosureSource),
  'Qty renders as a plain nullish-coalesced number — no × prefix',
);
check(
  !/×\{row\.quantity\}/.test(freshInclusionDisclosureSource),
  'the old ×{row.quantity} prefix is gone',
);
check(
  freshInclusionDisclosureSource.includes('formatPrice')
    && /row\.lineTotal !== null \? formatPrice\(row\.lineTotal\) : ''/.test(freshInclusionDisclosureSource),
  'Price is the authoritative row line_total formatted via the ONE shared formatPrice() — never invented for a null lineTotal, never a second formatter',
);
check(
  /pricedRows\.filter|row\.lineTotal !== null[\s\S]{0,80}reduce/.test(freshInclusionDisclosureSource) || freshInclusionDisclosureSource.includes('pricedRows.reduce'),
  'the Total sums only rows with a real lineTotal — never a fabricated figure for a row with no authoritative price',
);
check(
  freshInclusionDisclosureSource.includes("class=\"cz-inclusion-disclosure__total\""),
  'a distinct Total row renders below the table',
);

// 12c. [Superseded by section 13b below — the chevron no longer sits
// beside the price block, it sits in the corner-actions cluster beside
// the remove × per this round's correction.]

// 12d. The CSS no longer positions the panel as a floating dropdown.
const freshCostBuilderCss = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');
check(
  !/\.cz-inclusion-disclosure__list\s*\{/.test(freshCostBuilderCss),
  'the old floating .cz-inclusion-disclosure__list rule is gone',
);
check(
  !/position:\s*absolute/.test(freshInclusionDisclosureSource),
  'InclusionDisclosure.tsx still never absolutely positions its panel',
);

// ── 13. Auditor correction ("deployed customer UI validation failed" round) ──

// 13a. useSingleOpenDisclosure(): a single shared openKey per list, a
// race-safe functional toggle, and an outside-click listener that
// explicitly excludes every chevron toggle (not just the currently-open
// one) and the open panel's own subtree — the auditor's exact requirement
// that chevron controls never fall through the generic dismiss path.
check(
  freshInclusionDisclosureSource.includes('export function useSingleOpenDisclosure'),
  'a single shared hook owns "at most one open, atomic switch, outside-click closes" for a whole list — never per-instance state that has to stay in sync on its own',
);
check(
  /setOpenKey\(\(current\) => \(current === key \? null : key\)\)/.test(freshInclusionDisclosureSource),
  'toggle() uses the functional setState form — reads the LATEST openKey regardless of an outside-click close from the same interaction, so switching to a different item is atomic on the first click',
);
check(
  /target\.closest\(`\.\$\{INCLUSION_DISCLOSURE_TOGGLE_CLASS\}`\)/.test(freshInclusionDisclosureSource),
  'the outside-click listener explicitly excludes ANY chevron toggle (via closest(), matching every rendered toggle, not just the open item\'s own) from the generic dismiss path',
);
check(
  /panelRef\.current && panelRef\.current\.contains\(target\)/.test(freshInclusionDisclosureSource),
  'the outside-click listener also excludes clicks inside the open panel\'s own subtree',
);

// 13b. QuoteSummary.tsx: the chevron toggle sits in the SAME corner
// cluster as the remove ×, immediately to its left — two independent
// controls, never one repurposed as the other.
check(
  /<div class="cz-quote-summary__corner-actions">[\s\S]{0,400}InclusionDisclosureToggle[\s\S]{0,400}cz-quote-summary__remove/.test(quoteSummarySource),
  'the inclusion chevron toggle renders inside .cz-quote-summary__corner-actions BEFORE the cart remove ×, so it sits immediately to its left',
);

// 13c. ComposableOfferBrowser.tsx: the detached resolved-summaries
// aggregate is gone from render, but preview.summaries itself (and the
// auto-commit effect that reads it) is untouched — only the presentation
// block was removed.
check(
  !/preview\.summaries\.map\(\(summary\)/.test(browserSource),
  'the standalone resolved-summaries list ("$X.XX / mo Ongoing"-style rows) no longer renders in ComposableOfferBrowser.tsx — removed as a redundant, visually-disconnected duplicate of the authoritative cart/Details aggregate',
);
check(
  browserSource.includes('setPreview({ ok: true, summaries, contributions, message: null })')
    && browserSource.includes('buildComposableFamilyTierQuoteItem(family, offer, choice, periods, contributions, rows)'),
  'preview.summaries and the auto-commit effect that builds the committed item from it are untouched — removing the display block did not alter the underlying aggregate used by the cart and Details',
);

// 13d. ComposableOfferBrowser.tsx: the row icon and +/× action no longer
// carry a permanent accent/danger fill — restyled to the cart's own
// neutral-by-default, colored-on-hover-only icon language.
const freshCostBuilderCssForIcons = freshCostBuilderCss;
const composableRowIconRule = freshCostBuilderCssForIcons.slice(
  freshCostBuilderCssForIcons.indexOf('.cz-package-builder__composable-row-icon {'),
  freshCostBuilderCssForIcons.indexOf('.cz-package-builder__composable-row-label {'),
);
check(
  /color:\s*var\(--cz-color-muted\)/.test(composableRowIconRule),
  'the composable row icon is neutral (--cz-color-muted) by default, matching the cart\'s own icon language — no permanent accent fill',
);
const composableRowActionBaseRule = freshCostBuilderCssForIcons.slice(
  freshCostBuilderCssForIcons.indexOf('.cz-package-builder__composable-row-action {'),
  freshCostBuilderCssForIcons.indexOf('.cz-package-builder__composable-row-action.is-add:hover'),
);
check(
  /color:\s*var\(--cz-color-muted\)/.test(composableRowActionBaseRule) && /border:\s*1px solid transparent/.test(composableRowActionBaseRule) && composableRowActionBaseRule.includes('width: 22px'),
  'the composable list\'s +/× action is neutral by default with a transparent border and the SAME 22px sizing as .cz-quote-summary__remove — colored only on hover:not(:disabled), never a permanent accent/danger fill',
);
check(
  /\.cz-package-builder__composable-row-qty\s*\{[^}]*color:\s*var\(--cz-color-text\)[^}]*background:\s*var\(--cz-color-surface\)/.test(freshCostBuilderCssForIcons),
  'the quantity field carries explicit tokenized text/surface colors — never the browser\'s own default white input background',
);

console.log('Composable quote/cart contract passed.');
