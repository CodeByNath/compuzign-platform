// Pure projections for the Package-owned Tier-instance tool. Instances and
// assignments stay separate inputs throughout; no function infers, suggests, or
// writes a relationship — a consumer is known only from a stored assignment.

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
  slotId:     string;
  occupied:   boolean;
  occupantId: string | null;
  /** The occupant's own stored label, status, and Rate Sheet binding. Null when
   *  the slot is empty or the record stores none — never substituted, and never
   *  derived from the slot key. */
  occupantLabel:  string | null;
  occupantStatus: string | null;
  rateSheetId:    string | null;
}

export interface TierRateSheetScope {
  instanceId: string;
  instanceTitle: string;
  familyName: string;
  slotIds: string[];
}

export interface TierRateSheetInventoryRow {
  rateSheetId: string;
  title: string;
  status: PackageRateSheet['status'];
  groupCount: number;
  rowCount: number;
  availableTo: TierRateSheetScope[];
  usedBy: TierRateSheetScope[];
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

export function tierSlotStates(instance: TierInstanceRecord): TierSlotState[] {
  return TIER_KEYS.map((slotId) => {
    const occupant = instance.tiers[slotId]?.current_occupant ?? null;
    return {
      slotId,
      occupied: occupant !== null,
      occupantId: occupant?.id ?? null,
      occupantLabel:  occupant?.label ?? null,
      occupantStatus: occupant?.platform_status ?? null,
      rateSheetId:    occupant?.rate_sheet_id ?? null,
    };
  });
}

/**
 * Project Rate Sheet availability and current use across independent instances.
 * Family labels are joined only through tier_assignments[]; Rate Sheet or
 * Service provenance never creates a capability relationship.
 */
export function tierRateSheetInventory(
  rateSheets: readonly PackageRateSheet[],
  instances: readonly TierInstanceRecord[],
  assignments: readonly TierAssignment[],
  families: readonly PackageFamilyListItem[],
): TierRateSheetInventoryRow[] {
  const familyById = new Map(families.map((family) => [family.group_id, family]));
  const assignmentByInstance = new Map(assignments.map((assignment) => [
    assignment.tier_instance_id,
    assignment,
  ]));
  const familyName = (instanceId: string): string => {
    const assignment = assignmentByInstance.get(instanceId);
    return assignment ? familyById.get(assignment.consumer_id)?.label ?? 'Unknown Family' : 'Unassigned';
  };

  return rateSheets.map((sheet) => {
    const availableTo = instances
      .filter((instance) => (
        instance.allowed_rate_sheet_ids.includes(sheet.rate_sheet_id)
        || (sheet.status === 'active' && instance.allowed_rate_sheet_ids.length === 0)
      ))
      .map((instance) => ({
        instanceId: instance.tier_instance_id,
        instanceTitle: instance.title,
        familyName: familyName(instance.tier_instance_id),
        slotIds: [],
      }));

    const usedBy = instances.flatMap((instance) => {
      const slotIds = TIER_KEYS.filter((slotId) =>
        instance.tiers[slotId]?.current_occupant?.rate_sheet_id === sheet.rate_sheet_id,
      );
      return slotIds.length === 0 ? [] : [{
        instanceId: instance.tier_instance_id,
        instanceTitle: instance.title,
        familyName: familyName(instance.tier_instance_id),
        slotIds,
      }];
    });

    return {
      rateSheetId: sheet.rate_sheet_id,
      title: sheet.title,
      status: sheet.status,
      groupCount: sheet.groups.length,
      rowCount: sheet.items.length,
      availableTo,
      usedBy,
    };
  });
}

/**
 * Explicitly allowed active sheets, plus the current binding even when
 * archived or no longer allowed. An empty allow-list selects nothing new —
 * it is the ordinary "not configured yet" state, never a wildcard — but an
 * occupant's own already-bound sheet always stays visible and re-saveable
 * regardless of the allow-list, so narrowing access never hides or silently
 * reassigns an existing selection.
 */
export function selectableRateSheets(
  rateSheets: readonly PackageRateSheet[],
  allowedRateSheetIds: readonly string[],
  boundRateSheetId: string | null,
): PackageRateSheet[] {
  const allowed = new Set(allowedRateSheetIds);
  return rateSheets.filter((sheet) => {
    if (sheet.rate_sheet_id === boundRateSheetId) return true;
    if (sheet.status !== 'active') return false;
    return allowed.has(sheet.rate_sheet_id);
  });
}
