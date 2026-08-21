// Rate-sheet relationship display label — the single resolution rule for
// showing a package relationship item (inclusion or FAQ source) by name.
// Previously duplicated between usePackageStation.tierView and the tier
// drawer's detail model.

import type {
  PackageManagerItem, PackageRateSheetItem, TierRateSheetSelection, TierResolvedRateSheetSelection,
} from './types';

export function relationshipDisplayLabel(item: PackageManagerItem): string {
  return item.decorated_label
    ?? (item.resolved && 'label' in item.resolved ? item.resolved.label
      : item.resolved && 'question' in item.resolved ? item.resolved.question
      : '(missing source)');
}

/**
 * Resolve ONE Rate Sheet selection against the bound sheet's own rows and
 * the Manager's package relationships — identity, label, and effective
 * price, all in one place. The single per-selection resolution rule shared
 * by usePackageStation's own live Tier occupant price/inclusions and the
 * Tier drawer's own Edition detail model (tierEditionDetailModel.ts). Both
 * previously carried their own copy of this logic; the Edition's copy had
 * drifted (a naive `unit_price`/`quantity: 1` from buildRateSheetCatalogue's
 * own generic candidate row, never the selection's OWN quantity/
 * price_option_id) — this is the one rule now, matching
 * `PackageManagerSchema::projectTierRateSheetWith`'s own effective-price
 * logic server-side.
 *
 * `staleLabel` is an optional continuity fallback: a caller that already
 * holds a PRIOR resolution for this same item_id (usePackageStation's own
 * `dp.rate_sheet_selections`, carried over from the settled occupant) may
 * pass that row's last-known label, so an item that briefly stops resolving
 * doesn't flash to the generic "(unresolved Rate Sheet item)" placeholder.
 * Omit it where no such prior resolution exists (e.g. the Edition detail
 * model, which keeps none).
 */
export function resolveRateSheetSelection(
  selection: TierRateSheetSelection,
  rateById: Map<string, PackageRateSheetItem>,
  sourceById: Map<string, PackageManagerItem>,
  staleLabel?: string,
): TierResolvedRateSheetSelection {
  const rateItem = rateById.get(selection.item_id);
  const source = rateItem ? sourceById.get(rateItem.source_item_id) : undefined;
  // A Bundle-backed row stands behind itself (see PackageRateSheetItem's
  // `bundle_id`) — it has no Manager source to resolve against, so it
  // resolves on its own presence instead, the same rule
  // buildRateSheetCatalogue() already uses for the picker's own candidate
  // list. Without this, a Bundle-only selection resolves as unresolved here
  // even though the picker correctly offered it.
  const bundleBacked = !!rateItem && (rateItem.bundle_id ?? '') !== '';
  const resolved = bundleBacked || (!!rateItem && !!source && !source.missing);
  // A Bundle-backed selection reads its OWN row label (the Bundle Name),
  // the same "Untitled Bundle" fallback the Rate Sheet tool and
  // buildRateSheetCatalogue() already use — same single label string every
  // plain Feature carries, so the read card's chip looks identical to any
  // other Feature's. Its supplied content is shown separately, in the
  // inclusion editor's own read-only sub-list (see PoolInclusionsEditor.tsx),
  // not baked into this label.
  const label = bundleBacked
    ? (rateItem?.label?.trim() || 'Untitled Bundle')
    : resolved && source
      ? relationshipDisplayLabel(source)
      : staleLabel ?? '(unresolved Rate Sheet item)';
  // Effective unit price mirrors PackageManagerSchema::projectTierRateSheetWith:
  // Default Price unless price_option_id resolves against this row's own
  // price_options[]; a present-but-unresolved id never falls back to
  // Default Price.
  const priceOptionId = selection.price_option_id ?? null;
  const selectedOption = priceOptionId !== null
    ? rateItem?.price_options?.find((option) => option.option_id === priceOptionId) ?? null
    : null;
  const optionUnresolved = priceOptionId !== null && !selectedOption;
  const unitPrice = resolved && rateItem && !optionUnresolved
    ? (selectedOption ? selectedOption.unit_price : rateItem.unit_price)
    : null;
  return {
    ...selection, resolved, label,
    price_option_id: priceOptionId,
    source_type: source?.source_type ?? null,
    source_id: source?.source_id ?? null,
    unit_price: unitPrice,
    per: resolved && rateItem ? rateItem.per : null,
    group_id: resolved && rateItem ? rateItem.group_id : null,
    line_total: unitPrice !== null ? unitPrice * selection.quantity : null,
    price_options: rateItem?.price_options,
    // Display only — what the row calls the price this selection already
    // uses when it carries no price_option_id.
    default_price_label: rateItem?.default_price_label,
    bundle_id: rateItem?.bundle_id,
    includes: rateItem?.includes,
  };
}

/** The built-in name of a row's own `unit_price`, used wherever the admin has
 *  not named it something else. */
export const DEFAULT_PRICE_LABEL = 'Default Price';

/**
 * What a row's own default price is CALLED: the admin's own name for it when
 * set, otherwise the built-in one. Inherit-when-empty, exactly like a Bundle
 * row's own `label`. One rule, so the Rate Sheet tool's tab strip, a locked
 * row's summary, and a Tier's price selector can never disagree on the name of
 * the same price. It names only — the Default Price is still selected by the
 * absence of a `price_option_id`.
 */
export function defaultPriceLabel(label: string | null | undefined): string {
  const own = label?.trim() ?? '';
  return own !== '' ? own : DEFAULT_PRICE_LABEL;
}
