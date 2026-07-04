import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  fetchServicePromotionStation,
  createServicePromotion,
  saveServicePromotion,
  archiveServicePromotion,
  reactivateServicePromotion,
  saveServicePromotionModule,
  settleServicePromotion,
  revertServicePromotionModule,
  publishServicePromotion,
  toggleServicePromotion,
  trashServicePromotion,
  restoreServicePromotion,
  permanentDeleteServicePromotion,
  createServiceInclusionPoolItem,
  createServiceFaqPoolItem,
} from '@/api/endpoints/admin';
import type {
  ServicePromotionStationResponse,
  ServicePromotionSaveResponse,
  PromotionTier,
  PromotionTierPayload,
  PromotionStatus,
  PromotionModuleKey,
  PromotionDrafts,
  PromotionOverviewDraft,
  PromotionLifecycleResponse,
  PromotionTransitionResponse,
  InclusionItem,
  FaqItem,
} from '@/api/types/admin';
import {
  evaluateModule,
  promotionOverviewModule,
  promotionFeaturesModule,
  promotionFaqsModule,
} from '@/components/admin/utils/moduleNotifications';
import type { ModuleState } from '@/components/admin/utils/moduleNotifications';
import { patchInstanceModuleDraft } from './stationPrimitives';

// ── usePromotionStation ──────────────────────────────────────────────────────
//
// Sibling station hook to usePackageStation. Since engine C1–C3 the Promotion
// Station is a list of travelling instances, each carrying the lifecycle layer
// (drafts + module_status, exposed flat by the read; travel status on the
// instance's status field). This hook applies the station pattern — single-
// source load, draft-preferred derive, per-module persist-through + patch,
// settle, engine transitions — via the shared primitives
// (patchInstanceModuleDraft → patchModuleDraft).
//
// C4: the lifecycle members land here unused; ServicePromotionStep still runs
// on the whole-record createPromotion/savePromotion + archive/reactivate flow
// until the C5 cutover. Nothing existing changes behaviour.

const EMPTY_DRAFTS: PromotionDrafts = { overview: null, features: null, faqs: null };
const NOT_CONFIGURED: Record<string, string> = {
  overview: 'not-configured', features: 'not-configured', faqs: 'not-configured',
};

// An instance with its lifecycle layer guaranteed present (the C1 read always
// includes it; this normalises create/save responses and pre-C1 shapes).
export type PromotionStationInstance = PromotionTier & {
  drafts:        PromotionDrafts;
  module_status: Record<string, string>;
};

type NormDetail = Omit<ServicePromotionStationResponse, 'promotions'> & {
  promotions: PromotionStationInstance[];
};

function normInstance(p: PromotionTier): PromotionStationInstance {
  return {
    ...p,
    drafts:        p.drafts        ?? { ...EMPTY_DRAFTS },
    module_status: p.module_status ?? { ...NOT_CONFIGURED },
  };
}

function normDetail(res: ServicePromotionStationResponse): NormDetail {
  return { ...res, promotions: res.promotions.map(normInstance) };
}

// Draft-preferred detail: draft wins over the settled instance per module.
function draftPreferredDetail(p: PromotionStationInstance): PromotionTier {
  const ov = p.drafts.overview;
  return {
    ...p,
    name:           ov ? ov.name           : p.name,
    slug:           ov ? ov.slug           : p.slug,
    based_on:       ov ? ov.based_on       : p.based_on,
    headline:       ov ? ov.headline       : p.headline,
    description:    ov ? ov.description    : p.description,
    price:          ov ? ov.price          : p.price,
    billing_label:  ov ? ov.billing_label  : p.billing_label,
    badge:          ov ? ov.badge          : p.badge,
    campaign_label: ov ? ov.campaign_label : p.campaign_label,
    priority:       ov ? ov.priority       : p.priority,
    is_featured:    ov ? ov.is_featured    : p.is_featured,
    inclusions:     p.drafts.features ?? p.inclusions,
    faq_refs:       p.drafts.faqs     ?? p.faq_refs,
  };
}

// ── Public shape ─────────────────────────────────────────────────────────────

