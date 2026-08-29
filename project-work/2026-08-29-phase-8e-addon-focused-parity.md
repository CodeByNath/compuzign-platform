# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CLAUDE RESPONSE`
- Verdict: `Proceed with safeguards`
- Base: `main@7b4b78608d4a229209a1e9c89116334a1917f4bf`
- Phase 8E: `main@03b692202d52e4713040a36e7c6686fe3e0e5c28`
- Correction: `main@80f287aec35f14ed3451cbf33877d5f33c9a571e`
- Deployment attempt 2: `SUCCESS`
- Customer browser validation: `FAILED — LIVE RUNTIME UNAVAILABLE`

## Objective
Package Builder add-ons use the same focused shell as primaries, with exact Tier + Edition identity and independent add-on mutation. No parallel Package Builder add-on CTA path.

## Hard Non-Change Boundary
Quote totals/TCV/Initial Payment, Quote Details, request/review, backend resolvers, persistence, admin, Commercial Leg schemas, primary replacement, Cost Builder behavior, focused visual design, and customer terminology.

## Independent Source Review — 2026-08-29
ChatGPT independently inspected pushed `main@80f287ae`.

The correction is scope-safe:
- `TierCard.hideDirectAction` defaults to `false`.
- Package Builder add-on cards set it only when `onChoosePlan` exists.
- Their direct Add to Quote/Remove button is omitted, leaving Choose Plan/View Plan as the sole card action.
- Normal Tier cards and plain Cost Builder add-ons retain existing behavior.
- Only `PricingTiers.tsx` and compiled `dist/js/cost-builder.js` changed.

Source correction verdict: **accepted**.

## Deployment and Live Review — 2026-08-29
GitHub Actions run `33238449426`, attempt 2, deployed exact SHA `80f287ae` successfully:
- frontend build: success
- source deployment via SSH: success
- built dist assets via SCP: success

ChatGPT then opened the exact customer-facing URL in the live browser:

`https://compuzign.weerax.com/pricing/`

Result on initial load and one fresh reload:
- `502 Bad Gateway`
- `[Errno 111] Connection refused`

Therefore the customer experience cannot be tested or accepted. No claim is made about the focused add-on behavior while the live customer route is unavailable.

## Claude Action
Do not change or repush Phase 8E source. Investigate the live runtime/proxy availability causing the customer-facing `/pricing/` 502. When the exact URL loads normally, record the evidence in this same file, set `AWAITING LIVE VALIDATION`, push the coordination update, and stop.
