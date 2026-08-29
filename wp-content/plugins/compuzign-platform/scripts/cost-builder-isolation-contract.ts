import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canSelectServiceOffers } from '../resources/ts/components/cost-builder/CostBuilderApp';
import { calcQuoteTotals } from '../resources/ts/utils/quote';
import type { QuoteItem } from '../resources/ts/components/cost-builder/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Cost Builder isolation contract: ${message}`);
}

check(
  canSelectServiceOffers({ availability: { is_available: true, message: '' } }),
  'an assigned, ready Service can present selectable offers',
);
check(
  !canSelectServiceOffers({
    availability: {
      is_available: false,
      message: 'Currently this service is not available.',
    },
  }),
  'a fail-closed Service cannot present selectable offers',
);

const root = resolve(import.meta.dirname, '..');
const appSource = readFileSync(
  resolve(root, 'resources/ts/components/cost-builder/CostBuilderApp.tsx'),
  'utf8',
);
const guardStart = appSource.indexOf('{offersAvailable && (');
const guardEnd = appSource.indexOf('</>\n              )}', guardStart);
const guardedOffers = guardStart >= 0 && guardEnd > guardStart
  ? appSource.slice(guardStart, guardEnd)
  : '';

check(guardedOffers.includes('<RecommendedBundle'), 'the legacy bundle is behind the availability gate');
check(guardedOffers.includes('<PromotionSection'), 'promotions are behind the availability gate');

// Cost Builder remains a downstream consumer: Package assignment resolution
// may change which offers can be selected, but established quote/PDF math is
// still driven only by the selected QuoteItem snapshots.
const quoteItems: QuoteItem[] = [
  {
    serviceId: 101, serviceTitle: 'KAIROS Service', tierId: 'basic', tierTitle: 'KAIROS Basic',
    price: 140, billingCycle: 'monthly', categoryName: 'Compute', features: [],
  },
  {
    serviceId: -101, serviceTitle: 'KAIROS Bundle', tierId: 'bundle', tierTitle: 'Bundle',
    price: 60, billingCycle: 'monthly', categoryName: 'Compute', features: [],
  },
  {
    serviceId: 102, serviceTitle: 'APTOS Service', tierId: 'premium', tierTitle: 'APTOS Premium',
    price: 1200, billingCycle: 'annual', categoryName: 'Managed IT', features: [],
  },
  {
    serviceId: 103, serviceTitle: 'Custom Service', tierId: 'ultimate', tierTitle: 'Ultimate',
    price: null, billingCycle: 'monthly', categoryName: 'Managed IT', features: [],
  },
];
const totals = calcQuoteTotals(quoteItems);
check(totals.cycleGroups.monthly === 200, 'quote totals retain monthly Tier and bundle calculation');
check(totals.cycleGroups.annual === 1200, 'quote totals retain independent annual calculation');
check(totals.hasMixedCycles, 'quote totals retain mixed-cycle behavior');
check(totals.unpricedItems.length === 1, 'quote totals retain contact-price behavior');

const proposalSource = readFileSync(
  resolve(root, 'resources/ts/components/request-flow/QuoteProposalPreview.tsx'),
  'utf8',
);
const modalSource = readFileSync(
  resolve(root, 'resources/ts/components/request-flow/RequestFlowModal.tsx'),
  'utf8',
);
const quoteFlowSource = readFileSync(
  resolve(root, 'resources/ts/components/request-flow/QuoteCartFlow.tsx'),
  'utf8',
);
// Phase 8F: the proposal now scopes this call to itemsForGeneralTotals (a
// filtered subset of items — see request-flow-family-tier-parity-contract.ts
// for the exact exclusion rule) rather than passing items directly, so this
// checks for the shared helper call itself, not one specific argument name.
check(proposalSource.includes('calcQuoteTotals('), 'print/PDF proposal keeps the shared quote calculation');
check(modalSource.includes("querySelector<HTMLElement>('.cz-proposal')"), 'print/PDF flow keeps cloning the proposal');
check(quoteFlowSource.includes('window.print()'), 'print/PDF flow remains connected to browser print');

console.log('Cost Builder isolation contract passed.');
