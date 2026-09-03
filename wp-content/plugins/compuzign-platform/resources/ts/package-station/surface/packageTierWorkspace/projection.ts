// Package Tier workspace — explicit Package Family assignment resolution.
//
// A Family and Tier instance are independent peers. This module resolves only
// their assignment row; it never consults Service or Rate Sheet provenance and
// never treats either peer as storage owned by the other.

import type {
  CategoryGroupCardItem,
  CategoryGroupStatus,
} from '@/admin-station/presentation/category-groups/types';
import type { CustomerPolicy } from '@/api/types/cost-builder';
import type {
  TierAssignment,
  TierInstanceRecord,
  TierInstanceSummary,
} from '../../types';
import { TIER_KEYS, TIER_LABELS, COMPOSABLE_TIER_ID } from '../../vocabulary';

/** Package Family fields used by the workspace and its authoritative summary. */
export interface WorkspaceFamilyScope {
  id: string;
  name: string;
  description: string;
  status: CategoryGroupStatus;
  dependents: { services: number; rate_sheet_rows: number; tier_selections: number };
  // The Family's own output-only Platform ID (CZPG), carried through unchanged
  // for presentation. Empty when the Family has none yet.
  platformId: string;
}

/** One fixed Tier slot in the workspace. Empty slots have no occupant identity. */
export interface WorkspaceTierSlot {
  slotId: string;
  label: string;
  occupantId: string | null;
  item: CategoryGroupCardItem | null;
  // Occupant-level presentation flags, `null` for an empty slot (neither a Tier
  // nor an Add-on yet). Carried here so the left list filter and the focused
  // card can read them without re-deriving from the station.
  isAddon: boolean | null;
  isPopular: boolean;
  // Admin-authored customer selection bounds — composable occupant only (see
  // types.ts's own `customer_policy` doc comment: every normal Tier/Add-on's
  // field stays permanently null, so a fixed slot never populates this).
  // Additive, Admin UX restructuring's composable middle shell.
  customerPolicy: CustomerPolicy | null;
}

/**
 * Project the immutable five-slot shell without manufacturing occupant records.
 * The input contains real occupant cards only; missing entries remain empty.
 */
export function projectWorkspaceTierSlots(
  occupants: readonly { slotId: string; occupantId: string; item: CategoryGroupCardItem; isAddon: boolean; isPopular: boolean }[],
): WorkspaceTierSlot[] {
  const occupantBySlot = new Map(occupants.map((occupant) => [occupant.slotId, occupant]));
  return TIER_KEYS.map((slotId) => {
    const occupant = occupantBySlot.get(slotId) ?? null;
    return {
      slotId,
      label: TIER_LABELS[slotId] ?? slotId,
      occupantId: occupant?.occupantId ?? null,
      item: occupant?.item ?? null,
      isAddon: occupant?.isAddon ?? null,
      isPopular: occupant?.isPopular ?? false,
      customerPolicy: null,
    };
  });
}

/**
 * Project the subordinate composable occupant into the SAME shape a fixed
 * slot gets, so TierDetailPanel renders it via the identical created/empty
 * branches — but never through projectWorkspaceTierSlots/TIER_KEYS, so it
 * can never join `slots`, its counts, or its Tier/Add-on filters. `occupantId`
 * and `item` are null for an as-yet-uncreated composable occupant, matching
 * an empty fixed slot's own null pair. Exported for the composable-occupant-
 * workspace contract.
 */
export function projectComposableWorkspaceSlot(
  occupantId: string | null,
  item: CategoryGroupCardItem | null,
  customerPolicy: CustomerPolicy | null = null,
): WorkspaceTierSlot {
  return {
    slotId: COMPOSABLE_TIER_ID,
    label: TIER_LABELS[COMPOSABLE_TIER_ID] ?? 'Build Your Own',
    occupantId,
    item,
    isAddon: null,
    isPopular: false,
    customerPolicy,
  };
}

/** The left Package Tiers list filter: both occupant types, Tiers only, or Add-ons only. */
export type TierListFilter = 'all' | 'tiers' | 'addons';

/**
 * Pure view filter over the fixed five-slot shell — it never mutates or
 * re-collects the source slots, only narrows which ones are visible. A slot
 * whose occupant type is not yet known (an empty slot) is visible only under
 * `all`, since it is neither a Tier nor an Add-on.
 */
export function filterWorkspaceTierSlots(
  slots: readonly WorkspaceTierSlot[],
  filter: TierListFilter,
): WorkspaceTierSlot[] {
  if (filter === 'all') return [...slots];
  const wantAddon = filter === 'addons';
  return slots.filter((slot) => slot.isAddon === wantAddon);
}

/** Pure full-record → list-summary projection for assignment resolution. */
export function summarizeTierInstance(instance: TierInstanceRecord): TierInstanceSummary {
  const occupantCount = TIER_KEYS.filter((slotId) =>
    !!instance.tiers[slotId]?.current_occupant,
  ).length;
  return {
    tier_instance_id: instance.tier_instance_id,
    platform_id: instance.cz_platform_id,
    title: instance.title,
    description: instance.description,
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
