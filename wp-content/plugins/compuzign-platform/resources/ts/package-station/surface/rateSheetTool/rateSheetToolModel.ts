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
  PackageRateSheetBundleItem,
  PackageRateSheetItem,
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
  platformId?:     string;
  optionId:        string;               // stored source_item_id → manager item_id (preserved)
  optionLabel:     string;               // Service-resolved supplied-content label (display only)
  unitPrice:       number;               // the row's own Default Price — never migrated into priceOptions
  per:             PackageRateSheetUnit;
  quantity:        number;
  groupId:         string | null;
  sourceAvailable: boolean;              // supplying source resolves and is not missing/disabled
  // Supplying-Service provenance, carried straight from the manager relationship
  // (PackageManagerItem.source_service_id/_title — display only, resolved by the
  // backend, never derived here). Null when the relationship carries none.
  sourceServiceId:    number | null;
  sourceServiceTitle: string | null;
  // Zero or more alternative unit prices for THIS row — children of the row,
  // never a second row, never Rate-Sheet-wide. Not named `options`: this
  // repo's `option`/`optionId` vocabulary already means "which supplied
  // content populates this row" (see RateSheetOption below); a price option
  // is an unrelated, additional concept and must not collide with it.
  priceOptions: RateSheetEditorPriceOption[];
  // What this row calls its own `unitPrice` — admin display configuration for
  // the price it ALREADY has, not a price option and not an identity. Blank
  // inherits the built-in "Default Price" name (see `defaultPriceLabel`).
  defaultPriceLabel: string;
  // BUNDLE ROWS ONLY — this row's own editable display name, overriding the
  // Service-resolved `optionLabel`. Undefined on every sheet row (a sheet row
  // has never had an editable label and still does not), blank on a Bundle row
  // that inherits. Optional rather than a separate row type precisely so a
  // Bundle row IS a Rate Sheet row: the same grid, lock editor, and Price
  // Option tab strip render it with no branch.
  label?: string;
}

/** What a row displays: a Bundle row's own label when set, otherwise the
 *  Service-resolved supplied-content label. One rule, used by every
 *  presentation, so the grid and the picker can never disagree. */
export function rowDisplayLabel(row: RateSheetEditorRow): string {
  const own = row.label?.trim() ?? '';
  return own !== '' ? own : row.optionLabel;
}

/**
 * One alternative unit price on a row. `id` mirrors `rowKey()`'s own
 * discipline: the stored `option_id` once saved, or blank pre-save — the
 * backend mints it, this file never invents one, and it is never derived
 * from `label`. Unlike a row (whose pre-save fallback key is its stable
 * `optionId`/source id), an option has no such stable pre-save content to
 * key on, so `localKey` — generated once by `addEditorPriceOption`, never sent to
 * the backend — fills that role instead.
 */
export interface RateSheetEditorPriceOption {
  id:          string;
  localKey:    string;
  platformId?: string;
  label:       string;
  unitPrice:   number;
}

/**
 * One Bundle of the selected sheet — a composition space holding complete Rate
 * Sheet rows. A blank `id` marks a not-yet-persisted Bundle (the backend mints
 * it, exactly like a sheet's own id); `platformId` is the output-only `CZPRCB`.
 * It deliberately holds no groups and no units of its own: its rows use the
 * owning sheet's, which is what keeps a Bundle row a full Rate Sheet row rather
 * than a member of a second, parallel catalogue.
 */
export interface RateSheetEditorBundle {
  id:          string;
  /** Session-stable address for a not-yet-saved Bundle. See `bundleKey()`. */
  localKey:    string;
  platformId?: string;
  title:       string;
  status:      PackageRateSheetStatus;
  /**
   * The Bundle's OWN commercial price for consuming this combination together
   * — independent of what its rows sum to, and what a consumer is charged when
   * it selects the single row this Bundle presents upstream.
   */
  unitPrice:    number;
  per:          PackageRateSheetUnit;
  /**
   * The Bundle's own quantity and group — the remaining two cells of the ONE
   * Rate Sheet row a Bundle presents. They live on the Bundle, not on its
   * components: a combination is quantified and grouped as the single item it
   * is sold as.
   */
  quantity:     number;
  groupId:      string | null;
  priceOptions: RateSheetEditorPriceOption[];
  /** What the Bundle calls its own default price. Same display-only rule as a
   *  row's — see `RateSheetEditorRow.defaultPriceLabel`. */
  defaultPriceLabel: string;
  items:        RateSheetEditorRow[];
}

