# Account Station → Settings → Tools → Profile — Active Work

## Status
**AWAITING REVIEWER REVIEW — Phase 1 backend pushed to topic only.**
Builder Claude; Reviewer ChatGPT. No `main` push/deployment; Phase 2 UI not started.

## Pushed topic
`global-profile-platform-settings` `125502d9` → `098999b6` (one commit, 13 files, 868 insertions, 0 deletions — pure additions on top of the already-accepted clean revert).

**Files:** `PlatformIdentifierPolicy.php` (+4 entity types `CZA`/`CZAS`/`CZAST`/`CZASTP`); `Modules/Account/{AccountModule.php, Http/AccountController.php, Support/AccountIdentity.php, AccountRepository.php, AccountSchema.php}`; `Core/Plugin.php` (wiring); `tests/account-station.php` (new); `tests/platform-identifier-station.php` (+4 locked-contract rows); `docs/code-map/account-station.md` (new, 550 words); `docs/code-map/{000-README.md, platform-identifier-station.md}` and `skills/.../platform-id-families.md` (cross-references).

## Design
Account Station owns one permanent singleton tree (Account Station → Settings → Tools → Profile) plus Profile's Brand section. `AccountIdentity::bootstrap()` mints/binds all four nodes idempotently through the existing `PlatformIdentifierStation::ensure()`, fixed constant native references (true singletons, no record id). `AccountController`: `GET` is strictly read-only (never mints); `POST .../profile` bootstraps-if-needed and writes the Brand draft in one request (Overview-Save-creates-the-record, matching Service); `.../profile/settle` promotes it; `POST .../status` is Publish (`StationLifecycle::publish()`) and Disable/Enable (same mask Service uses). A rejected Logo/Favicon attachment id fails the whole Save closed — no partial write. Logo/Favicon are WordPress attachment ids via the native Media Library; no bespoke upload/decode code.

**Lifecycle conflict, as instructed:** Archive/Trash/permanent-delete are not implemented. A singleton with no second instance has no legal travel destination — flagged per the Owner's own carve-out, not silently exempted.

## Tests
`php tests/account-station.php` — new, 28/28 checks pass against the real controller (bootstrap idempotency/parent-chain, rejected-attachment leaves no partial draft, full Publish/Disable/Enable). `php tests/platform-identifier-station.php` — **fails**, but not from this change: direct comparison confirms the only discrepancy is `tier_catalogue`/`tier_edition_catalogue`, present in `PlatformIdentifierPolicy` but missing from this test's locked `$expected` array on `origin/main` itself, before any of my edits. My own `request`/`account_*` rows are exactly correct. Not fixed — unrelated locked contract, outside this task.

## Other disclosed, not fixed
`docs/code-map/platform-identifier-station.md` was already 697 words (over the 600 limit) on `main` before my 4-line addition; still over. `npm run contract:platform-identity-schema` / `tsc` / `docs:check` could not run — this environment's Node/Homebrew `simdjson` is broken, unrelated to this change; manual grep substituted where possible.

**Branch-topology finding:** reconciling this topic branch (built on `origin/main`) against edits made while checked out on `Project-work-instructions` surfaced real conflicts in shared files — `Project-work-instructions` and `origin/main` have diverged in both directions (each has real commits/content the other lacks; `Project-work-instructions` is ~946 commits ahead on unrelated history while also missing some already-on-`main` doc content for these specific files). I resolved every conflict by keeping both sides (`main`'s `REQUEST`/`CZR` and Tier Catalogue additions, plus mine) and verified nothing was lost via direct SHA/tree comparison before pushing. I have not touched or reconciled that broader divergence — flagging it since it will surface again on the next merge.

No source touches outside the files listed above; `main` unchanged. Reviewer: please inspect the pushed diff before authorizing Phase 2 (frontend registration/drawer).
