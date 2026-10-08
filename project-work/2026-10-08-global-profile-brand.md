# Global Settings → Profile / Brand

## Status
**AWAITING REVIEWER REVIEW — revised Phase 0 proposal below (2026-10-08). No source changed.**
Builder: Claude. Reviewer: ChatGPT. Owner/live validator: Nath.
**Verdict: Proceed with safeguards; Phase 1 NOT authorised.**
Base `main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`.
Phase 0 Builder report: 2026-10-08; no source changed. Prior topic branch verified merged and removed; two branches remain.

## Authority
Read `project-work/AGENTS.md`, [locked handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps and current source. Product behaviour comes from repository authority and Owner decisions, never auditor memory or host conventions.

## Owner architecture correction (binding)
**CompuZign Platform owns the Profile schema, validation, images, access, API, read projections and lifecycle.** Service Station Settings is an entry point only. Host runtime/storage is an adapter/infrastructure detail. Never use or depend upon host user profiles, brand settings, media identities or admin UI. No Service record, post/meta, or per-user Profile. No WEX implementation in this phase.

## Verified Phase 0 findings
Source: `ServiceSettingsLane.tsx` currently contains only Create Service / Create Category launchers. `AdminStationHeader.tsx` hardcodes the dashboard brand. `Core/Plugin.php` wires platform subsystems. Backend platform-wide authority precedent exists (`src/PlatformIdentifier/`). Builder found no platform Profile, file picker or brand consumer. He proposed `src/PlatformProfile/` and `resources/ts/platform-profile/`, one singleton Profile record, platform-controlled files, secured read/save, draft preview and header projection. Public brand UI does not yet exist.

## Required bounded Phase 0 correction from Claude
1. Replace all WordPress-media-library/profile and WP-attachment assumptions in design. Propose **platform-owned asset selection and durable image references**, separating the platform contract from the host storage implementation. Identify exact picker/user flow if there is no platform media library. Do not silently reduce the Owner's Pick/Clear workflow to a different UX.
2. Address **'any image'** correctly: distinguish selectable image formats from safely decodable/servable formats; do not impose PNG/JPEG/WebP-only or new size/minimum limits as accepted rules without justification and Owner approval.
3. Define storage-adapter boundaries, deployment persistence, file path isolation, authenticated upload/read, content inspection, MIME safety, public logo URL policy and deletion/garbage-collection policy. Host APIs may implement storage internally but must never define product ownership.
4. Specify **single Save transactional semantics across metadata AND assets**, including conflict/concurrent-save cases, rollback/recovery, orphan cleanup and failure tests. Read-back comparison alone does not prove transactionality.
5. Identify established **main-colour token**, fallback label/icon/brand-name contexts, exact Profile navigation interaction, and minimal tests/code-map changes. Avoid broad redesign.
6. Revise only Phase 0 proposal/evidence **in this file**, retain concise current state, set `AWAITING REVIEWER REVIEW`, and stop. **Do not start Phase 1/source implementation**.

## Locked subsequent phases
1. Backend authority / persistence; 2. Settings Profile UI; 3. header + safe public read seam; 4. tests, independent source diff review, authorised deployment and Nath live validation. Detailed contracts are in handover.

## Exclusions / workflow
No Service-owned or user-owned Profile, new Station/general framework, WEX changes, pricing/quote/Tier/Package refactors, autosave, new public pages or host profile coupling. One work file, one phase at a time. Claude implements only after reviewer phase authorisation, pushes topic candidate and records SHA; Reviewer accepts/rejects actual diff, Nath validates live.

## Revised Phase 0 proposal — Builder, 2026-10-08
Supersedes the first report. Items map to corrections 1–5.

**1. Asset contract.** Profile stores a platform asset reference `{key, mime, width, height, bytes}` — `key` = `sha256.ext`, server-generated. No host attachment ID, filename or absolute URL is stored; URLs resolve at read time. Port `BrandAssetStore` (`put/exists/url/delete/keys`); host adapter `UploadsBrandAssetStore` is internal. **Pick** opens the device file chooser (`accept="image/*"`) — no platform library exists and a reusable library is excluded. **Clear** nulls the draft field. Both are draft-only until Save.

**2. "Any image".** Selectable = any `image/*`. Accepted = content-sniffed (never extension/client MIME) as a raster `getimagesize` decodes and browsers render: PNG, JPEG, GIF, WebP, BMP, ICO; AVIF needs PHP ≥8.2 (plugin floor is 8.0; host unknown). **Owner decisions, not imposed:** SVG (scriptable — reject, or serve sandboxed); HEIC/TIFF (not renderable in most browsers); any size cap beyond the host's upload limit. No minimum favicon size is imposed.

**3. Storage.** `wp-content/uploads/compuzign/brand/`: outside the deploy path (`deploy.yml` only checks out plugin/theme), untracked, survives plugin upgrade. Server-named files only, `realpath` confined to base, folder `index.php` + script-execution deny. Upload only via `POST /compuzign/v1/platform/profile` (`PlatformAccess::CAP` + REST nonce); no host `upload_files`. Assets are public static URLs (brand material, immutable hash names, cacheable). Unreferenced files are deleted only after a successful commit.

**4. One Save, transactional.** One multipart POST: fields + new files + clear flags + `expected_revision`. Validate all → write new content-addressed files (immutable; never overwrite) → claim the `add_option` lock (`RequestRepository` precedent) → compare stored `revision`; mismatch returns **409** with nothing committed → `update_option` (single commit point; revision++) → sweep unreferenced files older than a grace window, still under the lock, so another writer's uncommitted upload is never removed → release. A failure before commit leaves the old record intact and every file it references untouched; new files become orphans removed by the sweep. Concurrent writers: one wins, the other gets 409 and keeps its draft. Tests: invalid field/asset, 409, lock contention, crash before/after commit, sweep, clear/blank, permission denial.

**5. Display.** Main colour = `--station-accent` (#5c6ef5, theme-independent). Fallback = existing `CompuZign` header text. Missing asset at read → treated as empty for display; editor says "Saved image missing — Pick or Clear"; no write on read. **Conflict:** `--station-header-height` is **60px**, so a 64×64 box does not fit — Owner to choose header height or box size. Full-name contexts: only login gate / access-denied hard-code the name — Owner to confirm. Navigation (recommended): a third Settings row "Profile → Open" switches the lane to Profile with "← Settings"; Create launchers unchanged.

**Files (Phase 1–3).** New `src/PlatformProfile/{PlatformProfileStation,PlatformProfileController,BrandAssetStore,UploadsBrandAssetStore}.php`, `resources/ts/platform-profile/`, `tests/platform-profile-*.php`, `docs/code-map/platform-profile.md`. Edits: `Core/Plugin.php`, `AssetLoader.php`, `ServiceSettingsLane.tsx`, `AdminStationHeader.tsx`, `admin-station.css`, `admin-station.md`, `service-station.md`, `000-README.md`.
