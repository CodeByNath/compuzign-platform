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
 * action below is a no-op while `service` is null; a complete Overview Save
 * creates the real id before child-module saves or Publish can route there.
 */

import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import type { Category, ServiceItem, ServiceInclusion, ServiceFaq, PlatformStatus } from '@/api/types/cost-builder';
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
  CreateServiceResponse,
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

// Same eager-seed the pending Overview Save hand-off relies on, applied to an
// ordinary existing-Service open: everything the passed-in
// ServiceItem already carries, projected into ServiceDetail's shape, with no
// drafts (the authoritative fetch is what can tell us a draft exists). This
// exists purely to give the mount-time detail fetch's in-flight window a real
// `adminDetail` to patch against — see the mount effect below.
function seedDetailFromItem(service: ServiceItem): ServiceDetail {
  return {
    success:                   true,
    id:                        service.id,
    title:                     service.title,
    excerpt:                   service.excerpt,
    content:                   service.content,
    categories:                service.categories
      .filter((c): c is Category & { id: number } => c.id !== null)
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description })),
    inclusions:                service.inclusions,
    faqs:                      service.faqs,
    platform_status:           service.meta.platform_status,
    previous_platform_status:  service.meta.previous_platform_status ?? '',
    module_status:             service.meta.module_status as unknown as Record<string, string>,
    drafts:                    { overview: null, inclusions: null, faqs: null },
  };
}

function buildCreatedPendingService(response: CreateServiceResponse): ServiceItem {
  const overview = response.drafts.overview;
  return {
    id:           response.service.id,
    title:        overview?.title ?? response.service.title,
    slug:         response.service.slug,
    excerpt:      overview?.excerpt ?? '',
    content:      overview?.content ?? '',
    categories:   response.service.categories,
    inclusions:   [],
    faqs:         [],
    availability: { is_available: true, message: '' },
    meta: {
      platform_status:           response.service.platform_status as PlatformStatus,
      previous_platform_status:  (response.service.previous_platform_status ?? '') as '' | 'active' | 'disabled',
      module_status:             response.service.module_status as unknown as ServiceItem['meta']['module_status'],
      short_description: '', long_description: '', billing_cycle: '', sla: '', uptime: '', notes: '',
      popular_tier: null, popular_label: null, sort_order: 0,
    },
    pricing: {
      tiers:  {} as ServiceItem['pricing']['tiers'],
      bundle: { title: '', description: '', price: null },
    },
    promotion_tiers: [],
  };
}

// ── ServiceStation interface ───────────────────────────────────────────────────

