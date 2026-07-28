// Contract: Package Family workspace scope resolves only through the explicit
// tier_assignment peer edge. Rate Sheet provenance enriches presentation only.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
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
  tierRateSheetAccessIsValid,
  tierRateSheetAccessPayload,
} from '../resources/ts/package-station/surface/tierInstance/tierRateSheetAccessModel';
import {
  decodeTierRateSheetDrawerRecordId,
  encodeTierRateSheetDrawerRecordId,
  encodeTierRateSheetGroupDrawerRecordId,
} from '../resources/ts/package-station/drawer/tier-rate-sheet/tierRateSheetDrawerTypes';
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
}]);
check(fixedSlots.map((slot) => slot.slotId).join(',') === TIER_KEYS.join(','), 'Focus shell always projects the five fixed slots in canonical order');
check(fixedSlots[0].occupantId === 'occ_kairos_basic', 'occupied slots preserve the real occupant identity');
check(fixedSlots.slice(1).every((slot) => slot.occupantId === null && slot.item === null), 'empty slots never receive fabricated occupant identities');

const summary = buildFamilySummary(kairos);
check(summary.metrics.length === 3, 'Family summary keeps exactly three dependency metrics');
check(
  summary.metrics.map((metric) => metric.id).join(',') === 'services,rate-sheet-rows,tier-selections',
  'capability use is not added to Family dependents',
);

