// Contract: the Tier Workspace's pure surface/derivation layer — Family
// assignment resolution, occupant/slot projection, the Details/Connections
// deck projections, Rate Sheet access, and the connection-navigation
// projection every lane reads. Pure functions only: no file reads, no
// presentation.
//
// This file previously also carried the Connections lane, the Settings lane,
// the registered Tier drawer's own composition, and the orchestrating shell
// — an accreted god file. Those now have their own focused contracts:
//   - scripts/tier-connections-contract.ts         — the Connections lane
//   - scripts/tier-settings-contract.ts            — the Settings lane
//   - scripts/tier-system-drawer-contract.ts       — the Tier System/occupant drawer
//   - scripts/package-tier-workspace-shell-contract.ts — the orchestrating shell

import {
  filterWorkspaceTierSlots,
  projectResolvedInstanceOccupants,
  projectWorkspaceTierSlots,
  resolveFamilyTierAssignment,
  summarizeTierInstance,
  type WorkspaceFamilyScope,
} from '../resources/ts/package-station/surface/packageTierWorkspace/projection';
import { buildFamilySummary } from '../resources/ts/package-station/surface/packageTierWorkspace/familySummary';
import {
  buildRateItemCategoryMap,
  projectTierDeck,
  projectTierInclusions,
  projectTierRateSheet,
  projectTierRateSheetGroups,
  type DeckRateSheet,
  type DeckSelection,
} from '../resources/ts/package-station/surface/packageTierWorkspace/deck';
import { projectConnectionNavigation } from '../resources/ts/package-station/surface/packageTierWorkspace/connectionNavigation';
import {
  projectTierRateSheetAccess,
  tierRateSheetAccessDraft,
  tierRateSheetAccessIsDirty,
  tierRateSheetAccessPayload,
} from '../resources/ts/package-station/surface/tierInstance/tierRateSheetAccessModel';
import type {
  PackageRateSheet,
  TierAssignment,
  TierInstanceRecord,
} from '../resources/ts/package-station/types';
import { TIER_KEYS } from '../resources/ts/package-station/vocabulary';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Tier workspace contract: ${message}`);
}

function family(id: string): WorkspaceFamilyScope {
  return {
    id,
    name: id,
    description: `${id} positioning`,
    status: 'active',
    dependents: { services: 1, rate_sheet_rows: 2, tier_selections: 3 },
    platformId: `CZPG_${id.toUpperCase()}`,
  };
}

function instance(id: string, occupantId: string, withSelections = true): TierInstanceRecord {
  return {
    tier_instance_id: id,
    title: `${id} Tiers`,
    status: 'active',
    allowed_rate_sheet_ids: [],
    popular_tier: 'basic',
    popular_label: 'Popular',
    tiers: Object.fromEntries(TIER_KEYS.map((slotId) => [slotId, {
      current_occupant: slotId === 'basic' ? {
        id: occupantId,
        platform_status: 'active',
        rate_sheet_items: withSelections ? [{ item_id: 'rate_shared', quantity: 1 }] : [],
      } : null,
      history: [],
      drafts: { overview: null, features: null, faqs: null },
      module_status: {},
    }])),
    occupant_bin: [],
  };
}

const kairos = family('pcg_kairos');
const aptos = family('pcg_aptos');
const omnia = family('pcg_omnia');
const kairosRecord = instance('ti_kairos', 'occ_kairos_basic');
const aptosRecord = instance('ti_aptos', 'occ_aptos_basic');
const emptySelectionRecord = instance('ti_empty_selection', 'occ_no_selections', false);
const summaries = [kairosRecord, aptosRecord, emptySelectionRecord].map(summarizeTierInstance);
const assignments: TierAssignment[] = [
  {
    assignment_id: 'tasg_kairos', consumer_type: 'package_family',
    consumer_id: kairos.id, tier_instance_id: kairosRecord.tier_instance_id,
  },
  {
    assignment_id: 'tasg_aptos', consumer_type: 'package_family',
    consumer_id: aptos.id, tier_instance_id: aptosRecord.tier_instance_id,
  },
];

check(
  resolveFamilyTierAssignment(kairos, assignments, summaries)?.tier_instance_id === 'ti_kairos',
  'KAIROS resolves only its exact assigned instance',
);
check(
  resolveFamilyTierAssignment(aptos, assignments, summaries)?.tier_instance_id === 'ti_aptos',
  'APTOS resolves only its exact assigned instance',
);
check(
  resolveFamilyTierAssignment(omnia, assignments, summaries) === null,
  'an unassigned Family resolves to the neutral null state',
);
check(
  resolveFamilyTierAssignment(kairos, [{ ...assignments[0], tier_instance_id: 'ti_missing' }], summaries) === null,
  'a dangling assignment fails closed instead of selecting another instance',
);
check(
  resolveFamilyTierAssignment(kairos, [assignments[0], { ...assignments[0], assignment_id: 'tasg_duplicate', tier_instance_id: 'ti_aptos' }], summaries) === null,
  'duplicate Family assignments fail closed instead of picking one',
);

const occupantsByInstance = new Map([
  ['ti_kairos', [{ id: 'occ_kairos_basic', selections: ['rate_from_aptos_service'] }]],
  ['ti_aptos', [{ id: 'occ_aptos_basic', selections: ['rate_from_kairos_service'] }]],
  ['ti_empty_selection', [{ id: 'occ_no_selections', selections: [] as string[] }]],
]);
const kairosResolved = resolveFamilyTierAssignment(kairos, assignments, summaries)!;
const aptosResolved = resolveFamilyTierAssignment(aptos, assignments, summaries)!;
const kairosOccupants = projectResolvedInstanceOccupants(
  kairosResolved,
  occupantsByInstance.get(kairosResolved.tier_instance_id) ?? [],
);
const aptosOccupants = projectResolvedInstanceOccupants(
  aptosResolved,
  occupantsByInstance.get(aptosResolved.tier_instance_id) ?? [],
);
check(kairosOccupants.map((item) => item.id).join(',') === 'occ_kairos_basic', 'KAIROS projects its instance occupants only');
check(aptosOccupants.map((item) => item.id).join(',') === 'occ_aptos_basic', 'APTOS projects its instance occupants only');
check(
  !kairosOccupants.some((left) => aptosOccupants.some((right) => right.id === left.id)),
  'an occupant is never projected under two Families',
);
check(
  kairosOccupants[0].selections[0] === 'rate_from_aptos_service'
    && aptosOccupants[0].selections[0] === 'rate_from_kairos_service',
  'Rate Sheet provenance has zero influence on Family assignment scope',
);
check(
  kairosRecord.tiers.basic.current_occupant?.id !== aptosRecord.tiers.basic.current_occupant?.id,
  'same-named slots in two instances preserve distinct occ_ identities',
);
const emptyAssignment: TierAssignment = {
  assignment_id: 'tasg_empty', consumer_type: 'package_family',
  consumer_id: omnia.id, tier_instance_id: emptySelectionRecord.tier_instance_id,
};
const emptyResolved = resolveFamilyTierAssignment(omnia, [...assignments, emptyAssignment], summaries);
check(
  projectResolvedInstanceOccupants(emptyResolved, occupantsByInstance.get('ti_empty_selection') ?? [])[0]?.id === 'occ_no_selections',
  'an occupant with no Rate Sheet selections still projects under its assigned Family',
);
check(
  projectResolvedInstanceOccupants(null, occupantsByInstance.get('ti_kairos') ?? []).length === 0,
  'no assignment never leaks another Family instance occupants',
);

const fixedSlots = projectWorkspaceTierSlots([{
  slotId: 'basic',
  occupantId: 'occ_kairos_basic',
  item: { id: 'occ_kairos_basic', name: 'Starter' } as never,
  isAddon: false,
  isPopular: true,
}]);
check(fixedSlots.map((slot) => slot.slotId).join(',') === TIER_KEYS.join(','), 'Focus shell always projects the five fixed slots in canonical order');
check(fixedSlots[0].occupantId === 'occ_kairos_basic', 'occupied slots preserve the real occupant identity');
check(fixedSlots.slice(1).every((slot) => slot.occupantId === null && slot.item === null), 'empty slots never receive fabricated occupant identities');

// Left Package Tiers list filter — is_addon and popular reach the slot
// projection, and the filter narrows the fixed five-slot shell without
// re-collecting it or fabricating identity for the slots it hides.
const mixedSlots = projectWorkspaceTierSlots([
  { slotId: 'basic', occupantId: 'occ_basic', item: { id: 'occ_basic', name: 'Basic' } as never, isAddon: false, isPopular: true },
  { slotId: 'standard', occupantId: 'occ_addon', item: { id: 'occ_addon', name: 'Add-on' } as never, isAddon: true, isPopular: false },
]);
check(mixedSlots[0].isAddon === false && mixedSlots[0].isPopular === true, 'a normal occupant carries its is_addon and popular-Tier values unchanged');
check(mixedSlots[1].isAddon === true && mixedSlots[1].isPopular === false, 'an add-on occupant carries its own is_addon value, independent of the popular Tier');
check(mixedSlots.slice(2).every((slot) => slot.isAddon === null && slot.isPopular === false), 'an empty slot has no determined occupant type');

check(filterWorkspaceTierSlots(mixedSlots, 'all').length === 5, 'the "all" filter keeps every fixed slot, occupied or empty');
check(
  filterWorkspaceTierSlots(mixedSlots, 'tiers').map((slot) => slot.slotId).join(',') === 'basic',
  'the "tiers" filter keeps only is_addon === false occupants and excludes empty slots',
);
check(
  filterWorkspaceTierSlots(mixedSlots, 'addons').map((slot) => slot.slotId).join(',') === 'standard',
  'the "addons" filter keeps only is_addon === true occupants and excludes empty slots',
);
check(
  filterWorkspaceTierSlots(mixedSlots, 'addons').every((slot) => mixedSlots.some((source) => source.slotId === slot.slotId)),
  'filtering never fabricates a slot outside the source five-slot shell',
);
const allNormalSlots = projectWorkspaceTierSlots([
  { slotId: 'basic', occupantId: 'occ_basic', item: { id: 'occ_basic', name: 'Basic' } as never, isAddon: false, isPopular: false },
]);
check(
  filterWorkspaceTierSlots(allNormalSlots, 'addons').length === 0,
  'a filter with no matching occupants yields an empty visible list rather than falling back to another filter',
);

// The Family card is the composition of existing atomic relations —
// ── Family summary: a THIN rendering contract ────────────────────────────────
// The Family card no longer derives anything. Its four counts come from the
// assigned Tier Group's own canonical CZTG read, which composes them from its
// own occupants — proven in tests/tier-group-composition.php, not here. What
// remains here is only that the card renders what it is handed, in a fixed
// order, and fails closed when handed nothing.
const summary = buildFamilySummary(kairos, {
  tiers: 4, service_categories: 3, services: 2, inclusions: 7,
});
check(summary.metrics.length === 4, 'the Family card renders exactly four metrics');
check(
  summary.metrics.map((metric) => metric.id).join(',') === 'tiers,service-categories,services,inclusions',
  'the Family card reads Tiers, Service Categories, Services, Inclusions in that fixed order',
);
check(
  summary.metrics.map((metric) => metric.value).join(',') === '4,3,2,7',
  'every value is the Tier Group\'s own reported figure, passed through untouched and never re-derived',
);
check(summary.composed === true, 'a card handed a composition reports itself composed');

// `kairos.dependents` is deliberately {services: 1, rate_sheet_rows: 2,
// tier_selections: 3}. None of the values above matches any of them, and the
// uncomposed case below proves those Family-owned edges cannot reach this card.
const uncomposed = buildFamilySummary(kairos);
check(
  uncomposed.metrics.every((metric) => metric.value === '—'),
  'with no composition the card shows an explicit unavailable value — never 0, which would claim the Tier Group reaches nothing',
);
check(uncomposed.composed === false, 'an uncomposed card reports itself uncomposed so presentation can mark it busy');
check(
  uncomposed.metrics.every((metric) => Object.values(kairos.dependents).every((count) => metric.value !== count)),
  'a Family with no usable Tier Group answer never falls back to its own dependents counts',
);

// Zero is a real, distinct answer: the Tier Group composed and reaches nothing.
const composedEmpty = buildFamilySummary(kairos, {
  tiers: 0, service_categories: 0, services: 0, inclusions: 0,
});
check(
  composedEmpty.composed === true && composedEmpty.metrics.every((metric) => metric.value === 0),
  'a real zero composition renders as 0 and stays distinguishable from unavailable',
);

// Category enrichment remains the same two-hop DISPLAY projection. The Details
// lane still needs category names; it never needed CZS/CZC, and the identity
// facet that briefly lived here moved to the Tier Group projection that
// actually composes with it.
const categoryByRateItem = buildRateItemCategoryMap(
  [
    { item_id: 'rate_inc_a', source_item_id: 'rel_infra' },
    { item_id: 'rate_inc_b', source_item_id: 'rel_ops' },
    // What a Bundle's own supplied child resolves against — same two-hop
    // map, no second category mechanism for a Bundle-expanded row.
    { item_id: 'rate_bundle_child', source_item_id: 'rel_bundle_child' },
  ],
  [
    { item_id: 'rel_infra', source_categories: ['Cloud Infrastructure'] },
    { item_id: 'rel_ops', source_categories: ['Managed Services'] },
    { item_id: 'rel_bundle_child', source_categories: ['Bundle Category'] },
  ],
);
check(
  JSON.stringify(categoryByRateItem.get('rate_inc_a')) === JSON.stringify(['Cloud Infrastructure']),
  'Service categories still enrich Rate Sheet inclusion rows',
);

const deckSelections: DeckSelection[] = [
  { item_id: 'rate_inc_a', source_type: 'inclusion', source_id: 'inc-1', quantity: 2, resolved: true, label: 'Cloud', unit_price: 70, per: 'Per month', line_total: 140, group_id: 'grp' },
  { item_id: 'rate_inc_b', source_type: 'inclusion', source_id: 'inc-2', quantity: 1, resolved: true, label: 'Operations', unit_price: 208, per: 'Per month', line_total: 208, group_id: 'grp' },
  { item_id: 'rate_faq', source_type: 'faq', source_id: 'faq-1', quantity: 1, resolved: true, label: 'FAQ', unit_price: 0, per: 'Per month', line_total: 0, group_id: 'grp' },
  { item_id: 'rate_missing', source_type: 'inclusion', source_id: 'inc-3', quantity: 1, resolved: false, label: '(unresolved)', unit_price: null, per: null, line_total: null, group_id: null },
];
const rateSheet: DeckRateSheet = {
  rate_sheet_id: 'rs_kairos',
  platform_id: 'CZPRC_KAIROS',
  title: 'KAIROS Rates',
  status: 'active',
  groups: [{ group_id: 'grp', label: 'Infrastructure', sort_order: 0, platform_id: 'CZPRCG_INFRA' }],
};
const inclusions = projectTierInclusions(deckSelections, categoryByRateItem, rateSheet.rate_sheet_id);
check(inclusions.length === 3 && inclusions[0].lineTotal === 140, 'lower-deck inclusion projection remains unchanged');
check(
  JSON.stringify(inclusions[0].categories) === JSON.stringify(['Cloud Infrastructure']),
  'the Details lane keeps its category names — genuine Tier-level display, not Family roll-up plumbing',
);
check(
  inclusions[0].addressable === true,
  'an ordinary directly-selected row is addressable — its itemId IS the Tier\'s own selection key',
);

// Connections: every summary resolves through a stored identity, never a label.
const groupConnections = projectTierRateSheetGroups(deckSelections, rateSheet);
check(groupConnections.length === 1 && groupConnections[0].connectedRows === 3, 'lower-deck Rate Sheet grouping remains unchanged');
check(
  groupConnections[0].groupId === 'grp' && groupConnections[0].rateSheetId === 'rs_kairos',
  'a group connection carries both stored ids a scoped group drawer needs to address it',
);
check(groupConnections[0].status === 'active', 'a group reports its parent sheet status rather than an invented one');
check(
  groupConnections[0].platformId === 'CZPRCG_INFRA',
  'a group connection carries the stored group\'s own Platform ID, never a synthesised one',
);
check(
  groupConnections[0].connectedInclusions === 2,
  'a group connection counts only its inclusion-sourced resolved rows, distinct from its total connectedRows',
);
check(
  projectTierRateSheetGroups(deckSelections, null).length === 0,
  'no bound Rate Sheet connects no groups',
);
check(
  projectTierRateSheetGroups(
    [{ ...deckSelections[0], group_id: 'grp_gone' }],
    rateSheet,
  ).length === 0,
  'a selection naming a group the sheet no longer stores never mints a group identity',
);

const sheetConnection = projectTierRateSheet(deckSelections, rateSheet);
check(
  sheetConnection !== null && sheetConnection.rateSheetId === 'rs_kairos' && sheetConnection.status === 'active',
  'the Rate Sheet connection carries the sheet\'s own stored identity and status',
);
check(
  sheetConnection !== null && sheetConnection.connectedRows === 3 && sheetConnection.connectedInclusions === 2,
  'the Rate Sheet connection counts the focused Tier\'s resolved rows and its inclusions separately',
);
check(
  sheetConnection !== null && sheetConnection.platformId === 'CZPRC_KAIROS',
  'the Rate Sheet connection carries the sheet\'s own stored Platform ID, never a synthesised one',
);
check(projectTierRateSheet(deckSelections, null) === null, 'an unbound Tier reports no Rate Sheet connection');

const deck = projectTierDeck(deckSelections, categoryByRateItem, rateSheet);
check(deck.categories.join(',') === 'Cloud Infrastructure,Managed Services', 'lower-deck category filter remains distinct and sorted');
check(deck.rateSheet !== null && deck.groups.length === 1, 'the deck carries the Rate Sheet and group connections it renders');

// The OMNIA — Banking live defect, corrected in two stages. First: a
// self-priced Bundle-backed selection carried no Manager `source_type` of
// its own (it stands behind itself), so it was dropped outright. Second
// (live validation correction): naively keeping the Bundle SHELL as the one
// counted/displayed Inclusion was still wrong — a Bundle is the Tier's
// commercial selection/pricing vehicle, never an Inclusion in its own right
// (the same split the customer Cost Builder's TierCard already applies:
// PricingTiers.tsx renders the Bundle row as a non-checkable header, never
// counted, while its `includes[]` render as the real checkable rows). The
// correct projection EXPANDS a Bundle into its real supplied rows.
const bundleSelection: DeckSelection = {
  item_id: 'rate_bundle', source_type: null, source_id: null, quantity: 1,
  resolved: true, label: 'Foundation Bundle', unit_price: 300, per: 'Per Module',
  line_total: 300, group_id: 'grp', bundle_id: 'rsb_1',
  includes: [{ item_id: 'rate_bundle_child', source_rate_sheet_id: 'rs_kairos', source_item_id: 'rel_bundle_child', label: 'Website Revamp', quantity: 1 }],
};
const selectionsWithBundle = [...deckSelections, bundleSelection];

const inclusionsWithBundle = projectTierInclusions(selectionsWithBundle, categoryByRateItem, rateSheet.rate_sheet_id);
check(
  inclusionsWithBundle.length === 4
    && !inclusionsWithBundle.some((row) => row.itemId === 'rate_bundle')
    && inclusionsWithBundle.some((row) => row.itemId === 'rate_bundle_child' && row.name === 'Website Revamp'),
  'a self-priced Bundle-backed selection expands into its real supplied inclusion rows — the shell itself never appears as its own row',
);
check(
  JSON.stringify(inclusionsWithBundle.find((row) => row.itemId === 'rate_bundle_child')?.categories) === JSON.stringify(['Bundle Category']),
  'a Bundle child\'s categories resolve through the same category map an ordinary directly-selected row\'s does',
);
check(
  inclusionsWithBundle.find((row) => row.itemId === 'rate_bundle_child')?.unitPrice === null,
  'a Bundle child carries no per-item price of its own — the Bundle\'s own commercial price is independent of what its ingredients would sum to',
);
check(
  inclusionsWithBundle.find((row) => row.itemId === 'rate_bundle_child')?.addressable === false,
  'a Bundle-supplied row is NOT addressable — the Tier selected the Bundle shell, not this row, so it must never be dispatched as a top-level selection',
);

const groupConnectionsWithBundle = projectTierRateSheetGroups(selectionsWithBundle, rateSheet);
check(
  groupConnectionsWithBundle[0].connectedRows === 4 && groupConnectionsWithBundle[0].connectedInclusions === 3,
  'a Bundle-backed selection is ONE connected row (still one physical selection) but contributes exactly its supplied-children count toward connectedInclusions, not 1',
);

const sheetConnectionWithBundle = projectTierRateSheet(selectionsWithBundle, rateSheet);
check(
  sheetConnectionWithBundle !== null && sheetConnectionWithBundle.connectedInclusions === 3,
  'the Rate Sheet connection\'s connectedInclusions likewise counts a Bundle\'s real supplied children, never the shell',
);

// Dedup: the SAME real row reached directly AND through a Bundle, or through
// TWO different Bundles, is ONE Inclusion everywhere — never counted or
// shown twice, the same authoritative-identity rule
// PackageRepository::composeTierGroup() applies server-side (audit
// correction: a naive flatMap/sum let this reappear on the frontend even
// after the backend already deduped it).
const bundleSelectionDirectOverlap: DeckSelection = {
  item_id: 'rate_bundle_2', source_type: null, source_id: null, quantity: 1,
  resolved: true, label: 'Overlap Bundle A', unit_price: 50, per: 'Per Module',
  line_total: 50, group_id: 'grp', bundle_id: 'rsb_2',
  // Reaches the SAME real row `rate_inc_a` a direct selection already reaches.
  includes: [{ item_id: 'rate_inc_a', source_rate_sheet_id: 'rs_kairos', source_item_id: 'rel_infra', label: 'Cloud', quantity: 1 }],
};
const bundleSelectionBundleOverlap: DeckSelection = {
  item_id: 'rate_bundle_3', source_type: null, source_id: null, quantity: 1,
  resolved: true, label: 'Overlap Bundle B', unit_price: 40, per: 'Per Module',
  line_total: 40, group_id: 'grp', bundle_id: 'rsb_3',
  // Reaches the SAME real row `bundleSelection` above already reaches.
  includes: [{ item_id: 'rate_bundle_child', source_rate_sheet_id: 'rs_kairos', source_item_id: 'rel_bundle_child', label: 'Website Revamp', quantity: 1 }],
};
const selectionsWithOverlap = [...selectionsWithBundle, bundleSelectionDirectOverlap, bundleSelectionBundleOverlap];

const inclusionsWithOverlap = projectTierInclusions(selectionsWithOverlap, categoryByRateItem, rateSheet.rate_sheet_id);
check(
  inclusionsWithOverlap.length === 4,
  'the Details lane dedupes: rate_inc_a and rate_bundle_child each appear ONCE despite being reached twice (directly+Bundle, and Bundle+Bundle)',
);

const groupConnectionsWithOverlap = projectTierRateSheetGroups(selectionsWithOverlap, rateSheet);
check(
  groupConnectionsWithOverlap[0].connectedRows === 6 && groupConnectionsWithOverlap[0].connectedInclusions === 3,
  'connectedRows counts every physical selection (6) but connectedInclusions dedupes to the 3 distinct real rows they collectively reach',
);

const sheetConnectionWithOverlap = projectTierRateSheet(selectionsWithOverlap, rateSheet);
check(
  sheetConnectionWithOverlap !== null && sheetConnectionWithOverlap.connectedInclusions === 3,
  'the Rate Sheet connection dedupes the same way as the group and Details lanes',
);

// Addressability must not depend on which occurrence the array happens to
// list first — a genuine direct Tier selection always wins, whether the
// overlapping Bundle sits BEFORE or AFTER it (audit round 3: a naive
// first-occurrence-wins dedupe let a Bundle processed first permanently
// suppress the later real direct selection's own addressable row).
check(
  inclusionsWithOverlap.find((row) => row.itemId === 'rate_inc_a')?.addressable === true
    && inclusionsWithOverlap.find((row) => row.itemId === 'rate_inc_a')?.unitPrice === 70,
  'direct selection BEFORE its Bundle overlap: the deduped row is addressable and carries the direct selection\'s real price, not the Bundle child\'s null',
);

// The same overlap, but with the Bundle occurrence placed FIRST in the
// array and the genuine direct selection second.
const bundleBeforeDirect: DeckSelection = {
  item_id: 'rate_bundle_4', source_type: null, source_id: null, quantity: 1,
  resolved: true, label: 'Overlap Bundle C', unit_price: 60, per: 'Per Module',
  line_total: 60, group_id: 'grp', bundle_id: 'rsb_4',
  // Reaches `rate_inc_b`, whose OWN direct selection sits LATER in
  // `deckSelections` below.
  includes: [{ item_id: 'rate_inc_b', source_rate_sheet_id: 'rs_kairos', source_item_id: 'rel_ops', label: 'Operations', quantity: 1 }],
};
const selectionsWithBundleFirst = [bundleBeforeDirect, ...deckSelections];
const inclusionsWithBundleFirst = projectTierInclusions(selectionsWithBundleFirst, categoryByRateItem, rateSheet.rate_sheet_id);
check(
  inclusionsWithBundleFirst.filter((row) => row.itemId === 'rate_inc_b').length === 1
    && inclusionsWithBundleFirst.find((row) => row.itemId === 'rate_inc_b')?.addressable === true
    && inclusionsWithBundleFirst.find((row) => row.itemId === 'rate_inc_b')?.unitPrice === 208,
  'Bundle overlap BEFORE the genuine direct selection: still ONE row, still addressable, still the direct selection\'s real price — order in the array has zero effect on addressability',
);

const unresolvedSheet = projectTierRateSheet(deckSelections, null, 'rs_missing');
check(
  unresolvedSheet?.rateSheetId === 'rs_missing'
    && unresolvedSheet.status === 'unresolved'
    && unresolvedSheet.resolved === false,
  'a stale stored Rate Sheet binding remains visible by its canonical id instead of collapsing to unbound',
);
check(
  unresolvedSheet?.platformId === '',
  'an unresolved Rate Sheet carries no Platform ID rather than inventing one',
);

const accessSheets: PackageRateSheet[] = [
  { rate_sheet_id: 'rs_active', title: 'Active', status: 'active', groups: [], items: [] },
  { rate_sheet_id: 'rs_second', title: 'Second', status: 'active', groups: [], items: [] },
  { rate_sheet_id: 'rs_archived', title: 'Archived', status: 'archived', groups: [], items: [] },
];

// Semantic correction (2026-08-15): an empty allow-list is EXPLICIT — it
// means nothing is configured yet, never "every active Rate Sheet". A newly
// created/assigned Tier system must be able to exist with zero access.
const emptyAccess = projectTierRateSheetAccess(
  { ...kairosRecord, allowed_rate_sheet_ids: [] },
  accessSheets,
);
check(
  !('unrestricted' in emptyAccess),
  'the projection carries no unrestricted flag — there is no implicit "all active" mode left to derive',
);
check(
  emptyAccess.activeCount === 2
    && emptyAccess.allowedActiveCount === 0
    && emptyAccess.allowedCount === 0
    && emptyAccess.summary === 'No Rate Sheets allowed yet'
    && emptyAccess.rows.every((row) => !row.allowed),
  'an empty allow-list projects zero allowed active sheets, not every active sheet',
);
check(
  !emptyAccess.needsReview,
  'zero configured access is the ordinary unconfigured default, not a state needing review',
);
// The candidate pool — every active sheet the admin MAY choose — is
// unaffected by an empty allow-list. Candidates and allowed are different
// concepts: hiding the candidates because nothing is allowed yet is the exact
// defect this correction removes.
check(
  emptyAccess.rows.filter((row) => row.status === 'active').length === 2,
  'the candidate pool (active sheets) stays fully visible even when nothing is allowed yet',
);
const emptyDraft = tierRateSheetAccessDraft(emptyAccess);
check(
  emptyDraft.allowedRateSheetIds.length === 0 && tierRateSheetAccessPayload(emptyDraft).length === 0,
  'a zero-access projection seeds and saves as a genuinely empty draft',
);
check(
  !tierRateSheetAccessIsDirty(emptyDraft, { ...kairosRecord, allowed_rate_sheet_ids: [] }),
  'an unchanged empty draft is not dirty against an already-empty stored record',
);

const limitedRecord = {
  ...kairosRecord,
  allowed_rate_sheet_ids: ['rs_active', 'rs_archived', 'rs_missing'],
};
const limitedAccess = projectTierRateSheetAccess(limitedRecord, accessSheets);
check(
  limitedAccess.allowedCount === 3
    && limitedAccess.allowedActiveCount === 1
    && limitedAccess.unresolvedCount === 1
    && limitedAccess.needsReview,
  'explicit access distinguishes usable active grants from archived and unresolved stored ids, and an unresolved reference DOES need review',
);
check(
  limitedAccess.rows.some((row) => row.rateSheetId === 'rs_active' && row.allowed)
    && limitedAccess.rows.some((row) => row.rateSheetId === 'rs_second' && !row.allowed),
  'an explicitly allowed active sheet is selectable; a non-allowed active sheet is not',
);
check(
  limitedAccess.rows.some((row) => row.rateSheetId === 'rs_archived' && row.status === 'archived')
    && limitedAccess.rows.some((row) => row.rateSheetId === 'rs_missing' && row.status === 'unresolved'),
  'archived and unresolved stored ids remain visible by their own identities',
);
const limitedDraft = tierRateSheetAccessDraft(limitedAccess);
check(!tierRateSheetAccessIsDirty(limitedDraft, limitedRecord), 'an unchanged limited draft is not dirty');
check(
  tierRateSheetAccessPayload({ allowedRateSheetIds: [' rs_active ', 'rs_active'] }).join(',') === 'rs_active',
  'the save payload trims and de-duplicates the draft ids before backend validation',
);
check(
  tierRateSheetAccessPayload({ allowedRateSheetIds: [] }).length === 0,
  'an explicitly empty draft saves as empty — deselecting everything is a valid, savable choice, never rejected',
);

// A brand new active Rate Sheet must never silently inherit an existing Tier
// system's access — the allow-list is a fixed stored list, not a rule that
// re-evaluates against whatever sheets happen to exist later.
const growingSheets: PackageRateSheet[] = [
  ...accessSheets,
  { rate_sheet_id: 'rs_new', title: 'New', status: 'active', groups: [], items: [] },
];
const afterGrowth = projectTierRateSheetAccess(limitedRecord, growingSheets);
check(
  afterGrowth.allowedActiveCount === limitedAccess.allowedActiveCount
    && afterGrowth.rows.find((row) => row.rateSheetId === 'rs_new')?.allowed === false,
  'a newly created active Rate Sheet is a new candidate row, never automatically allowed for an existing Tier system',
);

// The Connections navigation is one typed projection: the same rows feed cards,
// counts, nested tabs, statuses, and canonical drawer targets.
const connectionNavigation = projectConnectionNavigation({
  family: kairos,
  groups: groupConnections,
  rateSheet: sheetConnection,
  hasFocusedTier: true,
});
check(
  connectionNavigation.map((category) => category.id).join(',') === 'stations,tools',
  'Connections exposes only the supported Stations and Tools categories',
);
check(
  connectionNavigation[0].tabs.map((tab) => tab.id).join(',') === 'family-groups,groups'
    && connectionNavigation[1].tabs.map((tab) => tab.id).join(',') === 'rate-sheets',
  'each Connections category owns its valid nested tab set',
);
check(
  connectionNavigation[0].summary === '1 Family · 1 Group'
    && connectionNavigation[1].summary === '1 Rate Sheet',
  'selector summaries derive from the same row arrays they expose',
);
const familyTarget = connectionNavigation[0].tabs[0].rows[0]?.target;
const groupTargetFromNavigation = connectionNavigation[0].tabs[1].rows[0]?.target;
const sheetTargetFromNavigation = connectionNavigation[1].tabs[0].rows[0]?.target;
check(
  familyTarget?.kind === 'package-family' && familyTarget.familyId === 'pcg_kairos',
  'the Family row carries the canonical Package Family id',
);
check(
  groupTargetFromNavigation?.kind === 'rate-sheet-group'
    && groupTargetFromNavigation.rateSheetId === 'rs_kairos'
    && groupTargetFromNavigation.groupId === 'grp',
  'the Group row carries its canonical parent-sheet and group ids',
);
check(
  sheetTargetFromNavigation?.kind === 'rate-sheet'
    && sheetTargetFromNavigation.rateSheetId === 'rs_kairos',
  'the Rate Sheet row carries its canonical sheet id',
);
// Platform IDs reach presentation through the same rows — never invented from
// a WordPress native id, slug, Service id, or Tier occupant id.
check(
  connectionNavigation[0].tabs[0].rows[0]?.platformId === kairos.platformId
    && connectionNavigation[0].tabs[1].rows[0]?.platformId === 'CZPRCG_INFRA'
    && connectionNavigation[1].tabs[0].rows[0]?.platformId === 'CZPRC_KAIROS',
  'the Family, Group, and Rate Sheet rows each carry their own owning record\'s Platform ID',
);
const emptyConnectionNavigation = projectConnectionNavigation({
  family: null,
  groups: [],
  rateSheet: null,
  hasFocusedTier: false,
});
check(
  emptyConnectionNavigation[0].summary === 'No Family'
    && emptyConnectionNavigation[1].summary === 'Focus a Tier'
    && emptyConnectionNavigation.every((category) => category.tabs.every((tab) =>
      tab.rows.length === 0 && tab.emptyState.trim().length > 0)),
  'unfocused Connections reports honest empty states without placeholder records or counts',
);
const unresolvedNavigation = projectConnectionNavigation({
  family: kairos,
  groups: [],
  rateSheet: unresolvedSheet,
  hasFocusedTier: true,
});
const unresolvedNavigationRow = unresolvedNavigation[1].tabs[0].rows[0];
check(
  unresolvedNavigationRow?.kind === 'rate-sheet'
    && unresolvedNavigationRow.status === 'unresolved'
    && unresolvedNavigationRow.target.kind === 'rate-sheet'
    && unresolvedNavigationRow.target.rateSheetId === 'rs_missing'
    && unresolvedNavigationRow.actions.join(',') === 'view',
  'an unresolved Rate Sheet stays visible at its canonical target and offers no unsupported Edit action',
);


console.log('Package Tier workspace contract checks passed.');
