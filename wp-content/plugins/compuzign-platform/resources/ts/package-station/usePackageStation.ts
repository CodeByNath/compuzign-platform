import { useCallback, useEffect, useState } from 'preact/hooks';
import { ApiTimeoutError } from '@/api/client';
import {
  fetchServicePackageStation,
  saveServicePackageStationTierModule,
  revertServicePackageStationTierModule,
  settleServicePackageStationTier,
  setServicePackageStationTierEnabled,
  setServicePackageStationPopular,
  archiveServicePackageStationTierOccupant,
  restoreServicePackageStationBinEntry,
  trashServicePackageStationBinEntry,
  deleteServicePackageStationBinEntry,
} from './api';
// Service owns the inclusion/FAQ pools; the Package Station creates canonical
// items through the Service boundary.
import { createServiceInclusionPoolItem, createServiceFaqPoolItem } from '@/service-station';
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
  TierRateSheetSelection,
} from './types';
import type { InclusionItem, FaqItem } from '@/api/types/pools';
import { resolveTierStatus } from '@/drawer-kit/utils/moduleStatus';
import type { TierLike } from '@/drawer-kit/utils/moduleStatus';
import {
  evaluateModule,
  tierOverviewModule,
  tierFeaturesModule,
  tierFaqsModule,
} from '@/drawer-kit/utils/moduleNotifications';
import type { ModuleState } from '@/drawer-kit/utils/moduleNotifications';
import { patchTierModuleDraft } from '@/hooks/stationPrimitives';
import { deriveTierOccupants, resolveTierOccupantSlot } from './tierOccupants';
import type { TierOccupant } from './tierOccupants';
import { relationshipDisplayLabel } from './rateSheetLabels';

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
    ideal_for: t.ideal_for ?? '',
    rate_sheet_items: t.rate_sheet_items ?? [],
    rate_sheet_selections: t.rate_sheet_selections ?? [],
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
// Exported (alongside normTier's PackageStationTier type) so contract scripts
// can exercise the real merge the drawer renders from, without mounting a hook.
export function draftPreferredDetail(slot: PackageStationTier): SurfaceTierDetail {
  const ov = slot.drafts.overview;
  return {
    ...slot,
    label:               ov ? ov.label         : slot.label,
    ideal_for:           ov ? ov.ideal_for     : slot.ideal_for,
    audience_group:      ov?.audience_group ?? slot.audience_group,
    audience_groups:     ov?.audience_groups ?? slot.audience_groups,
    price:               ov ? ov.price         : slot.price,
    contact:             ov ? ov.contact       : slot.contact,
    billing_cycle:       ov ? ov.billing_cycle : slot.billing_cycle,
    // A pending sheet switch lives on the overview draft; otherwise the settled binding.
    rate_sheet_id:       ov && ov.rate_sheet_id !== undefined ? ov.rate_sheet_id : slot.rate_sheet_id,
    rate_sheet_items:    slot.drafts.features ?? slot.rate_sheet_items,
    faq_refs:            slot.drafts.faqs     ?? slot.faq_refs,
    // A pending is_addon change lives on the overview draft, same as label/
    // billing_cycle; a draft that omits it (or no draft at all) keeps the
    // settled occupant's value.
    is_addon:            ov && ov.is_addon !== undefined ? ov.is_addon : slot.is_addon,
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
  // Dynamic settled occupants for Admin cards. slotId remains the mutation key.
  tierOccupants:  TierOccupant<PackageStationTier>[];
  resolveOccupantSlot: (occupantId: string) => string | null;
  // Draft-preferred view of one tier (null until loaded / unknown tier).
  tierView:       (tierId: string) => PackageStationTierView | null;
  // Per-module persist-through saves (draft) — patch the source in place.
  saveTierOverview: (tierId: string, draft: TierOverviewDraft) => Promise<TierLifecycleResponse | null>;
  saveTierFeatures: (tierId: string, refs: TierRateSheetSelection[]) => Promise<TierLifecycleResponse | null>;
  saveTierFaqs:     (tierId: string, refs: string[])           => Promise<TierLifecycleResponse | null>;
  // Discard one module's pending draft (engine D1) — status re-derives from the occupant.
  revertTierModule: (tierId: string, module: TierModuleKey) => Promise<TierLifecycleResponse | null>;
  // Commit the whole tier.
  settleTier:       (tierId: string) => Promise<TierLifecycleResponse | null>;
  // Station-level popular tier selection (null clears). Not part of the overview draft.
  setPopularTier:   (tierId: string | null, label: string) => Promise<boolean>;
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

export function usePackageStation(
  serviceId: number,
  tierInstanceId: string | null,
  onRefresh?: () => void,
): PackageStation {
  const [detail, setDetail]             = useState<NormDetail | null>(null);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const [saving, setSaving]             = useState(false);

  const load = useCallback(() => {
    if (serviceId <= 0 || tierInstanceId === null) {
      setDetail(null);
      setDetailLoaded(true);
      return;
    }
    setDetailLoaded(false);
    fetchServicePackageStation(serviceId, tierInstanceId)
      .then(res => setDetail(res.success ? normDetail(res) : null))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoaded(true));
  }, [serviceId, tierInstanceId]);

  useEffect(() => { load(); }, [load]);

  const station        = detail?.station ?? null;
  const platformStatus = station?.platform_status ?? 'disabled';
  const tierOccupants  = deriveTierOccupants(station?.tiers ?? {});
  const resolveOccupantSlot = useCallback(
    (occupantId: string) => resolveTierOccupantSlot(detail?.station.tiers ?? {}, occupantId),
    [detail],
  );

  const tierView = useCallback((tierId: string): PackageStationTierView | null => {
    const slot = detail?.station.tiers[tierId];
    if (!slot) return null;

    const dp = draftPreferredDetail(slot);
    // Row identity is (rate_sheet_id, item_id): resolve within the sheet this Tier
    // is bound to, never a bare scan across sheets.
    const rateSheet = (detail?.service.rate_sheets ?? []).find((s) => s.rate_sheet_id === dp.rate_sheet_id) ?? null;
    const sourceById = new Map((detail?.service.package_relationships ?? []).map((item) => [item.item_id, item]));
    const rateById = new Map((rateSheet?.items ?? []).map((item) => [item.item_id, item]));
    const resolvedSelections = dp.rate_sheet_items.map((selection) => {
      const rateItem = rateById.get(selection.item_id);
      const source = rateItem ? sourceById.get(rateItem.source_item_id) : undefined;
      const resolved = !!rateItem && !!source && !source.missing;
      const label = resolved && source
        ? relationshipDisplayLabel(source)
        : dp.rate_sheet_selections.find((item) => item.item_id === selection.item_id)?.label ?? '(unresolved Rate Sheet item)';
      // Effective unit price mirrors PackageManagerSchema::projectTierRateSheetWith:
      // Default Price unless price_option_id resolves against this row's own
      // price_options[]; a present-but-unresolved id never falls back to
      // Default Price.
      const priceOptionId = selection.price_option_id ?? null;
      const selectedOption = priceOptionId !== null
        ? rateItem?.price_options?.find((option) => option.option_id === priceOptionId) ?? null
        : null;
      const optionUnresolved = priceOptionId !== null && !selectedOption;
      const unitPrice = resolved && rateItem && !optionUnresolved
        ? (selectedOption ? selectedOption.unit_price : rateItem.unit_price)
        : null;
      return {
        ...selection, resolved, label,
        price_option_id: priceOptionId,
        source_type: source?.source_type ?? null,
        source_id: source?.source_id ?? null,
        unit_price: unitPrice,
        per: resolved && rateItem ? rateItem.per : null,
        group_id: resolved && rateItem ? rateItem.group_id : null,
        line_total: unitPrice !== null ? unitPrice * selection.quantity : null,
        price_options: rateItem?.price_options,
      };
    });
    dp.rate_sheet_selections = resolvedSelections;
    // The resolved Rate Sheet total stays intact regardless of dp.contact —
    // display layers (resolveTierStatus's hasPrice, the editor's Price
    // field, the read-only summary line) already branch on contact
    // themselves. Nulling it here too would freeze a stale null into any
    // edit session's draft.price the moment it's opened while contact is
    // true, with no way to recompute it back when contact is unchecked
    // again in that same session.
    dp.price = resolvedSelections.some((item) => item.resolved)
      ? resolvedSelections.reduce((total, item) => total + (item.line_total ?? 0), 0)
      : null;
    dp.inclusions_override = resolvedSelections
      .filter((item) => item.source_type === 'inclusion')
      .map((item) => ({ id: item.item_id, label: item.label, missing: !item.resolved }));
    dp.faq_refs = resolvedSelections
      .filter((item) => item.source_type === 'faq' && item.resolved && item.source_id)
      .map((item) => item.source_id as string);
    const tierLike: TierLike = {
      enabled:                 dp.enabled,
      is_explicitly_disabled:  dp.is_explicitly_disabled ?? false,
      price:                   dp.price,
      billing_cycle:           dp.billing_cycle,
      contact:                 dp.contact,
    };
    const overviewComplete = (dp.price !== null || dp.contact) && !!dp.billing_cycle;
    // This occupant's OWN published state and explicit mask — never the
    // parent Tier Group/station status (Tier Group status is not occupant
    // truth). Each module below also gets its own moduleTransition/hasDraft,
    // so a draft on one module never leaks into a sibling's presentation.
    const occupantPlatformStatus = tierLike.enabled ? 'active' : 'disabled';
    const occupantDisabled       = tierLike.is_explicitly_disabled;

    return {
      detail:       dp,
      status:       resolveTierStatus(tierLike, { pkgStatus: platformStatus }),
      drafts:       slot.drafts,
      moduleStatus: slot.module_status,
      modules: {
        overview: evaluateModule(tierOverviewModule, tierLike, {
          platformStatus:   occupantPlatformStatus,
          moduleTransition: slot.module_status.overview,
          hasDraft:         slot.drafts.overview !== null,
          disabled:         occupantDisabled,
          platformLabel:    'Tier',
        }),
        features: evaluateModule(
          tierFeaturesModule,
          { count: dp.rate_sheet_items.length },
          {
            platformStatus:   occupantPlatformStatus,
            moduleTransition: slot.module_status.features,
            hasDraft:         slot.drafts.features !== null,
            disabled:         occupantDisabled,
            parentReady:      overviewComplete,
            parentLabel:      'Tier Overview',
            platformLabel:    'Tier',
          },
        ),
        faqs: evaluateModule(
          tierFaqsModule,
          { count: dp.faq_refs.length },
          {
            platformStatus:   occupantPlatformStatus,
            moduleTransition: slot.module_status.faqs,
            hasDraft:         slot.drafts.faqs !== null,
            disabled:         occupantDisabled,
            parentReady:      overviewComplete,
            parentLabel:      'Tier Overview',
            platformLabel:    'Tier',
          },
        ),
      },
    };
  }, [detail, platformStatus]);

  // Persist-through patch: patch the tier slot's draft + module_status in place from
  // the endpoint response, so derived values recompute without a refetch.
  const patchModule = useCallback((tierId: string, module: 'overview' | 'features' | 'faqs', res: TierLifecycleResponse) => {
    setDetail(prev => {
      if (!prev) return prev;
      const tiers = patchTierModuleDraft(prev.station.tiers, tierId, module, res.drafts[module], res.module_status);
      const slot  = tiers[tierId];
      return {
        ...prev,
        station: {
          ...prev.station,
          tiers: slot ? {
            ...tiers,
            // First-save persistence boundary: an Overview Save on an empty
            // slot can mint the occupant's identity/marker for the first
            // time (PackageSchema::ensurePendingOccupant) — hand the
            // authoritative envelope off into the mounted drawer so it picks
            // up occupant_id immediately, without a refetch or remount.
            [tierId]: {
              ...slot,
              occupant_id:            res.tier.occupant_id,
              platform_id:            res.tier.platform_id,
              addon_platform_id:      res.tier.addon_platform_id,
              is_explicitly_disabled: res.tier.is_explicitly_disabled ?? false,
            },
          } : tiers,
        },
      };
    });
  }, []);

  const saveTierOverview = useCallback(async (tierId: string, draft: TierOverviewDraft) => {
    if (tierInstanceId === null) return null;
    setSaving(true);
    try {
      const res = await saveServicePackageStationTierModule(serviceId, tierInstanceId, tierId, 'overview', draft);
      if (res.success) { patchModule(tierId, 'overview', res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, tierInstanceId, onRefresh, patchModule]);

  const saveTierFeatures = useCallback(async (tierId: string, refs: TierRateSheetSelection[]) => {
    if (tierInstanceId === null) return null;
    setSaving(true);
    try {
      const res = await saveServicePackageStationTierModule(serviceId, tierInstanceId, tierId, 'features', { rate_sheet_items: refs });
      if (res.success) { patchModule(tierId, 'features', res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, tierInstanceId, onRefresh, patchModule]);

  const saveTierFaqs = useCallback(async (tierId: string, refs: string[]) => {
    if (tierInstanceId === null) return null;
    setSaving(true);
    try {
      const res = await saveServicePackageStationTierModule(serviceId, tierInstanceId, tierId, 'faqs', { faq_refs: refs });
      if (res.success) { patchModule(tierId, 'faqs', res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, tierInstanceId, onRefresh, patchModule]);

  const revertTierModule = useCallback(async (tierId: string, module: TierModuleKey) => {
    if (tierInstanceId === null) return null;
    setSaving(true);
    try {
      const res = await revertServicePackageStationTierModule(serviceId, tierInstanceId, tierId, module);
      if (res.success) { patchModule(tierId, module, res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, tierInstanceId, onRefresh, patchModule]);

  const settleTier = useCallback(async (tierId: string) => {
    if (tierInstanceId === null) return null;
    setSaving(true);
    try {
      const res = await settleServicePackageStationTier(serviceId, tierInstanceId, tierId);
      if (res.success) {
        setDetail(prev => prev ? {
          ...prev,
          station: {
            ...prev.station,
            platform_status: res.platform_status ?? prev.station.platform_status,
            tiers: {
              ...prev.station.tiers,
              [tierId]: normTier({ ...res.tier, drafts: res.drafts, module_status: res.module_status }),
            },
          },
        } : prev);
        onRefresh?.();
      }
      return res;
    } catch (e) {
      // A stalled request's outcome is genuinely unknown — never collapse it
      // into the same "failed" result as a real API error. The caller
      // distinguishes it to avoid reporting a definite failure.
      if (e instanceof ApiTimeoutError) throw e;
      return null;
    } finally { setSaving(false); }
  }, [serviceId, tierInstanceId, onRefresh]);

  // Station-level popular tier — patches station.popular_tier/label in place.
  const setPopularTier = useCallback(async (tierId: string | null, label: string) => {
    if (tierInstanceId === null) return false;
    setSaving(true);
    try {
      const res = await setServicePackageStationPopular(serviceId, tierInstanceId, tierId, label);
      if (res.success) {
        setDetail(prev => prev ? {
          ...prev,
          station: { ...prev.station, popular_tier: res.popular_tier, popular_label: res.popular_label },
        } : prev);
        onRefresh?.();
      }
      return res.success;
    } catch { return false; } finally { setSaving(false); }
  }, [serviceId, tierInstanceId, onRefresh]);

  const toggleTierEnabled = useCallback(async (tierId: string, enabled: boolean) => {
    if (tierInstanceId === null) return false;
    setSaving(true);
    try {
      const res = await setServicePackageStationTierEnabled(serviceId, tierInstanceId, tierId, enabled);
      if (res.success) {
        // Authoritative occupant status, marker, drafts, and module statuses —
        // patch the response, never a synthetic slot.enabled.
        setDetail(prev => prev ? {
          ...prev,
          station: {
            ...prev.station,
            platform_status: res.platform_status ?? prev.station.platform_status,
            tiers: {
              ...prev.station.tiers,
              [tierId]: normTier({ ...res.tier, drafts: res.drafts, module_status: res.module_status }),
            },
          },
        } : prev);
        onRefresh?.();
      }
      return res.success;
    } catch { return false; } finally { setSaving(false); }
  }, [serviceId, tierInstanceId, onRefresh]);

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
    if (tierInstanceId === null) return null;
    setSaving(true);
    try {
      const res = await archiveServicePackageStationTierOccupant(serviceId, tierInstanceId, tierId, discardDrafts);
      if (res.success) { patchTravel(res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, tierInstanceId, onRefresh, patchTravel]);

  const restoreOccupant = useCallback(async (
    binId: string,
    opts: { mode?: 'swap' | 'retarget'; targetTier?: string; discardDrafts?: boolean } = {},
  ) => {
    if (tierInstanceId === null) return null;
    setSaving(true);
    try {
      const res = await restoreServicePackageStationBinEntry(serviceId, tierInstanceId, binId, opts);
      if (res.success) { patchTravel(res); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, tierInstanceId, onRefresh, patchTravel]);

  const trashBinEntry = useCallback(async (binId: string) => {
    if (tierInstanceId === null) return null;
    setSaving(true);
    try {
      const res = await trashServicePackageStationBinEntry(serviceId, tierInstanceId, binId);
      if (res.success) { patchBin(res.occupant_bin); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, tierInstanceId, onRefresh, patchBin]);

  const deleteBinEntry = useCallback(async (binId: string) => {
    if (tierInstanceId === null) return null;
    setSaving(true);
    try {
      const res = await deleteServicePackageStationBinEntry(serviceId, tierInstanceId, binId);
      if (res.success) { patchBin(res.occupant_bin); onRefresh?.(); }
      return res;
    } catch { return null; } finally { setSaving(false); }
  }, [serviceId, tierInstanceId, onRefresh, patchBin]);

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
    tierOccupants,
    resolveOccupantSlot,
    tierView,
    saveTierOverview,
    saveTierFeatures,
    saveTierFaqs,
    revertTierModule,
    settleTier,
    setPopularTier,
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
