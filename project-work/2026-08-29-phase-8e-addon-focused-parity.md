# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING LIVE VALIDATION`
- Verdict: `Proceed with safeguards` — source pushed, deployment succeeded
- Source push: `PUSHED — exact reviewed head, fast-forward only`
- Production: `main@7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82`
- Review branch (still holds the same approved commit): `phase-8e-addon-cta-review`

## Objective
Package Builder add-on recommendation cards show **Add to Quote** as the primary quick-sale CTA and **Choose Plan/View Plan** as the secondary focused-details CTA. Both remain visible. Add/remove mutation remains independent of the primary package.

## Hard Non-Change Boundary
Quote calculations/details/review, backend resolvers, persistence, admin, Commercial Leg schemas, primary replacement, plain Cost Builder behavior, unrelated focused design, and customer terminology.

## Review Evidence
The deployed route loads and independent mutation works. Deployed `80f287ae` fails only because its recommendation card hides `Add to Quote`.

ChatGPT independently reviewed the complete candidate:
- `51a6416f` restores both buttons and preserves mutation paths.
- `7ce87f61` fixes the initial CSS scope leak.
- The primary modifier now applies only when `data?.is_addon && onChoosePlan`.
- Plain Cost Builder keeps its original add-on button styling.
- Choose/View Plan remains secondary.
- Source TS/CSS and compiled JS/CSS agree.
- Reported TypeScript, build, isolation, cart, add-on, customer-tab, and edition contracts pass.
- No identity, totals, persistence, resolver, backend, or primary-replacement changes were found.

Verdict: **source accepted**.

## Claude Action
1. Confirm `origin/main` is exactly `80f287aec35f14ed3451cbf33877d5f33c9a571e`; stop and report any divergence.
2. Fast-forward `main` to exact reviewed head `7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82`. Do not amend or add commits.
3. Confirm GitHub `main` resolves to that SHA.
4. Monitor deployment and record workflow run ID, attempt, conclusion, and deployed SHA.
5. After successful deployment, update this file to `AWAITING LIVE VALIDATION`; on failure, use `AWAITING CHATGPT REVIEW` with evidence.
6. Push the coordination update and stop.

## Production Push Record

- Status: PUSHED
- Pushed by: Claude Code
- Pushed at: 2026-08-29
- Pre-push check: `origin/main` confirmed exactly `80f287aec35f14ed3451cbf33877d5f33c9a571e` before push (`git fetch origin main && git rev-parse origin/main`) — matched, no divergence.
- Push method: fast-forward only, no amend/no new commits — local `main` was already at `51a6416f` (the reviewed commit's own parent), so `git merge --ff-only 7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82` then `git push origin main` moved `main` directly to the approved head.
- Full `main` commit SHA (post-push, confirmed via `git ls-remote origin main`): `7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82`
- Complete commit message: "Phase 8E: scope primary add-on CTA styling to Package Builder only" (see Claude Corrective Response above for full body)
- Files included: `resources/ts/components/cost-builder/PricingTiers.tsx`, `resources/css/modules/cost-builder.css`, `dist/css/cost-builder.css`, `dist/js/cost-builder.js`
- GitHub Actions run: `33242742531` ("Deploy to Hostinger #903"), attempt 1, triggered by push on 2026-08-29 08:15
- Workflow result: `SUCCESS`, completed in 37s. One unrelated warning noted (Node.js 20 deprecation — workflow targets an older Node version than the Node 24 runner executed on); not a failure.
- Deployment result: workflow-reported success for deployed SHA `7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82`. Actual live site behavior not independently checked from this environment — that is ChatGPT's next step (Live Browser Validation below).

## Live Browser Validation
- Status: NOT STARTED (this environment has no browser access to `https://compuzign.weerax.com/pricing/`)