// Category enrichment remains the same two-hop presentation projection.
const categoryByRateItem = buildRateItemCategoryMap(
  [
    { item_id: 'rate_inc_a', source_item_id: 'rel_infra' },
    { item_id: 'rate_inc_b', source_item_id: 'rel_ops' },
  ],
  [
    { item_id: 'rel_infra', source_categories: ['Cloud Infrastructure'] },
    { item_id: 'rel_ops', source_categories: ['Managed Services'] },
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
  title: 'KAIROS Rates',
  status: 'active',
  groups: [{ group_id: 'grp', label: 'Infrastructure', sort_order: 0 }],
};
const inclusions = projectTierInclusions(deckSelections, categoryByRateItem);
check(inclusions.length === 3 && inclusions[0].lineTotal === 140, 'lower-deck inclusion projection remains unchanged');

// Connections: every summary resolves through a stored identity, never a label.
const groupConnections = projectTierRateSheetGroups(deckSelections, rateSheet);
check(groupConnections.length === 1 && groupConnections[0].connectedRows === 3, 'lower-deck Rate Sheet grouping remains unchanged');
check(
  groupConnections[0].groupId === 'grp' && groupConnections[0].rateSheetId === 'rs_kairos',
  'a group connection carries both stored ids a scoped group drawer needs to address it',
);
check(groupConnections[0].status === 'active', 'a group reports its parent sheet status rather than an invented one');
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
check(projectTierRateSheet(deckSelections, null) === null, 'an unbound Tier reports no Rate Sheet connection');

const deck = projectTierDeck(deckSelections, categoryByRateItem, rateSheet);
check(deck.categories.join(',') === 'Cloud Infrastructure,Managed Services', 'lower-deck category filter remains distinct and sorted');
check(deck.rateSheet !== null && deck.groups.length === 1, 'the deck carries the Rate Sheet and group connections it renders');

const unresolvedSheet = projectTierRateSheet(deckSelections, null, 'rs_missing');
check(
  unresolvedSheet?.rateSheetId === 'rs_missing'
    && unresolvedSheet.status === 'unresolved'
    && unresolvedSheet.resolved === false,
  'a stale stored Rate Sheet binding remains visible by its canonical id instead of collapsing to unbound',
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

// ── Connections routing tokens ────────────────────────────────────────────────
// Every Connections action addresses its target by the identities Package
// Station stores, and a malformed address resolves to nothing rather than to a
// default instance, slot, or sheet.
const sheetToken = encodeTierRateSheetDrawerRecordId('ti_kairos', 'basic', 'rs_kairos');
const sheetTarget = decodeTierRateSheetDrawerRecordId(sheetToken);
check(
  sheetTarget !== null
    && sheetTarget.instanceId === 'ti_kairos'
    && sheetTarget.slotId === 'basic'
    && sheetTarget.rateSheetId === 'rs_kairos'
    && sheetTarget.scope.kind === 'sheet',
  'the Rate Sheet connection token round-trips instance, slot, and stored sheet id',
);
const groupToken = encodeTierRateSheetGroupDrawerRecordId('ti_kairos', 'premium', 'rs_kairos', 'rate_group_1');
const groupTarget = decodeTierRateSheetDrawerRecordId(groupToken);
check(
  groupTarget !== null
    && groupTarget.rateSheetId === 'rs_kairos'
    && groupTarget.scope.kind === 'group'
    && groupTarget.scope.groupId === 'rate_group_1',
  'the group connection token round-trips the stored group id inside its stored sheet',
);
check(
  decodeTierRateSheetDrawerRecordId(groupToken)?.scope.kind === 'group'
    && decodeTierRateSheetDrawerRecordId(sheetToken)?.scope.kind === 'sheet',
  'the group grammar is never mistaken for the sheet grammar',
);
for (const malformed of [
  'tier-rate-sheet:ti_kairos:not-a-slot:rs_kairos',
  'tier-rate-sheet:ti_kairos:basic:',
  'tier-rate-sheet:ti_kairos:basic:rs_kairos:extra',
  'tier-rate-sheet-group:ti_kairos:basic:rs_kairos',
  'tier-rate-sheet-group::basic:rs_kairos:rate_group_1',
  'occ_kairos_basic',
]) {
  check(
    decodeTierRateSheetDrawerRecordId(malformed) === null,
    `a malformed connection address resolves to nothing: ${malformed}`,
  );
}

// The Connections lane never re-opens the Tier drawer: every Connections intent
// declares its own drawer key, and none of them is `tier`.
const adminRegister = readFileSync(
  resolve(import.meta.dirname, '..', 'resources/ts/admin-station/register.ts'),
  'utf8',
);
for (const [intentId, templateKey] of [
  ['view-family', 'package-family'],
  ['edit-family', 'package-family'],
  ['view-connected-group', 'tier-rate-sheet-group'],
  ['edit-connected-group', 'tier-rate-sheet-group'],
  ['view-connected-rate-sheet', 'tier-rate-sheet'],
  ['edit-connected-rate-sheet', 'tier-rate-sheet'],
]) {
  const declaration = new RegExp(`id: '${intentId}'[^}]*drawerTemplateKey: '${templateKey}'`);
  check(
    declaration.test(adminRegister),
    `the ${intentId} Connections intent routes to the ${templateKey} drawer, never to the Tier drawer`,
  );
}
const packageRegister = readFileSync(
  resolve(import.meta.dirname, '..', 'resources/ts/package-station/register.ts'),
  'utf8',
);
check(
  !adminRegister.includes("drawerTemplateKey: 'tier-rate-sheet-access'")
    && !packageRegister.includes("key: 'tier-rate-sheet-access'"),
  'Rate Sheet access reuses the registered Tier drawer instead of adding a template or surface intent',
);

const root = resolve(import.meta.dirname, '..');
const packageSource = sourceFiles(resolve(root, 'resources/ts/package-station'))
  .filter((path) => /\.tsx?$/.test(path))
  .map((path) => readFileSync(path, 'utf8')).join('\n');
for (const forbidden of [
  'buildRateItemServiceMap',
  'occupantSupplyingServiceIds',
  'supplyingServiceIds',
  'projectFamilyTierWorkspace',
]) {
  check(!packageSource.includes(forbidden), `obsolete provenance symbol ${forbidden} is deleted`);
}

const workspacePresentationDirectory = resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace',
);
const workspacePresentation = sourceFiles(workspacePresentationDirectory)
  .filter((path) => /\.tsx?$/.test(path))
  .map((path) => readFileSync(path, 'utf8')).join('\n');
for (const forbidden of [
  'allowed_rate_sheet_ids',
  'tool.updateInstance',
  'onAllow',
  'TierRateSheetAccessDraft',
  'TierRateSheetAccessEditor',
  "type: 'checkbox'",
]) {
  check(!workspacePresentation.includes(forbidden), `Package Home presentation owns no Rate Sheet access mutation symbol (${forbidden})`);
}
check(
  workspacePresentation.includes('is complete without a Tier assignment')
    && workspacePresentation.includes('Configure the Tier system from Settings below.'),
  'the no-assignment state keeps the Tier shell and directs setup to Settings without declaring the Family incomplete',
);
check(
  workspacePresentation.includes('No Tier system assigned')
    && workspacePresentation.includes('Register a Tier system'),
  'a Family without an assignment receives an honest setup surface instead of five implied Tier records',
);
// That surface acts, rather than sending the user somewhere else to act. It opens
// the registration drawer directly, carrying the Family the engine already has in
// hand so the drawer pre-selects it — one atomic creation, not a relayed errand.
check(
  workspacePresentation.includes('dispatchTierRegistration(tool.selectedFamily?.id ?? null)'),
  'the no-assignment state registers a Tier system for the Family it is showing',
);
check(
  workspacePresentation.includes("encodeTierRegistrationRecordId(familyId), 'register-tier'"),
  'registration is addressed on the Tier drawer, never a second Tier editor',
);
check(
  !workspacePresentation.includes('Open Tier tool'),
  'the workspace never offers a no-op Open Tier tool action',
);
check(
  workspacePresentation.includes('Which Rate Sheets this Tier system may make available to its Tier slots.')
    && workspacePresentation.includes('Rate Sheet Access'),
  'Rate Sheet access is described as whole-system availability rather than a slot binding',
);

// ── Settings wires no relationship ────────────────────────────────────────────
// Settings reads the WHOLE focus the Package Family Group leads. It never
// assigns a Tier to a Package Family, never offers a Family picker or a
// pre-picked candidate, never keeps a second Tier inventory beside the focused
// one, and never launches an unrelated tool. Each of those relationships is made
// in the drawer that owns the record, so removing them here removed a UI path
// and no capability.
const settingsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx',
), 'utf8');
const focusedSectionsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx',
), 'utf8');
const settingsPresentation = `${settingsSource}\n${focusedSectionsSource}`;
for (const forbidden of [
  'assignInstance',
  'unassignInstance',
  'suggestConsumerForInstance',
  'eligibleFamilies',
  'TierRateSheetInventory',
  'onToolIntent',
  'onManageInstance',
  'tool.updateInstance',
  'onAllow',
  'TierRateSheetAccessDraft',
  "type: 'checkbox'",
  '<form',
  'api.',
]) {
  check(!settingsPresentation.includes(forbidden), `Settings carries no ${forbidden} relationship or mutation workflow`);
}

