# Account Station → Settings → Tools → Profile — Owner Handover

## Current owner decision — supersedes all former names/IDs
**Account Station** is the owning peer Station, separate from **Station Manager** (frontend coordinator) and **Admin Station** (presentation/control host). Account Station registers through existing Station Manager using the established peer Station model. Neither Settings nor Tools nor Profile is a separate Station. Hierarchy:
- **Account Station** — `CZAXXXXX`
- **Settings** — `CZASXXXXX`
- **Tools** — `CZASTXXXXX`
- **Profile** — `CZASTPXXXXX`

`XXXXX` means the canonical five-character Platform Identifier suffix, minted solely by existing Platform Identifier Station. Earlier `CZM`, `CZBM`, `CZAM`, `CZPS` and their child prefixes are **superseded**; never register them for this new work. IDs describe real durable addressable records with validated parent-child references, not merely visible menu labels; Builder must propose the simplest correct identity mapping and flag any mismatch instead of inventing records. Account Station owns its domain state, validation, save/API and identity binding; it does **not** take over user authentication or WordPress account ownership by implication. No changes to other Stations.

## Mandatory established Station architecture
Read `AGENTS.md`, `docs/ai-index.md`, `docs/code-map/station-manager.md`, `docs/code-map/admin-station.md`, `docs/code-map/platform-identifier-station.md`, `docs/architecture/StationDrawerLifecycleContract-v1.md`, relevant example peer Station source and boot/registration paths. Preserve Station Manager as pure coordinator, Admin as presentation host, peer ownership, register-before-finalize, one Station Home/Drawer convention, drawer lifecycle, platform capability gates, REST/API ownership, and Code Maps. Distinguish singleton settings operations from published-entity lifecycles; explain any nonapplicable lifecycle elements for owner review before coding. WEXdesigns later consumes data through adapters and reusable UI contracts; do not implement WEX now.

## Profile scope
First subsection **Brand**: Logo (public-website asset only), square Favicon (64×64 Admin header box), Brand Name (optional, ≤60 chars) and Brand Code (optional uppercase A–Z, ≤6 chars). Pick/Clear and immediate unsaved previews, single Save, confirmation on same page, blanks valid. Safe image validation/decoding/conversion where supported; reject unsafe files without partial saves. Later sections: About, Locations, Contact Details, Social Media. No automatic new Stations/Platform IDs for every subsection.

## Storage and cleanup
Use existing WordPress-backed mechanisms behind Account Station's own platform API, Platform ID and secure access; **no replacement persistence engine**, generic CAS framework, added databases, packages or broad image system. Choose the smallest durable model following existing conventions, not ACF dependency. Keep source genuinely clean: old candidate already completely reverted. Do not resurrect old `PlatformSettings` implementation/dead code just to reuse its shape. Existing identities outside this work are never renamed.

## Workflow
Old topic `global-profile-platform-settings` at `125502d9` has same Git tree as `main` `8d1f0185`; cleanup accepted. Current phase is **design review only**. Builder submits concise real-record/ownership mapping, Station registration and navigation approach, minimal API/storage design and phased plan in same active work file, then stops. Reviewer checks before implementation is authorized. Reviewer never edits product source. Files ≤600 physical lines, Code Maps ≤600 words, active work file ≤600 words.