export interface RateSheetEditorValue {
  id:     string;                        // stored rate_sheet_id, blank until minted on save
  platformId?: string;
  title:  string;
  status: PackageRateSheetStatus;
  groups: RateSheetEditorGroup[];
  items:  RateSheetEditorRow[];
  bundles: RateSheetEditorBundle[];
}

/** One selectable supplied-content source for a row (the manager relationships). */
export interface RateSheetOption {
  id:    string;   // manager item_id (the row's source_item_id)
  label: string;
  sourceServiceId:    number | null;
  sourceServiceTitle: string | null;
}

export const EMPTY_RATE_SHEET_VALUE: RateSheetEditorValue = { id: '', title: '', status: 'active', groups: [], items: [], bundles: [] };

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

  const items = toEditorRows(sheet.items, itemById, labelById, groupIds);
  // A Bundle's rows project through the SAME row mapper as the sheet's own —
  // one projection, so a Bundle row can never quietly become a lesser row.
  const bundles = (sheet.bundles ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((bundle) => ({
      id:         bundle.bundle_id,
      localKey:   bundle.bundle_id,
      platformId: bundle.platform_id,
      title:      bundle.title,
      status:     bundle.status,
      unitPrice:  bundle.unit_price,
      per:        bundle.per,
      quantity:   bundle.quantity ?? 1,
      // Validated against the owning sheet's groups exactly like a row's, so a
      // group deleted since the last save reads as Ungrouped rather than as a
      // dangling id.
      groupId:    bundle.group_id != null && groupIds.has(bundle.group_id) ? bundle.group_id : null,
      priceOptions: (bundle.price_options ?? []).map((option) => ({
        id: option.option_id, localKey: option.option_id,
        platformId: option.platform_id, label: option.label, unitPrice: option.unit_price,
      })),
      defaultPriceLabel: bundle.default_price_label ?? '',
      items:      toEditorRows(bundle.items, itemById, labelById, groupIds, true),
    }));

  return { id: sheet.rate_sheet_id, platformId: sheet.platform_id, title: sheet.title, status: sheet.status, groups, items, bundles };
}

/** Stored priced rows → editor rows, in stored order. `withLabel` carries a
 *  Bundle row's own display-label override; a sheet row never has one. */
function toEditorRows(
  rawItems: readonly PackageRateSheetItem[],
  itemById: Map<string, PackageManagerItem>,
  labelById: Map<string, string>,
  groupIds: ReadonlySet<string>,
  withLabel = false,
): RateSheetEditorRow[] {
  return [...rawItems]
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((item) => itemById.has(item.source_item_id))
    .map((item) => {
      const relationship = itemById.get(item.source_item_id);
      return {
        id:              item.item_id,
        platformId:      item.platform_id,
        optionId:        item.source_item_id,
        optionLabel:     labelById.get(item.source_item_id) ?? '(missing source)',
        unitPrice:       item.unit_price,
        per:             item.per,
        quantity:        item.quantity,
        groupId:         item.group_id !== null && groupIds.has(item.group_id) ? item.group_id : null,
        sourceAvailable: sourceAvailable(relationship),
        sourceServiceId:    relationship?.source_service_id ?? null,
        sourceServiceTitle: relationship?.source_service_title ?? null,
        priceOptions: (item.price_options ?? []).map((option) => ({
          id: option.option_id, localKey: option.option_id,
          platformId: option.platform_id, label: option.label, unitPrice: option.unit_price,
        })),
        defaultPriceLabel: item.default_price_label ?? '',
        ...(withLabel ? { label: (item as PackageRateSheetBundleItem).label ?? '' } : {}),
      };
    });
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
 *  never drop — the same rule the schema keeps). Bundles are reassigned by the
 *  same rule: a Bundle carries its own group, so it can dangle the same way. */
export function deleteEditorGroup(value: RateSheetEditorValue, groupId: string): RateSheetEditorValue {
  const ungroup = (row: RateSheetEditorRow): RateSheetEditorRow =>
    (row.groupId === groupId ? { ...row, groupId: null } : row);
  return {
    ...value,
    groups: value.groups.filter((group) => group.id !== groupId),
    items:  value.items.map(ungroup),
    bundles: value.bundles.map((bundle) => ({
      ...bundle,
      groupId: bundle.groupId === groupId ? null : bundle.groupId,
      items:   bundle.items.map(ungroup),
    })),
  };
}

