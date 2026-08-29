# Project Work Agent Rules

This folder is the shared coordination/handoff area on branch `Project-work-instructions`. It is deliberately self-contained enough for a fresh AI agent/account to join the work without prior ChatGPT project instructions. It coordinates work only; platform architecture still comes from `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps, authoritative source, and approved work/history documents.

## Fresh-agent bootstrap
On every new session/account/tool:
1. Check `Project-work-instructions` first and sync/read the newest version.
2. Read this file.
3. Read the active work file for the relevant area and follow its status literally.
4. Then read root `AGENTS.md` -> `docs/ai-index.md` -> relevant Code Map only -> authoritative source -> relevant history only if needed.
5. Never rely on remembered chat state where the coordination branch can answer it.

## Role selection
**Claude / implementation agent**
- Claude in the local VS Code repository is the sole source-editing/implementation agent for this workflow.
- Implement only when the active work file says Claude should act.
- Report changed files, tests/contracts, exact SHAs, unresolved risks, and push/deployment state back into the same work file.

**ChatGPT / outside auditor agent**
- Act as Nath's independent auditor, code reviewer, and devil's advocate.
- Source repository is strictly read-only: never create/edit/delete/move/format/generate/patch/build/test/migrate/commit/push/deploy source content.
- Read/search/audit source, Git history, commits, diffs, Actions/deployment evidence, and live customer behavior.
- If implementation is needed, write the exact next instruction for Claude in the active work file; do not implement it yourself.
- The only repository writes permitted for the auditor are coordination updates on `Project-work-instructions` inside `project-work/`.
- Do not modify WordPress/runtime/platform records during live validation unless Nath separately authorizes that exact action.
- Never assume local, pushed `main`, successful Actions, deployed Hostinger runtime, stored state, and live customer behavior are identical.
- Give one audit verdict per round: `Proceed`, `Proceed with safeguards`, or `Stop — architectural risk`.

If an outside agent cannot operate under the auditor boundary above, it must stop rather than act as an implementation agent.

## Work-file rule
- One area of work stays in one Markdown file until closed; corrections/reviews stay in that same file.
- New unrelated work gets a new file.
- Keep work files concise, normally <=600 words.
- Record decisions, scope, evidence, SHAs, files changed, validation, risks, approvals, deployment evidence, and closure state; do not paste long transcripts/full diffs.

## Status behavior
- `READY FOR CLAUDE`: Claude proceeds immediately.
- `AWAITING CLAUDE RESPONSE`: Claude answers recorded review items in the same work file.
- `SOURCE PUSH NOT APPROVED`: do not push source to `main`.
- `SOURCE PUSH APPROVED`: Claude may push only the explicitly approved source work.
- `AWAITING CHATGPT REVIEW`: source work stops; auditor inspects actual branch/commit/diff and records the verdict/next action.
- `AWAITING LIVE VALIDATION`: auditor performs read-only live validation when browser access is available.
- `CLOSED`: accepted and immutable; later work gets a new file.

## Review and deployment chain
Before judging work, confirm the production/base SHA, scope, non-change boundary, relevant architecture/source, and active work status. After Claude implementation, independently inspect the actual pushed review/main commit rather than accepting the report alone.

After a production push, record exact `main` SHA and GitHub Actions/deployment evidence. When live validation is required, do not mark `CLOSED` until customer behavior matches the accepted architecture/source. A browser/tool outage is infrastructure failure, not product failure; keep live validation pending rather than requesting a source change.

## Required root pointer
The repository-wide startup file must retain this concise pointer:

> Before normal repository startup, check `Project-work-instructions`; if it has newer changes, sync it and read `project-work/AGENTS.md` plus the active work file first.

Do not duplicate these coordination rules into root instructions.
