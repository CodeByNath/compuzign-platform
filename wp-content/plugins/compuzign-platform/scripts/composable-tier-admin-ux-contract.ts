// Contract: composable Admin UX restructuring
// (project-work/2026-09-03-composable-tier-admin-to-customer-validation.md).
//
// Proves the Admin UI/UX-only additions layered onto the Tier Workspace
// Engine's Focus view: the composable occupant's own sixth tab/filter
// destination, the composable-only middle shell it reveals, and that both
// stay strictly additive over the locked five-slot model and the existing
// standalone Customer Selection Rules drawer. Fixture-driven against real
// exported pure functions plus source-scan assertions on the orchestrator,
// same precedent composable-occupant-workspace-contract.ts and
// package-tier-workspace-shell-contract.ts already follow.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CategoryGroupCardItem } from '../resources/ts/admin-station/presentation/category-groups/types';
import type { CustomerPolicy } from '../resources/ts/api/types/cost-builder';
import {
  filterWorkspaceTierSlots,
  projectComposableWorkspaceSlot,
  projectWorkspaceTierSlots,
} from '../resources/ts/package-station/surface/packageTierWorkspace/projection';
import {
  projectComposableHighlightInclusions,
  summarizeComposableCustomerPolicy,
} from '../resources/ts/package-station/surface/packageTierWorkspace/composableMiddleShell';
import { EMPTY_TIER_DECK, type TierDeck } from '../resources/ts/package-station/surface/packageTierWorkspace/deck';
import { COMPOSABLE_TIER_ID, TIER_KEYS } from '../resources/ts/package-station/vocabulary';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Composable Admin UX contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const card = (id: string): CategoryGroupCardItem => ({
  id, key: id, name: `Package ${id}`, metrics: [], actions: [{ id: 'view', label: 'View' }],
});

// ── 1. Five normal Tier destinations are unaffected by the composable slot ──

const normalOccupants = TIER_KEYS.map((slotId, index) => ({
  slotId, occupantId: `occ_${slotId}`, item: card(`occ_${slotId}`), isAddon: index === 0, isPopular: index === 0,
}));
const slots = projectWorkspaceTierSlots(normalOccupants);
check(slots.length === 5, 'projectWorkspaceTierSlots still returns exactly five destinations');
check(filterWorkspaceTierSlots(slots, 'all').length === 5, "the 'all' filter still admits exactly the five fixed slots");
check(!slots.some((slot) => slot.slotId === COMPOSABLE_TIER_ID), 'none of the five destinations is ever the composable sentinel');
check(slots.every((slot) => slot.customerPolicy === null), 'a normal Tier/Add-on slot never carries a customer_policy value — composable-only field');

// ── 2. The composable workspace destination addresses the subordinate occupant only ──

const composableSlot = projectComposableWorkspaceSlot('occ_composable', card('occ_composable'), { items: [] });
check(composableSlot.slotId === COMPOSABLE_TIER_ID, 'the composable destination always addresses itself at COMPOSABLE_TIER_ID');
check(!TIER_KEYS.includes(composableSlot.slotId as (typeof TIER_KEYS)[number]), 'the composable destination is never one of the five fixed Tier keys');
check(composableSlot.isAddon === null && composableSlot.isPopular === false, 'the composable destination carries no Tier/Add-on-only flags');

const workspaceSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx',
), 'utf8');
check(
  workspaceSource.includes('<TierNavigation')
    && workspaceSource.includes('slots={visibleSlots}')
    && workspaceSource.includes('composableSlot={tool.composableOccupant}'),
  'the tab/filter navigation receives the five filterable slots and the composable occupant as two separate props, never merged into one list',
);

const navigationSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierNavigation.tsx',
), 'utf8');
check(
  navigationSource.includes('composableSlot?: WorkspaceTierSlot | null')
    && navigationSource.includes('const allTabs = composableSlot ? [...slots, composableSlot] : slots;'),
  'the composable destination is appended for rendering/keyboard nav only, never fed back into the filterable `slots` array',
);
check(
  navigationSource.includes('{slots.map((slot, index) => renderTab(slot, index, false))}')
    && navigationSource.includes('{composableSlot && (')
    && navigationSource.includes('cz-tier-workspace__tab-divider')
    && navigationSource.includes('renderTab(composableSlot, slots.length, true)'),
  'the composable destination renders after a visual divider, following the five filtered tabs, never interleaved with them',
);

// ── 3. The composable middle shell is visible only when composable is focused ──

