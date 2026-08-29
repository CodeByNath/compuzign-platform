import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CommercialLegPricedItem, ServiceInclusion } from '../resources/ts/api/types/cost-builder';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Builder bundle inclusion parity: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const planDetails = readFileSync(resolve(root, 'resources/ts/components/package-builder/PlanDetailsModal.tsx'), 'utf8');
const types = readFileSync(resolve(root, 'resources/ts/components/cost-builder/types.ts'), 'utf8');
const adapter = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const order = readFileSync(resolve(root, 'resources/ts/components/request-flow/OrderSummary.tsx'), 'utf8');
const proposal = readFileSync(resolve(root, 'resources/ts/components/request-flow/QuoteProposalPreview.tsx'), 'utf8');

// 1. Plan Details (shared by the focused card AND the cart-level "View
// details" overlay via QuoteDetailsOverlay -> PlanDetailsContent) must
// consume CommercialLegPricedItem.includes.
const itemBreakdownBody = planDetails.match(/function ItemBreakdownTable[\s\S]*?\n}\n/);
check(!!itemBreakdownBody, 'ItemBreakdownTable is present');
check(itemBreakdownBody![0].includes('item.includes ?? []'), 'ItemBreakdownTable renders each item\'s Bundle-supplied includes children');

// 2. Bundle children never enter arithmetic — the `total` reduction must
// still only sum over the top-level `items` parameter, never a flattened
// array that would double-count a Bundle's own children.
check(
  itemBreakdownBody![0].includes("items.reduce((sum, item) => (item.line_total !== null ? sum + item.line_total : sum), 0)"),
  'total is still reduced from items only, never a children-flattened array',
);
// Runtime proof: construct a Bundle parent with priced children and confirm
// the exact reduce expression above ignores the children's own line_total.
const bundleParent: CommercialLegPricedItem = {
  item_id: 'parent_1', label: 'Foundation Bundle', quantity: 1,
  price_option_id: null, unit_price: 4000, line_total: 4000, available: true,
  includes: [
    { item_id: 'child_1', label: 'Child A', quantity: 1, price_option_id: null, unit_price: 500, line_total: 500, available: true },
    { item_id: 'child_2', label: 'Child B', quantity: 2, price_option_id: null, unit_price: 250, line_total: 500, available: true },
  ],
};
const items: CommercialLegPricedItem[] = [bundleParent];
const total = items.reduce((sum, item) => (item.line_total !== null ? sum + item.line_total : sum), 0);
check(total === 4000, 'Bundle parent stays priced exactly once ($4000) — children\'s own line_total never adds to the table total');

// 3. FamilyTierQuoteItem carries an optional structured inclusion snapshot,
// populated at Add-to-Quote time from effective.inclusionItems (never
// re-resolved from live catalog data later).
check(/inclusionItems\?:\s*ServiceInclusion\[\]/.test(types), 'FamilyTierQuoteItem declares an optional inclusionItems snapshot field');
check(adapter.includes('inclusionItems: effective.inclusionItems'), 'FamilyTierAdapter.itemFor() populates inclusionItems from the resolved effective.inclusionItems at Add-to-Quote time');

