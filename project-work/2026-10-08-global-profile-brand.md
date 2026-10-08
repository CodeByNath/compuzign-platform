# Global Settings → Profile / Brand

## Status
**AWAITING REVIEWER REVIEW** — Phase 0 discovery report below. No product source changed.
Builder: Claude (VS Code). Reviewer: ChatGPT. Owner/live validator: Nath.
Verdict: **Proceed with safeguards** (planning only).

## Authority and complete scope
Read `project-work/AGENTS.md` and companion [handover + locked multi-phase plan](2026-10-08-global-profile-brand-handover.md), then root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps and actual `main` source. Do not implement from chat memory.

Requested path: **Service Station → Settings → Profile**, but configuration has **platform-wide ownership and persistence**. One Brand block: logo; square favicon; name <=60; uppercase letters-only code <=6; media preview/Pick/Clear; help per field; one Save; blank/clear valid; platform permission; remain on screen with confirmation. Header uses 64×64 favicon and code; dashboard defaults for blank name/code; public logo never in dashboard.

## Baseline / branch prerequisite
Planning `main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`.
Only three branches allowed. Existing `tier-inclusion-unit-price-copy-order` points to `main`; authorized Builder must verify merged ancestry and remove stale branch before creating a topic branch. Reviewer must not manipulate branches.

## Current authorized task — Phase 0 only
1. Inspect actual Settings presentation, global storage conventions, APIs, `PlatformAccess::CAP`, media-library capability and square-dimension checks, Admin header and possible public consumers.
2. Map single authoritative global profile owner and data schema, REST permissions, atomic save and fallback behaviour; show exact code files and tests to change.
3. Identify WordPress media access for `cz_platform_manager` without broadening unrelated permissions.
4. Record proposal, unknowns, compatibility risks and evidence in **this work file**; set `AWAITING REVIEWER REVIEW` and stop. **No product code changes during Phase 0.**

## Subsequent phases (not yet authorized)
1. Platform-wide persistence + secured read/save.
2. Profile UI and Settings entry.
3. Header/public consumption with defaults.
4. Tests, independent source review, approved production push, deploy evidence and Nath live validation.
See companion handover for exact acceptance checks and exclusions.

## Immutable exclusions
No Service-owned profile data, WEX implementation, new Station/framework, autosave, new public pages, or changes to pricing, Tier, quote, Package, lifecycle or customer flows.

## Reviewer handoff
Reviewer audits Phase 0 report and records **Proceed**, **Proceed with safeguards**, or **Stop — architectural risk** here; only then authorizes Phase 1. At code phases Builder pushes only the topic branch, records exact SHA and `AWAITING REVIEWER REVIEW`; Reviewer independently checks and sets `SOURCE PUSH APPROVED` or `SOURCE PUSH NOT APPROVED`. Builder deploys only approved SHA; Nath validates live; Reviewer closes from evidence.

## Phase 0 Builder report — 2026-10-08
Base `main` `8d1f0185`. Stale `tier-inclusion-unit-price-copy-order` verified ancestor of `main` and deleted; repo back to two branches. No topic branch yet.

**Nath directive (this cycle):** image selection is **not** a WordPress media picker. Profile is a CompuZign platform feature on platform terms.

**Evidence.** No platform owner, option, route or brand consumer exists. Header brand is hard-coded `CompuZign` in `admin-station/shell/AdminStationHeader.tsx` (`.cz-station-brand`); login gate / access-denied templates also hard-code it. No image/upload/file capability exists anywhere in `resources/ts`, `src` or `app`. Settings is `service-station/presentation/ServiceSettingsLane.tsx` (two launchers) inside `ServiceLowerDeck.tsx`. All admin routes gate on `current_user_can(PlatformAccess::CAP)`; `cz_platform_manager` holds only `manage_compuzign` + `read`. Single-option atomic precedent: `PackageRepository::saveStation()` (write + read-back compare). Platform-wide backend precedent outside Station Manager: `src/PlatformIdentifier/`. Bootstrap data: `AssetLoader::outputRuntimeConfig()` → `window.CompuZignConfig`.

**Classification.** Platform singleton configuration, rung 1 — no Platform ID family (nothing addresses it independently; WEX later reads the one profile).

**Proposed owner.**
- Backend `src/PlatformProfile/`: `PlatformProfileStation.php` (schema, sanitize/validate, image handling, persistence, resolved read projection with defaults) + `PlatformProfileController.php`; wired once in `Core\Plugin::boot()`.
- Storage: one option `cz_platform_profile` → `{version, brand:{name, code, logo:Asset|null, favicon:Asset|null}, updated_at, updated_by}`; `Asset = {file, mime, width, height, sha256}`. Files live in platform-owned `uploads/compuzign/brand/`, not WP attachments.
- Routes: `GET /compuzign/v1/platform/profile`, `POST` same (multipart: fields + optional files + `clear_logo`/`clear_favicon`). Permission `PlatformAccess::CAP` + REST nonce. No `upload_files`, no role change — the platform validates and stores its own files.
- Atomic save: validate everything first (name ≤60; code `^[A-Za-z]{0,6}$` stored uppercase; PNG/JPEG/WebP only, no SVG; real dimensions via `getimagesize`; favicon width==height) → write new files to temp names → `update_option` + read-back compare → then delete superseded files; any failure removes new files and leaves the option unchanged.
- Frontend `resources/ts/platform-profile/` (types, api, `usePlatformProfile`, `BrandProfileEditor.tsx`, barrel). Pick = native file chooser; draft preview via object URL; client square check on pick, server re-check on Save; one Save; in-place confirmation. Service Settings lane only hosts it as a "Profile" section — no Service data/meta.
- Header: `CompuZignConfig.platformProfile` seeds a small read store in `platform-profile`; Save updates it so the header reflects it without reload. Favicon 64×64 + code beside it; blank → existing `CompuZign` label. Logo never rendered in dashboard.
- Public: no consumer exists; expose `PlatformProfileStation::resolved()` as the documented read seam; build no public UI.
- Not a lifecycle record: no Pending/Publish, drawer or footer.
- Docs: new Code Map `platform-profile.md`; update `admin-station.md`, `service-station.md`.

**Unknowns for Reviewer/Nath.**
1. Platform-owned file storage vs handover's "existing media-library image / no custom media storage" — Nath's directive overrides; confirm.
2. File size caps (propose favicon 1 MB, logo 5 MB) and minimum favicon size (propose ≥64 px).
3. "Main colour" token for the favicon box.
4. Do login gate / access-denied count as full-name contexts? Quote page/email keep `get_bloginfo('name')` (out of scope).
5. Profile placement inside Settings: section beneath the two launchers, or a Settings sub-tab.
