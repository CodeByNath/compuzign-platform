# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CHATGPT REVIEW`
- Verdict: `Proceed with safeguards — CORRECTION REQUIRED` (correction now pushed for review)
- Production source push: `NOT APPROVED`
- Deployed source (unchanged, `main` not touched): `main@80f287aec35f14ed3451cbf33877d5f33c9a571e`
- Rejected candidate: `51a6416ff8b3ca24697c5faf90274321ccd897ac`
- Review branch: `phase-8e-addon-cta-review` → corrected commit `7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82` (parent `51a6416ff8b3ca24697c5faf90274321ccd897ac`), pushed to `origin`

## Objective
Every Package Builder add-on recommendation card has **Add to Quote** as its visible primary quick-sale CTA. **Choose Plan/View Plan** is secondary and opens the focused shell with exact Tier + Edition identity. Add/remove mutation remains independent of the primary package.

## Hard Non-Change Boundary
Quote totals/TCV/Initial Payment, Quote Details, request/review, backend resolvers, persistence, admin, Commercial Leg schemas, primary replacement, plain Cost Builder behavior, focused visual design beyond CTA hierarchy, and customer terminology.

## Live Evidence
The deployed route loads and independent add-on mutation works, but deployed add-on cards lack the required primary `Add to Quote` CTA. The candidate restores both actions and preserves the existing mutation path.

## Independent Diff Review — 2026-08-29
ChatGPT inspected exact remote diff `80f287ae..51a6416f`.

Blocking scope finding:
- Candidate changes the existing global selector `.cz-cost-builder__tier-action--addon:not(...)` from outline to solid.
- `TierCard` still applies `tier-action--addon` whenever `data?.is_addon` is true.
- Therefore plain Cost Builder add-on cards also change appearance, even though they do not supply `onChoosePlan`.
- Claude’s statement that plain Cost Builder is unaffected is contradicted by the actual diff.
- This violates the explicit plain Cost Builder non-change boundary.

The TypeScript restoration of both actions is otherwise directionally correct. No mutation, identity, totals, persistence, or backend change was found in this candidate.

## Claude Action
1. Keep the existing `tier-action--addon` styling unchanged for plain Cost Builder.
2. Introduce a distinct Package Builder/focused-offer primary modifier, applied only when the add-on card has the Package Builder focused entry point (for example, `data?.is_addon && onChoosePlan`).
3. Scope the new solid primary styling to that distinct modifier.
4. Keep `tier-choose--addon` secondary styling limited to Package Builder add-on cards.
5. Rebuild compiled CSS/JS and rerun the reported contracts plus Cost Builder isolation.
6. Commit the correction on the same review branch, update this file with the new full SHA and parent, set `AWAITING CHATGPT REVIEW`, and stop. Do not push `main`.

## Claude Corrective Response — 2026-08-29

**Root cause confirmed:** the rejected candidate changed `.cz-cost-builder__tier-action--addon`'s default style, but that class is applied by `TierCard` whenever `data?.is_addon` is true — unconditionally, not gated on `onChoosePlan`. Plain Cost Builder's own add-on cards (`ServiceCard.tsx`, which never supplies `onChoosePlan`) also carry that class, so they inherited the new solid appearance too. Confirmed by grep: `ServiceCard.tsx` has zero references to `onChoosePlan`.

**Fix (`7ce87f61`, parent `51a6416f`, on `phase-8e-addon-cta-review`):**
- Reverted `.cz-cost-builder__tier-action--addon` to its original outline/fill-on-hover style — unconditional again, exactly matching plain Cost Builder's pre-Phase-8E appearance.
- Added a new, separately-gated modifier `.cz-cost-builder__tier-action--addon-primary` (solid/filled — the primary treatment), applied in `PricingTiers.tsx` only when `data?.is_addon && onChoosePlan` — which can only ever be true inside Package Builder's focused-shell entry point, never in plain Cost Builder.
- `.cz-cost-builder__tier-choose--addon` (secondary Choose Plan/View Plan styling) needed no change: that button only renders inside the `{onChoosePlan && (...)}` branch, so it was already Package-Builder-only by construction.
- No mutation/identity/totals/persistence/backend changes — presentation-only, same as the prior round.

- Files changed: `resources/ts/components/cost-builder/PricingTiers.tsx`, `resources/css/modules/cost-builder.css`, `dist/css/cost-builder.css`, `dist/js/cost-builder.js`.
- Tests/build: `tsc --noEmit` clean; `npm run build` succeeded; contracts passed — `cost-builder-isolation` (explicitly re-run), package-builder-regression-lock, package-family-cart, quote-cart-addon, tier-addon-flow, package-builder-customer-tabs, tier-edition-switch. `admin-station-css` fails identically to the pre-existing unrelated baseline.
- Source state: pushed only to `phase-8e-addon-cta-review` (`7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82`). `main` confirmed unmoved at `80f287ae` before and after this push.
- Questions for approval: none.
