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
import { TierRegistrationHost } from './TierRegistrationHost';
import { TierInstanceSettingsHost } from './TierInstanceSettingsHost';
import { useHostService } from './useHostService';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import { PRIMARY_TIER_INSTANCE_ID } from '../../vocabulary';
import {
  decodeTierDrawerRecordId,
  decodeTierInstanceDrawerRecordId,
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
  setHeaderHidden,
}: DrawerContentProps): VNode {
  const host = useHostService();

  const closeRef  = useRef(onClose);         closeRef.current  = onClose;
  const footerRef = useRef(setFooter);       footerRef.current = setFooter;
  const guardRef  = useRef(setCloseGuard);   guardRef.current  = setCloseGuard;
  const headerRef = useRef(setHeaderHidden); headerRef.current = setHeaderHidden;
  const savedRef  = useRef(onSaved);         savedRef.current  = onSaved;

  const bridge = useMemo<EntityDrawerHostBridge>(() => ({
    close:         () => closeRef.current(),
    setFooter:     (footer) => footerRef.current?.(footer),
    setCloseGuard: (guard)  => guardRef.current?.(guard),
    setHeaderHidden: (hidden) => headerRef.current?.(hidden),
    // The composition's own usePackageStation reloads itself after a mutation;
    // this refreshes the wall the drawer was opened from, and only that wall.
    onMutationComplete: () => savedRef.current(),
  }), []);

  if (typeof recordId !== 'string') {
    return <div class="cz-station-drawer__state">This tier identity is invalid.</div>;
  }
  // Registration addresses no record, so it is resolved before any identity is
  // decoded and never falls through to the occupant fallback below. It reads the
  // Family collection rather than the host Service, in its own host so that read
  // stays out of every ordinary slot and occupant open.
  const registrationTarget = decodeTierRegistrationRecordId(recordId);
  if (registrationTarget !== null) {
    return (
      <TierRegistrationHost initialFamilyId={registrationTarget.familyId} bridge={bridge} />
    );
  }
  const slotTarget = decodeTierSlotDrawerRecordId(recordId);
  const instanceTarget = decodeTierInstanceDrawerRecordId(recordId);
  const occupantTarget = decodeTierDrawerRecordId(recordId);
  if (recordId.startsWith('tier-slot:') && slotTarget === null) {
    return <div class="cz-station-drawer__state">This Tier slot identity is invalid.</div>;
  }
  if (recordId.startsWith('tier-instance:') && instanceTarget === null && occupantTarget === null) {
    return <div class="cz-station-drawer__state">This Tier identity is invalid.</div>;
  }
  const target = occupantTarget ?? {
    instanceId: PRIMARY_TIER_INSTANCE_ID,
    occupantId: recordId,
  };

  if (host.loading && !host.service) return <div class="cz-station-drawer__state">Loading package tiers…</div>;
  if (host.error)                    return <div class="cz-station-drawer__state">{host.error}</div>;
  if (!host.service)                 return <div class="cz-station-drawer__state">No package station is available.</div>;

  if (instanceTarget !== null) {
    return (
      <TierInstanceSettingsHost
        serviceId={host.service.id}
        instanceId={instanceTarget.instanceId}
        bridge={bridge}
      />
    );
  }

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
      // For an existing occupant, 'edit' opens straight into the tier's Overview
      // editor once it resolves to its slot; 'view' leaves every module readable.
      //
      // An empty slot never does that, whichever mode opened it: it lands on the
      // readable Overview screen, where the empty Tier Overview module carries
      // its own Pending pill, that pill's message, and the Edit action that opens
      // this same editor — the module cycle Included Features and Common
      // Questions already follow.
      initialTierSection={mode === 'edit' && slotTarget === null ? 'tier-overview' : undefined}
      bridge={bridge}
    />
  );
}
