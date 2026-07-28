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
//
// `tier-instance:new[:familyId]` addresses no instance at all — there is
// nothing to resolve yet, so it mounts TierCreateContent instead. That
// composition's own footer is this record's one authoritative creation; once
// it succeeds this host remembers the real instance+occupant identity in local
// state and mounts the ordinary, unmodified TierDrawerContent from then on —
// the SAME hand-off a stable card identity gets on any other record.

import { useMemo, useRef, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { TierCreateContent } from '../../drawer/tier/TierCreateContent';
import type { TierCreateResult } from '../../drawer/tier/useTierCreate';
import { TierDrawerContent } from '../../drawer/tier/TierDrawerContent';
import { TierInstanceSettingsHost } from './TierInstanceSettingsHost';
import { useHostService } from './useHostService';
import type { DrawerContentProps } from '@/station-manager/drawerTypes';
import { PRIMARY_TIER_INSTANCE_ID } from '../../vocabulary';
import {
  decodeTierDrawerRecordId,
  decodeTierInstanceCreateRecordId,
  decodeTierInstanceDrawerRecordId,
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
  const [createdTarget, setCreatedTarget] = useState<TierCreateResult | null>(null);

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
  const createTarget = createdTarget === null ? decodeTierInstanceCreateRecordId(recordId) : null;
  const slotTarget = decodeTierSlotDrawerRecordId(recordId);
  const instanceTarget = createTarget === null ? decodeTierInstanceDrawerRecordId(recordId) : null;
  const occupantTarget = createTarget === null ? decodeTierDrawerRecordId(recordId) : null;
  if (recordId.startsWith('tier-slot:') && slotTarget === null) {
    return <div class="cz-station-drawer__state">This Tier slot identity is invalid.</div>;
  }
  if (recordId.startsWith('tier-instance:') && createTarget === null && instanceTarget === null && occupantTarget === null && createdTarget === null) {
    return <div class="cz-station-drawer__state">This Tier identity is invalid.</div>;
  }
  const target = occupantTarget ?? {
    instanceId: PRIMARY_TIER_INSTANCE_ID,
    occupantId: recordId,
  };

  if (host.loading && !host.service) return <div class="cz-station-drawer__state">Loading package tiers…</div>;
  if (host.error)                    return <div class="cz-station-drawer__state">{host.error}</div>;
  if (!host.service)                 return <div class="cz-station-drawer__state">No package station is available.</div>;

  if (createdTarget !== null) {
    return (
      <TierDrawerContent
        serviceId={host.service.id}
        tierInstanceId={createdTarget.instanceId}
        // The hand-off knows the fixed SLOT it just settled, not a resolved
        // occ_… id — the same address an empty-slot open already uses.
        initialTierId={createdTarget.occupantId}
        bridge={bridge}
      />
    );
  }

  if (createTarget !== null) {
    return (
      <TierCreateContent
        serviceId={host.service.id}
        pendingFamilyId={createTarget.familyId}
        bridge={bridge}
        onCreated={setCreatedTarget}
      />
    );
  }

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
