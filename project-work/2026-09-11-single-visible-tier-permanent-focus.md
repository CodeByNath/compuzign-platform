# Single Visible Tier Permanent Focus + Recommendation Polish

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f`.
- Previous lone-in-active-group fix is deployed and remains accepted. Do not reopen it unless these changes prove a real regression.

## Nath's live follow-up
Use the attached live reference as the target presentation for the compact Recommendations / Upgrade CTA area. Nath temporarily proved the layout with ad-hoc CSS; implement it properly using the existing CompuZign design tokens, spacing/radius/type/button primitives and owning CSS file. Do not paste the temporary declarations blindly where a token/shared class already exists.

### 1. Compact Recommendations shell
For `.cz-cost-builder__recommendations-shell--compact` achieve the demonstrated result:
- centered compact content;
- vertically and horizontally centered;
- content-sized height rather than a tall empty panel;
- generous token-based padding approximately matching the demonstrated 44px intent;
- headings/copy occupy the available row width and are centered;
- add a little extra vertical separation below the `Upgrade your build` heading.

Keep responsive behavior sound; no fixed height.

### 2. `Maybe next time` secondary button
`Browse Catalogue` remains the primary filled action.

`Maybe next time` must use the platform's existing **secondary Tier choose** button treatment (`.cz-cost-builder__tier-choose` / its established equivalent), not a bespoke copied border/button declaration. Reuse the actual shared class/style contract so hover/focus/disabled behavior stays consistent.

### 3. Recommendation chevrons
Hide the top recommendation carousel chevrons when there is **nothing to scroll to**. Their visibility must derive from actual overflow/available recommendation destinations, not Family names or CSS-only hiding. If content later becomes scrollable, controls must appear normally.

### 4. Gap before compact Add-on/Recommendations shell
Increase the spacing between the selected Tier card and the compact Add-on/Recommendations shell to match the live reference. Use the existing spacing tokens/layout owner; do not add arbitrary margins to individual cards if the parent grid/gap owns this relationship.

### 5. Refresh must not kill Upgrade CTA
Live defect: after Add to Quote produces the pending `Upgrade your build` CTA, a page refresh can restore the quoted/staged Tier but lose the CTA.

Current source seeds `stagedTierId` from `selectedTierId`, while `upgradeGateTierId` / `upgradeGateStage` start null. Fix mount/reload parity using the same authoritative facts already used for Upgrade eligibility. If a restored quoted primary has an eligible Upgrade catalogue and no committed composable line, the pending CTA must be restored. `Maybe next time` remains an in-session dismissal; do not invent persistent browser storage or a second eligibility rule.

## Must preserve
Lone-group no-X/tabs behavior; selected Tier/Add-on identity; Upgrade Browse Catalogue flow; Maybe next time semantics; Cart suppression while Upgrade CTA/browsing is active; Add-on + Cart behavior once Upgrade is skipped; quote/composable mutation; pricing/Legs; responsive layout.

## Must not substitute
No Family/Tier hardcoding. No inline styles. No copied duplicate button system. No fixed-height shell. No always-hidden chevrons. No localStorage/sessionStorage navigation persistence.

## Claude
Audit the current owners first (`FamilyTierAdapter.tsx`, `PricingTiers.tsx`, `resources/css/modules/cost-builder.css`, relevant Upgrade/navigation regressions and Code Maps), then implement this as one narrow follow-up on a clean review branch from current `main`.

Add mounted regression coverage for CTA reload parity and chevron visibility logic where practical; preserve existing Upgrade/Cart/Add-on regressions. Run focused tests, TypeScript/build/docs, record exact SHA/tree/files/evidence here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.

## Claude round 1 — candidate ready

Branch `feat/single-visible-tier-focus-polish`, from `main` `7ffd3e4b`.
Head `3ad0b2c51492e39d7d40035eeece534b5cd497c9`, tree
`f615abe4fc0d1e7c4255b4a447f35d745648bf5c`. `main` untouched.

### Files
`resources/ts/components/package-builder/FamilyTierAdapter.tsx`,
`resources/ts/components/cost-builder/PricingTiers.tsx`,
`resources/css/modules/cost-builder.css`,
`scripts/tier-next-step-navigation-regression.mjs`,
`scripts/composable-recommendations-cta-contract.ts`,
`docs/code-map/package-builder-tier-navigation.md`, rebuilt `dist/`.

### How each item was met
1. `--compact` centres on both axes with `justify-content` + `text-align`
   (deliberately not `align-items`, so headings/copy still occupy the full
   row width), `padding: var(--cz-space-10)`, no height introduced.
   Heading gains `margin: 0 0 var(--cz-space-2)`.
2. `Maybe next time` now carries `.cz-cost-builder__tier-choose`, the shared
   secondary treatment; the compact row's `width: auto` override was extended
   to cover both button classes. `Browse Catalogue` unchanged.
3. `useTrackOverflow()` in `PricingTiers.tsx` measures `scrollWidth` vs
   `clientWidth` (1px rounding tolerance, feature-detected `ResizeObserver`,
   the DrawerGroupTabs precedent). The nav row is now rendered only when that
   is true. The 768-1023px band and the 1024px "Sidebar Breakpoint Fix" media
   queries are deleted — real measurement covers both.
4. `.cz-cost-builder__tiers--cta-only { column-gap: var(--cz-space-6); }`,
   applied by `PricingTiers` from its own `isRecommendationsCtaOnly`. Set on
   the strip grid that owns every gap there; no child margins.
5. `upgradeGateTierId`/`upgradeGateStage` seed at mount from restored primary
   + `resolveComposableEligibleRows(family)` + no committed composable line.
   `useState` initializers only, no storage, so `Maybe next time` stays an
   in-session dismissal. **Root cause found beyond the brief:** the
   Family-switch reset effect is dep-keyed and therefore also fires on the
   first commit, wiping any seed. Only the gate reset is now mount-guarded
   (`hasRenderedAFamily`); every other value it clears initialises to null,
   so its mount run was always a no-op for them.

### Validation
`npx tsc --noEmit`, `npm run build`, `npm run docs:check` clean.
`regression:tier-next-step-navigation` 93 checks (was 78) — adds mounted
restored-cart CTA parity, the committed-composable case that must NOT offer a
fresh CTA, and chevron overflow in both directions plus the sub-pixel case.
Also green: `composable-recommendations-cta`, `cost-builder-isolation`,
`package-builder-regression-lock`, `package-builder-addon-focus`,
`package-builder-customer-tabs`, `manage-build`, `upgrade-build-footer`,
`tier-addon-flow`, `tier-edition-switch`, `quote-sidebar-scroll`,
`regression:single-occupant-quoted-focus`,
`regression:cart-bundle-upgrade-refinements`,
`regression:cart-initial-payment-addons`,
`regression:family-tier-membership-boundary`.

**Pre-existing failures, verified identical on clean `main` and untouched by
this work:** `contract:package-builder-flow` (ENOENT on a deleted
`FullBuildDetail.tsx`), `regression:composable-quote-cart-loop`,
`contract:admin-station-css` (unused rate-sheet import-group rules).

### Notes for the auditor
- The live reference image was not in the branch, so the two size choices are
  rounded to the nearest tokens and are one-line retunes: compact padding
  `--cz-space-10` (40px) for the demonstrated ~44px intent, and CTA-only
  column gap `--cz-space-6` (24px, double the strip's own). Say the word if
  either should step up.
- No contract assertion was rewritten. The mount guard was restructured so
  the reset effect still opens with `setFocusedTierId(null)`, which
  `composable-recommendations-cta-contract.ts` locks.
- Not verified live — no WordPress environment here.
