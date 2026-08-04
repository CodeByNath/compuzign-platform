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
  addEditorRow,
  buildManagerSavePayload,
  connectSourceServices,
  connectedServiceIds,
  createEditorGroupWithId,
  createEditorSheet,
  deleteEditorGroup,
  duplicateEditorSheet,
  patchEditorRow,
  rateSheetOptions,
  removeEditorRow,
  renameEditorGroup,
  toRateSheetEditorList,
} from './rateSheetToolModel';
import type { RateSheetEditorValue, RateSheetOption } from './rateSheetToolModel';

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
  // Selected-sheet edits.
  setTitle:             (title: string) => void;
  /** Creates a group in the selected sheet. Returns its stored id for the row that asked. */
  createGroup:          (label: string) => string | null;
  renameGroup:          (groupId: string, label: string) => void;
  deleteGroup:          (groupId: string) => void;
  addRow:               (optionId: string) => void;
  removeRow:            (rowId: string) => void;
  setRowUnitPrice:      (rowId: string, unitPrice: number) => void;
  setRowPer:            (rowId: string, per: PackageRateSheetUnit) => void;
  /** Adds a unit to the Manager vocabulary. Returns the settled label, or null if blank. */
  createUnit:           (label: string) => PackageRateSheetUnit | null;
  /** Renames one curated literal unit across the vocabulary and all sheet rows. */
  renameUnit:           (unit: PackageRateSheetUnit, label: string) => PackageRateSheetUnit | null;
  setRowQuantity:       (rowId: string, quantity: number) => void;
  setRowGroup:          (rowId: string, groupId: string | null) => void;
  // Persisting actions.
  connectServices:      (serviceIds: number[]) => Promise<void>;
  save:                 (preserveSelection?: boolean) => Promise<void>;
  discard:              () => void;
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
  const [dirty, setDirty]           = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

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

  const persist = useCallback(
    async (
      nextSheets: WorkingSheet[],
      nextDeletions: string[],
      sources: PackageManagerReadModel['sources'],
      nextUnits: PackageRateSheetUnit[],
      preserveSelection = false,
    ) => {
      if (readModel == null || hostServiceId == null) return;
      setSaving(true);
      setSaveError(null);
      try {
        const response = await savePackageStationManager(
          hostServiceId,
          buildManagerSavePayload(readModel, nextSheets, nextDeletions, sources, nextUnits),
        );
        if (!response.success) { setSaveError(response.message || 'Could not save the Rate Sheets.'); return; }
        const selectedBeforeSave = preserveSelection
          ? nextSheets.find((sheet) => sheet.key === selectedKey) ?? null
          : null;
        const existingIds = new Set(readModel.rate_sheets.map((sheet) => sheet.rate_sheet_id));
        applyReadModel(response.manager);
        if (selectedBeforeSave === null) {
          setSelectedKey(null);
        } else if (selectedBeforeSave.id !== '') {
          const stillExists = response.manager.rate_sheets.some((sheet) => sheet.rate_sheet_id === selectedBeforeSave.id);
          setSelectedKey(stillExists ? selectedBeforeSave.id : null);
        } else {
          const created = response.manager.rate_sheets.find((sheet) => !existingIds.has(sheet.rate_sheet_id));
          if (created) {
            setSelectedKey(created.rate_sheet_id);
          } else {
            // An empty new sheet is intentionally omitted by the save mapper.
            // Keep that local draft mounted after a source-connection save.
            setSheets((current) => [...current, selectedBeforeSave as WorkingSheet]);
            setSelectedKey((selectedBeforeSave as WorkingSheet).key);
            setDirty(true);
          }
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Could not save the Rate Sheets.');
      } finally {
        setSaving(false);
      }
    },
    [readModel, hostServiceId, applyReadModel, selectedKey],
  );

  const list = useMemo<RateSheetListRow[]>(
    () => sheets.map((sheet) => ({
      id: sheet.id, key: sheet.key, title: sheet.title, status: sheet.status,
      rows: sheet.items.length, groups: sheet.groups.length,
    })),
    [sheets],
  );
  const selected = useMemo(() => sheets.find((sheet) => sheet.key === selectedKey) ?? null, [sheets, selectedKey]);

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
    addRow: (optionId) => {
      const option = (readModel ? rateSheetOptions(readModel) : []).find((o) => o.id === optionId);
      if (option) editSelected((value) => addEditorRow(value, option));
    },
    removeRow: (rowId) => editSelected((value) => removeEditorRow(value, rowId)),
    setRowUnitPrice: (rowId, unitPrice) => editSelected((value) => patchEditorRow(value, rowId, { unitPrice: Math.max(0, unitPrice) })),
    setRowPer: (rowId, per) => editSelected((value) => patchEditorRow(value, rowId, { per })),
    setRowQuantity: (rowId, quantity) => editSelected((value) => patchEditorRow(value, rowId, { quantity: Math.max(1, Math.trunc(quantity) || 1) })),
    setRowGroup: (rowId, groupId) => editSelected((value) => patchEditorRow(value, rowId, { groupId })),
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
    discard: () => { if (readModel) applyReadModel(readModel); setSelectedKey(null); },
  }), [
    hostServiceId, list, selected, selectedKey, readModel, sheets, deletions, units, dirty, saving, saveError,
    catalog, catalogLoading, catalogError, loadCatalog, editSelected, persist, applyReadModel,
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
