import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  fetchServicePackageStation,
  saveServicePackageStationTierModule,
  revertServicePackageStationTierModule,
  settleServicePackageStationTier,
  setServicePackageStationTierEnabled,
  setServicePackageStationPopular,
  saveServicePackageStationPricingBoard,
  createServiceInclusionPoolItem,
  createServiceFaqPoolItem,
  archiveServicePackageStationTierOccupant,
  restoreServicePackageStationBinEntry,
  trashServicePackageStationBinEntry,
  deleteServicePackageStationBinEntry,
} from '@/api/endpoints/admin';
import type {
  ServicePackageStationResponse,
  ServicePackageStationData,
  SurfaceTierDetail,
  TierDrafts,
  TierOverviewDraft,
  TierLifecycleResponse,
  TierArchiveResponse,
  BinRestoreResponse,
  BinTrashResponse,
  BinDeleteResponse,
  OccupantBinEntry,
  TierModuleKey,
  InclusionItem,
  FaqItem,
  PricingBoard,
  TierPricingUsage,
} from '@/api/types/admin';
import { resolveTierStatus } from '@/components/admin/utils/moduleStatus';
import type { TierLike } from '@/components/admin/utils/moduleStatus';
import {
  evaluateModule,
  tierOverviewModule,
  tierFeaturesModule,
  tierFaqsModule,
  tierPricingModule,
} from '@/components/admin/utils/moduleNotifications';
import type { ModuleState } from '@/components/admin/utils/moduleNotifications';
import { patchTierModuleDraft } from './stationPrimitives';

// ── usePackageStation ────────────────────────────────────────────────────────
//
// The single client-side owner of one cz_service_package_station — the package
// module AND every tier module. It applies the station pattern (single-source load,
// draft-preferred derive, per-module persist-through + patch, settle) to the package
// store, reusing the shared primitives (`patchTierModuleDraft` → `patchModuleDraft`)
// rather than duplicating `useServiceStation`'s mechanism. The draft ?? settled merge
// is done HERE, client-side, from the P3 read shape (settled fields + raw drafts +
// module_status returned separately) — parity with useServiceStation.
//
// P4: landed unused. No component consumes it yet; ServiceTierStep still uses useApi.
// Nothing here changes runtime behaviour.

const EMPTY_DRAFTS: TierDrafts = { overview: null, features: null, faqs: null, pricing: null };
const NOT_CONFIGURED: Record<string, string> = {
  overview: 'not-configured', features: 'not-configured', faqs: 'not-configured', pricing: 'not-configured',
};
const EMPTY_PRICING_BOARD: PricingBoard = { enabled: false, items: [] };

// A tier slot with its lifecycle layer guaranteed present (the P3 response always
// includes it; this normalises pre-P3 / fallback shapes so the hook can rely on it).
export type PackageStationTier = SurfaceTierDetail & {
  drafts:        TierDrafts;
  module_status: Record<string, string>;
};

type NormStation = Omit<ServicePackageStationData, 'tiers'> & {
  tiers: Record<string, PackageStationTier>;
};
type NormDetail = Omit<ServicePackageStationResponse, 'station'> & { station: NormStation };

function normTier(t: SurfaceTierDetail): PackageStationTier {
  return {
    ...t,
    drafts:        t.drafts        ?? { ...EMPTY_DRAFTS },
    module_status: t.module_status ?? { ...NOT_CONFIGURED },
  };
}

function normDetail(res: ServicePackageStationResponse): NormDetail {
  const tiers: Record<string, PackageStationTier> = {};
  for (const key of Object.keys(res.station.tiers)) {
    tiers[key] = normTier(res.station.tiers[key]);
  }
  return { ...res, station: { ...res.station, tiers } };
}

// Draft-preferred detail: draft wins over the settled occupant per module.
// pricing is draft-preferred the same way even though it never settles into
// current_occupant — the settled `pricing` slot key stands in for "the
// occupant" here (see PackageSchema::settleTierSlot).
function draftPreferredDetail(slot: PackageStationTier): SurfaceTierDetail {
  const ov = slot.drafts.overview;
  return {
    ...slot,
    label:               ov ? ov.label         : slot.label,
    price:               ov ? ov.price         : slot.price,
    contact:             ov ? ov.contact       : slot.contact,
    billing_cycle:       ov ? ov.billing_cycle : slot.billing_cycle,
    inclusions_override: slot.drafts.features ?? slot.inclusions_override,
    faq_refs:            slot.drafts.faqs     ?? slot.faq_refs,
    pricing:             slot.drafts.pricing  ?? slot.pricing,
  };
}

