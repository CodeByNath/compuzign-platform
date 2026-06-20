import { useEffect, useState, useCallback } from 'preact/hooks';
import type { ServiceItem, ServiceInclusion, ServiceFaq, PricingTierData, TierId } from '@/api/types/cost-builder';
import {
  createSurfacePackage,
  fetchAdminServiceDetail,
  revertServiceModule,
  settleAllServiceModules,
  updateServiceFaqs,
  updateServiceInclusions,
  updateServiceOverview,
  updateServiceStatus,
} from '@/api/endpoints/admin';
import type {
  AdminServiceDetailResponse,
  SurfacePackageSummary,
  OverviewDraftData,
  ServiceInclusionItem,
  ServiceFaqItem,
} from '@/api/types/admin';
import type { OverviewDraft } from '@/components/admin/editors/ServiceOverviewEditor';
import type { InclusionsDraft } from '@/components/admin/editors/ServiceInclusionsEditor';
import type { FaqsDraft } from '@/components/admin/editors/ServiceFaqsEditor';
import { resolveOverviewStatus, resolvePackageStatus } from '@/components/admin/utils/moduleStatus';
import { getOverviewNotes, getInclusionsNotes, getFaqsNotes } from '@/components/admin/utils/moduleNotifications';
import type { NoteContext, ModuleNote } from '@/components/admin/utils/moduleNotifications';

// ── Constants ──────────────────────────────────────────────────────────────────

