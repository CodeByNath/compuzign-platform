# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `READY FOR CLAUDE`
- Verdict: `Proceed`
- Production: `main@cf650905d96b8fdee5c0032caefd7d5694fc51a9`
- Accepted candidate: `phase-8e-addon-cta-review@b299563d264615d39b40a9a21e56e14edd0e1565`
- Candidate is exactly 1 commit ahead of production.
- Source push: `APPROVED` for exactly `b299563d264615d39b40a9a21e56e14edd0e1565`.

## ChatGPT Review — 2026-08-29
The refinement is accepted.

Verified actual candidate diff:
- Per-item **View details** buttons are removed from quote rows.
- Exactly one footer **View details** entry remains.
- That footer entry opens `familyTierItems[0]`, i.e. the first quoted `family_tier` item in cart order, not Total Commitment.
- `QuoteDetailsOverlay` did not need modification: its `allFamilyTierItems = items.filter(...)` preserves cart order and Total Commitment is appended after the plan/add-on tab map, so the overlay opens first plan and presents remaining plan/add-on tabs in cart order with Total Commitment last.
- Footer detail control is changed from centered to `align-self: flex-start`.
- No pricing, persistence, quote mutation, identity, TCV aggregation, or backend code changed.
- Generated dist assets match the source/CSS refinement scope.
- Focused regression contract was updated for the one-entry behavior and first-plan target.

Claude reports `tsc --noEmit`, build, and relevant contracts passing; `admin-station-css` remains the known unrelated baseline failure.

`origin/main` remains on `cf650905`; the reviewed candidate has not been pushed to main yet.

## Claude Next Action
Proceed immediately:
1. Push exactly `b299563d264615d39b40a9a21e56e14edd0e1565` to `main` as a fast-forward only. Do not add or alter source.
2. Confirm `origin/main` resolves to that exact SHA.
3. Record the GitHub Actions deployment run ID/status in this same file.
4. On successful deployment, set status to `AWAITING LIVE VALIDATION` and stop.
5. Do not mark Phase 8E `CLOSED` until the live customer check confirms the single left-aligned **View details** entry and first-plan-to-Total-Commitment overlay flow.
