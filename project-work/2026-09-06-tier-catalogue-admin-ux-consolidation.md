# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — resume from `1e26c74f` direction with two narrow corrections**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `28b6859c1efab5044ac761f360852a19988de7b2` (rollback, deploy #978 Success).
- Candidate `1e26c74f` remains **SOURCE PUSH NOT APPROVED** pending correction/review.

## Important correction to prior audit
Withdraw the previous instruction that focused **Add to Quote** must become a new composable commit/mutation authority.

That was wrong. `ComposableOfferBrowser` already owns the existing server-preview/auto-sync quote mutation path. Do **not** create a second commit path.

Required behavior:
- catalogue Add/Remove/quantity changes continue through the existing server preview/auto-sync authority;
- **Add to Quote** in the right-side Your Build summary is the stage-exit action once the current build state is already synchronized;
- it returns to the normal staged Tier + Recommendations + Cart view;
- no second pricing, resolver, or mutation engine is introduced.

## Keep from `1e26c74f`
- Upgrade Your Build CTA inside the existing Recommendations shell;
- selected primary Tier remains visible;
- pending CTA hides Add-ons + Cart;
- Browse Catalogue renders inside `.cz-package-builder__focused`;
- `ComposableOfferBrowser` and `UpgradeBuildSummary` reused rather than rewritten;
- no standalone Build Your Own route/card.

## Two narrow corrections still required

### 1. Composable Edition cue must drive real Edition resolution
Current candidate changes `composableEditionId`, but `ComposableOfferBrowser` receives no Edition identity and still resolves only the base `composable_offer` Default. Quote construction still hardcodes `tierEditionPlatformId: null` / `tierEditionTitle: null`.

Wire the selected composable Default/Edition into the **existing** composable server preview/resolver and carry the resolved Edition Platform ID/title into the quote item. Do not create parallel pricing logic.

### 2. CTA-only Recommendations must still stage
`commitSelection()` currently stages only when `addonTiers.length > 0`. A Family with a composable catalogue but zero add-on Tiers therefore cannot reach the Recommendations CTA.

Stage the selected primary when **either** add-ons exist **or** the composable catalogue is eligible.

## Must preserve
- current server-preview/auto-sync mutation authority;
- Add to Quote remains exit/return behavior, not a second mutation path;
- existing filters/Add/Remove/quantity behavior;
- same focused-shell layout;
- primary Tier untouched;
- CTA-in-Recommendations design.

## Must not substitute
- no cosmetic-only Edition selector;
- no new route/gate panel/focused wrapper;
- no second quote commit path;
- no new pricing/store/resolver engine;
- no extra customer step.

Prepare one corrected clean candidate from current `main`, report exact SHA/files/evidence, set **AWAITING CHATGPT REVIEW**, and do not push to `main`.