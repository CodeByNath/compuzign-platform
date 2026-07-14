# Repository AI Working Standard

This file is the single source of truth for repository-wide guidance for all AI coding assistants, including Claude Code, Codex, ChatGPT, Gemini, Cursor, Windsurf, GitHub Copilot, and future tools. Tool-specific startup files may direct an assistant here, but must not duplicate or override this standard.

## Documentation hierarchy

- `AGENTS.md` defines the repository AI working standard.
- `CLAUDE.md` contains only Claude Code startup guidance and delegates here.
- [`docs/ai-index.md`](docs/ai-index.md) provides the shared platform orientation and read order.
- [`docs/code-map/`](docs/code-map/000-README.md) maps the current implementation and its authoritative files.
- [`docs/project-history/`](docs/project-history/000-README.md) contains immutable architectural and milestone history.

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

## Code Maps

Start at [`docs/code-map/000-README.md`](docs/code-map/000-README.md), select only the subsystem relevant to the task, and follow only necessary related-map links. Never load the entire Code Map.

- Keep each subsystem map under 600 words.
- Update affected maps whenever authoritative files move, are replaced, or change responsibility.
- Verify documented paths and Markdown links after updates.
- Split distinct responsibilities into focused maps rather than allowing a map to become large.

## Project History

Read [`docs/project-history/000-README.md`](docs/project-history/000-README.md) and only the relevant history documents when historical decisions are needed or the work is a major implementation, migration, refactor, repair, or architectural change. Never load the entire history directory.

- Treat completed Project History documents as immutable.
- Never append later work to an existing history document.
- Give every later milestone a new sequentially numbered document, including work on the same subsystem.
- Ask the user before creating a history document; never create one automatically.
- Keep each milestone focused and approximately 300 to 1,000 words.
- Do not create milestones for routine maintenance, minor fixes, incomplete investigations, or formatting-only changes.

## Large-file navigation

For any active source file larger than approximately 400 lines that contains multiple major concerns:

- maintain an internal file index describing its major responsibilities;
- maintain stable, searchable section markers in the file;
- refer to sections by marker or symbol rather than unstable line numbers;
- update the index and markers whenever responsibilities move.

## Implementation discipline

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
4. Ask whether a new Project History document should be created when the completed work qualifies as a major milestone.
5. Report validation and working-tree status without committing or pushing unless explicitly requested.
