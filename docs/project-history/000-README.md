# Project History Standard

## Purpose

This folder is the permanent shared technical history of the project. It records significant completed milestones and provides durable context that developers and all AI coding assistants can use across their separate sessions and tools. These rules apply equally to Claude, Codex, ChatGPT, Gemini, and future assistants.

Project History is not a changelog, task list, design diary, or conversation transcript. It should explain a coherent completed outcome: what was accomplished, why it mattered, the resulting architecture or behavior, the decisions that now govern future work, and how the result was validated.

## Principles

- Record only significant completed milestones.
- Keep documents small and focused.
- Prefer many small documents instead of one large document.
- Describe one completed milestone per document.
- Never continue adding unrelated or later work to an existing document.
- Treat every completed history document as read-only.
- Give all future milestones a new sequentially numbered document.
- Link to earlier history documents when useful instead of repeating their content.
- Record final decisions, validated outcomes, important architectural changes, and bounded deferred work.
- Exclude conversations, temporary debugging, exploratory ideas, and implementation notes that are no longer relevant.

## When to Read Project History

Start with the relevant subsystem file under [`docs/code-map/`](../code-map/000-README.md), which describes where the current implementation lives. Read Project History only when the task needs the decisions behind that implementation or involves a major implementation, migration, refactor, repair, or architectural change.

Use filenames and links from the selected subsystem map or already relevant history documents to choose the smallest applicable history set. Do not read every Project History document automatically. Routine fixes and bounded source audits normally need no milestone documents unless a past decision directly affects the task.

Project History provides decision context; it does not override current authoritative source or the current Code Map. If history and current implementation differ, preserve the immutable history record and update the Code Map to describe the current implementation.

Historical paths remain accurate evidence of where code lived when a milestone completed. Do not rewrite them after relocation. Current paths and current source ownership belong in Code Maps. A milestone should preserve capability, decisions, invariants, and validation—not transient file listings alone.

## When to Propose a Record

During substantial work, every AI assistant should periodically assess whether a major milestone has been completed. Examples include:

- A major feature.
- An architectural change.
- A completed migration.
- A major repair.
- A significant refactor.
- A completed subsystem.
- A major UX redesign.

Routine maintenance, small fixes, incomplete work, exploratory investigation, and ordinary incremental changes do not normally warrant a Project History document.

Documentation maintenance, link repair, and current-path correction do not normally justify a milestone.

When a milestone appears to qualify, the assistant must ask the user whether a Project History document should be created. It must never create one automatically.

Do not create history documents for formatting changes, minor fixes, small refactors, routine maintenance, or incomplete investigations.

## File Rules

- Always create a new sequentially numbered Markdown file in `docs/project-history/`.
- Use a three-digit numeric prefix, beginning after this standard with `001-`.
- Choose a concise descriptive slug, for example `001-package-manager-migration.md`.
- Never append later work to an existing history document.
- Once completed, a history document is read-only.
- Corrections to factual errors require explicit user approval.
- Future milestones always receive a new file, even when they concern the same subsystem.
- Each file must describe one coherent milestone.
- Target approximately 300 to 1,000 words.

Before selecting a number, inspect the filenames already present in this directory and use the next available sequential number. Do not reuse gaps or renumber existing documents.

`PackageCategoryGroups-v1.md` is a legacy pre-numbering milestone and remains immutable under its original filename. New records must still use the next sequential numeric prefix.

## Required Template

```markdown
# Title

## Date

## Scope

## Goal

## What Changed

## Final Architecture

## Decisions and Invariants

## Validation

## Deferred Work

## Related History
```

## Content Guidance

Write the document for a future maintainer who was not present during implementation. Describe the final state rather than replaying the work session. Record only decisions supported by the completed implementation and its authoritative documentation. Clearly distinguish validated results from deferred work.

The `Final Architecture` and `Decisions and Invariants` sections should capture the stable boundaries future work must preserve. The `Validation` section should name the checks actually performed and their outcomes. The `Deferred Work` section should contain only known follow-up boundaries; it must not become a general backlog. Use `Related History` to link earlier milestone records without modifying them.

Project History complements source code, tests, architecture documents, and version control. It does not replace any of them.

The goal is a clear shared technical history that any developer or AI assistant can understand quickly by reading a small set of focused milestone documents rather than one continually growing summary.
