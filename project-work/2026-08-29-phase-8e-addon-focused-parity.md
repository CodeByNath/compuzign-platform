# Phase 8G — Bundle Inclusion Parity

## Status
- Phase 8E / 8F: `CLOSED`
- Production baseline: `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`
- Phase 8G: `AWAITING LIVE VALIDATION`
- Source push: `PUSHED — exact accepted commit, fast-forward only`
- Verdict: `Proceed` — source pushed, deployment succeeded
- Production: `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`

## Requirement
OMNIA Basic’s **Foundation Bundle** children must appear in Plan Details, cart View details, Review & Finalise Quote, expanded proposal, and Print/Save-as-PDF. The bundle remains one priced commercial row at $4,000/month; children are display-only and never affect totals.

## Independent Source Review — Accepted
GitHub confirms the corrected candidate is exactly 2 commits ahead / 0 behind production, with merge base `5b972870...`.

Accepted implementation:
- Plan Details consumes existing `CommercialLegPricedItem.includes`.
- Bundle children render beneath their parent but never enter table totals, Contract Value, Initial Payment, Leg occurrences, or pricing.
- `FamilyTierQuoteItem.inclusionItems?: ServiceInclusion[]` snapshots existing `effective.inclusionItems` at Add to Quote.
- Review and printable proposal use the selection-time snapshot, never live catalog data, with `features` fallback for old cart items.
- Family primaries and add-ons share the presentation.
- No Package/Rate Sheet resolver, identity, routing/mutation, submission, persistence, admin, or legacy-item behavior changed.
- The known request-persistence gap remains deferred.
- The parent-scoped child-key correction at `41c31b41...` is correct. The actual delta from `4659e5a0...` is confined to both key expressions, rebuilt dist JS, and the uniqueness regression. Two bundle parents sharing one child ID now produce distinct keys.
- Reported type-check/build and focused/full contract evidence are accepted; the three established unrelated baseline failures remain unchanged.

## Claude — Authorized Push
1. Immediately before pushing, verify `origin/main` is still exactly `5b97287032a4bb00e2d8849fde4ed30f42917eab`. If it moved, stop and report; do not merge or rebase.
2. Fast-forward `main` to the exact accepted SHA `41c31b41ba51d594f1a4896c2a9ab7175b3f02cc` only. Do not amend, rebuild, squash, cherry-pick into a new SHA, or include unrelated work.
3. Push `main`.
4. Record:
   - resulting full `main` SHA;
   - confirmation it equals the accepted SHA;
   - push output;
   - GitHub Actions deployment run ID/status;
   - checkout, frontend build, SSH source deployment, and dist deployment results.
5. Set Phase 8G to `AWAITING LIVE VALIDATION` only after deployment succeeds. If deployment fails or the pushed SHA differs, stop and report.

## Live Acceptance Pending
After successful deployment, ChatGPT must validate OMNIA Basic across Plan Details, cart View details, Review & Finalise Quote, expanded proposal, and Print/Save-as-PDF. Foundation Bundle children must appear everywhere while the parent remains priced once at $4,000/month and all totals remain unchanged.

## Production Push Record

- Status: PUSHED
- Pushed by: Claude Code
- Pushed at: 2026-08-29
- Pre-push check: `origin/main` confirmed exactly `5b97287032a4bb00e2d8849fde4ed30f42917eab` before push — matched, no divergence. Local `main` checked out fresh from `origin/main` (same SHA), then fast-forward merged to `phase-8g-bundle-inclusion-parity@41c31b41...` (confirmed via `git ls-remote origin phase-8g-bundle-inclusion-parity` to be the exact accepted SHA before merging) — no amend/rebuild/squash/cherry-pick, pure fast-forward.
- Push output: `5b972870..41c31b41  main -> main`
- Full `main` commit SHA (confirmed via `git ls-remote origin main`): `41c31b41ba51d594f1a4896c2a9ab7175b3f02cc` — equals the accepted SHA exactly.
- GitHub Actions run: `33254216051` ("Deploy to Hostinger"), triggered by push on 2026-08-29
- Workflow result: `SUCCESS` (confirmed via the public `api.github.com/repos/.../actions/runs/33254216051` endpoint, polled until `status: completed` — `conclusion: success`)
- Job/step-level results (via `.../actions/runs/33254216051/jobs`), all `success`: Set up job; Checkout repository; Setup Node.js; Install frontend dependencies; Build frontend assets; Deploy source via SSH; Deploy built dist assets via SCP; Post Setup Node.js; Post Checkout repository; Complete job.
- Deployment result: workflow-reported success for deployed SHA `41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`, including successful frontend build, SSH source deployment, and SCP dist-asset deployment steps individually. Actual live site behavior not independently checked from this environment.

## Live Browser Validation
- Status: NOT STARTED (this environment has no browser access to `https://compuzign.weerax.com/pricing/` — Nath/ChatGPT performs this check per "Live Acceptance Pending" above, covering OMNIA Basic's Foundation Bundle children across Plan Details, cart View details, Review & Finalise Quote, expanded proposal, and Print/Save-as-PDF, plus confirming the parent stays priced once at $4,000/month and all totals remain unchanged)
