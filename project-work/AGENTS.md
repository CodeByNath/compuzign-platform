# Project Work Agent Rules

This folder is the shared work handoff area for Nath, Claude, and ChatGPT on branch `Project-work-instructions`. It coordinates work only; it does not replace `AGENTS.md`, `docs/ai-index.md`, Code Maps, architecture docs, or authoritative source.

## Entry rule
Whenever an agent starts a new session, resumes work, begins an audit, or is asked to check project work:

1. Check whether `Project-work-instructions` has changes not present locally.
2. If it does, pull/sync it first.
3. Read this file.
4. Read the active work file for the relevant area.
5. Follow that file's current status literally.
6. Then continue normal repository reading: root instructions -> `docs/ai-index.md` -> relevant Code Map only -> authoritative source -> relevant history only if needed.

If there is no active/new work instruction, continue normally from the user's chat prompt and standard repository read order.

## Work-file rule
- One area of work stays in one Markdown file until that work is closed.
- Do not create a new file for every review round, correction, implementation pass, source push, deployment check, or browser audit of the same work.
- New unrelated work gets a new file.
- Keep each work file normally at or below 600 words.
- Record only decisions, scope, evidence, SHAs, files changed, validation, risks, review findings, approvals, deployment evidence, and closure state. Do not paste long transcripts or full diffs.

## Status behavior
- `READY FOR CLAUDE`: Claude proceeds immediately. Do not ask whether to start.
- `AWAITING CLAUDE RESPONSE`: Claude answers the recorded review items, updates the same file, pushes the coordination update, then follows the resulting status.
- `SOURCE PUSH NOT APPROVED`: implementation may remain local; do not push source to `main`.
- `SOURCE PUSH APPROVED`: Claude may push only the approved source work, then records the exact production SHA and deployment evidence in the same work file.
- `AWAITING CHATGPT REVIEW`: Claude stops source work. ChatGPT audits the report/evidence and records approval, safeguards, questions, or corrections through the coordination workflow.
- `AWAITING LIVE VALIDATION`: source/deployment has been independently reviewed; ChatGPT performs read-only live validation where relevant.
- `CLOSED`: work is accepted and immutable. Do not reopen it; later work gets a new file.

## Before implementation or audit
Read the active work file first. Confirm the production/base SHA, scope, hard non-change boundary, relevant Code Map, and authoritative source before judging or changing anything. Never rely on remembered chat state instead of the coordination branch.

## After Claude work
Claude updates the same work file with a concise report: files changed, behavior implemented, identity/persistence/mutation path where relevant, validation performed, unresolved risks/questions, local/source SHA state, and current status. Push the coordination-file update to `Project-work-instructions` so ChatGPT can independently review it.

## After ChatGPT audit
Record one clear result for the current round: `Proceed`, `Proceed with safeguards`, or `Stop — architectural risk`, plus only the evidence/corrections needed for Claude. Keep source push blocked unless explicitly approved by Nath.

## After production push
Record the exact `main` commit SHA, workflow/deployment evidence, and any divergence discovered between local, GitHub, deployment, stored runtime state, and live customer behavior. These states are never assumed identical.

## Closure
Close only when required architecture, source, tests/contracts, deployment, stored runtime state, and live behavior agree for the approved scope. Mark `CLOSED` in the same file and leave it as history.

## Required root startup line
Claude must add one concise line to the first repository-wide Markdown startup instruction read by agents so future sessions check this coordination branch before normal repository reading. Keep it to this meaning only:

> Before normal repository startup, check `Project-work-instructions`; if it has newer changes, sync it and read `project-work/AGENTS.md` plus the active work file first.

Do not duplicate these rules into root instructions; the root file only needs that pointer.