// ── Settings shell ────────────────────────────────────────────────────────────
// Settings uses the same selector-card and nested-tab contract as Connections;
// each context reset remounts it through the exact workspace scope key.
check(
  settingsSource.includes('variant="selectors"')
    && settingsSource.includes('variant="nested"')
    && settingsSource.includes('const [selectedGroupId, setSelectedGroupId]')
    && settingsSource.includes('const [selectedSections, setSelectedSections]'),
  'Settings uses compact category selectors and one valid nested-tab selection per category',
);
check(
  !existsSync(resolve(root, 'resources/ts/package-station/presentation/package-tier-workspace/TierSettingsNav.tsx'))
    && !existsSync(resolve(root, 'resources/ts/package-station/presentation/package-tier-workspace/DeckDisclosure.tsx')),
  'the retired parallel Settings navigation and disclosure implementations are deleted',
);
check(
  settingsSource.includes('<h4 class="cz-tier-settings__leaf-title">{section.leaf}</h4>'),
  'the selected Settings leaf enters the lower deck outline at the correct heading rank',
);

// The required hierarchy. The focused category is the WHOLE focus the Package
// Family Group leads — not one Tier slot inside it — and it reports that focus
// in the same two categories Connections uses: the Stations it is connected to,
// and the Tools it may use. Exactly two sections, and the fixed Tier slots stay
// the engine's listing, which Settings does not restate beside it.
const focusedGroup = settingsSource.slice(
  settingsSource.indexOf("id: 'focused-package'"),
  settingsSource.indexOf("id: 'package-manager'"),
);
const focusedTitles = [...focusedGroup.matchAll(/title: '([^']+)'/g)].map((match) => match[1]);
check(
  focusedTitles.join(',') === 'Focused Package,Stations,Tools',
  'the focused category is package-focused and holds exactly the Stations and Tools sections',
);
const focusedLeaves = [...focusedGroup.matchAll(/leaf: '([^']+)'/g)].map((match) => match[1]);
check(
  focusedLeaves.join(',') === 'Connected Family Group,Rate Sheet Access',
  'the focused category holds exactly the connected Family Group and the whole-system access section',
);
// The connected Family Group is the workspace's ONE connection projection, and
// it travels the existing connection dispatcher into the drawer that owns the
// record. Settings mints no second row, target, or intent for it.
check(
  settingsSource.includes("import { projectFamilyConnectionRows } from '../../surface/packageTierWorkspace/connectionNavigation'")
    && settingsSource.includes('projectFamilyConnectionRows(family)')
    && focusedGroup.includes('<ConnectedStationsSummary rows={familyRows} onIntent={onConnectionIntent} />'),
  'Settings reports the connected Family Group from the shared projection through the shared connection dispatcher',
);
const connectionNavigationSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/packageTierWorkspace/connectionNavigation.ts',
), 'utf8');
check(
  (connectionNavigationSource.match(/kind:\s+'family',/g) ?? []).length === 1
    && connectionNavigationSource.includes('const familyRows = projectFamilyConnectionRows(family)'),
  'one derivation builds the connected Family row for both the Tier and the whole-focus scope',
);
// The engine above lists every fixed slot and dispatches the occupant and slot
// drawer routes. A second slot listing in Settings addressed the SAME focused
// instance through the SAME routes, so removing it removed a duplicate view and
// no capability. These scan the whole workspace directory — the section, its
// props, and the dispatcher that existed only to feed it — so it cannot grow
// back one file at a time.
for (const retired of [
  'Fixed Tier Slots',
  'Tier Structure',
  'tier-structure',
  'FixedTierSlots',
  'onTierAction',
  'dispatchExplicitTierIntent',
]) {
  check(
    !workspacePresentation.includes(retired),
    `Package Home Settings restates no fixed Tier slot inventory (${retired})`,
  );
}

