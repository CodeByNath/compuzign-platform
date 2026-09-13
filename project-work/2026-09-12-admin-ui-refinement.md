# Admin UI Refinement

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Codex**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `35d48d4b931b7901374a182e12c6a3012a8281fd`
- Topic branch: `admin-ui-refinement` @ `974c025c0d2d07421c6d6399834428bc95b9cf63` (pushed; `main` untouched)

## Live defect
Nath confirms the lower-deck Platform ID is still absent because the underlying legacy Rate Sheet row has **no Platform ID assigned**. The read-projection fallback is correct and remains accepted; this is now an existing-record assignment/UI availability issue.

The required mechanism already exists in CompuZign Admin as the one-time Platform-ID assignment action. It must be made available/active for the current Package/Tier legacy scopes, including Rate Sheet Items (`package_rate_card_item` / `CZPRCI`). **Reuse the existing action only.**

## Locked correction
The mandatory Platform Identifier/Package audit found current source already
supports CZPRCI through the controller, adapter, API, and one Admin action.
Use that action for every supported Package/Tier scope; never narrow it to one
scope or add an endpoint/button/path. Assignment remains explicit-admin-only:
no background write, migration-on-read, presentation minting, runtime
mutation, or change to the accepted lower-deck projection.

## Builder result — `974c025c`

The source audit confirmed CZPRCI was already present in the temporary
controller, Package adapter/enumerator, API union, and the one Admin action.
The defect was the notice trusting a historical `progress.complete` flag and
hiding before its zero-write dry checks could discover a later incomplete row.

The existing notice now dry-checks every supported scope on mount and hides
only when all are currently clear and conflict-free. The existing explicit
button reruns only scopes whose dry check reports missing IDs; it uses the
controller's existing safe restart behaviour for historically complete scopes.
No endpoint, button, command, migration-on-read, background assignment, or
presentation minting was added.

- Changed: `PlatformIdentifierMigrationNotice.tsx`, its sweep contract, and rebuilt `dist/js/admin-station.js`.
- Passed: temporary migration PHP; Admin migration sweep; Rate Sheet row identity; TypeScript; build; docs; `git diff --check`.
- Baseline: `contract:platform-identity-schema` still fails on unrelated malformed fixture literals in four existing scripts; no identity vocabulary/policy source changed.
- No browser/runtime mutation was performed. Candidate pushed only to the topic branch; do not push `main` pending independent review.
