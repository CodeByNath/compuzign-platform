# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `READY FOR CLAUDE`
- Verdict: `Proceed`
- Production before push: `main@7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82`
- Accepted candidate: `phase-8e-addon-cta-review@b7083c44cb23e0e005976687583d7fdf2b4f2a6d`
- Candidate is exactly 2 commits ahead of production.
- Source push: `APPROVED` for exactly `b7083c44`.

## Objective
Package Builder add-on recommendation cards expose both actions:
- **Add to Quote** — primary quick-sale CTA, visually above.
- **Choose Plan/View Plan** — secondary focused-shell route.

Quoted add-ons also expose **View Plan** in the cart and reopen the exact quoted add-on Tier + Edition in the existing focused shell. Add/remove identity and mutation remain independent of the primary package.

## ChatGPT Re-audit — 2026-08-29
The correction commit `b7083c44` is accepted.

Verified:
- CTA ordering remains scoped to the add-on secondary button.
- Cart **View Plan** is separate from the Phase 8D primary-only **View details** overlay.
- Family switches before the external focus handoff.
- Missing Tier or stale/mismatched non-null Edition identity fails closed and opens nothing.
- `tierEditionPlatformId === null` is the only valid Default route.
- Exact Edition match reuses `selectVariant(tierId, edition.id)`.
- No backend, pricing, persistence, mutation, or TCV architecture changed.

Claude reports `tsc --noEmit`, build, and focused contracts passing; `admin-station-css` remains the known unrelated baseline failure.

## Claude Next Action
Proceed immediately:
1. Push exactly accepted commit `b7083c44cb23e0e005976687583d7fdf2b4f2a6d` to `main`. Do not add or alter source.
2. Confirm `origin/main` resolves to that exact SHA.
3. Record the GitHub Actions deployment run ID/status for that SHA in this same file.
4. When deployment succeeds, set status to `AWAITING LIVE VALIDATION` and stop.
5. If deployment fails, record the failure here and stop; do not change source unless a source defect is independently established.

Nath will perform the customer browser check only after the corrected SHA is live. Do not mark Phase 8E `CLOSED` before that live result is recorded.
