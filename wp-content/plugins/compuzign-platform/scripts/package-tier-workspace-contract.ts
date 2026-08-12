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
import {
  buildFamilySummary,
  collateFamilyTierComposition,
} from '../resources/ts/package-station/surface/packageTierWorkspace/familySummary';
import {
  buildRateItemProvenanceMap,
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
  tierRateSheetAccessIsValid,
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
// Family → Tier → occupant → inclusion — never a Family-owned edge to a
// Service Category, Service, or Rate Sheet. It reports exactly four counts,
// and only Tiers is the Family's own direct relation.
// `kairos.dependents` is deliberately {services: 1, rate_sheet_rows: 2,
// tier_selections: 3} and none of the four counts below is derived from it —
// the zero-composition case further down is the proof that the old Family-owned
// edges can no longer reach this card.
const summary = buildFamilySummary(kairos, collateFamilyTierComposition(3, [
  {
    inclusions: [
      { servicePlatformId: 'CZS_INFRA', categoryPlatformIds: ['CZC_CLOUD'] },
      { servicePlatformId: 'CZS_INFRA', categoryPlatformIds: ['CZC_CLOUD'] },
    ],
  },
  {
    inclusions: [
      { servicePlatformId: 'CZS_OPS', categoryPlatformIds: ['CZC_MANAGED', 'CZC_CLOUD'] },
      { servicePlatformId: 'CZS_BACKUP', categoryPlatformIds: ['CZC_RESILIENCE', 'CZC_ARCHIVE'] },
    ],
  },
  { inclusions: [] },
]));
check(summary.metrics.length === 4, 'Family summary reports exactly four collated relationships');
check(
  summary.metrics.map((metric) => metric.id).join(',') === 'tiers,service-categories,services,inclusions',
  'the Family card reads Tiers, Service Categories, Services, Inclusions in that fixed order',
);
const metricValue = (id: string): number =>
  summary.metrics.find((metric) => metric.id === id)?.value ?? -1;
check(metricValue('tiers') === 3, 'Tiers is the assigned Tier system\'s own registered-Tier count, supplied by the direct relation');
// Tiers must NOT be re-derived from the occupant bridge. Handing the same three
// registered Tiers a SHORTER occupant list (one occupant's inclusions loaded)
// must leave Tiers at 3 while only the downstream metrics shrink.
const partialBridge = buildFamilySummary(kairos, collateFamilyTierComposition(3, [
  { inclusions: [{ servicePlatformId: 'CZS_INFRA', categoryPlatformIds: ['CZC_CLOUD'] }] },
]));
check(
  partialBridge.metrics.find((metric) => metric.id === 'tiers')?.value === 3
  && partialBridge.metrics.find((metric) => metric.id === 'inclusions')?.value === 1,
  'the occupant traversal is the inclusion bridge only — it can never redefine the Tier count',
);
check(metricValue('inclusions') === 4, 'Inclusions totals every Rate Sheet row belonging to those occupants, duplicates included');
check(metricValue('services') === 3, 'Services is the distinct Service Platform IDs those inclusions carry, deduplicated across rows');
check(metricValue('service-categories') === 4, 'Service Categories is the distinct Category Platform IDs those inclusions carry, deduplicated across occupants');

// A Family whose Tier assignment does not resolve composes nothing. Zero is the
// honest answer; the direct `dependents` edges must never fill the gap.
const unassignedSummary = buildFamilySummary(kairos);
check(
  unassignedSummary.metrics.every((metric) => metric.value === 0),
  'a Family with no resolved Tier system reports zeros, never its Family→Service/Rate Sheet dependents',
);

// An owner holding no Platform ID yet contributes no identity — never a bucket
// keyed on its name, and never a silent +1.
const anonymousSummary = buildFamilySummary(kairos, collateFamilyTierComposition(1, [
  { inclusions: [
    { servicePlatformId: '', categoryPlatformIds: [] },
    { servicePlatformId: 'CZS_INFRA', categoryPlatformIds: ['CZC_CLOUD'] },
  ] },
]));
check(
  anonymousSummary.metrics.find((metric) => metric.id === 'services')?.value === 1
  && anonymousSummary.metrics.find((metric) => metric.id === 'service-categories')?.value === 1
  && anonymousSummary.metrics.find((metric) => metric.id === 'inclusions')?.value === 2,
  'a row whose Service/Category carries no Platform ID still counts as an Inclusion but adds no identity',
);

// Source provenance remains the same single two-hop projection, now carrying
// the identity facet beside the display facet.
const provenanceByRateItem = buildRateItemProvenanceMap(
  [
    { item_id: 'rate_inc_a', source_item_id: 'rel_infra' },
    { item_id: 'rate_inc_b', source_item_id: 'rel_ops' },
  ],
  [
    {
      item_id: 'rel_infra',
      source_categories: ['Cloud Infrastructure'],
      source_service_platform_id: 'CZS_INFRA',
      source_category_platform_ids: ['CZC_CLOUD'],
    },
    {
      item_id: 'rel_ops',
      source_categories: ['Managed Services'],
      source_service_platform_id: 'CZS_OPS',
      source_category_platform_ids: ['CZC_MANAGED'],
    },
  ],
);
check(
  JSON.stringify(provenanceByRateItem.get('rate_inc_a')?.categories) === JSON.stringify(['Cloud Infrastructure']),
  'Service categories still enrich Rate Sheet inclusion rows',
);
check(
  provenanceByRateItem.get('rate_inc_a')?.servicePlatformId === 'CZS_INFRA'
  && JSON.stringify(provenanceByRateItem.get('rate_inc_a')?.categoryPlatformIds) === JSON.stringify(['CZC_CLOUD']),
  'the same two-hop read carries the row\'s downstream Platform IDs, so identity and display can never drift apart',
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
const inclusions = projectTierInclusions(deckSelections, provenanceByRateItem);
check(inclusions.length === 3 && inclusions[0].lineTotal === 140, 'lower-deck inclusion projection remains unchanged');
check(
  inclusions[0].servicePlatformId === 'CZS_INFRA'
  && JSON.stringify(inclusions[0].categoryPlatformIds) === JSON.stringify(['CZC_CLOUD']),
  'an inclusion row carries the downstream Platform IDs a collating reader identifies it by',
);
check(
  inclusions[2].servicePlatformId === '' && inclusions[2].categoryPlatformIds.length === 0,
  'a row with no resolvable relationship carries no identity rather than a fabricated one',
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

const deck = projectTierDeck(deckSelections, provenanceByRateItem, rateSheet);
check(deck.categories.join(',') === 'Cloud Infrastructure,Managed Services', 'lower-deck category filter remains distinct and sorted');
check(deck.rateSheet !== null && deck.groups.length === 1, 'the deck carries the Rate Sheet and group connections it renders');

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
const unrestrictedAccess = projectTierRateSheetAccess(
  { ...kairosRecord, allowed_rate_sheet_ids: [] },
  accessSheets,
);
check(
  unrestrictedAccess.unrestricted
    && unrestrictedAccess.activeCount === 2
    && unrestrictedAccess.allowedActiveCount === 2
    && unrestrictedAccess.summary === 'All 2 active Rate Sheets'
    && !unrestrictedAccess.needsReview,
  'an empty allow-list means all active Rate Sheets and its summary/counts share that projection',
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
  'limited access distinguishes usable active grants from archived and unresolved stored ids',
);
check(
  limitedAccess.rows.some((row) => row.rateSheetId === 'rs_archived' && row.status === 'archived')
    && limitedAccess.rows.some((row) => row.rateSheetId === 'rs_missing' && row.status === 'unresolved'),
  'archived and unresolved stored ids remain visible by their own identities',
);
const limitedDraft = tierRateSheetAccessDraft(limitedAccess);
check(!tierRateSheetAccessIsDirty(limitedDraft, limitedRecord), 'an unchanged limited draft is not saveable');
check(tierRateSheetAccessIsValid(limitedDraft, limitedAccess), 'a limited draft with one active sheet is valid');
check(
  !tierRateSheetAccessIsValid(
    { mode: 'limited', allowedRateSheetIds: ['rs_archived', 'rs_missing'] },
    limitedAccess,
  ),
  'limited access must retain at least one active Rate Sheet',
);
check(
  tierRateSheetAccessPayload({ mode: 'limited', allowedRateSheetIds: [' rs_active ', 'rs_active'] }).join(',') === 'rs_active',
  'the save payload trims and de-duplicates the draft ids before backend validation',
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