// ── Package Manager launches; it does not create ──────────────────────────────
// Package Manager offers the same two categories as the focus above it —
// Stations and Tools — and inside them the three pool creations, each a launcher
// into the drawer that owns the record rather than a form. Groups is absent by
// design: a group is stored inside `rate_sheets[].groups[]`, so it has no pool
// and no address apart from the sheet holding it, and the Rate Sheet drawer
// already authors it. A fourth creation could only re-open that same drawer.
const managerGroup = settingsSource.slice(settingsSource.indexOf("id: 'package-manager'"));
const managerTitles = [...managerGroup.matchAll(/title: '([^']+)'/g)].map((match) => match[1]);
check(
  managerTitles.join(',') === 'Package Manager,Stations,Tools',
  'Package Manager holds exactly the Stations and Tools sections',
);
const managerLeaves = [...managerGroup.matchAll(/leaf: '([^']+)'/g)].map((match) => match[1]);
check(
  managerLeaves.join(',') === 'Create a Station record,Create a Tool record',
  'each Package Manager section names the record kind it creates',
);
const managerLaunchers = [...managerGroup.matchAll(/label="(Create [^"]+)"/g)].map((match) => match[1]);
check(
  managerLaunchers.join(',') === 'Create Family,Create Tier,Create Rate Sheet',
  'Package Manager offers exactly the three pool creations, in the required order',
);
check(
  settingsSource.indexOf("id: 'focused-package'") < settingsSource.indexOf("id: 'package-manager'"),
  'Settings presents the focused Package before Package Manager',
);
const poolIntents = [...managerGroup.matchAll(/onPoolIntent\('([^']+)'\)/g)].map((match) => match[1]);
check(
  poolIntents.join(',') === 'family,tier,rate-sheet',
  'every pool subject launches a drawer rather than rendering a creation form, and no fourth subject exists',
);
// Two categories per selector, at both levels, is the shape itself: the deck
// selector renders whatever `sections` declares, so counting them here is what
// keeps a third tab from growing back beside them.
for (const [name, group] of [
  ['the focused Package', focusedGroup],
  ['Package Manager', managerGroup],
] as const) {
  const sectionTitles = [...group.matchAll(/title: '([^']+)'/g)].map((match) => match[1]).slice(1);
  check(
    sectionTitles.join(',') === 'Stations,Tools',
    `${name} presents exactly the two Stations and Tools sections`,
  );
}

// The Settings lane holds no mutation authority of its own. It dispatches a
// subject or exact instance identity and owns no endpoint, draft, save, or form.
for (const forbidden of [
  'createPackageFamily',
  'createRateSheet',
  'createInstance',
  'savePackageStationManager',
  'buildManagerSavePayload',
  'toRateSheetEditorList',
  'updateInstance',
  '<form',
]) {
  check(!settingsPresentation.includes(forbidden), `the Settings lane performs no ${forbidden} of its own`);
}
check(
  !existsSync(resolve(
    root,
    'resources/ts/package-station/presentation/package-tier-workspace/PackageManagerSettings.tsx',
  )),
  'no inline Package Manager creation form survives beside the launchers',
);

// Registration is ONE atomic creation, addressed on the mature `tier` drawer
// rather than a second Tier editor. It fills no slot and chains into no workflow.
const registrationSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierRegistrationContent.tsx',
), 'utf8');
for (const forbidden of [
  'encodeTierSlotDrawerRecordId',
  'saveTierFeatures',
  'allowed_rate_sheet_ids',
  'rate_sheet_id',
  'occupant',
]) {
  check(!registrationSource.includes(forbidden), `registration performs no ${forbidden}`);
}
check(
  registrationSource.includes('registration.instance?.tier_instance_id'),
  'registration reports the stored id the backend minted, never the title it was given',
);

// The drawer footer is HOST state: setting it re-renders the content. Owning no
// footer here is what makes that loop impossible — the module shell carries the
// buttons, so nothing recomputes a footer VNode from a per-render object.
check(
  !registrationSource.includes('setFooter(footer)'),
  'registration sets no computed footer, so it cannot drive the set/re-render loop',
);

