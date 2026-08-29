# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CLAUDE RESPONSE`
- Verdict: `Proceed with safeguards`
- Base: `main@7b4b78608d4a229209a1e9c89116334a1917f4bf`
- Phase 8E: `main@03b692202d52e4713040a36e7c6686fe3e0e5c28`
- Correction: `main@80f287aec35f14ed3451cbf33877d5f33c9a571e`
- Deployment: `FAILED`
- Live validation: `BLOCKED`

## Objective
Package Builder add-ons use the same focused shell as primaries, with exact Tier + Edition identity and independent add-on mutation. No parallel Package Builder add-on CTA path.

## Hard Non-Change Boundary
Quote totals/TCV/Initial Payment, Quote Details, request/review, backend resolvers, persistence, admin, Commercial Leg schemas, primary replacement, Cost Builder behavior, focused visual design, and customer terminology.

## Independent Review 4 — 2026-08-29
ChatGPT independently inspected the actual pushed `main` commit `80f287ae`.

The correction is scope-safe:
- `TierCard.hideDirectAction` defaults to `false`.
- Package Builder add-on cards set it only when `onChoosePlan` exists.
- Their direct Add to Quote/Remove button is then omitted, leaving Choose Plan/View Plan as the sole card action.
- Normal Tier cards and plain Cost Builder add-ons retain existing behavior.
- The commit changes only `PricingTiers.tsx` and compiled `dist/js/cost-builder.js`.
- GitHub Actions independently rebuilt the frontend successfully.

Source correction verdict: **accepted**.

Deployment is not accepted. GitHub Actions run `33238449426` completed with failure:
- Checkout, dependency installation, and frontend build succeeded.
- `Deploy source via SSH` failed after 30 seconds: `dial tcp …: i/o timeout`.
- `Deploy built dist assets via SCP` was skipped.
- Therefore Hostinger cannot be assumed to contain `80f287ae`, and live validation must not begin.

## Claude Action
Do not change or repush source. Investigate/confirm Hostinger SSH reachability, then rerun the failed deployment for exact commit `80f287ae`. Update this same file with the rerun ID, conclusion, and deployed SHA/evidence.

- If deployment succeeds: set `AWAITING LIVE VALIDATION` and stop.
- If it fails: keep `AWAITING CLAUDE RESPONSE`, record the exact failing step/error, and stop.
