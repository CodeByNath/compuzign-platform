# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — source-precision money safeguard implemented**
- Production/base: `main@bdac492215e8aebea861a783924b9bdc2d46393a`
- Review head: `review/upgrade-journey-finalisation@604c46fb3d53871bc7ef79b9d9c5cefaf7943930`
- Not yet pushed to `main` — awaiting this round's approval.

## Claude's report — round: source-precision money safeguard

Implemented exactly per the "Exact correction for Claude" list, on `review/upgrade-journey-finalisation@604c46fb` (one commit on top of `f4e86366`).

**Rule (locked architecture applied):** `formatPrice()` (`resources/ts/utils/format.ts`) no longer assumes 2-decimal currency. It rounds to **6 decimal places** — purely to absorb IEEE-754 floating-point arithmetic noise (`0.1 + 0.2 !== 0.3`), never to discard genuine source precision — then lets `Intl.NumberFormat` render the minimal fraction digits needed within `[2, 6]` (or `0` for an exact whole dollar, preserving the existing "$50" not "$50.00" convention). 6 was chosen as a deliberately generous but finite ceiling: comfortably above the highest-precision real rate known today ($0.023/$0.004, 3 decimals) with headroom, and it doubles as the exact noise-absorption threshold. Per point 4 of the locked architecture ("do not impose cent precision unless a separate, explicit billing/settlement rounding rule is later approved") — none is established here, so I did not add one; if the schema is later given a formal precision policy exceeding 6 decimals, this ceiling needs revisiting explicitly, which I'm flagging now rather than treating as settled.

```
Object Storage  $0.023/GB  -> "$0.023"   (was "$0.02" under the rejected cent-only fix)
Archive/Cold    $0.004/GB  -> "$0.004"   (was "$0" under both the original bug AND the rejected fix)
$0.20                       -> "$0.20"
$36.50                      -> "$36.50"
$50 (exact)                 -> "$50"
$0.10                       -> "$0.10"   (never a bare "$0.1")
0.1 + 0.2 (float noise)     -> "$0.30"
0.2 * 5 (exact whole)       -> "$1"
$0.0004 (4 decimals)        -> "$0.0004" (no hardcoded ceiling below the formatter's own 6-decimal bound)
```

**No display-rounding before summation (verified, unchanged from `f4e86366`):** `InclusionDisclosure.tsx`'s Total row already sums the raw `row.lineTotal` numbers directly (`pricedRows.reduce((sum, row) => sum + row.lineTotal, 0)`), formatting only the final sum — never parsing/re-summing already-formatted display strings. Every other aggregate (cart footer, Details, Total Commitment, Initial Payment) was already confirmed in the prior round to consume unrounded numeric values with no `Math.round`/`toFixed`/`parseInt` anywhere upstream; that finding is unchanged by this round's formatter edit, since only the FINAL render call's precision changed, not what feeds it.

**Tests:** `scripts/money-format-contract.ts` extended with the auditor's own required fixtures ($0.023, $0.004, $0.10) plus a 4-decimal case proving no hardcoded ceiling, alongside the prior round's fixtures (whole-dollar, floating-drift, multiplied/aggregated, null/undefined). `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, `npm run contract:money-format`, `npm run contract:composable-quote-cart`, and every other contract/regression script touching the changed files — including the real-DOM `regression:composable-quote-cart-loop` — all pass. Only `resources/ts/utils/format.ts` and `scripts/money-format-contract.ts` changed source-wise this round (plus rebuilt `dist/`); `InclusionDisclosure.tsx`/`QuoteSummary.tsx`/`QuoteDetailsOverlay.tsx` are untouched from `f4e86366` — the disclosure redesign itself was already accepted.

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