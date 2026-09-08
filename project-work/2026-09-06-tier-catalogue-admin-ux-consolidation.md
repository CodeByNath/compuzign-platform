# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- Production `main`: `28b6859c1efab5044ac761f360852a19988de7b2` (rollback, deploy #978 Success) — unchanged, this candidate is NOT pushed to `main`.
- New candidate: `review/upgrade-shell-visual-parity` @ `e17f6892` — one clean commit on top of current `main`, superseding `1e26c74f`.

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

## Done — evidence for `e17f6892`

### 1. Composable Edition cue now drives real resolution
- `PackageRepository::resolveComposableOfferSelection(string $familyId, array $rawChoice, ?string $editionId = null)` — a non-empty `$editionId` is matched against the occupant's own ACTIVE `tier_editions` only; a match with its own `customer_policy` overlays it onto the container before the existing (unmodified) `PackageManagerSchema::resolveCustomerComposableSelection()` call; an id matching no active Edition fails closed (`not_found`) rather than silently falling back to Default.
- `POST /package-builder/composable-preview` now registers an optional `edition_id` arg; the controller sanitizes and threads it through.
- Frontend: `resolveComposablePreview(familyId, choice, editionId)` includes `edition_id` in the request only when non-null. `resolveComposableEligibleRows(family, editionId)` resolves the CATALOGUE ROWS shown from that same Edition's own `customer_policy` (identical inherit-when-absent rule as the backend) — so what the customer sees can never disagree with what the resolver prices.
- `ComposableOfferBrowser` gained a required `activeEditionId` prop, wired from `FamilyTierAdapter`'s `composableEditionId`; its `rows`, reseed effect, and debounced preview/auto-commit effect are all keyed on it.
- `buildComposableFamilyTierQuoteItem(..., activeEdition)` now sets `tierEditionPlatformId`/`tierEditionTitle` from the resolved Edition's real fields — no hardcoded `null` remains.
- No second pricing/resolver engine: the same `resolveCustomerComposableSelection()` call, the same debounced auto-sync commit path.
- Locked by new `scripts/composable-edition-resolution-contract.ts` (source-scan, both PHP and TS sides).

### 2. Catalogue-only Families now stage
`commitSelection()`: `setStagedTierId(addonTiers.length > 0 || hasCatalogue ? tierId : null)` — `hasCatalogue` (the same `resolveComposableEligibleRows(family).length > 0` check already used for the gate) now also drives staging. Locked as property 9 of `composable-recommendations-cta-contract.ts`.

### Validation
`tsc --noEmit` clean, `npm run build` clean, `npm run docs:check` clean, 75/78 registered contracts pass (`admin-station-css`, `package-builder-flow`, `platform-identity-schema` fail — same 3 pre-existing/unrelated failures identified in the prior baseline round), PHP suite: same 7 pre-existing environment-only failures as always in this shell (no WP bootstrap). `composable-customer-ux-preview.php`, `composable-customer-policy-resolver.php`, and `tier-composable-occupant.php` — the three most directly relevant PHP tests — all pass explicitly. Full diff from current `main`: 17 files, +739/-826.