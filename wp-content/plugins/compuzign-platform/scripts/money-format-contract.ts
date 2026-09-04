// Contract: the shared money presentation contract (utils/format.ts::formatPrice())
// (project-work/2026-09-03-composable-tier-admin-to-customer-validation.md
// — "deployed customer validation failed", then "SOURCE-PRECISION MONEY
// SAFEGUARD", then "MONEY PRECISION SAFEGUARD, ROUND 2"). Auditor finding:
// formatPrice() was hard-coded to minimumFractionDigits: 0 /
// maximumFractionDigits: 0, silently rounding a real fractional rate to the
// nearest whole dollar — a presentation bug, not a calculation defect (no
// rounding/truncation exists anywhere upstream in the resolver/aggregation
// pipeline).
//
// Two rejected fixes: (1) cent-precision rounding — real KAIROS rates go
// below one cent ($0.023/GB, $0.004/GB), so rounding to the nearest cent
// recreated the same "genuine non-zero value displays as $0" failure.
// (2) a fixed 6-decimal-place rounding ceiling — still an arbitrary
// business precision cap invented in presentation code; a real rate below
// 0.0000005 would again collapse to $0. The accepted fix suppresses ONLY
// floating-point arithmetic noise by rounding to 15 SIGNIFICANT digits
// (not decimal places) — a property of the IEEE-754 double representation
// itself, not a currency policy — so precision scales with the value's own
// magnitude rather than being truncated at a fixed decimal position.

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
// fractional precision is preserved when present; whole-dollar presentation
// stays exactly as customers already see it everywhere else in the app.
check(formatPrice(50) === '$50', `an exact $50 rate must render as "$50", never "$50.00" — got ${formatPrice(50)}`);
check(formatPrice(0) === '$0', `an exact $0 rate must render as "$0" — got ${formatPrice(0)}`);

// 4. Real sub-cent KAIROS rates — the exact auditor-supplied fixtures that
// broke the rejected cent-precision fix. Object Storage ($0.023/GB) and
// Archive/Cold Storage ($0.004/GB) must display their true source
// precision, never collapse to "$0.02" or "$0".
check(formatPrice(0.023) === '$0.023', `Object Storage's real $0.023/GB rate must render as "$0.023", not "$0.02" — got ${formatPrice(0.023)}`);
check(formatPrice(0.004) === '$0.004', `Archive/Cold Storage's real $0.004/GB rate must render as "$0.004", never "$0" — got ${formatPrice(0.004)}`);

// 5. A one-decimal literal still gets the standard 2-decimal currency floor
// (never a bare "$0.1").
check(formatPrice(0.1) === '$0.10', `a $0.10 rate must render as "$0.10", never "$0.1" — got ${formatPrice(0.1)}`);

// 6. Mixed aggregation: a fractional value that happens to sum to a whole
// dollar (e.g. 0.20 * 5 = 1.00) reads as whole-dollar, not "$1.00" —
// exercises the formatter against a value arriving via multiplication
// (floating-point drift), not a hand-typed literal.
check(formatPrice(0.2 * 5) === '$1', `0.20 x 5 = $1.00 exactly must render as "$1" — got ${formatPrice(0.2 * 5)}`);

// 7. Floating-point arithmetic noise (0.1 + 0.2 !== 0.3 in IEEE-754) must
// never surface as extra fraction digits — the significant-digit noise
// suppression exists specifically for this, distinct from discarding
// genuine source precision (see cases 4-5, 8-9, which must NOT be rounded
// away).
check(formatPrice(0.1 + 0.2) === '$0.30', `0.1 + 0.2 (floating-point drift) must still render as "$0.30" — got ${formatPrice(0.1 + 0.2)}`);

// 8. A rate needing more than 3 decimals is still shown faithfully — no
// hardcoded decimal-place ceiling.
check(formatPrice(0.0004) === '$0.0004', `a $0.0004 rate must render its true precision, not a hardcoded 3-decimal cap — got ${formatPrice(0.0004)}`);

// 9. Deep sub-cent fixtures (round 2's own required regressions): a rate
// far below the rejected 6-decimal-place ceiling must still render its
// true value — proving the formatter does not collapse a value merely
// because it exceeds ANY fixed number of fractional places. These are
// deliberately deeper than any known real Rate Sheet value, to prove the
// mechanism itself (significant-digit noise suppression) has no such cap
// baked in, not merely that today's specific rates happen to fit under one.
check(formatPrice(0.0000004) === '$0.0000004', `a $0.0000004 rate must render its true 7-decimal precision, never collapse to "$0" merely for exceeding a hardcoded decimal-place ceiling — got ${formatPrice(0.0000004)}`);
check(formatPrice(0.00000004) === '$0.00000004', `a $0.00000004 rate must render its true 8-decimal precision — got ${formatPrice(0.00000004)}`);

// 10. Null/undefined contract is unchanged — "Contact Us" for an
// unresolved price, the same fallback every existing caller already relies
// on.
check(formatPrice(null) === 'Contact Us', 'a null price still renders "Contact Us"');
check(formatPrice(undefined) === 'Contact Us', 'an undefined price still renders "Contact Us"');

console.log('Money format contract passed.');
