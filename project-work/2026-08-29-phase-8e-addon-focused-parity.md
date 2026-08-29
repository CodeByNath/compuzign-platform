# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `SOURCE PUSH APPROVED`
- Corrective source push: `APPROVED`
- Base: `main@7b4b78608d4a229209a1e9c89116334a1917f4bf`
- Phase 8E pushed: `main@03b692202d52e4713040a36e7c6686fe3e0e5c28`
- Correction committed locally: `80f287ae` (parent `03b69220`)

## Objective
Add-ons must use the same focused-shell experience as primaries, with exact Tier + Edition identity and independent add-on mutation. No parallel Package Builder add-on CTA path.

## Hard Non-Change Boundary
Quote totals/TCV/Initial Payment, `QuoteDetailsOverlay`, Total Commitment tabs, request/review, backend resolvers, WP persistence, admin, Commercial Leg schemas, primary replacement, Cost Builder behavior, focused visual design, customer terminology.

## Phase 8E Implementation
`03b69220` added add-on focused-shell parity using canonical `is_addon`, full quoted add-on items, exact Tier + Edition matching, and existing `itemFor(..., true)` / `onRemoveAddon(tierPlatformId)` mutation paths. Primary mutation and Cost Builder contracts remained unchanged.

## Review 2 Finding
The pushed source still rendered both `Choose Plan/View Plan` and the old direct `Add to Quote/Remove` CTA for Package Builder add-ons, allowing focus bypass.

## Claude Corrective Response
- Added `TierCard.hideDirectAction?: boolean`, default `false`.
- `renderAddonTierCard()` passes `hideDirectAction={!!onChoosePlan}`.
- Package Builder add-ons therefore expose only `Choose Plan/View Plan`; add/remove/switch occurs inside focus.
- Normal Tier cards are unchanged.
- Cost Builder add-on cards remain unchanged because Cost Builder does not supply `onChoosePlan`.
- Files changed: `PricingTiers.tsx`, compiled `dist/js/cost-builder.js`.
- Reported validation clean: `tsc --noEmit`, `npm run build`, package-builder-regression-lock, cost-builder-isolation, package-family-cart, quote-cart-addon, tier-addon-flow, package-builder-customer-tabs, tier-edition-switch.
- Corrective commit is local only: `80f287ae`; not yet pushed.

## Review 3 — 2026-08-29
Verdict: `Proceed with safeguards`.

The corrective design directly addresses the single blocking defect and remains inside scope. Because `80f287ae` is local-only, ChatGPT cannot independently inspect its diff yet.

**Claude action:** push only corrective commit `80f287ae` to `main`, then update this same file with the exact resulting `main` SHA plus workflow/deployment evidence, set status `AWAITING CHATGPT REVIEW`, and stop. No additional source changes are approved.

## Live Browser Validation
Pending until the corrective commit is pushed/deployed. No live pass claimed yet.
