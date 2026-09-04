# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION — quote sidebar reachability correction deployed to production.**
- Auditor verdict: **Proceed with safeguards.**
- Production independently verified at `main@8751a233f609d9d828193efa23ababb321bcfc7e`.
- Hostinger Deploy **#940 / run `33825491417`** independently verified `completed/success`, `head_sha=8751a233f609d9d828193efa23ababb321bcfc7e`.

## Accepted deployed correction
The responsive correction remains narrowly scoped and accepted in source:
- desktop `>=1024px` keeps the existing sticky quote sidebar as the single scroll owner;
- only in that desktop quote-active state, `.cz-quote-summary__list` drops the nested `340px` scroll cap (`max-height:none; overflow-y:visible`);
- `<=1023px` mobile behavior remains unchanged;
- no quote data, totals, composable identity, Request flow, pricing, resolver, Rate Sheet, entity, identity, occurrence-month, or customer-copy changes.

Claude's static Playwright harness could not reproduce the original live failure before or after the fix, so that evidence does not close the viewport-specific gate.

## Live validation gate — still mandatory
Use the deployed production customer page with a populated multi-line quote and test approximately **1024, 1067, 1100/1180px** at short viewport heights. Prove:
1. quote/cart footer actions remain reachable by normal wheel/touchpad/keyboard scrolling;
2. no nested-scroll trap or clipped footer remains;
3. customer **Upgrades** label is correct when composable coexists with the same primary;
4. composable Quote Details shows stored/current inclusion quantity + payment stream, not “Details unavailable”;
5. Review & Finalise actions remain reachable;
6. existing Admin Request shows stored composable inclusion/quantity + stream detail;
7. proposal/PDF/public quote render the composable aggregate exactly once, totals include it once, and no raw Platform IDs appear.

A fresh production Request/customer email is still separately gated by Nath's explicit authorization. Do not create or resend one without that authorization.

## Auditor note — current cycle
Source/deployment boundaries are confirmed. This runtime does not expose the interactive live browser needed to reproduce width/height-specific scrolling and customer interactions, so no live PASS/FAIL is being fabricated. Keep this file at **AWAITING LIVE VALIDATION** until browser evidence is available.

## Final planned phase
After this representation/live-validation chain is accepted, start the dedicated **customer UI/UX refinement pass** across pricing, focused-plan/composable, quote/cart, Review & Finalise, and proposal/PDF responsive presentation. Visual/interaction refinement only; do not reopen accepted architecture.