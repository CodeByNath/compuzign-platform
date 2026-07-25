// Pure projections for the Package-owned Tier-instance tool. Instances and
// assignments stay separate inputs throughout; no function infers or writes a
// relationship.

import type {
  PackageFamilyListItem,
  PackageRateSheet,
  TierAssignment,
  TierInstanceRecord,
} from '../../types';
import { TIER_KEYS } from '../../vocabulary';

export interface TierInstanceRow {
  instanceId:    string;
  title:         string;
  consumerId:    string | null;
  consumerName:  string;
  readiness:     'ready' | 'not-ready' | 'unassigned';
  occupantCount: number;
  binCount:      number;
  operable:      true;
}

export interface TierSlotState {
  slotId:   string;
  occupied: boolean;
  occupantId: string | null;
}

function assignmentForInstance(
  assignments: readonly TierAssignment[],
  instanceId: string,
): TierAssignment | null {
  return assignments.find((assignment) => assignment.tier_instance_id === instanceId) ?? null;
}

export function tierInstanceRows(
  instances: readonly TierInstanceRecord[],
  assignments: readonly TierAssignment[],
  families: readonly PackageFamilyListItem[],
): TierInstanceRow[] {
  const familyById = new Map(families.map((family) => [family.group_id, family]));
  return instances.map((instance) => {
    const assignment = assignmentForInstance(assignments, instance.tier_instance_id);
    const family = assignment ? familyById.get(assignment.consumer_id) ?? null : null;
    const occupantCount = TIER_KEYS.filter((slotId) =>
      !!instance.tiers[slotId]?.current_occupant,
    ).length;
    return {
      instanceId: instance.tier_instance_id,
      title: instance.title,
      consumerId: family?.group_id ?? null,
      consumerName: family?.label ?? 'Unassigned',
      readiness: assignment === null
        ? 'unassigned'
        : instance.status === 'active'
          && family !== null
          && family.platform_status !== 'archived'
          && family.platform_status !== 'trashed'
          ? 'ready'
          : 'not-ready',
      occupantCount,
      binCount: instance.occupant_bin.length,
      operable: true,
    };
  });
}

export function eligibleConsumers(
  families: readonly PackageFamilyListItem[],
  assignments: readonly TierAssignment[],
): PackageFamilyListItem[] {
  const assigned = new Set(assignments.map((assignment) => assignment.consumer_id));
  return families.filter((family) =>
    family.platform_status !== 'archived'
      && family.platform_status !== 'trashed'
      && !assigned.has(family.group_id),
  );
}

/** Suggestion only. Callers must render an explicit action before any write. */
export function suggestConsumerForInstance(
  instance: TierInstanceRecord,
  families: readonly PackageFamilyListItem[],
  assignments: readonly TierAssignment[],
): PackageFamilyListItem | null {
  if (assignmentForInstance(assignments, instance.tier_instance_id) !== null) return null;
  const candidates = eligibleConsumers(families, assignments).filter(
    (family) => family.dependents.tier_selections > 0,
  );
  return candidates.length === 1 ? candidates[0] : null;
}

export function tierSlotStates(instance: TierInstanceRecord): TierSlotState[] {
  return TIER_KEYS.map((slotId) => {
    const occupant = instance.tiers[slotId]?.current_occupant ?? null;
    return {
      slotId,
      occupied: occupant !== null,
      occupantId: occupant?.id ?? null,
    };
  });
}

/** Active allowed sheets, plus the current binding even when archived. */
export function selectableRateSheets(
  rateSheets: readonly PackageRateSheet[],
  allowedRateSheetIds: readonly string[],
  boundRateSheetId: string | null,
): PackageRateSheet[] {
  const allowed = new Set(allowedRateSheetIds);
  return rateSheets.filter((sheet) => {
    if (sheet.rate_sheet_id === boundRateSheetId) return true;
    if (sheet.status !== 'active') return false;
    return allowed.size === 0 || allowed.has(sheet.rate_sheet_id);
  });
}
