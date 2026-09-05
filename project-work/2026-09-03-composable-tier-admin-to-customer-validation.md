# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — deployed live gate failed**
- Auditor verdict: **Stop — customer PDF leaks prohibited identity and Upgrade UI state is malformed**
- Validated deployed source: `main@c9072b693d8627ee70ec486cdc2b60656b64806b`
- Deployment evidence already accepted: GitHub Actions run `33936527837`, successful and live.
- Browser validation date: 2026-09-05.

## Architecture / non-change boundaries
One active customer journey only: **Upgrade your plan/build**. Standalone Build Your Own remains deferred/disabled. Preserve native `tierOccupantId` plus exact Edition identity, cart authority/removal semantics, readiness/hydration guards, schema, Rate Sheet authority, and the accepted raw-number money pipeline.

Do not change cart removal behavior, authoritative commercial totals, pricing calculations, identity allocation, or unrelated page layout. Fix the Upgrade filter/view state and presentation consumers.

## Live browser findings

### 1. Upgrade list columns are not aligned
The compact rows place quantities and prices at inconsistent horizontal positions depending on inclusion-label length. Quantity, price, and action controls visibly move from row to row.

### 2. Filter option catalog collapses after selection
After choosing a value from Category or Service, the other choices disappear from that dropdown’s available option list. The selected filter may narrow result rows, but it must not destructively narrow its own reusable option catalog.

The failure persists across journey lifecycle: after creating an order and closing the transaction window, the user returns to Pricing with the Upgrade filters stuck (live example: Category value `Computu`) and no other Upgrade items visible. AX state confirms the retained malformed filter value and “No inclusions selected yet.”

### 3. Review panel exposes scrolling content through the footer gap
In Review & Finalise Quote, the selected-services/PDF content remains visible and scrolls through the narrow gap between **Print / Save as PDF** and **Submit Quote Request**. Scrolling content must be clipped behind an opaque footer/action region.

### 4. PDF relabels Upgrades as Build Your Own
The live PDF preview prints the Upgrade block as:

- `BUILD YOUR OWN`
- `KAIROS — IaaS`
- `Build Your Own`
- Monthly $36.15

This is a prohibited customer-facing Build Your Own fallback. The on-screen quote correctly identifies the same item as **Upgrades**; the PDF is consuming a different/legacy title path.

## Exact fix request

### Stable Upgrade row layout
1. Use one shared grid definition for every Upgrade row: flexible Inclusion column, fixed/aligned Qty column, fixed/aligned Price column, and fixed Action column.
2. Right-align numeric quantity and price values consistently; vertically center every control.
3. Long inclusion names may wrap or truncate according to the existing responsive convention, but must never shift the numeric columns.
4. Preserve the neutral, token-driven cart-matching icon/control styles from `c9072b69`.

### Filter correctness and lifecycle
1. Keep immutable/unfiltered Category and Service option catalogs derived from the complete eligible Upgrade pool.
2. Apply selected Category/Service only to the result list—not to the dropdown’s own option source.
3. Reopening either dropdown must continue to show **All Categories/All Services** and every otherwise eligible option.
4. Selecting one filter must not erase choices needed to change or clear that filter.
5. On successful transaction completion/close and return to Pricing, reset Upgrade UI filters, search/sort pagination, and transient selection state to the normal fresh-route defaults. At minimum: All Categories, All Services, Featured, page 1.
6. Never retain malformed/truncated display text such as `Computu` as filter authority. Store stable option values and render their full labels.
7. Do not clear or mutate the completed order/quote while resetting transient Pricing UI.

### Review action-footer containment
1. Give the right preview/selected-services region an explicit scroll viewport ending above the actions.
2. Render Print/Save and Submit inside an opaque, tokenized footer/action surface.
3. Clip scrolling content at the viewport boundary so it cannot appear between, behind, or below the action buttons.
4. Preserve button behavior, keyboard access, responsive layout, and print output.

### PDF Upgrade identity
1. Make PDF/print consume the same Phase 0 display resolver used by the customer cart/details: the item is **Upgrades**, not Build Your Own.
2. Remove every `Build Your Own` heading/subtitle/fallback from the PDF path for a composable item coexisting with its primary Tier/Edition.
3. Preserve the internal stored title/identity and pricing; this is a customer-facing display correction, not identity rewriting.
4. Audit preview, generated PDF, customer quote view, and email/print consumers for the same legacy fallback.

## Required regressions
- Varied inclusion-name lengths retain identical Qty/Price/Action column positions at supported breakpoints.
- Choosing Category/Service filters results while the dropdown option catalog remains complete and clearable.
- Closing a completed transaction returns to a fresh usable Upgrade filter state with all eligible items available.
- Review content cannot paint or scroll through the footer/button gap.
- Cart, review preview, generated PDF, customer quote view, and email all label the Phase 0 item **Upgrades** and never Build Your Own.
- Existing decimal precision, disclosure coordination, cart authority, readiness, removal, and hydration safeguards remain green.

Report root causes, affected components, browser screenshots, PDF fixture/output comparison, interaction tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
