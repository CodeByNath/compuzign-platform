# Claude repository guidance

This file defines the repository working standard for all AI assistants. If your tool does not automatically load this file, read it before beginning work.

- Keep searches scoped to relevant source, test, and documentation directories.
- Cap exploratory command output at 200 lines.
- Prefer `rg --files` and targeted `rg` over recursive `find` or `grep`.
- Use `git log -20`, `git diff --stat`, or `git diff --name-only` before larger Git output.
- Do not inspect Git objects or full history unless the task explicitly requires it.
- Redirect successful build, lint, and test output; show full output only for failures.
- Use a fresh Claude session for each independent audit.

## Subsystem documentation workflow

Follow this path for every subsystem audit or implementation:

1. Start at `docs/code-map/000-README.md` and choose only the subsystem map relevant to the task.
2. Read that subsystem map before searching or modifying its source.
3. Read `docs/project-history/000-README.md` and only the history documents relevant to the task when historical decisions are needed or the work is a major implementation, migration, refactor, repair, or architectural change.
4. Open the authoritative source linked by the selected map, then audit or implement the change.
5. After a major change moves, adds, replaces, or removes authoritative files, update the affected Code Map in place and verify its links.
6. Before closing a qualifying major milestone, ask whether a new immutable Project History document should be created. Never create one automatically.

Do not load the entire Code Map or Project History directories. Do not read unrelated subsystem maps or history documents.

## Project History

Before beginning a major implementation, migration, refactor, or architectural task:

- Read `docs/project-history/000-README.md`.
- Read only the Project History documents relevant to the subsystem being modified.
- Do not read every history document unless explicitly requested.

- Do not create large project-summary or history Markdown files.
- Use `docs/project-history/` as the shared technical history for all developers and AI assistants.
- Each completed milestone must have its own small, focused document.
- Never append unrelated or later work to an existing history document.
- Once a history document is complete, treat it as read-only.
- Later work, even on the same subsystem, must create a new numbered document that references previous history where appropriate.
- Prefer many small history files over one continually growing document.
- Before closing any major implementation, migration, refactor, architectural change, or significant repair, ask whether a new Project History document should be created.
- Never create a Project History document automatically.
- Do not create Project History documents for minor fixes, incomplete investigations, or routine maintenance.
