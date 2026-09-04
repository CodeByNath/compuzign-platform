# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — SOURCE-PRECISION MONEY SAFEGUARD**
- Auditor verdict: **Stop — architectural risk**
- Production/base: `main@bdac492215e8aebea861a783924b9bdc2d46393a`
- Reviewed head: `review/upgrade-journey-finalisation@f4e863662ca0050ca0640f9e18a73a1cec682e87`
- Do not push this head to `main` yet.

## Accepted from `f4e86366`
The browser `$0` defect was correctly traced to presentation rather than proven numeric truncation. Backend Rate Sheet sanitization/resolution already keeps floats and computes `line_total = unit_price * quantity`; the disclosure redesign is directionally acceptable: in-flow panel, SVG chevron, Inclusion/Qty/Price, authoritative stored `line_total`, subtotal, independent remove control.

## Blocking architecture finding
The proposed shared formatter still embeds an invalid platform assumption:

`Math.round(price * 100)` + `maximumFractionDigits: 2` assumes all Rate Sheet money is cent-precision. That is false for current CompuZign source data.

Authoritative KAIROS Price List contains, for example:
- Object Storage: **$0.023 / GB**
- Archive / Cold Storage: **$0.004 / GB**

The current Rate Sheet schema also stores `unit_price` as float without a 2-decimal restriction. Under `f4e86366`, `$0.023` displays `$0.02` and `$0.004` displays `$0`, recreating the same integrity failure for legitimate rates.

## Locked money architecture
1. **Rate Sheet `unit_price` is a rate, not inherently a 2-decimal currency amount.** Source-defined fractional precision is authoritative.
2. Resolver, Commercial Legs, quote snapshots, quantity multiplication, and aggregation carry the numeric value unchanged. Never round/truncate for business logic.
3. Presentation must never render a non-zero authoritative value as zero merely because it is below one cent.
4. Do not impose cent precision unless a separate, explicit billing/settlement rounding rule is later approved. None is established here.
5. Use one shared money presentation utility/path, but it may distinguish semantic presentation needs (for example rate/detail versus aggregate) rather than duplicating formatters per component.
6. Current source compatibility must cover at least **3 decimal places**; do not hardcode a future precision limit without evidence/schema policy.

## Exact correction for Claude
- Remove the cent-only `hasCents = Math.round(price * 100)` assumption.
- Audit current Rate Sheet values and establish a shared formatter rule that faithfully displays material source precision, including `$0.023` and `$0.004`, while avoiding floating-point noise such as `0.1 + 0.2`.
- Keep formatting presentation-only; no formatted value may feed calculations.
- Extend `contract:money-format` with `$0.023`, `$0.004`, `$0.10`, `$36.50`, whole-dollar, floating-drift, and multiplied/aggregated fixtures.
- Verify disclosure row totals and subtotal use original numeric `line_total` values; no display-rounding before summation.
- Preserve all prior Upgrade readiness, cart, hydration, no-Build-Your-Own, and disclosure behavior.

Return exact rule, changed files, tests, and review SHA as **AWAITING CHATGPT REVIEW**.