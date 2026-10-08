# Global Profile — Locked Handover and Phase Plan

## Product authority
CompuZign owns Platform Settings, Profile data, platform identities, validation, API, image assets and persistence. Runtime/storage providers are adapters only. **Service Station → Settings → Profile** is temporary navigation, never Service data ownership. Root `AGENTS.md`, `docs/ai-index.md`, Platform Identifier policy, current Code Maps and source remain authoritative.

## Approved brand contract
One Profile Brand section, exactly:
1. **Brand logo:** Pick/Clear, immediate unsaved preview, one-line help; public website asset, not displayed in dashboard.
2. **Brand Favicon:** same controls; square on Pick and Save; **64×64** dashboard header box on the established main colour.
3. **Brand name:** optional plain text, maximum 60 characters; display full name in approved contexts, default header label when empty.
4. **Brand Code:** optional uppercase A–Z, maximum 6; beside favicon; default header label when empty.

One Save for the entire Profile, no autosave or partial data commit. Success stays on Profile with confirmation. Missing images show clear recovery controls; blanks/Clear are valid. Existing Services/Packages/Pricing/CRM stay unchanged. Respect theme, keyboard and responsive conventions.

**Image Option A:** accept arbitrary image selection; securely inspect, fully decode and convert unsupported display formats to safe browser imagery when runtime supports it, otherwise clear error without changing saved values. Never store unsafe raw vector/script payloads.

## Permanent identity and storage
Owner-approved parent **Platform Settings** `CZPSXXXXX` and child **Profile** `CZPSPXXXXX`. Both are real durable singleton records; parent stores section link, child stores `parent_platform_id`, revision and brand. Existing Platform Identifier Station alone mints/binds/resolves IDs; identity is immutable across Saves. Platform asset keys are opaque and stored independently from host URLs. Protect bootstrap/recovery, revisions, authentication, all referenced files and durable reload. Avoid a new UI Station, host media/profile identities or WEX implementation.

## API contract
Authenticated `/compuzign/v1/admin/platform-settings` GET; `/admin/platform-settings/{CZPS ID}` GET; `/admin/platform-settings/profile` GET/POST; `/admin/platform-settings/profiles/{CZPSP ID}` GET. All read/Save operations require platform access and validated nonce; 409 for revision/identity conflict, clear validation errors; never expose editable settings anonymously.

## Controlled phases
- **0 — Architecture discovery:** accepted.
- **1A — Identity/storage/API architecture:** accepted with safeguards. Full original report preserved in coordination commit `d90da463`.
- **1B — Backend implementation:** active independent correction review. Candidate `236a345a`; no main push authorised until source safety and file-size gates pass.
- **2 — Settings Profile interface:** locked.
- **3 — Header/brand projections:** locked.
- **4 — Full validation, approved release and Nath live validation:** locked.

## Governance and length limits
Builder alone edits product source. Reviewer edits only `project-work/` coordination on instruction branch; audits pushed source and tests. **New or changed source files must be at most 600 physical lines; never over 1,000, and no line-count exception without Owner approval.** Preserve meaningful cohesion when splitting. Active work file **at most 600 words**, normally much shorter; retain technical depth in this handover, source Code Maps and Git history, not repeated narratives. Code Maps **at most 600 words**. Never delete verification evidence merely to meet limits. One area, one active file, one phase at a time.
