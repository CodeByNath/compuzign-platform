# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — replace bespoke Upgrade summary with scoped real-Cart presentation reuse**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`; deploy #972 succeeded.
- Current Phase 2+3+4 candidate `review/upgrade-your-build-summary` @ `7daf03b33efdef59f5fb8f759f7e7ce15108ef32` is **not approved for main**.

## Locked direction
Do **not** keep extending `UpgradeBuildSummary` as a second simplified Cart presentation.

Nath's requirement is simpler: the primary Tier/Edition and composable Build Your Own line already live in the real quote/cart state. During Upgrade browsing, the right side should show the **relevant slice of the existing Cart presentation**, not imitate it.

### Desired right side while browsing
Reuse the real Cart's existing item/payment-stream/totals presentation for only:
- the already-quoted primary Tier/Edition;
- the current composable/Build Your Own cart line that auto-sync already maintains.

Then show the Upgrade-stage **Add to Quote** action underneath. That button is stage-control only and ends the gate; it must not mutate/recommit/rebuild the quote.

Do not show unrelated cart items or cart-only controls such as Clear all, Remove, Review & Finalise Quote, or other full-Cart chrome unless a specific reused presentation primitive inherently requires them; preferred solution is the smallest reusable Cart item/summary presentation slice, not rendering the entire `QuoteSummary` unchanged.

## Must preserve
- existing primary Add-to-Quote mutation;
- Phase-1 shared catalogue eligibility;
- pending gate + Maybe next time behavior;
- Browse Catalogue -> existing `ComposableOfferBrowser`;
- existing filters/paging/featured/default-selection/quantity/preview/auto-sync;
- Cart/MobileQuoteBar visually hidden while Upgrade stage is active;
- underlying `items` untouched;
- normal Recommendations/Add-ons -> Cart continuation after bypass/exit.

## Must remove
- bespoke simplified `UpgradeBuildSummary` monetary presentation logic;
- multi-stream `See Cart` fallback;
- flat primary `price`/`billingCycle` substitute where Cart has richer commercial streams;
- client-side `quantity ?? 1` reconstruction.

## Must not substitute
- no second Cart/store;
- no second pricing/totals implementation;
- no staging/commit model;
- no reduced summary that hides information merely because the real Cart is suppressed;
- no extra Continue/Done/Finish step.

## Claude — next action
Inspect `QuoteSummary.tsx` and its existing item/payment presentation helpers/components. Identify the **smallest truthful reusable presentation seam** for a scoped Cart view of the primary + composable lines. Reuse/extract presentation primitives only where source proves genuine shared semantics; do not rewrite full Cart behavior just to share chrome.

Replace the current bespoke Upgrade summary approach with that scoped Cart presentation. Keep Upgrade `Add to Quote` as stage-exit only.

Update focused contracts for: same Cart presentation authority, scoped primary+composable items only, no cart-mutating controls, no client quantity fallback, and stage-exit-only CTA. Run `tsc`, relevant contracts and build.

Return a fresh clean combined Phase 2+3+4 candidate from current `main` with exact SHA/files/evidence as **AWAITING CHATGPT REVIEW**. Do not push to main.