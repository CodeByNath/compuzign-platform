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
 *
 * `service: null` — the Settings lane's Create Service launcher — addresses no
 * backing post yet. This station represents that state entirely with its own
 * local Overview draft (below), never a fabricated ServiceItem: the shared
 * resolveOverviewStatus/getOverviewNotes resolvers are hard-typed to a real
 * ServiceItem and are simply not called until one exists, mirroring their own
 * branches locally against the draft alone (see './derive'). Every id-bearing
 * action below is a no-op while `service` is null; the drawer's Save/Publish
 * flow only ever routes there once createService has returned the real id.
 */

import { useEffect, useState, useCallback } from 'preact/hooks';
import type { ServiceItem, ServiceInclusion, ServiceFaq, PlatformStatus } from '@/api/types/cost-builder';
import {
  archiveService,
  createService as createServiceApi,
  disableService,
  enableService,
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
import type { NoteContext, ModuleState, ModuleNote } from '@/drawer-kit/utils/moduleNotifications';
import { patchModuleDraft } from '@/hooks/stationPrimitives';
import {
  resolveInclusionsStatus,
  resolveFaqsStatus,
  derivePendingModules,
  derivePendingOverviewComplete,
  derivePendingOverviewStatus,
  derivePendingOverviewNotes,
  deriveCanPublish,
  derivePackageSummary,
  deriveInclusionsSummary,
  deriveFaqsSummary,
} from './derive';

// ── Result types ───────────────────────────────────────────────────────────────

export interface ToggleActiveResult {
  platform_status:           string;
  previous_platform_status:  string;
  module_status:             Record<string, string>;
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

const EMPTY_OVERVIEW_DRAFT: OverviewDraft = { title: '', excerpt: '', content: '', category_id: null };

// ── ServiceStation interface ───────────────────────────────────────────────────

export interface ServiceStation {
  // ── Identity ──────────────────────────────────────────────────────────────
  platformStatus: string;
  isActive:       boolean;
  // True once the authoritative service detail fetch has resolved (success or
  // failure). While false, module pills should show a neutral loading placeholder
  // instead of a status derived from the minimal catalog handoff. A pending
  // (no backing post) Service has nothing to fetch and reads true immediately.
  detailLoaded:   boolean;
  // No backing post yet — Settings' Create Service launcher, before Publish.
  isNew:          boolean;

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
  // The pending record's one authoritative creation. Persists the drafted
  // Overview (staged locally by saveOverview above) as a brand-new Service and
  // returns it; the caller (the drawer controller) replaces its local `null`
  // identity with the result so the SAME mounted composition continues as an
  // ordinary persisted Service from here — mirrors createFamily/createCategory.
  createService:         () => Promise<ServiceItem | null>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useServiceStation(
  service:    ServiceItem | null,
  packages:   SurfacePackageSummary[],
  onRefresh?: () => void,
): ServiceStation {
  const isNew = service === null;

  const [adminDetail, setAdminDetail] = useState<ServiceDetail | null>(null);
  const [detailLoaded, setDetailLoaded] = useState(() => isNew);
  const [statusSaving, setStatusSaving] = useState(false);
  const [creatingPkg,  setCreatingPkg]  = useState(false);

  // The pending Overview draft — the only module a not-yet-created Service can
  // edit. Inclusions/FAQs stay empty pools until the record exists, the same
  // scope Package Family's `'new'` sentinel restricts creation to (Overview
  // only; capabilities/relationships start empty).
  const [pendingOverview, setPendingOverview] = useState<OverviewDraft>(EMPTY_OVERVIEW_DRAFT);
  const [pendingModuleStatus, setPendingModuleStatus] = useState<'not-configured' | 'pending'>('not-configured');

  useEffect(() => {
    if (!service) return;
    setDetailLoaded(false);
    fetchAdminServiceDetail(service.id)
      .then(setAdminDetail)
      .catch(() => {}) // non-fatal — falls back to CostBuilder data
      // Resolved (success or failure): authoritative detail attempt is done, so module
      // pills may stop showing the loading placeholder.
      .finally(() => setDetailLoaded(true));
  }, [service?.id]);

  // ── Derived: identity ──────────────────────────────────────────────────────
  const platformStatus = service?.meta?.platform_status ?? 'disabled';
  const isActive        = platformStatus === 'active';

  // The Disable action's platform-visible mask: non-empty previous_platform_status
  // while platform_status is 'disabled' means an explicit Disable applied (as
  // opposed to a Service that is 'disabled' only because it has never been
  // published). Never inferred — this is exactly what ServiceController's
  // updateDisabledMask captures and Enable clears. adminDetail is authoritative
  // once loaded; service.meta is the pre-fetch/create-time fallback.
  const previousPlatformStatus = adminDetail?.previous_platform_status ?? service?.meta?.previous_platform_status ?? '';
  const isDisabledMasked = platformStatus === 'disabled' && previousPlatformStatus !== '';

  // ── Derived: module data (draft-preferred) ─────────────────────────────────
  // Read priority: draft → authoritative settled pool (adminDetail) → passed-in
  // CostBuilder service → empty. adminDetail.inclusions/faqs is the canonical
  // service-owned pool (cz_service_inclusions / cz_service_faqs) returned by the
  // drawer's own fetch; the passed-in ServiceItem can be stale/empty for migrated
  // services, so it must not shadow the settled pool. A pending Service has no
  // pool yet — both stay empty until creation.
  const inclusions = (adminDetail?.drafts.inclusions ?? adminDetail?.inclusions ?? service?.inclusions ?? []) as ServiceInclusionItem[];
  const faqs       = (adminDetail?.drafts.faqs       ?? adminDetail?.faqs       ?? service?.faqs       ?? []) as ServiceFaqItem[];

  // ── Derived: module registry ───────────────────────────────────────────────
  // adminDetail.module_status is authoritative (loaded on drawer open).
  // Falls back to CostBuilder data while the fetch is in flight. A pending
  // Service has no adminDetail/service meta at all — its module registry is
  // entirely local (Overview only ever advances from 'not-configured').
  const moduleStatus = isNew
    ? { overview: pendingModuleStatus, inclusions: 'not-configured', faqs: 'not-configured' }
    : ((adminDetail?.module_status ?? service?.meta?.module_status) as Record<string, string> | undefined);
  const { hasPendingModules, pendingModuleNames } = derivePendingModules(moduleStatus, isActive);

  // ── Derived: package registry ──────────────────────────────────────────────
  // No package can reference an id that does not exist yet.
  const relatedPkg = service ? (packages.find((p) => p.service_refs.includes(service.id)) ?? null) : null;

  // ── Derived: module status resolvers ──────────────────────────────────────
  // Authoritative settled overview source: prefer adminDetail's settled fields
  // (refreshed on settle/publish below) over the passed-in CostBuilder service,
  // which can be stale/incomplete for migrated services. A draft still wins inside
  // resolveOverviewStatus / getOverviewNotes. Read order: draft → adminDetail → service.
  const overviewDraft: OverviewDraftData | null = isNew
    ? {
        title:        pendingOverview.title,
        excerpt:      pendingOverview.excerpt,
        content:      pendingOverview.content,
        category_ids: pendingOverview.category_id !== null ? [pendingOverview.category_id] : [],
      }
    : (adminDetail?.drafts.overview ?? null);

  const noteCtxOverview: NoteContext = {
    platformStatus,
    moduleTransition: moduleStatus?.overview   ?? 'not-configured',
    hasDraft:         overviewDraft !== null,
    disabled:         isDisabledMasked,
    platformLabel:    'Service',
  };
  const noteCtxInclusions: NoteContext = {
    platformStatus,
    moduleTransition: moduleStatus?.inclusions ?? 'not-configured',
    hasDraft:         adminDetail?.drafts.inclusions != null,
    disabled:         isDisabledMasked,
    platformLabel:    'Service',
  };
  const noteCtxFaqs: NoteContext = {
    platformStatus,
    moduleTransition: moduleStatus?.faqs ?? 'not-configured',
    hasDraft:         adminDetail?.drafts.faqs != null,
    disabled:         isDisabledMasked,
    platformLabel:    'Service',
  };

  // Overview status/notes: resolveOverviewStatus/getOverviewNotes are hard-typed
  // to a real ServiceItem, so a pending record (no ServiceItem to give them)
  // resolves through the local, ServiceItem-free equivalent in './derive'
  // instead of fabricating one.
  let overviewStatus: string;
  let overviewNotes: ModuleNote[];
  if (service) {
    const overviewSource: ServiceItem = adminDetail
      ? { ...service, title: adminDetail.title, excerpt: adminDetail.excerpt, content: adminDetail.content, categories: adminDetail.categories }
      : service;
    overviewStatus = resolveOverviewStatus(overviewSource, {
      platformStatus,
      moduleTransition: moduleStatus?.overview ?? 'not-configured',
      disabled: isDisabledMasked,
    }, overviewDraft);
    overviewNotes = getOverviewNotes(overviewSource, noteCtxOverview, overviewDraft);
  } else {
    overviewStatus = derivePendingOverviewStatus(pendingOverview, pendingModuleStatus);
    overviewNotes  = derivePendingOverviewNotes(pendingOverview);
  }

  const inclusionsStatus = resolveInclusionsStatus(inclusions, moduleStatus?.inclusions ?? 'not-configured', isActive, isDisabledMasked);
  const faqsStatus       = resolveFaqsStatus(faqs, moduleStatus?.faqs ?? 'not-configured', isActive, isDisabledMasked);

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
  // Every action below that addresses an existing post is a no-op while
  // `service` is null: none of them are reachable from the pending drawer's
  // footer/dialogs (only Overview edits and createService are), and guarding
  // here keeps that invariant true even if a caller ever changes.

  // Disable/Enable — a platform-visible presentation mask, never Publish.
  // Disable never alters module_status (drafts/settlement stay exactly as they
  // are); Enable restores the record's prior platform_status and clears the
  // mask — it never settles a draft or activates unpublished content. See
  // ServiceController::updateDisabledMask for the backend half of this contract.
  const toggleActive = useCallback(async (): Promise<ToggleActiveResult | null> => {
    if (!service) return null;
    setStatusSaving(true);
    try {
      const result = isActive ? await disableService(service.id) : await enableService(service.id);
      if (result.success) {
        setAdminDetail(prev => prev ? {
          ...prev,
          platform_status:          result.service.platform_status,
          previous_platform_status: result.service.previous_platform_status,
          module_status:            result.service.module_status,
        } : prev);
        onRefresh?.();
        return {
          platform_status:           result.service.platform_status,
          previous_platform_status:  result.service.previous_platform_status,
          module_status:             result.service.module_status,
        };
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [service, isActive, onRefresh]);

  const archiveStation = useCallback(async (): Promise<ToggleActiveResult | null> => {
    if (!service) return null;
    setStatusSaving(true);
    try {
      const result = await archiveService(service.id);
      if (result.success) {
        onRefresh?.();
        return {
          platform_status:           result.service.platform_status,
          previous_platform_status:  result.service.previous_platform_status,
          module_status:             result.service.module_status,
        };
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [service, onRefresh]);

  const trashStation = useCallback(async (): Promise<ToggleActiveResult | null> => {
    if (!service) return null;
    setStatusSaving(true);
    try {
      const result = await trashService(service.id);
      if (result.success) {
        onRefresh?.();
        return {
          platform_status:           result.service.platform_status,
          previous_platform_status:  result.service.previous_platform_status,
          module_status:             result.service.module_status,
        };
      }
      return null;
    } finally {
      setStatusSaving(false);
    }
  }, [service, onRefresh]);

  const settleModules = useCallback(async (): Promise<SettleModulesResult | null> => {
    if (!service) return null;
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
  }, [service, onRefresh]);

  const publishService = useCallback(async (): Promise<PublishServiceResult | null> => {
    if (!service) return null;
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
  }, [service, onRefresh]);

  // Module Save must not call the update endpoint against an id that does not
  // exist — while pending it only advances the local Overview draft, moving the
  // transition to 'pending' so the record footer's Publish gate (canPublish) can
  // read it as ready. The drawer footer's own Publish is the sole authoritative
  // write for this record, via `createService` below.
  const saveOverview = useCallback(async (draft: OverviewDraft): Promise<Record<string, string>> => {
    if (!service) {
      setPendingOverview(draft);
      const status = derivePendingOverviewComplete(draft) ? 'pending' : 'not-configured';
      setPendingModuleStatus(status);
      return { overview: status, inclusions: 'not-configured', faqs: 'not-configured' };
    }
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
  }, [service, onRefresh]);

  const saveInclusions = useCallback(async (draft: InclusionsDraft): Promise<Record<string, string>> => {
    if (!service) return { overview: pendingModuleStatus, inclusions: 'not-configured', faqs: 'not-configured' };
    const result = await updateServiceInclusions(service.id, { inclusions: draft.items });
    if (!result.success) throw new Error('Failed to save inclusions.');
    setAdminDetail(prev => prev ? patchModuleDraft(prev, 'inclusions', result.inclusions, result.module_status) : prev);
    onRefresh?.();
    return result.module_status;
  }, [service, onRefresh, pendingModuleStatus]);

  const saveFaqs = useCallback(async (draft: FaqsDraft): Promise<Record<string, string>> => {
    if (!service) return { overview: pendingModuleStatus, inclusions: 'not-configured', faqs: 'not-configured' };
    const result = await updateServiceFaqs(service.id, { faqs: draft.items });
    if (!result.success) throw new Error('Failed to save FAQs.');
    setAdminDetail(prev => prev ? patchModuleDraft(prev, 'faqs', result.faqs, result.module_status) : prev);
    onRefresh?.();
    return result.module_status;
  }, [service, onRefresh, pendingModuleStatus]);

  const revertOverview = useCallback(async (): Promise<void> => {
    if (!service) return;
    const result = await revertServiceModule(service.id, 'overview');
    if (result.success) {
      setAdminDetail(prev => prev ? patchModuleDraft(prev, 'overview', null, result.module_status) : prev);
      onRefresh?.();
    }
  }, [service, onRefresh]);

  const revertInclusions = useCallback(async (): Promise<void> => {
    if (!service) return;
    const result = await revertServiceModule(service.id, 'inclusions');
    if (result.success) {
      setAdminDetail(prev => prev ? patchModuleDraft(prev, 'inclusions', null, result.module_status) : prev);
      onRefresh?.();
    }
  }, [service, onRefresh]);

  const revertFaqs = useCallback(async (): Promise<void> => {
    if (!service) return;
    const result = await revertServiceModule(service.id, 'faqs');
    if (result.success) {
      setAdminDetail(prev => prev ? patchModuleDraft(prev, 'faqs', null, result.module_status) : prev);
      onRefresh?.();
    }
  }, [service, onRefresh]);

  // The pending record's one authoritative creation. Persists the drafted
  // Overview as a brand-new Service and returns the server-issued record —
  // the same "born disabled, overview pending" state as any other newly
  // created Service, so every existing lifecycle/footer computation applies
  // unchanged from here (mirrors createFamily/createCategory).
  const createService = useCallback(async (): Promise<ServiceItem | null> => {
    setStatusSaving(true);
    try {
      const response = await createServiceApi({
        title:        pendingOverview.title,
        excerpt:      pendingOverview.excerpt,
        content:      pendingOverview.content,
        category_ids: pendingOverview.category_id !== null ? [pendingOverview.category_id] : [],
      });
      if (!response.success) throw new Error('Could not create the Service.');
      const created: ServiceItem = {
        id:           response.service.id,
        title:        response.service.title,
        slug:         response.service.slug,
        excerpt:      pendingOverview.excerpt,
        content:      pendingOverview.content,
        categories:   response.service.categories,
        inclusions:   [],
        faqs:         [],
        availability: { is_available: true, message: '' },
        meta: {
          platform_status:           response.service.platform_status as PlatformStatus,
          previous_platform_status:  (response.service.previous_platform_status ?? '') as '' | 'active' | 'disabled',
          module_status:             response.service.module_status as unknown as ServiceItem['meta']['module_status'],
          short_description: '',
          long_description:  '',
          billing_cycle:     '',
          sla:               '',
          uptime:            '',
          notes:             '',
          popular_tier:      null,
          popular_label:     null,
          sort_order:        0,
        },
        pricing: {
          tiers:  {} as ServiceItem['pricing']['tiers'],
          bundle: { title: '', description: '', price: null },
        },
        promotion_tiers: [],
      };
      // Seed adminDetail synchronously from the create response instead of
      // leaving it null until the follow-up fetchAdminServiceDetail resolves.
      // Every module save below reads/patches adminDetail through
      // `prev ? patchModuleDraft(prev, …) : prev` — while prev is null that
      // patch is a silent no-op, which is exactly the window between hand-off
      // and the async detail fetch. Seeding here closes that window: the very
      // first Overview/Inclusions/FAQ save after creation always has a real
      // adminDetail to patch, so its response is never dropped.
      setAdminDetail({
        success:                   true,
        id:                        created.id,
        title:                     created.title,
        excerpt:                   created.excerpt,
        content:                   created.content,
        categories:                response.service.categories,
        inclusions:                [],
        faqs:                      [],
        platform_status:           response.service.platform_status,
        previous_platform_status:  response.service.previous_platform_status ?? '',
        module_status:             response.service.module_status,
        drafts:                    response.drafts,
      });
      onRefresh?.();
      return created;
    } finally {
      setStatusSaving(false);
    }
  }, [pendingOverview, onRefresh]);

  return {
    platformStatus,
    isActive,
    detailLoaded,
    isNew,
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
    createService,
  };
}