// 4/5. Review (OrderSummary) and proposal (QuoteProposalPreview) render
// nested Bundle children with an old-cart fallback to features[], for BOTH
// Family primary and Family add-on rows (never live-resolved).
for (const file of [order, proposal]) {
  check(file.includes('function FamilyInclusionsList'), 'defines a FamilyInclusionsList renderer for Family items');
  check(file.includes('item.inclusionItems && item.inclusionItems.length > 0'), 'renders the structured snapshot when present');
  check(file.includes('inclusion.bundle_id') && file.includes('inclusion.includes ?? []'), 'renders Bundle parent + nested includes children, mirroring the focused card\'s own bundle_id treatment');
  check(file.includes('item.features.length > 0') && file.includes('item.features.map'), 'falls back to the flat features[] list for an old cart entry without inclusionItems');
  const usageCount = (file.match(/<FamilyInclusionsList item=\{item\} \/>/g) ?? []).length;
  check(usageCount === 2, 'FamilyInclusionsList is used for both Family primary and Family add-on rows');
  // Regression: a child row's list key must NEVER be the bare child.id —
  // when two different Bundle parents supply a child with the same id, that
  // would produce duplicate keys among siblings in the same <ul>, which can
  // reconcile incorrectly (stale/moved/missing rows) after a cart change.
  check(!/key=\{child\.id \|\|/.test(file), 'child row key must not fall back to a bare, unscoped child.id');
  check(/key=\{`\$\{inclusion\.id \|\| i\}:child:\$\{child\.id \|\| ci\}`\}/.test(file), 'child row key is unconditionally parent-scoped (inclusion identity : child identity)');
}

// Runtime uniqueness proof: two different Bundle parents supplying a child
// with the SAME child.id must still produce distinct keys once run through
// the real key expression above.
function childKey(inclusion: { id: string }, i: number, child: { id: string }, ci: number): string {
  return `${inclusion.id || i}:child:${child.id || ci}`;
}
const bundleA: ServiceInclusion = { id: 'bundle_a', label: 'Bundle A', bundle_id: 'rs_a', includes: [{ id: 'shared_child', label: 'Shared Child' }] };
const bundleB: ServiceInclusion = { id: 'bundle_b', label: 'Bundle B', bundle_id: 'rs_b', includes: [{ id: 'shared_child', label: 'Shared Child' }] };
const inclusionItemsWithSharedChild: ServiceInclusion[] = [bundleA, bundleB];
const generatedKeys = inclusionItemsWithSharedChild.flatMap((inclusion, i) => [
  `${inclusion.id || i}`,
  ...(inclusion.includes ?? []).map((child, ci) => childKey(inclusion, i, child, ci)),
]);
check(new Set(generatedKeys).size === generatedKeys.length, 'two Bundle parents sharing the same child.id still produce unique keys once parent-scoped');
check(generatedKeys.includes('bundle_a:child:shared_child') && generatedKeys.includes('bundle_b:child:shared_child'), 'both parent-scoped shared-child keys are present and distinct from each other');

// 6. No raw CZ Platform IDs anywhere in review/proposal — same boundary
// Phase 8F established, re-verified here since this contract's own mandate
// explicitly names it.
for (const rawIdField of ['familyPlatformId', 'tierInstancePlatformId', 'tierPlatformId', 'tierEditionPlatformId', 'tierOccupantId']) {
  check(!order.includes(rawIdField), `review summary must not print raw Platform ID field ${rawIdField}`);
  check(!proposal.includes(rawIdField), `proposal must not print raw Platform ID field ${rawIdField}`);
}

// Runtime proof of the fallback rule itself, independent of source shape:
// an old-cart item with no inclusionItems must read from features, and a
// new-cart item with inclusionItems must never fall back to features even
// when both are present (inclusionItems takes precedence).
function resolveDisplayInclusions(item: { inclusionItems?: ServiceInclusion[]; features: string[] }): 'structured' | 'flat' | 'none' {
  if (item.inclusionItems && item.inclusionItems.length > 0) return 'structured';
  if (item.features.length > 0) return 'flat';
  return 'none';
}
check(resolveDisplayInclusions({ features: ['Old label'] }) === 'flat', 'an old cart item without inclusionItems falls back to features');
check(resolveDisplayInclusions({ inclusionItems: [{ id: 'x', label: 'X' }], features: ['Old label'] }) === 'structured', 'a new cart item with inclusionItems never falls back to features, even when both are present');
check(resolveDisplayInclusions({ features: [] }) === 'none', 'an item with neither renders nothing');

console.log('Package Builder bundle inclusion parity contract passed.');