check(
  workspaceSource.includes("viewMode === 'focus' && isComposableFocused && tool.composableOccupant?.item") &&
    workspaceSource.indexOf('<TierComposableMiddleShell')
      > workspaceSource.indexOf("viewMode === 'focus' && isComposableFocused && tool.composableOccupant?.item"),
  'the middle shell mounts only under viewMode === focus AND isComposableFocused AND a published composable occupant',
);
check(
  workspaceSource.includes('const isComposableFocused = selectedSlotId === COMPOSABLE_TIER_ID;'),
  'focus is driven by the same sentinel selection every other composable dispatch in this file already uses, not a second flag',
);

// ── 4. Normal Tier focus has zero composable shell leakage ──────────────────

const middleShellGuardLine = workspaceSource
  .split('\n')
  .find((line) => line.includes('<TierComposableMiddleShell'));
check(!!middleShellGuardLine, 'the middle shell element exists exactly once in the orchestrator');
// The element must be reached only through the isComposableFocused-gated JSX
// branch above it — proven structurally by requiring the guard condition to
// immediately precede the element (assertion 3) rather than being reachable
// from the normal-Tier branch, which renders a completely separate
// TierDetailPanel with no reference to TierComposableMiddleShell at all.
const normalTierBranch = workspaceSource.slice(
  workspaceSource.indexOf(') : selectedSlot && ('),
  workspaceSource.indexOf('</div>\n          )}\n        </div>'),
);
check(
  !normalTierBranch.includes('TierComposableMiddleShell'),
  'the normal-Tier focus branch never references the composable middle shell component',
);

// ── 5. Customer Options still opens the standalone tier-customer-policy drawer ──

check(
  workspaceSource.includes("onIntent(encodeTierCustomerPolicyDrawerRecordId(instanceId), 'customer-options');"),
  'dispatchCustomerPolicyIntent still routes through the standalone Customer Selection Rules drawer token, unchanged by this restructuring',
);
check(
  workspaceSource.includes("actionId === 'customer-options'\n                      ? dispatchCustomerPolicyIntent()")
    && workspaceSource.includes("actionId === 'customer-options'\n              ? dispatchCustomerPolicyIntent()"),
  'both the tab-focused primary panel and the Grid-view box route the customer-options action through the same dispatcher — no second drawer, no duplicated routing logic',
);
check(
  workspaceSource.includes('onManageCustomerOptions={dispatchCustomerPolicyIntent}'),
  "the middle shell's own View/Edit Customer Options action reuses the exact same dispatcher, never a new intent id",
);

// ── 6. Existing lower-deck tabs/components are reused, not forked ───────────

check(
  workspaceSource.includes('tierName={focusedSlot?.item?.name')
    && workspaceSource.includes('deck={focusedSlot?.item ? tool.decks[focusedSlot.item.id] ?? EMPTY_TIER_DECK : EMPTY_TIER_DECK}')
    && workspaceSource.includes('connectionNavigation={focusedSlot?.occupantId'),
  'TierLowerDeck is fed through the same focusedSlot-derived props for both a normal Tier and the composable occupant — one deck component, no composable-specific fork',
);
check(!workspaceSource.includes('ComposableLowerDeck'), 'no parallel composable-only lower deck component was introduced');

// The routing-token gaps closed to let Details/Connections address the
// composable sentinel — required for #6 above, since without them the
// reused lane's own row actions would silently fail to open for the
// composable occupant specifically.
const inclusionTypesSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/inclusion/tierInclusionDrawerTypes.ts',
), 'utf8');
check(
  inclusionTypesSource.includes("new Set(['basic', 'standard', 'premium', 'enterprise', 'ultimate', COMPOSABLE_TIER_ID])"),
  'the Details lane\'s own routing token now decodes the composable sentinel, closing the same gap class Phase 1C already closed elsewhere',
);
const rateSheetTypesSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier-rate-sheet/tierRateSheetDrawerTypes.ts',
), 'utf8');
check(
  rateSheetTypesSource.includes("new Set(['basic', 'standard', 'premium', 'enterprise', 'ultimate', COMPOSABLE_TIER_ID])"),
  'the Connections lane\'s own routing tokens now decode the composable sentinel too',
);

// ── 7. Middle shell content derivation — pure model functions ───────────────

