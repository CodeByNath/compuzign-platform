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

// ── Settings shell ────────────────────────────────────────────────────────────
// Settings is a three-level tree, and its navigation and accordions are two
// controls over ONE open-section id. The leaf heading is rendered by the shell,
// so a section cannot advertise one hierarchy in the navigation and present
// another in its panel.
const navigationSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierSettingsNav.tsx',
), 'utf8');
check(
  settingsSource.includes('const [openId, setOpenId]')
    && settingsSource.includes('open={openId === section.id}')
    && settingsSource.includes('openId={openId}'),
  'the section navigation and the accordions read the same open-section id',
);
check(
  navigationSource.includes('aria-controls={`${idFor(section.id)}-panel`}')
    && navigationSource.includes('aria-expanded={current}')
    && navigationSource.includes("aria-current={current ? 'true' : undefined}"),
  'each navigation item names the panel it controls and reports that panel’s state',
);
check(
  settingsSource.includes('idPrefix={idFor(section.id)}'),
  'the navigation and the disclosure address the same panel id',
);
check(
  settingsSource.includes('<h6 class="cz-tier-settings__leaf-title">{section.leaf}</h6>')
    && settingsSource.includes('headingLevel={5}'),
  'the shell renders one leaf heading per section beneath the section’s own heading',
);

// The required hierarchy, in order. Focused Tier System carries exactly Rate
// Sheet Access and Fixed Tier Slots and nothing else.
const focusedGroup = settingsSource.slice(settingsSource.indexOf("id: 'focused-tier-system'"));
for (const expected of [
  "title: 'Access'",
  "leaf: 'Rate Sheet Access'",
  "title: 'Tier Structure'",
  "leaf: 'Fixed Tier Slots'",
]) {
  check(focusedGroup.includes(expected), `Focused Tier System declares ${expected}`);
}
check(
  focusedGroup.indexOf("title: 'Access'") < focusedGroup.indexOf("title: 'Tier Structure'"),
  'Focused Tier System presents Access before Tier Structure',
);

// ── Package Manager launches; it does not create ──────────────────────────────
// Package Manager is three pool subjects, and a subject offers a launcher into
// the drawer that owns the record — not a form. Groups is absent by design: a
// group is stored inside `rate_sheets[].groups[]`, so it has no pool and no
// address apart from the sheet holding it, and the Rate Sheet drawer already
// authors it. A fourth entry could only re-open that same drawer.
const managerGroup = settingsSource.slice(settingsSource.indexOf("id: 'package-manager'"));
const managerLeaves = [...managerGroup.matchAll(/leaf: '([^']+)'/g)].map((match) => match[1]);
check(
  managerLeaves.join(',') === 'Create Family,Create Tier,Create Rate Sheet',
  'Package Manager holds exactly the three pool creations, in the required order',
);
const managerTitles = [...managerGroup.matchAll(/title: '([^']+)'/g)].map((match) => match[1]);
check(
  managerTitles.join(',') === 'Package Manager,Families,Tiers,Rate Sheets',
  'Package Manager holds exactly the three pool subjects and no Groups section',
);
check(
  settingsSource.indexOf("id: 'focused-tier-system'") < settingsSource.indexOf("id: 'package-manager'"),
  'Settings presents Focused Tier System before Package Manager',
);
check(
  managerGroup.includes("onPoolIntent('family')")
    && managerGroup.includes("onPoolIntent('tier')")
    && managerGroup.includes("onPoolIntent('rate-sheet')"),
  'every pool subject launches a drawer rather than rendering a creation form',
);

// The Settings lane holds no creation authority of its own. It dispatches a
// subject and nothing else — no endpoint, no draft, no save, no form. Its one
// remaining write is the focused instance's own `allowed_rate_sheet_ids`, which
// configures a Tier system rather than creating a pool record.
for (const forbidden of [
  'createPackageFamily',
  'createRateSheet',
  'createInstance',
  'savePackageStationManager',
  'buildManagerSavePayload',
  'toRateSheetEditorList',
  '<form',
]) {
  check(!settingsSource.includes(forbidden), `the Settings lane performs no ${forbidden} of its own`);
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
// Every drawer create composition uses the styled vocabularies. `drawerModule__*`
// field classes are styled ONLY under `.drawerOverview`, and `cz-drawer-actions`
// is styled nowhere at all — both render an unstyled drawer. The action footer
// belongs to the drawer kit, which owns that one visual grammar.
const familyCreateSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/drawer/package-family/PackageFamilyCreateContent.tsx',
), 'utf8');
for (const [name, source] of [
  ['Tier registration', registrationSource],
  ['Package Family create', familyCreateSource],
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

const focusedSectionsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/FocusedTierSettings.tsx',
), 'utf8');
check(
  focusedSectionsSource.includes('No Tier system is focused, so no Rate Sheet access is configured.')
    && focusedSectionsSource.includes('No Tier system is focused, so there are no slots to configure.')
    && focusedSectionsSource.includes('No active Rate Sheet exists, so this Tier system can reach none.'),
  'the focused sections fail closed rather than inventing a system, a sheet, or a slot',
);
// Every focused row is addressed by a stored id, and an unresolvable grant keeps
// its id rather than borrowing another sheet's title.
check(
  focusedSectionsSource.includes('reference={row.rateSheetId}')
    && focusedSectionsSource.includes('reference={slot.slotId}')
    && focusedSectionsSource.includes("name={row.title ?? 'Unresolved Rate Sheet'}"),
  'the focused sections identify each record by its own stored id',
);
// An occupied slot offers View and Edit into the mature Tier drawer; an empty one
// offers only Configure, because there is no occupant identity to view.
const slotSection = focusedSectionsSource.slice(focusedSectionsSource.indexOf('export function FixedTierSlots'));
check(
  slotSection.includes('<StationSplitAction')
    && slotSection.includes('actions={SLOT_ACTIONS}')
    && slotSection.includes("onTierAction(record.tier_instance_id, slot.slotId, null, 'edit')"),
  'occupied slots offer View and Edit while an empty slot offers only Configure',
);
check(
  slotSection.includes('slot.occupantId === null') && !slotSection.includes('occ_'),
  'an empty slot is reported empty and never given a fabricated occupant id',
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

// ── Connections lane composition ──────────────────────────────────────────────
const lowerDeckSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx',
), 'utf8');
const connectionsLane = lowerDeckSource.slice(lowerDeckSource.indexOf('function ConnectionsLane'));

// Connections is exactly two top-level disclosures — Stations and Tools — and the
// connected record types live inside them as named subsections, never as siblings.
check(
  (connectionsLane.match(/<DeckDisclosure$/gm) ?? []).length === 2,
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
// adds presentation state and nothing else. One implementation serves both lanes:
// the Connections lane lets each section hold its own state, Settings drives them
// from one shared id, and neither forks the accessible markup.
const disclosureSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/package-tier-workspace/DeckDisclosure.tsx',
), 'utf8');
check(
  disclosureSource.includes('type="button"')
    && disclosureSource.includes('aria-expanded={open}')
    && disclosureSource.includes('aria-controls={panelId}')
    && disclosureSource.includes('aria-labelledby={triggerId}')
    && disclosureSource.includes('useId'),
  'the deck disclosure is a real button with aria-expanded, aria-controls and stable ids',
);
check(
  disclosureSource.includes('controlledOpen ?? uncontrolledOpen')
    && disclosureSource.includes('idPrefix ?? uid'),
  'the deck disclosure supports a controlled open state and a caller-supplied id stem',
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
