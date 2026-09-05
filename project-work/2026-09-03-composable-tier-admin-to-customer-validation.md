# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — row alignment, filter lifecycle, footer scroll-through, and PDF/email Build Your Own leak fixed**
- `main` is still at `c9072b693d8627ee70ec486cdc2b60656b64806b` (the failed live-gate SHA) — untouched, per "Do not push product source until the gate permits it."
- Review head with this round's fix: `review/upgrade-journey-finalisation@2b3ec74d0d11798ee6c633a546bfd7d15b87467a` — **not yet pushed to `main`**, awaiting this review.
- Browser validation date of the failing round: 2026-09-05.

## Claude's report — round: row alignment, filter lifecycle, footer containment, PDF/email identity

### 1. Upgrade list columns not aligned — root cause and fix
Root cause: `.cz-package-builder__composable-row` used plain flexbox with no explicit column assignment. Each row conditionally omits cells (no quantity input unless the row is both selected and quantity-governed; no price/total unless resolved or a published unit price exists), so a row with fewer cells let its later cells (price, action) slide left into the space a longer inclusion label pushed them out of — column position depended on that specific row's own content, not a shared layout.

Fix: `resources/css/modules/cost-builder.css` — `.cz-package-builder__composable-row` is now `display: grid` with one fixed `grid-template-columns` (`var(--cz-space-3) minmax(0,1fr) 4.5rem 6rem 22px`) shared verbatim by every row; each cell (`-icon`, `-label`, `-qty`, `-total`, `-action`) is pinned to an explicit `grid-column` (1–5). A track a given row leaves empty (no qty cell, no price cell) still reserves its exact space — no cell after it can drift into it. All fixed-length tracks, so this holds without needing the rows to be a single shared grid container. Neutral icon/control styling from `c9072b69` is untouched.

### 2. Filter option catalog collapses after selection / stuck filter across transaction lifecycle — root cause and fix
Root cause: Category/Service were free-text `<input list="...">` (HTML5 datalist) controls. Two independent effects of that pattern combined into the reported symptom: (a) most browsers self-filter a datalist's visible suggestions by the input's *current typed text*, so reopening the control after a selection showed only options matching what was already there, reading as a collapsed catalog; (b) the field's raw text — anything the customer typed, including a malformed/truncated fragment like `Computu` — was itself the stored filter value, with no validation against the real option set. Separately, the Service option list (`services` `useMemo`) was deliberately narrowed by the current `category` selection, which the fix request's "immutable, unfiltered" requirement rules out. Separately again, the completed-transaction reconciliation effect in `ComposableOfferBrowser.tsx` already resets local `selection`/`hasInteracted` when the cart clears without unmounting the component, but never touched `category`/`service`/`sort`/`page` — so a stale filter survived a completed order.

