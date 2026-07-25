// TierInclusionDrawerHost — the ADMIN STATION host adapter for the Inclusion
// drawer.
//
// As thin as TierDrawerHost, and for the same reason: it maps DrawerContentProps
// onto the neutral EntityDrawerHostBridge, unwraps the Package-owned routing
// token into its native identities, and mounts the composition. Resolution,
// editing, validation, persistence and refresh all belong to that composition
// and to Package Station; none of it is reimplemented here, and Admin Station
// saves nothing.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import { TierInclusionDrawerContent } from '../../drawer/inclusion/TierInclusionDrawerContent';
import { decodeTierInclusionDrawerRecordId } from '../../drawer/inclusion/tierInclusionDrawerTypes';
import { useHostService } from './useHostService';

export function TierInclusionDrawerHost({
  recordId,
  mode,
  onClose,
  onSaved,
  setFooter,
  setCloseGuard,
}: DrawerContentProps): VNode {
  const host = useHostService();

  const closeRef  = useRef(onClose);       closeRef.current  = onClose;
  const footerRef = useRef(setFooter);     footerRef.current = setFooter;
  const guardRef  = useRef(setCloseGuard); guardRef.current  = setCloseGuard;
  const savedRef  = useRef(onSaved);       savedRef.current  = onSaved;

  const bridge = useMemo<EntityDrawerHostBridge>(() => ({
    close:         () => closeRef.current(),
    setFooter:     (footer) => footerRef.current?.(footer),
    setCloseGuard: (guard)  => guardRef.current?.(guard),
    // The composition's own usePackageStation patches itself after a mutation;
    // this refreshes the wall the drawer was opened from, and only that wall.
    onMutationComplete: () => savedRef.current(),
  }), []);

  const target = typeof recordId === 'string' ? decodeTierInclusionDrawerRecordId(recordId) : null;
  if (target === null) {
    return <div class="cz-station-drawer__state">This inclusion identity is invalid.</div>;
  }

  if (host.loading && !host.service) return <div class="cz-station-drawer__state">Loading inclusion…</div>;
  if (host.error)                    return <div class="cz-station-drawer__state">{host.error}</div>;
  if (!host.service)                 return <div class="cz-station-drawer__state">No package station is available.</div>;

  return (
    <TierInclusionDrawerContent
      serviceId={host.service.id}
      tierInstanceId={target.instanceId}
      slotId={target.slotId}
      itemId={target.itemId}
      initialEdit={mode === 'edit'}
      bridge={bridge}
    />
  );
}
