# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — deployed customer validation failed**
- Auditor verdict: **Stop — pricing integrity and presentation correction required**
- Validated deployed source: `main@bdac492215e8aebea861a783924b9bdc2d46393a`
- Deployment evidence already accepted: Hostinger run `33877602142`, successful.
- Browser validation date: 2026-09-05.

## Architecture / non-change boundary
One active customer journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Preserve native `tierOccupantId` plus exact Edition identity, cart authority/removal semantics, schema, prior readiness/hydration guards, and the existing authoritative rate source.

Do not repair this by changing stored source prices, rounding them to whole currency units, introducing a second calculator, or redesigning the cart. The cost builder must faithfully consume the existing decimal monetary values.

## Live browser findings

### 1. FAIL — decimal prices are lost in the cost builder
The live Upgrade list shows:

- 2 vCPU: `$36 per unit` (whole-number rate survives);
- Block Storage: `$0 per unit`;
- Backup Storage — BaaS: quantity 1 and `$0 / mo`;
- Upgrade subtotal/cart line: `$0`.

The affected storage rates contain fractional currency values. Values after the decimal point are reaching the cost builder as zero or being truncated before display/calculation. This is an overall decimal transport/normalisation defect, not a legitimate zero-price state.

### 2. FAIL — quote inclusion disclosure is visually and commercially unclear
The open quick view currently appears as a narrow floating panel and formats quantities as `×2`, `×500`, etc. It omits a visible price column and does not show a subtotal immediately beneath the included rows.

## Exact corrections

### Decimal pricing integrity
1. Trace decimal money from the existing authoritative Rate Sheet response through parsing, normalisation, Upgrade preview, inline row display, Upgrade subtotal, cart projection, Details, and total commitment.
2. Preserve decimal precision at every boundary. Do not use integer parsing, truthy/falsy fallbacks that convert fractional values to zero, or premature whole-dollar formatting.
3. For every inclusion, calculate `line total = authoritative unit price × quantity`; recalculate when quantity changes.
4. Aggregate those exact line totals once into the Upgrade cadence subtotal and existing cart/commitment totals.
5. Apply currency rounding only at the final display boundary, using the product’s established money formatter. Zero is valid only when the authoritative rate is actually zero.
6. Verify representative fractional rates such as Block Storage and Backup Storage — BaaS, plus a whole-number control such as 2 vCPU.

### Quote inclusion quick view
1. Keep inclusions collapsed by default. Place a small, proper project-standard inline SVG chevron beside the quote item’s price—not as a detached floating control.
2. Opening it must expand an in-flow dropdown attached to that quote item. It must push the following content downward and visually read as part of the item, not float over neighboring quote rows.
3. Render a clear three-column list:
   - **Inclusion**
   - **Qty**
   - **Price**
4. Do not prefix quantities with `×`. Show plain numeric quantities in the Qty column.
5. Price must be the calculated price for that row from the same authoritative unit price and quantity used by the cost builder.
6. Directly below the final inclusion row, show a right-aligned **Total** equal to the sum of the displayed inclusion prices. Its placement must make clear that it totals the rows above.
7. Keep the disclosure control separate from the existing cart remove ×. Preserve outside-click closing, keyboard operation, accessible expanded state/name, and independent disclosure state per quote item.
8. Apply the same structured disclosure presentation to plan, add-on, and Upgrade quick views where pricing data is available. Do not invent prices when the authoritative response does not provide them.

## Required regressions
- Decimal unit prices survive API/model normalisation and do not become `0` or `.00`.
- Quantity changes update row price, Upgrade subtotal, cart total, Details, and commitment total consistently and exactly once.
- Mixed whole and fractional unit prices aggregate correctly.
- Quick view renders Inclusion/Qty/Price without `×`, followed by the correct subtotal.
- Opening a disclosure increases the quote item’s layout height and pushes later rows; it does not overlay them.
- Chevron uses the established inline SVG pattern and sits beside price; remove × remains independent.
- Existing primary readiness, base removal/swap, cart removal, hydration protection, and no-Build-Your-Own guarantees remain green.

Report the decimal-loss root cause and exact boundary, affected components, before/after numeric fixtures, screenshots, accessibility behavior, tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
