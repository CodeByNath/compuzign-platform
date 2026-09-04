# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — live customer UI corrections implemented**
- Review branch: `review/upgrade-journey-finalisation@07f724014650c1d6bdf786e480b8875645e3374e`
- Not yet pushed to `main` — awaiting this round's approval per the gate below.
- Browser review date: 2026-09-04.

## Claude's report — round: live customer UI corrections

All 4 items implemented on `review/upgrade-journey-finalisation@07f72401`. `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, and every contract/regression script touching the changed files (`contract:composable-quote-cart`, `composable-offer-contribution-contract`, `composable-live-correction-contract`, `package-builder-addon-focus-contract`, `composable-offer-choice-contract`, `package-builder-bundle-inclusion-parity-contract`, `payment-summary-extraction-parity-contract`, `request-flow-family-tier-parity-contract`, `plan-details-value-states-contract`, `quote-inclusion-quantity-parity-contract`) all pass.

**Affected components:**
- `resources/ts/components/package-builder/QuoteDetailsOverlay.tsx` — item 1 (Upgrade detail table columns), item 4 (Total Commitment disclosure, tab chip carousel CSS).
- `resources/ts/components/cost-builder/QuoteSummary.tsx` — item 2 (per-quote-line disclosure).
- `resources/ts/components/cost-builder/InclusionDisclosure.tsx` — **new file**, the one shared chevron/× disclosure component used by both item 2 and item 4 (never two separate implementations of the same open/close/outside-click behavior).
- `resources/ts/components/package-builder/ComposableOfferBrowser.tsx` — item 3 (compact row list, icon-only +/× actions, `ItemContribution` extended with `billingCycle` so the inline total can carry a cadence suffix).
- `resources/css/modules/cost-builder.css` — styling for all 4 items.

**1. Upgrade detail pricing:** `ComposableInclusionsTable` now renders the same 4 columns as `PlanDetailsModal.tsx`'s `ItemBreakdownTable` (Item Included, Quantity, Unit Price, Total), reading `inclusion.unit_price`/`inclusion.line_total` straight off the item's own stored `inclusionItems` snapshot via the same `formatMoney()` — no second pricing source, nothing recomputed.

**2. Quote-line quick views:** every `family_tier` quote line (primary, add-on, Upgrade) in Your Quote now has a chevron toggle. Rows come from `inclusionItems` (falling back to `features` for a pre-Phase-8G cart entry). Toggle becomes × when open; a `mousedown` listener outside the wrapper closes it; the existing cart remove `×` is untouched and structurally separate. Accessibility: `aria-expanded`, `aria-label` naming the item.

**3. Compact selection list:** `ComposableOfferBrowser`'s grid of oversized cards is now `.cz-package-builder__composable-list`, one row per inclusion — the same small yellow-accent category icon used in the family header, inline quantity input (unchanged behavior/guard), inline total (server-resolved contribution, never client-computed — `ItemContribution` gained a passthrough `billingCycle` field from the claiming component so the total can carry a `cycleSuffix()` like "/ mo"), and an icon-only +/× action button carrying `aria-label`/`title` for accessible name and tooltip. Filtering, sorting, pagination, selection state, and the `hasReadyPrimary` disabled/early-return guard from the prior round are all unchanged — only presentation moved.

**4. Details navigation:** the plan tabs are now `flex-wrap: nowrap; overflow-x: auto` compact pill chips (was underline tabs that wrapped) — selected/hover/focus-visible states preserved, restated in the chip idiom. Total Commitment's per-plan rows each get the same shared `InclusionDisclosure` next to their heading.

**Scoping note — item 3's "Ongoing" cadence text:** the doc's example list is "/ mo" and "Ongoing". "/ mo"/"/ yr" is delivered via `cycleSuffix(billingCycle)`, a direct passthrough of the claiming component's own `billing_cycle` (zero new computation). A literal per-item "Ongoing" badge is NOT included — per-item open-endedness isn't available from `resolveItemContributions()`'s per-component data without inventing a second resolver that maps each item to its own Leg's period span, which risked exceeding this round's presentation-only scope. The aggregate "Ongoing" timing per stream still renders unchanged in the preview section below the list. Flagging this for explicit sign-off rather than silently deciding it was in-scope.

**Discovered, NOT fixed (out of scope):** `regression:composable-quote-cart-loop` already failed at `main@a4a23920` before this round — confirmed by stashing this round's changes and re-running against the exact deployed baseline (identical 9 failures either way). Its fixture is a standalone-composable scenario with no primary Tier ever configured, so the prior round's `hasReadyPrimary` gate makes the effect bail before any preview/commit — every assertion in that script now fails by construction, not because of a real defect in the shipped behavior. This predates this round entirely; left unfixed pending direction since it's the prior round's readiness-gate work, not this round's UI scope. The script's DOM selectors WERE updated (this round's own markup/class-name changes would otherwise have made it fail for a second, unrelated reason) so it stays current, but it does not pass as a gate today.

## Architecture and non-change boundaries
One active journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Upgrade must never exist, price, persist, hydrate, resurrect, or act without its exact ready Tier/Edition base.

No `CZTU`/`CZTEU` minting yet; `CZTC`/`CZTEC` remain reserved. Preserve native `tierOccupantId` plus exact Edition identity and the existing occupant pipeline.

The cart’s commercial authority and removal behavior are not under correction. Do not modify cart calculations, cart mutation semantics, source pricing, schema, identity, or unrelated page areas. These requests concern the Upgrade engine’s presentation and read-only quote/build views.

## Browser findings and exact UI corrections

### 1. Upgrade detail uses an incomplete pricing system
The quoted Upgrade detail currently shows only Item Included + Quantity and one Monthly amount. It omits Unit Price and per-row Total, unlike the established Tier detail table.

- Use the same read-only pricing columns and formatting as the established Tier/Edition detail: **Item Included, Quantity, Unit Price, Total**.
- Each row total must be `unit price × current quantity`.
- Billing totals must be derived from those rows and update with quantity.
- Do not create a second pricing source or recompute authoritative rates in presentation code.
- The observed `Build Your Own` label is still prohibited in this Phase 0 Upgrade route; apply the corrected table to the Upgrade representation, not a standalone Build Your Own authority.

### 2. Add compact inclusion quick views to quote items
Each primary, add-on, and Upgrade line in **Your Quote** needs an inclusion quick view without opening the full Details modal.

- Add a small chevron disclosure control to each quote line; inclusions are collapsed by default.
- Clicking the chevron opens a compact dropdown directly beneath/within that quote item.
- While open, that disclosure control changes from chevron to a small × and closes the dropdown.
- Clicking anywhere outside that dropdown wrapper also closes it.
- This is a quick inclusion list only, not the existing full Details popup.
- Keep the existing cart remove control and its behavior unchanged; do not repurpose it as the disclosure ×.
- Show the same quick disclosure for plan, add-on, and Upgrade items.

### 3. Upgrade selections should be a compact list
Replace the oversized selected-inclusion cards under **Upgrade your build** with a compact list.

- Each row uses the established family-header category treatment shown in the browser: small inclusion/category icon in the yellow accent plus matching text size.
- Use a **+** icon for Add and an **×** icon for Remove instead of the words “Add” and “Remove”.
- Preserve accessible names/tooltips and keyboard operation for both icon actions.
- Keep quantity editing inline.
- Put each inclusion’s calculated total inline on its own row as part of that item—not as one detached subtotal below the complete list.
- The inline total is `unit price × quantity` and updates immediately when quantity changes; retain the applicable cadence text such as “/ mo” and “Ongoing”.
- Preserve filtering, sorting, pagination, selection behavior, authoritative rates, and the empty-primary disabled guard.

### 4. Full Details navigation and commitment view
The Details modal’s quoted-plan tabs do not scale and the Total Commitment view hides the composition of each build.

- Restyle quoted-plan tabs as compact chips in one horizontally scrollable carousel; do not wrap them into multiple rows.
- Preserve selected, hover, focus, and keyboard-visible states.
- In **Total Commitment**, add a collapsed chevron inclusion list to each quoted plan/build row, using the same disclosure behavior as the quote quick view.
- Keep totals and commercial summaries unchanged; this only reveals the inclusions belonging to each row.

## Acceptance checks
1. Upgrade detail shows quantity, unit price, row total, and billing total from the same authoritative pricing facts as Tier details.
2. Changing quantity updates that item’s inline total and the existing aggregate once—no duplicate counting.
3. Quote-line chevrons reveal only that line’s inclusions; active chevron becomes ×; outside click closes; existing remove × remains independent.
4. Selected Upgrade inclusions render as the compact yellow-icon list with accessible +/× controls.
5. Details chips remain usable with many quoted items through horizontal scrolling.
6. Total Commitment disclosures reveal the correct inclusions per item without changing totals.
7. No standalone/customer-facing **Build Your Own** authority or label remains in the Phase 0 Upgrade route.
8. Existing cart behavior, primary readiness guard, removal cascades, and hydration protections remain unchanged.

Report affected components, screenshots, accessibility behavior, tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
