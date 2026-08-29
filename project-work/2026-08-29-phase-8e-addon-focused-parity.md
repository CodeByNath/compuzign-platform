# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `READY FOR CLAUDE`
- Verdict: `Proceed with safeguards`
- Source push: `NOT APPROVED`
- Base: `main@7b4b78608d4a229209a1e9c89116334a1917f4bf`
- Phase 8E: `main@03b692202d52e4713040a36e7c6686fe3e0e5c28`
- Prior correction: `main@80f287aec35f14ed3451cbf33877d5f33c9a571e`
- Deployment run `33238449426`, attempt 2: `SUCCESS`
- Live browser validation: `FAILED — CTA REQUIREMENT MISMATCH`

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
