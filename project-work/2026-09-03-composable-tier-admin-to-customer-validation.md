# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — correct Finalise-build pending-selection race on review branch.**
- Auditor verdict: **Stop — architectural risk** for `review/upgrade-journey-finalisation@4e2188f22d7f46f039de594c33780159271ec7da` as currently implemented.
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; no source push approved.

## Accepted architecture remains locked
Upgrade starts from an exact Tier/Edition, creates an in-progress composable draft, requires explicit **Finalise build**, then becomes one Build Your Own result. Finalised state uses authoritative peer `composedBase` + `composedUpgrade`; top-level commercial fields are derived projection only; RequestSchema rebuilds projection from sanitised children; un-finalised drafts block Request; add-ons are removed with the primary cascade; Base/Upgrade inclusion and payment-stream provenance is preserved; standalone Build Your Own remains deferred.

## Independent source review
Git compare confirms review head is exactly **1 commit ahead / 0 behind** `main` and changes the reported 27 files. The core finalisation/persistence design matches the accepted architecture, including server-side canonical projection rebuild and fail-closed composed children.

### Blocking defect — Finalise can capture a stale draft
`ComposableOfferBrowser` live-syncs a customer edit only after the 400ms debounced preview succeeds. On every selection/quantity change it immediately sets `previewLoading=true`, then later calls `onCommit(...)` with the newly resolved draft.

But `canFinaliseBuild` currently checks only:
- upgrade context;
- existing `initialCartItem.upgradeDraftBase`;
- exact base identity match.

It does **not** require the latest local selection to have finished resolving/committing. Therefore this sequence is possible:
1. an earlier valid draft is already in cart;
2. customer changes an inclusion/quantity;
3. before the 400ms preview/commit completes, customer clicks **Finalise build**;
4. finalisation consumes the **old cart draft**;
5. removing the primary/context change cancels the pending effect, so the customer's latest edit can be silently lost.

That violates the required rule that Finalise freezes the customer's current resolved build.

## Claude correction instruction
On the same review branch, make Finalise impossible unless the cart draft corresponds to the **latest successfully resolved local selection**. Do not solve this only with a cosmetic delay.

Minimum safeguards:
- Finalise disabled while preview/debounce/request is pending or failed;
- prove the committed draft corresponds to the current local choice, not merely an older draft with the same base identity;
- after a new Add/Remove/quantity edit, Finalise must remain disabled until that exact choice has successfully resolved and `onCommit` has updated the cart;
- no stale-response race may re-enable Finalise for an older choice;
- preserve all accepted architecture/non-change boundaries.

Add focused contract/harness coverage for: existing committed draft -> new edit -> immediate Finalise attempt blocked -> successful latest preview/commit -> Finalise uses latest inclusion/quantity snapshot. Re-run focused contracts, typecheck, build, PHP tests and docs checks.

Record new exact branch SHA/tests here and set **AWAITING CHATGPT REVIEW**. **Do not push `main`.**

## Work journey
Upgrade correction/review/deploy/live validation → remaining representation checks → final customer UI/UX refinement → later standalone Build Your Own journey.