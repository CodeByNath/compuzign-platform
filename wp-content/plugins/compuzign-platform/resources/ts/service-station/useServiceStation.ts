/*
 * Service Station — the Service drawer's state layer.
 *
 * This hook owns the stateful station concerns: the authoritative detail fetch,
 * draft-preferred reads, and the lifecycle/save/settle/revert actions. The pure
 * projections it composes per render (module status resolution for the two list
 * modules, pending-module registry, publish gating, the package summary card,
 * and the publish-modal summaries) live in the sibling './derive' module. The
 * public ServiceStation contract is unchanged by that split.
 *
 * Imports Service contracts and endpoints from its siblings ('./api',
 * './types', './derive'), never from the old admin API god modules.
 *
 * The OverviewDraft / InclusionsDraft / FaqsDraft types are part of this hook's
 * public save signatures, so the station owns them in './types' and the editors
 * import them back — the dependency runs UI → state, as intended.
 *
 * Shared, multi-entity infrastructure stays outside: stationPrimitives
 * (patchModuleDraft), moduleStatus, moduleNotifications. Service uses them; it
 * does not own them. The last two live in the neutral drawer-kit; they
 * import this station's './types' directly, never the barrel, so no cycle forms.
 */

import { useEffect, useState, useCallback } from 'preact/hooks';
import type { ServiceItem, ServiceInclusion, ServiceFaq } from '@/api/types/cost-builder';
import {
  archiveService,
  fetchAdminServiceDetail,
  revertServiceModule,
  settleAllServiceModules,
  trashService,
  updateServiceFaqs,
  updateServiceInclusions,
  updateServiceOverview,
  updateServiceStatus,
} from './api';
import type {
  ServiceDetail,
  OverviewDraftData,
  ServiceInclusionItem,
  ServiceFaqItem,
  OverviewDraft,
  InclusionsDraft,
  FaqsDraft,
} from './types';
import type { SurfacePackageSummary } from '@/package-station';
import { resolveOverviewStatus } from '@/drawer-kit/utils/moduleStatus';
import { getOverviewNotes, getInclusionsNotes, getFaqsNotes } from '@/drawer-kit/utils/moduleNotifications';
import type { NoteContext, ModuleState } from '@/drawer-kit/utils/moduleNotifications';
import { patchModuleDraft } from '@/hooks/stationPrimitives';
import {
  resolveInclusionsStatus,
  resolveFaqsStatus,
  derivePendingModules,
  deriveCanPublish,
  derivePackageSummary,
  deriveInclusionsSummary,
  deriveFaqsSummary,
} from './derive';

// ── Result types ───────────────────────────────────────────────────────────────

export interface ToggleActiveResult {
  platform_status: string;
  module_status:   Record<string, string>;
}

export interface SettleModulesResult {
  service:       { title: string; excerpt: string; content: string; categories: Array<{ id: number; name: string; slug: string }> };
  inclusions:    ServiceInclusionItem[];
  faqs:          ServiceFaqItem[];
  module_status: Record<string, string>;
}

export interface PublishServiceResult {
  platform_status: string;
  module_status:   Record<string, string>;
  settled:         boolean;
  service?:        { title: string; excerpt: string; content: string; categories: Array<{ id: number; name: string; slug: string }> };
  inclusions?:     ServiceInclusionItem[];
  faqs?:           ServiceFaqItem[];
}

// ── ServiceStation interface ───────────────────────────────────────────────────

export interface ServiceStation {
  // ── Identity ──────────────────────────────────────────────────────────────
  platformStatus: string;
  isActive:       boolean;
  // True once the authoritative service detail fetch has resolved (success or
  // failure). While false, module pills should show a neutral loading placeholder
  // instead of a status derived from the minimal catalog handoff.
  detailLoaded:   boolean;

  // ── Module data (draft-preferred) ─────────────────────────────────────────
  inclusions:    ServiceInclusionItem[];
  faqs:          ServiceFaqItem[];
  overviewDraft: OverviewDraftData | null;
  // Authoritative settled overview fields (from adminDetail), for the display
  // fallback chain: draft → settledOverview → passed CostBuilder service.
  settledOverview: { title: string; excerpt: string; content: string; categories: Array<{ id: number; name: string; slug: string }> } | null;

  // ── Module registry ────────────────────────────────────────────────────────
  moduleStatus:       Record<string, string> | undefined;
  hasPendingModules:  boolean;
  pendingModuleNames: string[];

  // ── Draft existence ────────────────────────────────────────────────────────
  // Overview draft existence is derivable from overviewDraft !== null.
  // Inclusions/FAQs return draft-preferred arrays with no way to tell origin;
  // these booleans are the only caller-visible indicator that a real draft exists.
  hasInclusionsDraft: boolean;
  hasFaqsDraft:       boolean;

