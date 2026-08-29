# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CHATGPT REVIEW`
- Corrective source push: `NOT APPROVED` (implemented and committed locally on `main`, not pushed)
- Base: `main@7b4b78608d4a229209a1e9c89116334a1917f4bf`
- Phase 8E pushed: `main@03b692202d52e4713040a36e7c6686fe3e0e5c28`
- Correction committed locally (unpushed): `main@80f287ae` (parent `03b69220`)

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

### 2026-08-29 — Claude corrective response

**Root cause confirmed:** `renderAddonTierCard()` added `onChoosePlan` (Phase 8E) but kept the pre-existing unconditional `onClick -> onToggleAddon` button rendering alongside it — `TierCard` has no gate between the two, so both showed at once for any add-on offered inside Package Builder.

**Fix:** added `TierCard`'s `hideDirectAction?: boolean` prop (default `false`). When `true`, the direct Add to Quote/✓ Added/Remove button is not rendered at all — only the Choose Plan/View Plan button (into the focused shell) remains clickable. `renderAddonTierCard()` now passes `hideDirectAction={!!onChoosePlan}`. Every other caller is unaffected: normal Tier cards never pass this prop (still both buttons, unchanged, out of scope per "do not redesign the shell"); Cost Builder's own add-on cards (`ServiceCard.tsx`) never supply `onChoosePlan` in the first place, so `hideDirectAction` is always `false` there and their single toggle button is untouched — confirmed by grep, `<PricingTiers>` has exactly 3 callers repo-wide (`ServiceCard.tsx`, and `FamilyTierAdapter.tsx`'s two Package Builder views) and only the latter ever supplies `onChoosePlan`.

Net effect: an add-on offered inside Package Builder now has exactly one clickable action (Choose Plan/View Plan), which opens the focused shell; add/remove/switch happens only through the existing independent add-on mutation path already wired inside focus from the prior Phase 8E commit (`itemFor(..., true)` / `onRemoveAddon(tierPlatformId)`) — unchanged by this correction.

- Files changed: `resources/ts/components/cost-builder/PricingTiers.tsx`, `dist/js/cost-builder.js`.
- Tests/build: `tsc --noEmit` clean; `npm run build` succeeded; contracts passed — package-builder-regression-lock, cost-builder-isolation, package-family-cart, quote-cart-addon, tier-addon-flow, package-builder-customer-tabs, tier-edition-switch.
- Source state: corrective fix committed **locally only** on `main` as `80f287ae` (parent `03b69220`), **not pushed** to `origin/main`. Not committed to `Project-work-instructions` (only this report file is pushed here).
- Questions for approval: none.

## Live Browser Validation
- Status: BLOCKED/PENDING.
- `https://compuzign.weerax.com/pricing/` is not fetchable from ChatGPT's current web environment (`Cache miss`), so no live pass is claimed.
