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

// Tier Pricing Rules' fixed vocabularies (PackageSchema::PAYMENT_CATEGORIES /
// COMMERCIAL_LEG_BILLING_CYCLES) — distinct from the legacy scalar
// billing_cycle's own BILLING_CYCLES vocabulary. See
// docs/code-map/tier-pricing-rules-plan.md.
export const PAYMENT_CATEGORY_LABELS: Record<string, string> = {
  'one-time': 'One-time',
  recurring: 'Recurring',
};

export const COMMERCIAL_LEG_CYCLE_LABELS: Record<string, string> = {
  upfront: 'Upfront',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

/**
 * A commercial leg's own short display badge — cycle name plus its inclusive
 * month range (or "Indefinite" when there's no bounding commitment) —
 * shared by the Commercial Schedule editor and Included Features' own
 * per-leg Price Option rows so the two never name the same leg differently.
 */
export function commercialLegLabel(leg: { billing_cycle: string; start_month: number; end_month: number | null }): string {
  const cycle = COMMERCIAL_LEG_CYCLE_LABELS[leg.billing_cycle] ?? leg.billing_cycle;
  const end = leg.end_month === null ? 'Indefinite' : String(leg.end_month);
  return `${cycle} · Mo ${leg.start_month}–${end}`;
}
