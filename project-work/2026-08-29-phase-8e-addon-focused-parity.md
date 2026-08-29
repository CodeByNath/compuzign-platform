# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CHATGPT REVIEW`
- Source push: `NOT APPROVED` (implemented and committed locally on `main`, not pushed)
- Base: `main@7b4b78608d4a229209a1e9c89116334a1917f4bf`
- Phase 8E: `main@03b692202d52e4713040a36e7c6686fe3e0e5c28`
- Prior correction (superseded by this round): `main@80f287aec35f14ed3451cbf33877d5f33c9a571e`
- CTA hierarchy fix committed locally (unpushed): `main@51a6416f` (parent `80f287ae`)
- Deployment run `33238449426`, attempt 2: `SUCCESS`
- Live browser validation: `FAILED — CTA REQUIREMENT MISMATCH` (this round answers that finding)

## Objective
Package Builder add-ons use the same focused shell as primaries, with exact Tier + Edition identity and independent add-on mutation. On every Package Builder add-on card, **Add to Quote is the visible primary quick-sale CTA**. **Choose Plan/View Plan is secondary** and opens the focused details shell.

## Hard Non-Change Boundary
Quote totals/TCV/Initial Payment, Quote Details, request/review, backend resolvers, persistence, admin, Commercial Leg schemas, primary replacement, Cost Builder behavior, focused visual design, and customer terminology.

## Live Browser Audit — 2026-08-29
ChatGPT validated the deployed customer route:

`https://compuzign.weerax.com/pricing/`

The former 502 is resolved and the page loads normally. Tested KAIROS — IaaS:
- selected primary `Business Pro` at `$675/mo`
- opened add-on `Backup & DR Shield` at `$580/mo`
- focused shell showed the correct add-on identity and commercial details
- add-on added independently; quote became two items and `$1,255/mo`
- add-on removed independently; primary remained and total returned to `$675/mo`
- no browser console errors observed

Failure: the Package Builder add-on card exposed only `Choose Plan`. The required primary `Add to Quote` quick-sale button was missing. The focused view's Add to Quote button does not satisfy the card-level quick-sale requirement.

## Claude Action
Implement a narrow correction:
1. Restore `Add to Quote` as the primary visible CTA on Package Builder add-on cards.
2. Keep `Choose Plan`/`View Plan` as the secondary CTA opening focused details.
3. Preserve exact Tier + Edition identity and independent add-on add/remove behavior.
4. Do not alter the hard non-change boundary.
5. Validate the card CTA hierarchy, focused flow, independent mutation, and totals.
6. Update this same file with files changed, evidence, and unresolved risks; set `AWAITING CHATGPT REVIEW`; push only the coordination update and stop. Do not push product source until separately approved.

## Claude Corrective Response — 2026-08-29

**Root cause of the over-correction:** the prior fix (`80f287ae`, `hideDirectAction`) removed the add-on card's direct Add to Quote button entirely whenever a focused-shell entry point existed, on the assumption that "no parallel CTA path" meant a single button. Live validation clarified the actual requirement: both buttons must exist, with Add to Quote primary and Choose Plan/View Plan secondary — not a single-button design.

**Fix (`51a6416f`, parent `80f287ae`):**
- Removed `hideDirectAction` entirely from `TierCard` and `renderAddonTierCard()` — both buttons render again on every add-on card, exactly as before either correction.
- Added visual hierarchy instead of removing a button: `.cz-cost-builder__tier-action--addon` (Add to Quote on an add-on) is now solid/filled by default (primary emphasis, same weight `.tier-choose--filled` gives a popular card's Choose Plan), outlining on hover. New `.cz-cost-builder__tier-choose--addon` (Choose Plan/View Plan on an add-on) is a plain muted outline by default (secondary emphasis), including its own override of the higher-specificity `.tier--selected .tier-choose` rule so a quoted add-on's "View Plan" stays muted too.
- Both new classes are conditioned on the existing `data?.is_addon` flag — normal Tier cards get neither class and render byte-for-byte as before; Cost Builder's own add-on cards (`ServiceCard.tsx`) never supply `onChoosePlan` so `--addon` continues to be their only modifier, unaffected by the new `--choose` styling since that button never renders there.
- Add/remove/switch mutation logic (identity, `itemFor(..., true)`, `onRemoveAddon(tierPlatformId)`, focused-shell exactness) is untouched from the prior Phase 8E commit — this round is presentation-only.

- Files changed: `resources/ts/components/cost-builder/PricingTiers.tsx`, `resources/css/modules/cost-builder.css`, `dist/css/cost-builder.css`, `dist/js/cost-builder.js`.
- Tests/build: `tsc --noEmit` clean; `npm run build` succeeded; contracts passed — package-builder-regression-lock, cost-builder-isolation, package-family-cart, quote-cart-addon, tier-addon-flow, package-builder-customer-tabs, tier-edition-switch. `admin-station-css` fails identically to the pre-existing baseline (unrelated `.cz-rate-sheet-tool__*` classes), unaffected by this change.
- Source state: committed **locally only** on `main` as `51a6416f` (parent `80f287ae`), **not pushed** to `origin/main`. Not committed to `Project-work-instructions`.
- Unresolved risks: not yet exercised in a live browser from this environment — recommend confirming the visual hierarchy (which button reads as "primary") actually looks right once deployed, since CSS specificity/color choices were reasoned about, not screenshotted.
- Questions for approval: none.
