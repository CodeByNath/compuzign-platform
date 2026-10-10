# Account Station → Settings → Tools → Profile — Locked Owner Handover

## Identity and ownership
**Account Station** is a fully governed peer Station, separate from `station-manager/` (coordinator), Admin Station (presentation host), and Platform Identifier Station (mint/bind/lookup). Settings, Tools and Profile are Account Station-owned **child records/modules**, not peer Stations. Hierarchy and approved prefixes (plus canonical five-character suffix):
- Account Station — `CZA`
- Settings — `CZAS`
- Tools — `CZAST`
- Profile — `CZASTP`

Earlier `CZM`, `CZBM`, `CZAM`, `CZPS` families are superseded for this feature. Use durable native identities and explicit parent links; do not treat display labels as identities or create unrelated persistence engines. Account does not automatically own WordPress accounts/authentication.

## Owner's binding lifecycle decision (2026-10-08)
**No singleton exception.** Account Station and its parts, **including Profile**, must follow the established `docs/architecture/StationDrawerLifecycleContract-v1.md`: Station-owned lifecycle/drafts, Overview Save → persisted Pending identity handoff, separate Publish → settled Active values, explicit Disable/Enable and valid record travel actions according to locked contract. Each genuine child/module follows the existing module states/availability, pills, notifications, drawer/edit/footer grammar, and parent activation rules where applicable. Keep identity immutable through transitions. A saved Pending Profile must NOT update live header/public Brand; only approved active/settled projection may do so. On Disable or other lifecycle travel, preserve drafts/history and use existing defined fallback semantics, not unapproved deletion. Do not invent nested drawers, a second status system, or arbitrary exceptions for permanent records. If a specific singleton action (e.g. permanent deletion of the root) conflicts with identity permanence, flag that exact case for Reviewer before implementation rather than silently changing locked lifecycle.

**One Save** means one Save per Brand editor interaction, **not bypassing Publish**. Future multi-user and permission levels motivate preserving the Station lifecycle; they are **deferred**, not authorised now. Use current `PlatformAccess` permissions and authenticated REST.

## Brand first, future sections later
Profile Brand: public-site Logo (not dashboard header), square Favicon shown in 64×64 Admin header box, optional Brand Name ≤60 characters, optional Brand Code uppercase A–Z ≤6. Pick/Clear, immediate unsaved preview, Save stays in Profile with confirmation; blanks valid. Validate/convert images safely; reject unsafe files and partial writes. Future Profile sections: About, Locations, Contact, Social Media and more, without prebuilding them.

## Architecture and build discipline
Read root `AGENTS.md`, `docs/ai-index.md`, `docs/code-map/station-manager.md`, `docs/code-map/admin-station.md`, `docs/code-map/platform-identifier-station.md`, `docs/architecture/StationDrawerLifecycleContract-v1.md`, conforming Service/Category source and boot sequence. Peer registers before Station Manager finalize; Admin hosts UI, Account owns API and persistence. Use existing WordPress-backed storage behind Account-owned domain contracts. No extra DB, generic CAS engine, added packages, ACF dependency, or WEX implementation. Keep Profile-compatible platform API for future WEX adapters. Previously abandoned `PlatformSettings` code was fully reverted and must remain absent. Code ≤600 physical lines/file; Code Maps/work files ≤600 words.

## Phases and authority
Cleanup accepted: topic `global-profile-platform-settings` at `125502d9` has the same tree as `main` `8d1f0185`. Owner's lifecycle decision closes the design choice; continue **one bounded implementation phase at a time**, with Reviewer audit before source promotion. Claude alone edits source; Reviewer changes only coordination files. No release until exact candidate review and subsequent approved live validation.

## Owner-locked atomicity and future Flow model (2026-10-10)
**Required notice before every phase:** Account Station is a permanent peer capability in CompuZign. Account, Settings, Tools and Profile are separately identifiable, parent-linked atomic parts (CZA/CZAS/CZAST/CZASTP); they are not four user-created Services or just navigation labels. Platform registration, durable first-use identity binding, lifecycle, and actual Brand publication are distinct concerns. Preserve the approved idempotent first-Save identity binding unless verified platform evidence disproves it. An individual atomic part can be controlled through the governed Station drawer; future grouped/onboarding/integration Flows may orchestrate several parts, including a full-screen drawer presentation, but never take their ownership, identity, lifecycle, persistence or permissions. **Do not implement the future Flow engine now.** Use the same drawer contract, not a second editor/status system. Always compare with the correct permanent-Station baseline first, then with Service/Category for lifecycle UI; explicitly classify baseline behavior vs proven defect vs unverified concern.

## Complete bounded delivery map (one work item)
Phase 1 **DONE**: Account backend, four-node identity tree, existing draft/status routes; existing integration gaps are not waived.
Phase 2A **CURRENT**: repair proven first-Save UI identity display and explicit-null Logo/Favicon Clear on topic `account-station-profile-ui-slice`; preserve Account-owned state and existing single drawer. Add mounted regressions and do not broaden scope.
Phase 2B **AFTER REVIEW**: complete Brand UI acceptance (Name/Code, public Logo, Admin 64×64 Favicon placement, picker/Clear/preview/confirmation, Pending→Publish/Disable/Enable and accessibility), resolving only missing requirements against real source and established shells.
Phase 2C **AFTER REVIEW**: technical integration verification for all six locked gates in the active work file using a safe non-production environment; if environment unavailable record a hard acceptance blocker rather than substitute production changes.
Phase 2D **AFTER REVIEW**: independently approved candidate → exact `main` push/Actions/Hostinger SHA verification → read-only live UI observation, and Owner UI judgment where meaningful; close only with complete evidence.
Future (NOT part of this execution): other Profile sections, user roles/permissions, Flow orchestration/full-screen flow UX and WEX adapters. Each requires its own approved scope.

Claude may batch planning and prepare phase-specific commits on the **same** topic branch to reduce interruption, recording each phase's tests, changed files and SHA, but must stop at required independent **source approval, production promotion and live acceptance** gates. Never self-approve. Stop immediately for architectural/persistence/identity/security incompatibility, unapproved new capability, unsafe production mutation, or missing mandatory evidence. Do not treat normal phase progression as authorization to skip reviewer gates.
