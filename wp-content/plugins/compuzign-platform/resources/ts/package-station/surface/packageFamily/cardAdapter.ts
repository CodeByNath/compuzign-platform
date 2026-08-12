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
//   - Metrics are the assigned Tier Group's OWN composition — the same four
//     counts, from the same source, that the Tier Workspace Family panel
//     shows, so one Family never reads two different ways depending on which
//     screen it is on. The card derives none of them and reads NONE of the
//     `dependents` guard counts, which answer a different question: they
//     tally what the Family's connected Services could supply across every
//     Rate Sheet in the station, not what its Tiers actually compose, and
//     they exist for the delete dependency guard. `active_tier_slots` is
//     likewise not a metric here — it counts only ACTIVE occupants, while
//     the composition's `tiers` counts every registered one.
//     `buildFamilyCompositionMetrics` owns which four and in what order; this
//     adapter adds only the glyphs. The shared card loops them and knows none
//     of these names.
//   - An absent composition reads "—" on every metric, never 0 and never a
//     locally recomputed substitute. The backend fails closed when the Family
//     has no Tier assignment or its Tier Group carries no CZTG, and the card
//     shows that honestly rather than inventing a number for it.
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

import type { ComponentType } from 'preact';
import type { PackageFamilyItem } from '../../types';
import {
  buildFamilyCompositionMetrics,
  type FamilySummaryMetric,
} from '../packageTierWorkspace/familySummary';
import { evaluateModule, packageFamilyOverviewModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ModuleState } from '@/drawer-kit/utils/moduleNotifications';
import { ChevronRightIcon, PackagesIcon, ServicesIcon, RateSheetIcon, TiersIcon, CategoriesIcon } from '@/admin-station/shell/icons';
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

/** The glyph each composition metric shows, keyed by the shared model's id. */
const METRIC_ICONS: Record<FamilySummaryMetric['id'], ComponentType<{ class?: string }>> = {
  'tiers':              TiersIcon,
  'service-categories': CategoriesIcon,
  'services':           ServicesIcon,
  'inclusions':         RateSheetIcon,
};

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
    // Reduced value emphasis (small, regular weight): the Tiers metric now
    // renders a bare number and must not visually overpower its label the
    // way the card kit's default large/bold value would. Scoped to this
    // card only — Service cards and Tier occupant cards keep the default.
    compactMetrics: true,
    // The assigned Tier Group's own composition. The shared card renders this
    // as a repeater; `?? null` treats a response predating the field exactly
    // like an unavailable one, so it reads "—" rather than throwing.
    metrics: buildFamilyCompositionMetrics(item.composition ?? null).map((metric) => ({
      id:    metric.id,
      label: metric.label,
      value: metric.value,
      icon:  METRIC_ICONS[metric.id],
    })),
    // A single action. Identity-only dispatch; the string group_id travels to
    // the drawer exactly as it sits here, and Edit lives inside that drawer.
    actions: [
      { id: 'view', label: 'View', icon: ChevronRightIcon },
    ],
  };
}