// Presentation uses the styled editor vocabulary. `drawerModule__field` and its
// siblings are only styled under `.drawerOverview`, so using them outside that
// scope renders an unstyled form.
// The registration composition uses the styled drawer vocabulary.
for (const [name, source] of [
  ['Tier registration', registrationSource],
] as const) {
  for (const unstyled of [
    'cz-drawer-actions',
    'drawerModule__field',
    'drawerModule__label',
    'drawerModule__hint',
    'drawerModule__fields',
  ]) {
    check(!source.includes(unstyled), `${name} does not use the unstyled ${unstyled}`);
  }
  // A create surface is an edit surface with no record behind it yet, so it
  // wears the module edit shell the mature drawer already wears — which owns
  // Save/Cancel, the dirty confirmation, the busy state and the error slot —
  // rather than hand-rolling a footer beside it.
  check(
    source.includes('InlineEditorShell') || source.includes('EntityDrawer'),
    `${name} wears the drawer kit's mature composition`,
  );
}
// Registration is the SAME composition the drawer already uses: a schema-placed
// overview module, with the module's own inline editor over it. Not a bespoke
// form dropped into the drawer body.
check(
  registrationSource.includes('EntityDrawer')
    && registrationSource.includes('TIER_REGISTRATION_ENTITY')
    && registrationSource.includes("module: 'overview'"),
  'registration renders a placed overview module, not a bespoke form',
);
check(
  registrationSource.includes('handlers: { edit:'),
  'the registered module offers Edit, so it re-enters the same editor',
);
const registrationEditor = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/editors/TierRegistrationEditor.tsx',
), 'utf8');
check(
  registrationEditor.includes('cz-tf-field') && registrationEditor.includes('cz-tf-label')
    && registrationEditor.includes('cz-tf-hint'),
  'the registration editor uses the established cz-tf-* vocabulary',
);
for (const chrome of ['InlineEditorShell', 'EntityActionFooter', 'cz-drawer-actions']) {
  check(!registrationEditor.includes(chrome), `the registration editor owns no ${chrome} of its own`);
}
// Exactly one footer at a time. The readable module owns no buttons of its own,
// so the drawer publishes the record footer's Close; while the module's
// InlineEditorShell owns Save/Cancel the drawer withdraws it — the same way the
// Rate Sheet tool nulls it while editing. What must never happen is two footers
// under one form.
check(
  registrationSource.includes('bridge.setFooter(editing ? null : (')
    && registrationSource.includes('EntityActionFooter'),
  'the registration drawer publishes Close while readable and no footer while editing',
);


// A Package Family is not a field on a Tier system. The instance schema carries
// no Family vocabulary, so the link must stay a separate assignment write.
const registrationHook = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/tierInstance/useTierRegistration.ts',
), 'utf8');
check(
  registrationHook.includes('tool.assignInstance')
    && registrationHook.includes('tool.unassignInstance'),
  'a Family is linked through the assignment ledger, not written onto the instance',
);
for (const forbidden of ['family_id', 'consumer_id:', 'group_id:']) {
  check(!registrationHook.includes(forbidden), `registration writes no ${forbidden} onto the instance`);
}
check(
  registrationHook.includes('tool.eligibleFamilies'),
  'only Families holding no Tier system are offered, so no assignment is silently retargeted',
);

// The atomic-creation hook is gone. Family, Rate Sheet and group creation are
// owned by the drawers that already performed those writes, so a second writer
// of the one Package Manager document must not reappear beside them.
check(
  !existsSync(resolve(root, 'resources/ts/package-station/surface/packageManager')),
  'no second Package Manager creation writer sits beside the drawers that own those writes',
);

