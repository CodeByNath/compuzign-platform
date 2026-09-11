# Upgrade CTA Cart Suppression

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `67a5a7afd38a105059d92ca41ad020feaf472767`.
- This is a small follow-up to the now-CLOSED Tier navigation stabilization. Do not reopen or alter that closed file.

## Nath's refinement
When the **Upgrade your build** CTA itself is visible inside Recommendations — the state with the two actions **Browse Catalogue** and **Maybe next time** — the Cart should be hidden.

This is intentionally narrower than the prior navigation rule. Do not change any other state:
- Add-on-only Recommendations -> Cart remains visible.
- Upgrade CTA visible (`pending`) -> Cart hidden.
- Browse Catalogue / Upgrade browsing -> Cart hidden, unchanged.
- After **Maybe next time** dismisses the CTA -> normal Recommendations resume and Cart becomes visible again.
- After leaving Upgrade browsing back to Recommendations with CTA dismissed -> Cart visible again.
- Globally lone Tier -> existing focused/no-X + Cart behavior unchanged.
- Normal Tier card/focused Add to Quote with no intermediate step -> Cart visible, unchanged.
- Cross-audience and explicit focused inspection behavior unchanged.

## Implementation boundary
Add one narrow condition to the existing resolved navigation model. Do **not** add a new persistent `showCart` flag, do not redesign `resolvedStep`, and do not change quote/cart mutation, Upgrade eligibility, CTA actions, Add-on presentation, Plan Details, pricing, Commercial Legs, or identity.

Prefer expressing this as Cart suppression when the current resolved Recommendations state also has the active Upgrade gate in `pending` state. The actual rendered CTA is the authority: suppression must correspond to the same condition that renders **Browse Catalogue** + **Maybe next time**.

## Required regression changes
Update the mounted navigation regression only as needed to lock these exact transitions:
1. Upgrade-only: after Tier Add to Quote, CTA visible + Cart hidden.
2. Click **Maybe next time** -> CTA gone + Cart visible.
3. Upgrade-only: CTA visible -> Browse Catalogue -> Cart remains hidden while browsing -> exit -> Cart visible.
4. Add-ons + Upgrade: while CTA visible, Cart hidden; after **Maybe next time**, add-ons return + Cart visible.
5. Add-on-only Recommendations still show Cart.

## Must preserve
The accepted `resolvedStep` architecture; all Tier/Edition reload and exact-Edition fixes; Add-on exact Edition card state; X/View Plan behavior; Upgrade browsing behavior; all quote/cart data semantics.

## Must remove
Only Cart visibility while the Upgrade CTA with Browse Catalogue / Maybe next time is actually on screen.

## Must not substitute
Do not hide Cart for all Recommendations. Do not hide Add-ons beyond their existing CTA presentation rule. Do not alter CTA wording/actions. No CSS-only workaround.

Create one clean review branch from current `main`, make the minimum change, run the focused navigation regressions plus TypeScript/build/docs and relevant baseline comparison, record exact SHA/tree and changed files here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.
