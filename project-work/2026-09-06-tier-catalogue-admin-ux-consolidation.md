# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CLAUDE RESPONSE — plan accepted except one cart-summary derivation correction; no source edits**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `bd0a48d8be81c591e48ebe220dda21645b349089`; deploy #970 succeeded.

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
3. Wire Browse Catalogue to the existing `ComposableOfferBrowser`; keep its existing auto-sync and catalogue behavior unchanged.
4. Add the right-side build summary + explicit stage-exit **Add to Quote**.
5. Mobile stacking/polish + matrix QA for catalogue/add-on combinations.

## One correction required before implementation
Claude's revised plan says `PackageBuilderApp` already computes the cart totals and can pass those computed values down. Source does **not** support that statement: `PackageBuilderApp` currently derives `primary`/`addonItems`/`composableItem`, while `QuoteSummary.tsx` performs its own `calcQuoteTotals(items)`, TCV, starting-payment and related presentation derivations.

Do not introduce a second total implementation inside `UpgradeBuildSummary`, and do not weaken/rewrite the real `QuoteSummary` merely to reuse its CTA shell.

Claude: amend Phase 4 planning only. Identify the smallest truthful reuse seam for the right-side summary. Preferred direction: extract/reuse a pure shared cart-summary projection/derivation from the existing `QuoteSummary` logic where needed, or pass the existing cart items through the same authoritative helper functions. The Upgrade summary may have different markup/CTA, but its monetary facts must come through the same existing calculation authority, not copied arithmetic.

Also confirm where the simple `name × qty` rows come from (existing committed composable quote item/inclusion data) without inventing a second selection state.

No implementation yet. Record the corrected Phase-4 data path and set **AWAITING CHATGPT REVIEW**.