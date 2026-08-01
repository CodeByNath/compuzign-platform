import { useEffect, useState, useCallback } from 'preact/hooks';
import {
  createCategory as createCategoryApi,
  permanentDeleteCategory,
  restoreCategory,
  revertCategoryOverview,
  saveCategoryOverview,
  settleCategoryOverview,
  disableCategory,
  enableCategory,
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
  isDisabledMasked: boolean;
  // No backing term yet — Settings' Create Category launcher, before Overview
  // Save creates the persisted Pending term.
  isNew:          boolean;

  // ── Draft-preferred projection ────────────────────────────────────────────
  // `category` is the real record once one exists, and null while pending — no
  // fake numeric id stands in for it. `displayName`/`displayDescription`/
  // `displaySlug` are the draft-preferred values either state renders through,
  // so callers do not need to branch on `category` for ordinary display.
  category:           CategoryStationItem | null;
  displayName:        string;
  displayDescription: string;
  displaySlug:        string | null;
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
  category:       CategoryStationItem | null,
  onRefresh?:     () => void,
  serviceCounts?: CategoryServiceCounts,
): CategoryStation {
  // Local station state: seeded from the list projection, patched from mutation
  // responses (each returns the refreshed projection), re-synced when the
  // parent's refetch delivers a fresh prop. A pending (`category === null`)
  // seed never re-syncs — the host keeps resolving the stable `'new'` recordId
  // to `null` for the whole session, exactly like Package Family's `'new'`
  // sentinel never changes on the host side — so `created` transitions from
  // `null` to the real record exactly once, via Overview Save below, and stays
  // there regardless of how many more times the host re-offers `null`.
  const [created, setCreated] = useState<CategoryStationItem | null>(category);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The pending Overview draft is the only state before a complete Overview
  // Save creates the real Category. The returned response then becomes this
  // same mounted station's authoritative identity; the host's `'new'` sentinel
  // never needs to remount or fetch a replacement drawer.
  const [pendingDraft, setPendingDraft] = useState<CategoryOverviewDraft>({ name: '', description: '' });
  const [pendingModuleStatus, setPendingModuleStatus] = useState<'not-configured' | 'pending'>('not-configured');

  useEffect(() => {
    if (category !== null) setCreated(category);
  }, [category]);

  const isNew = created === null;

  // ── Derived: identity ──────────────────────────────────────────────────────
  const platformStatus = created?.platform_status ?? 'disabled';
  const isActive       = platformStatus === 'active';
  const isDisabledMasked = platformStatus === 'disabled'
    && (created?.previous_platform_status ?? '') !== '';

  const displayName        = created?.name ?? pendingDraft.name;
  const displayDescription = created?.description ?? pendingDraft.description;
  const displaySlug        = created?.slug ?? null;
  const moduleStatus        = created?.module_status ?? { overview: pendingModuleStatus };
  const hasDraft            = created?.has_draft ?? (pendingModuleStatus === 'pending');
  const assignedCount       = created?.assigned_count ?? 0;

  // ── Derived: module computed state ─────────────────────────────────────────
  const counts: CategoryServiceCounts = serviceCounts
    ?? { total: assignedCount, active: 0, disabled: 0 };

  const overviewCtx: NoteContext = {
    platformStatus,
    platformLabel:    'Category',
    moduleTransition: moduleStatus.overview,
    hasDraft,
    disabled:         isDisabledMasked,
  };
  // categoryOverviewModule takes plain { name, description, slug } data, not a
  // CategoryStationItem, so the pending and persisted paths both feed it the
  // same draft-preferred values unconditionally — no fabricated record needed.
  const overviewState = evaluateModule(categoryOverviewModule, {
    name:        displayName,
    description: displayDescription,
    slug:        displaySlug ?? '',
  }, overviewCtx);

  // The services gateway has no lifecycle of its own (pure projection, D4):
  // no moduleTransition, no draft — only the category's platform status.

  // Description is optional — publishing gates on the name only.
  const canPublish = !!displayName.trim();

  // ── Actions ────────────────────────────────────────────────────────────────
  // Every action below that addresses an existing term is unreachable until
  // Overview Save has supplied the returned persisted identity.

  const saveOverview = useCallback(async (draft: CategoryOverviewDraft): Promise<Record<string, string>> => {
    if (!created) {
      const response = await createCategoryApi({ name: draft.name, description: draft.description });
      if (!response.success) throw new Error(response.message ?? 'Could not create the Category.');
      // This is the pending-to-persisted hand-off: seed the returned record
      // before the controller re-renders. The mounted drawer keeps its modules,
      // notifications, and footer; no host identity change or loading state is
      // involved.
      setCreated(response.category);
      setPendingDraft(draft);
      setPendingModuleStatus('pending');
      onRefresh?.();
      return response.category.module_status;
    }
    const result = await saveCategoryOverview(created.id, draft);
    if (!result.success) throw new Error('Failed to save changes.');
    setCreated(prev => prev ? ({
      ...prev,
      name:          result.draft.name,
      description:   result.draft.description,
      has_draft:     true,
      module_status: result.module_status,
    }) : prev);
    onRefresh?.();
    return result.module_status;
  }, [created, onRefresh]);

  const revertOverview = useCallback(async (): Promise<void> => {
    if (!created) return;
    const result = await revertCategoryOverview(created.id);
    if (result.success) {
      setCreated(result.category);
      onRefresh?.();
    }
  }, [created, onRefresh]);

  const settleModules = useCallback(async (): Promise<CategoryStationItem | null> => {
    if (!created) return null;
    setStatusSaving(true);
    try {
      const result = await settleCategoryOverview(created.id);
      if (result.success) {
        setCreated(result.category);
        onRefresh?.();
        return result.category;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [created, onRefresh]);

  // Publish = settle + activate, mirroring publishService. Settling without a
  // draft is a harmless re-derivation backend-side.
  const publishCategory = useCallback(async (): Promise<CategoryStationItem | null> => {
    if (!created) return null;
    setStatusSaving(true);
    try {
      const settleResult = await settleCategoryOverview(created.id);
      let next = created;
      if (settleResult.success) {
        next = settleResult.category;
        setCreated(next);
      }
      const statusResult = await updateCategoryStatus(next.id, 'active');
      if (statusResult.success) {
        setCreated(statusResult.category);
        onRefresh?.();
        return statusResult.category;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [created, onRefresh]);

  const applyStatus = useCallback(async (
    target: 'active' | 'disabled' | 'archived' | 'trashed',
  ): Promise<CategoryStationItem | null> => {
    if (!created) return null;
    setStatusSaving(true);
    try {
      const result = await updateCategoryStatus(created.id, target);
      if (result.success) {
        setCreated(result.category);
        onRefresh?.();
        return result.category;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [created, onRefresh]);

  const toggleActive = useCallback(async (): Promise<CategoryStationItem | null> => {
    if (!created) return null;
    setStatusSaving(true);
    try {
      const result = isDisabledMasked
        ? await enableCategory(created.id)
        : await disableCategory(created.id);
      if (result.success) {
        setCreated(result.category);
        onRefresh?.();
        return result.category;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [created, isDisabledMasked, onRefresh]);
  const archiveStation = useCallback(() => applyStatus('archived'), [applyStatus]);
  const trashStation   = useCallback(() => applyStatus('trashed'), [applyStatus]);

  const restoreStation = useCallback(async (): Promise<CategoryStationItem | null> => {
    if (!created) return null;
    setStatusSaving(true);
    try {
      const result = await restoreCategory(created.id);
      if (result.success) {
        setCreated(result.category);
        onRefresh?.();
        return result.category;
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [created, onRefresh]);

  // Trashed-only + D6 guard. A guard failure surfaces as a thrown error
  // (HTTP 409, body { message, assigned_count }) for the caller's
  // inline-confirm error path — it is not swallowed here.
  const deleteStation = useCallback(async (): Promise<boolean> => {
    if (!created) return false;
    setDeleting(true);
    try {
      const result = await permanentDeleteCategory(created.id);
      if (result.success) {
        onRefresh?.();
        return true;
      }
      return false;
    } finally {
      setDeleting(false);
    }
  }, [created, onRefresh]);

  return {
    platformStatus,
    isActive,
    isDisabledMasked,
    isNew,
    category:      created,
    displayName,
    displayDescription,
    displaySlug,
    hasDraft,
    moduleStatus,
    assignedCount,
    serviceCounts: counts,
    modules: {
      overview: overviewState,
    },
    canPublish,
    loading: { status: statusSaving, deleting },
    saveOverview,
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
