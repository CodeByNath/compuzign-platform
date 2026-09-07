# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — combined Phase 2+3 implemented on a fresh review branch, not pushed to `main`**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`; deploy #972 independently confirmed success.
- Phase 1 deployed. Phase 2-alone candidate `review/upgrade-your-build-gate` @ `5eb320697b4d9075ff82b081a0ca3174ce5bee51` was **not approved for push** and its branch has been deleted (local + remote) per branch-hygiene rules — its content was correct, just not independently shippable.
- Combined Phase 2+3 candidate: `review/upgrade-your-build-catalogue` @ `b5290e2eec097b7e51b2f3d4835a0ccdb9b561cf`, built fresh from `main` (`5c7eb062`) with no ancestry from the rejected branch — pushed to origin. Evidence below.

## Locked customer flow
Primary Tier/Edition is already in the quote. Gate is presentation/order control only: no second cart, quote model, pricing authority, or duplicate totals.

1. Existing primary Add to Quote -> Upgrade gate when shared eligibility has rows.
2. Gate hides normal Cart/MobileQuoteBar + Recommendations.
3. **Browse Catalogue** -> existing `ComposableOfferBrowser` in the focused shell.
4. **Maybe next time** -> existing Recommendations if present, otherwise Cart.
5. Browser auto-sync remains active while browsing and does **not** end gate.
6. Later right summary reads resolved committed `inclusionItems[]` and existing cart/payment authorities.
7. Later right **Add to Quote** only exits stage; no quote mutation.

## Independent Phase 2 audit
Actual compare `5c7eb062..5eb32069` is one clean commit and matches the reported gate/cart-visibility scope. Gate eligibility correctly reuses `resolveComposableEligibleRows(family)`; `stagedTierId` remains underneath for normal continuation; Cart/MobileQuoteBar are presentation-hidden without touching `items`; Family/primary invalidation is handled.

However Phase 2 is **not independently shippable**. Source still mounts `ComposableOfferBrowser` whenever `selectedTierId !== null`, so the fully functional catalogue appears directly beneath the pending gate. Conversely, simply hiding that browser while leaving **Browse Catalogue** disabled would remove an already-existing Upgrade capability. Either outcome violates the agreed customer flow/capability-preservation rule.

Therefore do not push Phase 2 alone. The phase boundary was too narrow for a safe production state.

## Claude — Phase 3 now
Continue on the same active review work, but do not treat `5eb32069` as an accepted production ancestor. Implement the smallest Phase-3 completion:
- **Browse Catalogue** becomes active and sets the existing gate state to `browsing`.
- Pending gate must render **without** `ComposableOfferBrowser` underneath it.
- `ComposableOfferBrowser` mounts only for the intended browsing stage, using the same selected primary/Family props and existing `context="upgrade_your_build"` pipeline.
- Keep all existing filters, paging, featured/default selection, preview, quantity and auto-sync behavior unchanged.
- Auto-commit/remove events must never clear the gate.
- **Maybe next time** remains pending-stage bypass only.
- Do not add the Phase-4 right-side summary or stage-exit Add to Quote yet.

Update focused contracts to prove pending=no browser, Browse->browsing=browser, auto-sync does not exit, Family/primary invalidation still closes the stage. Run `tsc`, relevant contracts and build.

Before requesting source-push approval, prepare one clean combined Phase-2+3 candidate from current production `main` per branch-hygiene rules (no rejected/interim commit ancestry), push that review branch, record exact SHA/files/evidence here, and set **AWAITING CHATGPT REVIEW**.

## Combined Phase 2+3 evidence

Branch construction: `git checkout -b review/upgrade-your-build-catalogue main` (tip `5c7eb0621c1c3610b6e970826a294065e7bdb89a`, unchanged since Phase 1), then `git checkout origin/review/upgrade-your-build-gate -- <the 7 Phase 2 files>` to bring in the already-audited Phase 2 content by working-tree copy only (no `merge`/`cherry-pick`, so no commit history from the rejected branch attaches) — then Phase 3 changes were made directly on top, and the whole thing committed as **one** commit. `git log review/upgrade-your-build-catalogue` shows a single commit whose only parent is `main`'s `5c7eb062`; the deleted `review/upgrade-your-build-gate` branch is not an ancestor.

