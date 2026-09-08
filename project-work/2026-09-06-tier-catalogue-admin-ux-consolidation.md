# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — candidate `1e26c74f` rejected after source audit**
- Auditor verdict: **Stop — architectural risk**.
- Production `main`: `28b6859c1efab5044ac761f360852a19988de7b2` (rollback, deploy #978 Success).
- Candidate `1e26c74f` is **SOURCE PUSH NOT APPROVED**.

## What is right in this candidate
Keep the presentation direction:
- Upgrade Your Build CTA is inside the existing Recommendations shell;
- selected primary Tier remains visible;
- pending CTA hides Add-ons + Cart;
- Browse Catalogue renders inside `.cz-package-builder__focused`;
- composable catalogue/summary components are reused rather than rewritten.

## Three release blockers found in actual source

### 1. Composable Edition cue is not connected to the composable resolver
`FamilyTierAdapter` changes `composableEditionId`, but `ComposableOfferBrowser` receives no Edition id at all. It still reads only `family.pricing.composable_offer` Default. `buildComposableFamilyTierQuoteItem()` still hardcodes:
- `tierEditionPlatformId: null`
- `tierEditionTitle: null`

So clicking a composable Edition changes the heading/cue but not the catalogue policy, pricing/legs, server preview, or quote identity. This is a false UI state.

### 2. Add to Quote is still only a dismiss button
`UpgradeBuildSummary` explicitly says “Stage-control only” and only calls `onExit`. It does not perform the required composable commit-and-return behavior. Nath’s direct rule is: Add to Quote in the composable focused view must commit the current Build Your Own selection and then rejoin the same staged Tier + Recommendations + Cart outcome a normal Tier commit lands in. Do not rely on “it may already have auto-synced” as a substitute for that action.

### 3. Catalogue-only Family cannot show the CTA
`commitSelection()` still does:
`setStagedTierId(addonTiers.length > 0 ? tierId : null)`.
Therefore a Family with a composable catalogue but zero add-on Tiers never reaches the staged branch where `recommendationsCta` lives, despite `PricingTiers` now supporting CTA-only Recommendations.

## Claude — narrow correction
Correct only these three blockers on a clean candidate from current `main`.

### Must preserve
- CTA inside existing Recommendations shell;
- selected primary Tier visible;
- pending CTA hides Add-ons + Cart;
- Browse Catalogue uses the existing focused-shell layout;
- existing server preview remains pricing authority;
- existing catalogue filters/Add/Remove/quantity behavior;
- no standalone Build Your Own route/card.

### Must fix
1. Route composable Default/Edition selection through the existing server preview/resolver and carry the resolved Edition Platform ID/title into the quote item.
2. Make focused **Add to Quote** the authoritative customer action that commits the current composable selection, then exits to the normal staged view. Do not create a second pricing engine; reuse the existing preview result/commit authority.
3. Stage the selected primary whenever **either** add-ons exist **or** a composable catalogue exists, so CTA-only Recommendations works.

### Must not substitute
- no cosmetic-only Edition selector;
- no Add-to-Quote that merely dismisses;
- no new route, gate panel, focused wrapper, pricing/store engine, or extra customer step.

Return one clean candidate from `28b6859c...`, exact SHA/files/evidence, **AWAITING CHATGPT REVIEW**. Do not push to `main`.