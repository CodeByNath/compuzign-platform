# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — representation-aware money safeguard implemented**
- Production/base: `main@bdac492215e8aebea861a783924b9bdc2d46393a`
- Review head: `review/upgrade-journey-finalisation@db154aa7b081c458a0784a7d52b51449e0757531`
- Not yet pushed to `main` — awaiting this round's approval.

## Claude's report — round: money precision safeguard, round 2

Implemented per the "Exact correction for Claude" list, on `review/upgrade-journey-finalisation@db154aa7` (one commit on top of `604c46fb`). Only `resources/ts/utils/format.ts` and `scripts/money-format-contract.ts` changed source-wise (plus rebuilt `dist/`); the accepted disclosure redesign and everything else from prior rounds is untouched.

**The numeric-noise rule, and why it follows the runtime representation rather than pricing policy:** the previous fix rounded to a fixed 6 DECIMAL PLACES — a business precision cap invented in presentation code, with no basis in the Rate Sheet schema. This version instead rounds to **15 SIGNIFICANT digits** (`Number(price.toPrecision(15))`), which is a property of the IEEE-754 double itself, not a currency decision: a double reliably round-trips through at most ~15-17 significant decimal digits regardless of where its decimal point falls, and ordinary arithmetic (`0.1 + 0.2 === 0.30000000000000004`, an 18-significant-digit value) only ever corrupts the last digit or two at that far end. Rounding to 15 significant digits removes exactly that class of noise while scaling precision with the value's own magnitude — it does NOT ask "how many places after the decimal point," so a tiny rate keeps its own full precision relative to its magnitude ($0.0000004 keeps 7 decimal places, $0.00000004 keeps 8) exactly as faithfully as $0.023 keeps its 3. `Intl.NumberFormat`'s `maximumFractionDigits: 20` is the formatting API's own technical range (a display-mechanism constant, not a decimal-place policy) — the actual digits rendered come entirely from the already-noise-suppressed value, floored at 2 decimals once any fraction is present (standard `$X.XX` convention) and 0 for an exact whole dollar.

```
$0.023                      -> "$0.023"    (unchanged from round 1)
$0.004                      -> "$0.004"    (unchanged from round 1)
$0.20 / $36.50 / $50 / $0.10 -> unchanged from round 1
0.1 + 0.2 (float noise)     -> "$0.30"     (unchanged from round 1)
0.2 * 5 (exact whole)       -> "$1"        (unchanged from round 1)
$0.0000004 (7 decimals)     -> "$0.0000004"  (NEW — survives what would have been a "$0" under the rejected 6-decimal ceiling)
$0.00000004 (8 decimals)    -> "$0.00000004" (NEW — same)
```

**Sums/multiplication:** unchanged and reconfirmed — `InclusionDisclosure.tsx`'s Total row still sums raw `row.lineTotal` numbers before ever calling `formatPrice()`; no other aggregate (cart footer, Details, Total Commitment, Initial Payment) was touched this round, and none was touched in round 1 either — only the final render call's own precision logic changed.

**Tests:** `scripts/money-format-contract.ts` extended with this round's own required deep fixtures ($0.0000004, $0.00000004) alongside every fixture from both prior rounds (all still passing unchanged). `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, `npm run contract:money-format`, `npm run contract:composable-quote-cart`, and the real-DOM `regression:composable-quote-cart-loop` all pass.

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