/**
 * Every row mutation below is written ONCE, against a plain row list, and then
 * applied by the caller to whichever list is in scope: the sheet's own
 * `items[]`, or one Bundle's `items[]`. That is what makes a Bundle row a full
 * Rate Sheet row rather than a lookalike — there is no second implementation of
 * repricing, regrouping, quantity, or Price Options for it to drift from.
 */
export function patchRowIn(
  rows: readonly RateSheetEditorRow[],
  rowId: string,
  patch: Partial<Pick<RateSheetEditorRow, 'unitPrice' | 'per' | 'quantity' | 'groupId' | 'priceOptions' | 'label' | 'defaultPriceLabel'>>,
): RateSheetEditorRow[] {
  return rows.map((row) => (rowKey(row) === rowId ? { ...row, ...patch } : row));
}

export function patchEditorRow(
  value: RateSheetEditorValue,
  rowId: string,
  patch: Partial<Pick<RateSheetEditorRow, 'unitPrice' | 'per' | 'quantity' | 'groupId' | 'priceOptions' | 'label' | 'defaultPriceLabel'>>,
): RateSheetEditorValue {
  return { ...value, items: patchRowIn(value.items, rowId, patch) };
}

/**
 * Apply a row transform to ONE Bundle's rows. The sheet's own rows, and every
 * other Bundle's, are left exactly as they were — a Bundle row is a separate
 * record, never a reference to a shared one.
 */
export function mapEditorBundleRows(
  value: RateSheetEditorValue,
  key: string,
  transform: (rows: readonly RateSheetEditorRow[]) => RateSheetEditorRow[],
): RateSheetEditorValue {
  return {
    ...value,
    bundles: value.bundles.map((bundle) => (bundleKey(bundle) === key
      ? { ...bundle, items: transform(bundle.items) }
      : bundle)),
  };
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
    platformId: undefined,
    unitPrice: 0, per: DEFAULT_UNIT, quantity: 1, groupId: null, sourceAvailable: true,
    sourceServiceId: option.sourceServiceId, sourceServiceTitle: option.sourceServiceTitle,
    priceOptions: [],
    defaultPriceLabel: '',
  };
  return { ...value, items: [...value.items, row] };
}

export function removeRowIn(rows: readonly RateSheetEditorRow[], rowId: string): RateSheetEditorRow[] {
  return rows.filter((row) => rowKey(row) !== rowId);
}

export function removeEditorRow(value: RateSheetEditorValue, rowId: string): RateSheetEditorValue {
  return { ...value, items: removeRowIn(value.items, rowId) };
}

/**
 * Batch-add curated rows for many source options in one shot — the Service
 * Import picker's staging list is curated (unit price/per/quantity/group all
 * already set by the admin before Publish) and never rides `addRow`'s
 * one-row-at-a-time lock, since many new rows exist together, unsaved, before
 * a single Publish persists them all. Each entry supplies its own starting
 * fields rather than `addEditorRow`'s zeroed defaults. Same one-row-per-source
 * discipline as `addEditorRow`: an option that doesn't resolve against the
 * given (already-connected) options, or whose source is already a row, is
 * skipped rather than duplicated.
 */
export interface RateSheetRowEntry {
  optionId:  string;
  unitPrice: number;
  per:       PackageRateSheetUnit;
  quantity:  number;
  groupId:   string | null;
  /** Bundle rows only — the row's own display label. See `RateSheetEditorRow.label`. */
  label?:    string;
}

export function addRowsIn(
  rows: readonly RateSheetEditorRow[],
  entries: readonly RateSheetRowEntry[],
  options: readonly RateSheetOption[],
  withLabel = false,
): RateSheetEditorRow[] {
  const optionById = new Map(options.map((option) => [option.id, option]));
  const existing = new Set(rows.map((row) => row.optionId));
  const added: RateSheetEditorRow[] = [];
  for (const entry of entries) {
    if (existing.has(entry.optionId)) continue;
    const option = optionById.get(entry.optionId);
    if (!option) continue;
    existing.add(entry.optionId);
    added.push({
      id: '', optionId: option.id, optionLabel: option.label,
      platformId: undefined,
      unitPrice: entry.unitPrice, per: entry.per, quantity: entry.quantity, groupId: entry.groupId, sourceAvailable: true,
      sourceServiceId: option.sourceServiceId, sourceServiceTitle: option.sourceServiceTitle,
      priceOptions: [],
      defaultPriceLabel: '',
      ...(withLabel ? { label: entry.label ?? '' } : {}),
    });
  }
  return added.length === 0 ? [...rows] : [...rows, ...added];
}

