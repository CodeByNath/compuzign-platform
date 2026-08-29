# Phase 8E / 8F — Add-on Parity → Quote Review/PDF Parity

## Status
- Phase 8E: `CLOSED` — live validation passed.
- Phase 8F: `CLOSED` — source, deployment, and live validation accepted.
- Verdict: `Proceed`
- Production: `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`
- Source push: `PUSHED — exact accepted commit, fast-forward only`

## Accepted Source and Deployment
Independent review verified the Phase 8F implementation and two corrections:
- selection-time `tierEditionTitle` snapshot; no live-catalog display resolution in request flow;
- human Family/Tier/Edition labels and no raw CZ Platform IDs;
- existing `legPaymentSummaries`, charge labels, Contract Value, and Initial Payment primitives reused;
- Family primary totals remain primary-only; add-ons retain row-level stream presentation;
- mixed-cart population split prevents both lost legacy totals and Family double-counting;
- old items without Leg snapshots cannot fabricate a finite combined TCV;
- `.cz-proposal`, `beforeprint` clone, and `window.print()` path retained;
- no schema/storage, submit/email, routing, admin, persistence, quote mutation, or pricing-resolver changes.

Production push was recorded by Claude on 2026-08-29. The exact accepted three-commit fast-forward moved `main` from `b299563d...` to `5b972870...`. GitHub Actions run `33250719157` (`Deploy to Hostinger`) completed successfully, including checkout, frontend build, SSH source deployment, and SCP dist deployment. Connector reinspection confirmed the production commit and correction diff.

Reported verification: `tsc --noEmit` and build clean. Full contract sweep retained only three established baseline failures: `admin-station-css`, `package-builder-flow`, and `platform-identity-schema`. The new mixed-cart contract covers multi-stream Family + single-stream Family + legacy totals.

## Live Browser Validation — 2026-08-29
Read-only production validation passed at `https://compuzign.weerax.com/pricing/`.

Validated a mixed quote containing:
- OMNIA — Banking / Omnia Basic: Monthly $4,000;
- KAIROS — IaaS / Starter Cloud / Edition 2: Monthly $20 and Yearly $20.

Passed:
- **Review & Finalise Quote:** human Family/Tier/Edition labels, distinct stream rows, no raw platform IDs, Contract Value `Ongoing`, Initial Payment `$4,020`.
- **View full quote:** printable proposal matched the review values and identity; no raw platform IDs.
- **Print / Save as PDF:** action invoked successfully from the live multi-stream proposal and the page remained responsive.

No contact details were entered, no quote was submitted, and no WordPress, pricing, package, user, storage, or runtime record was changed.

## Known Deferred Gap
`RequestSchema::sanitizeItems()` still drops `legPaymentSummaries`, and the Edition display snapshot is not yet persisted. This remains deferred to later admin/user-manager quote-request persistence work and was intentionally outside Phase 8F.
