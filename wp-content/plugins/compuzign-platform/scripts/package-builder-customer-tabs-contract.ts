import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { filterTiersByCustomerGroup } from '../resources/ts/components/package-builder/FamilyTierAdapter';
import type { PackageBuilderFamily, Tier } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Builder customer tabs: ${message}`);
}

const tiers: Tier[] = [
  { id: 'basic', title: 'Basic' },
  { id: 'standard', title: 'Standard' },
  { id: 'premium', title: 'Premium' },
];
const pricing = {
  tiers: {
    basic: { price: 10, billing_cycle: 'monthly', inclusions: [], features: [], is_addon: false },
    standard: { price: 20, billing_cycle: 'monthly', inclusions: [], features: [], is_addon: false, audience_group: 'personal_business' as const },
    premium: { price: 30, billing_cycle: 'monthly', inclusions: [], features: [], is_addon: false, audience_group: 'enterprise' as const },
  },
} as PackageBuilderFamily['pricing'];

check(
  filterTiersByCustomerGroup(tiers, pricing, 'personal_business').map((tier) => tier.id).join(',') === 'basic,standard',
  'Personal & Business includes explicit and backward-compatible default occupants',
);
check(
  filterTiersByCustomerGroup(tiers, pricing, 'enterprise').map((tier) => tier.id).join(',') === 'premium',
  'Enterprise exposes only Enterprise occupants',
);

const root = resolve(import.meta.dirname, '..');
const adapter = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const app = readFileSync(resolve(root, 'resources/ts/components/package-builder/PackageBuilderApp.tsx'), 'utf8');
const styles = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');
const groupFilter = adapter.slice(
  adapter.indexOf('export function filterTiersByCustomerGroup'),
  adapter.indexOf('export function FamilyTierAdapter'),
);
check(adapter.includes('role="tablist"') && adapter.includes('role="tab"'), 'the control uses tab semantics');
check(adapter.includes('aria-selected={customerGroup === group.value}'), 'the active tab exposes selection state');
check(groupFilter.includes('audience_group') && !groupFilter.match(/month|term|billing|edition/i), 'the filter reads only occupant customer grouping');
check(!adapter.includes('<select') && !adapter.includes('activeTerm'), 'the tab UI introduces no month or term selector');
check(!app.includes('Available tiers / plans'), 'the redundant Tier card heading is absent');
check(styles.includes('.cz-package-builder__customer-tabs') && styles.includes('max-width: fit-content'), 'the segmented control sizes to its content');

console.log('Package Builder customer tabs contract passed.');
