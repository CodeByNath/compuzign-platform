# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — quote sidebar reachability correction implemented on a review branch.**
- Auditor verdict: **Proceed with safeguards.**
- Production remains `main@eb200731384359041ac585fcbc9ed57f01550f0d`.
- Hostinger Deploy #939 / run `33768478158`, attempt 2, succeeded on that exact SHA.

## Accepted behavior retained
Do not reopen the accepted composable architecture or Request retry fix. Keep:
- explicit `primary | addon | composable` identity and one aggregate composable line;
- customer **Upgrades** label only when composable coexists with the same Family+Tier-System primary;
- composable Quote Details from stored/current successful snapshot;
- Admin Request stored inclusion/quantity + payment-stream detail;
- creator-only Request secret/transient/email side effects; identical retry side-effect-idempotent; changed payload 409;
- no pricing/resolver/Rate Sheet/entity/identity/occurrence-month changes.

## New live failure — quote/cart actions at intermediate desktop width
Nath reports the browser validation exposed a customer quote/cart responsive gap: **the bottom action buttons become unreachable at some widths just before the layout collapses to the single-column/mobile treatment.** Treat this as a live validation failure even if the browser-agent transcript is not available in this coordination file.

Independent source read confirms the risky boundary:
- customer builder uses the desktop sticky quote sidebar from **1024px up**;
- the mobile quote bar/single-column path takes over at **<=1023px**;
- desktop sidebar has a viewport-constrained max height/outer scrolling, while `.cz-quote-summary` itself is `overflow:hidden`, its list has its own `max-height:340px; overflow-y:auto`, and the CTA/PDF controls live later in `.cz-quote-summary__footer`.

This creates a plausible trapped/nested-scroll/reachability failure in the narrow desktop band where content wraps/tallens but the mobile layout has not yet activated.

## Claude correction request
Audit and fix **only** the customer pricing-page quote/cart sidebar action reachability across the narrow desktop transition. Do not redesign the cart.

Required behavior:
1. At widths immediately above the existing 1024px desktop boundary (and representative wider desktop widths), **Quote details / Review & Finalise / Print-Save PDF or equivalent bottom cart actions must always be reachable by normal pointer/touchpad/keyboard scrolling**.
2. No action may be clipped behind the viewport or trapped below a nested scroll region.
3. At <=1023px, preserve the existing mobile/single-column quote-bar behavior.
4. Preserve sticky desktop sidebar behavior where it remains useful; prefer one clear scroll owner rather than stacked scroll traps.
5. Do not change quote data, totals, composable identity, Request flow, or customer copy in this correction.

Add a focused responsive regression/contract covering at least ~1024, 1067, 1100/1180 widths with a short viewport height and a populated multi-line quote. Push to a non-production review branch, record exact SHA/files/tests here, set **AWAITING CHATGPT REVIEW**, and do not push `main`.

## Remaining live gate after this correction
Still validate Upgrades label, composable Quote Details, Review/Finalise actions, Admin Request detail, proposal/PDF/public quote exact-once rendering, totals once, no raw IDs. Fresh production Request/email remains separately gated by Nath’s explicit authorization.

## Claude response — quote sidebar reachability correction

**Branch:** `review/quote-sidebar-scroll-reachability`, single commit `8751a233f609d9d828193efa23ababb321bcfc7e`, based on `main@eb200731` (current `main` tip). Not pushed to `main`.

**Root cause confirmed by source read** (not by live rendering — see disclosure below): at `>=1024px`, `.cz-cost-builder--has-quote .cz-cost-builder__sidebar` (`resources/css/modules/cost-builder.css`) is `position: sticky` with a viewport-bounded `max-height` and its own `overflow-y: auto` — the intended single scroll owner for the whole quote card. But `.cz-quote-summary__list` inside it independently carried `max-height: 340px; overflow-y: auto` — a second, nested scroll region stacked inside the first, exactly the shape flagged in the correction request. On a short viewport near the 1024–1180px band, a scroll gesture that lands on the list can end at the list's own scroll boundary without the footer (Review & Finalise / View details) ever coming into view, depending on where the pointer/wheel/keyboard focus starts.

**Fix:** inside the existing `@media (min-width: 1024px)` block, added `.cz-cost-builder--has-quote .cz-quote-summary__list { max-height: none; overflow-y: visible; }`. This clears the list's own scroll boundary at desktop widths only, so the header/items/footer flow as one region and the sidebar's own `overflow-y: auto` is the sole scroll owner — satisfying requirement 4 (one scroll owner) directly. The base (non-media) `.cz-quote-summary__list` rule — `max-height: 340px; overflow-y: auto` — is untouched, so `<=1023px` mobile behavior (requirement 3) is unaffected: the sidebar itself never scrolls there, so the list keeps owning its own scroll. No data/totals/composable-identity/Request-flow/copy changes (requirement 5) — only the two CSS declarations above.

**Files changed:**
- `wp-content/plugins/compuzign-platform/resources/css/modules/cost-builder.css` (the fix, +14 lines incl. comment)
- `wp-content/plugins/compuzign-platform/dist/css/cost-builder.css` (rebuilt output)
- `wp-content/plugins/compuzign-platform/scripts/quote-sidebar-scroll-contract.ts` (new)
- `wp-content/plugins/compuzign-platform/package.json` (registers `contract:quote-sidebar-scroll`)
- `docs/code-map/cost-builder.md` (documents the scroll-owner shape + new contract)

**Tests/contracts run, all passing on this branch:** `npm run contract:quote-sidebar-scroll` (new — asserts via static CSS parse that the desktop sidebar rule keeps `position: sticky` + a `calc()` `max-height` + `overflow-y: auto`, that the desktop override on `.cz-quote-summary__list` sets `max-height: none` with no re-declared scrolling `overflow-y`, and that the base/mobile list rule still keeps its original `340px`/`overflow-y: auto`), `npm run contract:cost-builder-isolation`, `npm run contract:tier-addon-flow`, `npm run contract:tier-edition-switch`, `npm run contract:quote-cart-addon`, `npx tsc --noEmit`, `npm run build`, `npm run docs:check` — all pass on `main` tip.

**Disclosure — no live browser verification performed.** This repo has no local WordPress/browser test harness (Vite build only, no dev-server HTML entry point that mounts the Cost Builder standalone), so I could not actually render the page at 1024/1067/1100/1180px with a short viewport height and a populated multi-line quote as the correction request asked. The fix and its regression contract are both static — reasoned from the CSS box model and locked in by parsing the stylesheet's rule shape, not by rendering. Please treat this as **unverified in a real browser** and, if practical, have it checked visually/interactively at the requested widths before this leaves "Proceed with safeguards."

**Unresolved risk:** confirming the actual pre-fix reachability failure (vs. relying on standard browser scroll-chaining already carrying the gesture from the list to the sidebar without this change) also was not empirically verified — the fix is justified as strictly safer/simpler (one real scroll owner instead of a nested one) regardless, but I cannot rule out the original bug had a different or additional cause I did not find from source alone.