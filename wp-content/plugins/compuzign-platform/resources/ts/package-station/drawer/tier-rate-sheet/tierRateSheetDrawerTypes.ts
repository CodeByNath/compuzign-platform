// Focused-Tier Rate Sheet drawer contracts.
//
// Identity: neither a Rate Sheet nor one of its groups is opened here on its own
// terms. What these drawers open is ONE TIER'S CONNECTION to a sheet, or to one
// group inside it, so the routing tokens carry the whole authoritative address
// Package Station already stores:
//
//   tier-rate-sheet:{tier_instance_id}:{slotId}:{rate_sheet_id}
//   tier-rate-sheet-group:{tier_instance_id}:{slotId}:{rate_sheet_id}:{group_id}
//
// `slotId` — not occupant_id — because the slot is the key the Tier's own
// features module already addresses, matching the Inclusion drawer. The sheet id
// is carried rather than re-derived so the drawer can verify that the addressed
// Tier still binds the addressed sheet and fail closed when it does not. Row
// identity stays `(rate_sheet_id, item_id)`; no sheet is scanned and no group is
// resolved by label.

/** What the drawer is scoped to inside the addressed sheet. */
export type TierRateSheetScope =
  | { kind: 'sheet' }
  | { kind: 'group'; groupId: string };

export interface TierRateSheetDrawerTarget {
  instanceId:  string;
  slotId:      string;
  rateSheetId: string;
  scope:       TierRateSheetScope;
}

const SHEET_PREFIX = 'tier-rate-sheet:';
const GROUP_PREFIX = 'tier-rate-sheet-group:';
const FIXED_TIER_SLOTS = new Set(['basic', 'standard', 'premium', 'enterprise', 'ultimate']);

/** Package-owned routing token for the focused Tier's whole Rate Sheet connection. */
export function encodeTierRateSheetDrawerRecordId(
  instanceId: string,
  slotId: string,
  rateSheetId: string,
): string {
  return `${SHEET_PREFIX}${instanceId}:${slotId}:${rateSheetId}`;
}

/** Package-owned routing token for one group inside that connection. */
export function encodeTierRateSheetGroupDrawerRecordId(
  instanceId: string,
  slotId: string,
  rateSheetId: string,
  groupId: string,
): string {
  return `${GROUP_PREFIX}${instanceId}:${slotId}:${rateSheetId}:${groupId}`;
}

export function decodeTierRateSheetDrawerRecordId(recordId: string): TierRateSheetDrawerTarget | null {
  // The group prefix is not a prefix of the sheet prefix (`-` versus `:`), so the
  // two grammars can never be confused for one another.
  if (recordId.startsWith(GROUP_PREFIX)) {
    const [instanceId, slotId, rateSheetId, groupId, ...extra] = recordId.slice(GROUP_PREFIX.length).split(':');
    return instanceId && FIXED_TIER_SLOTS.has(slotId) && rateSheetId && groupId && extra.length === 0
      ? { instanceId, slotId, rateSheetId, scope: { kind: 'group', groupId } }
      : null;
  }
  if (recordId.startsWith(SHEET_PREFIX)) {
    const [instanceId, slotId, rateSheetId, ...extra] = recordId.slice(SHEET_PREFIX.length).split(':');
    return instanceId && FIXED_TIER_SLOTS.has(slotId) && rateSheetId && extra.length === 0
      ? { instanceId, slotId, rateSheetId, scope: { kind: 'sheet' } }
      : null;
  }
  return null;
}
