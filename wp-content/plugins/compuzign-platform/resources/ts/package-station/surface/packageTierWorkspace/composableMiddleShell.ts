// Composable-only middle shell — pure projections.
//
// Admin UX restructuring: the composable occupant's own focused view inserts
// one middle shell between the upper focus area and the existing lower deck.
// These two functions derive its content from data the workspace already
// projects (the occupant's own TierDeck and its settled customer_policy) —
// no second read, no new endpoint, no fabricated figure.

import type { CustomerPolicy, CustomerPolicyItem } from '@/api/types/cost-builder';
import type { StationMetric } from '@/admin-station/presentation/StationMetricBlock';
import type { PackageManagerItem, PackageRateSheet, TierEdition } from '../../types';
import { buildRateSheetCatalogue } from '../../drawer/tier/tierDetailModel';
import { draftPreferredEdition } from '../../drawer/tier/tierEditionModel';
import { projectTierInclusions, type DeckSelection, type TierDeck } from './deck';

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
  deck: Pick<TierDeck, 'inclusions'>,
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

// ── Declaration scope tabs (Phase 3 correction, project-work/2026-09-06-
// tier-catalogue-admin-ux-consolidation.md) ─────────────────────────────────
//
// The auditor's final approved UX: the panel gains one scope tab per
// declaration — Default plus every existing Build Your Own Edition — and
// switching tabs replaces the panel's own Featured inclusions/summary counts
// with THAT declaration's own resolved state. No new drawer, no new card
// action, no copied Edition controller/state: this is a presentation-only
// re-projection of data the occupant and its own tier_editions[] already
// carry.

/** One scope the Customer Selection Rules panel can show. */
export interface ComposableDeclarationScope {
  id: string;
  label: string;
  deck: Pick<TierDeck, 'inclusions'>;
  policy: CustomerPolicy | null;
}

/**
 * An Edition's own inclusion set, projected for display exactly the way its
 * own Inclusions tab resolves it for editing: raw `rate_sheet_items` against
 * its bound sheet's own catalogue (buildRateSheetCatalogue — the SAME
 * resolver PoolInclusionsEditor/TierEditionInclusionsSection already use),
 * then through the SAME dedup/Bundle-expansion projectTierInclusions applies
 * to every occupant deck. An Edition carries no server-resolved
 * `rate_sheet_selections` the way an occupant does, so this is the one place
 * that composes those two already-existing pure functions for a read-only
 * summary — never a third, drifting resolution algorithm.
 */
function projectEditionInclusions(
  edition: TierEdition,
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] },
): TierDeck['inclusions'] {
  const catalogue = buildRateSheetCatalogue(svc, edition.rate_sheet_id, []);
  const byId = new Map(catalogue.map((row) => [row.item_id, row]));
  const selections: DeckSelection[] = edition.rate_sheet_items.map((selection) => {
    const row = byId.get(selection.item_id);
    return {
      item_id: selection.item_id,
      source_type: row?.source_type ?? null,
      source_id: row?.source_id ?? null,
      quantity: selection.quantity,
      resolved: row?.resolved ?? false,
      label: row?.label ?? '(unresolved Rate Sheet item)',
      unit_price: row?.unit_price ?? null,
      per: row?.per ?? null,
      line_total: row?.unit_price ?? null,
      group_id: row?.group_id ?? null,
      bundle_id: row?.bundle_id,
      includes: row?.includes,
    };
  });
  return projectTierInclusions(selections, new Map(), edition.rate_sheet_id);
}

/**
 * Every scope the panel offers — Default first, then one entry per existing
 * Edition in occupant order, using each Edition's own identity/title
 * (draft-preferred, matching every other Edition display in this codebase).
 * No synthetic catch-all tab is ever added.
 *
 * An Edition's own `customer_policy` is null-inherits-Default, non-null-
 * replaces — the exact rule PackageSchema::sanitizeTierEdition() already
 * documents and enforces server-side; this mirrors it for display only, it
 * never re-decides the rule.
 */
export function buildComposableDeclarationScopes(
  deck: TierDeck,
  policy: CustomerPolicy | null,
  editions: readonly TierEdition[],
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] },
): ComposableDeclarationScope[] {
  return [
    { id: 'default', label: 'Default', deck, policy },
    ...editions.map((edition) => {
      const resolved = draftPreferredEdition(edition);
      return {
        id: resolved.id,
        label: resolved.title.trim() || 'Untitled Edition',
        deck: { inclusions: projectEditionInclusions(resolved, svc) },
        policy: resolved.customer_policy ?? policy,
      };
    }),
  ];
}
