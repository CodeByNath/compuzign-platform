# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CLAUDE RESPONSE`
- Corrective source push: `NOT APPROVED`
- Base: `main@7b4b78608d4a229209a1e9c89116334a1917f4bf`
- Phase 8E pushed: `main@03b692202d52e4713040a36e7c6686fe3e0e5c28`

## Objective
Give add-on occupants the same full focused-shell experience as primaries, reusing existing occupant/Edition/Commercial Leg/Plan Details paths. Add-ons remain independent quote items and never replace/remove the family primary.

## Required Behavior
1. Add-on cards enter the normal focused shell without mutating the quote.
2. Reuse shared `TierCard`, `resolveEffectiveTierDisplay()`, `periodsForVariant()`, Commercial Leg presentation, Plan Details, and `itemFor()`; no parallel add-on UI/resolver/CTA path.
3. Determine add-on role from canonical `is_addon` data.
4. Carry exact quoted add-on identity including Edition Platform ID.
5. Add/remove/switch only that add-on through existing independent add-on mutation paths.
6. Closing/completing returns to selected-primary staged view + Recommendations.
7. Primary and Cost Builder behavior remain unchanged.

## Hard Non-Change Boundary
Quote Summary totals, TCV, Initial Payment, `QuoteDetailsOverlay`, Total Commitment tabs, request/review, backend resolvers, WP persistence, admin, Commercial Leg schemas, primary replacement, Cost Builder, focused visual design, customer terminology.

## Claude Report
Changed `PricingTiers.tsx`, `FamilyTierAdapter.tsx`, `PackageBuilderApp.tsx`, compiled `dist/js/cost-builder.js`. Full quoted add-on items now carry Tier + Edition identity into the focused shell. Focused add-on mutation uses existing `itemFor(..., true)` / `onRemoveAddon(tierPlatformId)` paths. Reported `tsc --noEmit`, production build, and relevant contracts clean.

## Production Push Record
- Pushed directly to `main`: `03b692202d52e4713040a36e7c6686fe3e0e5c28`
- Fast-forward from `7b4b7860`.
- GitHub combined-status endpoint currently exposes no status checks for this commit.

## Review Rounds
### 2026-08-29 — Review 1
Verdict: `Proceed with safeguards`; Nath approved initial Phase 8E source push so the actual diff could be audited.

### 2026-08-29 — Review 2 — pushed diff audit
Verdict: `Stop — architectural/customer-flow mismatch`.

The exact identity/mutation implementation is structurally aligned: canonical `is_addon`, Tier+Edition matching, existing add-on upsert/remove, primary path preserved.

**Blocking defect:** `PricingTiers.renderAddonTierCard()` now passes `onChoosePlan` while retaining the old direct `onClick -> onToggleAddon` action. `TierCard` therefore renders both `Choose Plan/View Plan` and `Add to Quote/Remove` for an add-on. Source comments explicitly say the quick toggle is intentionally preserved. That creates two customer mutation/entry paths and violates this phase's requirement for normal focused-shell parity with no parallel add-on CTA path. The add-on can still bypass focus and mutate directly.

**Claude action:** make the Package Builder add-on customer path use the same single focused-shell route as normal occupants. Preserve plain Cost Builder behavior and existing independent add-on mutation inside the focused shell. Do not redesign the shell or touch totals/TCV/overlay. Update the same work file with the exact corrective diff, tests, and source state; do not push corrective source until approved.

## Live Browser Validation
- Status: BLOCKED/PENDING.
- `https://compuzign.weerax.com/pricing/` is not fetchable from ChatGPT's current web environment (`Cache miss`), so no live pass is claimed.