export function addEditorRows(
  value: RateSheetEditorValue,
  entries: readonly RateSheetRowEntry[],
  options: readonly RateSheetOption[],
): RateSheetEditorValue {
  const items = addRowsIn(value.items, entries, options);
  return items.length === value.items.length ? value : { ...value, items };
}

// ── Bundles (pure) ────────────────────────────────────────────────────────────
// A sheet's own Bundles: composition spaces holding complete Rate Sheet rows.
// Everything here is a transform of the SELECTED sheet's editor value — a
// Bundle never escapes the sheet that owns it, and none of this mints an id.

let NEW_BUNDLE_SEQ = 0;

/** A stable key for a Bundle: its stored `bundle_id` once saved, or its
 *  session-local key before then — exactly `priceOptionKey()`'s discipline one
 *  level up, and never sent to the backend as a `bundle_id`. */
export function bundleKey(bundle: RateSheetEditorBundle): string {
  return bundle.id !== '' ? bundle.id : `new:${bundle.localKey}`;
}

/**
 * Add an empty Bundle to the sheet and report the key that addresses it, so
 * the caller can select it immediately — the same reason
 * `createEditorGroupWithId` reports its id rather than making the caller guess
 * afterwards. The id stays blank until the backend mints it on save.
 */
export function createEditorBundle(
  value: RateSheetEditorValue,
  title: string,
): { value: RateSheetEditorValue; key: string } {
  const bundle: RateSheetEditorBundle = {
    id:       '',
    localKey: `local_${Date.now()}_${NEW_BUNDLE_SEQ++}`,
    title:    title.trim() || `Bundle ${value.bundles.length + 1}`,
    status:   'active',
    unitPrice: 0,
    per:       DEFAULT_UNIT,
    quantity:  1,
    groupId:   null,
    priceOptions: [],
    defaultPriceLabel: '',
    items:    [],
  };
  return { value: { ...value, bundles: [...value.bundles, bundle] }, key: bundleKey(bundle) };
}

/** The Bundle a key addresses, or null. */
export function findEditorBundle(
  value: RateSheetEditorValue,
  key: string | null,
): RateSheetEditorBundle | null {
  if (key === null) return null;
  return value.bundles.find((bundle) => bundleKey(bundle) === key) ?? null;
}

export function patchEditorBundle(
  value: RateSheetEditorValue,
  key: string,
  patch: Partial<Pick<RateSheetEditorBundle, 'title' | 'status' | 'unitPrice' | 'per' | 'quantity' | 'groupId' | 'priceOptions' | 'defaultPriceLabel'>>,
): RateSheetEditorValue {
  return {
    ...value,
    bundles: value.bundles.map((bundle) => (bundleKey(bundle) === key ? { ...bundle, ...patch } : bundle)),
  };
}

/** Remove a Bundle and every row it holds. The sheet's own rows are untouched:
 *  a Bundle row is a separate record, never a reference to a sheet row. */
export function deleteEditorBundle(value: RateSheetEditorValue, key: string): RateSheetEditorValue {
  return { ...value, bundles: value.bundles.filter((bundle) => bundleKey(bundle) !== key) };
}

/**
 * What a Bundle's single row shows in its Supplied content cell: the display
 * label of every component it compiles, in stored order.
 *
 * This is the read side of "a Bundle is one Rate Sheet row". Each component
 * keeps its own stored record and identity (`CZPRCBI`) exactly as before — what
 * the authoring UI no longer does is re-declare that component's definition,
 * because it was already declared on the Rate Sheet the component came from.
 * That is why the cell is read-only.
 */
export function bundleSuppliedContent(bundle: RateSheetEditorBundle): string[] {
  return bundle.items.map(rowDisplayLabel);
}

/**
 * The Bundle AS the single Rate Sheet row it is — so the standalone drawer's
 * own `RateSheetGridEditor`, its one-row-at-a-time Edit/Save/Cancel/Remove
 * lock, and its Price Options tab strip render a Bundle with NO new editor,
 * no second grid, and no bespoke cell.
 *
 * `label` carries the Bundle's own name, which is what makes the grid render
 * its editable-name cell (`Product Bundle`); `optionLabel` carries the supplied
 * content it compiles, which that same cell already shows beneath the name.
 *
 * The key is deliberately `bundleKey()`'s: `optionId` is the Bundle's session-
 * local key, so `rowKey()` yields the stored `bundle_id` once saved and
 * `new:<localKey>` before then — the exact address every Bundle command
 * already takes, so the shared lock needs no second addressing scheme.
 */