export interface ServiceStation {
  // ── Identity ──────────────────────────────────────────────────────────────
  platformStatus: string;
  isActive:       boolean;
  // The Disable action's platform-visible mask (ServiceMeta.previous_platform_status,
  // non-empty while platformStatus is 'disabled'): true only for a Service an
  // explicit Disable applied and has not yet been Enabled. false covers both
  // "never published" and "Enabled — Pending, awaiting Publish" — both read
  // and behave identically (editable, saveable, Disable-able, Publish-able).
  isDisabledMasked: boolean;
  // True once the authoritative service detail fetch has resolved (success or
  // failure). While false, module pills should show a neutral loading placeholder
  // instead of a status derived from the minimal catalog handoff. A pending
  // (no backing post) Service has nothing to fetch and reads true immediately.
  detailLoaded:   boolean;
  // No backing post yet — Settings' Create Service launcher, before Overview Save.
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
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useServiceStation(
  service:    ServiceItem | null,
  packages:   SurfacePackageSummary[],
  onRefresh?: () => void,
  onPendingServiceCreated?: (created: ServiceItem) => void,
): ServiceStation {
  const isNew = service === null;

  const [adminDetail, setAdminDetail] = useState<ServiceDetail | null>(() => service ? seedDetailFromItem(service) : null);
  const [detailLoaded, setDetailLoaded] = useState(() => isNew);
  const [statusSaving, setStatusSaving] = useState(false);
  const [creatingPkg,  setCreatingPkg]  = useState(false);

  // Set by every authoritative local mutation below (save/settle/publish/
  // toggle/archive/trash) to mark the mount effect's in-flight detail fetch
  // stale: once the client has applied a real response of its own, the
  // earlier-dispatched GET — if it resolves afterward — reflects a snapshot
  // that predates that mutation and must not clobber it. Reset per service id.
  const detailFetchStaleRef = useRef(false);
  // A pending Overview Save is different from an ordinary existing-record open:
  // it has already assembled draft detail before the drawer receives the newly
  // issued id. This one-shot marker lets the id-change
  // effect preserve that mounted hand-off without suppressing the normal
  // detail fetch for an existing Service whose minimal item was merely seeded.
  const pendingServiceHandoffIdRef = useRef<number | null>(null);
  const applyAdminDetail = useCallback((updater: (prev: ServiceDetail | null) => ServiceDetail | null) => {
    detailFetchStaleRef.current = true;
    setAdminDetail(updater);
  }, []);

  // The pending Overview draft — the only module a not-yet-created Service can
  // edit. Inclusions/FAQs stay empty pools until the record exists, the same
  // scope Package Family's `'new'` sentinel restricts creation to (Overview
  // only; capabilities/relationships start empty).
  const [pendingOverview, setPendingOverview] = useState<OverviewDraft>(EMPTY_OVERVIEW_DRAFT);
  const [pendingModuleStatus, setPendingModuleStatus] = useState<'not-configured' | 'pending'>('not-configured');

  useEffect(() => {
    if (!service) return;
    // A pending drawer's Overview Save has already created and seeded this
    // exact persisted Pending record and its Overview draft before it changes its
    // local identity. Keep that
    // detail mounted rather than treating
    // the identity hand-off as a fresh drawer open (which would disconnect
    // bindings behind a loading state until another GET completes).
    if (pendingServiceHandoffIdRef.current === service.id) {
      pendingServiceHandoffIdRef.current = null;
      setDetailLoaded(true);
      return;
    }
    setDetailLoaded(false);
    detailFetchStaleRef.current = false;
    // Seed adminDetail synchronously from the passed-in ServiceItem so a module
    // Save that lands before this GET resolves always has a real `adminDetail`
    // to patch (prev ? patch(prev, …) : prev is a no-op while prev is null) —
    // the same window pending Overview Save's eager seed closes for the draft
    // hand-off, closed here for the ordinary "open an existing Service" case.
    // A no-op when that Save already seeded it moments earlier.
    setAdminDetail(prev => prev ?? seedDetailFromItem(service));
    fetchAdminServiceDetail(service.id)
      .then((result) => {
        // A save/settle/publish/toggle already applied its own authoritative
        // response while this GET was in flight — that response is newer than
        // whatever this GET saw, so applying it now would revert the record to
        // a stale snapshot (dropped drafts, stale module_status/notifications).
        if (!detailFetchStaleRef.current) setAdminDetail(result);
      })
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

  // A record has to exist before Publish can settle and activate it. Overview
  // Save establishes that draft identity; Publish never creates one.
  const canPublish = !isNew && deriveCanPublish({ overviewStatus, inclusionsStatus, faqsStatus, isActive, hasContentDraft });

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
  // are); Enable never republishes on its own — it only clears the mask,
  // leaving the Service in the ordinary pending-review state so an admin
  // decides when to Publish. It never settles a draft or activates unpublished
  // content. See ServiceController::updateDisabledMask for the backend half.
  //
  // Which endpoint to call is decided by the mask, not by `isActive`: a masked
  // Service (isDisabledMasked) is the only state Enable applies to; every other
  // reachable state here — genuinely active, or unmasked-disabled/Pending with
  // real settled content (the state Enable itself lands on) — calls Disable.
  // Without this, a Pending Service produced by Enable could never be disabled
  // again without first routing through Publish, leaving it functionally stuck
  // offering only "Enable" — a no-op — from the footer.
  const toggleActive = useCallback(async (): Promise<ToggleActiveResult | null> => {
    if (!service) return null;
    setStatusSaving(true);
    try {
      const result = isDisabledMasked ? await enableService(service.id) : await disableService(service.id);
      if (result.success) {
        applyAdminDetail(prev => prev ? {
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
  }, [service, isDisabledMasked, onRefresh, applyAdminDetail]);

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
        applyAdminDetail(prev => prev ? {
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
  }, [service, onRefresh, applyAdminDetail]);

  const publishService = useCallback(async (): Promise<PublishServiceResult | null> => {
    if (!service) return null;
    setStatusSaving(true);
    try {
      const settleResult = await settleAllServiceModules(service.id);
      if (settleResult.success) {
        applyAdminDetail(prev => prev ? {
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
  }, [service, onRefresh, applyAdminDetail]);

  // A complete pending Overview Save establishes the real Pending Service record
  // with its Overview draft. Once
  // it has a server id, every later module save follows the ordinary Service
  // endpoint path and Publish remains only the settle-and-activate operation.
  const saveOverview = useCallback(async (draft: OverviewDraft): Promise<Record<string, string>> => {
    if (!service) {
      setPendingOverview(draft);
      const status = derivePendingOverviewComplete(draft) ? 'pending' : 'not-configured';
      setPendingModuleStatus(status);
      if (!derivePendingOverviewComplete(draft)) {
        return { overview: status, inclusions: 'not-configured', faqs: 'not-configured' };
      }

      const response = await createServiceApi({
        title:        draft.title,
        excerpt:      draft.excerpt,
        content:      draft.content,
        category_ids: draft.category_id !== null ? [draft.category_id] : [],
      });
      if (!response.success) throw new Error('Could not create the pending Service record.');

      const created = buildCreatedPendingService(response);
      pendingServiceHandoffIdRef.current = created.id;
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
      onPendingServiceCreated?.(created);
      return response.service.module_status;
    }
    const result = await updateServiceOverview(service.id, {
      title:        draft.title,
      excerpt:      draft.excerpt,
      content:      draft.content,
      category_ids: draft.category_id !== null ? [draft.category_id] : [],
    });
    if (!result.success) throw new Error('Failed to save changes.');
    applyAdminDetail(prev => prev ? patchModuleDraft(prev, 'overview', result.draft, result.module_status) : prev);
    onRefresh?.();
    return result.module_status;
  }, [service, onRefresh, onPendingServiceCreated, applyAdminDetail]);

  const saveInclusions = useCallback(async (draft: InclusionsDraft): Promise<Record<string, string>> => {
    if (!service) throw new Error('Save a complete Service Overview before saving inclusions.');
    if (draft.items.some((item) => !item.label.trim())) throw new Error('Each inclusion needs a label.');
    const result = await updateServiceInclusions(service.id, { inclusions: draft.items });
    if (!result.success) throw new Error('Failed to save inclusions.');
    applyAdminDetail(prev => prev ? patchModuleDraft(prev, 'inclusions', result.inclusions, result.module_status) : prev);
    onRefresh?.();
    return result.module_status;
  }, [service, onRefresh, applyAdminDetail]);

  const saveFaqs = useCallback(async (draft: FaqsDraft): Promise<Record<string, string>> => {
    if (!service) throw new Error('Save a complete Service Overview before saving FAQs.');
    if (draft.items.some((item) => !item.question.trim() || !item.answer.trim())) {
      throw new Error('Each FAQ needs a question and an answer.');
    }
    const result = await updateServiceFaqs(service.id, { faqs: draft.items });
    if (!result.success) throw new Error('Failed to save FAQs.');
    applyAdminDetail(prev => prev ? patchModuleDraft(prev, 'faqs', result.faqs, result.module_status) : prev);
    onRefresh?.();
    return result.module_status;
  }, [service, onRefresh, applyAdminDetail]);

  const revertOverview = useCallback(async (): Promise<void> => {
    if (!service) return;
    const result = await revertServiceModule(service.id, 'overview');
    if (result.success) {
      applyAdminDetail(prev => prev ? patchModuleDraft(prev, 'overview', null, result.module_status) : prev);
      onRefresh?.();
    }
  }, [service, onRefresh, applyAdminDetail]);

  const revertInclusions = useCallback(async (): Promise<void> => {
    if (!service) return;
    const result = await revertServiceModule(service.id, 'inclusions');
    if (result.success) {
      applyAdminDetail(prev => prev ? patchModuleDraft(prev, 'inclusions', null, result.module_status) : prev);
      onRefresh?.();
    }
  }, [service, onRefresh, applyAdminDetail]);

  const revertFaqs = useCallback(async (): Promise<void> => {
    if (!service) return;
    const result = await revertServiceModule(service.id, 'faqs');
    if (result.success) {
      applyAdminDetail(prev => prev ? patchModuleDraft(prev, 'faqs', null, result.module_status) : prev);
      onRefresh?.();
    }
  }, [service, onRefresh, applyAdminDetail]);

  return {
    platformStatus,
    isActive,
    isDisabledMasked,
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
  };
}
