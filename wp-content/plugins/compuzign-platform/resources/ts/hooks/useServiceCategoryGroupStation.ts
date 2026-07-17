import { useEffect, useState, useCallback } from 'preact/hooks';
import {
  permanentDeleteServiceCategoryGroup,
  restoreServiceCategoryGroup,
  revertServiceCategoryGroupOverview,
  saveServiceCategoryGroupOverview,
  settleServiceCategoryGroupOverview,
  updateServiceCategoryGroupStatus,
} from '@/api/endpoints/admin';
import type { ServiceCategoryGroupOverviewDraft, ServiceCategoryGroupStationItem } from '@/api/types/admin';
import { serviceCategoryGroupOverviewModule, evaluateModule } from '@/components/admin/utils/moduleNotifications';
import type { ModuleState, NoteContext } from '@/components/admin/utils/moduleNotifications';

// ── Types ──────────────────────────────────────────────────────────────────────
// Structural clone of useCategoryStation.ts, one level up: the "services"
// gateway counts become "categories" gateway counts (child category terms, not
// assigned services). Everything else — draft-preferred projection, modules
// shape, action naming, loading flags — mirrors the Category station hook
// exactly, per the Category Group audit's locked "same everywhere" precedent.

// Child-category counts feeding the categories gateway module. The list
// projection only carries the total (assigned_count); the active/inactive
// split comes from catalog data the hosting surface already holds, so the
// surface supplies it — same contract as CategoryServiceCounts.
export interface ServiceCategoryGroupCategoryCounts {
  total:    number;
  active:   number;
  disabled: number;
}

export interface ServiceCategoryGroupStation {
  // ── Identity ──────────────────────────────────────────────────────────────
  platformStatus: string;
  isActive:       boolean;

  // ── Draft-preferred projection ────────────────────────────────────────────
  // The station's current view of the group: name/description show the draft
  // when one exists (server-merged; refreshed locally after mutations).
  group:          ServiceCategoryGroupStationItem;
  hasDraft:       boolean;
  moduleStatus:   { overview: string };
  assignedCount:  number;
  categoryCounts: ServiceCategoryGroupCategoryCounts;

  // ── Resolved module computed state ────────────────────────────────────────
  // The station modules shape shared with useServiceStation / useCategoryStation.
  modules: {
    overview:   ModuleState;
  };
  canPublish: boolean;

  // ── Loading ────────────────────────────────────────────────────────────────
  loading: {
    status:   boolean;
    deleting: boolean;
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  saveOverview:        (draft: ServiceCategoryGroupOverviewDraft) => Promise<Record<string, string>>;
  revertOverview:      () => Promise<void>;
  settleModules:       () => Promise<ServiceCategoryGroupStationItem | null>;
  publishServiceCategoryGroup: () => Promise<ServiceCategoryGroupStationItem | null>;
  toggleActive:        () => Promise<ServiceCategoryGroupStationItem | null>;
  archiveStation:      () => Promise<ServiceCategoryGroupStationItem | null>;
  trashStation:        () => Promise<ServiceCategoryGroupStationItem | null>;
  restoreStation:      () => Promise<ServiceCategoryGroupStationItem | null>;
  deleteStation:       () => Promise<boolean>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useServiceCategoryGroupStation(
  group:          ServiceCategoryGroupStationItem,
  onRefresh?:     () => void,
  categoryCounts?: ServiceCategoryGroupCategoryCounts,
): ServiceCategoryGroupStation {
  // Local station state: seeded from the list projection, patched from mutation
  // responses (each returns the refreshed projection), re-synced when the
  // parent's refetch delivers a fresh prop. No detail fetch exists — the list
  // projection is complete (unlike the service station's drawer-open fetch).
  const [station, setStation] = useState<ServiceCategoryGroupStationItem>(group);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setStation(group);
  }, [group]);

  // ── Derived: identity ──────────────────────────────────────────────────────
  const platformStatus = station.platform_status;
  const isActive        = platformStatus === 'active';

  // ── Derived: module computed state ─────────────────────────────────────────
  const counts: ServiceCategoryGroupCategoryCounts = categoryCounts
    ?? { total: station.assigned_count, active: 0, disabled: 0 };

