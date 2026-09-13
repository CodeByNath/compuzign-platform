# Admin UI Refinement

## Status
- **READY FOR BUILDER**
- Builder: **Codex**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `35d48d4b931b7901374a182e12c6a3012a8281fd`
- Topic branch: reuse `admin-ui-refinement`

## Live defect
Nath confirms the lower-deck Platform ID is still absent because the underlying legacy Rate Sheet row has **no Platform ID assigned**. The read-projection fallback is correct and remains accepted; this is now an existing-record assignment/UI availability issue.

The required mechanism already exists in CompuZign Admin as the one-time Platform-ID assignment action. It must be made available/active for the current Package/Tier legacy scopes, including Rate Sheet Items (`package_rate_card_item` / `CZPRCI`). **Reuse the existing action only.**

## Mandatory source/doc audit before changing anything
Read and reconcile the current implementation against:
- `docs/code-map/platform-identifier-station.md`
- `docs/platform-identifier-roadmap.md`
- root `AGENTS.md`, `docs/ai-index.md`, and Package Station Code Map
- `src/PlatformIdentifier/PlatformIdentifierStation.php`
- `src/PlatformIdentifier/PlatformIdentifierPolicy.php`
- `src/PlatformIdentifier/TemporaryMigrationController.php`
- the existing Admin migration notice/action component and its mount point
- the Package identity adapters/enumerators used by the temporary controller
- relevant Platform Identifier tests/contracts and Git history for the Package/Tier rollout.

Important: the roadmap contains older phase/ledger text. Treat current authoritative source + current Platform Identifier Code Map + verified later rollout history as authority where that older ledger is stale. Do not disable a currently integrated Package scope because an old phase table says it was pending.

## Required outcome
1. Existing one-time Admin Platform-ID action is visible/active whenever any supported legacy Package/Tier scope is incomplete.
2. Confirm `package_rate_card_item` / CZPRCI is included in the controller's supported progress/preflight/assignment scope and actually participates in the button's incomplete-state calculation.
3. If other currently integrated Package/Tier scopes are already part of the same temporary rollout, preserve them. Do not narrow the existing action just to CZPRCI.
4. Button/action remains **explicit admin-triggered only**. Do not auto-run assignment, migrate on read, mint from presentation code, or mutate live data during implementation/testing.
5. Do not create a second repair endpoint/button/command or parallel migration state.
6. Preserve the accepted lower-deck projection fix and all other accepted Admin UI work.

If source proves the backend already supports CZPRCI but the notice is hidden by stale completion/version/progress gating, fix that gating in the existing mechanism rather than inventing another path. If the scope itself is missing from the current temporary controller despite current identity integration, extend that existing controller through the established owner adapter pattern only.

## Validation
Add/extend focused contracts proving:
- an incomplete supported Package scope causes the existing Admin action to be available;
- `package_rate_card_item` is covered by dry-check/progress/assignment enumeration;
- completed state hides/disables the action only when all supported scopes are genuinely complete;
- no write occurs until the explicit action is invoked.

Run Platform Identifier + Package identity contracts, relevant Admin notice/controller contracts, TypeScript, build, docs check, and `git diff --check`.

## Builder handoff
Implement on `admin-ui-refinement`, push the topic branch for independent review, record exact SHA/files/tests here, set **AWAITING REVIEWER REVIEW**, and stop. Do not push `main`.
