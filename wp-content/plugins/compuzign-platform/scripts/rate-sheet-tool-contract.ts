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

import {
  addEditorRow,
  buildManagerSavePayload,
  connectSourceServices,
  connectedServiceIds,
  createEditorGroup,
  createEditorSheet,
  deleteEditorGroup,
  duplicateEditorSheet,
  rateSheetOptions,
  rateSheetRowsInGroup,
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
      { item_id: 'rate_a', source_item_id: 'mgr_a', unit_price: 12, per: 'Per VM', quantity: 2, group_id: 'rate_group_1', sort_order: 0 },
      { item_id: 'rate_stale', source_item_id: 'mgr_missing', unit_price: 5, per: 'Per item', quantity: 1, group_id: null, sort_order: 1 },
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

// ── Editor collection → save payload (upsert + explicit deletions) ─────────────
const payload = buildManagerSavePayload(readModel, list, [], readModel.sources);
check(payload.rate_sheets.length === 1, 'the save sends the upsert set');
check(payload.rate_sheets[0].rate_sheet_id === 'rs_supply', 'the upserted sheet preserves its stored id');
check(payload.rate_sheets[0].items.length === 1 && payload.rate_sheets[0].items[0].item_id === 'rate_a', 'the saved sheet preserves the surviving row id and drops the stale one');
check(payload.rate_sheets[0].items[0].sort_order === 0, 'saved rows are re-indexed by position');
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
check(addEditorRow(withRow, options.find((option) => option.id === 'mgr_b')!).items.length === 2, 'a source already present is not added twice (one row per source per sheet)');
const removed = removeEditorRow(withRow, rowKey(addedRow));
check(removed.items.length === 1, 'removing a row drops it by its grid key');
// A curated row survives the save mapping with a blank id.
const withRowPayload = buildManagerSavePayload(readModel, [withRow], [], readModel.sources);
check(withRowPayload.rate_sheets[0].items.some((row) => row.source_item_id === 'mgr_b' && row.item_id === ''), 'a curated row is saved with a blank id for the backend to derive');

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

console.log('Rate Sheet tool contract checks passed.');