  const overviewCtx: NoteContext = {
    platformStatus,
    moduleTransition: station.module_status.overview,
    hasDraft:         station.has_draft,
  };
  const overviewState = evaluateModule(serviceCategoryGroupOverviewModule, {
    name:        station.name,
    description: station.description,
    slug:        station.slug,
  }, overviewCtx);

  // The categories gateway has no lifecycle of its own (pure projection, D4
  // precedent): no moduleTransition, no draft — only the group's platform status.

  // Description is optional — publishing gates on the name only.
  const canPublish = !!station.name.trim();

  // ── Actions ────────────────────────────────────────────────────────────────

  const saveOverview = useCallback(async (draft: ServiceCategoryGroupOverviewDraft): Promise<Record<string, string>> => {
    const result = await saveServiceCategoryGroupOverview(station.id, draft);
    if (!result.success) throw new Error('Failed to save changes.');
    setStation(prev => ({
      ...prev,
      name:          result.draft.name,
      description:   result.draft.description,
      has_draft:     true,
      module_status: result.module_status,
    }));
    onRefresh?.();
    return result.module_status;
  }, [station.id, onRefresh]);

  const revertOverview = useCallback(async (): Promise<void> => {
    const result = await revertServiceCategoryGroupOverview(station.id);
    if (result.success) {
      setStation(result.group);
      onRefresh?.();
    }
  }, [station.id, onRefresh]);

  const settleModules = useCallback(async (): Promise<ServiceCategoryGroupStationItem | null> => {
    setStatusSaving(true);
    try {
      const result = await settleServiceCategoryGroupOverview(station.id);
      if (result.success) {
        setStation(result.group);
        onRefresh?.();
        return result.group;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [station.id, onRefresh]);

  // Publish = settle + activate, mirroring publishCategory. Settling without a
  // draft is a harmless re-derivation backend-side.
  const publishServiceCategoryGroup = useCallback(async (): Promise<ServiceCategoryGroupStationItem | null> => {
    setStatusSaving(true);
    try {
      const settleResult = await settleServiceCategoryGroupOverview(station.id);
      if (settleResult.success) {
        setStation(settleResult.group);
      }
      const statusResult = await updateServiceCategoryGroupStatus(station.id, 'active');
      if (statusResult.success) {
        setStation(statusResult.group);
        onRefresh?.();
        return statusResult.group;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [station.id, onRefresh]);

  const applyStatus = useCallback(async (
    target: 'active' | 'disabled' | 'archived' | 'trashed',
  ): Promise<ServiceCategoryGroupStationItem | null> => {
    setStatusSaving(true);
    try {
      const result = await updateServiceCategoryGroupStatus(station.id, target);
      if (result.success) {
        setStation(result.group);
        onRefresh?.();
        return result.group;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [station.id, onRefresh]);

  const toggleActive   = useCallback(() => applyStatus(isActive ? 'disabled' : 'active'), [applyStatus, isActive]);
  const archiveStation = useCallback(() => applyStatus('archived'), [applyStatus]);
  const trashStation   = useCallback(() => applyStatus('trashed'), [applyStatus]);

  const restoreStation = useCallback(async (): Promise<ServiceCategoryGroupStationItem | null> => {
    setStatusSaving(true);
    try {
      const result = await restoreServiceCategoryGroup(station.id);
      if (result.success) {
        setStation(result.group);
        onRefresh?.();
        return result.group;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [station.id, onRefresh]);

  // Trashed-only + child-category guard. A guard failure surfaces as a thrown
  // error (HTTP 409, body { message, assigned_count }) for the caller's
  // inline-confirm error path — it is not swallowed here.
  const deleteStation = useCallback(async (): Promise<boolean> => {
    setDeleting(true);
    try {
      const result = await permanentDeleteServiceCategoryGroup(station.id);
      if (result.success) {
        onRefresh?.();
        return true;
      }
      return false;
    } finally {
      setDeleting(false);
    }
  }, [station.id, onRefresh]);

  return {
    platformStatus,
    isActive,
    group:          station,
    hasDraft:       station.has_draft,
    moduleStatus:   station.module_status,
    assignedCount:  station.assigned_count,
    categoryCounts: counts,
    modules: {
      overview:   overviewState,
    },
    canPublish,
    loading: { status: statusSaving, deleting },
    saveOverview,
    revertOverview,
    settleModules,
    publishServiceCategoryGroup,
    toggleActive,
    archiveStation,
    trashStation,
    restoreStation,
    deleteStation,
  };
}