const TIER_KEYS: TierId[] = ['basic', 'standard', 'premium', 'enterprise'];

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

  // ── Module data (draft-preferred) ─────────────────────────────────────────
  inclusions:    ServiceInclusionItem[];
  faqs:          ServiceFaqItem[];
  tiers:         Record<TierId, PricingTierData> | undefined;
  overviewDraft: OverviewDraftData | null;

  // ── Module registry ────────────────────────────────────────────────────────
  moduleStatus:       Record<string, string> | undefined;
  hasPendingModules:  boolean;
  pendingModuleNames: string[];

  // ── Package registry ───────────────────────────────────────────────────────
  relatedPkg: SurfacePackageSummary | null;

  // ── Resolved module computed state ────────────────────────────────────────
  overviewStatus:   string;
  inclusionsStatus: string;
  faqsStatus:       string;
  overviewNotes:    ModuleNote[];
  inclusionsNotes:  ModuleNote[];
  faqsNotes:        ModuleNote[];
  canPublish:       boolean;

  // ── Surface layer ─────────────────────────────────────────────────────────
  pkgSummaryStatus:      string;
  pkgSummaryCount:       string;
  pkgSummaryDesc:        string;
  pkgSummaryDescPending: boolean;
  promoStatus:           string;
  promotionCount:        number;
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
  settleModules:         () => Promise<SettleModulesResult | null>;
  publishService:        () => Promise<PublishServiceResult | null>;
  saveOverview:          (draft: OverviewDraft)   => Promise<Record<string, string>>;
  saveInclusions:        (draft: InclusionsDraft) => Promise<Record<string, string>>;
  saveFaqs:              (draft: FaqsDraft)       => Promise<Record<string, string>>;
  revertOverview:        () => Promise<void>;
  revertInclusions:      () => Promise<void>;
  revertFaqs:            () => Promise<void>;
  createPackageIfMissing: (serviceId: number, serviceTitle: string) => Promise<{ pkgId: number; pkgTitle: string } | null>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useServiceStation(
  service:    ServiceItem,
  packages:   SurfacePackageSummary[],
  onRefresh?: () => void,
): ServiceStation {
  const [adminDetail, setAdminDetail] = useState<AdminServiceDetailResponse | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [creatingPkg,  setCreatingPkg]  = useState(false);

  useEffect(() => {
    fetchAdminServiceDetail(service.id)
      .then(setAdminDetail)
      .catch(() => {}); // non-fatal — falls back to CostBuilder data
  }, [service.id]);

  // ── Derived: identity ──────────────────────────────────────────────────────
  const platformStatus = service.meta?.platform_status ?? 'disabled';
  const isActive       = platformStatus === 'active';

  // ── Derived: module data (draft-preferred) ─────────────────────────────────
  const inclusions = (adminDetail?.drafts.inclusions ?? service.inclusions ?? []) as ServiceInclusionItem[];
  const faqs       = (adminDetail?.drafts.faqs       ?? service.faqs       ?? []) as ServiceFaqItem[];
  const tiers      = service.pricing?.tiers;

  // ── Derived: module registry ───────────────────────────────────────────────
  // adminDetail.module_status is authoritative (loaded on drawer open).
  // Falls back to CostBuilder data while the fetch is in flight.
  const moduleStatus = (adminDetail?.module_status ?? service.meta?.module_status) as Record<string, string> | undefined;
  const hasPendingModules = isActive && (
    moduleStatus?.overview   === 'pending' ||
    moduleStatus?.inclusions === 'pending' ||
    moduleStatus?.faqs       === 'pending'
  );
  const pendingModuleNames = [
    moduleStatus?.overview   === 'pending' ? 'Service Overview'  : null,
    moduleStatus?.inclusions === 'pending' ? 'Included Features' : null,
    moduleStatus?.faqs       === 'pending' ? 'Common Questions'  : null,
  ].filter((n): n is string => n !== null);

  // ── Derived: package registry ──────────────────────────────────────────────
  const relatedPkg = packages.find((p) => p.service_refs.includes(service.id)) ?? null;

  // ── Derived: module status resolvers ──────────────────────────────────────
  const overviewDraft  = adminDetail?.drafts.overview ?? null;
  const overviewStatus = resolveOverviewStatus(service, {
    platformStatus,
    moduleTransition: moduleStatus?.overview ?? 'not-configured',
  }, overviewDraft);

  const inclusionsStatus = (() => {
    const transition = moduleStatus?.inclusions ?? 'not-configured';
    if (transition === 'not-configured') return 'pending-dim';
    if (inclusions.length === 0) return 'pending-dim';
    const allComplete = inclusions.every(inc => !!inc.label?.trim());
    if (!allComplete) return 'pending-dim';
    if (transition === 'pending') return 'pending-full';
    if (!isActive) return 'pending-full';
    return 'active';
  })();

  const faqsStatus = (() => {
    const transition = moduleStatus?.faqs ?? 'not-configured';
    if (transition === 'not-configured') return 'pending-dim';
    if (faqs.length === 0) return 'pending-dim';
    const allComplete = faqs.every(faq => !!(faq.question?.trim()) && !!(faq.answer?.trim()));
    if (!allComplete) return 'pending-dim';
    if (transition === 'pending') return 'pending-full';
    if (!isActive) return 'pending-full';
    return 'active';
  })();

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

  const overviewNotes   = getOverviewNotes(service, noteCtxOverview, overviewDraft);
  const inclusionsNotes = getInclusionsNotes(inclusions as unknown as ServiceInclusion[], noteCtxInclusions);
  const faqsNotes       = getFaqsNotes(faqs as unknown as ServiceFaq[], noteCtxFaqs);

  // ── Derived: can publish ───────────────────────────────────────────────────
  const hasModulePendingChanges =
    inclusionsStatus === 'pending-full' || inclusionsStatus === 'pending-dim' ||
    faqsStatus === 'pending-full' || faqsStatus === 'pending-dim';

  const canPublish =
    overviewStatus === 'pending-full' ||
    (overviewStatus === 'active' && hasModulePendingChanges);

  // ── Derived: surface layer ─────────────────────────────────────────────────
  const pkgIsActive         = relatedPkg?.platform_status === 'active';
  const configuredTierCount = relatedPkg ? TIER_KEYS.filter((t) => relatedPkg.tiers[t]).length : 0;
  const promotionCount      = relatedPkg?.promotion_tiers.length ?? 0;

  const promoStatus = !relatedPkg || promotionCount === 0
    ? 'pending-dim'
    : pkgIsActive ? 'active' : 'pending-full';

  const pkgSummaryStatus = resolvePackageStatus(relatedPkg);

  const allTiersEnabled = relatedPkg != null &&
    TIER_KEYS.every((t) => relatedPkg.tiers[t]?.enabled === true);

  const pkgSummaryCount = relatedPkg
    ? `${configuredTierCount} tier${configuredTierCount !== 1 ? 's' : ''} configured`
    : '0 tiers configured';

  const pkgSummaryDesc = pkgSummaryStatus === 'active'
    ? 'Package Overview includes a full summary view of pricing and tiers.'
    : isActive && !relatedPkg
      ? 'View Package Overview and manage pricing and tiers.'
      : 'Pricing and tiers not available.';

  const pkgSummaryDescPending = isActive && pkgSummaryStatus === 'active' && !allTiersEnabled;

  // ── Derived: publish modal summaries ──────────────────────────────────────
  const pluralCount = (n: number, singular: string, plural: string) =>
    `${n} ${n === 1 ? singular : plural}`;

  const inclSummary = (() => {
    if (inclusionsStatus === 'pending-dim') return {
      text: inclusions.length === 0
        ? '0 included features added'
        : `${pluralCount(inclusions.length, 'included feature', 'included features')} pending`,
      orange: true,
    };
    const complete = inclusions.filter(inc => !!inc.label?.trim()).length;
    return { text: `${pluralCount(complete, 'included feature', 'included features')} added`, orange: false };
  })();

  const faqsSummary = (() => {
    if (faqsStatus === 'pending-dim') return {
      text: faqs.length === 0
        ? '0 common questions added'
        : `${pluralCount(faqs.length, 'common question', 'common questions')} pending`,
      orange: true,
    };
    const complete = faqs.filter(faq => !!(faq.question?.trim()) && !!(faq.answer?.trim())).length;
    return { text: `${pluralCount(complete, 'common question', 'common questions')} added`, orange: false };
  })();

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

  const settleModules = useCallback(async (): Promise<SettleModulesResult | null> => {
    setStatusSaving(true);
    try {
      const result = await settleAllServiceModules(service.id);
      if (result.success) {
        setAdminDetail(prev => prev ? {
          ...prev,
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
    setAdminDetail(prev => prev ? {
      ...prev,
      drafts:        { ...prev.drafts, overview: result.draft },
      module_status: result.module_status,
    } : prev);
    onRefresh?.();
    return result.module_status;
  }, [service.id, onRefresh]);

  const saveInclusions = useCallback(async (draft: InclusionsDraft): Promise<Record<string, string>> => {
    const result = await updateServiceInclusions(service.id, { inclusions: draft.items });
    if (!result.success) throw new Error('Failed to save inclusions.');
    setAdminDetail(prev => prev ? {
      ...prev,
      drafts:        { ...prev.drafts, inclusions: result.inclusions },
      module_status: result.module_status,
    } : prev);
    onRefresh?.();
    return result.module_status;
  }, [service.id, onRefresh]);

  const saveFaqs = useCallback(async (draft: FaqsDraft): Promise<Record<string, string>> => {
    const result = await updateServiceFaqs(service.id, { faqs: draft.items });
    if (!result.success) throw new Error('Failed to save FAQs.');
    setAdminDetail(prev => prev ? {
      ...prev,
      drafts:        { ...prev.drafts, faqs: result.faqs },
      module_status: result.module_status,
    } : prev);
    onRefresh?.();
    return result.module_status;
  }, [service.id, onRefresh]);

  const revertOverview = useCallback(async (): Promise<void> => {
    const result = await revertServiceModule(service.id, 'overview');
    if (result.success) {
      setAdminDetail(prev => prev ? {
        ...prev,
        drafts:        { ...prev.drafts, overview: null },
        module_status: result.module_status,
      } : prev);
      onRefresh?.();
    }
  }, [service.id, onRefresh]);

  const revertInclusions = useCallback(async (): Promise<void> => {
    const result = await revertServiceModule(service.id, 'inclusions');
    if (result.success) {
      setAdminDetail(prev => prev ? {
        ...prev,
        drafts:        { ...prev.drafts, inclusions: null },
        module_status: result.module_status,
      } : prev);
      onRefresh?.();
    }
  }, [service.id, onRefresh]);

  const revertFaqs = useCallback(async (): Promise<void> => {
    const result = await revertServiceModule(service.id, 'faqs');
    if (result.success) {
      setAdminDetail(prev => prev ? {
        ...prev,
        drafts:        { ...prev.drafts, faqs: null },
        module_status: result.module_status,
      } : prev);
      onRefresh?.();
    }
  }, [service.id, onRefresh]);

  const createPackageIfMissing = useCallback(async (
    serviceId:    number,
    serviceTitle: string,
  ): Promise<{ pkgId: number; pkgTitle: string } | null> => {
    if (relatedPkg) {
      return { pkgId: relatedPkg.post_id, pkgTitle: relatedPkg.title };
    }
    setCreatingPkg(true);
    try {
      const { package_id } = await createSurfacePackage({ service_id: serviceId, title: serviceTitle });
      onRefresh?.();
      return { pkgId: package_id, pkgTitle: serviceTitle };
    } catch {
      return null;
    } finally {
      setCreatingPkg(false);
    }
  }, [relatedPkg, onRefresh]);

  return {
    platformStatus,
    isActive,
    inclusions,
    faqs,
    tiers,
    overviewDraft,
    moduleStatus,
    hasPendingModules,
    pendingModuleNames,
    relatedPkg,
    overviewStatus,
    inclusionsStatus,
    faqsStatus,
    overviewNotes,
    inclusionsNotes,
    faqsNotes,
    canPublish,
    pkgSummaryStatus,
    pkgSummaryCount,
    pkgSummaryDesc,
    pkgSummaryDescPending,
    promoStatus,
    promotionCount,
    configuredTierCount,
    inclSummary,
    faqsSummary,
    loading: { status: statusSaving, creating: creatingPkg },
    toggleActive,
    settleModules,
    publishService,
    saveOverview,
    saveInclusions,
    saveFaqs,
    revertOverview,
    revertInclusions,
    revertFaqs,
    createPackageIfMissing,
  };
}