check(
  focusedSectionsSource.includes('No Tier system is focused, so no Rate Sheet access is configured.'),
  'the focused section fails closed rather than inventing a system',
);
check(
  focusedSectionsSource.includes('reference={record.tier_instance_id}')
    && focusedSectionsSource.includes("actions={[{ id: 'view', label: 'View' }]}"),
  'Settings identifies access by the instance id and keeps Home access read-only',
);
// The engine keeps the slot listing this Settings section used to duplicate: it
// renders every fixed slot, reports an empty one honestly, and addresses an
// occupied slot by its occupant and an empty slot by its stored slot key.
check(
  workspacePresentation.includes('slots.map((slot, index)')
    && workspacePresentation.includes('data-status="empty">Empty'),
  'the engine still lists every fixed slot and reports an empty one as empty',
);
check(
  workspacePresentation.includes('encodeTierDrawerRecordId(instanceId, occupantId)')
    && workspacePresentation.includes('encodeTierSlotDrawerRecordId(instanceId, slotId)'),
  'the engine addresses an occupied slot by occupant and an empty slot by its stored slot key',
);
check(
  workspacePresentation.includes('scrollIntoView')
    && workspacePresentation.includes('aria-live="polite"')
    && workspacePresentation.includes('openRequestRevision'),
  'repeated Manage Tier system hand-offs remain visible through focus, scroll and a live announcement',
);
check(workspacePresentation.includes('<TierNavigation') && workspacePresentation.includes('<TierLowerDeck'), 'the Focus shell and lower deck remain mounted for empty states');
check(!workspacePresentation.includes('TierInstancePanel'), 'the standalone raw Tier-instance panel is retired');
check(!workspacePresentation.includes('drawerModule__'), 'workspace presentation never leaks drawer-only field classes');
check(!workspacePresentation.includes('cz-admin-btn'), 'workspace presentation never leaks drawer-kit button tokens');
for (const forbidden of [
  'Existing Tier selections suggest',
  'Assign to Package Family',
  'Remove Tier capability',
  'Independent Tier systems',
]) {
  check(
    !workspacePresentation.includes(forbidden),
    `the workspace offers no guessed or guided relationship workflow (${forbidden})`,
  );
}
const workspaceHook = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts',
), 'utf8');
check(workspaceHook.includes('fetchPackageStationManager'), 'Rate Sheet settings load independently from an assigned Tier instance');
check(!workspaceHook.includes('addTierCapability'), 'the workspace never auto-creates and assigns a Tier instance');
const adminStationStyles = readFileSync(resolve(
  root,
  'resources/ts/admin-station/styles/admin-station.css',
), 'utf8');
check(
  /\.cz-tier-deck\s*\{[^}]*color:\s*var\(--station-text\)/s.test(adminStationStyles),
  'the lower deck closes inherited foreground colour at its Station surface boundary',
);
const foregroundRuleStart = adminStationStyles.indexOf('/* Keep every primary data value');
const foregroundRule = foregroundRuleStart >= 0
  ? adminStationStyles.slice(foregroundRuleStart, adminStationStyles.indexOf('}', foregroundRuleStart) + 1)
  : '';
check(foregroundRule.includes('color: var(--station-text)'), 'primary deck values resolve to the Station foreground token');
for (const selector of [
  '.cz-tier-deck__identity-name',
  '.cz-tier-deck__field',
  '.cz-tier-settings__leaf-title',
]) {
  check(foregroundRule.includes(selector), `${selector} participates in the Station foreground rule`);
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : [path];
  });
}
const familySource = [
  resolve(root, 'resources/ts/package-station/drawer/package-family'),
  resolve(root, 'resources/ts/package-station/surface/packageFamily'),
].flatMap(sourceFiles).filter((path) => /\.tsx?$/.test(path))
  .map((path) => readFileSync(path, 'utf8')).join('\n');
for (const forbidden of ['usePackageStation', 'tierOccupants', 'TIER_ENTITY']) {
  check(!familySource.includes(forbidden), `Family surfaces do not import obsolete Tier authority ${forbidden}`);
}
const familyCapabilityBindingSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/schema/bindings/packageFamily.tsx',
), 'utf8');
check(
  familyCapabilityBindingSource.includes("label: 'Manage Tier system'")
    && !familyCapabilityBindingSource.includes("label: 'Open Tier tool'"),
  'Family capability navigation names the visible management hand-off honestly',
);
check(
  familySource.includes('onManageTierSystem')
    && familySource.includes("navigate('packages')"),
  'the Admin host adapter carries Manage Tier system into the Packages destination',
);

// ── Empty-slot drawer entry ───────────────────────────────────────────────────
// An empty fixed slot opens the ordinary readable module screen. The drawer
// explains no setup sequence above it and opens no editor for it: the empty Tier
// Overview module carries its own Pending pill, that pill's message, and the Edit
// action that opens the editor — the cycle Included Features and Common Questions
// already follow.
const tierDrawerSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierDrawerContent.tsx',
), 'utf8');
check(
  !tierDrawerSource.includes('cz-tier-drawer-setup')
    && !tierDrawerSource.includes('This fixed slot is empty.'),
  'the empty-slot drawer presents no explanation block above its modules',
);
const tierDrawerHostSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx',
), 'utf8');
check(
  tierDrawerHostSource.includes(
    "initialTierSection={mode === 'edit' && slotTarget === null ? 'tier-overview' : undefined}",
  ),
  'an empty slot opens on the readable Overview screen, never straight into the Tier Overview editor',
);
const tierBindingsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/schema/bindings/tier.tsx',
), 'utf8');
check(
  (tierBindingsSource.match(/footer:\s+DETAILS_FOOTER/g) ?? []).length === 3
    && tierBindingsSource.includes("edit: { id: 'edit', label: 'Edit', intent: 'secondary' }"),
  'all three Tier modules offer the same Edit action into their own inline editor',
);
const tierModuleRules = readFileSync(resolve(
  root,
  'resources/ts/drawer-kit/utils/moduleNotifications/tier.ts',
), 'utf8');
check(
  /tierOverviewModule[^}]*emptyPrompt:\s+'Edit and configure this tier\.'/s.test(tierModuleRules),
  'the empty Tier Overview module carries the message its Pending pill opens with',
);

