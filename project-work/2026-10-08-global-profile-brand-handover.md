# Manager Settings → Tools → Profile — Owner Direction

## Authority
Owner superseded the earlier **Global Settings / Profile** backend plan on 2026-10-08. Preserve CompuZign's established peer Station architecture, existing Station Manager coordinator, Platform Identifier Station, REST contracts and WordPress-backed runtime. Neither Settings nor Profile requires a new peer Station or a bespoke persistence engine. Do **not** conflate the Manager-facing hierarchy with the internal `station-manager/` coordinator, which has no domain persistence authority. Actual owner of the Manager record must be established from existing source before implementing it.

## Approved hierarchy and proposed permanent IDs
Manager → Settings → Tools → Profile (Profile is an expandable management configuration area).
- `CZMXXXXX` — Manager
- `CZMSXXXXX` — Manager Settings
- `CZMSTXXXXX` — Manager Settings Tools
- `CZMSTPXXXXX` — Manager Settings Tools Profile

Each uses the existing five-character suffix alphabet. All four prefixes have distinct total lengths under the anchored Policy. **Only register/mint identities for genuinely persistent, independently addressable owner-approved records; never invent decorative records solely to justify prefixes.** Parent-child references must be explicit and durable. Check collision with existing identities and exact Manager ownership through Code Maps/source; report any unresolved design mismatch. Old `CZPS`/`CZPSP` plan is superseded and must not enter product source.

## First Profile section
Brand only: Logo, Favicon (square), Brand Name (≤60), Brand Code (uppercase A–Z, ≤6); one Save, draft preview, Pick/Clear, valid blank, saved confirmation. Logo public-only; favicon 64×64 dashboard box on main colour. Allow safe image decoding/conversion where available; unsupported input fails clearly without partial changes. Later Profile sections: About, Locations, Contact Details, Social Media, and others, added only when requested. Existing WordPress storage is acceptable behind CompuZign domain ownership and authenticated API; no generic storage engine, additional database, broad media manager or extra packages.

## Cleanup boundary
Candidate topic `global-profile-platform-settings` has never merged into `main`. Audit its exact diff against `main` and remove **all abandoned candidate-only code, tests, maps, policies, wiring, installed dependencies, generated/scratch artifacts and references**. Do not delete or alter pre-existing source or shared dependencies. Preserve source history and supply a clean diff showing every obsolete candidate addition gone; no hidden dead code. This instruction is for Claude (sole implementation editor); Reviewer source is strictly read-only.

## Workflow
Do cleanup and architecture mapping before new implementation. First supply an exact cleanup inventory and revised Manager/Settings/Tools/Profile ID ownership plan; no guessing. Reviewer accepts the boundary before the next product implementation phase. Active status and audit belong in the existing work file. Code files ≤600 physical lines; Code Maps ≤600 words; active work file ≤600 words.
