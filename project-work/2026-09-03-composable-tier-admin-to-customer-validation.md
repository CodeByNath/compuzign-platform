# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — interaction and token corrections implemented**
- Production/base: `main@db154aa7b081c458a0784a7d52b51449e0757531`
- Review head: `review/upgrade-journey-finalisation@c9072b693d8627ee70ec486cdc2b60656b64806b`
- Not yet pushed to `main` — awaiting this round's approval.

## Claude's report — round: interaction and token corrections

All 4 findings addressed on `review/upgrade-journey-finalisation@c9072b69` (one commit on top of `db154aa7`).

**1. Neutral icon language:** `ComposableOfferBrowser`'s compact-list category icon and +/× action button carried permanent `--cz-color-accent`/`--cz-color-danger` fills — restyled to match `.cz-quote-summary__remove`'s exact recipe: `--cz-color-muted` by default, a transparent border reserving hover space (no layout shift), color applied only on `:hover:not(:disabled)` via `color-mix()` tints (already an established pattern elsewhere in this file, never a new hardcoded literal), identical 22px sizing/font-size. The quantity field gained explicit `--cz-color-text`/`--cz-color-surface` tokens — it previously inherited the browser's own default white input background rather than the app's dark theme, which is very likely what the auditor saw as a "hardcoded white quantity field."

**2. Chevron placement:** the inclusion disclosure toggle now renders inside a new `.cz-quote-summary__corner-actions` cluster in `QuoteSummary.tsx`, immediately to the **left** of the existing cart remove ×, both absolutely positioned top-right as one group. Two independent controls, two independent hit targets — the remove × is untouched.

**3. Disclosure switching bug — root cause and fix:** `InclusionDisclosure` was previously one self-contained stateful component; every quote line got its own independent `open` boolean AND its own independent outside-click `mousedown` listener, with nothing coordinating them across instances. Clicking a different item's chevron while one was open relied on two separate native events (the open item's outside-click closing it, the clicked item's own onClick opening it) racing correctly with no structural guarantee they would — matching the live symptom exactly (a second click needed, or the wrong outcome). Fixed by converting to a controlled pair — `InclusionDisclosureToggle` + `InclusionDisclosurePanel` — coordinated by one new shared hook, `useSingleOpenDisclosure()`, that each list (`QuoteSummary.tsx`, `QuoteDetailsOverlay.tsx`'s Total Commitment rows) calls once: a single `openKey` state (structurally guarantees at most one open per list), a race-safe `toggle()` using the functional `setState` form (always resolves against the latest key regardless of a same-interaction outside-click race), and one outside-click listener that explicitly excludes **every** chevron toggle via `closest('.cz-inclusion-disclosure__toggle')` — not just the currently-open one — plus the open panel's own subtree, per the explicit "chevron controls must be excluded from the generic outside-click dismissal path" requirement. Splitting into Toggle + Panel is also what let the toggle move to the corner cluster (item 2) while the panel keeps expanding lower in the same list item, full width, in flow.

**4. Detached aggregate removed:** the standalone resolved-summaries list (`formatPrice(summary.price)}{cycleSuffix}` + timing, the "$36.15 / mo Ongoing" line) is gone from `ComposableOfferBrowser`'s own live-preview area — it was a redundant, visually-disconnected duplicate of the authoritative aggregate already shown in the quote/cart summary and Details. `preview.summaries` itself and the auto-commit effect that reads it (to decide `onCommit`/`onRemoveFromQuote` and build the committed item) are completely untouched — only the presentation block was removed; loading/error/empty feedback for the live preview request remain.

**Not reopened:** decimal precision, cart removal, readiness, hydration, and no-Build-Your-Own protections are all untouched this round — confirmed via the unchanged pricing pipeline and the still-fully-green real-DOM loop regression.

**Tests:** `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, and every contract/regression script touching the changed files — `contract:money-format`, `contract:composable-quote-cart` (extended, new section 13 covers all 4 corrections with source-scan checks; the prior round's now-superseded price-row-layout checks were updated, not left stale), `composable-offer-contribution-contract`, `composable-live-correction-contract`, `package-builder-addon-focus-contract`, `composable-offer-choice-contract`, `package-builder-bundle-inclusion-parity-contract`, `payment-summary-extraction-parity-contract`, `request-flow-family-tier-parity-contract`, `plan-details-value-states-contract`, `quote-inclusion-quantity-parity-contract`, `package-builder-regression-lock-contract`, and the real-DOM `regression:composable-quote-cart-loop` — all pass.

**Not independently verifiable without a live browser:** exact pixel rendering of the neutral icon styling, hands-on confirmation of the atomic single-click disclosure switch, and confirmation the quantity field genuinely renders in the app's dark theme rather than white — the source-scan/DOM-regression checks confirm the markup/CSS mechanics, not the rendered visual result. Flagging for the live browser gate rather than claiming a visual result I haven't seen.

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
