// Contract: the Rate Sheet tool's pure read-model ⇄ editor ⇄ save mapping for the
// rate_sheets[] COLLECTION.
//
// Guards the rules that must never drift: existing sheet `rate_sheet_id`, row
// `item_id`/`source_item_id`, and group `group_id` are preserved verbatim; a save
// is a partial upsert set plus an explicit deletion list; a curated row is sent
// with a blank id (the backend derives it); referenced/settled relationships are
// re-sent as item decisions so they stay Tier-consumable; deleting a group
// reassigns its rows; connecting a source Service appends a deduplicated
// relationship. The tool mints no IDs and invents no storage.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  addEditorPriceOption,
  addEditorRow,
  buildManagerSavePayload,
  connectSourceServices,
  connectedServiceIds,
  createEditorGroup,
  createEditorGroupWithId,
  createEditorSheet,
  curatedUnits,
  deleteEditorGroup,
  duplicateEditorSheet,
  patchEditorPriceOption,
  rateSheetOptions,
  rateSheetRowsInGroup,
  rateSheetRowsWithKeys,
  removeEditorPriceOption,
  removeEditorRow,
  rowKey,
  summariseRateSheet,
  toRateSheetEditorList,
} from '../resources/ts/package-station/surface/rateSheetTool/rateSheetToolModel';
import type {
  PackageManagerItem,
  PackageManagerReadModel,
} from '../resources/ts/package-station/types';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Rate Sheet tool contract: ${message}`);
}

function item(overrides: Partial<PackageManagerItem> & Pick<PackageManagerItem, 'item_id' | 'source_id'>): PackageManagerItem {
  return {
    source_type: 'inclusion',
    resolved: { label: `Label ${overrides.item_id}` },
    decorated_label: null,
    group_id: null,
    sort_order: 0,
    disabled: false,
    missing: false,
    module_transition: 'settled',
    ...overrides,
  };
}

const readModel: PackageManagerReadModel = {
  service_id: 7,
  platform_status: 'active',
  has_configuration: true,
  sources: [
    { relationship_id: 'source_service_7', provider_key: 'service', entity_type: 'service', entity_id: 7, sort_order: 0, category_group_id: null },
  ],
  groups: [{ group_id: 'grp_rel', label: 'Relationship group', sort_order: 0 }],
  category_groups: [],
  items: [
    item({ item_id: 'mgr_a', source_id: 'inc-a', module_transition: 'settled' }),
    item({ item_id: 'mgr_b', source_id: 'inc-b', module_transition: 'not-configured' }),
  ],
  rate_sheets: [{
    rate_sheet_id: 'rs_supply',
    title: 'Supply Sheet',
    status: 'active',
    groups: [
      { group_id: 'rate_group_1', label: 'Compute', sort_order: 1 },
      { group_id: 'rate_group_0', label: 'Storage', sort_order: 0 },
    ],
    items: [
      {
        item_id: 'rate_a', source_item_id: 'mgr_a', unit_price: 12, per: 'Per VM', quantity: 2, group_id: 'rate_group_1', sort_order: 0,
        price_options: [
          { option_id: 'opt_a1', platform_id: 'CZPRCIO2A7KZ', label: 'Annual', unit_price: 120 },
        ],
      },
      { item_id: 'rate_stale', source_item_id: 'mgr_missing', unit_price: 5, per: 'Per item', quantity: 1, group_id: null, sort_order: 1, price_options: [] },
    ],
  }],
  projections: { inclusions: [], faqs: [] },
};

// ── Read-model → editor collection ────────────────────────────────────────────
const list = toRateSheetEditorList(readModel);
check(list.length === 1, 'the collection carries one editor value per stored sheet');
const value = list[0];
check(value.id === 'rs_supply' && value.status === 'active', 'the editor value carries the stored sheet id and status');
check(value.title === 'Supply Sheet', 'the editor value carries the stored Rate Sheet title');
check(value.groups.map((group) => group.id).join(',') === 'rate_group_0,rate_group_1', 'groups are ordered by stored sort_order and keep their group_id');
check(value.items.length === 1, 'a row whose source no longer resolves is dropped from the grid');
check(value.items[0].id === 'rate_a' && value.items[0].optionId === 'mgr_a', 'a live row preserves its stored item_id and source_item_id');

// ── Price options: children of the row, never migrated from Default Price ─────
check(value.items[0].unitPrice === 12, "a row's Default Price is its own unit_price, untouched by price_options");
check(value.items[0].priceOptions.length === 1, 'the stored price option projects onto the row');
check(
  value.items[0].priceOptions[0].id === 'opt_a1' && value.items[0].priceOptions[0].platformId === 'CZPRCIO2A7KZ' && value.items[0].priceOptions[0].label === 'Annual',
  'a stored price option preserves its option_id, Platform ID, and label verbatim',
);

// ── Editor collection → save payload (upsert + explicit deletions) ─────────────
const payload = buildManagerSavePayload(readModel, list, [], readModel.sources);
check(payload.rate_sheets.length === 1, 'the save sends the upsert set');
check(payload.rate_sheets[0].rate_sheet_id === 'rs_supply', 'the upserted sheet preserves its stored id');
check(payload.rate_sheets[0].items.length === 1 && payload.rate_sheets[0].items[0].item_id === 'rate_a', 'the saved sheet preserves the surviving row id and drops the stale one');
check(payload.rate_sheets[0].items[0].sort_order === 0, 'saved rows are re-indexed by position');
check(
  payload.rate_sheets[0].items[0].price_options.length === 1
    && payload.rate_sheets[0].items[0].price_options[0].option_id === 'opt_a1'
    && payload.rate_sheets[0].items[0].price_options[0].unit_price === 120
    && !('platform_id' in payload.rate_sheets[0].items[0].price_options[0]),
  'a saved row carries its price options (option_id preserved, no platform_id sent — the backend owns that)',
);
check(payload.rate_sheet_deletions.length === 0, 'no deletions unless explicitly requested');
check(JSON.stringify(payload.groups) === JSON.stringify(readModel.groups), 'Manager relationship groups pass through unchanged');
const decisionIds = payload.item_decisions.map((decision) => decision.item_id).sort();
check(JSON.stringify(decisionIds) === JSON.stringify(['mgr_a']), 'only the referenced/settled relationship is re-sent as a decision');

// ── Explicit deletion is the only way a sheet leaves storage ───────────────────
const deletePayload = buildManagerSavePayload(readModel, [], ['rs_supply'], readModel.sources);
check(deletePayload.rate_sheets.length === 0 && deletePayload.rate_sheet_deletions[0] === 'rs_supply', 'a deleted sheet is named in rate_sheet_deletions, never dropped by omission');

// ── Create / duplicate mint no id (blank → backend mints) ─────────────────────
const created = createEditorSheet('Enterprise');
check(created.id === '' && created.title === 'Enterprise' && created.status === 'active', 'a new sheet has a blank id for the backend to mint');
const dup = duplicateEditorSheet(value);
check(dup.id === '' && dup.title === 'Copy of Supply Sheet', 'a duplicate has a blank id and a copy title');
check(dup.items.length === value.items.length, 'a duplicate copies the source rows');

// ── Add / remove a curated row (blank id; one per source) ─────────────────────
const options = rateSheetOptions(readModel);
check(options.some((option) => option.id === 'mgr_b'), 'the reconciled sources are the selectable row options');
const withRow = addEditorRow(value, options.find((option) => option.id === 'mgr_b')!);
check(withRow.items.length === 2, 'adding a source appends a curated row');
const addedRow = withRow.items[1];
check(addedRow.id === '' && addedRow.optionId === 'mgr_b', 'a curated row carries its source and a blank id (backend derives)');
check(addedRow.priceOptions.length === 0, 'a newly curated row starts with an empty price_options array, not undefined');
check(addEditorRow(withRow, options.find((option) => option.id === 'mgr_b')!).items.length === 2, 'a source already present is not added twice (one row per source per sheet)');
const removed = removeEditorRow(withRow, rowKey(addedRow));
check(removed.items.length === 1, 'removing a row drops it by its grid key');
// A curated row survives the save mapping with a blank id.
const withRowPayload = buildManagerSavePayload(readModel, [withRow], [], readModel.sources);
check(withRowPayload.rate_sheets[0].items.some((row) => row.source_item_id === 'mgr_b' && row.item_id === ''), 'a curated row is saved with a blank id for the backend to derive');

// ── Price option pure mutations: children of the row, never a second row ──────
const rowId = rowKey(value.items[0]);
const { value: withOption, key: newOptionKey } = addEditorPriceOption(value, rowId);
check(newOptionKey.startsWith('new:'), "a not-yet-saved price option's key is a local placeholder, never a guessed option_id");
check(
  withOption.items[0].priceOptions.length === 2 && withOption.items[0].priceOptions[1].id === '',
  'adding a price option appends a blank-id row-child, backend-minted on save — never derived from a label',
);
check(withOption.items[0].unitPrice === 12, "adding a price option never touches the row's own Default Price");
const labeled = patchEditorPriceOption(withOption, rowId, newOptionKey, { label: 'Monthly', unitPrice: 15 });
check(
  labeled.items[0].priceOptions[1].label === 'Monthly' && labeled.items[0].priceOptions[1].unitPrice === 15,
  'patching a price option only ever touches label/unitPrice, never option_id',
);
check(
  labeled.items[0].priceOptions[0].id === 'opt_a1' && labeled.items[0].priceOptions[0].label === 'Annual',
  "patching one price option never touches a sibling option or the row's stored one",
);
const withoutOption = removeEditorPriceOption(labeled, rowId, newOptionKey);
check(withoutOption.items[0].priceOptions.length === 1 && withoutOption.items[0].priceOptions[0].id === 'opt_a1', 'removing a price option by key leaves its siblings untouched');
check(removeEditorRow(withOption, rowId).items.length === 0, "removing the ROW itself removes its price options along with it — they are not a second row");

// ── Group deletion reassigns rows; creation keeps the id grammar ──────────────
const afterDelete = deleteEditorGroup(value, 'rate_group_1');
check(afterDelete.groups.every((group) => group.id !== 'rate_group_1'), 'a deleted group is removed');
check(afterDelete.items[0].groupId === null, 'a row in a deleted group falls back to ungrouped, never dropped');
const afterCreate = createEditorGroup(value, 'Networking');
check(/^rate_group_\d+_\d+$/.test(afterCreate.groups[afterCreate.groups.length - 1].id), 'a new group uses the stored rate_group_<ts>_<n> id grammar');

// ── Source-Service connection dedups ──────────────────────────────────────────
const connected = connectSourceServices(readModel.sources, [7, 9, 9]);
check(connected.length === 2, 'an already-connected Service is not duplicated and repeated ids collapse');
check(connected[1].relationship_id === 'source_service_9' && connected[1].entity_id === 9, 'a newly connected Service appends its relationship identity');
check(JSON.stringify(connectedServiceIds(connected).sort()) === JSON.stringify([7, 9]), 'connectedServiceIds reports the connected Service ids');

// ── Empty collection saves nothing ─────────────────────────────────────────────
const emptyModel: PackageManagerReadModel = { ...readModel, items: [], rate_sheets: [] };
const emptyPayload = buildManagerSavePayload(emptyModel, [createEditorSheet('')], [], emptyModel.sources);
check(emptyPayload.rate_sheets.length === 0, 'a wholly empty new sheet is not persisted');

// ── Read-mode summary ─────────────────────────────────────────────────────────
const summary = summariseRateSheet(value, connectedServiceIds(readModel.sources).length);
check(summary.rows === 1 && summary.groups === 2 && summary.sources === 1, 'the summary counts live rows, stored groups, and connected sources');
check(summary.priced === 1 && summary.grouped === 1 && summary.unavailable === 0, 'a priced, grouped, resolving row reports clean coverage');
check(rateSheetRowsInGroup(value, 'rate_group_1').length === 1, 'a group reads back exactly its assigned rows');

// ── Scoped row allow-list (the focused-Tier grid filter) ──────────────────────
const storedKey = rowKey(value.items[0]);
check(
  rateSheetRowsWithKeys(value, new Set([storedKey])).length === 1,
  'an allow-list of stored row keys reads back exactly those rows',
);
check(
  rateSheetRowsWithKeys(value, new Set<string>()).length === 0,
  'an empty allow-list scopes the grid to nothing rather than to everything',
);
check(
  rateSheetRowsWithKeys(value, new Set(['rate_not_in_this_sheet'])).length === 0,
  'an allow-list entry the sheet does not hold never widens the scope',
);
const withUnsaved = addEditorRow(value, { id: 'mgr_unsaved', label: 'Unsaved' });
check(
  rateSheetRowsWithKeys(withUnsaved, new Set(['mgr_unsaved'])).length === 0,
  'a not-yet-persisted row is never matched by a stored selection id',
);

// ── Curated unit vocabulary ───────────────────────────────────────────────────
// The unit list is data. Only the curated half is ever submitted: the built-in
// seven are constants in PackageManagerSchema, not records, so re-sending them
// would store duplicates of things that already exist.
check(
  JSON.stringify(curatedUnits(['Per VM', 'Per rack', 'Per item', 'Per node'])) === JSON.stringify(['Per rack', 'Per node']),
  'only curated units are submitted; the built-in seven are never re-sent',
);
check(
  JSON.stringify(curatedUnits(['Per VM', 'Per item'])) === JSON.stringify([]),
  'a vocabulary of built-ins alone submits nothing',
);
// Omitting the vocabulary is not the same as clearing it: a save that never
// authored a unit must leave the stored list alone.
const noUnitsPayload = buildManagerSavePayload(readModel, [value], [], readModel.sources);
check(
  !('rate_sheet_units' in noUnitsPayload),
  'a save that authored no unit omits the vocabulary rather than emptying it',
);
const unitsPayload = buildManagerSavePayload(readModel, [value], [], readModel.sources, ['Per VM', 'Per rack']);
check(
  JSON.stringify(unitsPayload.rate_sheet_units) === JSON.stringify(['Per rack']),
  'an authored vocabulary is submitted with the built-ins stripped',
);

// An inline "+ Add new" needs the id of what it just created, on the row that
// asked. Creating reports that id; naming an existing group selects it instead
// of minting a duplicate.
const inlineGroup = createEditorGroupWithId(value, 'Storage tiers');
check(
  inlineGroup.groupId !== null && inlineGroup.value.groups.some((group) => group.id === inlineGroup.groupId),
  'creating a group reports the stored id it minted',
);
check(
  createEditorGroupWithId(inlineGroup.value, '  storage TIERS ').groupId === inlineGroup.groupId,
  'naming an existing group selects it rather than minting a duplicate',
);
check(createEditorGroupWithId(value, '   ').groupId === null, 'a blank name mints no group');

// ── Inline create in the row dropdowns ────────────────────────────────────────
// Both row pickers can create the thing they pick. The behaviour is written ONCE
// — two dropdowns with the same semantics is the evidence for extraction, and a
// second inline copy is what that extraction exists to prevent.
const root = resolve(fileURLToPath(import.meta.url), '../..');
const partsSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/rate-sheet-tool/rateSheetParts.tsx',
), 'utf8');
check(
  (partsSource.match(/<InlineCreateSelect/g) ?? []).length === 2,
  'the Group and Per dropdowns both offer inline create, through one implementation',
);
check(
  (partsSource.match(/const ADD_SENTINEL/g) ?? []).length === 1
    && (partsSource.match(/function InlineCreateSelect/g) ?? []).length === 1,
  'inline create has one sentinel and one implementation, not a copy per dropdown',
);
check(
  partsSource.includes('onCreate={commands.createGroup}')
    && partsSource.includes('onCreate={commands.createUnit}'),
  'creation is delegated to the controller; presentation mints no group and no unit',
);
check(
  !/newRateGroupId|rate_group_|Date\.now\(/.test(partsSource),
  'presentation mints no id of its own',
);
check(
  partsSource.includes('if (settled !== null) onSelect(settled)'),
  'only the value the controller settled on is selected on the row that asked',
);

const drawerSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx',
), 'utf8');
const controllerSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/surface/rateSheetTool/useRateSheetTool.ts',
), 'utf8');
check(
  drawerSource.includes("recordId === 'new'")
    && drawerSource.includes('controller.createSheet()')
    && drawerSource.includes('openedAddress.current === recordId'),
  'the new drawer address creates one sheet through the existing controller with a rerender guard',
);
check(
  drawerSource.includes('controller.list.find((sheet) => sheet.id === recordId)')
    && drawerSource.includes('controller.openSheet(match.key)')
    && !drawerSource.includes('fetchRateSheetByPlatformId'),
  'a Settings row opens the already-loaded native sheet without a second request',
);
// A focused sheet is the two-group screen (Details / Options); the collection
// editor is reached only when no sheet is addressed, so focused View and Edit
// can never fall through to it.
check(
  drawerSource.includes('if (focused && controller.selected) {')
    && drawerSource.includes('<FocusedRateSheetGroups')
    && drawerSource.includes('<RateSheetCollectionEditor controller={controller} />')
    && drawerSource.indexOf('if (focused && controller.selected) {')
      < drawerSource.indexOf('<RateSheetCollectionEditor controller={controller} />'),
  'focused View and Edit use one-sheet presentations and never fall through to the collection editor',
);
check(
  drawerSource.includes('<FocusedRateSheetEditor controller={controller} value={value} />')
    && drawerSource.includes('<FocusedRateSheetRead value={value} onEdit={onEdit} />')
    && drawerSource.includes("id: 'details'")
    && drawerSource.includes("id: 'options'"),
  'the focused sheet composes Details and Options as drawer groups over the one-sheet read and edit presentations',
);
const focusedRead = drawerSource.slice(
  drawerSource.indexOf('function FocusedRateSheetRead'),
  drawerSource.indexOf('// ── SECTION: edit mode'),
);
check(
  !focusedRead.includes('RateSheetGridRead')
    && !focusedRead.includes('value.groups.map')
    && focusedRead.includes('Per values'),
  'the focused overview is summary-only, with no row table or child identity dump',
);
check(
  focusedRead.includes('title="Rate Sheet"')
    && focusedRead.includes('subtitle="Pricing configuration and inclusion summary for this Rate Sheet."')
    && focusedRead.includes('icon={MODULE_ICONS.overview}')
    && focusedRead.includes('iconVariant="drawerModule__icon--overview"')
    && focusedRead.includes('scopeClass="drawerOverview"')
    && focusedRead.includes("actions={[{ id: 'edit', label: 'Edit', onSelect: onEdit }]}")
    && focusedRead.includes('<p class="drawerModule__label">Name</p>')
    && focusedRead.includes('<p class="drawerModule__label">Platform ID</p>'),
  'the focused overview uses the Service Overview module-card header, field, status, and footer grammar',
);
check(
  drawerSource.includes("primary={focused ? undefined : { id: 'edit', label: 'Edit Rate Sheets', onSelect: requestEdit }}")
    && !drawerSource.includes("label: 'Edit Rate Sheet'"),
  'the focused drawer footer is Close-only because the module card owns its Edit action',
);
check(
  drawerSource.includes("if (typeof recordId === 'string' && recordId !== '') controller.openSheet(recordId);")
    && drawerSource.indexOf('controller.discard();') < drawerSource.indexOf("controller.openSheet(recordId);"),
  'focused Cancel restores the route selection after discard instead of looping on Preparing Rate Sheet',
);
check(
  !drawerSource.includes('>Create Group</button>')
    && partsSource.includes('const EDIT_SENTINEL')
    && partsSource.includes('editLabel="Edit Group values"')
    && partsSource.includes('editLabel="Edit Per values"'),
  'Group and Per create/edit actions live in their row dropdowns, not a separate Group panel',
);
check(
  controllerSource.includes('renameUnit: (unit, label) =>')
    && controllerSource.includes('items: sheet.items.map((row) => row.per === unit ? { ...row, per: next } : row)')
    && controllerSource.includes('BUILT_IN_RATE_SHEET_UNITS as readonly string[]).includes(unit)'),
  'curated Per rename updates the manager vocabulary and every referencing row while built-ins remain immutable',
);

// ── Save failure keeps the drawer in Edit; only a verified success exits ──────
// A failed save (response.success === false) must never advance the working
// collection or clear dirty — otherwise a transient identity-reconciliation
// failure on the backend would look like a clean save on the surface.
check(
  controllerSource.includes("if (!response.success) { setSaveError(response.message || 'Could not save the Rate Sheets.'); return false; }"),
  'a failed save sets saveError and returns without touching the working sheets, selection, or dirty flag',
);
check(
  controllerSource.indexOf('if (!response.success)') < controllerSource.indexOf('applyReadModel(response.manager)'),
  'applyReadModel (which clears dirty) only runs after the success check, never unconditionally after a save',
);
check(
  drawerSource.includes('if (!saveError) { savedRef.current(); if (wasExplicit) modeRef.current(\'view\'); }'),
  'the drawer exits Edit and notifies onSaved only when the just-finished save carried no saveError',
);
check(
  (drawerSource.match(/modeRef\.current\('view'\)/g) ?? []).length === 1,
  'exactly one call switches the drawer to View — the one already proven to sit behind the saveError guard',
);

// ── Row-lock editing is opt-in — the Tier-scoped consumer never wires it ──────
// `RateSheetGridEditor`'s `lockCommands` prop is additive: omitted, every row
// renders exactly as it always has. TierRateSheetDrawer.tsx scopes the SAME
// `RateSheetToolController` to one Tier's connection and must stay on that
// default — proven here by absence rather than by mounting the Tier drawer's
// full usePackageStation/instance-detail dependency chain, which the row-lock
// mounted regression (npm run regression:rate-sheet-row-lock) does not need.
const tierDrawerSource = readFileSync(resolve(
  root,
  'resources/ts/package-station/presentation/rate-sheet-tool/TierRateSheetDrawer.tsx',
), 'utf8');
check(
  !tierDrawerSource.includes('lockCommands'),
  'the focused-Tier connection drawer never passes lockCommands — its grid stays live-editable, unchanged by the Rate Sheet row lock',
);
check(
  partsSource.includes('function RateSheetEditRow({') && partsSource.includes('if (lockCommands) {'),
  'the locked/editing row UI is gated behind an explicit lockCommands branch, not the default render path',
);

// ── The shared InlineEditorShell stays entity-agnostic ────────────────────────
// Row Save persists immediately, so the Rate Sheet drawer disables its OWN
// footer Save via the `saveDisabled` prop it already controlled — the shared
// shell component itself must carry no row-lock awareness, or every other
// consumer (Tier, Package Family, Tier System, …) would inherit it too.
const inlineEditorShellSource = readFileSync(resolve(
  root,
  'resources/ts/drawer-kit/InlineEditorShell.tsx',
), 'utf8');
check(
  !inlineEditorShellSource.includes('editingRowId') && !inlineEditorShellSource.includes('lockCommands'),
  'InlineEditorShell has no row-lock awareness — every other editor keeps its existing Save-to-View behaviour untouched',
);
check(
  drawerSource.includes('controller.editingRowId !== null'),
  'the Rate Sheet drawer disables its own footer Save while a row is active, through its own saveDisabled prop — not a shared-shell change',
);

console.log('Rate Sheet tool contract checks passed.');
