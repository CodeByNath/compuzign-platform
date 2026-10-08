# Account Station → Settings → Tools → Profile — Active Work

## Status
**BUILDER ACTION REQUIRED — CLEANUP ACCEPTED; ARCHITECTURE DESIGN ONLY.**
Reviewer verdict: **Proceed with safeguards**. No source implementation, `main` push or deployment authorised until design reviewed. Builder Claude; Reviewer ChatGPT.

## Verified candidate cleanup
`main` `8d1f0185811e69214c0fd85c29819eef0c5d9226`; topic `global-profile-platform-settings` `125502d9ce1206548bfaa8d954746d7d4ac7dc74`. Independently confirmed **zero file diff** and identical Git tree `e0da141f44ca2304e5f02d2092afcd4650fcc2c8`. Old Phase 1B candidate reverted completely; no candidate package/lock changes. Cleanup ACCEPTED. Do not revive superseded source.

## Owner's final naming and four Platform ID families
**Account Station → Settings → Tools → Profile**:
- Account Station `CZAXXXXX`
- Account Settings `CZASXXXXX`
- Account Settings Tools `CZASTXXXXX`
- Account Settings Tools Profile `CZASTPXXXXX`

Five canonical suffix characters. Supersedes previous `CZM`/`CZBM`/`CZAM`/`CZPS` families for this feature. Existing Platform Identifier Station is sole mint/bind/lookup owner. Ensure four records are real and independently addressable, parent-child linked; report any conflict before implementation. **Account Station is a new peer Station; Settings, Tools and Profile are not Stations.** The existing `station-manager/` is coordination infrastructure only; Admin Station handles presentation. Do not confuse the names.

## Builder: next task (design/handover only)
Read [revised handover](2026-10-08-global-profile-brand-handover.md), `project-work/AGENTS.md`, root `AGENTS.md`, `docs/ai-index.md`, Code Maps for Station Manager, Admin Station, Platform Identifier Station and a conforming peer Station; especially `docs/architecture/StationDrawerLifecycleContract-v1.md`. Read actual source/registration boot path.

1. Map Account Station responsibilities, registration, Home/Drawer, Admin placement, Settings/Tools/Profile navigation, and separation from authentication/account users. **Follow all existing Station rules.**
2. Design a minimal WordPress-backed Account-owned data model and authenticated REST API; use existing Platform Identifier Station for four durable records and native references. Explain each record's purpose, parent linkage, initial bootstrap, lifecycle and recovery. Flag unresolved contradictions, especially singleton Profile vs existing Publish lifecycle; do not invent another generic engine.
3. First Profile Brand fields: Logo, Favicon, Name ≤60 and Code uppercase A–Z ≤6, one Save with unsaved preview. Reserve About/Locations/Contact/Social for later. WEX integration deferred; maintain adapter-friendly platform API contract.
4. Specify smallest planned files, focused validations and no-dead-code strategy. Report the plan **in this same file**, switch to `AWAITING REVIEWER REVIEW`, commit/push coordination branch; stop. **No source changes now.**

Maximum 600 lines per source file, 600 words per Code Map, 600 words in this work file. Three-branch limit remains.
