# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — Finalise-build stale-draft race corrected on the same review branch.**
- Auditor verdict: **Stop — architectural risk** (on the *prior* commit; the correction below addresses it).
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

## Claude correction report — Finalise stale-draft race

**Branch:** `review/upgrade-journey-finalisation`, now at `528f7295` (2 commits ahead of `main@aa820596`, `0` behind). Not pushed to `main`.

**Root cause confirmed exactly as the auditor described**: `canFinaliseBuild` checked only that the committed draft's `upgradeDraftBase` matched the current primary — never whether that committed draft's own `composableSelection` still matched the customer's *current* local selection. An edit followed by an immediate Finalise click, before the 400ms debounce/preview/commit round-trip completed, could finalise the older cart draft.

**Fix:** extracted two pure, exported functions in `ComposableOfferBrowser.tsx` (same precedent as the already-exported `buildComposableChoice()`/`resolveItemContributions()`, for direct contract testing without mounting the component or faking timers):
- `composableChoicesMatch(a, b)` — order-independent equality over two resolved choice arrays by `item_id`+`selected`+`quantity`.
- `isFinaliseBuildReady({ context, previewLoading, previewOk, currentChoice, initialCartItem, primaryItem })` — the full guard. Beyond the existing base-identity check, it now also requires `!previewLoading`, the last preview to have resolved `ok`, **and** `currentChoice` (`buildComposableChoice(rows, selection)`, which changes synchronously the instant the customer edits — before the debounce timer even starts) to match `initialCartItem.composableSelection` exactly.

This closes the race structurally rather than with a delay: the local and committed choices diverge the moment an edit happens and only re-converge once `onCommit` has actually updated the cart to match that exact edit. A stale response committing an older choice, or one committed while a newer local edit is already pending, can never satisfy the match — verified directly, not just reasoned about.

**New contract, all cases pass:** `contract:composable-finalise-race` walks the auditor's exact reported sequence — (1) existing committed draft, no pending edit → ready; (2) edit made, before debounce fires (`previewLoading` still false) → blocked; (3) debounce fired, request in flight → blocked; (4) latest preview resolved and committed → ready again; (5) stale response commits an old choice while an even-newer local edit is pending → stays blocked; (6) last preview failed → blocked even if choices happen to match; (7) `build_your_own` context → never offered; (8) `composableChoicesMatch` order-independence and change-detection.

**Re-validated, all pass:** `npm run contract:composable-finalise-race` (new), `npm run contract:upgrade-quote-draft`, `npm run contract:quote-cart-addon`, `npm run contract:cost-builder-isolation`, `php tests/request-schema-composed-upgrade.php`, `php tests/notification-templates-composed-upgrade.php`, `php tests/request-schema-composable.php`, `npx tsc --noEmit`, `npm run build`, `npm run docs:check`.

**No change to anything else** in the accepted architecture — `composedBase`/`composedUpgrade`, server-derived projection, add-on removal cascade, hard submission gate, and grouped rendering are untouched by this commit.

**Unresolved risk, unchanged from the implementation report:** still no live browser verification — this fix, like the original implementation, was checked by contract/unit tests and `tsc`/`build` only.

## Work journey
Upgrade correction/review/deploy/live validation → remaining representation checks → final customer UI/UX refinement → later standalone Build Your Own journey.