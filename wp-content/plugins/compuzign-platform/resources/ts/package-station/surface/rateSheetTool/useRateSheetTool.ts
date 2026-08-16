// Rate Sheet tool — the Package-owned read/edit/save controller for the Rate
// Sheet COLLECTION.
//
// It reads the Package Manager through `fetchPackageStationManager`, holds a
// working copy of every sheet the grid edits, and commits through
// `savePackageStationManager` as a partial upsert set plus an explicit deletion
// list. It adds no endpoint, no storage, and no id minting — the pure mapping
// lives in ./rateSheetToolModel and the authoritative reconciliation stays in
// PackageManagerSchema.
//
// The Package Station is addressed by a host-Service id (there is no standalone
// manager route); `useHostService` supplies the same host the Tier workspace
// uses, so both describe the one `cz_package_station` record. The hook yields a
// collection whose SINGLE item is the controller.

import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { SurfaceCollection } from '@/station-manager/registry/dataSources';
import { fetchAdminCatalog } from '@/service-station';
import type { ServiceSummary } from '@/service-station';
import { fetchPackageStationManager, savePackageStationManager } from '../../api';
import { BUILT_IN_RATE_SHEET_UNITS } from '../../types';
import type { PackageManagerReadModel, PackageRateSheetUnit } from '../../types';
import { useHostService } from '../tierSurface/useHostService';
import {
  addBundleSuppliedContent,
  addPriceOptionIn,
  addRowsIn,
  buildManagerSavePayload,
  bundleKey,
  connectSourceServices,
  connectedServiceIds,
  createEditorBundle,
  createEditorGroupWithId,
  createEditorSheet,
  deleteEditorBundle,
  deleteEditorGroup,
  duplicateEditorSheet,
  findBundleRow,
  findEditorBundle,
  newEditorPriceOption,
  NEW_BUNDLE_SENTINEL,
  ordinaryRows,
  patchEditorBundle,
  patchPriceOptionIn,
  patchRowIn,
  priceOptionKey,
  rateSheetOptions,
  removeBundleSuppliedContent,
  removePriceOptionIn,
  removeRowIn,
  renameEditorGroup,
  rowKey,
  toRateSheetEditorList,
} from './rateSheetToolModel';
import type {
  BundleSourceSheet,
  RateSheetEditorBundle,
  RateSheetEditorRow,
  RateSheetEditorSuppliedContentRef,
  RateSheetEditorValue,
  RateSheetOption,
  RateSheetRowEntry,
} from './rateSheetToolModel';

/**
 * The focused Rate Sheet's drawer groups — the same Details/Options vocabulary
 * the Tier drawer uses. Details is the sheet itself (its own fields and its own
 * priced rows); Options is its Bundles. There is no Bin: Rate Sheets have no bin
 * lifecycle.
 */
export type RateSheetGroupId = 'details' | 'options';

/** Which of the two shared group renderers draws the nav. Presentation only. */
export type RateSheetGroupView = 'tabs' | 'accordion';

/** A row in the Rate Sheet list. */
export interface RateSheetListRow {
  id:     string;         // '' for a not-yet-saved sheet
  key:    string;         // grid-stable key (id, or new:index)
  title:  string;
  status: 'active' | 'archived';
  rows:   number;
  groups: number;
}

