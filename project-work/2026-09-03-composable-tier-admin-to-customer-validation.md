# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION — hidden scrollbar chrome deployed and self-validated live.**
- Auditor verdict: **Proceed with safeguards.**
- Nath gave explicit go-ahead to push to `main` on 2026-09-04.
- Approved review head: `review/request-flow-hidden-scrollbars@aa820596`, pushed to `main` as a fast-forward (`5112f5f5..aa820596`).
- Production now: `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`. Hostinger workflow run `33835470825` succeeded on that exact SHA.

## Claude live validation — hidden scrollbar chrome

Re-tested the deployed site (`https://compuzign.weerax.com/pricing/`, same 3-Family multi-stream quote, Review & Finalise modal, 1100×650): `getComputedStyle` confirms both `.cz-rf-left` and `.cz-rf-right` keep `overflow-y:auto` and now report `scrollbar-width:none`; real wheel input over each panel still moved `scrollTop` (right rail 0→632, left panel 0→344); Submit Quote Request confirmed reachable in-viewport after scrolling. Screenshot shows no scrollbar track on either panel — matches the pre-deploy static-harness prediction exactly. Still outstanding: Upgrades label, composable Quote Details, Admin Request stored detail, proposal/PDF/public quote exact-once rendering, totals once, no raw IDs — not yet checked.

## Accepted deployed correction retained
The Request/Review right-rail clipping fix stays locked:
- `.cz-rf-right { max-height:96%; padding-bottom:0; overflow-y:auto; }`
- `.cz-os__help { padding-bottom:16px; }`
- `.cz-rf-left { overflow-y:auto; }` retained because `.cz-rf-body { overflow:hidden }` and long Contact/Review content needs a scroll owner.
- prior quote-list desktop single-scroll-owner simplification remains.
- no pricing, totals, composable identity, Request persistence/email, resolver, Rate Sheet, entity/identity, occurrence-month, or copy changes.

## Auditor review — hidden scrollbar chrome
Independent Git compare confirms `aa820596...` is exactly **1 commit ahead / 0 behind** production and changes only:
- source CSS;
- rebuilt CSS;
- the focused Request-flow rail scroll contract.

Source inspection confirms the requested presentation rule is applied exactly to `.cz-rf-left` and `.cz-rf-right`:
- `scrollbar-width:none`;
- `-ms-overflow-style:none`;
- `::-webkit-scrollbar { display:none; }`.

Both panels still retain `overflow-y:auto`; therefore this hides scrollbar chrome without removing wheel/trackpad/touch/keyboard/focus scrolling. The accepted `max-height:96%` rail geometry and help padding remain unchanged. No unrelated/global scrollbar hiding is introduced.

Claude reports the extended focused contract, quote-sidebar contract, isolation contract, typecheck, build and docs checks all pass; static wheel validation confirms both panels still scroll.

## Push authorization
Claude may fast-forward **only `aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`** to `main`, with no cleanup/refactor additions. After push, record exact `main` SHA and matching Hostinger workflow result here and set **AWAITING LIVE VALIDATION**.

## Remaining live gate
After deploy, visually confirm both Request-modal scrollbar tracks are hidden while both panels remain scrollable/reachable. Then continue the still-open representation checks: Upgrades label; composable Quote Details; Admin Request stored detail; proposal/PDF/public quote exact-once rendering; totals once; no raw IDs. Fresh production Request/customer email remains separately gated by Nath's explicit authorization.

## Final planned phase
After this chain passes, begin the dedicated customer UI/UX refinement pass across pricing, focused-plan/composable, quote/cart, Review & Finalise, and proposal/PDF responsive presentation. Visual/interaction refinement only; accepted architecture stays locked.