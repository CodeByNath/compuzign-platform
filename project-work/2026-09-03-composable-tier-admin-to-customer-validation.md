# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — Request/Review modal right-rail correction implemented on a review branch.**
- Auditor verdict: **Proceed with safeguards.**
- Production: `main@8751a233f609d9d828193efa23ababb321bcfc7e` (unchanged — not pushed).
- Hostinger Deploy #940 / run `33825491417` succeeded on that exact SHA.

## Live result
The deployed quote-sidebar scroll-owner correction did **not** fix the real customer issue. Nath retested live and the Request/Review rail actions are still unreachable at the affected intermediate widths.

Nath isolated the effective CSS correction live:
```css
.cz-rf-right {
  max-height: 96%;
  padding-bottom: 0;
}

.cz-os__help {
  padding-bottom: 16px;
}
```
replacing the current `.cz-rf-right { max-height: calc(100vh - 80px); ... padding-bottom: var(--cz-space-8); }` geometry.

Nath also reports removing `overflow-y:auto` from `.cz-rf-left` as part of the live correction.

## Auditor source check / safeguard
Current desktop structure is `.cz-rf-body { overflow:hidden }`, with `.cz-rf-left { overflow-y:auto }` and `.cz-rf-right { overflow-y:auto }`. Therefore **do not remove the left-panel scroll blindly**: because the parent clips overflow, removing `.cz-rf-left` scrolling could make long Contact/Review content unreachable on short desktop viewports.

Implement Nath's live-proven right-rail geometry exactly, but treat the `.cz-rf-left` overflow removal as conditional: first inspect/verify all desktop Request steps at short heights. Remove it only if the left content remains fully reachable through another deliberate scroll owner; otherwise preserve it. No speculative restructuring.

## Claude correction scope
1. Replace `.cz-rf-right` max-height with `96%` and bottom padding with `0` (normal token syntax is fine; do not add `!important` unless cascade evidence requires it).
2. Add `padding-bottom:16px` (or exact equivalent token) to `.cz-os__help`.
3. Re-evaluate `.cz-rf-left { overflow-y:auto }` against the actual modal scroll chain. If safe, remove it as Nath observed; if not, report why and preserve left-step reachability.
4. Do not touch pricing, quote data/totals, composable identity, Request persistence/email, resolver, Rate Sheet, or customer copy.
5. Keep the prior desktop quote-list single-scroll-owner simplification unless it conflicts with the proven fix.

Verify at the affected intermediate widths/short heights and also Contact + Review steps with enough content to overflow. Push only to a non-production review branch, record exact SHA/files/tests/evidence here, set **AWAITING CHATGPT REVIEW**, do not push `main`.

## Claude response — Request/Review modal right-rail correction

**Branch:** `review/request-flow-rail-reachability`, single commit `5112f5f5`, based on `main@8751a233` (current `main` tip, includes the prior sidebar fix). Not pushed to `main`.

**Root cause confirmed live, before writing any fix:** I built a quote on production (`https://compuzign.weerax.com/pricing/`, 3 Families, one multi-stream item) and opened Review & Finalise via Playwright, then measured the actual DOM at 1300×900. `.cz-rf-right`'s bounding rect was `top:199.9 bottom:1019.9` (height 820, exactly `calc(100vh-80px)` at that viewport) while its flex parent `.cz-rf-body`'s rect was `top:183.9 bottom:876` (height 692.1) — the rail overflowed its own parent's bottom by 144px. Since `.cz-rf-body { overflow: hidden }` (not `auto`/`scroll`), that excess wasn't just hard to scroll to — it was hard-clipped and permanently invisible regardless of any scroll gesture on `.cz-rf-right`'s own `overflow-y:auto`. This reproduced even at a normal 900px-tall viewport, not only short ones. Matches Nath's report exactly.

