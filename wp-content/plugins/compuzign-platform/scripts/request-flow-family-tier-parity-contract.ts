import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
// payment streams. The fix: itemsForGeneralTotals excludes ONLY a
// multi-stream Family item (never all Family items, never conditioned on
// hasMultiStreamItem itself), and its own render gate is
// itemsForGeneralTotals.length > 0 — independent of, and rendered
// alongside, the Family Contract Value block.
for (const file of [order, proposal]) {
  check(
    /itemsForGeneralTotals = items\.filter\(\(item\) => !isFamilyTierQuoteItem\(item\)\s*\n\s*\|\| \(item\.legPaymentSummaries\?\.length \?\? 0\) <= 1\)/.test(file),
    'itemsForGeneralTotals excludes only a multi-stream (>1 stream) Family item, keeping legacy items and single/no-stream Family items in the general totals',
  );
  check(file.includes('itemsForGeneralTotals.length > 0'), 'general totals block renders whenever there is a non-multi-stream item to represent, independent of hasMultiStreamItem');
  check(!/hasMultiStreamItem \? \(/.test(file), 'the Totals section must not branch as a single hasMultiStreamItem ternary — the Family block and general block render as independent siblings');
}

// Print/PDF clone target must survive untouched.
check(proposal.includes('class="cz-proposal"'), 'QuoteProposalPreview keeps its .cz-proposal root for RequestFlowModal\'s beforeprint clone');

console.log('Request flow Family Tier parity contract passed.');
