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
//   - Metrics show ONLY what the list route actually returns, and only counts
//     whose MEANING is settled. Today that is one: Services. The route also
//     carries `rate_sheet_rows` and `tier_selections`, but the card face is
//     meant to read as Services / Categories / Tiers — and neither a per-family
//     category count nor a distinct-tier count is computed by the backend
//     (`PackageCategoryGroups::dependents` returns services, rate_sheet_rows,
//     tier_selections; `tier_selections` counts rate-sheet-row selections, NOT
//     distinct tiers). So the list stays at Services rather than showing a
//     number under a label it does not mean. The metrics array is a loop —
//     adding the other two is a data change here once the backend reports them.
//   - `assigned_service_count` IS `dependents.services` (the projection assigns
//     one from the other), so this metric and the drawer's Services connection
//     can never disagree.
//   - Status mirrors the authoritative family pill (relations/
//     PackageFamiliesSection.tsx :: groupStatusPill) expressed in the card's
//     4-state vocabulary. No new status rule is created.
//   - One action: View. Edit is not dropped from the product — it is a tab
//     inside the drawer View opens (the drawer registry's `supportedModes`),
//     so the card face offers one gesture instead of a menu.
//
// Type-only across the tree: the backend row type is imported for its shape and
// erased at build.

import type { PackageFamilyItem } from '@/api/types/admin';
import { ViewIcon, PackagesIcon, ServicesIcon } from '../../shell/icons';
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
    // The record's kind, in the reader's language. Data, not a card branch.
    kind:        'Package family',
    description: item.description,
    icon:        PackagesIcon,
    status:      resolvePackageFamilyCardStatus(item),
    // One settled count. See the truthfulness note above for why the other two
    // dependents are not here.
    metrics: [
      { id: 'services', label: 'Services', value: item.assigned_service_count, icon: ServicesIcon },
    ],
    // A single action. Identity-only dispatch; the string group_id travels to
    // the drawer exactly as it sits here, and Edit lives inside that drawer.
    actions: [
      { id: 'view', label: 'View', icon: ViewIcon },
    ],
  };
}
