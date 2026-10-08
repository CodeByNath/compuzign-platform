# Handover — CompuZign Platform Global Profile / Brand

**Authority:** Owner's requirements and repository architecture govern. This is a **CompuZign Platform feature**. Its business Profile data, contracts, assets and permissions are not WordPress user profiles, WordPress media records or Service Station data. Hostinger/WordPress currently provide runtime and physical storage only; platform contracts must not depend on their identity or UI model. Host storage APIs may be used behind a platform-owned adapter when verified safe. No WEX implementation now.

## Locked screen and behaviour
Temporary navigation: **Service Station → Settings → Profile**; ownership remains globally platform-wide. Profile contains one **Brand** block in this exact order:
1. **Brand logo:** image selection with preview / Pick / Clear / one-line help; any image (safe supported decoding to be established without silently narrowing requirement). Public-facing asset, **never displayed in dashboard header**.
2. **Brand Favicon:** same controls, square required. Reject nonsquare on Pick with message and again on Save; in dashboard header 64×64 box on the main colour. Blank is valid.
3. **Brand name:** plain text, <=60 characters, blank valid; full-name display contexts use value, dashboard existing default label if blank.
4. **Brand Code:** letters A–Z only, uppercase display/storage, <=6 characters, no minimum, blank valid; display beside favicon in header, fallback to existing dashboard label when blank.

Selection updates **unsaved preview immediately**. One Save for all fields; no autosave or partial commit. Success leaves user on Profile with confirmation. Platform permission gates screen and reads/writes. Clear and blank are accepted; defaults are display-only, not persisted as invented brand values. Define missing/broken assets fallback. Preserve dark/light UI and existing Service workflows.

## Phase gates — no diversion
**Phase 0 — Evidence/architecture (active; awaiting revised Builder proposal):**
- Read `AGENTS.md`, `docs/ai-index.md`, focused Code Maps and actual source. Confirm global Profile domain boundary and minimal wiring to shell and Service Settings.
- Builder discovered no pre-existing platform profile, brand-image system or consumer; proposed backend `src/PlatformProfile/` and frontend `resources/ts/platform-profile/`. Proposed files and native file chooser are **not yet accepted design**.
- Choose and justify a platform-owned asset picker/storage mechanism; where no platform library exists, explain the smallest solution preserving Pick/Clear with no host media/profile coupling.
- Demonstrate adapter storage durability across plugin upgrades/deploys, path and URL safety, allowed formats, upload auth, dimension checks, atomicity across asset+record writes, concurrent writers and fallback. Do not assume an option read-back is a transaction.
- Identify the actual main-colour token, existing dashboard fallback behaviour, Profile navigation/screen composition, exact files, contracts and tests. Resolve image limits and display contexts with Owner before hard-coding new product restrictions.
- Reviewer approves the corrected design in the **same active work file** before Phase 1. No product source edits in Phase 0.

**Phase 1 — Platform-owned backend:** One globally authoritative persisted Profile schema; host storage adapter is internal. Secured read/atomic write, safe asset management, validation, clear/unset, error/recovery/concurrency tests, no Service record or user profile.

**Phase 2 — Settings Profile UI:** Profile navigation, exact four controls and help, validated previews/draft state, one Save and confirmation, keyboard/a11y and dark/light responsive parity. Existing create launchers stay intact.

**Phase 3 — Header/public read:** Favicon 64×64 and code, consistent saved-state update and defaults, full brand name only where appropriate. Public logo gets a safe platform read contract; don't invent public UI if no consumer exists.

**Phase 4 — Verify and release:** Test valid/invalid/blank/media/square/permission/failure/concurrency/fallback/persistence, nonregression and reload; update affected Code Maps. Claude pushes reviewed topic SHA only; independent Reviewer inspects real diff and test evidence before `main`. Confirm GitHub Actions vs deployed runtime separately. Nath does live UI validation; Reviewer closes from matching evidence.

## Absolute exclusions
Do not derive Platform architecture from hosting, store Profile on Service or user records, introduce WEX adapter, new Station or general-purpose media manager beyond this task, change pricing/Packages/Tiers/quotes, add autosave, redesign unrelated shell, or invent new public sections.

## Workflow
Use `project-work/2026-10-08-global-profile-brand.md` as **single active status/report file** through every correction and approval. No new work file per round; keep it normally <=600 words. Builder Claude owns source editing and reports exact SHA. Reviewer cannot edit product source. Do not advance a phase without an independent acceptance verdict.
