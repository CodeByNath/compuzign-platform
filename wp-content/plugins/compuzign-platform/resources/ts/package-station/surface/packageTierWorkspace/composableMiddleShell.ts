// Composable-only middle shell — pure projections.
//
// Admin UX restructuring: the composable occupant's own focused view inserts
// one middle shell between the upper focus area and the existing lower deck.
// These functions derive its content from data the workspace already
// projects (the occupant's own TierDeck and its settled customer_policy) —
// no second read, no new endpoint, no fabricated figure.
//
// Live-UI correction (project-work/2026-09-06-tier-catalogue-admin-ux-
// consolidation.md, Phase 3 correction): a declaration scope now also
// carries the upper Build Your Own detail card's own fields (price/billing
// display, included-feature count, common-question count) alongside the
// deck/policy it already carried, so ONE selected scope
// (owned in PackageTierWorkspace.tsx, not this file) drives the upper card
// and both lower columns together. projectDeclarationDetailCard merges a
// scope's fields onto the occupant's base card; it never re-decides identity
// (name/kind/status/actions), only the fields the card already derives from
// declaration data.

import type { CustomerPolicy, CustomerPolicyItem } from '@/api/types/cost-builder';
import type { StationMetric } from '@/admin-station/presentation/StationMetricBlock';
import type { CategoryGroupCardItem } from '@/admin-station/presentation/category-groups/types';
import { PackagesIcon, RateSheetIcon } from '@/admin-station/shell/icons';
import type { PackageManagerItem, PackageRateSheet, PackageRateSheetItem, TierEdition } from '../../types';
import { buildRateSheetCatalogue } from '../../drawer/tier/tierDetailModel';
import { draftPreferredEdition } from '../../drawer/tier/tierEditionModel';
import { resolveRateSheetSelection } from '../../rateSheetLabels';
import { formatTierPriceDisplay } from '../tierSurface/tierOccupantCard';
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
  // Live-UI correction (project-work/2026-09-06-tier-catalogue-admin-ux-
  // consolidation.md, Phase 3 correction) — the upper Build Your Own detail
  // card's own declaration-scoped fields, so selecting a scope re-projects
  // that card exactly the way it already re-projects Featured
  // Inclusions/Customer Selection Rules below. Reuses formatTierPriceDisplay
  // (surface/tierSurface/tierOccupantCard.ts, the same formula the
  // occupant's own Default card already renders through) and this scope's
  // own `deck.inclusions`/faq count — never a second pricing/metric
  // algorithm.
  priceDisplay: string;
  includedFeatureCount: number;
  commonQuestionCount: number;
}

/**
 * Merge one declaration scope's own upper-card fields onto the occupant's
 * base card (toTierOccupantCard's own output) — price/billing display and
 * the two metric counts change with the selected scope; every other field
 * (name, kind, status, notifications, actions) stays the occupant's own
 * identity, since those are not declaration-owned. The metric id/label/icon
 * pairing mirrors toTierOccupantCard's own `metrics` array exactly, so the
 * upper card reads identically whichever scope is selected.
 */
export function projectDeclarationDetailCard(
  baseCard: CategoryGroupCardItem,
  scope: ComposableDeclarationScope,
): CategoryGroupCardItem {
  return {
    ...baseCard,
    description: scope.priceDisplay,
    metrics: [
      { id: 'features', label: 'Included features', value: scope.includedFeatureCount, icon: PackagesIcon },
      { id: 'faqs', label: 'Common questions', value: scope.commonQuestionCount, icon: RateSheetIcon },
    ],
  };
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
 * An Edition's own resolved price — the SAME per-selection resolution rule
 * (resolveRateSheetSelection, rateSheetLabels.ts) the Tier Edition detail
 * model's own Overview price binding uses (buildTierEditionDetail,
 * drawer/tier/tierEditionDetailModel.ts), reused here rather than the
 * weaker buildRateSheetCatalogue()-based candidate row projectEditionInclusions
 * above draws its LISTING from (that one answers "what's included," not
 * "what it costs" — conflating them reintroduces exactly the drift
 * resolveRateSheetSelection's own doc comment describes). Never `edition.price`
 * directly: that stored field is not what the Edition's own established
 * Overview card displays.
 */
function projectEditionPrice(
  edition: TierEdition,
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] },
): number | null {
  const boundRateSheet = svc.rate_sheets.find((sheet) => sheet.rate_sheet_id === edition.rate_sheet_id) ?? null;
  const sourceById = new Map(svc.package_relationships.map((item) => [item.item_id, item]));
  const rateById = new Map<string, PackageRateSheetItem>((boundRateSheet?.items ?? []).map((item) => [item.item_id, item]));
  const resolvedSelections = edition.rate_sheet_items.map((selection) =>
    resolveRateSheetSelection(selection, rateById, sourceById),
  );
  return resolvedSelections.some((item) => item.resolved)
    ? resolvedSelections.reduce((total, item) => total + (item.line_total ?? 0), 0)
    : null;
}

/** The Default declaration's own upper-card fields, already resolved by the
 *  workspace exactly the way toTierOccupantCard() reads them (usePackageStation's
 *  own live-resolved `dp.price`, stored `billing_cycle`, and `faq_refs`) —
 *  passed in rather than re-derived, so this file never re-reads
 *  `rate_sheet_selections` a second time for the same figure. */
export interface ComposableDefaultDeclaration {
  price: number | null;
  billing_cycle: string | null;
  faq_refs: string[];
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
 * never re-decides the rule. An Edition's own empty `faq_refs` inherits the
 * parent occupant's own FAQ count the same way (TierEdition.faq_refs's own
 * doc comment, types.ts).
 */
export function buildComposableDeclarationScopes(
  deck: TierDeck,
  policy: CustomerPolicy | null,
  editions: readonly TierEdition[],
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] },
  defaultDeclaration: ComposableDefaultDeclaration,
): ComposableDeclarationScope[] {
  return [
    {
      id: 'default',
      label: 'Default',
      deck,
      policy,
      priceDisplay: formatTierPriceDisplay(defaultDeclaration.price, defaultDeclaration.billing_cycle),
      includedFeatureCount: deck.inclusions.length,
      commonQuestionCount: defaultDeclaration.faq_refs.length,
    },
    ...editions.map((edition) => {
      const resolved = draftPreferredEdition(edition);
      const inclusions = projectEditionInclusions(resolved, svc);
      return {
        id: resolved.id,
        label: resolved.title.trim() || 'Untitled Edition',
        deck: { inclusions },
        policy: resolved.customer_policy ?? policy,
        priceDisplay: formatTierPriceDisplay(projectEditionPrice(resolved, svc), resolved.billing_cycle),
        includedFeatureCount: inclusions.length,
        commonQuestionCount: resolved.faq_refs.length > 0 ? resolved.faq_refs.length : defaultDeclaration.faq_refs.length,
      };
    }),
  ];
}
