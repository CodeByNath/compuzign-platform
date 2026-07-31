import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import {
  createCategory as createCategoryApi,
  disableCategory,
  enableCategory,
  permanentDeleteCategory,
  restoreCategory,
  revertCategoryOverview,
  saveCategoryOverview,
  settleCategoryOverview,
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
  // The Disable action's platform-visible mask (CategoryMeta.previous_platform_status,
  // non-empty while platformStatus is 'disabled'): true only for a Category an
  // explicit Disable applied and has not yet been Enabled. false covers both
  // "never published" and "Enabled — Pending, awaiting Publish".
  isDisabledMasked: boolean;
  // Has this Category's overview ever been settled (i.e. genuinely published
  // content exists), durable across a later edit that moves module_status.overview
  // back to 'pending'. See isNewNeverPublished/hasBeenPublished in
  // useCategoryDrawerController for why moduleStatus.overview === 'settled'
  // alone cannot answer this.
  hasSettledOverview: boolean;
  // No backing term yet — Settings' Create Category launcher, before Publish.
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
  // The pending record's one authoritative creation. Persists the drafted
  // Overview (staged locally by saveOverview above) as a brand-new Category
  // and returns the server-issued record — mirrors createFamily/createService.
  createCategory:  () => Promise<CategoryStationItem | null>;
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
  // `null` to the real record exactly once, via createCategory below, and stays
  // there regardless of how many more times the host re-offers `null`.
  const [created, setCreated] = useState<CategoryStationItem | null>(category);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The pending Overview draft — the only thing a not-yet-created Category can
  // hold. Group membership stays with the controller until creation (see
  // createCategory's groupId argument).
  const [pendingDraft, setPendingDraft] = useState<CategoryOverviewDraft>({ name: '', description: '' });
  const [pendingModuleStatus, setPendingModuleStatus] = useState<'not-configured' | 'pending'>('not-configured');

  useEffect(() => {
    if (category !== null) setCreated(category);
  }, [category]);

  const isNew = created === null;

  // ── Derived: identity ──────────────────────────────────────────────────────
  const platformStatus = created?.platform_status ?? 'disabled';
  const isActive       = platformStatus === 'active';

  // The Disable action's platform-visible mask: non-empty previous_platform_status
  // while platformStatus is 'disabled' means an explicit Disable applied (as
  // opposed to a Category that is 'disabled' only because it has never been
  // published, or because Enable just lifted the mask). Never inferred — this
  // is exactly what AdminCategoriesController's updateDisabledMask captures
  // and Enable clears. Mirrors useServiceStation's isDisabledMasked exactly.
  const previousPlatformStatus = created?.previous_platform_status ?? '';
  const isDisabledMasked = platformStatus === 'disabled' && previousPlatformStatus !== '';

  const displayName        = created?.name ?? pendingDraft.name;
  const displayDescription = created?.description ?? pendingDraft.description;
  const displaySlug        = created?.slug ?? null;
  const moduleStatus        = created?.module_status ?? { overview: pendingModuleStatus };
  const hasDraft            = created?.has_draft ?? (pendingModuleStatus === 'pending');
  const assignedCount       = created?.assigned_count ?? 0;

  // Durable "has ever been settled" signal: module_status.overview === 'settled'
  // alone regresses to false the moment a post-Enable (or any) edit is saved,
  // since saveOverview always marks it 'pending' again — a brand-new Category's
  // overview also starts 'pending' (createCategory always seeds it that way), so
  // that transition label never actually distinguished "genuinely new" from
  // "previously published, mid-edit". This ref latches true the first time this
  // session observes 'settled' and never resets — see useServiceStation's
  // seedDetailFromItem/settledOverview for the Service equivalent of this fix.
  const hasSettledOverviewRef = useRef(moduleStatus.overview === 'settled');
  if (moduleStatus.overview === 'settled') hasSettledOverviewRef.current = true;
  const hasSettledOverview = hasSettledOverviewRef.current;

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
  // Every action below that addresses an existing term is a no-op while
  // `created` is null: none of them are reachable from the pending drawer's
  // footer/dialogs (only Overview edits and createCategory are).

  const saveOverview = useCallback(async (draft: CategoryOverviewDraft): Promise<Record<string, string>> => {
    if (!created) {
      setPendingDraft(draft);
      const status = draft.name.trim() ? 'pending' : 'not-configured';
      setPendingModuleStatus(status);
      return { overview: status };
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

  // Disable/Enable — a platform-visible presentation mask, never Publish. See
  // AdminCategoriesController::updateDisabledMask; mirrors useServiceStation's
  // toggleActive exactly, including deciding disable vs enable by the mask
  // (isDisabledMasked), not by isActive — Enable applies only to a masked
  // Category; every other reachable state (active, or unmasked-Pending with
  // real settled content) calls Disable, so a Category Enable produces can
  // always be disabled again without first routing through Publish.
  const toggleActive = useCallback(async (): Promise<CategoryStationItem | null> => {
    if (!created) return null;
    setStatusSaving(true);
    try {
      const result = isDisabledMasked ? await enableCategory(created.id) : await disableCategory(created.id);
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

  // The pending record's one authoritative creation. Persists the drafted
  // Overview as a brand-new Category — the same "born disabled, overview
  // pending" state as any other newly created Category, so every existing
  // lifecycle/footer computation applies unchanged from here.
  const createCategory = useCallback(async (): Promise<CategoryStationItem | null> => {
    setStatusSaving(true);
    try {
      const response = await createCategoryApi({ name: pendingDraft.name, description: pendingDraft.description });
      if (!response.success) throw new Error(response.message ?? 'Could not create the Category.');
      setCreated(response.category);
      onRefresh?.();
      return response.category;
    } finally {
      setStatusSaving(false);
    }
  }, [pendingDraft, onRefresh]);

  return {
    platformStatus,
    isActive,
    isDisabledMasked,
    hasSettledOverview,
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
    createCategory,
  };
}
