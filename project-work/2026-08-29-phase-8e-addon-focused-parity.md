# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING LIVE VALIDATION`
- Verdict: `Proceed` — source pushed, deployment succeeded
- Production: `main@b7083c44cb23e0e005976687583d7fdf2b4f2a6d`
- Source push: `PUSHED — exact accepted commit, fast-forward only`

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

## Production Push Record

- Status: PUSHED
- Pushed by: Claude Code
- Pushed at: 2026-08-29
- Pre-push check: `origin/main` confirmed exactly `7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82` before push — matched, no divergence. Local `main` was already at `b7083c44` (identical to the accepted candidate), so the push was a plain fast-forward — no add/alter of source.
- Full `main` commit SHA (confirmed via `git ls-remote origin main`): `b7083c44cb23e0e005976687583d7fdf2b4f2a6d`
- GitHub Actions run: `33245001288` ("Deploy to Hostinger #904"), attempt 1, triggered by push on 2026-08-29 09:13 UTC
- Workflow result: `SUCCESS`, completed in 30s (confirmed via the public `api.github.com/repos/.../actions/runs/33245001288` endpoint — `status: completed`, `conclusion: success`)
- Deployment result: workflow-reported success for deployed SHA `b7083c44cb23e0e005976687583d7fdf2b4f2a6d`. Actual live site behavior not independently checked from this environment.

## Live Browser Validation
- Status: NOT STARTED (this environment has no browser access to `https://compuzign.weerax.com/pricing/` — Nath performs this check per the Claude Next Action above)
