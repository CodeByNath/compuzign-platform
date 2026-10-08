# Account Station → Settings → Tools → Profile — Active Work

## Status
**BLOCKED — OWNER DECISION REQUIRED: PROFILE LIFECYCLE.**
Reviewer verdict: **Proceed with safeguards**, subject to explicit Owner decision before source changes. Claude Builder; ChatGPT Reviewer. No source push/deployment authorised.

## Scope and cleaned baseline
`main` `8d1f0185811e69214c0fd85c29819eef0c5d9226`. Topic `global-profile-platform-settings` `125502d9ce1206548bfaa8d954746d7d4ac7dc74` has identical tree to `main`; superseded Phase 1B fully reverted and accepted. The latest Builder response is **design only**.

Account Station is a new peer Station, separate from coordinator `station-manager/` and presentation Admin Station. Settings, Tools and Profile are Account-owned **non-Station** children. Approved identity families (five-character suffix each): Account `CZA`, Settings `CZAS`, Tools `CZAST`, Profile `CZASTP`. All mint/bind/resolve through existing Platform Identifier Station. Other prefix families are superseded for this feature.

## Independent design review — 2026-10-08
Builder corrected four design findings:
- GET remains read-only; first authenticated POST triggers idempotent singleton bootstrap, not arbitrary reads.
- Four separately identifiable native records link through explicit immutable parents in one non-autoloaded WordPress option.
- Registry reverse lookup recovers already-bound IDs on interrupted bootstrap; bounded first-save lock prevents competing initialization. Must verify real failure/concurrency behavior during implementation.
- Peer registers before Station Manager finalization; Admin owns placement; Account owns mutations and secured API. No new generic storage engine or packages.

**Open architectural gate — locked lifecycle:** `docs/architecture/StationDrawerLifecycleContract-v1.md` §1 and §7 require new Stations to conform or explicitly be pending migration. Builder requests Owner selection:
A. **Conform:** Brand Overview Save → Pending, separate Publish → Active; retain appropriate lifecycle controls.
B. **Explicit singleton settings exception:** Account Station remains conforming peer for registration, identity/ownership, Home/Drawer host, mutation boundaries, but Profile itself is a global singleton settings editor with **one Save immediately effective**, no Pending/Publish/Disable/Archive/Trash. Document the precisely scoped exception in its Code Map; do not silently weaken lifecycle for normal Stations or other Account entities.
**Reviewer recommendation: B** to match Owner's previously stated ACF Options Page analogy and single-Save Brand specification. This is a recommendation **not Owner approval**. Do not code until Owner selects.

**Implementation cautions once approved:** Verify whether WP Media Library attachments are an intended Profile asset dependency; do not silently contradict earlier opaque asset references. Ensure GET can report missing bootstrap, and torn binding/option state reconciles safely without changing IDs. Four identity-bearing structural records must be durable and addressable (not only navigation labels). No old PlatformSettings dead code or future WEX implementation.

## Next action
**Stop for Owner decision A or B.** After Owner decides, Reviewer records choice in this same work file, then gives Claude a phase-bounded implementation instruction with lifecycle and evidence gates. No new branch or source changes now. Respect root `AGENTS.md`, `docs/ai-index.md`, `StationDrawerLifecycleContract-v1.md`, Station Manager/Admin/Platform Identifier Code Maps. Source ≤600 lines/file, Code Map/work file ≤600 words.
