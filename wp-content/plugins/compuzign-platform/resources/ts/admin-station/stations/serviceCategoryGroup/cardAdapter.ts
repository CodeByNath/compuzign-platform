// Service Category Group → card adapter.
//
// The pure projection from a backend list record (ServiceCategoryGroupStationItem,
// the /admin/category-groups list route) into the presentation kit's
// CategoryGroupCardItem. It fetches nothing and holds no state — it is the seam
// where a Station read becomes card data, so the card tree stays pure and the
// hook stays thin.
//
// Truthfulness rules for this phase:
//   - Identity is the numeric term_id, carried through unchanged.
//   - Metrics show ONLY what the list route actually returns. The projection
//     carries `assigned_count` (child Category terms), so the one honest metric
//     is "Assigned Categories". The mock's Services / Inclusions / Packages
//     counts are NOT in this projection and are deliberately not invented.
//   - Status is resolved by mirroring the authoritative table pill
//     (schema/tables/serviceCategoryGroup.tsx :: serviceCategoryGroupStatusPill),
//     expressed in the card's 4-state vocabulary. No new status rule is created.
//   - Actions are View + Edit only — the two this phase proves. Both map to a
//     real drawer mode (view→overview, edit→edit); no archive/delete is offered
//     until the station drawer exists to service it.
//
// Type-only across the tree: the backend row type is imported for its shape and
// erased at build, matching the boundary the rest of this environment keeps.

import type { ServiceCategoryGroupStationItem } from '@/api/types/admin';
import { ViewIcon } from '../../shell/icons';
import type {
  CategoryGroupCardItem,
  CategoryGroupStatus,
} from '../../presentation/category-groups/types';

/**
 * Resolve a list row into the card's 4-state status vocabulary.
 *
 * A faithful re-expression of the authoritative `serviceCategoryGroupStatusPill`
 * decision tree — never a second status rule:
 *   - disabled + unsettled overview → never-published, reads Pending (pending-dim)
 *   - disabled + settled            → Disabled
 *   - active   + draft/pending      → live with changes pending, reads Pending (pending-full)
 *   - active   + clean              → Active
 * The card pill (PILL_META) collapses both pending flavours to a single "Pending"
 * label; that collapse is the existing contract, not a new decision here.
 */
export function resolveCategoryGroupCardStatus(
  item: ServiceCategoryGroupStationItem,
): CategoryGroupStatus {
  if (item.platform_status === 'disabled') {
    return item.module_status.overview !== 'settled' ? 'pending-dim' : 'disabled';
  }
  const hasUnsettled = item.has_draft || item.module_status.overview === 'pending';
  return hasUnsettled ? 'pending-full' : 'active';
}

/** Project one backend list record into the card the grid renders. */
export function toCategoryGroupCard(item: ServiceCategoryGroupStationItem): CategoryGroupCardItem {
  return {
    id:          item.id,          // numeric term_id, unchanged
    key:         item.slug,
    name:        item.name,
    description: item.description,
    status:      resolveCategoryGroupCardStatus(item),
    // The one truthful metric the list route supplies. Labels are data; the card
    // never names a metric.
    metrics: [
      { id: 'assigned-categories', label: 'Assigned Categories', value: item.assigned_count },
    ],
    // View (primary) + Edit. Identity-only dispatch; both resolve to a real
    // drawer mode when the station drawer lands.
    actions: [
      { id: 'view', label: 'View', icon: ViewIcon },
      { id: 'edit', label: 'Edit' },
    ],
  };
}
