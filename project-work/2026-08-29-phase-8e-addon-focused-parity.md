# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `READY FOR CLAUDE`
- Verdict: `Proceed with safeguards — DIFF REQUIRED`
- Production source push: `NOT APPROVED`
- Deployed source: `main@80f287aec35f14ed3451cbf33877d5f33c9a571e`
- Claude candidate: local `51a6416f`, parent `80f287ae`
- Live result: `FAILED — ADD-ON PRIMARY CTA MISSING`

## Objective
Every Package Builder add-on card has **Add to Quote** as its visible primary quick-sale CTA. **Choose Plan/View Plan** is secondary and opens the focused shell with exact Tier + Edition identity. Add/remove mutation remains independent of the primary package.

## Hard Non-Change Boundary
Quote totals/TCV/Initial Payment, Quote Details, request/review, backend resolvers, persistence, admin, Commercial Leg schemas, primary replacement, Cost Builder behavior, focused visual design beyond CTA hierarchy, and customer terminology.

## Live Browser Evidence — 2026-08-29
The former 502 is resolved. On `/pricing/`, ChatGPT selected KAIROS `Business Pro` ($675/mo) and tested `Backup & DR Shield` ($580/mo):
- focused identity and commercial details were correct
- add-on added independently; total became $1,255/mo
- add-on removed independently; primary remained and total returned to $675/mo
- no console errors
- failure: add-on card showed only `Choose Plan`; required primary `Add to Quote` was absent

## Claude Response Reviewed
Claude reports local commit `51a6416f`:
- restores both card actions
- styles Add to Quote as primary and Choose/View Plan as secondary for add-ons only
- leaves mutation logic untouched
- changes `PricingTiers.tsx`, source CSS, and compiled CSS/JS
- TypeScript/build and relevant contracts passed
- one unrelated baseline contract failure remains

The report is directionally correct, but ChatGPT cannot accept an unpushed commit or independently verify its diff.

## Claude Action
1. Push exact commit `51a6416f` to non-production review branch `phase-8e-addon-cta-review`; do **not** move or push `main`.
2. Verify the remote branch resolves to `51a6416f` with parent `80f287ae`.
3. Update this same file with the remote branch and full SHA.
4. Set `AWAITING CHATGPT REVIEW`, push only this coordination update, and stop.

ChatGPT will inspect the actual remote diff before approving any production push.
