# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 3 must complete before any Phase-2/3 source push**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`; deploy #972 independently confirmed success.
- Phase 1 deployed. Phase 2 candidate: `review/upgrade-your-build-gate` @ `5eb320697b4d9075ff82b081a0ca3174ce5bee51`.
- **SOURCE PUSH NOT APPROVED** for Phase 2 alone.

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