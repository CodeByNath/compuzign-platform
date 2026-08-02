// Rate Sheet tool — the pure read-model ⇄ editor-value ⇄ save-payload mapping.
//
// This module holds NO state and performs NO I/O. It maps a
// `PackageManagerReadModel` into a list of per-sheet editor values, rebuilds a
// `PackageManagerSavePayload` (a partial upsert set + an explicit deletion list),
// and appends a connected source-Service relationship.
//
// IT INVENTS NO IDS. Existing rows keep their stored `item_id` (`rate_…`) and
// `source_item_id` (`mgr_…`); groups keep their `group_id` (`rate_group_…`);
// sheets keep their `rate_sheet_id` (`rs_…`). A new sheet or a curated row is
// sent with a BLANK id — the backend (`PackageManagerSchema::commitConfiguration`)
// mints/derives it on save. Independent curation: a row exists in a sheet only
// because the admin added it here; there is no blanket auto-onboard.

import type {
  PackageManagerGroup,
  PackageManagerItem,
  PackageManagerItemDecision,
  PackageManagerReadModel,
  PackageManagerSavePayload,
  PackageRateSheet,
  PackageRateSheetStatus,
  PackageRateSheetUnit,
  PackageSourceRelationship,
} from '../../types';
import { BUILT_IN_RATE_SHEET_UNITS } from '../../types';

// ── Editor value ────────────────────────────────────────────────────────────
// The flat shape the grid edits — a projection of one stored sheet, never a
// second authority. A blank `id` marks a not-yet-persisted sheet.

export interface RateSheetEditorGroup {
  id:    string;   // stored PackageManagerGroup.group_id
  label: string;
  platformId?: string;
}

export interface RateSheetEditorRow {
  id:              string;               // stored PackageRateSheetItem.item_id (blank until saved)
  optionId:        string;               // stored source_item_id → manager item_id (preserved)
  optionLabel:     string;               // Service-resolved supplied-content label (display only)
  unitPrice:       number;
  per:             PackageRateSheetUnit;
  quantity:        number;
  groupId:         string | null;
  sourceAvailable: boolean;              // supplying source resolves and is not missing/disabled
  // Supplying-Service provenance, carried straight from the manager relationship
  // (PackageManagerItem.source_service_id/_title — display only, resolved by the
  // backend, never derived here). Null when the relationship carries none.
  sourceServiceId:    number | null;
  sourceServiceTitle: string | null;
}

export interface RateSheetEditorValue {
  id:     string;                        // stored rate_sheet_id, blank until minted on save
  platformId?: string;
  title:  string;
  status: PackageRateSheetStatus;
  groups: RateSheetEditorGroup[];
  items:  RateSheetEditorRow[];
}

/** One selectable supplied-content source for a row (the manager relationships). */
export interface RateSheetOption {
  id:    string;   // manager item_id (the row's source_item_id)
  label: string;
  sourceServiceId:    number | null;
  sourceServiceTitle: string | null;
}

export const EMPTY_RATE_SHEET_VALUE: RateSheetEditorValue = { id: '', title: '', status: 'active', groups: [], items: [] };

const DEFAULT_UNIT: PackageRateSheetUnit = 'Per item';

// ── Read-model projection ─────────────────────────────────────────────────────

/** The supplied-content label, resolved exactly as the retired provider did. */
export function packageItemLabel(item: PackageManagerItem): string {
  if (item.source_type === 'faq') {
    return item.resolved && 'question' in item.resolved ? item.resolved.question : '(missing source)';
  }
  if (item.decorated_label) return item.decorated_label;
  return item.resolved && 'label' in item.resolved ? item.resolved.label : '(missing source)';
}

function sourceAvailable(item: PackageManagerItem | undefined): boolean {
  return item !== undefined && item.available !== false && !item.missing;
}

/** Project one stored sheet into the flat editor value. Stale rows whose source
 *  no longer resolves are dropped from the grid, matching the backend's
 *  write-boundary filter. */
