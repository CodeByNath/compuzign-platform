# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION — Request/Review right-rail correction deployed and self-validated live; awaiting auditor's remaining live-gate items.**
- Auditor verdict: **Proceed with safeguards.**
- Nath gave explicit go-ahead to push to `main` on 2026-09-04.
- Approved review head: `review/request-flow-rail-reachability@5112f5f5`, pushed to `main` as a fast-forward (`8751a233..5112f5f5`).
- Production now: `main@5112f5f5f57bad65adf84e26d829323a43b5eb7570`. Hostinger workflow run `33833809714` succeeded on that exact SHA.

## Claude live validation — Request/Review right-rail

Re-ran the same production reproduction used pre-deploy (build a 3-Family multi-stream quote at `https://compuzign.weerax.com/pricing/`, open Review & Finalise via Playwright) against the now-deployed fix, at all 4 flagged widths × 3 heights (900/700/650):

| width | height | rail overflows body | Print/Submit reachable | help reachable |
|---|---|---|---|---|
| 1024/1067/1100/1180 | 900 | −12 to −16px (fits) | yes | yes |
| 1024/1067/1100/1180 | 700 | −4 to −8px (fits) | yes | yes |
| 1024/1067/1100/1180 | 650 | −2 to −6px (fits) | yes | yes |

12/12 reachable, matching the pre-deploy static-harness prediction exactly. Screenshot at 1180×650 confirms Print/Save as PDF, Submit Quote Request, and the help footer all visible after scrolling the rail. Still outstanding from the auditor's live gate below: Upgrades label, composable Quote Details, Admin Request stored detail, proposal/PDF/public quote exact-once rendering, totals once, no raw IDs — not yet checked this round.

## Accepted correction
Independent diff/source review confirms the branch is narrowly scoped to 5 files: source CSS, rebuilt CSS, one focused contract, package script registration, and Code Map.

Accepted behavior:
- `.cz-rf-right` changes from `max-height:calc(100vh - 80px)` to `max-height:96%`;
- right-rail bottom padding becomes `0`;
- `.cz-os__help` gets `padding-bottom:16px`;
- `.cz-rf-left { overflow-y:auto }` is deliberately preserved because `.cz-rf-body { overflow:hidden }` and the left step/nav content can exceed available height; removing its scroll owner would risk clipping Continue/Back controls;
- prior desktop quote-list single-scroll-owner simplification remains;
- no pricing, totals, composable identity, Request persistence/email, resolver, Rate Sheet, entity/identity, or customer-copy changes.

Claude reproduced the actual failure shape from production markup: the old rail height exceeded `.cz-rf-body` and was hard-clipped by the parent. His static Chromium harness using extracted production modal markup then showed pre-fix action/footer reachability failing at 1024/1067/1100/1180 widths × 900/700/650 heights and post-fix reachability passing at all tested combinations. This is useful evidence but does not replace deployed live validation.

## Push authorization
Claude may fast-forward **only `5112f5f5`** to `main`, with no cleanup/refactor additions. After push, record exact `main` SHA and matching Hostinger workflow run/result here and set **AWAITING LIVE VALIDATION**.

## Live gate after deploy
Re-test the real production Request/Review modal at the affected intermediate widths/short heights and confirm Print/Submit/help are reachable. Also recheck: Upgrades label; composable Quote Details; Admin Request stored inclusion/quantity/stream detail; proposal/PDF/public quote exact-once composable rendering; totals once; no raw IDs.

Fresh production Request/customer email remains separately gated by Nath's explicit authorization.

## Final planned phase
After this chain passes, start the dedicated customer UI/UX refinement pass across pricing, focused-plan/composable, quote/cart, Review & Finalise, and proposal/PDF responsive presentation. Visual/interaction refinement only; accepted architecture stays locked.