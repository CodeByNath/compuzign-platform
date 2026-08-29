# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `READY FOR CLAUDE`
- Verdict: `Proceed with safeguards`
- Source push: `APPROVED — exact reviewed head only`
- Current production: `main@80f287aec35f14ed3451cbf33877d5f33c9a571e`
- Approved head: `7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82`
- Review branch: `phase-8e-addon-cta-review`

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