function toEditorValue(
  sheet: PackageRateSheet,
  itemById: Map<string, PackageManagerItem>,
  labelById: Map<string, string>,
): RateSheetEditorValue {
  const groups = [...sheet.groups]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((group) => ({ id: group.group_id, label: group.label, platformId: group.platform_id }));
  const groupIds = new Set(groups.map((group) => group.id));

  const items = [...sheet.items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((item) => itemById.has(item.source_item_id))
    .map((item) => {
      const relationship = itemById.get(item.source_item_id);
      return {
        id:              item.item_id,
        optionId:        item.source_item_id,
        optionLabel:     labelById.get(item.source_item_id) ?? '(missing source)',
        unitPrice:       item.unit_price,
        per:             item.per,
        quantity:        item.quantity,
        groupId:         item.group_id !== null && groupIds.has(item.group_id) ? item.group_id : null,
        sourceAvailable: sourceAvailable(relationship),
        sourceServiceId:    relationship?.source_service_id ?? null,
        sourceServiceTitle: relationship?.source_service_title ?? null,
      };
    });

  return { id: sheet.rate_sheet_id, platformId: sheet.platform_id, title: sheet.title, status: sheet.status, groups, items };
}

/** Every stored sheet as an editor value, in stored order. */
export function toRateSheetEditorList(readModel: PackageManagerReadModel): RateSheetEditorValue[] {
  const itemById = new Map(readModel.items.map((item) => [item.item_id, item]));
  const labelById = new Map(readModel.items.map((item) => [item.item_id, packageItemLabel(item)]));
  return readModel.rate_sheets.map((sheet) => toEditorValue(sheet, itemById, labelById));
}

/** The manager relationships selectable as row sources (all connected items). */
export function rateSheetOptions(readModel: PackageManagerReadModel): RateSheetOption[] {
  return readModel.items.map((item) => ({
    id:    item.item_id,
    label: packageItemLabel(item),
    sourceServiceId:    item.source_service_id ?? null,
    sourceServiceTitle: item.source_service_title ?? null,
  }));
}

// ── Read-mode summary (pure) ──────────────────────────────────────────────────

export interface RateSheetSummary {
  sources:     number;   // connected source Services
  groups:      number;
  rows:        number;
  grouped:     number;   // rows assigned to a group
  ungrouped:   number;
  priced:      number;   // rows carrying a unit price above zero
  unpriced:    number;   // rows still at zero — the coverage gap
  unavailable: number;   // rows whose supplying source no longer resolves
}

/** Row counts and pricing coverage for one sheet's read view. */
export function summariseRateSheet(
  value: RateSheetEditorValue,
  sourceServiceCount: number,
): RateSheetSummary {
  let grouped = 0;
  let priced = 0;
  let unavailable = 0;

  for (const row of value.items) {
    if (row.groupId !== null) grouped += 1;
    if (row.unitPrice > 0) priced += 1;
    if (!row.sourceAvailable) unavailable += 1;
  }

  return {
    sources:     sourceServiceCount,
    groups:      value.groups.length,
    rows:        value.items.length,
    grouped,
    ungrouped:   value.items.length - grouped,
    priced,
    unpriced:    value.items.length - priced,
    unavailable,
  };
}

/** One supplying Service behind a set of rows, and how many of them it sources. */
export interface RateSheetConnectedService {
  id:    number;
  title: string;
  rows:  number;
}

/**
 * The distinct supplying Services behind a set of rows, in first-seen order.
 * A row whose relationship carries no Service provenance (missing/non-Service
 * source) contributes to no entry — nothing is invented for it.
 */
export function connectedServicesForRows(
  rows: readonly RateSheetEditorRow[],
): RateSheetConnectedService[] {
  const byId = new Map<number, RateSheetConnectedService>();
  for (const row of rows) {
    if (row.sourceServiceId === null || row.sourceServiceTitle === null) continue;
    const existing = byId.get(row.sourceServiceId);
    if (existing) existing.rows += 1;
    else byId.set(row.sourceServiceId, { id: row.sourceServiceId, title: row.sourceServiceTitle, rows: 1 });
  }
  return [...byId.values()];
}

/** Rows belonging to a group, in grid order. `null` selects the ungrouped rows. */
export function rateSheetRowsInGroup(
  value: RateSheetEditorValue,
  groupId: string | null,
): RateSheetEditorRow[] {
  return value.items.filter((row) => row.groupId === groupId);
}

/**
 * The sheet's rows restricted to an allow-list of row keys, in grid order.
 *
 * The allow-list is matched against `rowKey` — the same address every editor
 * mutation uses — so a scoped view and the edits made inside it agree on row
 * identity. A Tier's selections carry stored `item_id`s, which equal `rowKey`
 * for stored rows; an unsaved row keys as `new:…` and correctly never matches,
 * because a Tier cannot have selected a row that was never persisted.
 */
export function rateSheetRowsWithKeys(
  value: RateSheetEditorValue,
  allowed: ReadonlySet<string>,
): RateSheetEditorRow[] {
  return value.items.filter((row) => allowed.has(rowKey(row)));
}

// ── Editor-value mutations (pure) ─────────────────────────────────────────────

/** Stored group-id grammar, identical to the retired editor's `rate_group_…`. */
export function newRateGroupId(existingCount: number): string {
  return `rate_group_${Date.now()}_${existingCount}`;
}

export function createEditorGroup(value: RateSheetEditorValue, label: string): RateSheetEditorValue {
  const trimmed = label.trim();
  if (!trimmed) return value;
  return { ...value, groups: [...value.groups, { id: newRateGroupId(value.groups.length), label: trimmed }] };
}

/**
 * The same creation, reporting the id it minted so the row that asked can select
 * it. Two callers need different halves of one operation — the toolbar wants the
 * new value, an inline "+ Add new" wants its id — so the id is derived once here
 * rather than guessed from the collection afterwards.
 */
export function createEditorGroupWithId(
  value: RateSheetEditorValue,
  label: string,
): { value: RateSheetEditorValue; groupId: string | null } {
  const trimmed = label.trim();
  if (!trimmed) return { value, groupId: null };
  const existing = value.groups.find((group) => group.label.toLowerCase() === trimmed.toLowerCase());
  if (existing) return { value, groupId: existing.id };
  const groupId = newRateGroupId(value.groups.length);
  return { value: { ...value, groups: [...value.groups, { id: groupId, label: trimmed }] }, groupId };
}

export function renameEditorGroup(value: RateSheetEditorValue, groupId: string, label: string): RateSheetEditorValue {
  return {
    ...value,
    groups: value.groups.map((group) => (group.id === groupId ? { ...group, label: label.trim() } : group)),
  };
}

/** Delete a group; rows that referenced it fall back to ungrouped (reassign,
 *  never drop — the same rule the schema keeps). */
export function deleteEditorGroup(value: RateSheetEditorValue, groupId: string): RateSheetEditorValue {
  return {
    ...value,
    groups: value.groups.filter((group) => group.id !== groupId),
    items:  value.items.map((row) => (row.groupId === groupId ? { ...row, groupId: null } : row)),
  };
}

export function patchEditorRow(
  value: RateSheetEditorValue,
  rowId: string,
  patch: Partial<Pick<RateSheetEditorRow, 'unitPrice' | 'per' | 'quantity' | 'groupId'>>,
): RateSheetEditorValue {
  return { ...value, items: value.items.map((row) => (rowKey(row) === rowId ? { ...row, ...patch } : row)) };
}

/** A grid-stable key for a row: its stored item_id, or its source id for a
 *  not-yet-saved row (which has a blank item_id). */
export function rowKey(row: RateSheetEditorRow): string {
  return row.id !== '' ? row.id : `new:${row.optionId}`;
}

/** Add a curated row for a source option. One row per source per sheet: a source
 *  already present is ignored. The id is blank — the backend derives it on save. */
export function addEditorRow(
  value: RateSheetEditorValue,
  option: RateSheetOption,
): RateSheetEditorValue {
  if (value.items.some((row) => row.optionId === option.id)) return value;
  const row: RateSheetEditorRow = {
    id: '', optionId: option.id, optionLabel: option.label,
    unitPrice: 0, per: DEFAULT_UNIT, quantity: 1, groupId: null, sourceAvailable: true,
    sourceServiceId: option.sourceServiceId, sourceServiceTitle: option.sourceServiceTitle,
  };
  return { ...value, items: [...value.items, row] };
}

export function removeEditorRow(value: RateSheetEditorValue, rowId: string): RateSheetEditorValue {
  return { ...value, items: value.items.filter((row) => rowKey(row) !== rowId) };
}

// ── Collection mutations (pure) ────────────────────────────────────────────────

/** A fresh, unsaved sheet. Blank id → the backend mints on save. */
export function createEditorSheet(title = ''): RateSheetEditorValue {
  return { id: '', title, status: 'active', groups: [], items: [] };
}

/** A copy of an existing sheet: same groups, rows, prices — a new (blank) id and
 *  title. Rows keep their derived item ids (harmless: resolution is sheet-scoped
 *  by the Tier's rate_sheet_id), so a duplicate prices the same supply anew. */
export function duplicateEditorSheet(source: RateSheetEditorValue): RateSheetEditorValue {
  return {
    id:     '',
    title:  source.title.trim() ? `Copy of ${source.title.trim()}` : 'Copy',
    status: 'active',
    groups: source.groups.map((group) => ({ ...group, platformId: undefined })),
    platformId: undefined,
    items:  source.items.map((row) => ({ ...row })),
  };
}

// ── Source-Service connection (pure) ──────────────────────────────────────────

/** Append connected source Services to the relationship list, deduplicated. New
 *  inclusions become selectable row sources on the next reload; the admin then
 *  curates which of them a sheet prices. */
export function connectSourceServices(
  sources: readonly PackageSourceRelationship[],
  serviceIds: readonly number[],
): PackageSourceRelationship[] {
  const identity = (source: Pick<PackageSourceRelationship, 'provider_key' | 'entity_type' | 'entity_id'>) =>
    `${source.provider_key}:${source.entity_type}:${source.entity_id}`;
  const existing = new Set(sources.map(identity));
  const next = sources.map((source) => ({ ...source }));
  for (const serviceId of serviceIds) {
    const key = `service:service:${serviceId}`;
    if (!Number.isInteger(serviceId) || serviceId < 1 || existing.has(key)) continue;
    existing.add(key);
    next.push({
      relationship_id:   `source_service_${serviceId}`,
      provider_key:      'service',
      entity_type:       'service',
      entity_id:         serviceId,
      sort_order:        next.length,
      category_group_id: null,
    });
  }
  return next;
}

/** Numeric ids of the Services already connected as relationship sources. */
export function connectedServiceIds(sources: readonly PackageSourceRelationship[]): number[] {
  return sources
    .filter((source) => source.provider_key === 'service' && source.entity_type === 'service')
    .map((source) => Number(source.entity_id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

// ── Save payload ──────────────────────────────────────────────────────────────

/** Map one editor value back to the stored sheet shape (ids preserved; blank
 *  ids left for the backend to mint/derive). */
function toStoredSheet(value: RateSheetEditorValue): PackageRateSheet {
  return {
    rate_sheet_id: value.id,
    title:         value.title.trim(),
    status:        value.status,
    groups:        value.groups.map((group, index) => ({ group_id: group.id, label: group.label.trim(), sort_order: index })),
    items:         value.items.map((row, index) => ({
      item_id:        row.id,
      source_item_id: row.optionId,
      unit_price:     row.unitPrice,
      per:            row.per,
      quantity:       row.quantity,
      group_id:       row.groupId,
      sort_order:     index,
    })),
  };
}

/**
 * Rebuild the `PackageManagerSavePayload` from the edited collection.
 *
 *  - `sources`        pass through (plus any just-connected Service).
 *  - `groups`         the Manager relationship groups, unchanged — the Rate Sheet
 *                     tool never edits those.
 *  - `item_decisions` the referenced-and-already-configured relationships, so the
 *                     backend keeps them settled and consumable by Tiers.
 *  - `rate_sheets`    the upsert set (every non-deleted edited sheet). A wholly
 *                     empty new sheet is dropped so it is not persisted.
 *  - `rate_sheet_deletions` the ids explicitly removed (guarded server-side).
 */
/**
 * The curated half of the vocabulary — what the backend actually stores. The
 * built-in seven are dropped because they are constants there, not records, and
 * re-submitting them would store duplicates of things that already exist.
 */
export function curatedUnits(
  units: readonly PackageRateSheetUnit[],
): PackageRateSheetUnit[] {
  const builtIn = new Set<string>(BUILT_IN_RATE_SHEET_UNITS);
  return units.filter((unit) => !builtIn.has(unit));
}

export function buildManagerSavePayload(
  readModel: PackageManagerReadModel,
  sheets: readonly RateSheetEditorValue[],
  deletions: readonly string[],
  sources: readonly PackageSourceRelationship[],
  units?: readonly PackageRateSheetUnit[],
): PackageManagerSavePayload {
  const referenced = new Set(sheets.flatMap((sheet) => sheet.items.map((row) => row.optionId)));

  const itemDecisions: PackageManagerItemDecision[] = readModel.items
    .filter((item) => item.module_transition !== 'not-configured' || referenced.has(item.item_id))
    .map((item) => ({
      item_id:         item.item_id,
      source_type:     item.source_type,
      source_id:       item.source_id,
      group_id:        item.group_id,
      sort_order:      item.sort_order,
      disabled:        item.disabled,
      decorated_label: item.decorated_label,
    }));

  const groups: PackageManagerGroup[] = readModel.groups.map((group) => ({ ...group }));

  const rateSheets = sheets
    .map(toStoredSheet)
    .filter((sheet) => !(sheet.rate_sheet_id === '' && sheet.title === '' && sheet.groups.length === 0 && sheet.items.length === 0));

  return {
    sources: sources.map((source) => ({ ...source })),
    groups,
    item_decisions: itemDecisions,
    rate_sheets: rateSheets,
    rate_sheet_deletions: [...deletions],
    // Absent rather than empty when the caller authored no units, so a save that
    // never touched the vocabulary cannot erase it.
    ...(units === undefined ? {} : { rate_sheet_units: curatedUnits(units) }),
  };
}