// ── Connections card / tab / row composition ────────────────────────────────────
const lowerDeckSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx',
), 'utf8');
const tabSetSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierTabSet.tsx',
), 'utf8');
// Tab behaviour and accessibility are the shared station primitive's; the
// Package file above keeps only the deck skin each variant wears.
const stationTabSetSource = readFileSync(resolve(
  root,
  'resources/ts/admin-station/presentation/StationTabSet.tsx',
), 'utf8');
const connectionsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierConnections.tsx',
), 'utf8');
const connectionRowSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierConnectionRow.tsx',
), 'utf8');
const workspaceSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx',
), 'utf8');

check(
  workspaceSource.includes("onIntent(encodeTierInstanceDrawerRecordId(targetInstanceId), 'view')")
    && settingsSource.includes('onView={onInstanceIntent}'),
  'Settings dispatches the exact whole-instance token through ordinary View into the registered Tier drawer',
);

check(
  lowerDeckSource.includes('<TierTabSet') && connectionsSource.includes('variant="selectors"')
    && connectionsSource.includes('variant="nested"'),
  'one workspace tab contract renders the deck lanes, compact selectors, and nested connection tabs',
);
check(
  tabSetSource.includes('<StationTabSet')
    && !/role="tab(list|panel)?"/.test(tabSetSource)
    && !tabSetSource.includes('event.key ==='),
  'the workspace tab contract delegates tab semantics and keyboard movement to the shared primitive',
);
check(
  stationTabSetSource.includes('role="tablist"')
    && stationTabSetSource.includes('role="tab"')
    && stationTabSetSource.includes('aria-selected={selected}')
    && stationTabSetSource.includes('aria-controls={panelId(item.id)}')
    && stationTabSetSource.includes('id={panelId(item.id)}')
    && stationTabSetSource.includes('role="tabpanel"')
    && stationTabSetSource.includes('aria-labelledby={tabId(item.id)}')
    && stationTabSetSource.includes('tabIndex={selected ? 0 : -1}')
    && stationTabSetSource.includes('hidden={item.id !== selectedId}'),
  'every workspace tab level has matching tab/panel ids and a roving tab stop',
);
check(
  stationTabSetSource.includes("event.key === 'ArrowLeft'")
    && stationTabSetSource.includes("event.key === 'ArrowUp'")
    && stationTabSetSource.includes("event.key === 'Home'")
    && stationTabSetSource.includes("event.key === 'End'")
    && stationTabSetSource.includes("'ArrowRight', 'ArrowDown'"),
  'the shared tab contract supports Arrow, Home, and End keyboard navigation',
);
// The three deck skins stay Package-owned: the shared primitive must never name
// a Tier class, and the Package skin must never name a Tier lane.
check(
  !stationTabSetSource.includes('cz-tier-')
    && ['deck', 'nested', 'selectors'].every((variant) => tabSetSource.includes(`${variant}: {`)),
  'the shared tab primitive carries no Tier class and the deck variants stay Package-owned',
);
check(
  connectionsSource.includes('navigation: ConnectionNavigationCategory[]')
    && connectionsSource.includes('tab.rows.length === 0')
    && connectionsSource.includes('{tab.emptyState}')
    && connectionRowSource.includes('row.target'),
  'Connections renders the typed projection rows and honest empty state, then dispatches the canonical target',
);
check(
  !connectionsSource.includes('projectConnectionNavigation')
    && !connectionsSource.includes('NotConfiguredRow')
    && !connectionsSource.includes('family: WorkspaceFamilyScope')
    && !connectionsSource.includes('groups: DeckRateSheetGroupConnection')
    && !connectionsSource.includes('rateSheet: DeckRateSheetConnection'),
  'Connections owns no domain derivation, raw domain collections, or placeholder entity rows',
);
check(
  connectionRowSource.includes('StationSplitAction')
    && connectionRowSource.includes("view: 'View'")
    && connectionRowSource.includes('cz-station-list__row--connection')
    && connectionRowSource.includes('TierDeckRowIdentity'),
  'connection rows retain canonical identity, primary View, supported secondary actions, and Station split actions',
);
// A connected record reads the same at both scopes, so exactly one component
// renders it. Neither lane may re-author those cells beside it.
check(
  connectionsSource.includes('<TierConnectionRow')
    && focusedSectionsSource.includes('<TierConnectionRow')
    && (connectionRowSource.match(/cz-station-list__row--connection/g) ?? []).length === 1,
  'the focused-Tier and whole-focus lanes render one connected-record row component',
);
// Settings keeps its own one-field Rate Sheet Access row — that record is not a
// connection — but neither lane re-authors the connected record's cells.
for (const [name, source] of [
  ['Connections', connectionsSource],
  ['Settings', focusedSectionsSource],
] as const) {
  for (const cell of ['Assigned Services', 'Connected inclusions', 'Connected rows']) {
    check(
      !source.includes(`>${cell}<`),
      `${name} re-authors none of the connected-record row cells (${cell})`,
    );
  }
}

