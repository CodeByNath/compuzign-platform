# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `READY FOR CLAUDE`
- Source push: `NOT APPROVED`
- Base: `main@7b4b78608d4a229209a1e9c89116334a1917f4bf` (add tabbed quote details overlay)
- Instruction recorded: 2026-08-29

## Background
Live Phase 8D audit found a real defect: an ongoing add-on (KAIROS `Backup & DR Shield`, $580/mo) was excluded from Initial Payment, Contract Value, Total Commitment, and Plan Details — a mixed finite+ongoing cart wrongly showed a finite TCV instead of `Ongoing`. That defect is evidence, not the fix target: Quote Summary totals and Quote Details math are out of scope here. The root cause it exposes: `is_addon` is a commercial-role flag only — an add-on is a real Tier occupant with full Commercial Leg/Edition capability, but the frontend currently treats it as second-class (bypasses focus entirely via `onToggleAddon()`).

## Objective
Give add-on occupants the same full focused-shell experience primaries already get (Choose Plan-style focus entry, Edition switching, Plan Details, exact quoted identity), reusing all existing paths — no parallel add-on UI, no second resolver. The only required difference stays quote mutation: a primary replaces/removes the family's primary selection; an add-on independently upserts/removes only itself, never touching the primary.

## Required Behavior
1. Add-on cards get the same focused-shell entry as other occupants (currently `PricingTiers.renderAddonTierCard()` doesn't pass `onChoosePlan`; add-ons bypass focus via `onToggleAddon()` directly).
2. Opening an add-on in focus must never mutate the quote.
3. Reuse the shared `TierCard`, wording, `resolveEffectiveTierDisplay()`, `periodsForVariant()`, existing Commercial Leg presentation helpers, existing Plan Details, and `itemFor()`'s existing payment-summary construction — no simplified/duplicate add-on path.
4. Determine add-on status from canonical Tier pricing data (`is_addon`), never card position/label/index.
5. Render the full existing focused experience (Overview, Edition cue, Commercial Terms, Upfront, Commitment, every resolved Period/Leg component, inclusions, Bundles, Extensions, Leg-to-inclusion interaction, View/Full Plan Details) for an add-on exactly as for a primary.
6. Carry exact quoted add-on identity including Edition Platform ID — `PackageBuilderApp` currently only supplies `selectedAddonTierIds: TierId[]`, which cannot represent an add-on's exact quoted Edition; this must be extended, not worked around.
7. Adding a focused add-on Default/Edition creates `itemFor(..., true)` via the existing independent add-on upsert path; removal uses the add-on's stable Tier Platform ID and affects only that add-on; switching Edition A→B replaces only that same add-on.
8. Closing/completing a focused add-on selection returns to the selected-primary staged view with Recommendations.
9. Primary occupant behavior and Cost Builder behavior are unchanged.

## Exact Selected-State Rules
- Quoted Default + focused Default → Selected
- Quoted Edition A + focused Edition A → Selected
- Quoted Edition A + focused Default → Not selected
- Quoted Edition A + focused Edition B → Not selected

## Hard Non-Change Boundary
Quote Summary totals, Total Contract Value, Initial Payment, `QuoteDetailsOverlay`, Total Commitment tabs, request/review flow, backend resolvers, WordPress persistence, admin behavior, Commercial Leg schemas, primary replacement behavior, Cost Builder behavior, existing focused visual design, customer terminology.

## Acceptance Tests
1–3: Unquoted add-on opens full focus with no cart mutation; adding from focus adds one `isAddon: true` item; primary stays unchanged.
4–6: A quoted add-on reopens on its exact Default/Edition, shows selected state there only, and removing it affects only that add-on.
7–10: Add-on Editions use the normal cue/focused experience; the real Edition Platform ID reaches the quote; changing Edition replaces only that add-on; multiple add-ons stay independently selectable.
11–14: Add-on Legs/Periods/inclusions/Plan Details use normal occupant paths; closing focus returns to primary staged view + Recommendations; primary and Cost Builder behavior unchanged.
15–16: Relevant contracts pass; production frontend build passes.

## Claude Report
(pending)

## Review Rounds
(none yet)

## Production Push Record
- Status: NOT PUSHED

## Live Browser Validation
- Status: NOT STARTED