Fix (`resources/ts/components/package-builder/ComposableOfferBrowser.tsx`): Category and Service are now `<select>` elements (matching the existing Sort control) — a `<select>` can only ever hold one of the real option values or `""` (All), so the stored filter can never become malformed/truncated text, and every option is always present when reopened. Both `categories` and `services` option lists are now derived only from the full, unfiltered `rows` pool (the `services` narrowing-by-`category` was removed). The `cartItemJustRemoved || primaryJustRemoved` reconciliation branch (the same one already gated to fire only on a genuine external clear, never the customer's own single Remove click) now also resets Category/Service/Sort/page to their fresh-route defaults.

### 3. Review panel scrolling content through the footer gap — root cause and fix
Root cause: the right rail (`.cz-rf-right`) was one `overflow-y: auto` scroll box; `.cz-os` (Preact `OrderSummary.tsx`) was a single flex column with `gap: var(--cz-space-8)` between every child (header, prepared-for, services, totals, actions, help), and `.cz-os__actions` was pinned via `position: sticky; bottom: 0` inside that same scroll box. CSS flex `gap` is painted by the flex *container*, never by either flanking child — `.cz-os` itself has no background — so the gap space immediately above and below the sticky actions block belonged to nothing opaque, and scrolling content behind it (the totals block, and the full inline PDF preview when "View full quote" is expanded) was visible through that narrow strip around Print/Save as PDF and Submit.

Fix: structural, not a sticky/z-index patch. `.cz-rf-right` no longer scrolls at all (`overflow: hidden`, now a flex host). `OrderSummary.tsx`'s `.cz-os` splits into two real sibling children: `.cz-os__scroll` (the only scrolling viewport now — header/prepared/services/totals, `flex:1; min-height:0; overflow-y:auto`) and `.cz-os__footer` (Print/Save as PDF, Submit, and the help line — `flex-shrink:0`, its own opaque `background: var(--cz-color-surface)`, no `position:sticky` needed since it is structurally outside the scroll box and can never be scrolled behind). Two separate boxes make the leak impossible by construction rather than depending on sticky-positioning correctness.

### 4. PDF and email relabel Upgrades as Build Your Own — root cause and fix
Root cause, PDF/print/Quote View: `QuoteProposalPreview.tsx` (the one shared renderer behind the customer's Review & Finalise Print/Save-as-PDF, the standalone customer Quote View page, and — via `printRequestProposal.tsx` — the Admin print action too) never imported or called `composableCoexistsWithPrimary()`. A prior round's design comment in `utils/quote.ts` explicitly assumed this file was "shared with Admin PDF print" and therefore exempt from the "Upgrades" relabel — that assumption was itself the leak, since this same component is the customer-facing PDF/print/Quote-View path, not an admin-only surface. It rendered a hardcoded `"Build Your Own"` eyebrow and the raw `item.tierTitle` (which, for a standalone composable occupant, is itself the literal string `"Build Your Own"`) unconditionally.

Root cause, email: `NotificationTemplates.php` had no PHP equivalent of `composableCoexistsWithPrimary()` at all. `emailFamilyRow()`'s `composable` role always rendered the `"Build Your Own"` badge plus the raw `tierTitle` subtitle for both admin and customer emails, with no check for a sibling primary Family item in the same submitted quote.

Fix: `QuoteProposalPreview.tsx` now imports `composableCoexistsWithPrimary` from `utils/quote.ts` and applies it exactly like `QuoteSummary.tsx`/`OrderSummary.tsx` already did — the composable block's eyebrow and billing-line read `"Upgrades"` when a sibling primary exists for the same Family+Tier-Instance, falling back to `"Build Your Own"` only for a genuinely standalone composable line (never removed outright — only the coexisting case is corrected, per the fix request's own framing that this is a display correction, not identity rewriting). `utils/quote.ts`'s docblock is corrected to no longer claim this file is admin-exempt. `NotificationTemplates.php` gained a PHP port (`familyTierSystemKey()`, `composableCoexistsWithPrimary()`) and threads `familyMainItems` through `emailFamilyRows()`/`emailFamilyRow()` for the `composable` role — when a sibling primary is present, the `"Build Your Own"` badge is omitted and the tier-title subtitle slot reads `"Upgrades"`, for both admin and customer emails (the one shared `buildQuoteSections()`/`emailFamilyRow()` code path both already run through).

### Verification performed
- `npx tsc --noEmit`, `npm run build`, `php -l src/Modules/Requests/Notifications/NotificationTemplates.php` — all clean.
- Full contract + regression + docs-check sweep run (85 scripts). Three contracts had source-scan assertions describing the now-superseded architecture (sticky single-scroll footer; `QuoteProposalPreview.tsx` assumed admin-PDF-exempt; reconciliation-effect reset assumed selection-only) — updated to assert the corrected shape, all now passing: `contract:request-flow-rail-scroll`, `contract:composable-live-correction`, `contract:composable-quote-cart`.
- `regression:composable-quote-cart-loop` (real-DOM Preact regression) passes unchanged — confirms the Grid/select rewrite didn't break the Add/Remove/commit interaction loop.
- 7 unrelated pre-existing failures were confirmed (via `git stash` back to this round's parent commit, `c9072b69`) to already fail identically before this round's changes, and are outside this fix request's scope: `contract:admin-station-css` (stale Rate Sheet Tool import-basket CSS classes), `contract:package-builder-flow` (missing `FullBuildDetail.tsx`), `contract:platform-identity-schema`, `regression:tier-system-footer-loop`, `regression:tier-occupant-lifecycle`, `regression:tier-edition-lifecycle`, `regression:tier-publish-timeout` — all in Tier Occupant/Edition Admin and Rate Sheet Tool, none touched by this round.

### Not independently verifiable without a live browser / real mail client
- Actual pixel alignment of the Grid-based Upgrade rows across real inclusion-label lengths and breakpoints.
- The Category/Service `<select>` dropdowns' native rendering and that reopening shows every option, hands-on.
- That the footer/scroll split visually eliminates the scroll-through artifact under real scrolling (structurally guaranteed by two separate boxes, but not visually confirmed).
- A rendered PDF output or a delivered customer email for the exact KAIROS scenario (`KAIROS — IaaS`, Upgrades, Monthly $36.15, no Build Your Own badge/heading/subtitle) — no live mail-send or browser print capability is available in this environment. The fix request's own required-regression item ("a captured/rendered customer email fixture") is not producible without that access; the code-level fix is identical for both the admin and customer email templates (one shared `buildQuoteSections()`/`emailFamilyRow()` path) and the PDF preview.

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

This is a prohibited customer-facing Build Your Own fallback.

The received customer email independently confirms the same leak: the Upgrade block is rendered as `KAIROS — IaaS` with a **Build Your Own** badge, a `Build Your Own` subtitle, Monthly $36.15, and the Upgrade inclusions. Therefore the legacy route is not PDF-only. Cart/quote presentation, PDF/print, and email still have divergent display consumers capable of carrying Build Your Own authority.

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
4. Use one shared Phase 0 display resolver across cart/quote presentation, review preview, generated PDF/print, customer quote view, and customer email. For a composable item attached to its primary Tier/Edition, every one of these consumers must render **Upgrades**.
5. Remove the email’s **Build Your Own** badge and subtitle for this route. Do not patch only the email template with hardcoded wording; eliminate the legacy/fallback resolver path that supplies it.

## Required regressions
- Varied inclusion-name lengths retain identical Qty/Price/Action column positions at supported breakpoints.
- Choosing Category/Service filters results while the dropdown option catalog remains complete and clearable.
- Closing a completed transaction returns to a fresh usable Upgrade filter state with all eligible items available.
- Review content cannot paint or scroll through the footer/button gap.
- Cart, review preview, generated PDF, customer quote view, and email all label the Phase 0 item **Upgrades** and never Build Your Own.
- A captured/rendered customer email fixture for the observed KAIROS scenario contains **Upgrades**, $36.15, and the correct inclusions, with no `Build Your Own` badge, heading, subtitle, or fallback text.
- Existing decimal precision, disclosure coordination, cart authority, readiness, removal, and hydration safeguards remain green.

Report root causes, affected components, browser screenshots, PDF fixture/output comparison, interaction tests, source/review SHAs, and deployed SHA. Set this file to **AWAITING CHATGPT REVIEW** when ready. Do not push product source until the gate permits it.
