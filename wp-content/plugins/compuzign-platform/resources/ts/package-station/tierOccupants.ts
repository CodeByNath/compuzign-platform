import { COMPOSABLE_TIER_ID } from './vocabulary';

type OccupantIdentified = { occupant_id: string | null };

export interface TierOccupant<T extends OccupantIdentified = OccupantIdentified> {
  occupantId: string;
  slotId: string;
  detail: T;
}

/**
 * Project the fixed internal tier shells into the dynamic Admin occupant list.
 * Empty shells have no occupant id and are deliberately omitted. Object entry
 * order preserves the station response's existing shell/sort order.
 */
export function deriveTierOccupants<T extends OccupantIdentified>(
  tiers: Record<string, T>,
): TierOccupant<T>[] {
  return Object.entries(tiers).flatMap(([slotId, detail]) => detail.occupant_id
    ? [{ occupantId: detail.occupant_id, slotId, detail }]
    : []);
}

export function resolveTierOccupantSlot<T extends OccupantIdentified>(
  tiers: Record<string, T>,
  occupantId: string,
): string | null {
  return deriveTierOccupants(tiers).find((occupant) => occupant.occupantId === occupantId)?.slotId ?? null;
}

/**
 * Same resolution, plus the one location `tiers` deliberately omits: the
 * subordinate composable occupant. It is never in `tiers`/`deriveTierOccupants`
 * (never a sixth slot), so a generic occupant_id -> address lookup has to
 * check it as a fourth location — the same identity-adapter gap already
 * fixed on the PHP side for PackageRepository's locate/claim/exists
 * functions. Extracted here (rather than inlined in usePackageStation's
 * callback) so the composable-occupant-workspace contract can exercise it
 * directly. Exported for that contract.
 */
export function resolveOccupantSlotIncludingComposable<T extends OccupantIdentified>(
  station: { tiers: Record<string, T>; composable_occupant?: T | null },
  occupantId: string,
): string | null {
  if (station.composable_occupant?.occupant_id === occupantId) return COMPOSABLE_TIER_ID;
  return resolveTierOccupantSlot(station.tiers, occupantId);
}
