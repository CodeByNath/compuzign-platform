// The Tier occupant card projection — one definition, two consumers.
//
// Both the Tier presentation wall (useServiceTierCards) and the Package Station
// Tier tool (usePackageTierWorkspace) render the SAME established Tier card:
// title "Package <label>", pricing line, resolved status and notes, feature/FAQ
// metrics, and the View/Edit pair. Extracted here so neither consumer keeps a
// reduced copy and the two can never disagree about what a Tier card is.
//
// Identity, the part that matters: the card's `id`/`key` is `occupant_id`, the
// Package Station's own stable occupant key — NOT the tier slot name, which is a
// reassignable position. The drawer re-resolves the slot from this occupant id
// after the station loads, so a stale card can never address the wrong shell.

import { getTierNotes } from '@/drawer-kit/utils/moduleNotifications';
import { TIER_LABELS } from '../../vocabulary';
import type { PackageStationTierView } from '../../usePackageStation';
import { TiersIcon, ViewIcon, PackagesIcon, RateSheetIcon } from '@/admin-station/shell/icons';
import type {
  CategoryGroupCardItem,
  CategoryGroupStatus,
} from '@/admin-station/presentation/category-groups/types';

// The tier resolver returns a 5-state vocabulary; the card contract accepts four.
// 'not-configured' is the never-touched shell, which reads as the dim pending
// state — the same collapse the card kit makes elsewhere.
export function toTierCardStatus(status: string): CategoryGroupStatus {
  switch (status) {
    case 'active':       return 'active';
    case 'disabled':     return 'disabled';
    case 'pending-full': return 'pending-full';
    default:             return 'pending-dim';
  }
}

export interface TierOccupantCardInput {
  occupantId: string;
  slotId: string;
  // The draft-preferred view for this occupant's slot (null while unresolved).
  view: PackageStationTierView | null;
  // Platform status feeds the same note generator the drawer uses.
  platformStatus: string;
}

/** Project one Tier occupant into the shared card the grid renders. */
export function toTierOccupantCard({
  occupantId,
  slotId,
  view,
  platformStatus,
}: TierOccupantCardInput): CategoryGroupCardItem {
  const detail     = view?.detail;
  const price      = detail?.price ?? null;
  const inclusions = detail?.inclusions_override.length ?? 0;
  const faqs       = detail?.faq_refs.length ?? 0;
  const isAddon    = detail?.is_addon ?? false;

  return {
    id:   occupantId,          // native stable occupant id, unchanged
    key:  occupantId,
    name: `Package ${detail?.label?.trim() || TIER_LABELS[slotId] || slotId}`,
    kind: isAddon ? 'Package Add-on' : 'Package Tier',
    description: price == null
      ? 'Pricing not configured'
      : `$${price.toFixed(2)} · ${detail?.billing_cycle ?? 'Not available'}`,
    icon:   TiersIcon,
    status: toTierCardStatus(view?.status ?? 'pending-dim'),
    // The same notes the manager card shows, from the same generator, using
    // occupant truth (not the parent Tier Group/station status) — mirrors
    // TierDrawerContent's package-overview list.
    notifications: detail ? getTierNotes(detail, {
      platformStatus: detail.enabled ? 'active' : 'disabled',
      disabled:       detail.is_explicitly_disabled,
    }) : [],
    metrics: [
      { id: 'features', label: 'Included features', value: inclusions, icon: PackagesIcon },
      { id: 'faqs',     label: 'Common questions',  value: faqs,       icon: RateSheetIcon },
    ],
    actions: [
      { id: 'view', label: 'View', icon: ViewIcon },
      { id: 'edit', label: 'Edit' },
    ],
  };
}
