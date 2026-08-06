// Scoped Tier Edition drawer contracts.
//
// A Tier Edition is an independently addressed, independently lifecycled
// child record of ONE occupant — not opened on the parent Tier's own terms.
// The routing token carries the whole authoritative address Package Station
// already stores, the same convention tier-rate-sheet:{...} already uses
// for a Tier's OWN connection to a sheet:
//
//   tier-edition:{tier_instance_id}:{slotId}:{editionId}
//
// `slotId` — not occupant_id — addresses which shell currently holds the
// owning occupant, matching every other focused-Tier connection token
// (tier-rate-sheet, tier-inclusion). The Edition's own identity (`editionId`,
// its minted edt_… id) is carried rather than re-derived, so the drawer can
// verify the addressed occupant still owns the addressed Edition and fail
// closed when it does not — the same discipline tier-rate-sheet already
// applies to a Tier/sheet binding.

const PREFIX = 'tier-edition:';
const FIXED_TIER_SLOTS = new Set(['basic', 'standard', 'premium', 'enterprise', 'ultimate']);

export interface TierEditionDrawerTarget {
  instanceId: string;
  slotId:     string;
  editionId:  string;
}

/** Package-owned routing token for one Tier Edition's own scoped lifecycle drawer. */
export function encodeTierEditionDrawerRecordId(
  instanceId: string,
  slotId: string,
  editionId: string,
): string {
  return `${PREFIX}${instanceId}:${slotId}:${editionId}`;
}

export function decodeTierEditionDrawerRecordId(recordId: string): TierEditionDrawerTarget | null {
  if (!recordId.startsWith(PREFIX)) return null;
  const [instanceId, slotId, editionId, ...extra] = recordId.slice(PREFIX.length).split(':');
  return instanceId && FIXED_TIER_SLOTS.has(slotId) && editionId && extra.length === 0
    ? { instanceId, slotId, editionId }
    : null;
}