export interface PromotionView {
  detail:       PromotionTier;               // draft-preferred (draft ?? settled)
  status:       PromotionStatus;             // travel state
  drafts:       PromotionDrafts;
  moduleStatus: Record<string, string>;
  // Per-module lifecycle: full evaluateModule result (5-state status + notes).
  modules: {
    overview: ModuleState;
    features: ModuleState;
    faqs:     ModuleState;
  };
}

export interface PromotionStation {
  detail:       ServicePromotionStationResponse | null;
  detailLoaded: boolean;
  saving:       boolean;
  promotions:   PromotionTier[];
  service:      ServicePromotionStationResponse['service'] | null;
  // Whole-record flow (pre-C5 UI) — unchanged.
  createPromotion:     (payload: PromotionTierPayload) => Promise<ServicePromotionSaveResponse | null>;
  savePromotion:       (promoId: string, payload: PromotionTierPayload) => Promise<ServicePromotionSaveResponse | null>;
  archivePromotion:    (promoId: string) => Promise<boolean>;
  reactivatePromotion: (promoId: string) => Promise<boolean>;
  // Draft-preferred view of one instance (null until loaded / unknown id).
  promotionView: (promoId: string) => PromotionView | null;
  // Per-module persist-through saves (draft) — patch the source in place.
  savePromotionOverview: (promoId: string, draft: PromotionOverviewDraft) => Promise<PromotionLifecycleResponse | null>;
  savePromotionFeatures: (promoId: string, refs: InclusionItem[])         => Promise<PromotionLifecycleResponse | null>;
  savePromotionFaqs:     (promoId: string, refs: string[])                => Promise<PromotionLifecycleResponse | null>;
  revertPromotionModule: (promoId: string, module: PromotionModuleKey)    => Promise<PromotionLifecycleResponse | null>;
  // Commit the whole instance (drafts → settled fields).
  settlePromotion: (promoId: string) => Promise<PromotionLifecycleResponse | null>;
  // Engine travel transitions — the only status writes.
  publishPromotion: (promoId: string) => Promise<PromotionTransitionResponse | null>;
  togglePromotion:  (promoId: string) => Promise<PromotionTransitionResponse | null>;
  trashPromotion:   (promoId: string) => Promise<PromotionTransitionResponse | null>;
  restorePromotion: (promoId: string) => Promise<PromotionTransitionResponse | null>;
  deletePromotion:  (promoId: string) => Promise<boolean>;
  // Immediate canonical pool creation — unchanged.
  createInclusion:     (label: string) => Promise<InclusionItem | null>;
  createFaq:           (question: string, answer: string) => Promise<FaqItem | null>;
  refetch:      () => void;
}

