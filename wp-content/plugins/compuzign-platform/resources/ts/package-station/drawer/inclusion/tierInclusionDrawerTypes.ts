// Neutral Tier Inclusion drawer contracts.
//
// Like the Tier drawer, this composition is host-agnostic: it receives the
// identities usePackageStation needs plus an EntityDrawerHostBridge, and
// imports no host.
//
// Identity: an inclusion is not addressable on its own. What the drawer opens
// is ONE TIER'S USE of one Rate Sheet row, so the routing token carries the
// full authoritative address Package Station already owns:
//
//   (tier_instance_id, slotId, item_id)
//
// `item_id` is the Rate Sheet row id the Tier selected; row identity is
// (rate_sheet_id, item_id) and the sheet comes from the addressed slot's own
// binding, so the row is never guessed by label and no other sheet is scanned.
// `slotId` — not occupant_id — because the slot is the mutation key the
// features module already uses.

import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { COMPOSABLE_TIER_ID } from '../../vocabulary';

export interface TierInclusionDrawerContentProps {
  // Service id is navigation context for the Package-owned endpoint.
  serviceId: number;
  // Capability-instance identity, independent of slot/occupant identity.
  tierInstanceId: string;
  // The fixed Tier slot whose use of the inclusion this drawer shows.
  slotId: string;
  // The Rate Sheet row id the Tier selected.
  itemId: string;
  // Opening intent carried from the row that dispatched the drawer.
  initialEdit?: boolean;
  // The host seam.
  bridge: EntityDrawerHostBridge;
}

const TIER_INCLUSION_DRAWER_RECORD_PREFIX = 'tier-inclusion:';
// Admin UX restructuring: the composable occupant's own focused view now
// reuses this same Details lane, so its sentinel slot id must decode here
// too — the same gap class Phase 1C already closed for tierDrawerTypes.ts's
// own FIXED_TIER_SLOTS and usePackageStation.resolveOccupantSlot().
const FIXED_TIER_SLOTS = new Set(['basic', 'standard', 'premium', 'enterprise', 'ultimate', COMPOSABLE_TIER_ID]);

export interface TierInclusionDrawerTarget {
  instanceId: string;
  slotId:     string;
  itemId:     string;
}

/** Package-owned routing token. The row keeps its own native item_id. */
export function encodeTierInclusionDrawerRecordId(
  instanceId: string,
  slotId: string,
  itemId: string,
): string {
  return `${TIER_INCLUSION_DRAWER_RECORD_PREFIX}${instanceId}:${slotId}:${itemId}`;
}

export function decodeTierInclusionDrawerRecordId(recordId: string): TierInclusionDrawerTarget | null {
  if (!recordId.startsWith(TIER_INCLUSION_DRAWER_RECORD_PREFIX)) return null;
  const [instanceId, slotId, itemId, ...extra] = recordId
    .slice(TIER_INCLUSION_DRAWER_RECORD_PREFIX.length)
    .split(':');
  return instanceId && FIXED_TIER_SLOTS.has(slotId) && itemId && extra.length === 0
    ? { instanceId, slotId, itemId }
    : null;
}
