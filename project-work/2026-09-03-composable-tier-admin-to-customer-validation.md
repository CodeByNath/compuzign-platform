# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — pricing + disclosure correction implemented**
- Production/base: `main@bdac492215e8aebea861a783924b9bdc2d46393a`
- Review head: `review/upgrade-journey-finalisation@f4e863662ca0050ca0640f9e18a73a1cec682e87`
- Not yet pushed to `main` — awaiting this round's approval.

## Claude's report — round: pricing + disclosure correction

**Root cause, proven before fixing (per the auditor's own required order):** grepped the entire resolver/aggregation pipeline (`utils/paymentSummary.ts`, `PricingTiers.tsx`, `utils/quote.ts`, every cost-builder/package-builder component) for `Math.round`/`Math.floor`/`Math.ceil`/`toFixed`/`parseInt` — none exist anywhere upstream of presentation. The auditor's own diagnosis was exactly right: `resources/ts/utils/format.ts::formatPrice()` was hard-coded to `minimumFractionDigits: 0, maximumFractionDigits: 0`, so a real `$0.20` rounded to `$0` and a real `$36.50` rounded to `$37` purely at the final render boundary — a presentation bug, not a calculation defect. 14 existing call sites all shared this one function.

**Fix (the shared money presentation contract, not per-component):** `formatPrice()` now rounds to the nearest cent (`Math.round(price * 100)`) to decide whether cents are materially present, then formats with `minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2`. An exact whole dollar still reads as `$50` (no spurious `.00`); a real fractional value reads as `$0.20`/`$36.50`. This is the ONLY rounding step in the entire pipeline, applied once, at final render — it never feeds back into another calculation. New `scripts/money-format-contract.ts` (also wired as `npm run contract:money-format`) covers the auditor's own required fixtures: fractional sub-dollar ($0.20), fractional >$1 ($36.50), exact whole-dollar ($50, $0), a mixed-aggregation case that lands on an exact dollar (0.20 × 5 = $1), a floating-point-drift case (0.1 + 0.2 → $0.30), and the unchanged null/undefined → "Contact Us" contract.

`formatMoney()` (PlanDetailsModal.tsx's own cents-precise table formatter, used by the established Tier/Upgrade detail tables) was left untouched — it was never buggy (already always 2-decimal) and serves a distinct, already-documented purpose (consistent table-column formatting); not touched per "do not create Upgrade-only formatting" — I converged on the one already-correct-when-needed formatter (`formatPrice`) rather than adding a third.

**Quote inclusion quick view — redesigned per the corrected spec:** `InclusionDisclosure.tsx` (`resources/ts/components/cost-builder/`) now:
- Expands **in flow** — `display: contents` on the wrapper (so the toggle and panel become direct items of the caller's own flex row) + `flex-wrap: wrap` on that row + `flex-basis: 100%` on the panel, which drops it onto its own full-width line beneath the price/heading row. No `position: absolute` anywhere (checked directly in the contract).
- Uses a **project-standard inline SVG chevron** (viewBox 0 0 24 24, stroke-based, matching `PricingTiers.tsx`'s `TierInclusionCheckIcon` convention) that rotates 180° on open, never a text glyph. The disclosure toggle is structurally independent of the cart's own remove `×` (unchanged, separate control).
- Renders a real **Inclusion | Qty | Price** table. Qty is a plain nullish-coalesced number, no `×` prefix. Price is the row's own authoritative `line_total` (from the item's stored `inclusionItems` snapshot — the same Phase 2B1 facts the established detail tables already use) formatted via the same corrected `formatPrice()`; a row with no resolved `line_total` renders a blank Price cell, never an invented figure.
- Shows a right-aligned **Total** row below the table, summing only the rows that actually display a Price.
- Applies uniformly to primary/add-on/Upgrade lines via the same `disclosureRowsForFamilyTierItem()` resolver (now returns `{ id, label, quantity: number | null, lineTotal: number | null }` instead of the old optional-quantity-only shape) — a Bundle parent's quantity is null (never separately quantified, matching the established `bundle_id` convention), a Bundle child carries its own quantity/line_total when the data resolves them, and a pre-Phase-8G legacy item with no `inclusionItems` at all falls back to bare feature labels with both cells null.
- `QuoteSummary.tsx` now wraps its price block and the disclosure toggle in one `.cz-quote-summary__price-row` (flex, wrap) so the chevron sits beside the price; `QuoteDetailsOverlay.tsx`'s Total Commitment header gained the matching `flex-wrap: wrap`. Outside-click close, keyboard operation, and `aria-expanded` are all unchanged from the prior round.

**Tests:** `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, `npm run contract:money-format` (new), `npm run contract:composable-quote-cart` (extended — new section 12 adds a pure-function fixture test of `disclosureRowsForFamilyTierItem`'s corrected row shape plus source-scan checks for the in-flow/SVG-chevron/table/Total corrections), and every other contract/regression script touching the changed files — including the real-DOM `regression:composable-quote-cart-loop` (still fully green, confirming no runtime error from the JSX restructuring) — all pass.

**Not independently verifiable without a live browser:** exact pixel/visual screenshots and hands-on keyboard/accessibility behavior — the source-scan contract checks confirm the markup/CSS mechanics (no `position: absolute`, `display: contents` + `flex-wrap: wrap` + `flex-basis: 100%`, SVG chevron, table structure) but not how it actually renders. Flagging for the live browser gate below rather than claiming a visual result I haven't seen.

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