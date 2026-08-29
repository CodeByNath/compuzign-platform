# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `READY FOR CLAUDE`
- Verdict: `Proceed with safeguards — LIVE CORRECTIONS REQUIRED`
- Production checked: `main@7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82`
- Deployment: run `33242742531`, attempt 1, `SUCCESS`
- Source push: `NOT APPROVED`

## Objective
Package Builder add-on recommendation cards must expose both actions without changing add-on identity/mutation semantics:
- **Add to Quote** — primary quick-sale CTA
- **Choose Plan/View Plan** — secondary route into the focused Tier/Edition shell

## Live Validation — 2026-08-29
Customer-facing production screenshots show two remaining UI defects.

1. **Recommendation CTA order is wrong.** The add-on card currently renders the secondary **Choose Plan** above the solid primary **Add to Quote**. Swap the render order so **Add to Quote is above** and **Choose Plan/View Plan is below**. Preserve current styling/hover/selected/remove behavior; this correction is ordering only.

2. **Quoted add-ons have no cart “View Plan” route.** `QuoteSummary.tsx` currently only renders its per-item `View details` affordance for `family_tier && !item.isAddon`, intentionally excluding add-ons. That is not the requested behavior. A quoted add-on must expose **View Plan** in its own cart row and route to that exact quoted add-on Tier/Edition in the existing focused shell.

## Safeguard / Non-change Boundary
- Do **not** repurpose the Phase 8D **View details** overlay as the add-on route unless source proves it is the canonical focused-shell path. The requested action is **View Plan**, meaning return/open the existing focused Tier/Edition experience for the exact quoted add-on identity.
- Preserve primary-family cart behavior, cart removal, quote capture, add-on independent mutation, exact Tier + Edition identity, totals/TCV, and plain Cost Builder isolation.
- Do not redesign quote architecture or move pricing authority.

## Claude Next Action
Implement only these two corrections locally. Reuse the existing `FamilyTierAdapter` focused-shell `selectVariant(tierId, editionId)` behavior or the narrowest equivalent parent callback needed to target the exact quoted add-on. Add focused regression coverage for CTA order and add-on cart View Plan exact identity. Report changed files, routing path, tests, and diff in this same work file. Do not push source to `main` until ChatGPT audits the candidate.