export function bundleAsEditorRow(bundle: RateSheetEditorBundle): RateSheetEditorRow {
  const supplied = bundleSuppliedContent(bundle);
  return {
    id:              bundle.id,
    platformId:      bundle.platformId,
    optionId:        bundle.localKey,
    // Never blank: the shared cell renders this beneath the name AND builds
    // every field's accessible name from it, so an empty combination would
    // otherwise produce "Unit price for ".
    optionLabel:     supplied.length > 0 ? supplied.join('; ') : 'No supplied content yet',
    unitPrice:       bundle.unitPrice,
    per:             bundle.per,
    quantity:        bundle.quantity,
    groupId:         bundle.groupId,
    // A combination is not supplied by a Manager source, so nothing about it
    // can go missing the way a sourced row can.
    sourceAvailable: true,
    sourceServiceId:    null,
    sourceServiceTitle: null,
    priceOptions:       bundle.priceOptions,
    defaultPriceLabel:  bundle.defaultPriceLabel,
    label:              bundle.title,
  };
}

/**
 * What the Bundle engine browses: every Rate Sheet in the collection and the
 * rows it prices. Unlike the "+ Add Service" picker — which browses SERVICES
 * and their supplied content — this browses the Rate Sheets themselves, so a
 * Bundle is composed from work that has already been priced.
 *
 * The rows handed over are the editor's own rows, so what the engine shows is
 * exactly what the sheet holds, including unsaved edits. Composing FROM the
 * sheet currently being edited is deliberately allowed: the resulting Bundle
 * row is a separate record either way.
 */
export interface BundleSourceSheet {
  key:    string;
  id:     string;
  title:  string;
  status: PackageRateSheetStatus;
  rows:   readonly RateSheetEditorRow[];
}

/** One row of one source sheet, addressed across the whole collection. */
export function bundleSourceRowRef(sheetKey: string, row: RateSheetEditorRow): string {
  return `${sheetKey} ${rowKey(row)}`;
}

// ── Price options (pure) ──────────────────────────────────────────────────────
// A row's zero-or-more alternative unit prices. Children of the row only —
// never a second row, never Rate-Sheet-wide, never quantity/cycle/commitment.

let NEW_PRICE_OPTION_SEQ = 0;

/** A grid-stable key for a price option: its stored `option_id` once saved,
 *  or its `localKey` before then — mirrors `rowKey()`'s own discipline,
 *  never sent to the backend as `option_id`. */
export function priceOptionKey(option: RateSheetEditorPriceOption): string {
  return option.id !== '' ? option.id : `new:${option.localKey}`;
}

/** Adds a blank price option to a row and returns its key, so the caller can
 *  select it immediately without a second lookup. */
/** The blank option a row gains, and the key that addresses it — minted here
 *  so both the sheet-scoped and Bundle-scoped callers add the same thing. */
export function newEditorPriceOption(): RateSheetEditorPriceOption {
  return { id: '', localKey: `local_${Date.now()}_${NEW_PRICE_OPTION_SEQ++}`, platformId: undefined, label: '', unitPrice: 0 };
}

export function addPriceOptionIn(
  rows: readonly RateSheetEditorRow[],
  rowId: string,
  option: RateSheetEditorPriceOption,
): RateSheetEditorRow[] {
  return rows.map((row) => (rowKey(row) === rowId
    ? { ...row, priceOptions: [...row.priceOptions, option] }
    : row));
}

export function removePriceOptionIn(
  rows: readonly RateSheetEditorRow[],
  rowId: string,
  optionKey: string,
): RateSheetEditorRow[] {
  return rows.map((row) => (rowKey(row) !== rowId
    ? row
    : { ...row, priceOptions: row.priceOptions.filter((option) => priceOptionKey(option) !== optionKey) }));
}

export function patchPriceOptionIn(
  rows: readonly RateSheetEditorRow[],
  rowId: string,
  optionKey: string,
  patch: Partial<Pick<RateSheetEditorPriceOption, 'label' | 'unitPrice'>>,
): RateSheetEditorRow[] {
  return rows.map((row) => (rowKey(row) !== rowId
    ? row
    : {
      ...row,
      priceOptions: row.priceOptions.map((option) => (priceOptionKey(option) === optionKey ? { ...option, ...patch } : option)),
    }));
}

