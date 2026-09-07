# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 4 must complete before any Phase 2+3+4 source push**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`; deploy #972 succeeded.
- Phase 1 deployed.
- Combined Phase 2+3 candidate `review/upgrade-your-build-catalogue` @ `b5290e2eec097b7e51b2f3d4835a0ccdb9b561cf` is one clean commit from current main and is **not approved for main**.

## Independent audit
The Phase 2+3 candidate correctly:
- reuses `resolveComposableEligibleRows(family)` for gate eligibility;
- hides Cart/MobileQuoteBar/Recommendations without altering `items`;
- makes **Browse Catalogue** enter `browsing`;
- mounts the existing `ComposableOfferBrowser` only while browsing;
- leaves its preview/selection/quantity/auto-sync callbacks unchanged;
- prevents auto-sync from ending the gate;
- preserves Family/primary invalidation.

But it is not independently shippable: once browsing starts there is no customer exit back to Recommendations/Cart. Shipping that dead-end would reduce the existing customer capability. Phase 4 is therefore required before approval.

## Locked customer flow
Primary Tier/Edition is already in the quote. This work only rearranges presentation/navigation around existing quote/cart state.

Pending gate:
- **Browse Catalogue** -> browsing.
- **Maybe next time** -> existing Recommendations if present, otherwise Cart.

Browsing:
- left = existing `ComposableOfferBrowser` unchanged;
- right = simple **Your build** summary of existing quote/cart state;
- existing composable auto-sync continues while browsing;
- right-side **Add to Quote** is stage-control only: it performs no quote mutation and exits browsing to existing Recommendations-if-present, otherwise Cart.

## Phase 4 safeguards
- Summary display rows must come from the committed composable item's resolved `inclusionItems[]` (`label`, resolved `quantity`), not `composableSelection` intent/history.
- Monetary facts must reuse existing exported cart/payment calculation authorities used by `QuoteSummary`; no copied arithmetic, second pricing model, or staging cart.
- Do not alter `ComposableOfferBrowser` preview, filter, paging, featured/default-selection, quantity, commit/remove, pricing, or persistence semantics.
- Do not add another Continue/Done/Finish action.

## Claude — Phase 4
Implement the right-side `Your build` presentation beside the existing browser and the explicit **Add to Quote** stage-exit CTA. Its handler only clears/ends the Upgrade gate; it must not call composable commit/remove or rebuild quote data.

Update focused contracts to prove: resolved `inclusionItems[]` drive `label × quantity`; existing shared monetary helpers are reused; Add to Quote only exits; auto-sync remains independent; exit resumes the existing staged Add-ons-or-Cart path.

Run `tsc`, relevant contracts and build. Before requesting push approval, prepare **one fresh combined Phase 2+3+4 candidate from current production main** with no rejected/interim commit ancestry, push that review branch, record exact SHA/files/evidence here, and set **AWAITING CHATGPT REVIEW**. Do not push to main.