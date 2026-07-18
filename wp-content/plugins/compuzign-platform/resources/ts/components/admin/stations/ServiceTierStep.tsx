// ServiceTierStep — the OLD Command Centre host adapter for the Tier drawer.
//
// Once a ~1040-line god file; now a thin translator. It reads the ActionShell
// StepContext handoff, maps StepContext to the neutral EntityDrawerHostBridge,
// and mounts the reusable TierDrawerContent composition (which owns the whole
// Package Station tier drawer: package overview, individual-tier modules, the
// occupant bin lifecycle, inline editors, and guarded exit). All that behaviour
// moved to tier-drawer/ and is now shared, not host-owned.

import { useMemo, useRef } from 'preact/hooks';
import type { StepContext } from '../ActionShell';
import type { ServiceItem } from '@/api/types/cost-builder';
import type { EntityDrawerHostBridge } from './entityDrawerHost';
import { TierDrawerContent } from './tier-drawer/TierDrawerContent';

export function ServiceTierStep({ ctx }: { ctx: StepContext }) {
  const serviceId          = ctx.stepData.serviceId          as number;
  const serviceItem        = ctx.stepData.service            as ServiceItem | undefined;
  const serviceBack        = ctx.stepData.serviceBack        as (() => void) | undefined;
  const tierBack           = ctx.stepData.tierBack           as { current: (() => void) | null } | undefined;
  const initialTierId      = ctx.stepData.initialTierId      as string | undefined;
  const initialOccupantId  = ctx.stepData.initialOccupantId  as string | undefined;
  const initialTierSection = ctx.stepData.initialTierSection as 'tier-overview' | undefined;

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
    <TierDrawerContent
      serviceId={serviceId}
      service={serviceItem}
      serviceBack={serviceBack}
      tierBack={tierBack}
      initialTierId={initialTierId}
      initialOccupantId={initialOccupantId}
      initialTierSection={initialTierSection}
      bridge={bridge}
    />
  );
}