export function usePromotionStation(serviceId: number, onRefresh?: () => void): PromotionStation {
  const [detail, setDetail]             = useState<NormDetail | null>(null);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const [saving, setSaving]             = useState(false);

  const load = useCallback(() => {
    setDetailLoaded(false);
    fetchServicePromotionStation(serviceId)
      .then(res => setDetail(res.success ? normDetail(res) : null))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoaded(true));
  }, [serviceId]);

  useEffect(() => { load(); }, [load]);

  const patchStatus = useCallback((promoId: string, status: PromotionStatus) => {
    setDetail(prev => prev ? {
      ...prev,
      promotions: prev.promotions.map(p => p.id === promoId ? { ...p, status } : p),
    } : prev);
  }, []);

  // Replace one instance wholesale from a lifecycle/transition response,
  // normalising the attached lifecycle layer (settle/publish return the
  // committed instance).
  const replaceInstance = useCallback((promoId: string, tier: PromotionTier, drafts: PromotionDrafts, moduleStatus: Record<string, string>) => {
    setDetail(prev => prev ? {
      ...prev,
      promotions: prev.promotions.map(p => p.id === promoId
        ? { ...normInstance(tier), drafts, module_status: moduleStatus }
        : p),
    } : prev);
  }, []);

  // ── Draft-preferred view ────────────────────────────────────────────────────

  const promotionView = useCallback((promoId: string): PromotionView | null => {
    const p = detail?.promotions.find(i => i.id === promoId);
    if (!p) return null;

    const dp = draftPreferredDetail(p);
    // The travelling instance is the station-like unit: ctx.platformStatus
    // carries the INSTANCE's travel status, not the service's.
    const overviewComplete = !!dp.name.trim();

    return {
      detail:       dp,
      status:       p.status,
      drafts:       p.drafts,
      moduleStatus: p.module_status,
      modules: {
        overview: evaluateModule(
          promotionOverviewModule,
          { name: dp.name, price: dp.price, billing_label: dp.billing_label },
          { platformStatus: p.status, moduleTransition: p.module_status.overview, hasDraft: p.drafts.overview !== null },
        ),
        features: evaluateModule(
          promotionFeaturesModule,
          { count: dp.inclusions.length },
          { platformStatus: p.status, moduleTransition: p.module_status.features, parentReady: overviewComplete, parentLabel: 'Promotion Overview' },
        ),
        faqs: evaluateModule(
          promotionFaqsModule,
          { count: dp.faq_refs.length },
          { platformStatus: p.status, moduleTransition: p.module_status.faqs, parentReady: overviewComplete, parentLabel: 'Promotion Overview' },
        ),
      },
    };
  }, [detail]);

  // ── Whole-record flow (pre-C5 UI) — unchanged behaviour ────────────────────

  const createPromotion = useCallback(async (payload: PromotionTierPayload) => {
    setSaving(true);
    try {
      const res = await createServicePromotion(serviceId, payload);
      if (res.success) {
        setDetail(prev => prev ? { ...prev, promotions: [...prev.promotions, normInstance(res.promotion_tier)] } : prev);
        onRefresh?.();
      }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh]);

  const savePromotion = useCallback(async (promoId: string, payload: PromotionTierPayload) => {
    setSaving(true);
    try {
      const res = await saveServicePromotion(serviceId, promoId, payload);
      if (res.success) {
        setDetail(prev => prev ? {
          ...prev,
          // Whole-record saves leave drafts untouched server-side (envelope
          // passthrough) — preserve the client-side lifecycle layer too.
          promotions: prev.promotions.map(p => p.id === promoId
            ? { ...normInstance(res.promotion_tier), drafts: p.drafts, module_status: p.module_status }
            : p),
        } : prev);
        onRefresh?.();
      }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh]);

  const archivePromotion = useCallback(async (promoId: string) => {
    setSaving(true);
    try {
      const res = await archiveServicePromotion(serviceId, promoId);
      if (res.success) {
        patchStatus(promoId, res.status as PromotionStatus);
        onRefresh?.();
      }
      return res.success;
    } catch { return false; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchStatus]);

  // LEGACY (until C5) — direct archived→active flip via the legacy alias route.
  const reactivatePromotion = useCallback(async (promoId: string) => {
    setSaving(true);
    try {
      const res = await reactivateServicePromotion(serviceId, promoId);
      if (res.success) {
        patchStatus(promoId, res.status as PromotionStatus);
        onRefresh?.();
      }
      return res.success;
    } catch { return false; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchStatus]);

  // ── Per-module persist-through saves (engine C2) ────────────────────────────

  const patchModule = useCallback((promoId: string, module: PromotionModuleKey, res: PromotionLifecycleResponse) => {
    setDetail(prev => prev ? {
      ...prev,
      promotions: patchInstanceModuleDraft(prev.promotions, promoId, module, res.drafts[module], res.module_status),
    } : prev);
  }, []);

  const saveModule = useCallback(async (
    promoId: string,
    module:  PromotionModuleKey,
    payload: PromotionOverviewDraft | { inclusions: InclusionItem[] } | { faq_refs: string[] },
  ) => {
    setSaving(true);
    try {
      const res = await saveServicePromotionModule(serviceId, promoId, module, payload);
      if (res.success) { patchModule(promoId, module, res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchModule]);

  const savePromotionOverview = useCallback(
    (promoId: string, draft: PromotionOverviewDraft) => saveModule(promoId, 'overview', draft),
    [saveModule],
  );
  const savePromotionFeatures = useCallback(
    (promoId: string, refs: InclusionItem[]) => saveModule(promoId, 'features', { inclusions: refs }),
    [saveModule],
  );
  const savePromotionFaqs = useCallback(
    (promoId: string, refs: string[]) => saveModule(promoId, 'faqs', { faq_refs: refs }),
    [saveModule],
  );

  const revertPromotionModule = useCallback(async (promoId: string, module: PromotionModuleKey) => {
    setSaving(true);
    try {
      const res = await revertServicePromotionModule(serviceId, promoId, module);
      if (res.success) { patchModule(promoId, module, res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchModule]);

  const settlePromotion = useCallback(async (promoId: string) => {
    setSaving(true);
    try {
      const res = await settleServicePromotion(serviceId, promoId);
      if (res.success) {
        replaceInstance(promoId, res.promotion_tier, res.drafts, res.module_status);
        onRefresh?.();
      }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, replaceInstance]);

  // ── Engine travel transitions (C3) — the only status writes ────────────────

  const transition = useCallback(async (
    promoId: string,
    call:    (serviceId: number, promoId: string) => Promise<PromotionTransitionResponse>,
  ) => {
    setSaving(true);
    try {
      const res = await call(serviceId, promoId);
      if (res.success) {
        if (res.promotion_tier && res.drafts && res.module_status) {
          // publish settles first and returns the committed instance.
          replaceInstance(promoId, { ...res.promotion_tier, status: res.status }, res.drafts, res.module_status);
        } else {
          patchStatus(promoId, res.status);
        }
        onRefresh?.();
      }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchStatus, replaceInstance]);

  const publishPromotion = useCallback((promoId: string) => transition(promoId, publishServicePromotion), [transition]);
  const togglePromotion  = useCallback((promoId: string) => transition(promoId, toggleServicePromotion),  [transition]);
  const trashPromotion   = useCallback((promoId: string) => transition(promoId, trashServicePromotion),   [transition]);
  const restorePromotion = useCallback((promoId: string) => transition(promoId, restoreServicePromotion), [transition]);

  const deletePromotion = useCallback(async (promoId: string) => {
    setSaving(true);
    try {
      const res = await permanentDeleteServicePromotion(serviceId, promoId);
      if (res.success) {
        setDetail(prev => prev ? {
          ...prev,
          promotions: prev.promotions.filter(p => p.id !== promoId),
        } : prev);
        onRefresh?.();
      }
      return res.success;
    } catch { return false; } finally { setSaving(false); }
  }, [serviceId, onRefresh]);

  // ── Immediate canonical pool creation — unchanged ───────────────────────────

  const createInclusion = useCallback(async (label: string): Promise<InclusionItem | null> => {
    setSaving(true);
    try {
      const res = await createServiceInclusionPoolItem(serviceId, label);
      if (!res.success) return null;
      setDetail(prev => prev ? {
        ...prev,
        service: {
          ...prev.service,
          inclusions: prev.service.inclusions.some(i => i.id === res.inclusion.id)
            ? prev.service.inclusions
            : [...prev.service.inclusions, res.inclusion],
        },
      } : prev);
      onRefresh?.();
      return res.inclusion;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh]);

  const createFaq = useCallback(async (question: string, answer: string): Promise<FaqItem | null> => {
    setSaving(true);
    try {
      const res = await createServiceFaqPoolItem(serviceId, question, answer);
      if (!res.success) return null;
      setDetail(prev => prev ? {
        ...prev,
        service: {
          ...prev.service,
          faqs: prev.service.faqs.some(f => f.id === res.faq.id)
            ? prev.service.faqs
            : [...prev.service.faqs, res.faq],
        },
      } : prev);
      onRefresh?.();
      return res.faq;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh]);

  return {
    detail,
    detailLoaded,
    saving,
    promotions: detail?.promotions ?? [],
    service:    detail?.service ?? null,
    createPromotion,
    savePromotion,
    archivePromotion,
    reactivatePromotion,
    promotionView,
    savePromotionOverview,
    savePromotionFeatures,
    savePromotionFaqs,
    revertPromotionModule,
    settlePromotion,
    publishPromotion,
    togglePromotion,
    trashPromotion,
    restorePromotion,
    deletePromotion,
    createInclusion,
    createFaq,
    refetch: load,
  };
}
