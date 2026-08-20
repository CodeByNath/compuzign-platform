// Rate-sheet relationship display label — the single resolution rule for
// showing a package relationship item (inclusion or FAQ source) by name.
// Previously duplicated between usePackageStation.tierView and the tier
// drawer's detail model.

import type { PackageManagerItem } from './types';

export function relationshipDisplayLabel(item: PackageManagerItem): string {
  return item.decorated_label
    ?? (item.resolved && 'label' in item.resolved ? item.resolved.label
      : item.resolved && 'question' in item.resolved ? item.resolved.question
      : '(missing source)');
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