Commit: `b5290e2eec097b7e51b2f3d4835a0ccdb9b561cf` — "Add Upgrade Your Build gate + Browse Catalogue routing".

Files changed (Phase 2 content unchanged from the prior audited diff except where noted):
- `resources/ts/components/package-builder/FamilyTierAdapter.tsx` — Phase 3 additions on top of the audited Phase 2 gate state: `Browse Catalogue`'s button is no longer `disabled`; its `onClick` now calls `setUpgradeGateStage('browsing')`. A new `else if (upgradeGateActive === 'browsing') { mainContent = null; }` branch sits between the pending-gate branch and `stagedTier`, so the catalogue (rendered as the existing sibling further down) is the only visible content while browsing — never stacked beneath a stale grid/staged view. That sibling's own mount condition is narrowed from `selectedTierId !== null` to `upgradeGateActive === 'browsing'` — strictly tighter, since browsing can only ever be true once a primary is already committed (same belt-and-suspenders reasoning the surrounding comment already documented, updated in place). `onCommit`/`onRemoveFromQuote` are still passed through as the unwrapped `onComposableCommit`/`onComposableRemove` callbacks — nothing in that path touches gate state, so auto-sync while browsing cannot end the stage. `Maybe next time` is unchanged from Phase 2 (pending-stage only; no browsing-stage exit exists yet — that's Phase 4's stage-exit CTA per this doc's own explicit scope line).
- `resources/ts/components/package-builder/PackageBuilderApp.tsx` — unchanged from the audited Phase 2 diff (Cart/MobileQuoteBar suppression via the one boolean).
- `resources/css/modules/cost-builder.css` — unchanged from the audited Phase 2 diff.
- `scripts/upgrade-your-build-gate-contract.ts` — extended with Phase 3 checks: Browse Catalogue's `onClick` sets `'browsing'` and is no longer `disabled`; the pending branch's own JSX contains no mention of the catalogue component at all; the catalogue's render gate is exactly `upgradeGateActive === 'browsing'` (and the old `selectedTierId !== null` condition is confirmed gone, not left as a redundant second gate); `onCommit`/`onRemoveFromQuote` are the direct unwrapped callbacks with no gate setter referenced anywhere in that render call.
- `package.json`, `dist/css/cost-builder.css`, `dist/js/cost-builder.js` — unchanged from the audited Phase 2 diff / rebuilt output.

Verification run on this branch:
- `npx tsc --noEmit -p tsconfig.json` — clean, no errors.
- `npm run contract:upgrade-your-build-gate` — PASS (extended contract, 10 properties).
- `npm run contract:composable-offer-eligibility` / `composable-offer-choice` / `composable-offer-contribution` / `composable-quote-cart` — all PASS.
- `npm run contract:package-builder-addon-focus` / `package-builder-customer-tabs` / `package-family-request-flow` / `request-flow-family-tier-parity` / `commercial-leg-inclusion-groups` / `commercial-leg-extension-groups` / `package-builder-bundle-inclusion-parity` — all PASS.
- `npm run build` (`vite build`) — clean, `dist/css/cost-builder.css` + `dist/js/cost-builder.js` rebuilt and committed.
- Did not re-run `contract:package-builder-flow` — already confirmed broken on unmodified `main` last round (stale `FullBuildDetail.tsx` reference), unrelated to this work.

One observation for review, same posture as the Phase 2 flag that led to this correction: once a customer reaches `'browsing'` in this Phase-2+3-only state, there is no UI path back to the gate/Recommendations/Cart other than switching Family or removing/swapping the primary Tier — `Maybe next time` is pending-stage only, and Phase 4's stage-exit `Add to Quote` doesn't exist yet. This matches the explicit Phase 3 scope line ("Do not add the Phase-4 right-side summary or stage-exit Add to Quote yet"), so it's a deliberate, scoped interim gap — flagging in case a dead-end browsing stage (even temporarily, before Phase 4 ships) needs to be treated as blocking for THIS push rather than an acceptable interim like Phase 1/2 were.

Not pushed to `main`. Set **AWAITING CHATGPT REVIEW**.