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
// Identity: instance-aware workspace dispatch wraps either `(tier_instance_id,
// occupant_id)` or `(tier_instance_id, slotId)` in a Package-owned routing token.
// This adapter unwraps the native identities; legacy occupant-only dispatches
// explicitly address `ti_primary`. Slot and occupant ids are never substituted.

import { useMemo, useRef } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { TierDrawerContent } from '../../drawer/tier/TierDrawerContent';
import { TierRegistrationContent } from '../../drawer/tier/TierRegistrationContent';
import { useHostService } from './useHostService';
import { useTierInstances } from '../tierInstance/useTierInstances';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import { PRIMARY_TIER_INSTANCE_ID } from '../../vocabulary';
import {
  decodeTierDrawerRecordId,
  decodeTierRegistrationRecordId,
  decodeTierSlotDrawerRecordId,
} from '../../drawer/tier/tierDrawerTypes';

export function TierDrawerHost({
  recordId,
  mode,
  onClose,
  onSaved,
  setFooter,
  setCloseGuard,
}: DrawerContentProps): VNode {
  const host = useHostService();
  // The registration address has no instance to read, so its state is the Tier
  // instance collection itself — the same authority that owns the create write.
  const tierInstances = useTierInstances();

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
  // Registration addresses no record, so it is resolved before any identity is
  // decoded. It needs the Family collection rather than the host Service, and it
  // never falls through to the occupant fallback below.
  const registrationTarget = decodeTierRegistrationRecordId(recordId);
  if (registrationTarget !== null) {
    if (tierInstances.loading) {
      return <div class="cz-station-drawer__state">Loading Package Families…</div>;
    }
    return (
      <TierRegistrationContent
        tool={tierInstances}
        initialFamilyId={registrationTarget.familyId}
        bridge={bridge}
      />
    );
  }
  const slotTarget = decodeTierSlotDrawerRecordId(recordId);
  const occupantTarget = decodeTierDrawerRecordId(recordId);
  if (recordId.startsWith('tier-slot:') && slotTarget === null) {
    return <div class="cz-station-drawer__state">This Tier slot identity is invalid.</div>;
  }
  const target = occupantTarget ?? {
    instanceId: PRIMARY_TIER_INSTANCE_ID,
    occupantId: recordId,
  };

  if (host.loading && !host.service) return <div class="cz-station-drawer__state">Loading package tiers…</div>;
  if (host.error)                    return <div class="cz-station-drawer__state">{host.error}</div>;
  if (!host.service)                 return <div class="cz-station-drawer__state">No package station is available.</div>;

  return (
    <TierDrawerContent
      serviceId={host.service.id}
      tierInstanceId={slotTarget?.instanceId ?? target.instanceId}
      // Native occupant id from the routing token. The composition resolves the
      // fixed slot within target.instanceId; neither identity is re-keyed.
      initialOccupantId={slotTarget ? undefined : target.occupantId}
      // Empty fixed slots open by slot key. No occ_ identity is minted until
      // the authoritative Tier save creates a real occupant.
      initialTierId={slotTarget?.slotId}
      // 'edit' opens straight into the tier's Overview editor once the occupant
      // resolves to its slot; 'view' leaves every module readable.
      initialTierSection={mode === 'edit' ? 'tier-overview' : undefined}
      bridge={bridge}
    />
  );
}
