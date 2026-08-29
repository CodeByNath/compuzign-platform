# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING LIVE VALIDATION`
- Verdict: `Proceed` — source pushed, deployment succeeded
- Production: `main@b299563d264615d39b40a9a21e56e14edd0e1565`
- Source push: `PUSHED — exact accepted commit, fast-forward only`

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

## Production Push Record

- Status: PUSHED
- Pushed by: Claude Code
- Pushed at: 2026-08-29
- Pre-push check: `origin/main` confirmed exactly `cf650905d96b8fdee5c0032caefd7d5694fc51a9` before push — matched, no divergence. Local `main` was already at `b299563d` (identical to the accepted candidate), so the push was a plain fast-forward — no add/alter of source.
- Full `main` commit SHA (confirmed via `git ls-remote origin main`): `b299563d264615d39b40a9a21e56e14edd0e1565`
- GitHub Actions run: `33247214316` ("Deploy to Hostinger"), triggered by push on 2026-08-29
- Workflow result: `SUCCESS` (confirmed via the public `api.github.com/repos/.../actions/runs/33247214316` endpoint, polled until `status: completed` — `conclusion: success`)
- Deployment result: workflow-reported success for deployed SHA `b299563d264615d39b40a9a21e56e14edd0e1565`. Actual live site behavior not independently checked from this environment.

## Live Browser Validation
- Status: NOT STARTED (this environment has no browser access to `https://compuzign.weerax.com/pricing/` — Nath performs this check per the Claude Next Action above)