export interface RateSheetToolController {
  hostServiceId:        number | null;
  // Collection.
  list:                 RateSheetListRow[];
  selectedKey:          string | null;
  selected:             RateSheetEditorValue | null;
  options:              RateSheetOption[];
  units:                readonly PackageRateSheetUnit[];
  dirty:                boolean;
  saving:               boolean;
  saveError:            string | null;
  connectedServiceIds:  number[];
  catalog:              ServiceSummary[];
  catalogLoading:       boolean;
  catalogError:         string | null;
  loadCatalog:          () => void;
  // Collection actions (all local until save; delete/status persist on save).
  openSheet:            (key: string) => void;
  closeSheet:           () => void;
  createSheet:          () => void;
  duplicateSheet:       (key: string) => void;
  setSheetStatus:       (key: string, status: 'active' | 'archived') => void;
  deleteSheet:          (key: string) => void;
  // ── Drawer groups ──────────────────────────────────────────────────────
  // The focused sheet's group navigation, owned here rather than in the
  // presentation for the same reason `selectedBundleKey` is: the drawer body
  // unmounts on every refetch/address change, which would otherwise reset the
  // active group and the view mode after each save.
  groupTab:             RateSheetGroupId;
  selectGroupTab:       (id: RateSheetGroupId) => void;
  groupView:            RateSheetGroupView;
  setGroupView:         (view: RateSheetGroupView) => void;
  // ── Bundles ────────────────────────────────────────────────────────────
  // The selected sheet's own Bundles: authoring records whose commercial row
  // is a REAL member of the sheet's own `items[]`, each with its own CZPRCB.
  // Navigation state only lives here — `selectedBundleKey === null` means the
  // sheet's own rows are in focus, which is the state every consumer that
  // predates Bundles is always in.
  bundles:              RateSheetEditorBundle[];
  /** The Bundle IN SCOPE — the remembered selection while Options is the active
   *  group, and always `null` under Details, whose scope is the sheet's own
   *  rows. The remembered selection itself is kept privately, so returning to
   *  Options lands back on the Bundle the admin left. */
  selectedBundleKey:    string | null;
  selectedBundle:       RateSheetEditorBundle | null;
  /** The selected Bundle's own linked row — found by `itemId`, never
   *  synthesized — so the shared `RateSheetGridEditor` and the shared row lock
   *  render it with no second editor. `null` for a Bundle still mid-authoring,
   *  before its first Import has created one. */
  selectedBundleRow:    RateSheetEditorRow | null;
  /** The rows the active GROUP displays: the sheet's own ordinary rows under
   *  Details, or the selected Bundle's one row under Options. Every row
   *  COMMAND below addresses `selected.items` directly regardless of scope —
   *  a row's own key already says which one, ordinary or Bundle-backed. */
  activeRows:           readonly RateSheetEditorRow[];
  /** Every Rate Sheet in the collection with its own ORDINARY rows — what the
   *  Bundle engine browses to compose supplied content from. Read-only
   *  projection of the same working copy the grid edits, so it is never a
   *  second, staler view of the collection. */
  bundleSources:        BundleSourceSheet[];
  selectBundle:         (key: string | null) => void;
  /** Begins authoring a new Bundle in the selected sheet: a record with no
   *  row and no supplied content yet. Its first Import (`importBundleContent`)
   *  is what creates its row and mints both together. Local until then — no
   *  chip-worthy record exists before that first Import. */
  createBundle:         () => void;
  setBundleStatus:      (key: string, status: 'active' | 'archived') => void;
  /** Adds one live reference to what the Bundle compiles — never a copy. A
   *  row already referenced is ignored. */
  addBundleSuppliedContentRef:    (key: string, reference: { sourceRateSheetId: string; sourceItemId: string }) => void;
  removeBundleSuppliedContentRef: (key: string, reference: { sourceRateSheetId: string; sourceItemId: string }) => void;
  /**
   * The Bundle's own first Import: creates its row (carrying `initialUnitPrice`
   * — the seeded sum of what was selected — and every supplied-content
   * reference) in ONE local update, then persists through the SAME
   * full-manager save every other mutation here uses. A Bundle that already
   * has a row (a later Import) instead just adds the references onto it,
   * unchanged in price. Returns whether the save succeeded.
   */
  importBundleContent: (
    key: string,
    references: readonly { sourceRateSheetId: string; sourceItemId: string }[],
    initialUnitPrice: number,
  ) => Promise<boolean>;
  deleteBundle:         (key: string) => void;
  // Selected-sheet edits.
  setTitle:             (title: string) => void;
  /** Creates a group in the selected sheet. Returns its stored id for the row that asked. */
  createGroup:          (label: string) => string | null;
  renameGroup:          (groupId: string, label: string) => void;
  deleteGroup:          (groupId: string) => void;
  removeRow:            (rowId: string) => void;
  /**
   * The Service Import picker's own Publish action: appends every staged
   * entry as a curated row (see `addEditorRows`) and persists through the
   * SAME full-manager save every other mutation here uses — never a second
   * save path. Entries reference options `connectServices` has already made
   * resolvable (the picker connects a Service the moment it is browsed, not
   * at Publish), so this never itself touches `sources`. Returns whether the
   * save succeeded, so the picker knows whether to clear its staging list.
   */
  publishRows:          (entries: readonly RateSheetRowEntry[]) => Promise<boolean>;
  setRowUnitPrice:      (rowId: string, unitPrice: number) => void;
  /** What the row's own Default Price is CALLED — the admin's name for the
   *  price the row already has. Blank restores the built-in "Default Price".
   *  It creates no price option and changes no selection: a Tier still selects
   *  this price by carrying no `price_option_id`. */
  setRowDefaultPriceLabel: (rowId: string, label: string) => void;
  setRowPer:            (rowId: string, per: PackageRateSheetUnit) => void;
  /** A Bundle row's own display label — the Bundle Name. A sheet row carries
   *  none and never renders the cell — see `RateSheetEditorRow.label`. */
  setRowLabel:          (rowId: string, label: string) => void;
  /** Adds a unit to the Manager vocabulary. Returns the settled label, or null if blank. */
  createUnit:           (label: string) => PackageRateSheetUnit | null;
  /** Renames one curated literal unit across the vocabulary and all sheet rows. */
  renameUnit:           (unit: PackageRateSheetUnit, label: string) => PackageRateSheetUnit | null;
  setRowQuantity:       (rowId: string, quantity: number) => void;
  setRowGroup:          (rowId: string, groupId: string | null) => void;
  // A row's own alternative unit prices — children of that row, never a
  // second row, never Rate-Sheet-wide. Local edits only until the row's own
  // Save; ride the exact same editSelected()/dirty path setRowUnitPrice etc.
  // already use, never a second persistence route. A Bundle's row uses these
  // SAME commands — there is no separate Bundle Price Option route.
  /** Adds a blank price option to the row and returns its local key. */
  addPriceOption:       (rowId: string) => string;
  removePriceOption:    (rowId: string, optionKey: string) => void;
  setPriceOptionLabel:  (rowId: string, optionKey: string, label: string) => void;
  setPriceOptionUnitPrice: (rowId: string, optionKey: string, unitPrice: number) => void;
  // Persisting actions.
  connectServices:      (serviceIds: number[]) => Promise<void>;
  save:                 (preserveSelection?: boolean) => Promise<void>;
  discard:              () => void;
  // Row-lock editing — the standalone Rate Sheet drawer's one-row-at-a-time
  // Edit/Save/Cancel/Delete lifecycle. Row Save and Remove/Delete persist
  // immediately through this SAME `save`/`persist` full-manager path; there is
  // no row-scoped endpoint and no second meaning of "Save". Tier-scoped
  // consumers of this controller simply never call these.
  editingRowId:         string | null;
  editingRowSnapshot:   RateSheetEditorRow | null;
  beginRowEdit:         (rowId: string) => void;
  cancelRowEdit:        () => void;
  saveActiveRow:        () => Promise<void>;
  removeRowImmediately: (rowId: string) => Promise<void>;
}

