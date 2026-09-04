// The one decodeHtml. Carries the non-DOM guard that the admin drawer copy had,
// so the drawer compositions can share this implementation rather than keep
// their own.
export function decodeHtml(value: string): string {
  if (typeof document === 'undefined') return value;
  const txt = document.createElement('textarea');
  txt.innerHTML = value;
  return txt.value;
}

// Auditor correction (project-work/2026-09-03-composable-tier-admin-to-
// customer-validation.md — "deployed customer validation failed", then
// "SOURCE-PRECISION MONEY SAFEGUARD", then "MONEY PRECISION SAFEGUARD,
// ROUND 2"): this was hard-coded to minimumFractionDigits: 0 /
// maximumFractionDigits: 0 — every Cost Builder customer surface using
// this shared formatter silently rounded a real fractional rate to the
// nearest whole dollar. The numeric value arriving here was always
// correct end-to-end (verified: no Math.round/toFixed/parseInt anywhere
// upstream in the resolver/aggregation pipeline) — the bug was entirely
// in this one shared presentation contract, fixed here once.
//
// Two rejected fixes, for the record: (1) rounding to the nearest CENT
// assumed every rate is 2-decimal currency — false for real KAIROS rates
// below one cent ($0.023/GB, $0.004/GB). (2) rounding to a fixed SIX
// DECIMAL PLACES was still an arbitrary business precision ceiling
// invented in presentation code — the Rate Sheet schema has no such cap,
// and a real rate below 0.0000005, or needing more than 6 fractional
// digits, would again silently become $0.
//
// Locked distinction this version applies: business precision is owned by
// the Rate Sheet value/schema (currently uncapped) and must never be
// approximated here; runtime floating-point noise is a property of the
// JS `number` type itself (IEEE-754 double), not a pricing policy, and
// suppressing it must be justified by that representation, not by
// deciding how many decimal PLACES currency should have. A double
// reliably round-trips through at most ~15-17 significant decimal
// digits; ordinary arithmetic (e.g. 0.1 + 0.2) only ever corrupts the
// last couple of those, at the far (17th) end (0.1 + 0.2 ===
// 0.30000000000000004 — an 18-significant-digit value). Rounding to 15
// SIGNIFICANT digits (Number(value.toPrecision(15))) — not 15 decimal
// PLACES, not a currency decimal cap — strips exactly that class of
// noise while preserving every digit any real rate could carry: it acts
// relative to the value's own magnitude, so $0.0000004 keeps its full
// precision (7 decimal places) exactly as faithfully as $0.023 keeps
// its 3, and no non-zero authoritative rate can ever collapse to $0
// purely from a fixed decimal-place ceiling. Intl.NumberFormat's own
// maximumFractionDigits: 20 below is the API's own technical range
// (comfortably covering any magnitude a double can meaningfully carry),
// never a business decimal-place assumption — the actual digits shown
// are controlled entirely by the noise-suppressed value itself, which
// Intl trims to its minimal true representation (floored at 2 decimals
// once any fraction is present, matching the standard $X.XX currency
// convention; an exact whole dollar still shows 0 decimals, e.g. "$50"
// not "$50.00").
//
// This is the ONLY numeric adjustment in the entire pipeline (a
// representation-aware noise suppression, at final render) — it must
// never feed back into another calculation; every summation (disclosure
// row totals, cart/Details/commitment aggregates) operates on the
// original unrounded numeric values, and only this function ever touches
// display precision.
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'Contact Us';
  const clean = price === 0 ? 0 : Number(price.toPrecision(15));
  const isWhole = Number.isInteger(clean);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 20,
  }).format(clean);
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const CYCLE_LABELS: Record<string, string> = {
  monthly:    '/ mo',
  annual:     '/ yr',
  annually:   '/ yr',
  quarterly:  '/ qtr',
  'one-time': '',
};

export function formatCycleLabel(billingCycle: string): string {
  return CYCLE_LABELS[billingCycle] ?? '';
}
