# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Phase 1 implemented on review branch, not pushed to `main`**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `bd0a48d8be81c591e48ebe220dda21645b349089`; deploy #970 succeeded.
- Phase 1 evidence recorded below. Branch `review/upgrade-your-build-eligibility` @ `5c7eb0621c1c3610b6e970826a294065e7bdb89a`, pushed to origin.

## Locked customer flow
The primary Tier/Edition is already in the quote before this stage. This is rearrangement/visibility/navigation around existing state only: no second cart, temporary build, duplicate pricing, or new quote commit model.

1. Focused Tier -> existing Add to Quote.
2. When a real Upgrade Your Build catalogue exists, hide Cart + Recommended Add-ons and show **Upgrade your build** gate.
3. **Browse Catalogue** -> existing `ComposableOfferBrowser` in the focused shell.
4. **Maybe next time** -> end gate -> existing Recommended Add-ons if present -> Cart; otherwise Cart directly.
5. Catalogue left remains existing filters/featured/default-selection/quantity/max-6 paging behavior.
6. Catalogue right shows the already-quoted plan plus upgrade rows as `name × qty` and the same truthful commercial totals used by the cart.
7. Existing composable auto-sync remains active while browsing and must NOT close the gate.
8. New right-side **Add to Quote** is stage-control only: no quote mutation; it ends the gate and resumes the same Add-ons/Cart continuation.

## Accepted phase sequence
1. Extract/share the existing composable eligibility derivation with no behavior change.
2. Add eligibility-gated `pending|browsing|null` state; hide Cart/MobileQuoteBar/Recommendations while gated; `Maybe next time` resumes existing flow.
3. Wire Browse Catalogue to the existing `ComposableOfferBrowser`; keep existing auto-sync/catalogue behavior unchanged.
4. Add right-side build summary + explicit stage-exit **Add to Quote**.
5. Mobile stacking/polish + matrix QA for catalogue/add-on combinations.

## Phase-4 data-path safeguard locked now
Claude's corrected totals direction is accepted: the future Upgrade summary may use the same exported `calcQuoteTotals` / `computeTotalContractValue` / `startingPaymentsByCycle` authorities on the same raw cart items; do not copy arithmetic or mutate `QuoteSummary` merely to reuse its CTA chrome.

One further source correction is required and is now locked before Phase 4: **do not use `composableSelection` as the display source for `name × qty` rows.** `buildComposableFamilyTierQuoteItem()` explicitly treats `composableSelection` as intent/history for reseeding and says price/quantity come from the resolved response. The same committed composable cart item already carries `inclusionItems[]`, built from the resolved catalogue rows with human label plus resolved quantity. Therefore the future summary's simple `name × qty` rows must display from the committed composable item's `inclusionItems[]` (`label`, resolved `quantity`), with `composableSelection` remaining reseed/history state only. No second selection state and no client-side quantity reconstruction.

## Claude — Phase 1 only
Implement only the eligibility refactor from the accepted plan:
- extract the exact current `ComposableOfferBrowser` offer/policy/eligible-row derivation into one shared pure function;
- have `ComposableOfferBrowser` use that function so current render eligibility and catalogue rows are behaviorally unchanged;
- do **not** add gate state, cart hiding, Browse Catalogue routing, summary UI, CTA, or styling yet;
- preserve current auto-sync, preview, pricing, quote/cart and customer-policy behavior exactly.

Prepare one clean review branch from current `main`, add/update focused contract evidence for equivalence/eligibility as appropriate, run focused TypeScript/contracts/build, and record exact branch/SHA/files/evidence here as **AWAITING CHATGPT REVIEW**. Do not push to `main` until reviewed.

## Phase 1 evidence

Branch: `review/upgrade-your-build-eligibility`, based on `main` @ `bd0a48d8` (current production tip), pushed to origin. Commit: `5c7eb0621c1c3610b6e970826a294065e7bdb89a` — "Extract composable catalogue eligibility into resolveComposableEligibleRows()".

Files changed:
- `wp-content/plugins/compuzign-platform/resources/ts/components/package-builder/ComposableOfferBrowser.tsx` — pulled the offer/policy/inclusion join out of the `rows` `useMemo` into a new exported `resolveComposableEligibleRows(family: PackageBuilderFamily): BrowseRow[]`. The component now calls it in place of its old inline body; same offer/policy read, same join, same output — no other line in the file changed.
- `wp-content/plugins/compuzign-platform/scripts/composable-offer-eligibility-contract.ts` (new) — locks the join's semantics: no `composable_offer` → zero rows; offer present but no `customer_policy` → zero rows; an inclusion with no matching policy `item_id` → excluded; a policy item with no matching inclusion → excluded; a matched pair carries the inclusion's browse metadata plus the policy entry verbatim; row order follows `policy.items` order, not `inclusions` order.
- `wp-content/plugins/compuzign-platform/package.json` — registers `contract:composable-offer-eligibility`.
- `wp-content/plugins/compuzign-platform/dist/js/cost-builder.js` — rebuilt output (this bundle already includes `ComposableOfferBrowser.tsx`).

No gate state, cart-hiding, Browse Catalogue routing, summary UI, CTA, or styling was touched, per Phase 1 scope.

Verification run on this branch:
- `npx tsc --noEmit -p tsconfig.json` — clean, no errors.
- `npm run contract:composable-offer-eligibility` — PASS (new contract).
- `npm run contract:composable-offer-choice` — PASS (unchanged, same file).
- `npm run contract:composable-offer-contribution` — PASS (unchanged, same file).
- `npm run contract:composable-quote-cart` — PASS (broader composable quote/cart contract, confirms no behavior drift from the extraction).
- `npm run build` (`vite build`) — clean, `dist/js/cost-builder.js` rebuilt and committed.

Not pushed to `main`. Set **AWAITING CHATGPT REVIEW**.