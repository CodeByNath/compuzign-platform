// Rate Sheet tool — the pure read-model ⇄ editor-value ⇄ save-payload mapping.
//
// This module holds NO state and performs NO I/O. It is the faithful port of
// the mapping the retired Command Centre carried in `providers/package.ts`
// (removed in 34c8175): how a `PackageManagerReadModel` projects into the
// editor's flat value, how that value rebuilds a `PackageManagerSavePayload`,
// and how a source-Service connection appends a `PackageSourceRelationship`.
//
// IT INVENTS NO IDS AND NO STORAGE. Every existing Rate Sheet row keeps its
// stored `item_id` (`rate_…`) and `source_item_id` (`mgr_…`); groups keep their
// stored `group_id` (`rate_group_…`). New source rows are onboarded by the
// authoritative backend (`PackageManagerSchema::commitConfiguration`) on save,
// so no canonical hashing is duplicated here. The save reuses the surviving
// Package Manager contract verbatim; Tier remains responsible only for choosing
// a Rate Sheet `item_id` and declaring its own quantity.

import type {
  PackageManagerGroup,
  PackageManagerItem,
  PackageManagerItemDecision,
  PackageManagerReadModel,
  PackageManagerSavePayload,
  PackageRateSheetUnit,
  PackageSourceRelationship,
} from '../../types';

// ── Editor value ────────────────────────────────────────────────────────────
// The flat shape the grid edits, kept deliberately close to the retired
// editor's `RateSheetEditorValue` so the presentation reads the same way. It is
// a projection of the stored `rate_sheet`, never a second authority.

export interface RateSheetEditorGroup {
  id:    string;   // stored PackageManagerGroup.group_id
  label: string;
}

export interface RateSheetEditorRow {
  id:             string;                // stored PackageRateSheetItem.item_id  (preserved)
  optionId:       string;                // stored PackageRateSheetItem.source_item_id → manager item_id (preserved)
  optionLabel:    string;                // Service-resolved supplied-content label (display only)
  unitPrice:      number;
  per:            PackageRateSheetUnit;
  quantity:       number;
  groupId:        string | null;
  sourceAvailable: boolean;              // supplying source resolves and is not missing/disabled
}

export interface RateSheetEditorValue {
  title:  string;
  groups: RateSheetEditorGroup[];
  items:  RateSheetEditorRow[];
}

/** One selectable supplied-content source for a row (the manager relationships). */
export interface RateSheetOption {
  id:    string;   // manager item_id (the row's source_item_id)
  label: string;
}

export const EMPTY_RATE_SHEET_VALUE: RateSheetEditorValue = { title: '', groups: [], items: [] };

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

/** Project the stored Rate Sheet into the flat editor value. Stale rows whose
 *  source no longer resolves are dropped from the grid, matching the provider's
 *  cleaning rule and the backend's write-boundary filter. */
export function toRateSheetEditorValue(readModel: PackageManagerReadModel): RateSheetEditorValue {
  const rateSheet = readModel.rate_sheet;
  if (!rateSheet) return { ...EMPTY_RATE_SHEET_VALUE };

  const itemById = new Map(readModel.items.map((item) => [item.item_id, item]));
  const labelById = new Map(readModel.items.map((item) => [item.item_id, packageItemLabel(item)]));

  const groups = [...rateSheet.groups]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((group) => ({ id: group.group_id, label: group.label }));
  const groupIds = new Set(groups.map((group) => group.id));

  const items = [...rateSheet.items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((item) => itemById.has(item.source_item_id))
    .map((item) => ({
      id:              item.item_id,
      optionId:        item.source_item_id,
      optionLabel:     labelById.get(item.source_item_id) ?? '(missing source)',
      unitPrice:       item.unit_price,
      per:             item.per,
      quantity:        item.quantity,
      groupId:         item.group_id !== null && groupIds.has(item.group_id) ? item.group_id : null,
      sourceAvailable: sourceAvailable(itemById.get(item.source_item_id)),
    }));

  return { title: rateSheet.title, groups, items };
}

/** The manager relationships selectable as row sources (all connected items). */
export function rateSheetOptions(readModel: PackageManagerReadModel): RateSheetOption[] {
  return readModel.items.map((item) => ({ id: item.item_id, label: packageItemLabel(item) }));
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
  return { ...value, items: value.items.map((row) => (row.id === rowId ? { ...row, ...patch } : row)) };
}

// ── Source-Service connection (pure) ──────────────────────────────────────────

/** Append connected source Services to the relationship list, deduplicated on
 *  the same identity key the retired provider used. New inclusions become live
 *  pool sources on the next save, where the backend onboards their priced rows. */
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

/**
 * Rebuild the surviving `PackageManagerSavePayload` from the edited value.
 *
 *  - `sources`        pass through untouched (plus any just-connected Service).
 *  - `groups`         the Manager relationship groups, passed through unchanged —
 *                     the Rate Sheet tool never edits those (they have their own
 *                     station lifecycle; `commitConfiguration` re-asserts this).
 *  - `item_decisions` the referenced-and-already-configured relationships, so the
 *                     backend keeps them settled and consumable by Tiers. Only
 *                     rows referenced by the Rate Sheet, or already non-provisional,
 *                     are settled — provisional siblings stay provisional.
 *  - `rate_sheet`     the edited sheet, `sort_order` re-indexed by position; ids
 *                     preserved verbatim.
 */
export function buildManagerSavePayload(
  readModel: PackageManagerReadModel,
  value: RateSheetEditorValue,
  sources: readonly PackageSourceRelationship[],
): PackageManagerSavePayload {
  const referenced = new Set(value.items.map((row) => row.optionId));

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

  const rateSheet = {
    title:  value.title.trim(),
    groups: value.groups.map((group, index) => ({ group_id: group.id, label: group.label.trim(), sort_order: index })),
    items:  value.items.map((row, index) => ({
      item_id:        row.id,
      source_item_id: row.optionId,
      unit_price:     row.unitPrice,
      per:            row.per,
      quantity:       row.quantity,
      group_id:       row.groupId,
      sort_order:     index,
    })),
  };

  return {
    sources: sources.map((source) => ({ ...source })),
    groups,
    item_decisions: itemDecisions,
    // A wholly empty sheet is sent as null so the backend's own "null when
    // empty" representation stays the single canonical no-configuration state.
    rate_sheet: rateSheet.title === '' && rateSheet.groups.length === 0 && rateSheet.items.length === 0
      ? null
      : rateSheet,
  };
}
