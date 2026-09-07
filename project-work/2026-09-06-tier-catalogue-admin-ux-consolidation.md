# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CLAUDE RESPONSE — revise plan only, no source edits**
- Production `main`: `bd0a48d8be81c591e48ebe220dda21645b349089`; deploy #970 succeeded.
- Auditor verdict on Claude's first plan: **Proceed with safeguards** — component mapping is sound, but two continuation assumptions must be corrected before implementation.

## Locked customer flow
The primary Tier/Edition is already in the quote before this stage. This work rearranges existing UI/state only: no second cart, temporary build, new commit model, duplicate pricing, or duplicate totals authority.

1. Existing focused Tier -> Add to Quote.
2. If this Tier/Family has a real Upgrade Your Build catalogue, hide normal Cart + Recommended Add-ons and show an **Upgrade your build** gate in the existing recommendation-stage shell.
3. Gate actions:
   - **Browse Catalogue** -> existing `ComposableOfferBrowser` inside the focused Tier shell.
   - **Maybe next time** -> end the gate; resume existing Recommended Add-ons if present, otherwise Cart.
4. Catalogue left side remains the existing filters, featured/default-selection, quantity, max-6/paging behavior.
5. Catalogue right side is a simple hydrated view of existing quote/cart state: quoted Tier/Edition + upgrade inclusion rows as `name × qty` + the same cart-derived totals.
6. Normal Cart remains hidden while browsing.
7. Right-side **Add to Quote** is the deliberate stage-exit CTA. Because `ComposableOfferBrowser` already auto-syncs successful customer changes into the quote, this CTA must **not create/commit another quote mutation**. It simply ends the Upgrade gate and resumes Recommended Add-ons -> Cart, or Cart directly when no add-ons exist.

## Independent source findings
- `FamilyTierAdapter.commitSelection()` already owns post-primary Add-to-Quote staging.
- `ComposableOfferBrowser` currently auto-commits after customer interaction + successful debounced preview; there is no literal Add-to-Quote button in that component today.
- Therefore Claude's proposed "clear the gate from onComposableCommit" is **rejected**: it would close browsing after the first successful inclusion change, before the customer deliberately finishes.
- `PackageBuilderApp` owns Cart/MobileQuoteBar visibility and already derives `primary`, `composableItem`, and quote/cart totals authority.
- The current browser returns `null` when no composable offer/policy/rows exist, so the new gate must not become a blocker for a Tier with no real catalogue. Reuse/extract the same eligibility truth; do not invent a second business rule.

## Must preserve / remove / not substitute
**Must preserve:** existing composable auto-sync semantics; existing Recommendation/Add-on behavior after the gate; existing cart/quote data authority; catalogue filters/paging/selection behavior.

**Must remove from plan:** gate-ending behavior on `onComposableCommit`.

**Must not substitute:** no separate staging cart, explicit re-commit model, second pricing calculation, or auto-close-on-first-selection behavior.

## Claude — revise plan only
Return a corrected phase plan in this file, no source edits yet. It must:
- identify the exact existing eligibility derivation to reuse/extract so the gate only appears when a real catalogue exists;
- keep auto-commit active during browsing without ending the gate;
- place a new **presentational/stage-control** `Add to Quote` CTA in the right-side build summary whose only new responsibility is `setUpgradeGate(null)` / equivalent continuation;
- state what existing QuoteSummary/cart presentation primitives can be reused vs what minimal new presentational component is justified, without duplicating calculation logic;
- phase the work into small independently reviewable/live-testable steps, including mobile stacking.

Set **AWAITING CHATGPT REVIEW** when the corrected plan is recorded.