# Large File Self-Navigation

## Date

2026-07-14

## Scope

This milestone completed the repository's AI navigation system. It established a tool-neutral repository workflow in [`AGENTS.md`](../../AGENTS.md), reduced [`CLAUDE.md`](../../CLAUDE.md) to Claude Code startup guidance, strengthened source-first Code Map navigation, and added internal navigation to authoritative implementation files that contain multiple major concerns.

The source pass covered large controllers, composition roots, workstations, drawers, providers, repositories, and schemas. It also covered several explicitly selected authoritative files near the normal size threshold where their responsibility density justified the same treatment.

## Goal

An AI assistant or developer should be able to move from repository entry guidance to the correct subsystem map, then to an authoritative file, and finally to the relevant concern inside that file without loading unrelated documentation, scanning thousands of lines, or relying on unstable line numbers.

## What Changed

`AGENTS.md` became the single repository-wide AI working standard for Claude Code, Codex, ChatGPT, Gemini, Cursor, Windsurf, GitHub Copilot, and future assistants. `CLAUDE.md` now delegates to that standard and retains only Claude-specific startup behavior.

The workflow routes readers through [`docs/code-map/000-README.md`](../code-map/000-README.md), one relevant subsystem Code Map, relevant Project History only when required, and then authoritative source. Source remains authoritative when documentation differs from the implementation.

Seventeen authoritative source files received concise `FILE INDEX` blocks and stable searchable `SECTION:` markers. Markers describe actual concerns such as Service Catalogue routes and handlers, Package Station operations, Tier lifecycle, manager coordination, Rate Sheet editing, Category and Category Group drawers, homepage configuration, status policy, Package persistence, schemas, and public pricing projection. Route registration and matching handlers use the same concern identifiers.

Eleven affected Code Maps received compact tables with `Concern`, `Marker`, `Contains`, and `Read when...` columns. These tables connect subsystem navigation directly to the stable markers inside source files while keeping every map below the 600-word limit.

## Final Architecture

Navigation now has four distinct layers:

1. `AGENTS.md` defines universal repository workflow and maintenance rules.
2. Tool-specific startup guidance, currently `CLAUDE.md`, delegates to that standard.
3. Code Maps identify the smallest authoritative file set for a subsystem and the markers relevant to each concern.
4. Each qualifying authoritative file identifies its internal concerns with a top-level index and permanent section markers.

Project History remains an immutable decision record and does not replace current Code Maps or source inspection.

## Decisions and Invariants

- Source code is always authoritative; documentation navigates rather than substitutes for it.
- Internal navigation uses stable concern identifiers, never line numbers.
- A concern identifier remains consistent across related regions, including route registration and handlers.
- Markers describe existing responsibilities only. Helpers are concern-specific unless genuinely shared.
- Code Maps stay focused, remain under 600 words, and reference markers with task-oriented reading guidance.
- Navigation comments must not change APIs, persistence, tests, or runtime behavior.
- Existing history documents remain immutable; later navigation work requires a new numbered milestone.

## Validation

All selected source files were checked for one `FILE INDEX` and implementation occurrences for every indexed concern. Seventy-one unique Code Map marker references resolved to source markers. Markdown links across all Code Maps, `AGENTS.md`, and `CLAUDE.md` resolved successfully, and all affected maps remained below 600 words.

PHP syntax checks passed for all changed PHP files. TypeScript validation passed with `tsc --noEmit`. A source-diff audit found comments and navigation markers only, with no executable additions or deletions. `git diff --check` passed.

Notification template content, the module-notification utility, tests, fixtures, generated files, dependencies, small helpers, and small components were intentionally excluded. They are either outside the authoritative-file scope or explicitly excluded by the standard.

## Deferred Work

No runtime or architectural follow-up is required. Future authoritative files should adopt the same index and marker convention when they grow beyond approximately 400 lines with multiple major concerns. Existing indexes and Code Map tables must be updated when responsibilities move.

## Related History

No earlier Project History document records this repository navigation standard.
