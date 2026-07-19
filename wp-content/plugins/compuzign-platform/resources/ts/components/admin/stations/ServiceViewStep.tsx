// ServiceViewStep — the OLD Command Centre host adapter for the Service drawer.
//
// Once a ~1000-line god file; now a thin translator. It reads the ActionShell
// StepContext handoff, maps StepContext to the neutral EntityDrawerHostBridge,
// and mounts the reusable ServiceDrawerContent composition (which owns the whole
// Service drawer: modules, status pills, notifications, module footers, inline
// editors, lifecycle, and guarded exit). All that behaviour moved to
// service-drawer/ and is now shared, not host-owned.
//
// The re-exports below are kept because ServiceCatalogstation imports these
// helpers from this module; they live in serviceDrawerShared.

import { useMemo, useRef } from 'preact/hooks';
import type { StepContext } from '../ActionShell';
import type { Category, ServiceItem } from '@/api/types/cost-builder';
import type { SurfacePackageSummary } from '@/api/types/admin';
import type { DrawerTabId } from '../DrawerTabs';
import type { EntityDrawerHostBridge } from './entityDrawerHost';
import { ServiceDrawerContent } from './service-drawer/ServiceDrawerContent';
import { decodeHtml, TIER_KEYS, TIER_LABELS } from './serviceDrawerShared';

export { decodeHtml, TIER_KEYS, TIER_LABELS };

export function ServiceViewStep({ ctx }: { ctx: StepContext }) {
  const service       = ctx.stepData.service       as ServiceItem;
  const packages      = ctx.stepData.packages      as SurfacePackageSummary[];
  const allCategories = (ctx.stepData.allCategories as Category[]) ?? [];
  const initialTab    = ctx.stepData.initialTab    as DrawerTabId | undefined;
  const initialEdit   = ctx.stepData.initialEdit   as boolean | undefined;

  // Stable bridge that always calls the latest StepContext methods, so the
  // composition's guard/footer effects do not re-fire on unrelated host churn.
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const onRefreshRef = useRef(ctx.stepData.onRefresh as (() => void) | undefined);
  onRefreshRef.current = ctx.stepData.onRefresh as (() => void) | undefined;

  const bridge = useMemo<EntityDrawerHostBridge>(() => ({
    close:              () => ctxRef.current.close(),
    setFooter:          (footer) => ctxRef.current.setFooter(footer),
    setCloseGuard:      (guard) => ctxRef.current.setCloseGuard(guard),
    onMutationComplete: () => onRefreshRef.current?.(),
  }), []);

  return (
    <ServiceDrawerContent
      service={service}
      packages={packages}
      allCategories={allCategories}
      initialTab={initialTab}
      initialEdit={initialEdit}
      bridge={bridge}
    />
  );
}
