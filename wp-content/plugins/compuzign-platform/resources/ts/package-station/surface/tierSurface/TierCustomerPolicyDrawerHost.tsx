// TierCustomerPolicyDrawerHost — the ADMIN STATION host adapter for the
// Customer Selection Rules drawer.
//
// As thin as TierInclusionDrawerHost, and for the same reason: it maps
// DrawerContentProps onto the neutral EntityDrawerHostBridge, unwraps the
// Package-owned routing token into its native identity, and mounts the
// composition. Resolution, editing, validation, persistence and refresh all
// belong to that composition and to Package Station; none of it is
// reimplemented here, and Admin Station saves nothing.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import { TierCustomerPolicyDrawerContent } from '../../drawer/customerPolicy/TierCustomerPolicyDrawerContent';
import { decodeTierCustomerPolicyDrawerRecordId } from '../../drawer/customerPolicy/tierCustomerPolicyDrawerTypes';
import { useHostService } from './useHostService';

export function TierCustomerPolicyDrawerHost({
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
    onMutationComplete: () => savedRef.current(),
  }), []);

  const target = typeof recordId === 'string' ? decodeTierCustomerPolicyDrawerRecordId(recordId) : null;
  if (target === null) {
    return <div class="cz-station-drawer__state">This Customer Selection Rules identity is invalid.</div>;
  }

  if (host.loading && !host.service) return <div class="cz-station-drawer__state">Loading Customer Selection Rules…</div>;
  if (host.error)                    return <div class="cz-station-drawer__state">{host.error}</div>;
  if (!host.service)                 return <div class="cz-station-drawer__state">No package station is available.</div>;

  return (
    <TierCustomerPolicyDrawerContent
      serviceId={host.service.id}
      tierInstanceId={target.instanceId}
      initialEdit={mode === 'edit'}
      bridge={bridge}
    />
  );
}