interface WorkingSheet extends RateSheetEditorValue {
  key: string; // stable across a session even for a not-yet-saved sheet
}

let NEW_SHEET_SEQ = 0;

function withKeys(values: RateSheetEditorValue[]): WorkingSheet[] {
  return values.map((value, index) => ({ ...value, key: value.id !== '' ? value.id : `new:${index}:${NEW_SHEET_SEQ++}` }));
}

/** The Bundle in `value.bundles` whose row is this rowId, or null. A row can
 *  back at most one Bundle. */
function bundleOwningRow(value: RateSheetEditorValue, rowId: string): RateSheetEditorBundle | null {
  return value.bundles.find((bundle) => bundle.itemId === rowId) ?? null;
}

/** The one Bundle still mid-authoring (its row not yet created) in a sheet —
 *  there can only be one at a time, the same one-row-lock discipline that
 *  keeps everything else here to a single active record. */
function bundleAwaitingItsRow(value: RateSheetEditorValue): RateSheetEditorBundle | null {
  return value.bundles.find((bundle) => bundle.itemId === '') ?? null;
}

export function useRateSheetTool(): SurfaceCollection<RateSheetToolController> {
  const host = useHostService();
  const hostServiceId = host.service?.id ?? null;

  const [readModel, setReadModel]   = useState<PackageManagerReadModel | null>(null);
  const [sheets, setSheets]         = useState<WorkingSheet[]>([]);
  const [deletions, setDeletions]   = useState<string[]>([]);
  // The vocabulary a row's `per` may hold. It is the Manager's, not a sheet's,
  // so it lives beside `sheets` rather than inside the selected one.
  const [units, setUnits]           = useState<PackageRateSheetUnit[]>([...BUILT_IN_RATE_SHEET_UNITS]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Which child of the selected sheet is in focus: null is the sheet's own
  // rows (the only state before Bundles existed), a key is one of its Bundles.
  const [selectedBundleKey, setSelectedBundleKey] = useState<string | null>(null);
  // The focused sheet's drawer groups. Details is the sheet itself, Options is
  // its Bundles; `groupView` picks which shared renderer draws the nav.
  const [groupTab, setGroupTab]     = useState<RateSheetGroupId>('details');
  const [groupView, setGroupView]   = useState<RateSheetGroupView>('tabs');
  const [dirty, setDirty]           = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  // Row-lock editing state. Rate-Sheet-only, presentation-adjacent: which row
  // (by rowKey) is unlocked, and the values to restore on Cancel. A blank
  // snapshot id means the active row is a not-yet-saved row — Cancel removes
  // it instead of reverting it (and, if it is a not-yet-saved Bundle's own
  // row, removes that Bundle too — see cancelRowEdit).
  const [editingRowId, setEditingRowId]             = useState<string | null>(null);
  const [editingRowSnapshot, setEditingRowSnapshot] = useState<RateSheetEditorRow | null>(null);

  const [catalog, setCatalog]             = useState<ServiceSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError]   = useState<string | null>(null);

  const applyReadModel = useCallback((next: PackageManagerReadModel) => {
    setReadModel(next);
    setSheets(withKeys(toRateSheetEditorList(next)));
    // The backend sends the whole vocabulary, built-ins first. An older response
    // without the key falls back to the built-ins rather than to nothing.
    setUnits(next.rate_sheet_units?.length ? [...next.rate_sheet_units] : [...BUILT_IN_RATE_SHEET_UNITS]);
    setDeletions([]);
    setDirty(false);
  }, []);

  useEffect(() => {
    if (hostServiceId == null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPackageStationManager(hostServiceId)
      .then((response) => {
        if (cancelled) return;
        if (!response.success) { setError('Could not load the Package Manager.'); setReadModel(null); return; }
        applyReadModel(response.manager);
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the Package Manager.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hostServiceId, reloadToken, applyReadModel]);

  const loadCatalog = useCallback(() => {
    setCatalogLoading(true);
    setCatalogError(null);
    fetchAdminCatalog()
      .then((response) => setCatalog(response.stations))
      .catch((err) => setCatalogError(err instanceof Error ? err.message : 'Could not load source Services.'))
      .finally(() => setCatalogLoading(false));
  }, []);

  // Update the selected working sheet through a pure editor-value transform.
  const editSelected = useCallback((transform: (value: RateSheetEditorValue) => RateSheetEditorValue) => {
    setSheets((current) => current.map((sheet) =>
      sheet.key === selectedKey ? { ...transform(sheet), key: sheet.key } : sheet));
    setDirty(true);
    setSaveError(null);
  }, [selectedKey]);

  const scopedBundleKey = groupTab === 'options' ? selectedBundleKey : null;

  /**
   * Apply a row transform to the selected sheet's ONE flat `items[]` list —
   * ordinary rows and every Bundle's own row live there together, so there is
   * no second, scope-routed list for a command to target. The `rowId` a
   * caller supplies already names exactly one row, whichever kind it is.
   */
  const editRows = useCallback((transform: (rows: readonly RateSheetEditorRow[]) => RateSheetEditorRow[]) => {
    editSelected((value) => ({ ...value, items: transform(value.items) }));
  }, [editSelected]);

  const persist = useCallback(
    async (
      nextSheets: WorkingSheet[],
      nextDeletions: string[],
      sources: PackageManagerReadModel['sources'],
      nextUnits: PackageRateSheetUnit[],
      preserveSelection = false,
    ): Promise<boolean> => {
      if (readModel == null || hostServiceId == null) return false;
      setSaving(true);
      setSaveError(null);
      try {
        const response = await savePackageStationManager(
          hostServiceId,
          buildManagerSavePayload(readModel, nextSheets, nextDeletions, sources, nextUnits),
        );
        if (!response.success) { setSaveError(response.message || 'Could not save the Rate Sheets.'); return false; }
        const selectedBeforeSave = preserveSelection
          ? nextSheets.find((sheet) => sheet.key === selectedKey) ?? null
          : null;
        const existingIds = new Set(readModel.rate_sheets.map((sheet) => sheet.rate_sheet_id));
        applyReadModel(response.manager);
        // The stored sheet the selection lands on, or null when the selection
        // did not survive — also what the Bundle selection is recovered against.
        let resolvedSheetId: string | null = null;
        if (selectedBeforeSave === null) {
          setSelectedKey(null);
        } else if (selectedBeforeSave.id !== '') {
          const stillExists = response.manager.rate_sheets.some((sheet) => sheet.rate_sheet_id === selectedBeforeSave.id);
          resolvedSheetId = stillExists ? selectedBeforeSave.id : null;
          setSelectedKey(resolvedSheetId);
        } else {
          const created = response.manager.rate_sheets.find((sheet) => !existingIds.has(sheet.rate_sheet_id));
          if (created) {
            resolvedSheetId = created.rate_sheet_id;
            setSelectedKey(created.rate_sheet_id);
          } else {
            // An empty new sheet is intentionally omitted by the save mapper.
            // Keep that local draft mounted after a source-connection save.
            setSheets((current) => [...current, selectedBeforeSave as WorkingSheet]);
            setSelectedKey((selectedBeforeSave as WorkingSheet).key);
            setDirty(true);
          }
        }
        // The selected Bundle survives a save the same way the selected sheet
        // does. A just-created Bundle's session-local key is replaced by the
        // minted `bundle_id`, recovered by POSITION: the backend re-indexes
        // sort_order from the submitted order, so the Bundle at the same index
        // is the same Bundle. A Bundle that no longer exists (deleted, or
        // dropped as entirely empty) clears the selection back to the sheet's
        // own rows rather than leaving a key addressing nothing.
        if (selectedBundleKey !== null) {
          const index = selectedBeforeSave?.bundles.findIndex((bundle) => bundleKey(bundle) === selectedBundleKey) ?? -1;
          const savedSheet = resolvedSheetId === null
            ? undefined
            : response.manager.rate_sheets.find((sheet) => sheet.rate_sheet_id === resolvedSheetId);
          const savedBundleId = index === -1 ? undefined : savedSheet?.bundles?.[index]?.bundle_id;
          setSelectedBundleKey(savedBundleId ?? null);
        }
        return true;
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Could not save the Rate Sheets.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [readModel, hostServiceId, applyReadModel, selectedKey, selectedBundleKey],
  );

  const list = useMemo<RateSheetListRow[]>(
    () => sheets.map((sheet) => ({
      id: sheet.id, key: sheet.key, title: sheet.title, status: sheet.status,
      rows: ordinaryRows(sheet).length, groups: sheet.groups.length,
    })),
    [sheets],
  );
  const selected = useMemo(() => sheets.find((sheet) => sheet.key === selectedKey) ?? null, [sheets, selectedKey]);
  const selectedBundle = useMemo(
    () => (selected === null ? null : findEditorBundle(selected, scopedBundleKey)),
    [selected, scopedBundleKey],
  );
  const selectedBundleRow = useMemo(
    () => (selected === null || selectedBundle === null ? null : findBundleRow(selectedBundle, selected)),
    [selected, selectedBundle],
  );
  /** The rows the active GROUP displays. */
  const activeRows = useMemo<readonly RateSheetEditorRow[]>(
    () => (scopedBundleKey === null
      ? (selected === null ? [] : ordinaryRows(selected))
      : (selectedBundleRow === null ? [] : [selectedBundleRow])),
    [scopedBundleKey, selected, selectedBundleRow],
  );
  const bundleSources = useMemo<BundleSourceSheet[]>(
    () => sheets.map((sheet) => ({
      key: sheet.key, id: sheet.id, title: sheet.title, status: sheet.status, rows: ordinaryRows(sheet),
    })),
    [sheets],
  );

  const controller = useMemo<RateSheetToolController>(() => ({
    hostServiceId,
    list,
    selectedKey,
    selected,
    options: readModel ? rateSheetOptions(readModel) : [],
    units,
    dirty,
    saving,
    saveError,
    connectedServiceIds: readModel ? connectedServiceIds(readModel.sources) : [],
    catalog,
    catalogLoading,
    catalogError,
    loadCatalog,
    openSheet: (key) => setSelectedKey(key),
    closeSheet: () => setSelectedKey(null),
    createSheet: () => {
      const created: WorkingSheet = { ...createEditorSheet(), key: `new:create:${NEW_SHEET_SEQ++}` };
      setSheets((current) => [...current, created]);
      setSelectedKey(created.key);
      setDirty(true);
      setSaveError(null);
    },
    duplicateSheet: (key) => {
      setSheets((current) => {
        const source = current.find((sheet) => sheet.key === key);
        if (!source) return current;
        const copy: WorkingSheet = { ...duplicateEditorSheet(source), key: `new:dup:${NEW_SHEET_SEQ++}` };
        setSelectedKey(copy.key);
        return [...current, copy];
      });
      setDirty(true);
      setSaveError(null);
    },
    setSheetStatus: (key, status) => {
      setSheets((current) => current.map((sheet) => (sheet.key === key ? { ...sheet, status } : sheet)));
      setDirty(true);
      setSaveError(null);
    },
    deleteSheet: (key) => {
      setSheets((current) => {
        const target = current.find((sheet) => sheet.key === key);
        if (target && target.id !== '') setDeletions((d) => (d.includes(target.id) ? d : [...d, target.id]));
        return current.filter((sheet) => sheet.key !== key);
      });
      setSelectedKey((sel) => (sel === key ? null : sel));
      setDirty(true);
      setSaveError(null);
    },
    groupTab,
    selectGroupTab: (id) => setGroupTab(id),
    groupView,
    setGroupView: (view) => setGroupView(view),
    bundles: selected?.bundles ?? [],
    selectedBundleKey: scopedBundleKey,
    selectedBundle,
    selectedBundleRow,
    activeRows,
    bundleSources,
    selectBundle: (key) => setSelectedBundleKey(key),
    createBundle: () => {
      if (selected === null) return;
      const { value, key } = createEditorBundle(selected);
      editSelected(() => value);
      setSelectedBundleKey(key);
    },
    setBundleStatus: (key, status) => editSelected((value) => patchEditorBundle(value, key, { status })),
    addBundleSuppliedContentRef: (key, reference) => editSelected((value) => addBundleSuppliedContent(value, key, reference)),
    removeBundleSuppliedContentRef: (key, reference) => editSelected((value) => removeBundleSuppliedContent(value, key, reference)),
    importBundleContent: async (key, references, initialUnitPrice) => {
      if (selected === null) return false;
      const bundle = findEditorBundle(selected, key);
      if (bundle === null) return false;
      const hasRow = bundle.itemId !== '';
      const withReferences = references.reduce<RateSheetEditorValue>(
        (value, reference) => addBundleSuppliedContent(value, key, reference),
        selected,
      );
      // The Bundle's first Import mints its row together with the Bundle
      // itself, atomically, in this same local update: a blank item_id row
      // carrying the reserved sentinel, seeded with the summed source prices
      // — never recomputed again after this moment. A LATER Import on an
      // already-created Bundle only adds references; the row, and its price,
      // are untouched.
      const withRow: RateSheetEditorValue = hasRow ? withReferences : {
        ...withReferences,
        items: [...withReferences.items, {
          id: '', optionId: '', optionLabel: '', platformId: undefined,
          unitPrice: initialUnitPrice, per: withReferences.items[0]?.per ?? units[0] ?? 'Per item',
          quantity: 1, groupId: null, sourceAvailable: true,
          sourceServiceId: null, sourceServiceTitle: null,
          priceOptions: [], defaultPriceLabel: '',
          bundleId: NEW_BUNDLE_SENTINEL, label: '',
        }],
      };
      const nextSheet: WorkingSheet = { ...withRow, key: selected.key };
      const nextSheets = sheets.map((sheet) => (sheet.key === selected.key ? nextSheet : sheet));
      setSheets(nextSheets);
      setDirty(true);
      setSaveError(null);
      if (readModel === null) return false;
      return persist(nextSheets, deletions, readModel.sources, units, true);
    },
    deleteBundle: (key) => {
      editSelected((value) => deleteEditorBundle(value, key));
      // The workspace the deleted Bundle owned is gone, so focus returns to the
      // sheet's own rows rather than to a key that now addresses nothing.
      setSelectedBundleKey((current) => (current === key ? null : current));
    },
    setTitle: (title) => editSelected((value) => ({ ...value, title })),
    // The group belongs to the selected sheet, so its id is minted from that
    // sheet's own collection and reported back for the row that asked. It is
    // derived from `selected` rather than inside the state updater, because that
    // updater runs later and could not hand an id back to this caller.
    createGroup: (label) => {
      if (selected === null) return null;
      const { value, groupId } = createEditorGroupWithId(selected, label);
      if (groupId === null) return null;
      editSelected(() => value);
      return groupId;
    },
    renameGroup: (groupId, label) => {
      const next = label.trim();
      if (next !== '') editSelected((value) => renameEditorGroup(value, groupId, next));
    },
    deleteGroup: (groupId) => editSelected((value) => deleteEditorGroup(value, groupId)),
    removeRow: (rowId) => editRows((rows) => removeRowIn(rows, rowId)),
    publishRows: async (entries) => {
      if (readModel == null) return false;
      const currentOptions = rateSheetOptions(readModel);
      // Computed and handed to `persist` directly, not through `editSelected` +
      // a follow-up `save()` — two state setters in the same handler would
      // otherwise race: `persist` closes over this render's `sheets`, which
      // would still be stale (pre-import) if we relied on a setSheets() commit
      // to land first.
      const nextSheets = sheets.map((sheet) => (sheet.key === selectedKey
        ? { ...sheet, items: addRowsIn(sheet.items, entries, currentOptions), key: sheet.key }
        : sheet));
      setSheets(nextSheets);
      setDirty(true);
      setSaveError(null);
      return persist(nextSheets, deletions, readModel.sources, units, true);
    },
    setRowUnitPrice: (rowId, unitPrice) => editRows((rows) => patchRowIn(rows, rowId, { unitPrice: Math.max(0, unitPrice) })),
    // Naming the Default Price rides the exact same local-edit path repricing
    // does — no option is created, no id is minted, nothing is re-addressed.
    setRowDefaultPriceLabel: (rowId, label) => editRows((rows) => patchRowIn(rows, rowId, { defaultPriceLabel: label })),
    setRowPer: (rowId, per) => editRows((rows) => patchRowIn(rows, rowId, { per })),
    setRowQuantity: (rowId, quantity) => editRows((rows) => patchRowIn(rows, rowId, { quantity: Math.max(1, Math.trunc(quantity) || 1) })),
    setRowGroup: (rowId, groupId) => editRows((rows) => patchRowIn(rows, rowId, { groupId })),
    // Bundle rows only — the grid offers this cell for a row that carries a
    // `label` at all, which a sheet row never does.
    setRowLabel: (rowId, label) => editRows((rows) => patchRowIn(rows, rowId, { label })),
    addPriceOption: (rowId) => {
      const option = newEditorPriceOption();
      editRows((rows) => addPriceOptionIn(rows, rowId, option));
      return priceOptionKey(option);
    },
    removePriceOption: (rowId, optionKey) => editRows((rows) => removePriceOptionIn(rows, rowId, optionKey)),
    setPriceOptionLabel: (rowId, optionKey, label) => editRows((rows) => patchPriceOptionIn(rows, rowId, optionKey, { label })),
    setPriceOptionUnitPrice: (rowId, optionKey, unitPrice) => editRows((rows) => patchPriceOptionIn(rows, rowId, optionKey, { unitPrice: Math.max(0, unitPrice) })),
    // A unit is Manager vocabulary, not a sheet's property, so creating one
    // touches no sheet. It returns the label it settled on — the existing entry
    // when one already matches — so the row that asked can select it either way.
    createUnit: (label) => {
      const next = label.trim();
      if (next === '') return null;
      const existing = units.find((unit) => unit.toLowerCase() === next.toLowerCase());
      if (existing !== undefined) return existing;
      setUnits((current) => [...current, next]);
      setDirty(true);
      setSaveError(null);
      return next;
    },
    renameUnit: (unit, label) => {
      if ((BUILT_IN_RATE_SHEET_UNITS as readonly string[]).includes(unit)) return null;
      const next = label.trim();
      if (next === '') return null;
      const collision = units.find((candidate) => candidate !== unit && candidate.toLowerCase() === next.toLowerCase());
      if (collision !== undefined) return null;
      setUnits((current) => current.map((candidate) => candidate === unit ? next : candidate));
      setSheets((current) => current.map((sheet) => ({
        ...sheet,
        items: sheet.items.map((row) => row.per === unit ? { ...row, per: next } : row),
      })));
      setDirty(true);
      setSaveError(null);
      return next;
    },
    connectServices: async (serviceIds) => {
      if (readModel == null) return;
      await persist(sheets, deletions, connectSourceServices(readModel.sources, serviceIds), units, true);
    },
    save: async (preserveSelection = false) => {
      if (readModel == null) return;
      await persist(sheets, deletions, readModel.sources, units, preserveSelection);
    },
    discard: () => {
      if (readModel) applyReadModel(readModel);
      setSelectedKey(null);
      setSelectedBundleKey(null);
      setEditingRowId(null);
      setEditingRowSnapshot(null);
    },
    editingRowId,
    editingRowSnapshot,
    beginRowEdit: (rowId) => {
      // Refuse a second row: only one may be unlocked at a time. The lock is
      // one lock for the whole drawer, not one per scope — a Bundle row and a
      // sheet row can never be open together. `activeRows` already carries
      // the Bundle's own row when Options is in scope, so one lookup covers
      // every kind of row.
      if (editingRowId !== null) return;
      const row = activeRows.find((item) => rowKey(item) === rowId) ?? null;
      if (!row) return;
      setEditingRowId(rowId);
      setEditingRowSnapshot(row);
      setSaveError(null);
    },
    cancelRowEdit: () => {
      if (editingRowId === null || selected === null) return;
      const targetId = editingRowId;
      const snapshot = editingRowSnapshot;
      if (snapshot && snapshot.id !== '') {
        // Existing row: restore its last-saved values. This is a local revert
        // only — no API call — matching every other Cancel in this drawer.
        editRows((rows) => patchRowIn(rows, targetId, {
          unitPrice:    snapshot.unitPrice,
          per:          snapshot.per,
          quantity:     snapshot.quantity,
          groupId:      snapshot.groupId,
          priceOptions: snapshot.priceOptions,
          ...(snapshot.label === undefined ? {} : { label: snapshot.label }),
        }));
      } else {
        // Not-yet-saved row: it represents nothing persisted, so Cancel
        // discards it entirely rather than "restoring" it to a prior state
        // that never existed server-side. A not-yet-saved Bundle row also
        // means its Bundle was never completed — discard that too, exactly
        // as an unsaved sheet row is discarded outright.
        const owner = bundleAwaitingItsRow(selected);
        if (owner !== null) {
          editSelected((value) => deleteEditorBundle(value, bundleKey(owner)));
          setSelectedBundleKey(null);
        } else {
          editRows((rows) => removeRowIn(rows, targetId));
        }
      }
      setEditingRowId(null);
      setEditingRowSnapshot(null);
      setSaveError(null);
    },
    saveActiveRow: async () => {
      if (editingRowId === null || readModel == null) return;
      // Validate: the active row must still exist in the current draft.
      const activeRow = activeRows.find((item) => rowKey(item) === editingRowId) ?? null;
      if (!activeRow) return;
      // Persist through the SAME full-manager save the footer uses — no
      // row-scoped endpoint. `preserveSelection` re-resolves the current
      // sheet's canonical id/key from the response, which also covers saving
      // a brand-new row on a brand-new (not yet persisted) sheet.
      const ok = await persist(sheets, deletions, readModel.sources, units, true);
      if (ok) {
        // The returned model is already the new baseline (`applyReadModel`
        // ran inside `persist`); locking just means "no row is active".
        setEditingRowId(null);
        setEditingRowSnapshot(null);
      }
      // On failure `saveError` is already set by `persist`, and `sheets` was
      // left untouched, so the row stays editable with its draft intact.
    },
    removeRowImmediately: async (rowId) => {
      if (readModel == null || selectedKey == null || selected === null) return;
      // Only one mutating row action at a time — the same lock Edit obeys.
      if (editingRowId !== null && editingRowId !== rowId) return;
      // Removing a Bundle's own row removes the Bundle — it IS that row.
      // Same confirm, same one full-manager save, same lock release; the
      // Rate Sheet's own rows, and every OTHER Bundle's, are untouched.
      const owningBundle = bundleOwningRow(selected, rowId);
      if (owningBundle !== null) {
        if (!window.confirm('Remove this Bundle? This saves immediately and cannot be undone from here. The Rate Sheet’s own rows are not affected.')) return;
        const nextSheets = sheets.map((sheet) => (sheet.key === selectedKey
          ? { ...deleteEditorBundle(sheet, bundleKey(owningBundle)), key: sheet.key }
          : sheet));
        const removed = await persist(nextSheets, deletions, readModel.sources, units, true);
        if (removed) {
          setSelectedBundleKey(null);
          setEditingRowId(null);
          setEditingRowSnapshot(null);
        }
        return;
      }
      if (!window.confirm('Remove this row? This saves immediately and cannot be undone from here.')) return;
      // Compute the post-removal sheets locally rather than relying on
      // `removeRow` + the shared `sheets` state: that setState is async, so a
      // `persist` call made right after it in the same handler would still
      // see the row present. The local draft is left untouched until the API
      // call resolves, so a failed remove never makes the row merely look
      // deleted — `applyReadModel` on success is what the grid actually
      // renders from.
      const nextSheets = sheets.map((sheet) => (sheet.key === selectedKey
        ? { ...sheet, items: removeRowIn(sheet.items, rowId), key: sheet.key }
        : sheet));
      const ok = await persist(nextSheets, deletions, readModel.sources, units, true);
      if (ok && editingRowId === rowId) {
        setEditingRowId(null);
        setEditingRowSnapshot(null);
      }
    },
  }), [
    hostServiceId, list, selected, selectedKey, selectedBundle, selectedBundleKey, scopedBundleKey,
    groupTab, groupView, activeRows, bundleSources,
    readModel, sheets, deletions, units, dirty, saving, saveError,
    editingRowId, editingRowSnapshot, selectedBundleRow,
    catalog, catalogLoading, catalogError, loadCatalog,
    editSelected, editRows, persist, applyReadModel,
  ]);

  const combinedLoading = host.loading || (hostServiceId != null && loading);
  const combinedError = host.error ?? error;

  return {
    items: combinedLoading || combinedError != null || readModel == null ? [] : [controller],
    loading: combinedLoading,
    error: combinedError,
    refetch: () => setReloadToken((token) => token + 1),
  };
}
