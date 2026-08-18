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
    standard: { price: 20, billing_cycle: 'monthly', inclusions: [], features: [], is_addon: false, audience_groups: ['personal_business'] as const },
    premium: { price: 30, billing_cycle: 'monthly', inclusions: [], features: [], is_addon: false, audience_groups: ['enterprise'] as const },
  },
} as PackageBuilderFamily['pricing'];

// basic never configures audience_groups, so it defaults to every group (an
// occupant belongs to its Tier Group, not one customer audience) and shows
// under both tabs; standard/premium each narrow to one.
check(
  filterTiersByCustomerGroup(tiers, pricing, 'personal_business').map((tier) => tier.id).join(',') === 'basic,standard',
  'Personal & Business includes its own explicit occupant plus the never-configured one',
);
check(
  filterTiersByCustomerGroup(tiers, pricing, 'enterprise').map((tier) => tier.id).join(',') === 'basic,premium',
  'Enterprise includes its own explicit occupant plus the never-configured one',
);

const root = resolve(import.meta.dirname, '..');
const adapter = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const app = readFileSync(resolve(root, 'resources/ts/components/package-builder/PackageBuilderApp.tsx'), 'utf8');
const styles = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');
const groupFilter = adapter.slice(
  adapter.indexOf('export function filterTiersByCustomerGroup'),
  adapter.indexOf('export function FamilyTierAdapter'),
);
// Scoped to the tabs' own markup, not the whole file — the focused Choose
// Plan view (a separate section entirely) legitimately owns a real
// commercial-cycle <select> of its own (Phase 3); this check's job is only
// to keep that concern out of the customer-group segmented control.
const customerTabsMarkup = adapter.slice(
  adapter.indexOf('cz-package-builder__customer-tabs'),
  adapter.indexOf('Add-ons stay out of the comparison view'),
);
check(adapter.includes('role="tablist"') && adapter.includes('role="tab"'), 'the control uses tab semantics');
check(adapter.includes('aria-selected={customerGroup === group.value}'), 'the active tab exposes selection state');
check(groupFilter.includes('audience_groups') && !groupFilter.match(/month|term|billing|edition/i), 'the filter reads only occupant customer grouping');
check(!customerTabsMarkup.includes('<select') && !customerTabsMarkup.includes('activeTerm'), 'the tab UI introduces no month or term selector');
check(!app.includes('Available tiers / plans'), 'the redundant Tier card heading is absent');
check(styles.includes('.cz-package-builder__customer-tabs') && styles.includes('max-width: fit-content'), 'the segmented control sizes to its content');

console.log('Package Builder customer tabs contract passed.');
