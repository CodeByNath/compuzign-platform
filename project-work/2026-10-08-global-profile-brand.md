# Global Settings → Profile / Brand

## Status
**AWAITING REVIEWER REVIEW — Phase 1A design report below (CZPS/CZPSP, 2026-10-08). No source changed.**
Builder: Claude; Reviewer: ChatGPT; Owner/live validator: Nath.
**Verdict: Proceed with safeguards** for Phase 0 architecture. No Phase 1 source implementation until Phase 1A review.
Base `main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`; previous topic branch cleaned. Current coordination only.

## Binding authority
Read `project-work/AGENTS.md`, [locked full handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, source and focused Code Maps, **especially `docs/code-map/platform-identifier-station.md` and `src/PlatformIdentifier/PlatformIdentifierPolicy.php`**. CompuZign owns platform Profile, storage, media, permissions, validation, identity and API. Service Settings is only its temporary presentation entry. Never infer data ownership from runtime or host APIs.

## Owner decisions
- **Image Option A approved (2026-10-08):** accept image selection regardless of extension, securely decode/inspect; convert to browser-safe image when possible; otherwise clear error and no partial save. Square favicon verified on Pick and Save.
- **New explicit requirement:** Profile MUST have durable platform-owned storage, **Platform ID integrated with the existing Platform Identifier Station**, and documented working API routes. This supersedes Phase 0's suggestion that a singleton should have no Platform ID. Do NOT invent a prefix in consumer code. The Identifier Policy is a closed vocabulary and neither Settings nor Profile type is registered today. **Owner selected `CZPSXXXXX` for Platform Settings and `CZPSPXXXXX` for child Profile**. Both pass existing five-suffix anchored-format compatibility in source. Prefixes require central Policy registration by Builder after design approval; never coin IDs elsewhere.

## Phase 1A — authorised design task (NO source changes)
Provide a concise contract proposal, with actual source evidence:
1. **Identity:** Review Owner's `CZPS` parent Settings and `CZPSP` child Profile prefixes against the Policy and global uniqueness. Design genuine durable singleton **Platform Settings** parent + **Profile** child records, separate immutable IDs, stable native references, parent relationship, bootstrap/reservation/binding/lookup/rollback and recovery; both IDs must be minted by the existing Platform Identifier Station, never reminted on Save. Ensure the parent is a real authoritative Settings root, not a placeholder or a new frontend Station. Flag any mismatch with current source before coding.
2. **Storage:** stable global Profile record/schema/version/revision plus linked platform asset keys, durable adapter and atomic/consistent file + metadata lifecycle across upgrades/redeploy; conflict/crash recovery, permission and concurrency proof. Profile never uses Service or user records.
3. **APIs:** propose exact authenticated **GET + Save** Profile endpoints and read-by-Platform-ID route for `CZPSP`, plus minimal parent Settings read/lookup contract for `CZPS`; define payloads exposing correct parent/child IDs and relation, ETag/revision or equivalent, MIME/upload validation, permissions, nonce, errors/409, and asset URL policy. Do not expose editable settings anonymously. No routes that expose editable profile data to anonymous users.
4. Test matrix for creation/reload, parent+child singleton identity stability, parent-to-profile linkage, both ID lookups, immutability, permission denial, missing image, clear, conversion error, conflicting Save, storage/registry mismatch, partial bootstrap and recovery.
5. Mark minimal exact changed files/code maps, proposed identity prefix and any owner decision needed. Report **in this same work file** with `AWAITING REVIEWER REVIEW`; stop.

## Next gated phases
**1B:** only after Phase 1A approval, implement platform Profile identity, persistence, safe asset storage/conversion and APIs + backend tests on one topic branch; independent source review required.
**2:** Settings UI (four fields, one Save).
**3:** favicon 64×64 on main colour, code/name defaults, safe public read seam.
**4:** full tests, source/release verification and Nath live validation.

## Exclusions
No WEX implementation, new Station, general media framework, host profile/media ownership, Service-owned profile, pricing/Tier/Package/quote changes, autosave or unrelated redesign. Keep one work file; no phase advance without reviewer acceptance.

## Phase 1A Builder report — 2026-10-08
Evidence: `PlatformIdentifierPolicy.php`; `PlatformIdentifierStation.php` (`reserve`/`assign`/`ensure`/`resolve`/`lookupNative`); `PackagePlatformNativeReference.php` (length-prefixed refs); `ServiceController::fetchDetailByPlatformId` + `rejectPlatformIdMutation`; `RequestRepository` CAS lock; `deploy.yml`.

**1. Identity — Owner prefixes verified compatible.**
- Policy entries (registered in 1B): `PLATFORM_SETTINGS='platform_settings'`→`CZPS` and `PLATFORM_SETTINGS_PROFILE='platform_settings_profile'`→`CZPSP`. Full IDs are 9 and 10 chars. The anchored regex separates them from each other and from `CZPG`/`CZPRC*`, as with `CZT`/`CZTA`. A `CZPS` suffix may begin with `P`, which is visually similar but never ambiguous to the engine.
- Native refs (own helper, same `context:len:value` encoding): parent `platform-settings:6:global`; child `platform-settings-profile:6:global7:profile` (parent-qualified, rung 2).
- **Parent is real:** option `cz_platform_settings` = `{schema_version, platform_id, sections:{profile:{platform_id, record:'cz_platform_profile'}}, created_at, updated_at}`. It is the platform-wide Settings root and section index, and the only owner that creates or links sections. It holds no brand data. **Owner/Reviewer: confirm this scope is sufficient (not decorative).**
- Mint only at the first successful Profile Save, under the save lock:
  1. `ensure(parent)` — write callback sets parent `platform_id`.
  2. `ensure(child)` — sets Profile `platform_id` + `parent_platform_id`.
  3. Parent `sections.profile` link (CAS).
  4. Field commit.
- `ensure()` is idempotent, so later Saves mint nothing. A client-sent `platform_id`/`parent_platform_id` is rejected.
- **Partial bootstrap:** parent bound but child missing → the next Save resumes at step 2. An orphan reservation is harmless and never reused. A stored ID whose registry state is not `bound`, or a parent link disagreeing with the child's `parent_platform_id`, fails closed with **409 `settings_identity_conflict`**, nothing committed. No backfill tool (singletons).

**2. Storage.**
- Profile option `cz_platform_profile` (non-autoloaded) = `{schema_version, platform_id, parent_platform_id, revision, brand:{name, code, logo:Asset|null, favicon:Asset|null}, updated_at, updated_by}`.
- `Asset={key:"sha256.ext", mime, width, height, bytes, source_mime}`. Port `BrandAssetStore`; adapter `UploadsBrandAssetStore` → `uploads/compuzign/brand/`, outside the deploy checkout, server-named files, confined path.
- Save: validate + decode → convert if needed → write immutable files → lock → identity steps → `revision` check (409) → `update_option` (single commit, `revision+1`) → sweep unreferenced files older than a grace window → unlock.
- Crash before commit leaves the old record and its files intact; crash after commit references only complete files.

**3. APIs** (all `PlatformAccess::CAP` + `X-WP-Nonce`; none anonymous).
- `GET /compuzign/v1/admin/platform-settings` → `{platform_id, sections:{profile:{platform_id}}}`.
- `GET /compuzign/v1/admin/platform-settings/(?P<platform_id>CZPS[A-Z0-9]+)` → `resolve()`, which must be bound/`platform_settings`/global; else 404/409.
- `GET /compuzign/v1/admin/platform-settings/profile` → `{platform_id, parent_platform_id, revision, brand}`. Each asset is `{url, width, height, mime, missing}` or `null`.
- `POST` same path, multipart: `expected_revision`, `name`, `code`, `logo`/`favicon`, `clear_*`. Responses:
  - `200` projection
  - `400` field errors
  - `409` revision/identity conflict
  - `415`/`422` undecodable, unconvertible or non-square image
  - `500` storage failure, nothing committed
- `GET /compuzign/v1/admin/platform-settings/profiles/(?P<platform_id>CZPSP[A-Z0-9]+)` → same projection.
- Before the first Save, IDs are `null`; reads never mint.
- Option A: decode by content; convert only where the host runtime can. GD/Imagick on Hostinger is **unknown** — 1B probes and reports. Never store or serve raw SVG.
- Asset URLs are public static (brand material); editable data is never anonymous.

**4. Tests** (`tests/platform-settings-*.php`):
- first Save mints both IDs and links them; reload equality; repeat Saves keep both IDs
- reads mint nothing; both read-by-ID ok/404/wrong-type/conflict; client IDs rejected
- permission denial on all routes
- clear, blank, name/code bounds; non-square favicon on Save
- conversion unavailable leaves the record unchanged; missing file → `missing:true`
- stale revision 409; lock contention
- registry mismatch and broken parent link fail closed
- partial bootstrap resumes; crash before/after commit; sweep keeps referenced files

**5. Files.**
- New: `src/PlatformSettings/{PlatformSettingsStation, PlatformSettingsNativeReference, PlatformProfileRepository, PlatformSettingsController, BrandAssetStore, UploadsBrandAssetStore}.php`, tests, `docs/code-map/platform-settings.md`.
- Edited: `PlatformIdentifierPolicy.php` (two entries), `Core/Plugin.php`, `platform-identifier-station.md`, `000-README.md`.
- **Owner decision:** mint at first Save (recommended) vs at activation.