**Fix (Nath's live-proven correction, applied verbatim):**
- `.cz-rf-right`: `max-height: calc(100vh - 80px)` → `max-height: 96%` (a share of `.cz-rf-body`'s own definite flex height, not a `100vh`-relative guess that undersized the header + backdrop-padding overhead); bottom padding `var(--cz-space-8)` → `0`.
- `.cz-os__help`: added `padding-bottom: 16px` — carries the bottom breathing room `.cz-rf-right`'s own padding used to reserve, now inside the scrollable content instead of inflating the rail's box past the 96% budget.

**Item 3 — `.cz-rf-left { overflow-y: auto }` — preserved, not removed.** Investigated per the auditor's conditional instruction. `.cz-rf-left__nav` (the Back/Continue buttons) is `flex-shrink:0` but **not** `position:sticky` — it sits in normal flow inside the same scrollable column as the contact form (`.cz-rf-contact-panel` → `.cz-rf-left__scroll` → `.cz-rf-left__nav`, all direct/indirect children of `.cz-rf-left` itself). In the same static harness (below), `.cz-rf-left`'s content measured 770–786px tall against 442–708px of available height across the tested widths/heights — i.e. it needs its own scroll at every tested size, not just edge cases. Removing `.cz-rf-left`'s `overflow-y:auto` would leave the Continue button with no scroll owner at all, and `.cz-rf-body`'s `overflow:hidden` would silently clip it — the identical bug class I just fixed on the right rail, this time blocking Contact-step progression. Preserved as the auditor's safeguard anticipated; documented in a code comment and locked by the new contract.

**Empirical validation — static harness, real markup:** extracted the actual deployed modal's `outerHTML` from production (via the same Playwright session, after opening Review & Finalise) and rendered it locally against the real compiled CSS, in both the pre-fix (`main@8751a233`) and post-fix versions, using the actual `atomic-engine` token/reset/layout/button sheets. Tested Chromium at all 4 flagged widths (1024/1067/1100/1180) × 3 heights (900/700/650):
- **Pre-fix:** `.cz-rf-right` overflowed `.cz-rf-body`'s bottom by 124–144px at every combination; after scrolling the rail to its own max, the Print/Submit actions and help footer remained unreachable (outside `.cz-rf-body`'s visible bounds) at all 12/12 combinations.
- **Post-fix:** the rail fit inside `.cz-rf-body` (−2px to −16px margin) at every combination; after scrolling the rail to its max, Print/Submit and the help footer were reachable at all 12/12 combinations.

I have not yet re-deployed and re-tested this specific fix against the live site (that requires the push this file gates); the harness reuses production's real markup and CSS, but is still a local reproduction, not the live page itself.

**Files changed:**
- `wp-content/plugins/compuzign-platform/resources/css/modules/cost-builder.css` (the fix + rationale comments)
- `wp-content/plugins/compuzign-platform/dist/css/cost-builder.css` (rebuilt output)
- `wp-content/plugins/compuzign-platform/scripts/request-flow-rail-scroll-contract.ts` (new)
- `wp-content/plugins/compuzign-platform/package.json` (registers `contract:request-flow-rail-scroll`)
- `docs/code-map/quote-builder.md` (documents the rail geometry + `.cz-rf-left` scroll-ownership rationale + new contract)

**Tests/contracts run, all passing on this branch:** `npm run contract:request-flow-rail-scroll` (new — asserts via static CSS parse that `.cz-rf-right` no longer uses a `100vh`-relative `calc()`, keeps `max-height:96%` and zero bottom padding; that `.cz-os__help` carries the moved `16px` bottom padding; that `.cz-rf-left` still keeps `overflow-y:auto`; and flags this contract for revisit if `.cz-rf-left__nav` ever becomes `position:sticky`), `npm run contract:quote-sidebar-scroll`, `npm run contract:cost-builder-isolation`, `npm run contract:quote-cart-addon`, `npx tsc --noEmit`, `npm run build`, `npm run docs:check` — all pass on `main` tip.

Data/totals/composable identity/Request persistence/email/resolver/Rate Sheet/customer copy: untouched — only the four CSS declarations above.

## Remaining live gate
After deployment revalidate rail/button reachability, Upgrades label, composable Quote Details, Admin Request stored detail, proposal/PDF/public quote exact-once rendering, totals once, and no raw IDs. Fresh production Request/customer email remains separately gated.

## Final planned phase
After this chain passes, start the dedicated customer UI/UX refinement pass across pricing, focused-plan/composable, quote/cart, Review & Finalise, and proposal/PDF responsive presentation. Visual/interaction refinement only; accepted architecture stays locked.