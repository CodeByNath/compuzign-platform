// Service lifecycle actions — advance the drawer's local record from the
// authoritative station's lifecycle results.
//
// Each handler awaits a station mutation and folds the response into the local
// ServiceItem (platform/module status, settled fields), replacing the old host's
// ctx.setStepData('service', …). Terminal actions (archive/trash) close through
// the guard bypass so the exit dialog can never re-block a record that was just
// removed from the surface.

import { useCallback } from 'preact/hooks';
import type { ServiceItem, PlatformStatus } from '@/api/types/cost-builder';
import type { ServiceStation } from '@/admin-station/stations/service';

type SetService = (updater: (prev: ServiceItem) => ServiceItem) => void;

export interface ServiceLifecycleArgs {
  station:             ServiceStation;
  setService:          SetService;
  closeBypassingGuard: () => void;
  // Collapse the footer's split dropdown before a destructive action runs.
  closeSplit: () => void;
}

export function useServiceLifecycle({ station, setService, closeBypassingGuard, closeSplit }: ServiceLifecycleArgs) {
  const { toggleActive, archiveStation, trashStation, settleModules, publishService } = station;

  const handleToggleActive = useCallback(async () => {
    const result = await toggleActive();
    if (result) {
      setService((prev) => ({
        ...prev,
        meta: { ...prev.meta, platform_status: result.platform_status as PlatformStatus, module_status: result.module_status as any },
      }));
    }
  }, [toggleActive, setService]);

  const handleSettleModules = useCallback(async () => {
    const result = await settleModules();
    if (result) {
      setService((prev) => ({
        ...prev,
        title:      result.service.title,
        excerpt:    result.service.excerpt,
        content:    result.service.content,
        categories: result.service.categories,
        inclusions: result.inclusions,
        faqs:       result.faqs,
      }));
    }
  }, [settleModules, setService]);

  const handlePublishService = useCallback(async () => {
    const result = await publishService();
    if (result) {
      setService((prev) => ({
        ...prev,
        ...(result.settled && result.service ? {
          title:      result.service.title,
          excerpt:    result.service.excerpt,
          content:    result.service.content,
          categories: result.service.categories,
          inclusions: result.inclusions ?? prev.inclusions,
          faqs:       result.faqs ?? prev.faqs,
        } : {}),
        meta: { ...prev.meta, platform_status: result.platform_status as PlatformStatus, module_status: result.module_status as any },
      }));
    }
  }, [publishService, setService]);

  const handleArchive = useCallback(async () => {
    closeSplit();
    const result = await archiveStation();
    if (result) closeBypassingGuard();
  }, [archiveStation, closeBypassingGuard, closeSplit]);

  const handleTrash = useCallback(async () => {
    closeSplit();
    const result = await trashStation();
    if (result) closeBypassingGuard();
  }, [trashStation, closeBypassingGuard, closeSplit]);

  return { handleToggleActive, handleSettleModules, handlePublishService, handleArchive, handleTrash };
}

export type ServiceLifecycle = ReturnType<typeof useServiceLifecycle>;
