# Admin UI Refinement

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Codex**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `35d48d4b931b7901374a182e12c6a3012a8281fd`
- Approved topic head: `35d48d4b931b7901374a182e12c6a3012a8281fd`

## Scope lock
Same Admin UI work item. Keep previously accepted items locked. No automatic backfill, migration-on-read, new maintenance mechanism, pricing/customer-flow change, or unrelated refactor.

## Reviewer audit
Reviewer independently inspected the pushed candidate and full topic delta from production. GitHub confirms `admin-ui-refinement` is 2 commits ahead, 0 behind, with merge base exactly current `main`.

Accepted candidate behavior:
- Occupant **Connections** tab remains restored with Package-owned relationships and obsolete Service Overview remains removed.
- Build Your Own spacing remains scoped.
- Tier Grid remains 2-per-row above 767px, capped at 1440px.
- Existing CompuZign Admin Platform-ID action remains unchanged as the deliberate repair path for genuinely missing IDs.
- Lower-deck Platform ID projection now preserves `platform_id` when normalized and falls back to stored `cz_platform_id` without minting, backfill, persistence write, or Admin-action invocation.

## Regression evidence
Commit `35d48d4b` changes only:
- `PackageManagerSchema.php`
- `tests/tier-rate-sheet-price-option.php`
- `scripts/package-tier-workspace-contract.ts`

The PHP regression proves a stored-only `cz_platform_id` is emitted as selection `platform_id`. The TS contract proves that value reaches `DeckInclusion.platformId` for the lower-deck row reference. Builder reports focused PHP/TS contracts, `package-manager-schema`, TypeScript, production build, docs check, and `git diff --check` passing; CSS retains only the known unrelated baseline findings.

## Production handoff

Builder fast-forwarded GitHub `main` from `9617c0ed` to the exact approved
`35d48d4b` head with no amendment or additional source change. GitHub Actions
started **Deploy to Hostinger** run `34738286772` / #1022 for that exact SHA;
at handoff its authoritative state is `queued` with no conclusion. Reviewer
must verify the resulting deployment state and then perform targeted live
validation of this Admin UI round before any closure decision.
