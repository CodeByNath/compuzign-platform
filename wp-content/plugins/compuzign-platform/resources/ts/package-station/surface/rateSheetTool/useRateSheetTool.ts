// Rate Sheet tool — the Package-owned read/edit/save controller and its data
// source.
//
// The Package Station's Rate Sheet authoring surface binds to this hook. It is
// the ONLY new state in the restoration: it reads the Package Manager through
// the surviving `fetchPackageStationManager` contract, holds the flat editor
// value the grid mutates, and commits through the surviving
// `savePackageStationManager` contract. It adds no endpoint, no storage, and no
// second identity — the pure mapping lives in ./rateSheetToolModel and the
// authoritative reconciliation stays in PackageManagerSchema.
//
// The Package Station is addressed by a host-Service id (there is no standalone
// manager route); `useHostService` supplies the same host the Tier workspace
// uses, so both surfaces describe the one `cz_package_station` record.
//
// It is registered as a data source that yields a SINGLE item — the controller.
// The registry has no save channel of its own, so the tool carries its read,
// its draft, and its save together as one cohesive controller the kit renders;
// the kit never touches api.ts.

import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { SurfaceCollection } from '@/station-manager/registry/dataSources';
import { fetchAdminCatalog } from '@/service-station';
import type { ServiceSummary } from '@/service-station';
import { fetchPackageStationManager, savePackageStationManager } from '../../api';
import { PACKAGE_RATE_SHEET_UNITS } from '../../types';
import type { PackageManagerReadModel, PackageRateSheetUnit } from '../../types';
import { useHostService } from '../tierSurface/useHostService';
import {
  EMPTY_RATE_SHEET_VALUE,
  buildManagerSavePayload,
  connectSourceServices,
  connectedServiceIds,
  createEditorGroup,
  deleteEditorGroup,
  patchEditorRow,
  rateSheetOptions,
  renameEditorGroup,
  toRateSheetEditorValue,
} from './rateSheetToolModel';
import type { RateSheetEditorValue, RateSheetOption } from './rateSheetToolModel';

export interface RateSheetToolController {
  hostServiceId:        number | null;
  configured:           boolean;
  value:                RateSheetEditorValue;
  options:              RateSheetOption[];
  units:                readonly PackageRateSheetUnit[];
  dirty:                boolean;
  saving:               boolean;
  saveError:            string | null;
  connectedServiceIds:  number[];
  // Source-Service picker.
  catalog:              ServiceSummary[];
  catalogLoading:       boolean;
  catalogError:         string | null;
  loadCatalog:          () => void;
  // Local edits (each marks the draft dirty; none persists until save).
  setTitle:             (title: string) => void;
  createGroup:          (label: string) => void;
  renameGroup:          (groupId: string, label: string) => void;
  deleteGroup:          (groupId: string) => void;
  setRowUnitPrice:      (rowId: string, unitPrice: number) => void;
  setRowPer:            (rowId: string, per: PackageRateSheetUnit) => void;
  setRowQuantity:       (rowId: string, quantity: number) => void;
  setRowGroup:          (rowId: string, groupId: string | null) => void;
  // Persisting actions (both commit through the Package Manager save contract).
  connectServices:      (serviceIds: number[]) => Promise<void>;
  save:                 () => Promise<void>;
  discard:              () => void;
}

/**
 * The registered data source. Yields the controller as its single item while
 * the host Service and Package Manager resolve; the kit renders it. Loading and
 * error mirror the underlying reads so the shell chrome behaves like every other
 * surface.
 */
export function useRateSheetTool(): SurfaceCollection<RateSheetToolController> {
  const host = useHostService();
  const hostServiceId = host.service?.id ?? null;

  const [readModel, setReadModel] = useState<PackageManagerReadModel | null>(null);
  const [value, setValue]         = useState<RateSheetEditorValue>(EMPTY_RATE_SHEET_VALUE);
  const [dirty, setDirty]         = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [catalog, setCatalog]             = useState<ServiceSummary[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError]   = useState<string | null>(null);

  const applyReadModel = useCallback((next: PackageManagerReadModel) => {
    setReadModel(next);
    setValue(toRateSheetEditorValue(next));
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
        if (!response.success) {
          setError('Could not load the Package Manager.');
          setReadModel(null);
          return;
        }
        applyReadModel(response.manager);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the Package Manager.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [hostServiceId, reloadToken, applyReadModel]);

  const edit = useCallback((next: RateSheetEditorValue) => {
    setValue(next);
    setDirty(true);
    setSaveError(null);
  }, []);

  const loadCatalog = useCallback(() => {
    setCatalogLoading(true);
    setCatalogError(null);
    fetchAdminCatalog()
      .then((response) => setCatalog(response.stations))
      .catch((err) => setCatalogError(err instanceof Error ? err.message : 'Could not load source Services.'))
      .finally(() => setCatalogLoading(false));
  }, []);

  const persist = useCallback(
    async (sources: PackageManagerReadModel['sources'], draft: RateSheetEditorValue) => {
      if (readModel == null || hostServiceId == null) return;
      setSaving(true);
      setSaveError(null);
      try {
        const response = await savePackageStationManager(
          hostServiceId,
          buildManagerSavePayload(readModel, draft, sources),
        );
        if (!response.success) {
          setSaveError(response.message || 'Could not save the Rate Sheet.');
          return;
        }
        applyReadModel(response.manager);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Could not save the Rate Sheet.');
      } finally {
        setSaving(false);
      }
    },
    [readModel, hostServiceId, applyReadModel],
  );

  const controller = useMemo<RateSheetToolController>(() => ({
    hostServiceId,
    configured: readModel?.rate_sheet != null,
    value,
    options: readModel ? rateSheetOptions(readModel) : [],
    units: PACKAGE_RATE_SHEET_UNITS,
    dirty,
    saving,
    saveError,
    connectedServiceIds: readModel ? connectedServiceIds(readModel.sources) : [],
    catalog,
    catalogLoading,
    catalogError,
    loadCatalog,
    setTitle: (title) => edit({ ...value, title }),
    createGroup: (label) => edit(createEditorGroup(value, label)),
    renameGroup: (groupId, label) => edit(renameEditorGroup(value, groupId, label)),
    deleteGroup: (groupId) => edit(deleteEditorGroup(value, groupId)),
    setRowUnitPrice: (rowId, unitPrice) => edit(patchEditorRow(value, rowId, { unitPrice: Math.max(0, unitPrice) })),
    setRowPer: (rowId, per) => edit(patchEditorRow(value, rowId, { per })),
    setRowQuantity: (rowId, quantity) => edit(patchEditorRow(value, rowId, { quantity: Math.max(1, Math.trunc(quantity) || 1) })),
    setRowGroup: (rowId, groupId) => edit(patchEditorRow(value, rowId, { groupId })),
    connectServices: async (serviceIds) => {
      if (readModel == null) return;
      // Onboarding of a connected Service's inclusions happens on the backend
      // only when a Rate Sheet exists — require a title first, matching the
      // retired editor's create-then-configure order.
      if (value.title.trim() === '' && value.items.length === 0 && value.groups.length === 0) {
        setSaveError('Enter a Rate Sheet title before adding source Services.');
        return;
      }
      await persist(connectSourceServices(readModel.sources, serviceIds), value);
    },
    save: async () => {
      if (readModel == null) return;
      await persist(readModel.sources, value);
    },
    discard: () => {
      if (readModel) applyReadModel(readModel);
    },
  }), [
    hostServiceId, readModel, value, dirty, saving, saveError,
    catalog, catalogLoading, catalogError, loadCatalog, edit, persist, applyReadModel,
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