// ── One list system ───────────────────────────────────────────────────────────
// Details, Connections and Settings are the SAME record list as the Service
// Catalogue, in the markup shape a header-less list needs. The surface is
// declared once in admin-station.css and named by both shapes; the deck's former
// parallel family is retired, and no deck row may re-author a list surface here.
for (const [name, source] of [
  ['Details', lowerDeckSource],
  ['Connections', connectionRowSource],
  ['Settings', focusedSectionsSource],
] as const) {
  check(
    source.includes('cz-station-list__row') && source.includes('cz-station-list__cell'),
    `${name} rows are rows of the one station list system`,
  );
  check(!source.includes('<table'), `${name} stays a list and brings across no table`);
}
for (const retired of [
  'cz-tier-deck__list',
  'cz-tier-deck__row"',
  'cz-tier-deck__row ',
  'cz-tier-deck__row--',
  'cz-tier-settings__row',
  'cz-tier-deck__field--hide-sm',
]) {
  check(
    !workspacePresentation.includes(retired),
    `the retired parallel deck list family is gone (${retired})`,
  );
}
check(
  lowerDeckSource.includes('key={connectionScopeKey}')
    && workspaceSource.includes("tool.selectedFamily?.id ?? 'unassigned'")
    && workspaceSource.includes("instanceId ?? 'no-instance'")
    && workspaceSource.includes("selectedSlot?.slotId ?? 'no-slot'")
    && workspaceSource.includes("selectedSlot?.occupantId ?? 'empty'"),
  'connection selection state resets on the exact Family, instance, slot, and occupant scope',
);
check(
  lowerDeckSource.includes('<TierSystemSettings\n              key={connectionScopeKey}')
    && connectionsSource.includes('<h4 class="cz-tier-deck__lane-title">{tab.title}</h4>'),
  'Settings resets on the same exact context and nested connection panels preserve the lower-deck heading outline',
);
check(
  workspaceSource.includes("target.kind === 'package-family'")
    && workspaceSource.includes("target.kind === 'rate-sheet-group'")
    && workspaceSource.includes('target.rateSheetId')
    && workspaceSource.includes('target.groupId'),
  'the orchestrator resolves the typed target union through the existing canonical drawer routes',
);
check(
  /encodeTierRateSheetGroupDrawerRecordId\(\s*instanceId,\s*selectedSlot\.slotId,\s*target\.rateSheetId,\s*target\.groupId,\s*\)/s.test(workspaceSource)
    && workspaceSource.includes('encodeTierRateSheetDrawerRecordId(instanceId, selectedSlot.slotId, target.rateSheetId)'),
  'group and Rate Sheet routes preserve the canonical instance, slot, sheet, then nested-group argument order',
);

const scopedDrawerSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/rate-sheet-tool/TierRateSheetDrawer.tsx',
), 'utf8');
check(
  scopedDrawerSource.includes('RateSheetGridRead') && scopedDrawerSource.includes('RateSheetGridEditor'),
  'the focused-Tier Rate Sheet drawer reuses the shared readable and editable grid',
);
check(
  !scopedDrawerSource.includes('RateSheetSheetEditor') && !scopedDrawerSource.includes('RateSheetCollectionEditor'),
  'the focused-Tier Rate Sheet drawer duplicates no Rate Sheet editor',
);
const sheetScopeBranch = scopedDrawerSource.slice(scopedDrawerSource.indexOf('// Rate Sheet scope:'));
check(
  !sheetScopeBranch.includes('RateSheetGroups'),
  'the Rate Sheet scope shows only the grid — the Groups section belongs to the group scope',
);

console.log('Package Tier workspace contract checks passed.');
