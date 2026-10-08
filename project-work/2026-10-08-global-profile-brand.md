# Global Settings → Profile / Brand

## Status
**READY FOR BUILDER — Phase 1B backend implementation only.**
Phase 1A verdict: **Proceed with safeguards**, accepted 2026-10-08 by independent Reviewer.
Builder Claude; Reviewer ChatGPT; Owner/live validator Nath.
Production baseline `main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`. Two branches currently; Builder may create ONE topic branch.

## Authority and evidence
Read `project-work/AGENTS.md`, [full locked handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps and authoritative source. **Full Phase 1A Builder report** is retained in coordination commit `d90da4636ddafbe2f327979d86b412efe0c0d1d2`; condensation at `4e4a0bef` is not a substitute for its tests/file list. Current source verified: `PlatformIdentifierPolicy.php`, `PlatformIdentifierStation.php` (`reserve/assign/ensure/resolve/lookupNative`), Service Settings and Admin shell, and deployment config.

## Locked product decisions
CompuZign owns global Settings/Profile records, platform assets, API and permission logic; host runtime/storage is infrastructural. Service Station Settings is UI placement only. Two real singleton domain records:
- Platform Settings parent `CZPSXXXXX` (Policy entity `platform_settings`) — durable Settings root/section registry, not decorative.
- Profile child `CZPSPXXXXX` (Policy entity `platform_settings_profile`) — parent-linked brand record.
Both minted only by existing Platform Identifier Station; stable permanent IDs never regenerate on Save. Owner image **Option A**: securely decode arbitrary selected image, convert unsupported display formats when possible, otherwise error with unchanged persisted data. Square favicon on Pick and Save. One Save for whole Profile; blank/Clear allowed. Exact four-field UI and 64×64 favicon contract remain locked for later phases.

## Phase 1B — exact authorised implementation
Implement only backend Settings/Profile persistence, both Policy registrations and identity bindings, platform asset storage/conversion port + adapter, authenticated API read/Save/read-by-ID, tests and focused Code Maps. Use Phase 1A proposals from `d90da463`:
- Settings `cz_platform_settings` stores persistent parent ID/section link; Profile `cz_platform_profile` stores child ID, parent ID, revision and brand fields; opaque asset keys persist separate from host URLs.
- Authorised API: GET `/compuzign/v1/admin/platform-settings`, GET `/admin/platform-settings/{CZPS_ID}`, GET/POST `/admin/platform-settings/profile`, GET `/admin/platform-settings/profiles/{CZPSP_ID}`. All permission-gated. Route matching must not collide.
- First Save may create both identities; **validate inputs, assets, revision and lock BEFORE identity mutation**. Implement safe parent → child → link bootstrap, recovering partial writes without duplicate IDs. Every read-by-ID must verify forward+reverse binding, correct type/native reference, parent link and owner record. Never mint during read or repeat Save.
- Lock/revision 409 protection and **failure-safe cross-record commit** are essential: distinguish recoverable partial bootstrap from inconsistent identity; handle write/lock errors and crashes; never delete a referenced asset or report false success. Recheck concurrency before committing. Explicitly test failure injection and recovery; if a safe recovery cannot be proven, stop rather than deploy.
- Image inspection/conversion uses runtime-available secure decoders; unsupported -> clear error, no partial commit. File storage survives source deploys and excludes executable uploads/path escape. Establish public asset URL/read policy.
- Validate Profile ID immutability, blank/clear, limits/code uppercase, square favicon, missing asset, permissions and nonce on GET/POST, 404/wrong-ID, 409 conflicts, initial/repeat saves, rollback/recovery and durable reload.

## Handoff / phase gates
Update affected Code Maps and exact contracts. Push **topic branch only**, record exact remote SHA, files/tests/failures in this same file and set `AWAITING REVIEWER REVIEW`; stop. Reviewer independently inspects diff before approving production push. **Phase 2 UI, Phase 3 header and Phase 4 release are not authorised yet.** No Service-owned data, WEX changes, generic new framework, pricing/Package/Tier/quote edits, new public UI, autosave or deployment.
