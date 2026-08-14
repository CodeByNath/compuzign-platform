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
  findEditorBundle,
  mapEditorBundleRows,
  newEditorPriceOption,
  patchEditorBundle,
  patchPriceOptionIn,
  patchRowIn,
  priceOptionKey,
  rateSheetOptions,
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
  RateSheetEditorValue,
  RateSheetOption,
  RateSheetRowEntry,
} from './rateSheetToolModel';

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
  // ── Bundles ────────────────────────────────────────────────────────────
  // The selected sheet's own Bundles: composition spaces holding complete Rate
  // Sheet rows, each with its own CZPRCB. Navigation state only lives here —
  // `selectedBundleKey === null` means the sheet's own rows are in focus, which
  // is the state every consumer that predates Bundles is always in.
  bundles:              RateSheetEditorBundle[];
  selectedBundleKey:    string | null;
  selectedBundle:       RateSheetEditorBundle | null;
  /** The rows every row command below addresses: the selected Bundle's rows,
   *  or — with no Bundle selected — the sheet's own. */
  activeRows:           readonly RateSheetEditorRow[];
  /** Every Rate Sheet in the collection with the rows it prices — what the
   *  Bundle engine browses. Read-only projection of the same working copy the
   *  grid edits, so it is never a second, staler view of the collection. */
  bundleSources:        BundleSourceSheet[];
  selectBundle:         (key: string | null) => void;
  /** Creates a Bundle in the selected sheet and focuses it. Local until save. */
  createBundle:         () => void;
  setBundleTitle:       (key: string, title: string) => void;
  setBundleStatus:      (key: string, status: 'active' | 'archived') => void;
  // The Bundle's OWN commercial price — what a consumer pays for the
  // combination, independent of what its rows sum to. Same local-until-Save
  // path as every other edit here.
  setBundleUnitPrice:   (key: string, unitPrice: number) => void;
  setBundlePer:         (key: string, per: PackageRateSheetUnit) => void;
  /** Adds a blank Price Option to the Bundle and returns its key. */
  addBundlePriceOption:       (key: string) => string;
  removeBundlePriceOption:    (key: string, optionKey: string) => void;
  setBundlePriceOptionLabel:  (key: string, optionKey: string, label: string) => void;
  setBundlePriceOptionUnitPrice: (key: string, optionKey: string, unitPrice: number) => void;
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
  setRowPer:            (rowId: string, per: PackageRateSheetUnit) => void;
  /** A Bundle row's own display label. A sheet row carries none and never
   *  renders the cell — see `RateSheetEditorRow.label`. */
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
  // already use, never a second persistence route.
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
  const [dirty, setDirty]           = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  // Row-lock editing state. Rate-Sheet-only, presentation-adjacent: which row
  // (by rowKey) is unlocked, and the values to restore on Cancel. A blank
  // snapshot id means the active row is a not-yet-saved row — Cancel removes
  // it instead of reverting it.
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

  /**
   * Apply a row transform to whichever row list is IN SCOPE — the selected
   * sheet's own rows, or the selected Bundle's. Every row command below goes
   * through this one seam, which is what gives a Bundle the complete Rate Sheet
   * row tooling (repricing, regrouping, quantity, Price Options, the row lock)
   * without a second controller, a second save path, or a second editor.
   */
  const editRows = useCallback((transform: (rows: readonly RateSheetEditorRow[]) => RateSheetEditorRow[]) => {
    editSelected((value) => (selectedBundleKey === null
      ? { ...value, items: transform(value.items) }
      : mapEditorBundleRows(value, selectedBundleKey, transform)));
  }, [editSelected, selectedBundleKey]);

  /** The same scope, applied to a whole working-sheet list (used where a
   *  handler must compute the post-edit state itself rather than wait for a
   *  setState commit — see `publishRows` and `removeRowImmediately`). */
  const withScopedRows = useCallback((
    sheet: WorkingSheet,
    transform: (rows: readonly RateSheetEditorRow[]) => RateSheetEditorRow[],
  ): WorkingSheet => (selectedBundleKey === null
    ? { ...sheet, items: transform(sheet.items) }
    : { ...mapEditorBundleRows(sheet, selectedBundleKey, transform), key: sheet.key }),
  [selectedBundleKey]);

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
      rows: sheet.items.length, groups: sheet.groups.length,
    })),
    [sheets],
  );
  const selected = useMemo(() => sheets.find((sheet) => sheet.key === selectedKey) ?? null, [sheets, selectedKey]);
  const selectedBundle = useMemo(
    () => (selected === null ? null : findEditorBundle(selected, selectedBundleKey)),
    [selected, selectedBundleKey],
  );
  /** The rows currently in scope — the selected Bundle's, or the sheet's own. */
  const activeRows = useMemo<readonly RateSheetEditorRow[]>(
    () => selectedBundle?.items ?? selected?.items ?? [],
    [selectedBundle, selected],
  );
  const bundleSources = useMemo<BundleSourceSheet[]>(
    () => sheets.map((sheet) => ({
      key: sheet.key, id: sheet.id, title: sheet.title, status: sheet.status, rows: sheet.items,
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
    bundles: selected?.bundles ?? [],
    selectedBundleKey,
    selectedBundle,
    activeRows,
    bundleSources,
    selectBundle: (key) => setSelectedBundleKey(key),
    createBundle: () => {
      if (selected === null) return;
      const { value, key } = createEditorBundle(selected, '');
      editSelected(() => value);
      setSelectedBundleKey(key);
    },
    setBundleTitle: (key, title) => editSelected((value) => patchEditorBundle(value, key, { title })),
    setBundleStatus: (key, status) => editSelected((value) => patchEditorBundle(value, key, { status })),
    setBundleUnitPrice: (key, unitPrice) => editSelected((value) => patchEditorBundle(value, key, { unitPrice: Math.max(0, unitPrice) })),
    setBundlePer: (key, per) => editSelected((value) => patchEditorBundle(value, key, { per })),
    addBundlePriceOption: (key) => {
      const option = newEditorPriceOption();
      editSelected((value) => {
        const bundle = findEditorBundle(value, key);
        return bundle === null
          ? value
          : patchEditorBundle(value, key, { priceOptions: [...bundle.priceOptions, option] });
      });
      return priceOptionKey(option);
    },
    removeBundlePriceOption: (key, optionKey) => editSelected((value) => {
      const bundle = findEditorBundle(value, key);
      return bundle === null ? value : patchEditorBundle(value, key, {
        priceOptions: bundle.priceOptions.filter((option) => priceOptionKey(option) !== optionKey),
      });
    }),
    setBundlePriceOptionLabel: (key, optionKey, label) => editSelected((value) => {
      const bundle = findEditorBundle(value, key);
      return bundle === null ? value : patchEditorBundle(value, key, {
        priceOptions: bundle.priceOptions.map((option) => (priceOptionKey(option) === optionKey ? { ...option, label } : option)),
      });
    }),
    setBundlePriceOptionUnitPrice: (key, optionKey, unitPrice) => editSelected((value) => {
      const bundle = findEditorBundle(value, key);
      return bundle === null ? value : patchEditorBundle(value, key, {
        priceOptions: bundle.priceOptions.map((option) => (priceOptionKey(option) === optionKey ? { ...option, unitPrice: Math.max(0, unitPrice) } : option)),
      });
    }),
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
        ? withScopedRows(sheet, (rows) => addRowsIn(rows, entries, currentOptions, selectedBundleKey !== null))
        : sheet));
      setSheets(nextSheets);
      setDirty(true);
      setSaveError(null);
      return persist(nextSheets, deletions, readModel.sources, units, true);
    },
    setRowUnitPrice: (rowId, unitPrice) => editRows((rows) => patchRowIn(rows, rowId, { unitPrice: Math.max(0, unitPrice) })),
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
      // sheet row can never be open together.
      if (editingRowId !== null) return;
      const row = activeRows.find((item) => rowKey(item) === rowId) ?? null;
      if (!row) return;
      setEditingRowId(rowId);
      setEditingRowSnapshot(row);
      setSaveError(null);
    },
    cancelRowEdit: () => {
      if (editingRowId === null) return;
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
        // that never existed server-side.
        editRows((rows) => removeRowIn(rows, targetId));
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
      if (readModel == null || selectedKey == null) return;
      // Only one mutating row action at a time — the same lock Edit obeys.
      if (editingRowId !== null && editingRowId !== rowId) return;
      if (!window.confirm('Remove this row? This saves immediately and cannot be undone from here.')) return;
      // Compute the post-removal sheets locally rather than relying on
      // `removeRow` + the shared `sheets` state: that setState is async, so a
      // `persist` call made right after it in the same handler would still
      // see the row present. The local draft is left untouched until the API
      // call resolves, so a failed remove never makes the row merely look
      // deleted — `applyReadModel` on success is what the grid actually
      // renders from.
      const nextSheets = sheets.map((sheet) => (sheet.key === selectedKey
        ? withScopedRows(sheet, (rows) => removeRowIn(rows, rowId))
        : sheet));
      const ok = await persist(nextSheets, deletions, readModel.sources, units, true);
      if (ok && editingRowId === rowId) {
        setEditingRowId(null);
        setEditingRowSnapshot(null);
      }
    },
  }), [
    hostServiceId, list, selected, selectedKey, selectedBundle, selectedBundleKey, activeRows, bundleSources,
    readModel, sheets, deletions, units, dirty, saving, saveError,
    editingRowId, editingRowSnapshot,
    catalog, catalogLoading, catalogError, loadCatalog,
    editSelected, editRows, withScopedRows, persist, applyReadModel,
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
