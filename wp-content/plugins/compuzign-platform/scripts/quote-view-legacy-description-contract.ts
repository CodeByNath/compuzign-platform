// Contract: Phase 8J-C2's correction — QuoteCartFlow.tsx's
// withSubmissionDescriptions() captures the live catalog's own Service
// short description / recommended-Bundle description onto the outgoing
// submission payload at the moment of submit, since the secure quote-view
// reload page never re-resolves live catalog data. Never mutates the live
// cart item; Family items pass through untouched.
//
// Usage: npm run contract:quote-view-legacy-description
//    or: npx tsx scripts/quote-view-legacy-description-contract.ts

import type { CartItem, QuoteItem } from '../resources/ts/components/cost-builder/types';
import type { ServiceItem } from '../resources/ts/api/types/cost-builder';

const failures: string[] = [];
function check(label: string, cond: unknown, detail?: unknown): void {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`); failures.push(label); }
}

function makeQuoteItem(overrides: Partial<QuoteItem>): QuoteItem {
  return {
    serviceId: 101, serviceTitle: 'KAIROS', tierId: 'standard', tierTitle: 'Standard',
    price: 49, billingCycle: 'monthly', categoryName: 'Managed IT', features: [],
    isAddon: false, minimumTermValue: null, minimumTermUnit: null,
    ...overrides,
  };
}

function makeService(overrides: Record<string, unknown>): ServiceItem {
  return {
    id: 101, title: 'KAIROS', slug: 'kairos', excerpt: 'Excerpt fallback text.', content: '',
    categories: [], inclusions: [], faqs: [],
    availability: { is_available: true, message: '' },
    meta: { platform_status: 'active', short_description: 'Round-the-clock monitoring.' } as any,
    pricing: { tiers: {}, bundle: { title: '', description: '', price: null } } as any,
    promotion_tiers: [],
    ...overrides,
  } as ServiceItem;
}

async function main(): Promise<void> {
  const { withSubmissionDescriptions } = await import('../resources/ts/components/request-flow/QuoteCartFlow');
  const { isFamilyTierQuoteItem } = await import('../resources/ts/utils/quote');

  // ── 1) A main Service item picks up its short_description ─────────────
  console.log('1) a main Service item is enriched with its short description');
  {
    const items: CartItem[] = [makeQuoteItem({ serviceId: 101 })];
    const services = [makeService({ id: 101 })];
    const [enriched] = withSubmissionDescriptions(items, services) as QuoteItem[];
    check('serviceDescription is captured from meta.short_description', enriched.serviceDescription === 'Round-the-clock monitoring.', enriched.serviceDescription);
    check('bundleDescription stays absent when the service has none', enriched.bundleDescription === undefined);
  }

  // ── 2) excerpt fallback when short_description is empty ───────────────
  console.log('\n2) falls back to excerpt when short_description is empty');
  {
    const items: CartItem[] = [makeQuoteItem({ serviceId: 101 })];
    const services = [makeService({ id: 101, meta: { platform_status: 'active', short_description: '' } })];
    const [enriched] = withSubmissionDescriptions(items, services) as QuoteItem[];
    check('falls back to excerpt', enriched.serviceDescription === 'Excerpt fallback text.', enriched.serviceDescription);
  }

  // ── 3) The legacy recommended bundle (negative serviceId) picks up
  //    pricing.bundle.description via Math.abs() lookup, never
  //    serviceDescription. ──────────────────────────────────────────────
  console.log('\n3) the legacy bundle item is enriched with pricing.bundle.description via Math.abs() lookup');
  {
    const items: CartItem[] = [makeQuoteItem({ serviceId: -101, tierId: 'bundle', isAddon: false })];
    const services = [makeService({ id: 101, pricing: { tiers: {}, bundle: { title: 'Bundle', description: 'Save 15% when bundled.', price: 30 } } })];
    const [enriched] = withSubmissionDescriptions(items, services) as QuoteItem[];
    check('bundleDescription is captured', enriched.bundleDescription === 'Save 15% when bundled.', enriched.bundleDescription);
  }

  // ── 4) No matching service in the catalog leaves the item untouched ───
  console.log('\n4) no matching service leaves the item unchanged');
  {
    const items: CartItem[] = [makeQuoteItem({ serviceId: 999 })];
    const [enriched] = withSubmissionDescriptions(items, []) as QuoteItem[];
    check('serviceDescription stays absent with no catalog match', enriched.serviceDescription === undefined);
  }

  // ── 5) The original array/item objects are never mutated ──────────────
  console.log('\n5) withSubmissionDescriptions() never mutates its input');
  {
    const original = makeQuoteItem({ serviceId: 101 });
    const items: CartItem[] = [original];
    const services = [makeService({ id: 101 })];
    const result = withSubmissionDescriptions(items, services);
    check('a new array is returned', result !== items);
    check('the original item object is untouched', (original as QuoteItem).serviceDescription === undefined);
  }

  // ── 6) Family items pass through completely unchanged ─────────────────
  console.log('\n6) a Family item is never touched');
  {
    const familyItem = {
      offer_type: 'family_tier', familyId: 'f1', familyPlatformId: 'CZPG-X', familyTitle: 'KAIROS',
      tierInstanceId: 'ti1', tierInstancePlatformId: 'CZTG-X', tierOccupantId: 'occ1', tierPlatformId: 'CZT-X',
      tierEditionPlatformId: null, tierId: 'basic', tierTitle: 'Basic', price: 10, billingCycle: 'monthly',
      features: [], isAddon: false, minimumTermValue: null, minimumTermUnit: null,
    } as unknown as CartItem;
    const [result] = withSubmissionDescriptions([familyItem], [makeService({ id: 1 })]);
    check('the Family item reference is returned as-is', result === familyItem);
    check('isFamilyTierQuoteItem still recognises it', isFamilyTierQuoteItem(result));
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll checks passed — legacy Service/Bundle descriptions are captured onto the submission payload only, without mutating the live cart, and Family items are never touched.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