// ── Public shape ─────────────────────────────────────────────────────────────

export interface PackageStationTierView {
  detail:       SurfaceTierDetail;            // draft-preferred (draft ?? settled)
  status:       string;                       // resolveTierStatus (tier-level pill)
  drafts:       TierDrafts;
  moduleStatus: Record<string, string>;
  // Per-module lifecycle: full evaluateModule result (5-state status + notes) so the
  // consumer reads status/notes from the hook rather than re-deriving evaluateModule.
  modules: {
    overview: ModuleState;
    features: ModuleState;
    faqs:     ModuleState;
    pricing:  ModuleState;
  };
}

export interface PackageStation {
  station:        ServicePackageStationData | null;
  service:        ServicePackageStationResponse['service'] | null;
  detailLoaded:   boolean;
  saving:         boolean;
  platformStatus: string;
  popularTier:    string | null;
  popularLabel:   string;
  // Draft-preferred view of one tier (null until loaded / unknown tier).
  tierView:       (tierId: string) => PackageStationTierView | null;
  // Per-module persist-through saves (draft) — patch the source in place.
  saveTierOverview: (tierId: string, draft: TierOverviewDraft) => Promise<TierLifecycleResponse | null>;
  saveTierFeatures: (tierId: string, refs: InclusionItem[])    => Promise<TierLifecycleResponse | null>;
  saveTierFaqs:     (tierId: string, refs: string[])           => Promise<TierLifecycleResponse | null>;
  // Tier Pricing Usage draft save. Revert/settle are NOT separate functions —
  // revertTierModule/settleTier below are already generic over TierModuleKey
  // (which now includes 'pricing') and cover this module for free.
  saveTierPricing:  (tierId: string, draft: TierPricingUsage) => Promise<TierLifecycleResponse | null>;
  // Discard one module's pending draft (engine D1) — status re-derives from the occupant.
  revertTierModule: (tierId: string, module: TierModuleKey) => Promise<TierLifecycleResponse | null>;
  // Commit the whole tier.
  settleTier:       (tierId: string) => Promise<TierLifecycleResponse | null>;
  // Station-level popular tier selection (null clears). Not part of the overview draft.
  setPopularTier:   (tierId: string | null, label: string) => Promise<boolean>;
  // Package Pricing Board (declaration control centre) — package-level,
  // immediate-write, no draft/settle. The backend seeds/reconciles against the
  // live inclusion pool before persisting; the returned board is authoritative.
  pricingBoard:     PricingBoard;
  savePricingBoard: (board: PricingBoard) => Promise<boolean>;
  // Live-state toggle (separate lifecycle action).
  toggleTierEnabled: (tierId: string, enabled: boolean) => Promise<boolean>;
  // ── Occupant travel (engine D2–D4) ──────────────────────────────────────
  // The shell never travels; the occupant does. These return the raw response
  // so the consumer can key confirm flows on `code` (pending_drafts,
  // target_occupied, origin_unknown…).
  occupantBin:     OccupantBinEntry[];
  archiveTier:     (tierId: string, discardDrafts?: boolean) => Promise<TierArchiveResponse | null>;
  restoreOccupant: (binId: string, opts?: { mode?: 'swap' | 'retarget'; targetTier?: string; discardDrafts?: boolean }) => Promise<BinRestoreResponse | null>;
  trashBinEntry:   (binId: string) => Promise<BinTrashResponse | null>;
  deleteBinEntry:  (binId: string) => Promise<BinDeleteResponse | null>;
  // Immediate canonical pool creation (P5 Step 2). Service owns the pool; the
  // returned item's id is the caller's to attach to a tier's module draft via
  // saveTierFeatures/saveTierFaqs — these do not touch any tier draft themselves.
  createInclusion: (label: string) => Promise<InclusionItem | null>;
  createFaq:       (question: string, answer: string) => Promise<FaqItem | null>;
  refetch:          () => void;
}

