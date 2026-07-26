// Contract: Package Family workspace scope resolves only through the explicit
// tier_assignment peer edge. Rate Sheet provenance enriches presentation only.

import { readFileSync, readdirSync, statSync } from 'node:fs';
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
  type DeckSelection,
} from '../resources/ts/package-station/surface/packageTierWorkspace/deck';
import {
  decodeTierRateSheetDrawerRecordId,
  encodeTierRateSheetDrawerRecordId,
  encodeTierRateSheetGroupDrawerRecordId,
} from '../resources/ts/package-station/drawer/tier-rate-sheet/tierRateSheetDrawerTypes';
import type {
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
const rateSheet = {
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
check(
  workspacePresentation.includes('is complete without a Tier assignment')
    && workspacePresentation.includes('Configure the Tier system from Settings below.'),
  'the no-assignment state keeps the Tier shell and directs setup to Settings without declaring the Family incomplete',
);
check(
  workspacePresentation.includes('No Tier system assigned')
    && workspacePresentation.includes('Set up Tier pricing'),
  'a Family without an assignment receives an honest setup surface instead of five implied Tier records',
);
check(
  !workspacePresentation.includes('Open Tier tool')
    && workspacePresentation.includes("slot.occupied ? 'view' : 'edit'"),
  'workspace actions open the authoritative fixed-slot drawer and never offer a no-op Open Tier tool action',
);
check(
  workspacePresentation.includes('Rate Sheet access')
    && workspacePresentation.includes('Each Tier chooses its own Rate Sheet when configured.'),
  'Rate Sheet access is distinguished from each Tier slot’s own Rate Sheet binding',
);

// ── Settings wires no relationship ────────────────────────────────────────────
// Settings configures the ONE focused Tier system. It never assigns a Tier to a
// Package Family, never offers a Family picker or a pre-picked candidate, never
// keeps a second Tier inventory beside the focused one, and never launches an
// unrelated tool. Each of those relationships is made in the drawer that owns the
// record, so removing them here removed a UI path and no capability.
const settingsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierSystemSettings.tsx',
), 'utf8');
for (const forbidden of [
  'assignInstance',
  'unassignInstance',
  'suggestConsumerForInstance',
  'eligibleFamilies',
  'TierRateSheetInventory',
  'onToolIntent',
  'onManageInstance',
]) {
  check(!settingsSource.includes(forbidden), `Settings carries no ${forbidden} relationship workflow`);
}
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
  '.cz-tier-settings__slots li',
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

const tierDrawerSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/tier/TierDrawerContent.tsx',
), 'utf8');
check(
  tierDrawerSource.includes('Choose the Rate Sheet that supplies pricing rows.')
    && tierDrawerSource.includes('Add included features and optional common questions.')
    && tierDrawerSource.includes('Publish the Tier when it is ready.'),
  'the existing empty-slot drawer explains its authoritative setup sequence',
);

// ── Connections lane composition ──────────────────────────────────────────────
const lowerDeckSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx',
), 'utf8');
const connectionsLane = lowerDeckSource.slice(lowerDeckSource.indexOf('function ConnectionsLane'));

// Connections is exactly two top-level disclosures — Stations and Tools — and the
// connected record types live inside them as named subsections, never as siblings.
check(
  (connectionsLane.match(/<ConnectionDisclosure$/gm) ?? []).length === 2,
  'the Connections lane opens exactly two top-level disclosures',
);
const stationsScope = connectionsLane.slice(
  connectionsLane.indexOf('title="Stations"'),
  connectionsLane.indexOf('title="Tools"'),
);
check(
  connectionsLane.indexOf('title="Stations"') < connectionsLane.indexOf('title="Tools"'),
  'the Connections lane presents Stations before Tools',
);
check(
  stationsScope.includes('title="Family Groups"') && stationsScope.includes('title="Groups"'),
  'Stations holds the Family Groups and Groups subsections',
);
check(
  connectionsLane.slice(connectionsLane.indexOf('title="Tools"')).includes('title="Rate Sheets"'),
  'Tools holds the Rate Sheets subsection',
);
check(
  stationsScope.includes('defaultOpen') && !connectionsLane.slice(
    connectionsLane.indexOf('title="Tools"'),
  ).includes('defaultOpen'),
  'Stations opens by default and Tools stays collapsed until asked for',
);

// The disclosure is a real, keyboard-operable button bound to its own panel — it
// adds presentation state and nothing else.
const disclosureSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/ConnectionDisclosure.tsx',
), 'utf8');
check(
  disclosureSource.includes('type="button"')
    && disclosureSource.includes('aria-expanded={open}')
    && disclosureSource.includes('aria-controls={panelId}')
    && disclosureSource.includes('aria-labelledby={triggerId}')
    && disclosureSource.includes('useId'),
  'the Connections disclosure is a real button with aria-expanded, aria-controls and stable ids',
);
check(
  !connectionsLane.includes('onIntent') && !connectionsLane.includes('onInclusionIntent'),
  'the Connections lane dispatches no Tier-scoped or inclusion-scoped intent, so no row re-opens the Tier drawer',
);
check(
  connectionsLane.includes('onFamilyIntent(family.id')
    && connectionsLane.includes('onGroupIntent(group.rateSheetId, group.groupId')
    && connectionsLane.includes('onRateSheetIntent(rateSheet.rateSheetId'),
  'every Connections row dispatches the connected record\'s own stored id, never its label',
);
check(
  connectionsLane.includes('NotConfiguredRow') && connectionsLane.includes('DISABLED_ROW_ACTIONS'),
  'a missing connection reports Not configured with its actions disabled rather than omitted',
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
