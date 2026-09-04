# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — deployed customer validation failed**
- Auditor verdict: **Stop — pricing integrity and presentation correction required**
- Validated deployed source: `main@bdac492215e8aebea861a783924b9bdc2d46393a`
- Deployment evidence accepted: Hostinger run `33877602142`, successful.
- Browser validation date: 2026-09-05.

## Locked architecture / non-change boundary
One active customer journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Preserve native `tierOccupantId` + exact Edition identity, cart mutation/removal semantics, schema, readiness/hydration guards, and Rate Sheet authority.

**Money rule now explicit:** Rate Sheets own monetary facts. Every downstream layer must carry the authoritative numeric value unchanged through resolver -> commercial component -> quote snapshot -> totals. Quantity multiplication and aggregation operate on those numeric values. Currency formatting is presentation-only and must never become an input to another calculation.

Do not change stored rates, invent a second calculator, or round/truncate before the final rendering boundary.

## Auditor source finding — important correction to the browser diagnosis
The live `$0` display does **not yet prove decimal transport loss**.

Current authoritative backend code already sanitizes Rate Sheet/Price Option values as floats and computes `line_total = unit_price * quantity`; the Package Family public presenter passes occupant pricing through without integer conversion.

However the shared customer formatter `resources/ts/utils/format.ts::formatPrice()` is hard-coded to `minimumFractionDigits: 0` and `maximumFractionDigits: 0`. That means a real fractional value such as `$0.20` is rendered as `$0`, and `$36.50` as `$37`, even if the underlying calculation remains correct.

### Required pricing audit/fix
1. First prove the numeric value at each boundary with explicit fixtures (fractional storage rate + whole-number control). Do not diagnose a calculation defect from formatted text alone.
2. If the numeric path remains exact, fix the **shared money presentation contract**, not each individual Upgrade component.
3. The formatter must preserve cents when materially present while keeping normal whole-dollar presentation sensible. Use one established shared formatter/path across Cost Builder customer surfaces; do not create Upgrade-only formatting.
4. Verify row price, quantity multiplication, Upgrade subtotal, cart line, Details, Initial Payment, and Total Commitment all consume unrounded numeric values exactly once.
5. If any actual numeric truncation exists elsewhere, report its exact boundary separately and fix it at the owning normalization/resolver layer.

Representative regression values must include a fractional sub-dollar rate, a fractional >$1 rate, and an exact whole-dollar rate.

## Quote inclusion quick view correction
- Keep collapsed by default.
- Project-standard inline SVG chevron beside the quote item price; independent cart remove ×.
- Opening expands **in flow** and pushes later content down; no floating overlay.
- Three columns: **Inclusion | Qty | Price**.
- Qty is plain numeric, no `×` prefix.
- Price is the authoritative row line total when available; never invent a value.
- Directly below rows show right-aligned **Total** = sum of displayed priced rows.
- Same structured disclosure for plan/add-on/Upgrade where authoritative price facts exist.
- Preserve outside-click close, keyboard use, `aria-expanded`, independent disclosure state.

## Required regressions
- Fractional values survive numerically end-to-end and are displayed without whole-dollar truncation/rounding.
- Quantity changes update line, Upgrade subtotal, cart, Details, and commitment exactly once.
- Mixed whole/fractional values aggregate correctly.
- Disclosure uses Inclusion/Qty/Price + subtotal, in-flow expansion, SVG chevron beside price, independent remove ×.
- Existing primary readiness, base removal/swap, cart removal, hydration, and no-Build-Your-Own guarantees remain green.

Report the proven root cause(s), before/after numeric fixtures, changed files, tests, review SHA, screenshots/accessibility behavior. Set **AWAITING CHATGPT REVIEW** when ready. Do not push source until audited.