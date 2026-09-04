// Contract: the shared money presentation contract (utils/format.ts::formatPrice())
// (project-work/2026-09-03-composable-tier-admin-to-customer-validation.md,
// "deployed customer validation failed" round). Auditor finding: formatPrice()
// was hard-coded to minimumFractionDigits: 0 / maximumFractionDigits: 0,
// silently rounding a real fractional rate to the nearest whole dollar on
// every Cost Builder customer surface that calls it — a presentation bug,
// not a calculation defect (no rounding/truncation exists anywhere upstream
// in the resolver/aggregation pipeline). Representative regression values
// per the auditor's own requirement: a fractional sub-dollar rate, a
// fractional >$1 rate, and an exact whole-dollar rate.

import { formatPrice } from '../resources/ts/utils/format';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Money format contract: ${message}`);
}

// 1. Fractional sub-dollar rate — the auditor's own reported live symptom:
// a real $0.20 line previously rendered as "$0".
check(formatPrice(0.2) === '$0.20', `a $0.20 rate must render as "$0.20", not round to "$0" — got ${formatPrice(0.2)}`);

// 2. Fractional >$1 rate — the auditor's own reported live symptom: a real
// $36.50 line previously rendered as "$37".
check(formatPrice(36.5) === '$36.50', `a $36.50 rate must render as "$36.50", not round to "$37" — got ${formatPrice(36.5)}`);

// 3. Exact whole-dollar rate — must NOT gain a spurious ".00" now that
// cents are preserved when present; whole-dollar presentation stays exactly
// as customers already see it everywhere else in the app.
check(formatPrice(50) === '$50', `an exact $50 rate must render as "$50", never "$50.00" — got ${formatPrice(50)}`);
check(formatPrice(0) === '$0', `an exact $0 rate must render as "$0" — got ${formatPrice(0)}`);

// 4. Mixed aggregation: a fractional value that happens to sum to a whole
// dollar (e.g. 0.20 * 5 = 1.00) reads as whole-dollar, not "$1.00" —
// exercises the same hasCents check against a value arriving via
// multiplication (floating-point drift), not a hand-typed literal.
check(formatPrice(0.2 * 5) === '$1', `0.20 x 5 = $1.00 exactly must render as "$1" — got ${formatPrice(0.2 * 5)}`);

// 5. A fractional cent-precision value that is NOT a clean two-decimal
// literal (floating-point drift from repeated multiplication upstream)
// still rounds to the nearest cent rather than exposing floating-point
// noise or additional fraction digits.
check(formatPrice(0.1 + 0.2) === '$0.30', `0.1 + 0.2 (floating-point drift) must still render as "$0.30" — got ${formatPrice(0.1 + 0.2)}`);

// 6. Null/undefined contract is unchanged — "Contact Us" for an unresolved
// price, the same fallback every existing caller already relies on.
check(formatPrice(null) === 'Contact Us', 'a null price still renders "Contact Us"');
check(formatPrice(undefined) === 'Contact Us', 'an undefined price still renders "Contact Us"');

console.log('Money format contract passed.');
