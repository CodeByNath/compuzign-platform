import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calcQuoteTotals, classifyQuoteItems } from '../resources/ts/utils/quote';
import type { CartItem, FamilyTierQuoteItem, QuoteItem } from '../resources/ts/components/cost-builder/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Family request flow: ${message}`);
}

const family: FamilyTierQuoteItem = {
  offer_type: 'family_tier',
  familyId: 'pcg_kairos', familyPlatformId: 'CZPG-KAIROS01', familyTitle: 'KAIROS',
  tierInstanceId: 'ti_kairos', tierInstancePlatformId: 'CZTG-KAIROS01',
  tierOccupantId: 'occ_basic', tierPlatformId: 'CZT-KAIROS001', tierEditionPlatformId: 'CZTE-KAIROS01',
  tierId: 'basic', tierTitle: 'KAIROS Basic', price: 100, billingCycle: 'monthly',
  features: ['Monitoring'], isAddon: false, minimumTermValue: 12, minimumTermUnit: 'months',
};
const service: QuoteItem = {
  serviceId: 101, serviceTitle: 'Legacy Service', tierId: 'basic', tierTitle: 'Basic',
  price: 50, billingCycle: 'monthly', categoryName: 'Managed IT', features: [],
  isAddon: false, minimumTermValue: null, minimumTermUnit: null,
};
const items: CartItem[] = [service, family];
const classified = classifyQuoteItems(items);
check(classified.mainItems.length === 1 && classified.mainItems[0] === service, 'legacy Service classification remains intact');
check(classified.familyMainItems.length === 1 && classified.familyMainItems[0] === family, 'Family line has its own classification');
check(calcQuoteTotals(items).singleCycle?.[1] === 150, 'existing totals sum mixed Service and Family snapshots');

const root = resolve(import.meta.dirname, '..');
const order = readFileSync(resolve(root, 'resources/ts/components/request-flow/OrderSummary.tsx'), 'utf8');
const proposal = readFileSync(resolve(root, 'resources/ts/components/request-flow/QuoteProposalPreview.tsx'), 'utf8');
const packageApp = readFileSync(resolve(root, 'resources/ts/components/package-builder/PackageBuilderApp.tsx'), 'utf8');
// Phase 8F: raw CZ Platform IDs are customer-facing defects, not business
// facts a customer document should print — review/proposal must never
// reference these fields at all (human labels like tierTitle/familyTitle/
// tierEditionTitle stand in for them).
for (const rawIdField of ['familyPlatformId', 'tierInstancePlatformId', 'tierPlatformId', 'tierEditionPlatformId', 'tierOccupantId']) {
  check(!order.includes(rawIdField), `review summary must not print raw Platform ID field ${rawIdField}`);
  check(!proposal.includes(rawIdField), `proposal must not print raw Platform ID field ${rawIdField}`);
}
check(order.includes('tierEditionTitle') && proposal.includes('tierEditionTitle'), 'review and proposal use the human-readable Edition snapshot label');
check(order.includes('legPaymentSummaries') && proposal.includes('legPaymentSummaries'), 'review and proposal render the resolved multi-stream commercial payment summaries, not just flat price/billingCycle');
check(packageApp.includes('<RequestFlowModal'), 'Package builder hands its shared cart to the existing Request Flow');

console.log('Package Family request flow contract passed.');
