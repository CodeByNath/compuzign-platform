# Phase 8E / 8F — Add-on Parity → Quote Review/PDF Parity

## Status
- Phase 8E: `CLOSED` — live validation passed.
- Production baseline: `main@b299563d264615d39b40a9a21e56e14edd0e1565`
- Phase 8F: `AWAITING LIVE VALIDATION`
- Verdict: `Proceed` — source pushed, deployment succeeded
- Production: `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`
- Source push: `PUSHED — exact accepted commit, fast-forward only`

## ChatGPT Review — 2026-08-29
Independent review completed against production and the two correction commits.

Verified:
- candidate is 3 commits ahead / 0 behind `main@b299563d...`;
- selection-time `tierEditionTitle` snapshot is added without changing selection/routing behavior;
- review and printable proposal no longer render raw CZ Platform IDs;
- Family primary/add-on rows use `legPaymentSummaries` with existing charge labels and finite per-item Total, with old-cart flat price/cycle fallback;
- Family Contract Value / Initial Payment uses existing trusted pricing primitives and remains primary-only;
- mixed-cart totals are now split correctly: when Family contract mode is active, general totals use non-Family items only; when it is not active, existing general totals still use the full cart;
- this removes both failure classes found in prior reviews: legacy totals disappearing and single-stream Family primaries being double-counted;
- an old Family primary with missing Leg snapshots still prevents a fabricated finite combined TCV;
- Family add-ons remain outside combined TCV/Initial Payment as approved, while retaining their own row-level stream/Total presentation;
- `.cz-proposal` root and existing `beforeprint` clone / `window.print()` PDF path are unchanged;
- no RequestSchema/storage, submit/email, routing/modal, admin, persistence, quote mutation, or pricing-resolver changes are included.

Claude reports `tsc --noEmit` and build clean. Full contract sweep has only the three already-confirmed baseline failures: `admin-station-css`, `package-builder-flow`, `platform-identity-schema`. New mixed-cart contract directly checks multi-stream Family + single-stream Family + legacy item population and totals.

## Known Deferred Gap
`RequestSchema::sanitizeItems()` still drops `legPaymentSummaries` (and the new display snapshot is not yet part of request persistence). That belongs to later admin/user-manager quote-request persistence work and is intentionally not changed in Phase 8F.

## Claude Next Action
1. Push exactly `5b97287032a4bb00e2d8849fde4ed30f42917eab` to `main` as fast-forward only. No source alterations.
2. Confirm `origin/main` exact SHA.
3. Record GitHub Actions run ID/status here.
4. On successful deployment set Phase 8F to `AWAITING LIVE VALIDATION` and stop.
5. Live validation must cover Review & Finalise Quote, View full quote, and Print/Save-as-PDF presentation before closure.

## Production Push Record

- Status: PUSHED
- Pushed by: Claude Code
- Pushed at: 2026-08-29
- Pre-push check: `origin/main` confirmed exactly `b299563d264615d39b40a9a21e56e14edd0e1565` before push — matched, no divergence. Local `main` checked out fresh from `origin/main` (same SHA), then fast-forward merged to `phase-8f-quote-review-pdf-parity@5b972870...` (confirmed via `git ls-remote origin phase-8f-quote-review-pdf-parity` to be the exact approved SHA before merging) — no source alterations, pure fast-forward.
- Full `main` commit SHA (confirmed via `git ls-remote origin main`): `5b97287032a4bb00e2d8849fde4ed30f42917eab`
- GitHub Actions run: `33250719157` ("Deploy to Hostinger"), triggered by push on 2026-08-29
- Workflow result: `SUCCESS` (confirmed via the public `api.github.com/repos/.../actions/runs/33250719157` endpoint, polled until `status: completed` — `conclusion: success`)
- Deployment result: workflow-reported success for deployed SHA `5b97287032a4bb00e2d8849fde4ed30f42917eab`. Actual live site behavior not independently checked from this environment.

## Live Browser Validation
- Status: NOT STARTED (this environment has no browser access to `https://compuzign.weerax.com/pricing/` — Nath performs this check per the Claude Next Action above, covering Review & Finalise Quote, View full quote, and Print/Save-as-PDF presentation)
