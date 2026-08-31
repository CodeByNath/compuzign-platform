# Repository AI Working Standard

This file is the single source of truth for repository-wide guidance for human contributors and all AI coding assistants, including Claude Code, Codex, ChatGPT, Gemini, Cursor, Windsurf, GitHub Copilot, and future tools. Tool-specific startup files may direct an assistant here, but must not duplicate or override this standard.

## Documentation hierarchy

- `AGENTS.md` defines the repository AI working standard.
- `CLAUDE.md` contains only Claude Code startup guidance and delegates here.
- [`docs/ai-index.md`](docs/ai-index.md) provides the shared platform orientation and read order.
- [`docs/architecture/`](docs/architecture/platform-architecture-standards-v1.md) holds stable platform principles, constraints, and clearly labelled historical or superseded specifications.
- [`docs/code-map/`](docs/code-map/000-README.md) maps the current implementation and its authoritative files.
- Directory-local `CLAUDE.md` files contain only local ownership, entry points, boundaries, links, and validation.
- [`docs/project-history/`](docs/project-history/000-README.md) contains immutable architectural and milestone history.

## Coordination branch check

Before normal repository startup, check `Project-work-instructions`; if it has newer changes, sync it and read `project-work/AGENTS.md` plus the active work file first.

"Run the cycle" (or "run it" with no other context) means: check `Project-work-instructions` for updates, and if any are found, read the active work file and act on its status.

## Repository workflow

Follow this path, omitting the Claude-specific startup step in tools that do not support it:

```text
Repository
    ↓
CLAUDE.md (if supported by the tool)
    ↓
AGENTS.md
    ↓
docs/ai-index.md
    ↓
Relevant subsystem Code Map only
    ↓
Authoritative source code
    ↓
Relevant Project History only if required
    ↓
Implementation
    ↓
Update affected Code Maps
    ↓
Ask whether a new Project History document should be created
```

Read the nearest tool-specific or directory-local instruction file when the tool supports it, provided it does not conflict with this standard. Audit changed or undocumented areas rather than repeatedly re-auditing an established subsystem.

## Source-first rule

Source code is always authoritative. Documentation exists to navigate the implementation and preserve relevant context; it never replaces reading the code. If documentation conflicts with source, verify behavior from the implementation before changing anything, then correct the affected current-state documentation as part of the work. Historical records remain immutable.

## Locked station/drawer lifecycle contract

Before adding or changing a Station, module, drawer, or drawer footer, read
[Station and Drawer Lifecycle Contract v1](docs/architecture/StationDrawerLifecycleContract-v1.md)
and the owning Code Map and source. Service and Category are the current
conforming examples. A complete Overview Save creates their persisted Pending
record, hands the returned native ID into the same mounted drawer, and leaves
Publish to settle and activate that existing record. The raw unmasked storage
value `platform_status: 'disabled'` is not the Disabled pill; only an explicit
Disable mask is Disabled. Enable and restore return to unmasked Pending while
preserving drafts/data. Do not introduce create-on-Publish, a loading/remount
identity handoff, presentation-owned endpoint orchestration, or a second
status/notification/editor/footer system. Any Station that has not migrated
must be marked **pending migration** in its Code Map and local instructions,
not described as conforming.

The same contract's [§9–§12](docs/architecture/StationDrawerLifecycleContract-v1.md#9-drawer-group-presentation-tabs-accordion-child-navigation-and-focused-tasks)
additionally lock drawer group presentation (Tabs/Accordion, child chip
navigation, focused-task detours such as a bin), chrome suppression while an
editor or focused task is open, the confirm/prompt dialog convention, and the
footer split-button grammar. These are additive and optional to adopt, but
once adopted must follow the documented shape exactly rather than a new
bespoke implementation.

## Code Maps

Start at [`docs/code-map/000-README.md`](docs/code-map/000-README.md), select only the subsystem relevant to the task, and follow only necessary related-map links. Never load the entire Code Map.

- Keep each subsystem map under 600 words.
- Update affected maps whenever authoritative files move, are replaced, or change responsibility.
- Verify documented paths and Markdown links after updates.
- Split distinct responsibilities into focused maps rather than allowing a map to become large.

Any source move is incomplete until imports, tests/contracts, affected Code Maps, and local instructions are updated; documentation links and paths are verified; and generated output is rebuilt when applicable.

## Project History

