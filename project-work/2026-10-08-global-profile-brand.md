# Global Settings → Profile / Brand

## Status
**BLOCKED — DECISION REQUIRED (Phase 0 reviewed).** Phase 1 not authorised.
Builder: Claude; Reviewer: ChatGPT; Owner/live validator: Nath.
**Verdict: Proceed with safeguards** on architecture, conditional on the owner decision below.
Production baseline: `main` `8d1f0185811e69214c0fd85c29819eef0c5d9226`.
Instruction branch's Phase 0 proposal reviewed 2026-10-08; no source changes. Stale topic branch cleaned; two branches remain.

## Authority / non-negotiables
Read `project-work/AGENTS.md`, [complete locked handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps and current source. **CompuZign** owns Profile records, assets, access, validation, API and defaults; Service Settings is a temporary UI entry only. Host runtime/storage adapters are implementation details, never business or media identity owners. No Service or user Profile persistence; no WEX changes.

## Builder's revised Phase 0 proposal — reviewer findings
Builder proposed `src/PlatformProfile/` owner, `resources/ts/platform-profile/` frontend, versioned singleton Profile, platform asset references `{key,mime,width,height,bytes}`, an internal `BrandAssetStore` adapter and deployment-independent asset directory. Pick uses native file chooser because no platform library exists. One multipart Save validates fields/files and checks expected revision under a lock before swapping stored Profile revision; orphan assets later swept. Header reads a platform projection; missing assets display fallbacks.

Independent source review confirms `ServiceSettingsLane.tsx` currently has only two create launchers; `AdminStationHeader.tsx` hardcodes CompuZign; `Core/Plugin.php` has platform subsystem wiring; Admin presentation and Service domain ownership remain separate. Deployment workflow checks out plugin/theme, not brand uploads; persistence path still requires deployed-host verification.

**Safeguards to retain:**
1. `BrandAssetStore` is a **platform-defined port**, not a generic media framework. Hash keys are opaque; secure inspection, URL policy, asset directory protection, durable storage and appropriate GC are mandatory.
2. Native file picker satisfies **Pick**, but must retain immediate draft preview / Clear and one Save. Existing media library is *not* a dependency.
3. A read-back is not an atomic transaction. Prove lock acquisition/recovery, compare-and-swap revision under lock, safe commit ordering across files and metadata, failure/crash cleanup, concurrent edits, and zero deletion of still-referenced assets. No destructive sweep on an uncertain state.
4. **64×64 favicon box is already Owner-locked.** Phase 3 must adapt header layout/height safely rather than shrink the favicon. Header default label and main-colour token must be confirmed against actual styles.
5. Full-name uses should not automatically rewrite login, access-denied, quote or email surfaces without proven consumer intent. Preserve existing labels otherwise.

## Owner decision required to unlock Phase 1
**“Any image” handling**: builder lists PNG/JPEG/GIF/WebP/BMP/ICO as safe display formats, while SVG/HEIC/TIFF/AVIF require special treatment. Choose: **A)** accept any user-selected image that can be securely decoded and convert unsupported formats to a safe web format where runtime capability exists (clear error otherwise), or **B)** limit accepted formats to an explicit published set with clear rejection message. Neither restriction nor conversion should be silently assumed. No arbitrary size/minimum constraints authorised beyond verified technical limits.

## Locked later phases
1. Backend platform Profile + asset adapter; 2. Settings Profile screen; 3. dashboard header/public read seam; 4. tests, independent source review, approved push, deployment and Nath live validation.

## Next action
Await Owner's image-policy decision. Reviewer records it here and releases **Phase 1 only** with the safeguards above; Claude must then implement phase-bounded source changes on one topic branch. No product edits during this gate. Keep review/status in this same file.
