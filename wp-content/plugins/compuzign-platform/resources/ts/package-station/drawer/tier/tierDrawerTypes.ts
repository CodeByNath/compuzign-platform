// Neutral Tier drawer contracts.
//
// Like the Service drawer, the Tier drawer composition is host-agnostic: it
// receives the instance and record inputs usePackageStation needs plus an
// EntityDrawerHostBridge, and imports neither host. The Command Centre and Admin
// Station adapters resolve these inputs from their respective routing state.

import type { ServiceItem } from '@/api/types/cost-builder';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';

export interface TierDrawerContentProps {
  // Service id is navigation context for the Package-owned endpoint.
  serviceId: number;
  // Capability-instance identity is independent of the occupant/slot identity.
  tierInstanceId: string;
  // Richer parent service (more than the station stub) for the Connections tab.
  service?: ServiceItem;
  // Return-to-Service navigation, wired to the service-overview connection View.
  serviceBack?: () => void;
  // Context-aware header Back handle: the composition points it at
  // "back to package overview" while a tier is open, and clears it otherwise, so
  // the host's single header Back can fall through to the Service drawer. Old
  // host passes its ref; a host without a shared header Back omits it.
  tierBack?: { current: (() => void) | null };
  // Opening intent carried from the card that dispatched the drawer.
  initialTierId?:      string;
  initialOccupantId?:  string;
  initialTierSection?: 'tier-overview';
  // The host seam.
  bridge: EntityDrawerHostBridge;
}

// Which individual-tier module is being edited (null = every module readable).
export type TierEditingSection = 'tier-overview' | 'tier-inclusions' | 'tier-faqs' | null;

// A binned-occupant restore conflict, keyed by the engine's D3 error codes.
export interface TierBinPrompt {
  binId:       string;
  code:        'target_occupied' | 'origin_unknown' | 'pending_drafts';
  mode?:       'swap' | 'retarget';
  targetTier?: string;
}

const TIER_DRAWER_RECORD_PREFIX = 'tier-instance:';
const TIER_SLOT_DRAWER_RECORD_PREFIX = 'tier-slot:';
const TIER_REGISTRATION_RECORD_PREFIX = 'tier-register:';
const FIXED_TIER_SLOTS = new Set(['basic', 'standard', 'premium', 'enterprise', 'ultimate']);

/** Package-owned routing token; the card itself keeps occupant_id identity. */
export function encodeTierDrawerRecordId(instanceId: string, occupantId: string): string {
  return `${TIER_DRAWER_RECORD_PREFIX}${instanceId}:${occupantId}`;
}

export function decodeTierDrawerRecordId(
  recordId: string,
): { instanceId: string; occupantId: string } | null {
  if (!recordId.startsWith(TIER_DRAWER_RECORD_PREFIX)) return null;
  const [instanceId, occupantId, ...extra] = recordId.slice(TIER_DRAWER_RECORD_PREFIX.length).split(':');
  return instanceId && occupantId && extra.length === 0 ? { instanceId, occupantId } : null;
}

/** Empty-slot route. Slot identity must never be encoded as occupant identity. */
export function encodeTierSlotDrawerRecordId(instanceId: string, slotId: string): string {
  return `${TIER_SLOT_DRAWER_RECORD_PREFIX}${instanceId}:${slotId}`;
}

export function decodeTierSlotDrawerRecordId(
  recordId: string,
): { instanceId: string; slotId: string } | null {
  if (!recordId.startsWith(TIER_SLOT_DRAWER_RECORD_PREFIX)) return null;
  const [instanceId, slotId, ...extra] = recordId.slice(TIER_SLOT_DRAWER_RECORD_PREFIX.length).split(':');
  return instanceId && FIXED_TIER_SLOTS.has(slotId) && extra.length === 0
    ? { instanceId, slotId }
    : null;
}

/**
 * Registration route. There is no Tier system yet, so this token addresses no
 * instance — it carries only the Package Family the caller already had in hand,
 * which the form pre-selects. An empty family segment means none was offered,
 * not that one failed to resolve; a Tier system may be registered standalone.
 */
export function encodeTierRegistrationRecordId(familyId: string | null): string {
  return `${TIER_REGISTRATION_RECORD_PREFIX}${familyId ?? ''}`;
}

export function decodeTierRegistrationRecordId(
  recordId: string,
): { familyId: string | null } | null {
  if (!recordId.startsWith(TIER_REGISTRATION_RECORD_PREFIX)) return null;
  const [familyId, ...extra] = recordId.slice(TIER_REGISTRATION_RECORD_PREFIX.length).split(':');
  return extra.length === 0 ? { familyId: familyId || null } : null;
}
