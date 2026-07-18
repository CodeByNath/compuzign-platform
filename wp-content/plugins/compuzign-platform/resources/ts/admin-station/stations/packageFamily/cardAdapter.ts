// Package Family → card adapter.
//
// The pure projection from a backend list record (PackageFamilyItem, the
// /admin/package-category-groups list route) into the SAME presentation contract
// the Service Category Group wall uses (CategoryGroupCardItem). It fetches
// nothing and holds no state.
//
// This adapter is the whole point of the entity-agnostic kit: a second, entirely
// unrelated entity — Package-owned rather than taxonomy-owned, string-keyed
// rather than numeric — reaches the card wall through a projection function and
// a registry key, with no change to the card, the grid, the kit, the host, or
// the shell.
//
// Truthfulness rules, the same ones the Service Category Group adapter keeps:
//   - Identity is the record's own `group_id` — a STRING — carried through
//     unchanged. It is never coerced to a number to look like a term_id; the
//     family's routes are all string-keyed, so the string is the real id.
//   - Metrics show ONLY what the list route actually returns. The projection
//     carries `assigned_service_count`, so the one honest card metric is
//     "Assigned Services". The richer `dependents` breakdown (rate sheet rows,
//     tier selections) is real too, but belongs to the drawer's connections
//     section rather than the card face.
//   - Status mirrors the authoritative family pill (relations/
//     PackageFamiliesSection.tsx :: groupStatusPill) expressed in the card's
//     4-state vocabulary. No new status rule is created.
//   - Actions are View + Edit only — the two the family drawer template serves.
//
// Type-only across the tree: the backend row type is imported for its shape and
// erased at build.

import type { PackageFamilyItem } from '@/api/types/admin';
import { ViewIcon } from '../../shell/icons';
import type {
  CategoryGroupCardItem,
  CategoryGroupStatus,
} from '../../presentation/category-groups/types';

/**
 * Resolve a family list row into the card's 4-state status vocabulary.
 *
 * A faithful re-expression of the authoritative `groupStatusPill` decision tree
 * — which is itself deliberately identical to the taxonomy Service Category
 * Group rule, so both walls read the same way:
 *   - disabled + unsettled overview → never-published, reads Pending (pending-dim)
 *   - disabled + settled            → Disabled
 *   - live     + draft/pending      → live with changes pending (pending-full)
 *   - live     + clean              → Active
 *
 * Like the authority, this branches only on `disabled`: the presentation wall
 * reads the current scope, where archived/trashed families are excluded by the
 * list route, so no card state is invented for them here.
 */
export function resolvePackageFamilyCardStatus(item: PackageFamilyItem): CategoryGroupStatus {
  if (item.platform_status === 'disabled') {
    return item.module_status.overview !== 'settled' ? 'pending-dim' : 'disabled';
  }
  const hasUnsettled = item.has_draft || item.module_status.overview === 'pending';
  return hasUnsettled ? 'pending-full' : 'active';
}

/** Project one backend family record into the card the grid renders. */
export function toPackageFamilyCard(item: PackageFamilyItem): CategoryGroupCardItem {
  return {
    id:          item.group_id,   // native string group_id, unchanged
    key:         item.group_id,
    name:        item.label,
    description: item.description,
    status:      resolvePackageFamilyCardStatus(item),
    // The one truthful metric the list route supplies for the card face.
    metrics: [
      { id: 'assigned-services', label: 'Assigned Services', value: item.assigned_service_count },
    ],
    // View (primary) + Edit. Identity-only dispatch; the string group_id travels
    // to the drawer exactly as it sits here.
    actions: [
      { id: 'view', label: 'View', icon: ViewIcon },
      { id: 'edit', label: 'Edit' },
    ],
  };
}
