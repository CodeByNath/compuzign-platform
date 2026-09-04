# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — MONEY PRECISION SAFEGUARD, ROUND 2**
- Auditor verdict: **Stop — architectural risk**
- Production/base independently confirmed: `main@bdac492215e8aebea861a783924b9bdc2d46393a`
- Reviewed head: `review/upgrade-journey-finalisation@604c46fb3d53871bc7ef79b9d9c5cefaf7943930`
- Do not push to `main` yet.

## Accepted work
The prior diagnosis stands: the live `$0` storage-rate defect was presentation-side, not proven upstream truncation. The disclosure redesign remains accepted: in-flow panel, SVG chevron, Inclusion/Qty/Price, authoritative `line_total`, subtotal, independent remove control.

`604c46fb` correctly fixes the known `$0.023` and `$0.004` examples and keeps calculations on raw numeric values.

## Blocking architecture issue
`formatPrice()` now executes `Math.round(price * 1e6) / 1e6` and sets `maximumFractionDigits: 6`.

That is still a **business precision ceiling invented in presentation code**. The previous locked rule explicitly said not to hardcode a future Rate Sheet precision limit without schema evidence/policy. Current Rate Sheet `unit_price` is a numeric rate with no six-decimal contract. A legitimate future non-zero rate below `0.0000005`, or material precision beyond six decimals, can again display as zero or be altered.

Do not solve IEEE-754 noise by declaring Rate Sheets six-decimal data.

## Locked distinction
- **Business precision:** owned by the authoritative Rate Sheet value/schema; currently no decimal-place cap is defined.
- **Runtime numeric noise:** an implementation property of JavaScript `number`, not a pricing policy.
- Calculations continue using the original numeric values; no rounding before multiplication or aggregation.
- Presentation may normalize machine noise, but that normalization must be justified by the numeric representation (IEEE-754/significant precision), not by an arbitrary number of decimal places.
- A non-zero authoritative rate must not become zero because of display policy.

## Exact correction for Claude
Keep this round limited to the shared formatter + its contract/rebuilt assets.

1. Remove the `1e6` / six-decimal rate ceiling.
2. Use a representation-aware noise strategy: preserve material digits supported by the current JavaScript `number` model while suppressing artifacts such as `0.30000000000000004`. Do not encode a Rate Sheet decimal-place limit unless the schema explicitly gains one.
3. Whole-dollar `$50`, `$0.20`, `$36.50`, `$0.023`, `$0.004`, `$0.10`, and floating-noise `0.1 + 0.2` must retain the accepted outputs.
4. Add deeper non-zero fixtures (for example `0.0000004` and `0.00000004`) proving the formatter does not collapse values merely because they exceed six fractional places.
5. Keep all sums/multiplication on raw numerics; formatted strings never feed calculations.
6. Preserve the accepted disclosure/Upgrade/cart/readiness/hydration/no-Build-Your-Own behavior unchanged.

Report the exact numeric-noise rule and why it follows the runtime representation rather than pricing policy. Re-run `contract:money-format`, composable quote/cart, real-DOM loop regression, typecheck, build and docs check. Return **AWAITING CHATGPT REVIEW**.