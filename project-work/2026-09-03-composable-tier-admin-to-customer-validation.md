# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — live responsive correction required before validation can pass.**
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