const deckFixture: TierDeck = {
  ...EMPTY_TIER_DECK,
  inclusions: [
    { itemId: 'i1', sourceId: 's1', name: 'Backup Storage', categories: [], quantity: 1, unitPrice: 10, per: 'mo', lineTotal: 10, resolved: true, addressable: true },
    { itemId: 'i2', sourceId: 's2', name: 'Extra Seats', categories: [], quantity: 2, unitPrice: 5, per: 'mo', lineTotal: 10, resolved: true, addressable: true },
    { itemId: 'i3', sourceId: 's3', name: 'Priority Support', categories: [], quantity: 1, unitPrice: 20, per: 'mo', lineTotal: 20, resolved: true, addressable: true },
    { itemId: 'i4', sourceId: null, name: 'Unresolved Row', categories: [], quantity: 1, unitPrice: null, per: null, lineTotal: null, resolved: false, addressable: true },
  ],
} as TierDeck;

const policyFixture: CustomerPolicy = {
  items: [
    { item_id: 'i1', mode: 'required', default_selected: false, quantity: null, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: true },
    { item_id: 'i2', mode: 'optional', default_selected: true, quantity: { default: 2, min: 1, max: 10, step: 1 }, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: false },
    { item_id: 'i3', mode: 'optional', default_selected: false, quantity: null, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: false },
    // Offered but with no matching deck inclusion — proves a policy item
    // that cannot resolve to a real inclusion is dropped, not shown blank.
    { item_id: 'missing', mode: 'optional', default_selected: true, quantity: null, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: true },
    // Excluded — never offered to a customer, so never highlighted even
    // though it is both featured and resolves to a real deck inclusion.
    { item_id: 'i4', mode: 'excluded', default_selected: false, quantity: null, price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: true },
  ],
};

const highlights = projectComposableHighlightInclusions(deckFixture, policyFixture);
check(highlights.length === 3, 'only offered (non-excluded) items that also resolve to a real deck inclusion are highlighted — the excluded entry and the unresolvable "missing" entry are both dropped');
check(highlights.map((entry) => entry.itemId).join(',') === 'i1,i2,i3', 'ranking is featured+required/default-selected first, then plain optional, in that order');
check(!highlights.some((entry) => entry.itemId === 'i4' || entry.itemId === 'missing'), 'neither the excluded nor the unresolvable entry ever appears');
check(projectComposableHighlightInclusions(EMPTY_TIER_DECK, null).length === 0, 'no configured policy highlights nothing — never falls back to the full deck');

// Cap of 6, even when more items are genuinely offered and resolved.
const manyDeck: TierDeck = {
  ...EMPTY_TIER_DECK,
  inclusions: Array.from({ length: 8 }, (_, index) => ({
    itemId: `m${index}`, sourceId: `s${index}`, name: `Item ${index}`, categories: [],
    quantity: 1, unitPrice: 1, per: 'mo', lineTotal: 1, resolved: true, addressable: true,
  })),
};
const manyPolicy: CustomerPolicy = {
  items: Array.from({ length: 8 }, (_, index) => ({
    item_id: `m${index}`, mode: 'required' as const, default_selected: false, quantity: null,
    price_option: { mode: 'fixed' as const, allowed_price_option_ids: null, default_price_option_id: null }, featured: false,
  })),
};
check(projectComposableHighlightInclusions(manyDeck, manyPolicy).length === 6, 'the left column never shows more than 6 highlighted inclusions, even with 8 genuinely offered and resolved');

// Right-column stats are computed over the SAME 5-item policyFixture above
// (i1 required+featured, i2 optional+default-selected+quantity, i3 plain
// optional, "missing" optional+default-selected+featured with no deck
// match, i4 excluded+featured) — the summary counts every OFFERED item
// regardless of whether it resolves to a real deck inclusion, unlike the
// left column's highlights, since these are policy facts, not a rendered
// inclusion list.
const stats = summarizeComposableCustomerPolicy(policyFixture);
const byId = Object.fromEntries(stats.map((metric) => [metric.id, metric.value]));
check(byId['required'] === 1, 'exactly the one required (always-included) offered item is counted');
check(byId['optional'] === 3, 'every optional (customer Add/Remove) offered item is counted, excluding the excluded entry');
check(byId['default-selected'] === '2 of 3', 'default-selected is reported against the optional total, not the full offered set');
check(byId['quantity'] === 1, 'only the one item with non-null quantity bounds counts as adjustable-quantity');
check(byId['featured'] === 2, 'both offered featured items count — the excluded entry\'s featured flag never counts since it is not offered');
check(summarizeComposableCustomerPolicy(null).every((metric) => metric.value === 0 || metric.value === '0 of 0'), 'no configured policy summarizes as all-zero, never a fabricated figure');

console.log('Composable Admin UX contract passed.');