Read [`docs/project-history/000-README.md`](docs/project-history/000-README.md) and only the relevant history documents when historical decisions are needed or the work is a major implementation, migration, refactor, repair, or architectural change. Never load the entire history directory.

- Treat completed Project History documents as immutable.
- Never append later work to an existing history document.
- Give every later milestone a new sequentially numbered document, including work on the same subsystem.
- Ask the user before creating a history document; never create one automatically.
- Keep each milestone focused and approximately 300 to 1,000 words.
- Do not create milestones for routine maintenance, minor fixes, incomplete investigations, or formatting-only changes.

## Code Weight, Cohesion and Placement

### Meaningful responsibility

Every file, hook, class, component, and utility must have one coherent reason to change. Do not combine unrelated responsibilities merely to reduce file count, and do not split one cohesive operation into tiny files merely to reduce line count. Line count is a navigation signal, not an architectural objective.

### Meaningful location

Code lives with the authority or domain that owns its behaviour:

- generic rendering → the shared renderer kit;
- entity composition → `entity-drawers/<entity>/`;
- entity mutation → the authoritative station, hook, service, or controller;
- surface registration → the owning surface registry;
- domain-rule derivation → the owning domain-rule module;
- presentation-only reuse → a genuinely shared presentation location.

Do not place code in a neutral or shared directory merely because two implementations look alike. Shared placement requires shared semantics and ownership, not visual similarity.

### Capability-preserving cleanup

A cleanup must not remove established capability, weaken validation, replace authoritative actions with generic placeholders, collapse entity-specific behaviour into lowest-common-denominator APIs, duplicate a mature system for a different appearance, bypass lifecycle/identity/persistence authority, replace explicit domain rules with opaque configuration, hide complexity behind oversized parameter objects, or move complexity without improving cohesion and dependency direction.

### Abstraction evidence

Before creating a shared abstraction, establish at least two genuine consumers, the same semantic responsibility, stable shared behaviour, no entity-specific authority leakage, and reduced duplication without reduced capability. Visual similarity and anticipated future reuse are insufficient. With one real consumer, keep the implementation local and extract when evidence exists.

### File size and navigation

Files above approximately 400 lines require a responsibility audit. Split only at coherent boundaries; a cohesive authoritative file may remain large. Until a multi-responsibility file can be separated safely:

- maintain an internal file index describing its major responsibilities;
- maintain stable, searchable section markers in the file;
- refer to sections by marker or symbol rather than unstable line numbers;
- update the index and markers whenever responsibilities move.

Report before-and-after responsibility distribution for a split or consolidation, not only line counts.

### Change balance

Every change must preserve clarity, capability, ownership, justified reuse, runtime safety, validation, and future maintainability. No single objective—including fewer lines, fewer files, abstraction, reuse, or speed—may compromise the others without an explicit documented architectural decision.

## Implementation discipline

- Audit existing capability before replacing UI or infrastructure, and reuse authoritative mature systems instead of rebuilding reduced copies.
- Distinguish source ownership from screen placement; a component's host does not acquire its persistence or domain authority.
- Avoid broad repository rewrites for a narrow task.
- Validate the implementation against the written plan and report skipped phases with the reason.
- Never claim PHP, browser, integration, or other runtime verification that was not performed.
- Keep searches scoped to relevant source, test, and documentation directories.
- Prefer `rg --files` and targeted `rg` searches; cap exploratory output at about 200 lines.
- Prefer concise Git inspection such as `git log -20`, `git diff --stat`, or `git diff --name-only` before larger output. Do not inspect Git objects or full history unless the task requires it.
- Preserve unrelated working-tree changes.
- Do not modify generated files unless the task explicitly requires it.

## Validation

Avoid repeated repository-wide validation. Perform focused validation while implementing where practical, then run complete validation once after implementation. Prefer concise output for successful builds, lint, and tests; show enough detail to diagnose failures.

Before finishing:

1. Update affected Code Maps.
2. Update local instruction metadata only when its documented ownership, entry points, runtime flow, persistence, dependencies, or boundaries changed; replace stale audit metadata rather than appending audit history.
3. Verify canonical paths and Markdown links.
4. Ask whether a new Project History document should be created when the completed work qualifies as a major milestone; routine documentation maintenance and path correction do not qualify.
5. Report validation and working-tree status without committing or pushing unless explicitly requested.
