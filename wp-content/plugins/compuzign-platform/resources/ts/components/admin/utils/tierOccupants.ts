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
