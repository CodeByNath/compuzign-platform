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
import { projectTierInclusions } from '../packageTierWorkspace/deck';
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

// No category enrichment is needed for a bare count — the shared object
// avoids allocating a new empty Map on every card projection.
const NO_CATEGORIES = new Map<string, string[]>();

export interface TierOccupantCardInput {
  occupantId: string;
  slotId: string;
  // The draft-preferred view for this occupant's slot (null while unresolved).
  view: PackageStationTierView | null;
  // Platform status feeds the same note generator the drawer uses.
  platformStatus: string;
  // Additive, default false — every existing normal Tier/Add-on caller is
  // byte-behaviorally unchanged. True only for the subordinate composable
  // occupant's own card: it must never present as `kind: 'Package Tier'`/
  // `'Package Add-on'` or the Tier-specific glyph, since it is neither.
  isSubordinate?: boolean;
}

/** Project one Tier occupant into the shared card the grid renders. */
export function toTierOccupantCard({
  occupantId,
  slotId,
  view,
  platformStatus,
  isSubordinate = false,
}: TierOccupantCardInput): CategoryGroupCardItem {
  const detail     = view?.detail;
  const price      = detail?.price ?? null;
  // The card/detail metric counts the same REAL, deduped Inclusions the
  // Details lane shows — a Bundle-backed selection expands into what it
  // actually supplies, never counted as one raw commercial row (the same
  // rule composeTierGroup() already applies server-side). This is
  // deliberately NOT `inclusions_override.length`, which is the occupant's
  // own Features EDITOR module (its Bundle row is one editable/selectable
  // unit there, on purpose — Publish completeness reads it, untouched).
  const inclusions = detail
    ? projectTierInclusions(detail.rate_sheet_selections, NO_CATEGORIES, detail.rate_sheet_id).length
    : 0;
  const faqs       = detail?.faq_refs.length ?? 0;
  const isAddon    = detail?.is_addon ?? false;

  return {
    id:   occupantId,          // native stable occupant id, unchanged
    key:  occupantId,
    name: `Package ${detail?.label?.trim() || TIER_LABELS[slotId] || slotId}`,
    kind: isSubordinate ? 'Composable occupant' : (isAddon ? 'Package Add-on' : 'Package Tier'),
    description: price == null
      ? 'Pricing not configured'
      : `$${price.toFixed(2)} · ${detail?.billing_cycle ?? 'Not available'}`,
    icon: isSubordinate ? PackagesIcon : TiersIcon,
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

/**
 * Append the composable occupant's own Customer Options action to its
 * already-projected card — a separate step from toTierOccupantCard() itself
 * (shared by every normal Tier/Add-on card, per its own doc comment) so the
 * action can never leak onto a normal slot's actions array. `eligible` is
 * the caller's own "genuinely published/manageable" fact (occupant.enabled,
 * i.e. platform_status === 'active') — never a bare occupant_id existence
 * check, which is already true for a Pending, never-published occupant.
 * Exported so the composable-occupant-workspace contract can exercise the
 * gate directly. See
 * docs/code-map/tier-composable-occupant-admin-customer-policy.md.
 */
export function withComposableCustomerOptionsAction(
  card: CategoryGroupCardItem,
  eligible: boolean,
): CategoryGroupCardItem {
  if (!eligible) return card;
  return { ...card, actions: [...card.actions, { id: 'customer-options', label: 'Customer Options' }] };
}
