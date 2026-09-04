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
// customer-validation.md, "deployed customer validation failed" round,
// then "SOURCE-PRECISION MONEY SAFEGUARD" round): this was hard-coded to
// minimumFractionDigits: 0 / maximumFractionDigits: 0 — every Cost Builder
// customer surface using this shared formatter silently rounded a real
// fractional rate to the nearest whole dollar (a genuine $0.20 line read
// as "$0", a genuine $36.50 line read as "$37"), even though the numeric
// value arriving here was already correct end-to-end (Rate Sheet ->
// resolver -> commercial component -> quote snapshot -> totals never
// rounds/truncates before this call — verified, no Math.round/toFixed/
// parseInt anywhere in that pipeline). The bug was entirely in this one
// shared money presentation contract, not a calculation defect — fixed
// here once, not per-caller.
//
// First-round fix (rejected): rounding to the nearest CENT assumed every
// Rate Sheet unit_price is 2-decimal currency. That's false for real
// KAIROS rates — Object Storage is $0.023/GB, Archive/Cold Storage is
// $0.004/GB — and a cent-precision formatter recreates the exact same
// "genuine non-zero value displays as $0" failure for those (0.004 would
// display as $0). Locked money architecture: Rate Sheet unit_price is a
// RATE, not inherently 2-decimal currency; source-defined fractional
// precision is authoritative and must survive to at least 3 decimal
// places, with no artificially low hardcoded ceiling.
//
// This version rounds to 6 decimal places (a generous, deliberately
// bounded ceiling — well beyond the highest-precision real rate known
// today, $0.023/$0.004 at 3 decimals, with headroom; if the Rate Sheet
// schema is ever given a formal precision policy exceeding this, revisit
// it explicitly rather than silently) purely to absorb IEEE-754 floating-
// point arithmetic noise (e.g. 0.1 + 0.2 === 0.30000000000000004) —
// never to discard genuine source precision, since no real rate is known
// to need more than 3-4 decimals. Intl.NumberFormat then renders the
// MINIMAL number of fraction digits within [2, 6] that represents that
// rounded value exactly, so $0.20 stays "$0.20" (not "$0.2"), $0.023
// stays "$0.023", and $0.004 stays "$0.004" — never collapsed to zero. An
// EXACT whole dollar is the only case shown with 0 decimals ("$50", not
// "$50.00"), preserving the existing whole-dollar convention every other
// caller already relies on. This is the ONLY rounding step in the entire
// pipeline (a wide 6-decimal noise-absorption round, at final render) —
// it must never feed back into another calculation; every summation
// (disclosure row totals, cart/Details/commitment aggregates) operates on
// the original unrounded numeric values and only this function ever
// touches display precision.
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'Contact Us';
  const rounded = Math.round(price * 1e6) / 1e6;
  const isWhole = Number.isInteger(rounded);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 6,
  }).format(rounded);
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
