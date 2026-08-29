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

// Legacy/simple QuoteItem, bundle, promotion path stays on calcQuoteTotals()
// and its own rendering — untouched by the Family-specific branch.
for (const file of [order, proposal]) {
  check(file.includes('calcQuoteTotals(items)'), 'legacy calcQuoteTotals() call retained for non-family cycle totals');
  check(file.includes('mainItems.map') && file.includes('bundleItems.map') && file.includes('tierAddonItems.map'), 'legacy Service/bundle/tier-addon rendering paths retained');
}

// Print/PDF clone target must survive untouched.
check(proposal.includes('class="cz-proposal"'), 'QuoteProposalPreview keeps its .cz-proposal root for RequestFlowModal\'s beforeprint clone');

console.log('Request flow Family Tier parity contract passed.');
