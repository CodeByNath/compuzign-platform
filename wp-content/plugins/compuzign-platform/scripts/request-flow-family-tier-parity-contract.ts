import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calcQuoteTotals, isFamilyTierQuoteItem } from '../resources/ts/utils/quote';
import { computeTotalContractValue } from '../resources/ts/components/cost-builder/PricingTiers';
import type { FamilyTierQuoteItem, QuoteItem } from '../resources/ts/components/cost-builder/types';
import type { LegPaymentSummary } from '../resources/ts/components/cost-builder/PricingTiers';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Request flow Family Tier parity: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const types = readFileSync(resolve(root, 'resources/ts/components/cost-builder/types.ts'), 'utf8');
const adapter = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const order = readFileSync(resolve(root, 'resources/ts/components/request-flow/OrderSummary.tsx'), 'utf8');
const proposal = readFileSync(resolve(root, 'resources/ts/components/request-flow/QuoteProposalPreview.tsx'), 'utf8');

// Optional Edition-title snapshot/fallback (Critical Safeguard): a selection-
// time human label, never resolved from live Family/Tier catalog data inside
// request-flow components.
check(/tierEditionTitle\?:\s*string \| null/.test(types), 'FamilyTierQuoteItem declares an optional tierEditionTitle snapshot field');
check(adapter.includes('tierEditionTitle: effective.selectedEdition?.label ?? null'), 'FamilyTierAdapter.itemFor() populates tierEditionTitle from the resolved Edition at Add-to-Quote time');
check(!order.includes('resolveEffectiveTierDisplay') && !order.includes('periodsForVariant'), 'OrderSummary must not resolve Edition display from live Package Family data');
check(!proposal.includes('resolveEffectiveTierDisplay') && !proposal.includes('periodsForVariant'), 'QuoteProposalPreview must not resolve Edition display from live Package Family data');

// Reused primitives — never a second re-derivation of TCV/Initial Payment.
for (const file of [order, proposal]) {
  check(file.includes('computeTotalContractValue') && file.includes('startingPaymentsByCycle') && file.includes('chargeTypeLabel'), 'imports/uses the same PricingTiers primitives QuoteSummary.tsx already uses');
  check(file.includes('hasMultiStreamItem'), 'branches its Totals section on hasMultiStreamItem, same gate as QuoteSummary.tsx');
}

// Primary-only TCV/Initial Payment: combined figures must derive from
// familyMainItems (primary), never familyAddonItems folded into the same sum.
const orderCombinedBlock = order.match(/const familyPrimaryTotalContractValues[\s\S]*?const familyInitialPaymentTotal[^\n]*\n/);
check(!!orderCombinedBlock, 'OrderSummary computes the combined Family primary TCV/Initial Payment block');
check(!orderCombinedBlock![0].includes('familyAddonItems'), 'OrderSummary combined primary TCV/Initial Payment excludes add-ons');
const proposalCombinedBlock = proposal.match(/const familyPrimaryTotalContractValues[\s\S]*?const familyInitialPaymentTotal[^\n]*\n/);
check(!!proposalCombinedBlock, 'QuoteProposalPreview computes the combined Family primary TCV/Initial Payment block');
check(!proposalCombinedBlock![0].includes('familyAddonItems'), 'QuoteProposalPreview combined primary TCV/Initial Payment excludes add-ons');

// Stream + finite Total rendering for both primary and add-on Family rows.
for (const file of [order, proposal]) {
  const streamOccurrences = (file.match(/computeTotalContractValue\(streams!\)/g) ?? []).length;
  check(streamOccurrences === 2, 'renders per-item finite Total for both familyMainItems and familyAddonItems rows');
}

// Legacy/simple QuoteItem, bundle, promotion path stays represented and its
// own rendering is untouched by the Family-specific branch.
for (const file of [order, proposal]) {
  check(file.includes('calcQuoteTotals(itemsForGeneralTotals)'), 'general totals are derived from itemsForGeneralTotals, not calcQuoteTotals(items) unconditionally');
  check(file.includes('mainItems.map') && file.includes('bundleItems.map') && file.includes('tierAddonItems.map'), 'legacy Service/bundle/tier-addon rendering paths retained');
}

