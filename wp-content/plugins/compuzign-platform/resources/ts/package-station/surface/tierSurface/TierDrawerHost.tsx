// TierDrawerHost — the ADMIN STATION host adapter for the Tier drawer.
//
// The counterpart to the Command Centre's ServiceTierStep, and just as thin. It
// maps DrawerContentProps onto the neutral EntityDrawerHostBridge and mounts the
// SAME TierDrawerContent composition. The two-level navigation (package overview
// ↔ individual tier), the module editors and footers, the occupant bin with its
// archive / restore / swap / retarget / pending-draft conflict resolution, the
// popular-tier and enable-disable actions, publish and the guarded exit all come
// from that composition — none of it is reimplemented here.
//
// Identity: `recordId` is the occupant_id the card carried, a string. It is
// passed straight through as `initialOccupantId`; the composition re-resolves
// the fixed slot from it once the station loads. Nothing is converted.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { TierDrawerContent } from '@/entity-drawers/tier/TierDrawerContent';
import { useHostService } from './useHostService';
import type { DrawerContentProps } from '@/admin-station/stations/drawers/drawerTypes';

export function TierDrawerHost({
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
    // The composition's own usePackageStation reloads itself after a mutation;
    // this refreshes the wall the drawer was opened from, and only that wall.
    onMutationComplete: () => savedRef.current(),
  }), []);

  if (typeof recordId !== 'string') {
    return <div class="cz-station-drawer__state">This tier identity is invalid.</div>;
  }

  if (host.loading && !host.service) return <div class="cz-station-drawer__state">Loading package tiers…</div>;
  if (host.error)                    return <div class="cz-station-drawer__state">{host.error}</div>;
  if (!host.service)                 return <div class="cz-station-drawer__state">No package station is available.</div>;

  return (
    <TierDrawerContent
      serviceId={host.service.id}
      // The occupant id, exactly as the card carried it. The composition
      // resolves the slot; this host never parses or re-keys it.
      initialOccupantId={recordId}
      // 'edit' opens straight into the tier's Overview editor once the occupant
      // resolves to its slot; 'view' leaves every module readable.
      initialTierSection={mode === 'edit' ? 'tier-overview' : undefined}
      bridge={bridge}
    />
  );
}
