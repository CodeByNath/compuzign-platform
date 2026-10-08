# Account Station → Settings → Tools → Profile — Active Work

## Status
**BUILDER ACTION REQUIRED — PHASE 1 BACKEND ONLY.**
Reviewer verdict: **Proceed with safeguards**. Owner settled the Profile lifecycle conflict on 2026-10-08: **full existing Station lifecycle applies**, no singleton Save-only exception. Builder Claude; Reviewer ChatGPT. **No `main` push/deployment; Phase 2 UI locked.**

## Verified baseline
`main` `8d1f0185811e69214c0fd85c29819eef0c5d9226`. Existing topic `global-profile-platform-settings` `125502d9ce1206548bfaa8d954746d7d4ac7dc74`; zero diff and identical tree to `main` after abandoned Phase 1B cleanup. Do not resurrect old code, unnecessary packages or bespoke database mechanisms.

## Binding product rules
Read [updated handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, and locked `docs/architecture/StationDrawerLifecycleContract-v1.md`, plus Service/Category implementation and relevant Station Manager/Admin/Platform Identifier Code Maps/source. Account Station is new peer; `station-manager/` is coordinator, Admin is presentation. Settings/Tools/Profile are **Account-owned children, not peer Stations**. Permanent ID prefixes, each with five-char suffix: `CZA`, `CZAS`, `CZAST`, `CZASTP`; minted/bound by existing Platform Identifier Station with durable parent refs.

**Station lifecycle applies to Account and child modules, including Profile.** Brand Save creates/updates Pending draft; **Publish separately settles and activates**; disabled/travel states and valid restore semantics follow the locked contract. No active Brand projection from merely Saved Pending data. Keep existing lifecycle/footer/pills/notification architecture and immutable IDs; do not invent exception just because Profile is singleton. The former one-Save requirement is *one editor Save*, not immediate Publish. Multi-user/role levels are later, NOT this phase.

## Claude — Phase 1 backend instructions
1. Implement only the minimum Account-owned backend domain, four real identity-bearing records, parent linkage, idempotent explicit bootstrap via authenticated mutation (GET read-only), secure REST detail/Save/Publish and necessary locked lifecycle transitions. Reuse existing platform conventions; no new peer Station beyond Account.
2. Use existing WordPress-backed persistence with fail-closed recovery of interrupted reserve/bind/storage writes; maintain immutable IDs and distinction between saved drafts and active/settled Brand. Avoid bloated concurrency systems; prove correctness with focused failure/retry and auth tests.
3. Brand fields only: Logo, square Favicon, Name ≤60, Code uppercase A-Z ≤6. Safe image validation and storage using existing approved host capabilities; do **not** introduce a new external package/media subsystem. Header/browser UI, About/Locations/Contact/Social, WEX, and multi-user access are deferred.
4. **Exact lifecycle conflict:** if perpetual Account/Settings/Tools singleton nodes cannot legally perform a destructive/travel transition, pause and document the narrow conflict for independent review. Do not silently exempt Profile or change the locked contract.
5. Update relevant Code Maps/policy/contracts, audit dead code, keep files ≤600 lines and Code Maps ≤600 words. Perform safe deterministic tests and baseline comparison. Push **topic only**, record exact SHA, diff/files, tests, limits and unresolved issues here as `AWAITING REVIEWER REVIEW`, push coordination and stop.

Reviewer will inspect actual pushed diff before authorising any next phase or source promotion.
