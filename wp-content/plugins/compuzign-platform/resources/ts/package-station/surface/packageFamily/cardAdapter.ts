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
//   - Metrics: Services and Inclusions repeat the backend's `dependents`
//     counts (connected Services; configured Rate Sheet rows, in the card's
//     language "Inclusions"). Tiers is NOT `dependents.tier_selections` —
//     that field counts every rate-sheet-row selection nested across all
//     occupants (a per-selection tally, not a slot count) and stays reserved
//     for the delete dependency guard. The card instead reads
//     `active_tier_slots`, the backend's count of unique ACTIVE occupied
//     Tier slots out of the assigned instance's fixed slot capacity — shown
//     as "X of Y active" when the family has an assigned Tier instance
//     (capacity is then a known constant, 5), or "Not assigned" when it has
//     none, since an unassigned Family owns no Tier system to report slots
//     for and "0 of 0 active" would misread as zero capacity rather than no
//     instance. The adapter supplies data records; the shared card loops
//     them and knows none of these names.
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

import type { ActiveTierSlots, PackageFamilyItem } from '../../types';
import { evaluateModule, packageFamilyOverviewModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ModuleState } from '@/drawer-kit/utils/moduleNotifications';
import { ChevronRightIcon, PackagesIcon, ServicesIcon, RateSheetIcon, TiersIcon } from '@/admin-station/shell/icons';
import type {
  CategoryGroupCardItem,
  CategoryGroupStatus,
} from '@/admin-station/presentation/category-groups/types';

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
function resolvePackageFamilyCardModule(item: PackageFamilyItem): ModuleState {
  return evaluateModule(
    packageFamilyOverviewModule,
    { name: item.label, description: item.description },
    {
      platformStatus: item.platform_status,
      platformLabel: 'Package Family',
      moduleTransition: item.module_status.overview,
      hasDraft: item.has_draft,
    },
  );
}

export function resolvePackageFamilyCardStatus(item: PackageFamilyItem): CategoryGroupStatus {
  return resolvePackageFamilyCardModule(item).status as CategoryGroupStatus;
}

/**
 * Render the Tiers metric.
 *
 * `capacity` is 0 only when the Family has no Tier assignment at all (or,
 * degenerately, an assignment pointing at a missing instance) — the backend
 * never reports a nonzero capacity without a real assigned instance behind
 * it (PackageCategoryGroups::activeTierSlotSummary). That case reads "Not
 * assigned", echoing the platform's existing vocabulary for the same state
 * (tierInstanceModel.ts's `consumerName: 'Unassigned'`, PackageTierWorkspace's
 * "No Tier system assigned") rather than "0 of 0 active", which would read as
 * a Family with zero Tier capacity rather than one with no Tier system yet.
 * An assigned instance always reports the true fixed capacity (5), so "0 of 5
 * active" (assigned, nothing active) stays visibly distinct from "Not
 * assigned" (no instance at all) and from "N of 5 active" (assigned, N active).
 * `active_tier_slots` is optional only for older cached responses that
 * predate the field — absence reads the same as unassigned.
 */
export function formatActiveTierSlots(slots: ActiveTierSlots | undefined): string {
  const { occupied, capacity } = slots ?? { occupied: 0, capacity: 0 };
  return capacity === 0 ? 'Not assigned' : `${occupied} of ${capacity} active`;
}

/** Project one backend family record into the card the grid renders. */
export function toPackageFamilyCard(item: PackageFamilyItem): CategoryGroupCardItem {
  const module = resolvePackageFamilyCardModule(item);
  return {
    id:          item.group_id,   // native string group_id, unchanged
    key:         item.group_id,
    name:        item.label,
    // The record's kind, in the reader's language. Data, not a card branch.
    kind:        'Package family',
    description: item.description,
    icon:        PackagesIcon,
    status:      module.status as CategoryGroupStatus,
    notifications: module.notes,
    // Complete live dependency list. The shared card renders this as a repeater.
    metrics: [
      { id: 'services', label: 'Services', value: item.dependents.services, icon: ServicesIcon },
      { id: 'inclusions', label: 'Inclusions', value: item.dependents.rate_sheet_rows, icon: RateSheetIcon },
      {
        id: 'tiers',
        label: 'Tiers',
        value: formatActiveTierSlots(item.active_tier_slots),
        icon: TiersIcon,
      },
    ],
    // A single action. Identity-only dispatch; the string group_id travels to
    // the drawer exactly as it sits here, and Edit lives inside that drawer.
    actions: [
      { id: 'view', label: 'View', icon: ChevronRightIcon },
    ],
  };
}
