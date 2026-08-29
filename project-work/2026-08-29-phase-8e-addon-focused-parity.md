# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CHATGPT REVIEW`
- Source push: `PUSHED`
- Base: `main@7b4b78608d4a229209a1e9c89116334a1917f4bf`
- Implemented locally: 2026-08-29
- Pushed to main: 2026-08-29

## Objective
Give add-on occupants the same full focused-shell experience primaries already get, reusing existing occupant/Edition/Commercial Leg/Plan Details paths. Add-ons remain independent quote items and must never replace/remove the family primary.

## Required Behavior
1. Add-on cards enter the normal focused shell without mutating the quote.
2. Reuse shared `TierCard`, `resolveEffectiveTierDisplay()`, `periodsForVariant()`, Commercial Leg presentation, Plan Details, and `itemFor()`; no parallel add-on UI/resolver.
3. Determine add-on role from canonical `is_addon` pricing data.
4. Carry exact quoted add-on identity including Edition Platform ID.
5. Add focused Default/Edition with `itemFor(..., true)` through the existing add-on upsert path.
6. Remove/switch only that add-on by stable Tier Platform ID; primary remains untouched.
7. Closing/completing returns to selected-primary staged view + Recommendations.
8. Primary and Cost Builder behavior remain unchanged.

## Hard Non-Change Boundary
Quote Summary totals, Total Contract Value, Initial Payment, `QuoteDetailsOverlay`, Total Commitment tabs, request/review flow, backend resolvers, WordPress persistence, admin behavior, Commercial Leg schemas, primary replacement behavior, Cost Builder behavior, focused visual design, customer terminology.

## Acceptance Intent
Unquoted add-on opens focus with no mutation; add/remove/switch is independent; exact Default/Edition selected state is preserved; multiple add-ons remain independent; normal Legs/Periods/inclusions/Plan Details paths are used; primary and Cost Builder behavior remain unchanged; relevant contracts and production frontend build pass.

## Claude Report
- Root cause: `renderAddonTierCard()` lacked `onChoosePlan`; `PackageBuilderApp` exposed only Tier-level selected add-on IDs.
- Files changed locally: `FamilyTierAdapter.tsx`, `PricingTiers.tsx`, `PackageBuilderApp.tsx`, `dist/js/cost-builder.js`.
- Add-ons now enter the same focused shell as primaries.
- `selectedAddonItems: FamilyTierQuoteItem[]` carries Tier + Edition identity; Tier IDs are derived locally for existing Tier-level UI behavior.
- Exact selected state branches on canonical `focusedData?.is_addon` and matches Tier + Edition identity.
- Add-on mutation calls existing `onAdd(itemFor(..., true))` / `onRemoveAddon(tierPlatformId)` paths; primary mutation path remains unchanged.
- Cost Builder callers/contracts remain unchanged.
- Validation reported clean: `tsc --noEmit`, `npm run build`, package-builder-regression-lock, cost-builder-isolation, package-family-cart, quote-cart-addon, tier-addon-flow, package-builder-customer-tabs, tier-edition-switch.
- Source remained local/uncommitted at report time; live browser validation not yet performed.

## Review Rounds
### 2026-08-29 — ChatGPT Review 1
- Verdict: `Proceed with safeguards`.
- Nath explicitly approves source push for this completed Phase 8E implementation.
- Claude may now commit and push only the reported Phase 8E source changes to `main`.
- After push, record the exact production commit SHA and deployment/workflow evidence here, set status `AWAITING CHATGPT REVIEW`, and stop.
- Independent source-diff audit and live validation remain required after the pushed commit is visible. Approval to push is not final acceptance/closure.

## Production Push Record
- Status: PUSHED
- Pushed by: Claude Code
- Pushed at: 2026-08-29
- Full `main` commit SHA: `03b692202d52e4713040a36e7c6686fe3e0e5c28`
- Complete commit message: "add-on focused occupant parity" (full body: focused-shell parity for add-on Tier occupants, reusing existing occupant/Edition/Commercial Leg/Plan Details/`itemFor()`/`onRemoveAddon()` paths; `FamilyTierAdapter` now receives `selectedAddonItems: FamilyTierQuoteItem[]` instead of bare tierIds so exact-match/selected-state logic works the same way it already does for the primary; Cost Builder's own `PricingTiersProps` contract/callers unchanged)
- Files included: `wp-content/plugins/compuzign-platform/resources/ts/components/cost-builder/PricingTiers.tsx`, `.../package-builder/FamilyTierAdapter.tsx`, `.../package-builder/PackageBuilderApp.tsx`, `.../dist/js/cost-builder.js`
- Push comments: pushed directly to `main` (previous tip `7b4b7860`, now `03b69220`) — fast-forward, no merge. `dist/css/cost-builder.css` was NOT touched this phase (no new CSS, only existing classes reused), matching the reported diff.
- GitHub Actions run: not independently checked from this environment (no `gh` CLI/browser access here) — Nath/ChatGPT should confirm the workflow result on GitHub.
- Workflow result: unknown from this environment, pending confirmation.
- Deployment result: unknown from this environment, pending confirmation.

## Live Browser Validation
- Status: NOT STARTED
