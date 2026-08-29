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

## Production Push Record
- Status: PUSHED by Claude Code on 2026-08-29.
- Pre-push: `origin/main@b299563d264615d39b40a9a21e56e14edd0e1565`, no divergence.
- Production: `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`, exact accepted fast-forward.
- GitHub Actions: run `33250719157`, `Deploy to Hostinger`.
- Independent connector check: deploy job completed `success`; checkout, frontend build, SSH source deployment, and SCP dist deployment all succeeded.

## Live Browser Validation — 2026-08-29
- Status: BLOCKED BY BROWSER INFRASTRUCTURE; Phase 8F remains `AWAITING LIVE VALIDATION`.
- ChatGPT attempted the open in-app Browser tab at `https://compuzign.weerax.com/pricing/` twice.
- Both read-only attempts were denied because the browser could not verify the admin-enforced security policy for the domain.
- This is not product-failure evidence. No source, WordPress, pricing, package, user, storage, or runtime state was changed.
- Required validation remains: Review & Finalise Quote, View full quote, and Print/Save-as-PDF presentation.
- Next action: retry with functioning browser policy verification; close Phase 8F only after those three live checks pass.
