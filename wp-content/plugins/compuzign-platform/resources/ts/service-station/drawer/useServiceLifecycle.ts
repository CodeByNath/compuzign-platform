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
import type { ServiceStation } from '@/service-station';

// Nullable: a pending Service (no backing post yet) has no ServiceItem to
// update, but every handler below only ever runs once the record is real
// (guarded by the `isNew` checks in this file and the controller's own
// pending-create branch), so `prev` is only theoretically nullable here.
type SetService = (updater: (prev: ServiceItem | null) => ServiceItem | null) => void;

export interface ServiceLifecycleArgs {
  station:             ServiceStation;
  setService:          SetService;
  closeBypassingGuard: () => void;
  // Collapse the footer's split dropdown before a destructive action runs.
  closeSplit: () => void;
}

export function useServiceLifecycle({ station, setService, closeBypassingGuard, closeSplit }: ServiceLifecycleArgs) {
  const { toggleActive, archiveStation, trashStation, settleModules, publishService, isNew } = station;

  const handleToggleActive = useCallback(async () => {
    const result = await toggleActive();
    if (result) {
      setService((prev) => prev && ({
        ...prev,
        meta: { ...prev.meta, platform_status: result.platform_status as PlatformStatus, module_status: result.module_status as any },
      }));
    }
  }, [toggleActive, setService]);

  const handleSettleModules = useCallback(async () => {
    const result = await settleModules();
    if (result) {
      setService((prev) => prev && ({
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
      setService((prev) => prev && ({
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
    // Nothing is stored yet for a pending Service: discarding it is simply
    // closing, never a status write against an id that does not exist —
    // mirrors Package Family's `group_id === ''` guard on the same action.
    if (isNew) { closeBypassingGuard(); return; }
    const result = await trashStation();
    if (result) closeBypassingGuard();
  }, [trashStation, closeBypassingGuard, closeSplit, isNew]);

  return { handleToggleActive, handleSettleModules, handlePublishService, handleArchive, handleTrash };
}

export type ServiceLifecycle = ReturnType<typeof useServiceLifecycle>;
