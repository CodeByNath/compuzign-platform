# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — deployed customer UI validation failed**
- Auditor verdict: **Stop — scoped interaction and token corrections required**
- Validated deployed source: `main@db154aa7b081c458a0784a7d52b51449e0757531`
- Deployment evidence already accepted: Hostinger run `33889999906`, successful.
- Browser validation date: 2026-09-05.

## Architecture / non-change boundaries
One active customer journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Preserve native `tierOccupantId` plus exact Edition identity, cart authority/removal semantics, readiness/hydration guards, schema, and Rate Sheet authority.

Preserve the accepted raw-number money pipeline and presentation-only precision normalisation. The live decimal correction now works: the Upgrade rows and cart correctly show $36, $0.10, $0.05 and the $36.15 aggregate. Do not reopen pricing calculations.

Do not change cart removal behavior, commercial totals, identity, or unrelated page layout.

## Live browser findings and exact corrections

### 1. Upgrade-list icon styling does not match the cart
The inclusion marker and +/× controls currently introduce yellow/red accent treatments that do not match the quote/cart icon language.

- Reuse the exact existing cart icon component/style, dimensions, stroke weight, neutral colors, hit area, hover, focus, and disabled treatment.
- Do not add a new accent color to these Upgrade-list icons.
- Keep the accessible Add/Remove names and keyboard behavior.
- Use CompuZign design tokens/components; do not hardcode white quantity fields, red/yellow borders, fills, radii, spacing, or control colors.
- The quantity, per-unit/line price, and action area must use the same established tokenized dark-theme controls as the rest of CompuZign.

### 2. Quote disclosure control placement
- Place each inclusion chevron immediately to the **left** of that quote item’s existing remove ×.
- Keep chevron and remove × as separate controls with separate hit targets and semantics.
- Do not move the disclosure below the price block or repurpose the cart remove ×.

### 3. Disclosure switching is malfunctioning
When one inclusion dropdown is open, clicking a different quote item’s chevron is being consumed by the outside-click close behavior instead of opening the requested item.

Required behavior:
- Clicking a closed item’s chevron opens that item.
- If another item is open, the same click atomically closes the old dropdown and opens the newly requested dropdown.
- Do not require a second click.
- Chevron controls must be excluded from the generic outside-click dismissal path.
- A genuine click outside the active dropdown wrapper and all disclosure toggles closes the active dropdown.
- Clicking the active item’s control closes it normally.
- At most one quote inclusion dropdown is open at a time.
- The expanded content remains an in-flow dropdown that pushes following quote rows; it must not float or overlap.

### 4. Remove the detached Upgrade aggregate
The standalone `$36.15 / mo Ongoing` line below the Upgrade inclusion list is redundant and visually disconnected.

- Remove it from layout, or hide it completely.
- Keep each inclusion’s inline calculated price and the authoritative aggregate in the quote/cart summary.
- Removing this display must not remove or alter the underlying aggregate used by the cart and Details.

## Acceptance checks
1. Upgrade inclusion icons and controls match the cart’s neutral icon styling and exact sizing; no new accent styling or hardcoded control values remain.
2. Quantity controls and action cells render correctly in supported CompuZign themes using existing tokens.
3. Every quote chevron sits directly left of its independent remove ×.
4. Switching from one open disclosure to another works on the first click and leaves only the requested dropdown open.
5. Outside click closes; clicks inside the dropdown or on another toggle are handled correctly.
6. Disclosures stay in-flow and push subsequent rows.
7. The detached Upgrade subtotal is absent, while row prices, cart aggregate, Details, and Total Commitment remain correct.
8. Existing decimal precision, cart removal, readiness, hydration, and no-Build-Your-Own protections remain unchanged.

Report affected components, reused cart icon/token primitives, interaction tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
