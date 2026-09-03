// Composable-only middle shell — pure projections.
//
// Admin UX restructuring: the composable occupant's own focused view inserts
// one middle shell between the upper focus area and the existing lower deck.
// These two functions derive its content from data the workspace already
// projects (the occupant's own TierDeck and its settled customer_policy) —
// no second read, no new endpoint, no fabricated figure.

import type { CustomerPolicy, CustomerPolicyItem } from '@/api/types/cost-builder';
import type { StationMetric } from '@/admin-station/presentation/StationMetricBlock';
import type { TierDeck } from './deck';

export interface ComposableHighlightInclusion {
  itemId: string;
  name: string;
  featured: boolean;
  mode: CustomerPolicyItem['mode'];
}

const HIGHLIGHT_LIMIT = 6;

/**
 * Up to 6 inclusions for the middle shell's left column — featured first,
 * then required/default-selected, then whatever else the policy offers.
 * An excluded entry is never offered to a customer at all, so it never
 * appears here. No configured policy means nothing is offered yet, so this
 * returns empty rather than falling back to the deck's full inclusion list.
 */
export function projectComposableHighlightInclusions(
  deck: TierDeck,
  policy: CustomerPolicy | null,
): ComposableHighlightInclusion[] {
  const inclusionByItemId = new Map(deck.inclusions.map((inclusion) => [inclusion.itemId, inclusion]));
  const rank = (item: CustomerPolicyItem): number =>
    (item.featured ? 2 : 0) + (item.mode === 'required' || item.default_selected ? 1 : 0);

  return (policy?.items ?? [])
    .filter((item) => item.mode !== 'excluded')
    .map((item) => ({ item, inclusion: inclusionByItemId.get(item.item_id) ?? null }))
    .filter((entry): entry is { item: CustomerPolicyItem; inclusion: NonNullable<typeof entry.inclusion> } =>
      entry.inclusion !== null,
    )
    .sort((a, b) => rank(b.item) - rank(a.item))
    .slice(0, HIGHLIGHT_LIMIT)
    .map(({ item, inclusion }) => ({
      itemId: item.item_id,
      name: inclusion.name,
      featured: item.featured,
      mode: item.mode,
    }));
}

/**
 * The right column's concise Customer Selection Rules facts — offered mode,
 * Add/Remove state, selected-by-default, quantity-enabled, and Featured —
 * as aggregate counts, matching the standalone drawer's own "N always
 * included · N customer Add/Remove" summary style rather than a per-item
 * table. An excluded entry is never offered, so it is not counted here.
 */
export function summarizeComposableCustomerPolicy(policy: CustomerPolicy | null): StationMetric[] {
  const offered = (policy?.items ?? []).filter((item) => item.mode !== 'excluded');
  const required = offered.filter((item) => item.mode === 'required').length;
  const optional = offered.filter((item) => item.mode === 'optional');
  const defaultSelected = optional.filter((item) => item.default_selected).length;
  const quantityEnabled = offered.filter((item) => item.quantity !== null).length;
  const featured = offered.filter((item) => item.featured).length;

  return [
    { id: 'required', label: 'Always included', value: required },
    { id: 'optional', label: 'Customer Add/Remove', value: optional.length },
    { id: 'default-selected', label: 'Selected by default', value: `${defaultSelected} of ${optional.length}` },
    { id: 'quantity', label: 'Adjustable quantity', value: quantityEnabled },
    { id: 'featured', label: 'Featured', value: featured },
  ];
}
