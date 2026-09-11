# Single Visible Tier Permanent Focus + Recommendation Polish

## Status
- **READY FOR CLAUDE**
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
