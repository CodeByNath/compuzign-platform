import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  fetchServicePackageStation,
  saveServicePackageStationTierModule,
  settleServicePackageStationTier,
  setServicePackageStationTierEnabled,
} from '@/api/endpoints/admin';
import type {
  ServicePackageStationResponse,
  ServicePackageStationData,
  SurfaceTierDetail,
  TierDrafts,
  TierOverviewDraft,
  TierLifecycleResponse,
  InclusionItem,
} from '@/api/types/admin';
import { resolveTierStatus } from '@/components/admin/utils/moduleStatus';
import type { TierLike } from '@/components/admin/utils/moduleStatus';
import {
  evaluateModule,
  tierOverviewModule,
  tierFeaturesModule,
  tierFaqsModule,
} from '@/components/admin/utils/moduleNotifications';
import type { ModuleNote } from '@/components/admin/utils/moduleNotifications';
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

const EMPTY_DRAFTS: TierDrafts = { overview: null, features: null, faqs: null };
const NOT_CONFIGURED: Record<string, string> = {
  overview: 'not-configured', features: 'not-configured', faqs: 'not-configured',
};

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
  };
}

// ── Public shape ─────────────────────────────────────────────────────────────

export interface PackageStationTierView {
  detail:       SurfaceTierDetail;            // draft-preferred (draft ?? settled)
  status:       string;                       // resolveTierStatus (tier-level pill)
  drafts:       TierDrafts;
  moduleStatus: Record<string, string>;
  notes: {
    overview: ModuleNote[];
    features: ModuleNote[];
    faqs:     ModuleNote[];
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
  // Commit the whole tier.
  settleTier:       (tierId: string) => Promise<TierLifecycleResponse | null>;
  // Live-state toggle (separate lifecycle action).
  toggleTierEnabled: (tierId: string, enabled: boolean) => Promise<boolean>;
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
      notes: {
        overview: evaluateModule(tierOverviewModule, tierLike, { platformStatus }).notes,
        features: evaluateModule(
          tierFeaturesModule,
          { count: dp.inclusions_override.length },
          { platformStatus, parentReady: overviewComplete, parentLabel: 'Tier Overview' },
        ).notes,
        faqs: evaluateModule(
          tierFaqsModule,
          { count: dp.faq_refs.length },
          { platformStatus, parentReady: overviewComplete, parentLabel: 'Tier Overview' },
        ).notes,
      },
    };
  }, [detail, platformStatus]);

  // Persist-through patch: patch the tier slot's draft + module_status in place from
  // the endpoint response, so derived values recompute without a refetch.
  const patchModule = useCallback((tierId: string, module: 'overview' | 'features' | 'faqs', res: TierLifecycleResponse) => {
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
              [tierId]: { ...res.tier, drafts: res.drafts, module_status: res.module_status },
            },
          },
        } : prev);
        onRefresh?.();
      }
      return res;
    } catch { return null; } finally { setSaving(false); }
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
    settleTier,
    toggleTierEnabled,
    refetch:        load,
  };
}
