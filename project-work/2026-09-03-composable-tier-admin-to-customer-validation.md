# Composable Tier — continuous work track

## Status
- **SOURCE PUSH APPROVED — quote sidebar reachability correction accepted for `main`.**
- Auditor verdict: **Proceed with safeguards.**
- Production before this correction: `main@eb200731384359041ac585fcbc9ed57f01550f0d`; Hostinger Deploy #939/run `33768478158` attempt 2 succeeded.
- Approved review branch: `review/quote-sidebar-scroll-reachability@8751a233f609d9d828193efa23ababb321bcfc7e`.
- Independent compare: exactly 1 commit ahead / 0 behind production; 5 files changed, limited to CSS/dist, focused contract, package registration, and Code Map.

## Auditor review
The correction is appropriately narrow and matches the live failure shape.

Accepted implementation:
- desktop `>=1024px` keeps the existing sticky sidebar as the single scroll owner;
- only inside that desktop quote-active scope, `.cz-quote-summary__list` drops its `340px` nested scroll cap via `max-height:none; overflow-y:visible`;
- `<=1023px` base/mobile behavior remains unchanged, so the mobile quote bar/list behavior is not redesigned;
- no quote/cart data, totals, composable identity, Request flow, pricing, resolver, Rate Sheet, entity, identity, or customer-copy changes;
- source/dist alignment and a focused static scroll-owner contract are present.

This does **not** prove real-browser reachability. The browser validation is mandatory after deployment because the original failure was live/viewport-specific and the review branch has no runnable WordPress viewport harness.

## Claude addendum — static-harness empirical check (pre-deploy, not a substitute for the live validation gate)

Before pushing, I built a standalone Playwright reproduction to try to close my own earlier "no browser verification" disclosure: a static HTML harness reusing the actual `cost-builder.css` (pulled via `git show` from both `main` and the approved review commit) and the real `.cz-cost-builder__sidebar`/`.cz-quote-summary` DOM shape, populated with a 4-item multi-stream quote. Tested at 1024/1067/1100/1180px width × 650px height, with real mouse-wheel events aimed at the nested list (not `scrollTop` assignment) and keyboard Tab-to-focus, in both Chromium and WebKit engines.

**Result: the CTA was reachable in every combination, in both the pre-fix and post-fix CSS.** I could not reproduce the reported nested-scroll trap in this harness — standard scroll-chaining already carried wheel input from the exhausted list to the sidebar, and focus navigation already scrolled the CTA into view, regardless of the fix.

This does not contradict the fix (still a legitimate single-scroll-owner simplification, strictly no worse) but it means I cannot independently corroborate that this change is what resolves what Nath saw live. Plausible reasons for the gap: this harness isn't the literal live page (may be missing chrome/overlap present in production), and synthetic wheel events don't perfectly emulate real trackpad momentum/inertial scrolling physics. This reinforces rather than replaces the auditor's live-validation requirement below — flagging it, not treating it as resolved.

## Claude next action
Awaiting Nath's explicit go-ahead before pushing to `main` (production auto-deploy) — auditor approval alone does not authorize that push. Once given: push only approved commit `8751a233f609d9d828193efa23ababb321bcfc7e` (or identical fast-forward result) to `main`. No cleanup/refactors.

After push:
1. record exact `main` SHA;
2. record GitHub Actions deploy run/status and deployed SHA;
3. set **AWAITING LIVE VALIDATION**;
4. do not begin the final customer UI/UX refinement pass yet.

## Live validation gate
At deployed production, test a populated multi-line quote at approximately **1024, 1067, 1100/1180px** and short viewport heights. Prove the quote/cart footer actions remain reachable by normal wheel/touchpad/keyboard scrolling and there is no nested-scroll trap. Also recheck the still-open chain: **Upgrades** label, composable Quote Details, Review/Finalise actions, Admin Request stored detail, proposal/PDF/public quote exact-once rendering, totals once, and no raw IDs.

Fresh production Request/customer email remains separately gated by Nath's explicit authorization.

## Final phase still planned
After this representation/live-validation chain is accepted, continue with the dedicated **customer UI/UX refinement pass** across pricing/focused-plan/composable/cart/Review & Finalise/proposal-PDF responsive presentation. That phase is visual/interaction refinement only and must not reopen accepted architecture.