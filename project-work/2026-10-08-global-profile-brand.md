# Manager Settings / Profile — Active Work

## Status
**AWAITING REVIEWER REVIEW — cleanup done, architecture mapped, no new implementation.** Builder Claude; Reviewer ChatGPT.

## Cleanup evidence
Topic `global-profile-platform-settings` reverted at `125502d9` (was `b434dfd4`), pushed. One revert commit undoes all three abandoned Phase 1B commits (`b434dfd4`, `236a345a`, `58cf5dc8`), no conflicts. `git write-tree` on the topic branch equals `origin/main`'s tree hash exactly — byte-identical to `main`, confirmed again by an empty `git diff origin/main HEAD`. All 19 added/modified files (9 new `PlatformSettings/` PHP classes, 3 new tests, `platform-settings.md` Code Map, plus 4 modified baseline files restored) are gone or restored. No package/lockfile/composer changes existed in the topic diff. Post-revert grep for `CZPS` and `*PlatformSettings*` across the topic worktree: zero hits. Confirmed pre-existing `main` had none of these references before the revert, so no baseline content was touched. History preserved — no reset, no force-push.

`npm run contract:platform-identity-schema` could not run (local Node/Homebrew `simdjson` dylib broken, unrelated to this change); the manual zero-`CZPS` grep above substitutes and found nothing.

## Architecture report (mapping only, no implementation)
Checked `station-manager.md`, `admin-station.md`, `platform-identifier-station.md`, `ai-index.md` against Manager → Settings → Tools → Profile:

- **"Manager" has no existing user-facing counterpart anywhere in source.** `station-manager/` is the internal frontend coordinator only (no UI, persistence, or domain data) — explicitly a different thing from this hierarchy per the owner's doc. No WP admin screen, no top-level nav destination named Manager exists today. The `'Settings'`/`'Tools'` tab labels that do exist (`ServiceLowerDeck.tsx`, `TierLowerDeck.tsx`) are per-entity drawer tabs, unrelated to a platform-wide area.
- **No current owner can host it as-is.** Admin Station has presentation/control only, no persistence authority; Station Manager is coordinator-only; Service/Package Stations own only their own domains. It would need to be a new Admin-hosted presentation destination, backed by plain WP options — not a new peer Station, not a new storage engine.
- **Unresolved contradiction:** four proposed ID levels (Manager/Settings/Tools/Profile) vs. Platform Identifier Station only minting identity for genuinely persistent, independently addressable records. Manager/Settings/Tools as described are navigational levels with no durable record of their own — only Profile (Brand first) has real field data. Minting ids for levels with nothing to store would be the "decorative identities" the owner's doc forbids.
- **Recommendation:** mint only what has a real record — one Settings-root WP option (parallel to the old single `CZPS` root, renamed into the approved family) with Profile sections as keyed children; give a child its own Platform ID only if the owner confirms it's independently addressable. Reuse the reverted `PlatformSettingsController`/`BrandImageProcessor` shape as reference for the next phase — none of it is restored on the topic branch, only present in pre-revert history.

No new hierarchy, Station, route, or storage was implemented. Reviewer: confirm (a) which of Manager/Settings/Tools get a minted Platform ID vs. pure navigation, and (b) the single-WP-option-with-child-sections model, before the next implementation phase.

## Authority
Read `project-work/AGENTS.md`, [handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, Station Manager/Admin Station/Platform Identifier Code Maps and source. Keep Settings as Settings, not a new Station; `station-manager/` stays coordinator-only.

## Owner correction — binding
Manager → Settings → Tools → Profile, prefixes `CZMXXXXX`/`CZMSXXXXX`/`CZMSTXXXXX`/`CZMSTPXXXXX` (five-char suffix each), retiring `CZPS`/`CZPSP`. Profile expands later (About, Locations, Contact, Social Media). No full Stations/databases per level; Platform Identifier Station remains sole mint/bind/lookup owner; no decorative identities.

## Verified state
`main` `8d1f0185`; topic was `b434dfd4` (19 files), now reverted to `125502d9`.

**Reviewer must approve cleanup and ID mapping before any new source implementation.** One work file; no new Station, WEX work, pricing changes, or deployment.
