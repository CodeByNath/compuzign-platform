# Global Settings → Profile / Brand

## Status
**AWAITING BUILDER RESPONSE — Phase 0 architectural correction only.**
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