  // ── Package registry ───────────────────────────────────────────────────────
  relatedPkg: SurfacePackageSummary | null;

  // ── Resolved module computed state ────────────────────────────────────────
  // Per-module lifecycle: full { status, notes } per module — the station
  // modules shape shared with usePackageStation / usePromotionStation (S4).
  modules: {
    overview:   ModuleState;
    inclusions: ModuleState;
    faqs:       ModuleState;
  };
  canPublish: boolean;

  // ── Surface layer ─────────────────────────────────────────────────────────
  pkgSummaryStatus:      string;
  pkgSummaryCount:       string;
  pkgSummaryDesc:        string;
  pkgSummaryDescPending: boolean;
  configuredTierCount:   number;

  // ── Publish modal summaries ────────────────────────────────────────────────
  inclSummary: { text: string; orange: boolean };
  faqsSummary: { text: string; orange: boolean };

  // ── Loading ────────────────────────────────────────────────────────────────
  loading: {
    status:   boolean;
    creating: boolean;
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  toggleActive:          () => Promise<ToggleActiveResult | null>;
  archiveStation:        () => Promise<ToggleActiveResult | null>;
  trashStation:          () => Promise<ToggleActiveResult | null>;
  settleModules:         () => Promise<SettleModulesResult | null>;
  publishService:        () => Promise<PublishServiceResult | null>;
  saveOverview:          (draft: OverviewDraft)   => Promise<Record<string, string>>;
  saveInclusions:        (draft: InclusionsDraft) => Promise<Record<string, string>>;
  saveFaqs:              (draft: FaqsDraft)       => Promise<Record<string, string>>;
  revertOverview:        () => Promise<void>;
  revertInclusions:      () => Promise<void>;
  revertFaqs:            () => Promise<void>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useServiceStation(
  service:    ServiceItem,
  packages:   SurfacePackageSummary[],
  onRefresh?: () => void,
): ServiceStation {
  const [adminDetail, setAdminDetail] = useState<ServiceDetail | null>(null);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [creatingPkg,  setCreatingPkg]  = useState(false);

  useEffect(() => {
    setDetailLoaded(false);
    fetchAdminServiceDetail(service.id)
      .then(setAdminDetail)
      .catch(() => {}) // non-fatal — falls back to CostBuilder data
      // Resolved (success or failure): authoritative detail attempt is done, so module
      // pills may stop showing the loading placeholder.
      .finally(() => setDetailLoaded(true));
  }, [service.id]);

  // ── Derived: identity ──────────────────────────────────────────────────────
  const platformStatus = service.meta?.platform_status ?? 'disabled';
  const isActive       = platformStatus === 'active';

  // ── Derived: module data (draft-preferred) ─────────────────────────────────
  // Read priority: draft → authoritative settled pool (adminDetail) → passed-in
  // CostBuilder service → empty. adminDetail.inclusions/faqs is the canonical
  // service-owned pool (cz_service_inclusions / cz_service_faqs) returned by the
  // drawer's own fetch; the passed-in ServiceItem can be stale/empty for migrated
  // services, so it must not shadow the settled pool.
  const inclusions = (adminDetail?.drafts.inclusions ?? adminDetail?.inclusions ?? service.inclusions ?? []) as ServiceInclusionItem[];
  const faqs       = (adminDetail?.drafts.faqs       ?? adminDetail?.faqs       ?? service.faqs       ?? []) as ServiceFaqItem[];

  // ── Derived: module registry ───────────────────────────────────────────────
  // adminDetail.module_status is authoritative (loaded on drawer open).
  // Falls back to CostBuilder data while the fetch is in flight.
  const moduleStatus = (adminDetail?.module_status ?? service.meta?.module_status) as Record<string, string> | undefined;
  const { hasPendingModules, pendingModuleNames } = derivePendingModules(moduleStatus, isActive);

  // ── Derived: package registry ──────────────────────────────────────────────
  const relatedPkg = packages.find((p) => p.service_refs.includes(service.id)) ?? null;

  // ── Derived: module status resolvers ──────────────────────────────────────
  const overviewDraft  = adminDetail?.drafts.overview ?? null;
  // Authoritative settled overview source: prefer adminDetail's settled fields
  // (refreshed on settle/publish below) over the passed-in CostBuilder service,
  // which can be stale/incomplete for migrated services. A draft still wins inside
  // resolveOverviewStatus / getOverviewNotes. Read order: draft → adminDetail → service.
  const overviewSource: ServiceItem = adminDetail
    ? { ...service, title: adminDetail.title, excerpt: adminDetail.excerpt, content: adminDetail.content, categories: adminDetail.categories }
    : service;
  const overviewStatus = resolveOverviewStatus(overviewSource, {
    platformStatus,
    moduleTransition: moduleStatus?.overview ?? 'not-configured',
  }, overviewDraft);

  const inclusionsStatus = resolveInclusionsStatus(inclusions, moduleStatus?.inclusions ?? 'not-configured', isActive);
  const faqsStatus       = resolveFaqsStatus(faqs, moduleStatus?.faqs ?? 'not-configured', isActive);

  // ── Derived: module notes ──────────────────────────────────────────────────
  const noteCtxOverview: NoteContext = {
    platformStatus,
    moduleTransition: moduleStatus?.overview   ?? 'not-configured',
    hasDraft:         overviewDraft !== null,
  };
  const noteCtxInclusions: NoteContext = {
    platformStatus,
    moduleTransition: moduleStatus?.inclusions ?? 'not-configured',
    hasDraft:         adminDetail?.drafts.inclusions != null,
  };
  const noteCtxFaqs: NoteContext = {
    platformStatus,
    moduleTransition: moduleStatus?.faqs ?? 'not-configured',
    hasDraft:         adminDetail?.drafts.faqs != null,
  };

  const overviewNotes   = getOverviewNotes(overviewSource, noteCtxOverview, overviewDraft);
  const inclusionsNotes = getInclusionsNotes(inclusions as unknown as ServiceInclusion[], noteCtxInclusions);
  const faqsNotes       = getFaqsNotes(faqs as unknown as ServiceFaq[], noteCtxFaqs);

  // ── Derived: can publish ───────────────────────────────────────────────────
  const hasContentDraft =
    adminDetail?.drafts.inclusions != null ||
    adminDetail?.drafts.faqs != null;

  const canPublish = deriveCanPublish({ overviewStatus, inclusionsStatus, faqsStatus, isActive, hasContentDraft });

  // ── Derived: surface layer + publish modal summaries (pure, in ./derive) ──
  const { configuredTierCount, pkgSummaryStatus, pkgSummaryCount, pkgSummaryDesc, pkgSummaryDescPending } =
    derivePackageSummary(relatedPkg, isActive);

  const inclSummary = deriveInclusionsSummary(inclusions, inclusionsStatus);
  const faqsSummary = deriveFaqsSummary(faqs, faqsStatus);

  // ── Actions ────────────────────────────────────────────────────────────────

  const toggleActive = useCallback(async (): Promise<ToggleActiveResult | null> => {
    setStatusSaving(true);
    const nextStatus = isActive ? 'disabled' : 'active';
    try {
      const result = await updateServiceStatus(service.id, { platform_status: nextStatus });
      if (result.success) {
        setAdminDetail(prev => prev ? { ...prev, module_status: result.service.module_status } : prev);
        onRefresh?.();
        return { platform_status: result.service.platform_status, module_status: result.service.module_status };
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [service.id, isActive, onRefresh]);

  const archiveStation = useCallback(async (): Promise<ToggleActiveResult | null> => {
    setStatusSaving(true);
    try {
      const result = await archiveService(service.id);
      if (result.success) {
        onRefresh?.();
        return { platform_status: result.service.platform_status, module_status: result.service.module_status };
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [service.id, onRefresh]);

  const trashStation = useCallback(async (): Promise<ToggleActiveResult | null> => {
    setStatusSaving(true);
    try {
      const result = await trashService(service.id);
      if (result.success) {
        onRefresh?.();
        return { platform_status: result.service.platform_status, module_status: result.service.module_status };
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [service.id, onRefresh]);

  const settleModules = useCallback(async (): Promise<SettleModulesResult | null> => {
    setStatusSaving(true);
    try {
      const result = await settleAllServiceModules(service.id);
      if (result.success) {
        setAdminDetail(prev => prev ? {
          ...prev,
          title:         result.service.title,
          excerpt:       result.service.excerpt,
          content:       result.service.content,
          categories:    result.service.categories,
          inclusions:    result.inclusions,
          faqs:          result.faqs,
          module_status: result.module_status,
          drafts: { overview: null, inclusions: null, faqs: null },
        } : prev);
        onRefresh?.();
        return {
          service:       result.service,
          inclusions:    result.inclusions,
          faqs:          result.faqs,
          module_status: result.module_status,
        };
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [service.id, onRefresh]);

  const publishService = useCallback(async (): Promise<PublishServiceResult | null> => {
    setStatusSaving(true);
    try {
      const settleResult = await settleAllServiceModules(service.id);
      if (settleResult.success) {
        setAdminDetail(prev => prev ? {
          ...prev,
          title:         settleResult.service.title,
          excerpt:       settleResult.service.excerpt,
          content:       settleResult.service.content,
          categories:    settleResult.service.categories,
          inclusions:    settleResult.inclusions,
          faqs:          settleResult.faqs,
          module_status: settleResult.module_status,
          drafts: { overview: null, inclusions: null, faqs: null },
        } : prev);
      }
      const statusResult = await updateServiceStatus(service.id, { platform_status: 'active' });
      if (statusResult.success) {
        onRefresh?.();
        return {
          platform_status: statusResult.service.platform_status,
          module_status:   statusResult.service.module_status,
          settled:         settleResult.success,
          service:         settleResult.success ? settleResult.service : undefined,
          inclusions:      settleResult.success ? settleResult.inclusions : undefined,
          faqs:            settleResult.success ? settleResult.faqs : undefined,
        };
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [service.id, onRefresh]);

  const saveOverview = useCallback(async (draft: OverviewDraft): Promise<Record<string, string>> => {
    const result = await updateServiceOverview(service.id, {
      title:        draft.title,
      excerpt:      draft.excerpt,
      content:      draft.content,
      category_ids: draft.category_id !== null ? [draft.category_id] : [],
    });
    if (!result.success) throw new Error('Failed to save changes.');
    setAdminDetail(prev => prev ? patchModuleDraft(prev, 'overview', result.draft, result.module_status) : prev);
    onRefresh?.();
    return result.module_status;
  }, [service.id, onRefresh]);

  const saveInclusions = useCallback(async (draft: InclusionsDraft): Promise<Record<string, string>> => {
    const result = await updateServiceInclusions(service.id, { inclusions: draft.items });
    if (!result.success) throw new Error('Failed to save inclusions.');
    setAdminDetail(prev => prev ? patchModuleDraft(prev, 'inclusions', result.inclusions, result.module_status) : prev);
    onRefresh?.();
    return result.module_status;
  }, [service.id, onRefresh]);

  const saveFaqs = useCallback(async (draft: FaqsDraft): Promise<Record<string, string>> => {
    const result = await updateServiceFaqs(service.id, { faqs: draft.items });
    if (!result.success) throw new Error('Failed to save FAQs.');
    setAdminDetail(prev => prev ? patchModuleDraft(prev, 'faqs', result.faqs, result.module_status) : prev);
    onRefresh?.();
    return result.module_status;
  }, [service.id, onRefresh]);

  const revertOverview = useCallback(async (): Promise<void> => {
    const result = await revertServiceModule(service.id, 'overview');
    if (result.success) {
      setAdminDetail(prev => prev ? patchModuleDraft(prev, 'overview', null, result.module_status) : prev);
      onRefresh?.();
    }
  }, [service.id, onRefresh]);

  const revertInclusions = useCallback(async (): Promise<void> => {
    const result = await revertServiceModule(service.id, 'inclusions');
    if (result.success) {
      setAdminDetail(prev => prev ? patchModuleDraft(prev, 'inclusions', null, result.module_status) : prev);
      onRefresh?.();
    }
  }, [service.id, onRefresh]);

  const revertFaqs = useCallback(async (): Promise<void> => {
    const result = await revertServiceModule(service.id, 'faqs');
    if (result.success) {
      setAdminDetail(prev => prev ? patchModuleDraft(prev, 'faqs', null, result.module_status) : prev);
      onRefresh?.();
    }
  }, [service.id, onRefresh]);

  return {
    platformStatus,
    isActive,
    detailLoaded,
    inclusions,
    faqs,
    overviewDraft,
    settledOverview: adminDetail
      ? { title: adminDetail.title, excerpt: adminDetail.excerpt, content: adminDetail.content, categories: adminDetail.categories }
      : null,
    moduleStatus,
    hasPendingModules,
    pendingModuleNames,
    hasInclusionsDraft: adminDetail?.drafts.inclusions != null,
    hasFaqsDraft:       adminDetail?.drafts.faqs != null,
    relatedPkg,
    modules: {
      overview:   { status: overviewStatus,   notes: overviewNotes },
      inclusions: { status: inclusionsStatus, notes: inclusionsNotes },
      faqs:       { status: faqsStatus,       notes: faqsNotes },
    },
    canPublish,
    pkgSummaryStatus,
    pkgSummaryCount,
    pkgSummaryDesc,
    pkgSummaryDescPending,
    configuredTierCount,
    inclSummary,
    faqsSummary,
    loading: { status: statusSaving, creating: creatingPkg },
    toggleActive,
    archiveStation,
    trashStation,
    settleModules,
    publishService,
    saveOverview,
    saveInclusions,
    saveFaqs,
    revertOverview,
    revertInclusions,
    revertFaqs,
  };
}