// Mixed-cart regression guard: the general totals block (legacy items) must
// never be nested inside — or otherwise made conditional on — the
// hasMultiStreamItem branch. A prior draft branched the ENTIRE Totals
// section on hasMultiStreamItem, which silently dropped legacy Service/
// bundle/tier-addon totals from view whenever any Family item had 2+
// payment streams. A second draft excluded only the multi-stream Family
// item(s) from itemsForGeneralTotals, but the combined Family TCV block
// sums EVERY primary Family item regardless of its own stream count — so a
// single-stream Family primary was still counted twice (once there, once in
// calcQuoteTotals). The fix: population-based, not stream-count-based —
// once ANY item is multi-stream (hasMultiStreamItem), general totals cover
// non-Family items ONLY; with none, general totals cover every item exactly
// as before Phase 8F. The Family block and general block render as
// independent siblings, never one ternary.
for (const file of [order, proposal]) {
  check(
    /itemsForGeneralTotals = hasMultiStreamItem\s*\n\s*\? items\.filter\(\(item\) => !isFamilyTierQuoteItem\(item\)\)\s*\n\s*: items;/.test(file),
    'itemsForGeneralTotals excludes every Family item (not just multi-stream ones) once the Family contract block is active, and covers every item when it is not',
  );
  check(!/hasMultiStreamItem \? \(/.test(file), 'the Totals section must not branch as a single hasMultiStreamItem ternary — the Family block and general block render as independent siblings');
}

// Print/PDF clone target must survive untouched.
check(proposal.includes('class="cz-proposal"'), 'QuoteProposalPreview keeps its .cz-proposal root for RequestFlowModal\'s beforeprint clone');

// Runtime double-count proof: multi-stream Family primary + single-stream
// Family primary + one legacy item. The single-stream Family primary's
// headline must NOT appear in general totals (it's already inside the
// combined Family TCV), while the legacy item must still be there.
const legacyItem: QuoteItem = {
  serviceId: 301, serviceTitle: 'Legacy Service', tierId: 'basic', tierTitle: 'Basic',
  price: 50, billingCycle: 'monthly', categoryName: 'Managed IT', features: [],
  isAddon: false, minimumTermValue: null, minimumTermUnit: null,
};
const multiStreamSummary: LegPaymentSummary = {
  source: 'leg_upfront', billingCycle: 'one_time', price: 200,
  startMonth: 0, endMonth: 0, isOngoing: false, occurrenceMonths: [0], subtotal: 200,
};
const multiStreamRecurring: LegPaymentSummary = {
  source: 'leg_monthly', billingCycle: 'monthly', price: 100,
  startMonth: 0, endMonth: 12, isOngoing: false, occurrenceMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], subtotal: 1200,
};
const multiStreamPrimary: FamilyTierQuoteItem = {
  offer_type: 'family_tier',
  familyId: 'pcg_multi', familyPlatformId: 'CZPG-MULTI01', familyTitle: 'Multi Family',
  tierInstanceId: 'ti_multi', tierInstancePlatformId: 'CZTG-MULTI01',
  tierOccupantId: 'occ_multi', tierPlatformId: 'CZT-MULTI001', tierEditionPlatformId: null,
  tierId: 'basic', tierTitle: 'Multi Basic', price: 300, billingCycle: 'monthly',
  features: [], isAddon: false, minimumTermValue: null, minimumTermUnit: null,
  legPaymentSummaries: [multiStreamSummary, multiStreamRecurring],
};
const singleStreamRecurring: LegPaymentSummary = {
  source: 'leg_single', billingCycle: 'monthly', price: 80,
  startMonth: 0, endMonth: 12, isOngoing: false, occurrenceMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], subtotal: 960,
};
const singleStreamPrimary: FamilyTierQuoteItem = {
  offer_type: 'family_tier',
  familyId: 'pcg_single', familyPlatformId: 'CZPG-SINGLE01', familyTitle: 'Single Family',
  tierInstanceId: 'ti_single', tierInstancePlatformId: 'CZTG-SINGLE01',
  tierOccupantId: 'occ_single', tierPlatformId: 'CZT-SINGLE001', tierEditionPlatformId: null,
  tierId: 'basic', tierTitle: 'Single Basic', price: 80, billingCycle: 'monthly',
  features: [], isAddon: false, minimumTermValue: null, minimumTermUnit: null,
  legPaymentSummaries: [singleStreamRecurring],
};
const mixedCart = [legacyItem, multiStreamPrimary, singleStreamPrimary];
// Same population-split logic the regex above just confirmed is literally
// in both source files — replicated here (not imported, since it lives
// inline in each component) and run against the constructed cart to prove
// the actual numeric outcome, not just the source shape.
const hasMultiStreamItemTest = mixedCart.filter(isFamilyTierQuoteItem)
  .some((item) => (item.legPaymentSummaries?.length ?? 0) > 1);
const itemsForGeneralTotalsTest = hasMultiStreamItemTest
  ? mixedCart.filter((item) => !isFamilyTierQuoteItem(item))
  : mixedCart;
const generalTotals = calcQuoteTotals(itemsForGeneralTotalsTest);
check(hasMultiStreamItemTest, 'test cart actually contains a multi-stream Family item (sanity check on the fixture itself)');
check(itemsForGeneralTotalsTest.length === 1 && itemsForGeneralTotalsTest[0] === legacyItem, 'general totals population contains only the legacy item — both Family primaries excluded once any item is multi-stream');
check(generalTotals.singleCycle?.[1] === 50, 'general totals amount is exactly the legacy item\'s $50 — the single-stream Family primary\'s $80 never leaks in');
const combinedFamilyTCV = [multiStreamPrimary, singleStreamPrimary]
  .map((item) => computeTotalContractValue(item.legPaymentSummaries!))
  .reduce((sum, value) => sum + (value as number), 0);
check(combinedFamilyTCV === 200 + 1200 + 960, 'combined Family TCV sums both primaries\' full contract values (200 + 1200 + 960 = 2360) independent of general totals — proving the $80 single-stream headline is represented exactly once, inside this sum, not twice');

console.log('Request flow Family Tier parity contract passed.');
