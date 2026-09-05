# CompuZign Project Work Coordination

This branch is the coordination channel between Nath, Claude Code, and ChatGPT. It contains workflow/governance only; it is not CompuZign Platform architecture.

## Canonical work-cycle authority

`project-work/AGENTS.md` is the canonical workflow authority for this branch.

At the start of every session, when resuming work, or when Nath says **run the cycle / run it / continue the work**:

1. Fetch/sync `Project-work-instructions`.
2. Read `project-work/AGENTS.md`.
3. Read the active `project-work/*.md` file completely.
4. Follow that file's current status literally.
5. Do not ask Nath for permission when the status already authorizes the next actor.

The active dated work file owns the current scope, evidence, review state, source-push approval, deployment record, live-validation state, and closure. Do not place active phase instructions or stale bootstrap work in this root file.

## Role boundary

- Claude Code is the sole source-code editing/implementation agent.
- ChatGPT is the independent auditor and remains source read-only.
- Coordination updates are permitted only on `Project-work-instructions`, following `project-work/AGENTS.md` and the active work file.
- Never merge coordination files into `main`.
- Never treat local, pushed, workflow-complete, deployed, and live-runtime states as identical.

If this file conflicts with `project-work/AGENTS.md`, `project-work/AGENTS.md` governs the work cycle.