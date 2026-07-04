import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  fetchServicePromotionStation,
  createServicePromotion,
  saveServicePromotion,
  archiveServicePromotion,
  reactivateServicePromotion,
  createServiceInclusionPoolItem,
} from '@/api/endpoints/admin';
import type {
  ServicePromotionStationResponse,
  ServicePromotionSaveResponse,
  PromotionTier,
  PromotionTierPayload,
  PromotionStatus,
  InclusionItem,
} from '@/api/types/admin';

// ── usePromotionStation ──────────────────────────────────────────────────────
//
// Sibling station hook to usePackageStation — NOT part of it. Promotion Station
// (cz_service_promotion_station) is a flat, unbounded list of independent
// PromotionTier records with no draft/module_status/lifecycle layer, so this hook
// does not use stationPrimitives.ts (patchModuleDraft/patchTierModuleDraft operate
// on a { drafts, module_status } shape that promotions don't have). Patching is a
// plain id-keyed array find/replace, mirroring the same shape usePackageStation
// already uses for its inclusion/faq pool arrays.
//
// P1: lands unused. No component consumes it yet; ServicePromotionStep still uses
// useApi. Nothing here changes runtime behaviour.

export interface PromotionStation {
  detail:       ServicePromotionStationResponse | null;
  detailLoaded: boolean;
  saving:       boolean;
  promotions:   PromotionTier[];
  service:      ServicePromotionStationResponse['service'] | null;
  createPromotion:     (payload: PromotionTierPayload) => Promise<ServicePromotionSaveResponse | null>;
  savePromotion:       (promoId: string, payload: PromotionTierPayload) => Promise<ServicePromotionSaveResponse | null>;
  archivePromotion:    (promoId: string) => Promise<boolean>;
  reactivatePromotion: (promoId: string) => Promise<boolean>;
  createInclusion:     (label: string) => Promise<InclusionItem | null>;
  refetch:      () => void;
}

export function usePromotionStation(serviceId: number, onRefresh?: () => void): PromotionStation {
  const [detail, setDetail]             = useState<ServicePromotionStationResponse | null>(null);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const [saving, setSaving]             = useState(false);

  const load = useCallback(() => {
    setDetailLoaded(false);
    fetchServicePromotionStation(serviceId)
      .then(res => setDetail(res.success ? res : null))
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

  const createPromotion = useCallback(async (payload: PromotionTierPayload) => {
    setSaving(true);
    try {
      const res = await createServicePromotion(serviceId, payload);
      if (res.success) {
        setDetail(prev => prev ? { ...prev, promotions: [...prev.promotions, res.promotion_tier] } : prev);
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
          promotions: prev.promotions.map(p => p.id === promoId ? res.promotion_tier : p),
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
    createInclusion,
    refetch: load,
  };
}
