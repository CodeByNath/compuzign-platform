// Package Tier workspace — the pure Family-scope projection.
//
// This module holds ONE responsibility: given the Package Station's authoritative
// reads, decide which Tier occupants a selected Package Family projects — and
// nothing else. It fetches nothing, renders nothing, and holds no state, so the
// projection is testable in isolation (scripts/package-tier-workspace-contract.ts)
// and can never drift from the backend relationship it mirrors.
//
// THE RELATIONSHIP IS NOT INVENTED. It is the exact provenance chain the backend
// uses to compute `dependents.tier_selections` for a Family
// (PackageCategoryGroups::dependents), traversed from the tier side:
//
//   Family.related_service_ids                         (authoritative Family→Service)
//     ↑ intersect
//   tier.rate_sheet_items[].item_id
//     → rate_sheet.items (by item_id) → source_item_id
//       → package_relationships (by item_id) → source_service_id   (supplying Service)
//
// A Tier occupant projects under Family F iff at least one of its supplying
// Services is one of F's related Services. This is a FILTER over the single,
// shared Package Station tier set — never per-Family ownership. The occupant's
// identity (`occupant_id`) is preserved untouched; the Family id is scope only.

import type { CategoryGroupCardItem, CategoryGroupStatus } from '@/admin-station/presentation/category-groups/types';

// Minimal shapes the projection needs from the Package Station read model. Kept
// local and structural so the pure functions carry no dependency on the full API
// types (and so the contract script runs them with plain fixtures).

/** A Package Station rate-sheet row: its own id and the relationship it prices. */
export interface WorkspaceRateItem {
  item_id: string;
  source_item_id: string;
}

/** A Package Station relationship carrying admin-read-model Service provenance. */
export interface WorkspaceRelationship {
  item_id: string;
  source_service_id?: number | null;
}

/** A Tier occupant as the workspace holds it before Family projection. */
export interface WorkspaceOccupant {
  // Stable Tier identity, carried straight through to the drawer. NEVER the slot.
  occupantId: string;
  // The card the shared grid renders. `card.id === occupantId` by construction.
  card: CategoryGroupCardItem;
  // The Services this occupant's Rate Sheet selections resolve to (provenance).
  supplyingServiceIds: number[];
}

/** A Package Family as WORKING SCOPE: authoritative identity/summary, never owner. */
export interface WorkspaceFamilyScope {
  id: string;               // native string group_id
  name: string;             // label (e.g. "KAIROS")
  description: string;      // e.g. "IaaS"
  status: CategoryGroupStatus;
  // Authoritative Family→Service relationship (related_service_ids route field).
  relatedServiceIds: number[];
  // Authoritative dependency counts, shown as-is — never re-derived by this module.
  dependents: { services: number; rate_sheet_rows: number; tier_selections: number };
}

/** A Family projected with the Tier occupants connected to it (scope + result). */
export interface PackageTierWorkspaceFamily extends WorkspaceFamilyScope {
  occupants: CategoryGroupCardItem[];
}

/**
 * Map each rate-sheet row id → its supplying Service id, via the relationship it
 * prices. A row whose relationship carries no positive `source_service_id`
 * (missing source, or a pool built without provenance) contributes nothing, so it
 * simply never matches a Family — the same silence the backend read model keeps.
 */
export function buildRateItemServiceMap(
  rateItems: readonly WorkspaceRateItem[],
  relationships: readonly WorkspaceRelationship[],
): Map<string, number> {
  const serviceByRelationship = new Map<string, number>();
  for (const relationship of relationships) {
    const serviceId = relationship.source_service_id;
    if (typeof serviceId === 'number' && serviceId > 0) {
      serviceByRelationship.set(relationship.item_id, serviceId);
    }
  }

  const serviceByRateItem = new Map<string, number>();
  for (const item of rateItems) {
    const serviceId = serviceByRelationship.get(item.source_item_id);
    if (serviceId !== undefined) {
      serviceByRateItem.set(item.item_id, serviceId);
    }
  }
  return serviceByRateItem;
}

/**
 * The distinct Services a Tier occupant's selections resolve to. Deduplicated
 * because a tier may select several rows supplied by the same Service, and a
 * Family match is about presence, not count.
 */
export function occupantSupplyingServiceIds(
  selectionItemIds: readonly string[],
  serviceByRateItem: ReadonlyMap<string, number>,
): number[] {
  const ids = new Set<number>();
  for (const itemId of selectionItemIds) {
    const serviceId = serviceByRateItem.get(itemId);
    if (serviceId !== undefined) ids.add(serviceId);
  }
  return [...ids];
}

/**
 * Project every Family's connected Tier occupants. Each Family keeps its full
 * authoritative summary; its `occupants` list is the filtered VIEW of the shared
 * tier set, not a private collection. A Family with no intersecting occupant
 * yields an empty list — the workspace's "no Tier selections" empty state, not an
 * error.
 */
export function projectFamilyTierWorkspace(
  families: readonly WorkspaceFamilyScope[],
  occupants: readonly WorkspaceOccupant[],
): PackageTierWorkspaceFamily[] {
  return families.map((family) => {
    const related = new Set(family.relatedServiceIds);
    const connected = occupants.filter((occupant) =>
      occupant.supplyingServiceIds.some((serviceId) => related.has(serviceId)),
    );
    return { ...family, occupants: connected.map((occupant) => occupant.card) };
  });
}
