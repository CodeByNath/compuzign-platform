import { useEffect, useState, useCallback } from 'preact/hooks';
import {
  permanentDeleteCategory,
  restoreCategory,
  revertCategoryOverview,
  saveCategoryOverview,
  settleCategoryOverview,
  updateServiceCategoryGroup,
  updateCategoryStatus,
} from '@/api/endpoints/admin';
import type { CategoryOverviewDraft, CategoryStationItem } from '@/api/types/admin';
import { categoryOverviewModule, evaluateModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ModuleState, NoteContext } from '@/drawer-kit/utils/moduleNotifications';

// ── Types ──────────────────────────────────────────────────────────────────────

// Assigned-service counts feeding the services gateway module (D4). The list
// projection only carries the total (assigned_count); the active/inactive split
// comes from catalog data the hosting surface already holds, so the surface
// supplies it. Absent → total-only fallback (state is unaffected: the module's
// status reads only `total`; the split feeds display copy).
export interface CategoryServiceCounts {
  total:    number;
  active:   number;
  disabled: number;
}

export interface CategoryStation {
  // ── Identity ──────────────────────────────────────────────────────────────
  platformStatus: string;
  isActive:       boolean;

  // ── Draft-preferred projection ────────────────────────────────────────────
  // The station's current view of the category: name/description show the
  // draft when one exists (server-merged; refreshed locally after mutations).
  category:      CategoryStationItem;
  hasDraft:      boolean;
  moduleStatus:  { overview: string };
  assignedCount: number;
  serviceCounts: CategoryServiceCounts;

  // ── Resolved module computed state ────────────────────────────────────────
  // The station modules shape shared with useServiceStation / usePromotionStation.
  modules: {
    overview: ModuleState;
  };
  canPublish: boolean;

  // ── Loading ────────────────────────────────────────────────────────────────
  loading: {
    status:   boolean;
    deleting: boolean;
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  saveOverview:    (draft: CategoryOverviewDraft) => Promise<Record<string, string>>;
  updateGroupMembership: (groupId: number | null) => Promise<CategoryStationItem | null>;
  revertOverview:  () => Promise<void>;
  settleModules:   () => Promise<CategoryStationItem | null>;
  publishCategory: () => Promise<CategoryStationItem | null>;
  toggleActive:    () => Promise<CategoryStationItem | null>;
  archiveStation:  () => Promise<CategoryStationItem | null>;
  trashStation:    () => Promise<CategoryStationItem | null>;
  restoreStation:  () => Promise<CategoryStationItem | null>;
  deleteStation:   () => Promise<boolean>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useCategoryStation(
  category:       CategoryStationItem,
  onRefresh?:     () => void,
  serviceCounts?: CategoryServiceCounts,
): CategoryStation {
  // Local station state: seeded from the list projection, patched from mutation
  // responses (each returns the refreshed projection), re-synced when the
  // parent's refetch delivers a fresh prop. No detail fetch exists — the list
  // projection is complete (unlike the service station's drawer-open fetch).
  const [station, setStation] = useState<CategoryStationItem>(category);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setStation(category);
  }, [category]);

  // ── Derived: identity ──────────────────────────────────────────────────────
  const platformStatus = station.platform_status;
  const isActive       = platformStatus === 'active';

  // ── Derived: module computed state ─────────────────────────────────────────
  const counts: CategoryServiceCounts = serviceCounts
    ?? { total: station.assigned_count, active: 0, disabled: 0 };

  const overviewCtx: NoteContext = {
    platformStatus,
    platformLabel:    'Category',
    moduleTransition: station.module_status.overview,
    hasDraft:         station.has_draft,
  };
  const overviewState = evaluateModule(categoryOverviewModule, {
    name:        station.name,
    description: station.description,
    slug:        station.slug,
  }, overviewCtx);

  // The services gateway has no lifecycle of its own (pure projection, D4):
  // no moduleTransition, no draft — only the category's platform status.

  // Description is optional — publishing gates on the name only.
  const canPublish = !!station.name.trim();

  // ── Actions ────────────────────────────────────────────────────────────────

  const saveOverview = useCallback(async (draft: CategoryOverviewDraft): Promise<Record<string, string>> => {
    const result = await saveCategoryOverview(station.id, draft);
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

  const updateGroupMembership = useCallback(async (groupId: number | null): Promise<CategoryStationItem | null> => {
    const result = await updateServiceCategoryGroup(station.id, groupId);
    if (result.success) {
      setStation(result.category);
      onRefresh?.();
      return result.category;
    }
    return null;
  }, [station.id, onRefresh]);

  const revertOverview = useCallback(async (): Promise<void> => {
    const result = await revertCategoryOverview(station.id);
    if (result.success) {
      setStation(result.category);
      onRefresh?.();
    }
  }, [station.id, onRefresh]);

  const settleModules = useCallback(async (): Promise<CategoryStationItem | null> => {
    setStatusSaving(true);
    try {
      const result = await settleCategoryOverview(station.id);
      if (result.success) {
        setStation(result.category);
        onRefresh?.();
        return result.category;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [station.id, onRefresh]);

  // Publish = settle + activate, mirroring publishService. Settling without a
  // draft is a harmless re-derivation backend-side.
  const publishCategory = useCallback(async (): Promise<CategoryStationItem | null> => {
    setStatusSaving(true);
    try {
      const settleResult = await settleCategoryOverview(station.id);
      if (settleResult.success) {
        setStation(settleResult.category);
      }
      const statusResult = await updateCategoryStatus(station.id, 'active');
      if (statusResult.success) {
        setStation(statusResult.category);
        onRefresh?.();
        return statusResult.category;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [station.id, onRefresh]);

  const applyStatus = useCallback(async (
    target: 'active' | 'disabled' | 'archived' | 'trashed',
  ): Promise<CategoryStationItem | null> => {
    setStatusSaving(true);
    try {
      const result = await updateCategoryStatus(station.id, target);
      if (result.success) {
        setStation(result.category);
        onRefresh?.();
        return result.category;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [station.id, onRefresh]);

  const toggleActive   = useCallback(() => applyStatus(isActive ? 'disabled' : 'active'), [applyStatus, isActive]);
  const archiveStation = useCallback(() => applyStatus('archived'), [applyStatus]);
  const trashStation   = useCallback(() => applyStatus('trashed'), [applyStatus]);

  const restoreStation = useCallback(async (): Promise<CategoryStationItem | null> => {
    setStatusSaving(true);
    try {
      const result = await restoreCategory(station.id);
      if (result.success) {
        setStation(result.category);
        onRefresh?.();
        return result.category;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [station.id, onRefresh]);

  // Trashed-only + D6 guard. A guard failure surfaces as a thrown error
  // (HTTP 409, body { message, assigned_count }) for the caller's
  // inline-confirm error path — it is not swallowed here.
  const deleteStation = useCallback(async (): Promise<boolean> => {
    setDeleting(true);
    try {
      const result = await permanentDeleteCategory(station.id);
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
    category:      station,
    hasDraft:      station.has_draft,
    moduleStatus:  station.module_status,
    assignedCount: station.assigned_count,
    serviceCounts: counts,
    modules: {
      overview: overviewState,
    },
    canPublish,
    loading: { status: statusSaving, deleting },
    saveOverview,
    updateGroupMembership,
    revertOverview,
    settleModules,
    publishCategory,
    toggleActive,
    archiveStation,
    trashStation,
    restoreStation,
    deleteStation,
  };
}
