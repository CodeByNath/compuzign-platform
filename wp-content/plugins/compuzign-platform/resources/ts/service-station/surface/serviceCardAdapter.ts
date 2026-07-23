// Service → card adapter.
//
// The pure projection from a Service catalogue row (ServiceSummary, the
// /admin/services list route) into the SAME presentation contract the Package
// Family and Service Category Group walls use (CategoryGroupCardItem). It
// fetches nothing and holds no state.
//
// Truthfulness rules, the same ones the Package Family adapter keeps:
//   - Identity is the record's own numeric `id`, carried through unchanged. It
//     is never stringified: the Service routes are numeric, so the number is
//     the real id, and it is what reaches fetchAdminServiceDetail.
//   - Status is NOT re-decided here. `resolveStationStatus` is the authoritative
//     Service resolver already used by the Command Centre catalogue; this
//     adapter only re-expresses its 4-state bucket in the card's 4-state
//     vocabulary. No new status rule is created.
//   - Metrics repeat counts the list route actually supplies. `inclusion_count`
//     and `faq_count` are optional on the summary, so they render as 0 rather
//     than being invented or omitted inconsistently.
//   - Two actions: View and Edit. Both are real drawer tabs (the Service drawer
//     registers both modes), so neither is a dead affordance.

import type { ServiceSummary } from '@/service-station';
import { resolveStationStatus } from '@/drawer-kit/utils/moduleStatus';
import { decodeHtml } from '@/utils/format';
import { ServicesIcon, ViewIcon, TiersIcon, PackagesIcon } from '@/admin-station/shell/icons';
import type {
  CategoryGroupCardItem,
  CategoryGroupStatus,
} from '@/admin-station/presentation/category-groups/types';

/**
 * Re-express the authoritative Service station status in the card's vocabulary.
 *
 * `resolveStationStatus` is the filter bucket the catalogue already uses:
 *   - 'active'   → live and clean
 *   - 'drafts'   → live with unsaved drafts   → pending-full
 *   - 'pending'  → unsettled changes, or never-published → see below
 *   - 'disabled' → was live, explicitly turned off
 *
 * The one nuance the card contract can express and the bucket cannot: a
 * never-published service (disabled + unsettled overview) reads pending-DIM,
 * while a live service with pending changes reads pending-FULL. That is the same
 * dim/full split the Package Family adapter makes, so all three walls read alike.
 */
export function resolveServiceCardStatus(summary: ServiceSummary): CategoryGroupStatus {
  switch (resolveStationStatus(summary)) {
    case 'active':   return 'active';
    case 'disabled': return 'disabled';
    case 'drafts':   return 'pending-full';
    case 'pending':
      // Never-published reads dim; a live service with pending modules reads full.
      return summary.platform_status === 'disabled' ? 'pending-dim' : 'pending-full';
  }
}

/** Project one Service catalogue row into the card the grid renders. */
export function toServiceCard(summary: ServiceSummary): CategoryGroupCardItem {
  const categoryNames = summary.categories
    .filter((c) => c.id !== null)
    .map((c) => decodeHtml(c.name));

  return {
    id:   summary.id,            // native numeric id, unchanged
    key:  summary.slug,
    name: decodeHtml(summary.title) || 'Untitled service',
    // The record's kind, in the reader's language. Data, not a card branch.
    kind: 'Service',
    description: categoryNames.length ? categoryNames.join(', ') : 'Not categorised',
    icon: ServicesIcon,
    status: resolveServiceCardStatus(summary),
    metrics: [
      { id: 'inclusions', label: 'Included features', value: summary.inclusion_count ?? 0, icon: PackagesIcon },
      { id: 'faqs',       label: 'Common questions',  value: summary.faq_count ?? 0,       icon: TiersIcon },
    ],
    // Identity-only dispatch. Both actions open the same drawer; the binding's
    // action intents map them onto the drawer's view / edit tabs.
    actions: [
      { id: 'view', label: 'View', icon: ViewIcon },
      { id: 'edit', label: 'Edit' },
    ],
  };
}
