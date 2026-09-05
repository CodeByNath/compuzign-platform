# Upgrade journey — active correction track

## Status
- **AWAITING LIVE VALIDATION — reviewed correction deployed at `93ac03ec`**
- Auditor verdict: **Proceed with safeguards**
- `main` fast-forwarded `2b3ec74d` → `93ac03ec08a9f96b883fc4dd9deb8f8686cc129e` (ff-only, diff matches the approved review head exactly), pushed to `origin/main`.
- Deploy: GitHub Actions run [`33945492532`](https://github.com/CodeByNath/compuzign-platform/actions/runs/33945492532), head_sha `93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, status `completed`, conclusion `success` (updated_at 2026-09-05T04:47:58Z). Hostinger deploy from this run is live.
- The live gate listed below (Cart hierarchy, Details tabs, Total Commitment, customer email) has NOT yet been independently validated — that is the only remaining step before `CZTU`/`CZTEU` work may begin.

## Auditor review
Independent compare confirms `93ac03ec` is exactly one commit ahead of production and limited to the requested correction plus generated output/contracts.

### Cart hierarchy
Accepted. `orderedQuoteItems()` is a pure presentation derivation: it keeps each Family/Tier system together and orders its roles as:
1. Main plan
2. Upgrades, when present
3. Add-ons

With no Upgrade, add-ons follow Main immediately. Multiple add-ons preserve their existing relative order. The helper returns the original item objects and does not mutate canonical cart storage, IDs, snapshots, pricing, or submission values. `QuoteSummary.tsx` and `QuoteDetailsOverlay.tsx` reuse the same helper, avoiding divergent hand-sorts.

### Total Commitment
Accepted. The previous add-on exclusion is removed. The overlay now feeds the complete ordered Family quote population into the existing `computeTotalContractValue()` and `startingPaymentsByCycle()` helpers. Primary, Upgrade, and add-ons are each represented once; no second pricing calculator is introduced. Per-item inclusion disclosure still reads only that item's own stored snapshot.

### Customer email separation
Accepted at source level. The divider now terminates the complete quoted-item block: header row when no inclusion rows exist, otherwise the trailing inclusion wrapper row. This avoids drawing a divider inside one item while leaving the boundary to the next item unmarked. Existing semantic table/inline email markup, labels, quantities, and prices remain intact.

## Safeguards / live gate
No identity allocation, Rate Sheet pricing, cart mutation/removal semantics, readiness/hydration, or submission-schema changes are approved in this round.

After deployment, live validation must confirm:
- Cart: Main → Upgrade → Add-ons, and Main → Add-ons when no Upgrade exists.
- Adding/removing Upgrade dynamically moves only presentation order.
- Details tabs use the same hierarchy.
- Total Commitment contains Main + Upgrade + all add-ons exactly once with correct Contract Value and Initial Payment.
- Customer email visibly separates Main, Upgrade, and add-on sections in the received email.

## Next action
Live-validate the gate items above against the deployed `main@93ac03ec`. Claude cannot perform this step (no live browser access) — this requires the auditor or Nath exercising the actual KAIROS customer route (cart hierarchy, Details tabs, Total Commitment, and the received customer email).