export function usePackageStation(serviceId: number, onRefresh?: () => void): PackageStation {
  const [detail, setDetail]             = useState<NormDetail | null>(null);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const [saving, setSaving]             = useState(false);

  const load = useCallback(() => {
    setDetailLoaded(false);
    fetchServicePackageStation(serviceId)
      .then(res => setDetail(res.success ? normDetail(res) : null))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoaded(true));
  }, [serviceId]);

  useEffect(() => { load(); }, [load]);

  const station        = detail?.station ?? null;
  const platformStatus = station?.platform_status ?? 'disabled';

  const tierView = useCallback((tierId: string): PackageStationTierView | null => {
    const slot = detail?.station.tiers[tierId];
    if (!slot) return null;

    const dp = draftPreferredDetail(slot);
    const tierLike: TierLike = {
      enabled:       dp.enabled,
      price:         dp.price,
      billing_cycle: dp.billing_cycle,
      contact:       dp.contact,
    };
    const overviewComplete = (dp.price !== null || dp.contact) && !!dp.billing_cycle;

    return {
      detail:       dp,
      status:       resolveTierStatus(tierLike, { pkgStatus: platformStatus }),
      drafts:       slot.drafts,
      moduleStatus: slot.module_status,
      modules: {
        overview: evaluateModule(tierOverviewModule, tierLike, { platformStatus }),
        features: evaluateModule(
          tierFeaturesModule,
          { count: dp.inclusions_override.length },
          { platformStatus, parentReady: overviewComplete, parentLabel: 'Tier Overview' },
        ),
        faqs: evaluateModule(
          tierFaqsModule,
          { count: dp.faq_refs.length },
          { platformStatus, parentReady: overviewComplete, parentLabel: 'Tier Overview' },
        ),
        pricing: evaluateModule(
          tierPricingModule,
          { count: (dp.pricing?.usage ?? []).filter(u => u.enabled).length },
          { platformStatus, parentReady: overviewComplete, parentLabel: 'Tier Overview' },
        ),
      },
    };
  }, [detail, platformStatus]);

  // Persist-through patch: patch the tier slot's draft + module_status in place from
  // the endpoint response, so derived values recompute without a refetch.
  const patchModule = useCallback((tierId: string, module: TierModuleKey, res: TierLifecycleResponse) => {
    setDetail(prev => prev ? {
      ...prev,
      station: {
        ...prev.station,
        tiers: patchTierModuleDraft(prev.station.tiers, tierId, module, res.drafts[module], res.module_status),
      },
    } : prev);
  }, []);

  const saveTierOverview = useCallback(async (tierId: string, draft: TierOverviewDraft) => {
    setSaving(true);
    try {
      const res = await saveServicePackageStationTierModule(serviceId, tierId, 'overview', draft);
      if (res.success) { patchModule(tierId, 'overview', res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchModule]);

  const saveTierFeatures = useCallback(async (tierId: string, refs: InclusionItem[]) => {
    setSaving(true);
    try {
      const res = await saveServicePackageStationTierModule(serviceId, tierId, 'features', { inclusions_override: refs });
      if (res.success) { patchModule(tierId, 'features', res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchModule]);

  const saveTierFaqs = useCallback(async (tierId: string, refs: string[]) => {
    setSaving(true);
    try {
      const res = await saveServicePackageStationTierModule(serviceId, tierId, 'faqs', { faq_refs: refs });
      if (res.success) { patchModule(tierId, 'faqs', res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchModule]);

  const saveTierPricing = useCallback(async (tierId: string, draft: TierPricingUsage) => {
    setSaving(true);
    try {
      const res = await saveServicePackageStationTierModule(serviceId, tierId, 'pricing', draft);
      if (res.success) { patchModule(tierId, 'pricing', res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchModule]);

  const revertTierModule = useCallback(async (tierId: string, module: TierModuleKey) => {
    setSaving(true);
    try {
      const res = await revertServicePackageStationTierModule(serviceId, tierId, module);
      if (res.success) { patchModule(tierId, module, res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchModule]);

  const settleTier = useCallback(async (tierId: string) => {
    setSaving(true);
    try {
      const res = await settleServicePackageStationTier(serviceId, tierId);
      if (res.success) {
        setDetail(prev => prev ? {
          ...prev,
          station: {
            ...prev.station,
            tiers: {
              ...prev.station.tiers,
              // res.tier (normaliseTierSlot) does not carry `pricing` — it never
              // settles into current_occupant — so it must be merged in from
              // res.pricing explicitly or settle would silently drop it locally.
              [tierId]: { ...res.tier, drafts: res.drafts, module_status: res.module_status, pricing: res.pricing ?? undefined },
            },
          },
        } : prev);
        onRefresh?.();
      }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh]);

  // Station-level popular tier — patches station.popular_tier/label in place.
  const setPopularTier = useCallback(async (tierId: string | null, label: string) => {
    setSaving(true);
    try {
      const res = await setServicePackageStationPopular(serviceId, tierId, label);
      if (res.success) {
        setDetail(prev => prev ? {
          ...prev,
          station: { ...prev.station, popular_tier: res.popular_tier, popular_label: res.popular_label },
        } : prev);
        onRefresh?.();
      }
      return res.success;
    } catch { return false; } finally { setSaving(false); }
  }, [serviceId, onRefresh]);

  // Package Pricing Board — package-level, immediate-write. Patches
  // station.pricing_board with the backend's seeded/reconciled response.
  const savePricingBoard = useCallback(async (board: PricingBoard) => {
    setSaving(true);
    try {
      const res = await saveServicePackageStationPricingBoard(serviceId, board);
      if (res.success) {
        setDetail(prev => prev ? {
          ...prev,
          station: { ...prev.station, pricing_board: res.pricing_board },
        } : prev);
        onRefresh?.();
      }
      return res.success;
    } catch { return false; } finally { setSaving(false); }
  }, [serviceId, onRefresh]);

  const toggleTierEnabled = useCallback(async (tierId: string, enabled: boolean) => {
    setSaving(true);
    try {
      const res = await setServicePackageStationTierEnabled(serviceId, tierId, enabled);
      if (res.success) {
        setDetail(prev => {
          if (!prev) return prev;
          const slot = prev.station.tiers[tierId];
          if (!slot) return prev;
          return {
            ...prev,
            station: { ...prev.station, tiers: { ...prev.station.tiers, [tierId]: { ...slot, enabled } } },
          };
        });
        onRefresh?.();
      }
      return res.success;
    } catch { return false; } finally { setSaving(false); }
  }, [serviceId, onRefresh]);

  // ── Occupant travel (engine D2–D4) ────────────────────────────────────────

  // Patch the shell + bin + station status in place from a travel response
  // (archive empties the shell; restore refills one — possibly a different one).
  const patchTravel = useCallback((res: TierArchiveResponse | BinRestoreResponse) => {
    setDetail(prev => {
      if (!prev) return prev;
      const tiers = (res.tier_id && res.tier)
        ? {
            ...prev.station.tiers,
            [res.tier_id]: normTier({ ...res.tier, drafts: res.drafts, module_status: res.module_status }),
          }
        : prev.station.tiers;
      return {
        ...prev,
        station: {
          ...prev.station,
          tiers,
          occupant_bin:    res.occupant_bin    ?? prev.station.occupant_bin,
          platform_status: res.platform_status ?? prev.station.platform_status,
        },
      };
    });
  }, []);

  const patchBin = useCallback((bin?: OccupantBinEntry[]) => {
    if (!bin) return;
    setDetail(prev => prev ? { ...prev, station: { ...prev.station, occupant_bin: bin } } : prev);
  }, []);

  const archiveTier = useCallback(async (tierId: string, discardDrafts = false) => {
    setSaving(true);
    try {
      const res = await archiveServicePackageStationTierOccupant(serviceId, tierId, discardDrafts);
      if (res.success) { patchTravel(res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchTravel]);

  const restoreOccupant = useCallback(async (
    binId: string,
    opts: { mode?: 'swap' | 'retarget'; targetTier?: string; discardDrafts?: boolean } = {},
  ) => {
    setSaving(true);
    try {
      const res = await restoreServicePackageStationBinEntry(serviceId, binId, opts);
      if (res.success) { patchTravel(res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchTravel]);

  const trashBinEntry = useCallback(async (binId: string) => {
    setSaving(true);
    try {
      const res = await trashServicePackageStationBinEntry(serviceId, binId);
      if (res.success) { patchBin(res.occupant_bin); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchBin]);

  const deleteBinEntry = useCallback(async (binId: string) => {
    setSaving(true);
    try {
      const res = await deleteServicePackageStationBinEntry(serviceId, binId);
      if (res.success) { patchBin(res.occupant_bin); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, onRefresh, patchBin]);

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
    station,
    service:        detail?.service ?? null,
    detailLoaded,
    saving,
    platformStatus,
    popularTier:    station?.popular_tier ?? null,
    popularLabel:   station?.popular_label ?? '',
    tierView,
    saveTierOverview,
    saveTierFeatures,
    saveTierFaqs,
    saveTierPricing,
    revertTierModule,
    settleTier,
    setPopularTier,
    pricingBoard:   station?.pricing_board ?? EMPTY_PRICING_BOARD,
    savePricingBoard,
    toggleTierEnabled,
    occupantBin:    station?.occupant_bin ?? [],
    archiveTier,
    restoreOccupant,
    trashBinEntry,
    deleteBinEntry,
    createInclusion,
    createFaq,
    refetch:        load,
  };
}
