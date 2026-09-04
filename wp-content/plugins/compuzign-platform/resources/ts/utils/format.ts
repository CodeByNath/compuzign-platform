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
// customer-validation.md, "deployed customer validation failed" round):
// this was hard-coded to minimumFractionDigits: 0 / maximumFractionDigits: 0
// — every Cost Builder customer surface using this shared formatter silently
// rounded a real fractional rate to the nearest whole dollar (a genuine
// $0.20 line read as "$0", a genuine $36.50 line read as "$37"), even
// though the numeric value arriving here was already correct end-to-end
// (Rate Sheet -> resolver -> commercial component -> quote snapshot ->
// totals never rounds/truncates before this call — verified, no
// Math.round/toFixed/parseInt anywhere in that pipeline). The bug was
// entirely in this one shared money presentation contract, not a
// calculation defect — fixed here once, not per-caller, per the "one
// established shared formatter/path" requirement.
//
// Cents are preserved whenever they're materially present (rounded to the
// nearest cent, since Rate Sheets/Price Options never carry sub-cent
// precision) and dropped when the value is an exact whole dollar, so
// ordinary whole-dollar prices keep reading as "$50" rather than "$50.00"
// everywhere this is already relied on. This is the ONLY rounding step in
// the entire pipeline (to the nearest cent, at final render) — it must
// never feed back into another calculation.
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return 'Contact Us';
  const hasCents = Math.round(price * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(price);
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
