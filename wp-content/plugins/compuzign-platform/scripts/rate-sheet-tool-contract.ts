// Contract: the Rate Sheet tool's pure read-model ⇄ editor ⇄ save mapping.
//
// Guards the rules that must never drift: existing Rate Sheet `item_id` and
// `source_item_id` and group `group_id` are preserved verbatim; a save reuses
// the surviving Package Manager payload shape; referenced (and already-settled)
// relationships are re-sent as item decisions so they stay Tier-consumable;
// deleting a group reassigns its rows rather than dropping them; connecting a
// source Service appends a deduplicated relationship. The tool mints no IDs and
// invents no storage.

import {
  buildManagerSavePayload,
  connectSourceServices,
  connectedServiceIds,
  createEditorGroup,
  deleteEditorGroup,
  rateSheetRowsInGroup,
  summariseRateSheet,
  toRateSheetEditorValue,
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

// Two connected relationships (mgr_a settled, mgr_b provisional) and one stale
// Rate Sheet row whose source no longer resolves.
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
  rate_sheet: {
    title: 'Supply Sheet',
    groups: [
      { group_id: 'rate_group_1', label: 'Compute', sort_order: 1 },
      { group_id: 'rate_group_0', label: 'Storage', sort_order: 0 },
    ],
    items: [
      { item_id: 'rate_a', source_item_id: 'mgr_a', unit_price: 12, per: 'Per VM', quantity: 2, group_id: 'rate_group_1', sort_order: 0 },
      { item_id: 'rate_stale', source_item_id: 'mgr_missing', unit_price: 5, per: 'Per item', quantity: 1, group_id: null, sort_order: 1 },
    ],
  },
  projections: { inclusions: [], faqs: [] },
};

// ── Read-model → editor value ─────────────────────────────────────────────────
const value = toRateSheetEditorValue(readModel);

check(value.title === 'Supply Sheet', 'the editor value carries the stored Rate Sheet title');
check(value.groups.map((group) => group.id).join(',') === 'rate_group_0,rate_group_1', 'groups are ordered by stored sort_order and keep their group_id');
check(value.items.length === 1, 'a Rate Sheet row whose source no longer resolves is dropped from the grid');
check(value.items[0].id === 'rate_a' && value.items[0].optionId === 'mgr_a', 'a live row preserves its stored item_id and source_item_id');
check(value.items[0].unitPrice === 12 && value.items[0].quantity === 2 && value.items[0].groupId === 'rate_group_1', 'a live row carries its stored price, quantity, and group');

// ── Editor value → save payload ───────────────────────────────────────────────
const payload = buildManagerSavePayload(readModel, value, readModel.sources);

check(payload.rate_sheet !== null, 'a configured sheet saves a non-null rate_sheet');
check(payload.rate_sheet!.items.length === 1 && payload.rate_sheet!.items[0].item_id === 'rate_a', 'the saved sheet preserves the surviving row id and drops the stale one');
check(payload.rate_sheet!.items[0].sort_order === 0, 'saved rows are re-indexed by position');
check(JSON.stringify(payload.groups) === JSON.stringify(readModel.groups), 'Manager relationship groups pass through the Rate Sheet save unchanged');

const decisionIds = payload.item_decisions.map((decision) => decision.item_id).sort();
check(JSON.stringify(decisionIds) === JSON.stringify(['mgr_a']), 'only the referenced/settled relationship is re-sent as a decision; a provisional, unreferenced sibling is not settled');

// ── Group deletion reassigns rows ─────────────────────────────────────────────
const afterDelete = deleteEditorGroup(value, 'rate_group_1');
check(afterDelete.groups.every((group) => group.id !== 'rate_group_1'), 'a deleted group is removed');
check(afterDelete.items[0].groupId === null, 'a row in a deleted group falls back to ungrouped, never dropped');

// ── Group creation keeps the stored id grammar ────────────────────────────────
const afterCreate = createEditorGroup(value, 'Networking');
const created = afterCreate.groups[afterCreate.groups.length - 1];
check(/^rate_group_\d+_\d+$/.test(created.id), 'a new group uses the stored rate_group_<ts>_<n> id grammar');

// ── Source-Service connection dedups ──────────────────────────────────────────
const connected = connectSourceServices(readModel.sources, [7, 9, 9]);
check(connected.length === 2, 'an already-connected Service is not duplicated and repeated ids collapse');
check(connected[1].relationship_id === 'source_service_9' && connected[1].entity_id === 9, 'a newly connected Service appends its relationship identity');
check(JSON.stringify(connectedServiceIds(connected).sort()) === JSON.stringify([7, 9]), 'connectedServiceIds reports the connected Service ids');

// ── Empty sheet saves null ────────────────────────────────────────────────────
const emptyModel: PackageManagerReadModel = { ...readModel, items: [], rate_sheet: null };
const emptyPayload = buildManagerSavePayload(emptyModel, { title: '', groups: [], items: [] }, emptyModel.sources);
check(emptyPayload.rate_sheet === null, 'a wholly empty sheet saves rate_sheet as null');

// ── Read-mode summary (drives the drawer's View mode) ─────────────────────────
// The View mode's counts and coverage are a pure projection of the SAME editor
// value the grid edits — never a second price or store. With one live row
// (priced, grouped, available) surviving the read-model projection:
const summary = summariseRateSheet(value, connectedServiceIds(readModel.sources).length);
check(summary.rows === 1, 'the summary counts the live priced rows');
check(summary.groups === 2, 'the summary counts the stored groups');
check(summary.sources === 1, 'the summary counts the connected source Services');
check(summary.priced === 1 && summary.unpriced === 0, 'a row with a non-zero unit price counts as priced');
check(summary.grouped === 1 && summary.ungrouped === 0, 'a row assigned to a group counts as grouped');
check(summary.unavailable === 0, 'a live row whose source resolves is not counted unavailable');

// A row left at zero price and ungrouped moves the coverage counters, never the
// row total — the View mode reports the gap without dropping the row.
const gapValue = { ...value, items: [{ ...value.items[0], unitPrice: 0, groupId: null }] };
const gapSummary = summariseRateSheet(gapValue, 0);
check(gapSummary.priced === 0 && gapSummary.unpriced === 1, 'a zero-price row counts as unpriced coverage gap');
check(gapSummary.grouped === 0 && gapSummary.ungrouped === 1, 'an ungrouped row counts toward the ungrouped total');
check(gapSummary.sources === 0, 'the summary reports zero sources when none are connected');

// Grouping read-back: a group lists exactly its assigned rows; `null` selects
// the ungrouped rows. The same order the grid shows.
check(rateSheetRowsInGroup(value, 'rate_group_1').length === 1, 'a group reads back exactly its assigned rows');
check(rateSheetRowsInGroup(value, 'rate_group_0').length === 0, 'a group with no rows reads back empty');
check(rateSheetRowsInGroup(gapValue, null).length === 1, 'passing null reads back the ungrouped rows');

console.log('Rate Sheet tool contract checks passed.');
