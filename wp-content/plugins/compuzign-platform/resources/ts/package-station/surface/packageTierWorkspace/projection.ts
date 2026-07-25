// Package Tier workspace — explicit Package Family assignment resolution.
//
// A Family and Tier instance are independent peers. This module resolves only
// their assignment row; it never consults Service or Rate Sheet provenance and
// never treats either peer as storage owned by the other.

import type { CategoryGroupStatus } from '@/admin-station/presentation/category-groups/types';
import type {
  TierAssignment,
  TierInstanceRecord,
  TierInstanceSummary,
} from '../../types';
import { TIER_KEYS } from '../../vocabulary';

/** Package Family fields used by the workspace and its authoritative summary. */
export interface WorkspaceFamilyScope {
  id: string;
  name: string;
  description: string;
  status: CategoryGroupStatus;
  dependents: { services: number; rate_sheet_rows: number; tier_selections: number };
}

/** Pure full-record → list-summary projection for assignment resolution. */
export function summarizeTierInstance(instance: TierInstanceRecord): TierInstanceSummary {
  const occupantCount = TIER_KEYS.filter((slotId) =>
    !!instance.tiers[slotId]?.current_occupant,
  ).length;
  return {
    tier_instance_id: instance.tier_instance_id,
    title: instance.title,
    status: instance.status,
    allowed_rate_sheet_ids: [...instance.allowed_rate_sheet_ids],
    popular_tier: instance.popular_tier,
    popular_label: instance.popular_label,
    readiness: instance.status === 'active' ? 'ready' : 'not-ready',
    occupant_count: occupantCount,
    bin_count: instance.occupant_bin.length,
  };
}

/** Exact peer-edge resolution. Missing, duplicate, or dangling edges fail closed. */
export function resolveFamilyTierAssignment(
  family: WorkspaceFamilyScope,
  assignments: readonly TierAssignment[],
  instances: readonly TierInstanceSummary[],
): TierInstanceSummary | null {
  const matches = assignments.filter((assignment) =>
    assignment.consumer_type === 'package_family' && assignment.consumer_id === family.id,
  );
  if (matches.length !== 1) return null;
  return instances.find((instance) =>
    instance.tier_instance_id === matches[0].tier_instance_id,
  ) ?? null;
}

/** Once an exact instance is loaded, all its occupants project without filtering. */
export function projectResolvedInstanceOccupants<T>(
  instance: TierInstanceSummary | null,
  occupants: readonly T[],
): T[] {
  return instance === null ? [] : [...occupants];
}
