// Package Tier workspace — the pure Family-summary model.
//
// A companion to ./projection with the same discipline: given a Package Family
// record and what its OWN Tiers reach, decide EXACTLY what the read-only summary
// panel shows — and nothing else. It fetches nothing, renders nothing, and holds
// no state, so it is testable in isolation (scripts/package-tier-workspace-contract.ts)
// and cannot silently grow a fabricated field.
//
// This is the drift guard for the summary. The mockup this section adapts shows
// invented figures — estimated margin, a demand score, a "last updated" clock —
// that have NO authoritative source. Fixing the summary's shape here, and
// asserting it in the contract, is what keeps those out.
//
// ── The Family card expression ────────────────────────────────────────────────
//
// The Family owns exactly ONE of the relationships this card reports: its own
// Tiers. Everything else is COLLATED from what those Tiers already reach, never
// owned:
//
//   Package Family Platform ID
//     └─ direct Family relation ──> Tiers
//                                     └─ Tier occupant
//                                          └─ occupant relation ──> Inclusions
//                                                                   (Rate Sheet rows
//                                                                    the Rate Sheet
//                                                                    Engine built from
//                                                                    Service Category
//                                                                      → Service)
//
// So the Family is NOT connected to Service Categories, Services, Rate Sheets or
// Rate Sheet rows. Its card reads the downstream identity those inclusion rows
// already carry, by Platform ID (CZS / CZC) — never by name, label, index, array
// position, or presentation order, and never as a count persisted onto the Family.
// A row whose owner holds no Platform ID yet contributes no identity rather than a
// fabricated one, so the two unique counts stay honest instead of guessing.
//
// The scope guard is `FamilyTierComposition`: the caller may only build one from
// the Tier system THIS Family is assigned, so another Family's categories,
// services or inclusions have no path into these numbers. Tiers reads that
// system's own registered-Tier count; the occupant traversal is the bridge to
// the inclusion rows ONLY, and never redefines what a Tier is.

import type { CategoryGroupStatus } from '@/admin-station/presentation/category-groups/types';
import type { WorkspaceFamilyScope } from './projection';

/** One summary count. `id` selects the presentation glyph; the value is authoritative. */
export interface FamilySummaryMetric {
  id: 'tiers' | 'service-categories' | 'services' | 'inclusions';
  label: string;
  value: number;
}

/** The read-only summary panel's complete model — no field without a real source. */
export interface FamilySummaryModel {
  name: string;
  // The family's own description, shown as its positioning line. Never a second,
  // longer "positioning" text — the API supplies exactly one description.
  positioning: string;
  status: CategoryGroupStatus;
  // Exactly the four collated relationships, in a fixed reading order.
  metrics: FamilySummaryMetric[];
}

/**
 * One inclusion row reached through a Tier occupant, reduced to the downstream
 * identity it carries. An Inclusion IS a Rate Sheet row; the Rate Sheet Engine
 * built it from an existing Service Category → Service structure, and these are
 * the Platform IDs of that structure — carried by the row, owned by neither the
 * row nor the Family.
 */
export interface FamilyInclusionIdentity {
  /** Supplying Service's CZS. Empty when that Service carries none yet. */
  servicePlatformId: string;
  /** CZC of each category-role term that Service carries. */
  categoryPlatformIds: readonly string[];
}

/**
 * What one Package Family's OWN Tier system composes. Both fields resolve
 * through projection.ts's exact, fail-closed `resolveFamilyTierAssignment`,
 * which is what keeps this card scoped: a Family with no assignment composes
 * nothing, and no other Family's Tier system can enter.
 *
 * The two fields come from DIFFERENT hops on purpose (see
 * `collateFamilyTierComposition`).
 */
export interface FamilyTierComposition {
  /**
   * Tiers registered on the Tier system this Family is assigned — read from
   * that system's own record, NOT from the occupant traversal below.
   */
  tiers: number;
  /** Every inclusion row belonging to those occupants. Duplicates are real rows. */
  inclusions: readonly FamilyInclusionIdentity[];
}

/** A Family with no resolved Tier system composes nothing — never a guess. */
export const EMPTY_FAMILY_TIER_COMPOSITION: FamilyTierComposition = { tiers: 0, inclusions: [] };

/**
 * Compose one Family's Tier relation into its collated composition.
 *
 * The two arguments are deliberately separate hops, and the separation is the
 * point:
 *
 *   `registeredTiers` — the Family's DIRECT relation. The count of Tiers the
 *   assigned Tier system's own record holds, supplied by the caller from that
 *   record (`summarizeTierInstance`'s `occupant_count`). This is what `Tiers`
 *   reports, and it is never re-derived from the list below.
 *
 *   `occupants` — the DOWNSTREAM bridge, used only to reach inclusion rows and
 *   the CZS/CZC identity they carry.
 *
 * Passing the occupant list's own length as the Tier count would let the
 * downstream bridge silently redefine what `Tiers` means — a Tier is registered
 * on the Tier system whether or not its occupant's inclusions have loaded. This
 * function derives no relationship of its own: an occupant's inclusions are the
 * ones its own deck already holds.
 */
export function collateFamilyTierComposition(
  registeredTiers: number,
  occupants: readonly { inclusions: readonly FamilyInclusionIdentity[] }[],
): FamilyTierComposition {
  return {
    tiers: registeredTiers,
    inclusions: occupants.flatMap((occupant) => occupant.inclusions.map((inclusion) => ({
      servicePlatformId:   inclusion.servicePlatformId,
      categoryPlatformIds: inclusion.categoryPlatformIds,
    }))),
  };
}

/** Distinct non-empty Platform IDs. An absent ID is no identity, never a bucket. */
function countDistinctPlatformIds(ids: readonly string[]): number {
  const distinct = new Set<string>();
  for (const id of ids) {
    if (id !== '') distinct.add(id);
  }
  return distinct.size;
}

/**
 * Project a Package Family scope plus its own Tier composition into the summary
 * model. Tiers is the Family's one direct relation; Service Categories, Services
 * and Inclusions are collated from the inclusion rows those Tiers' occupants
 * already hold. Nothing here is estimated, invented, or persisted back.
 */
export function buildFamilySummary(
  family: WorkspaceFamilyScope,
  composition: FamilyTierComposition = EMPTY_FAMILY_TIER_COMPOSITION,
): FamilySummaryModel {
  const inclusions = composition.inclusions;
  return {
    name:        family.name,
    positioning: family.description,
    status:      family.status,
    metrics: [
      { id: 'tiers',              label: 'Tiers',              value: composition.tiers },
      {
        id: 'service-categories',
        label: 'Service Categories',
        value: countDistinctPlatformIds(inclusions.flatMap((inclusion) => [...inclusion.categoryPlatformIds])),
      },
      {
        id: 'services',
        label: 'Services',
        value: countDistinctPlatformIds(inclusions.map((inclusion) => inclusion.servicePlatformId)),
      },
      { id: 'inclusions',         label: 'Inclusions',         value: inclusions.length },
    ],
  };
}