export function addEditorPriceOption(
  value: RateSheetEditorValue,
  rowId: string,
): { value: RateSheetEditorValue; key: string } {
  const option = newEditorPriceOption();
  return {
    value: { ...value, items: addPriceOptionIn(value.items, rowId, option) },
    key: priceOptionKey(option),
  };
}

export function removeEditorPriceOption(
  value: RateSheetEditorValue,
  rowId: string,
  optionKey: string,
): RateSheetEditorValue {
  return { ...value, items: removePriceOptionIn(value.items, rowId, optionKey) };
}

export function patchEditorPriceOption(
  value: RateSheetEditorValue,
  rowId: string,
  optionKey: string,
  patch: Partial<Pick<RateSheetEditorPriceOption, 'label' | 'unitPrice'>>,
): RateSheetEditorValue {
  return { ...value, items: patchPriceOptionIn(value.items, rowId, optionKey, patch) };
}

// ── Collection mutations (pure) ────────────────────────────────────────────────

/** A fresh, unsaved sheet. Blank id → the backend mints on save. */
export function createEditorSheet(title = ''): RateSheetEditorValue {
  return { id: '', title, status: 'active', groups: [], items: [], bundles: [] };
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
    items:  source.items.map((row) => ({
      ...row,
      platformId: undefined,
      priceOptions: row.priceOptions.map((option) => ({ ...option, platformId: undefined })),
    })),
    // A duplicate copies the Bundles too — a Bundle is part of what the sheet
    // IS. Every identity is cleared for the same reason the rows' are: the copy
    // is a new record everywhere, so the backend mints it fresh Bundle ids.
    bundles: source.bundles.map((bundle) => ({
      ...bundle,
      id:         '',
      localKey:   `local_${Date.now()}_${NEW_BUNDLE_SEQ++}`,
      platformId: undefined,
      priceOptions: bundle.priceOptions.map((option) => ({ ...option, platformId: undefined })),
      items: bundle.items.map((row) => ({
        ...row,
        platformId: undefined,
        priceOptions: row.priceOptions.map((option) => ({ ...option, platformId: undefined })),
      })),
    })),
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
    items:         value.items.map(toStoredRow),
    bundles:       value.bundles.map((bundle, index) => ({
      bundle_id:  bundle.id,
      title:      bundle.title.trim(),
      status:     bundle.status,
      sort_order: index,
      unit_price: bundle.unitPrice,
      per:        bundle.per,
      quantity:   bundle.quantity,
      group_id:   bundle.groupId,
      price_options: bundle.priceOptions.map((option) => ({
        option_id: option.id, label: option.label.trim(), unit_price: option.unitPrice,
      })),
      default_price_label: bundle.defaultPriceLabel.trim(),
      items:      bundle.items.map((row, rowIndex) => ({
        ...toStoredRow(row, rowIndex),
        label: (row.label ?? '').trim(),
      })),
    })),
  };
}

/** One editor row → its stored shape. Ids preserved; a blank id is left for
 *  the backend to mint/derive. Shared by the sheet's own rows and its
 *  Bundles' rows — a Bundle row stores the same fields, plus its `label`. */
function toStoredRow(row: RateSheetEditorRow, index: number): PackageRateSheetItem {
  return {
    item_id:        row.id,
    source_item_id: row.optionId,
    unit_price:     row.unitPrice,
    per:            row.per,
    quantity:       row.quantity,
    group_id:       row.groupId,
    sort_order:     index,
    price_options:  row.priceOptions.map((option) => ({
      option_id: option.id, label: option.label.trim(), unit_price: option.unitPrice,
    })),
    // Naming the row's own price, not adding one: blank stores blank, which the
    // reader shows as the built-in "Default Price".
    default_price_label: row.defaultPriceLabel.trim(),
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
  // A source priced ONLY inside a Bundle is just as referenced as one priced by
  // the sheet's own rows — omitting it here would let the backend drop the very
  // decision that keeps it settled and consumable.
  const referenced = new Set(sheets.flatMap((sheet) => [
    ...sheet.items.map((row) => row.optionId),
    ...sheet.bundles.flatMap((bundle) => bundle.items.map((row) => row.optionId)),
  ]));

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
    .filter((sheet) => !(sheet.rate_sheet_id === '' && sheet.title === '' && sheet.groups.length === 0
      && sheet.items.length === 0 && (sheet.bundles?.length ?? 0) === 0));

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
