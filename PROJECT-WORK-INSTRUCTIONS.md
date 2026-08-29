# CompuZign Project Work Coordination

## Purpose
This branch coordinates Nath, ChatGPT (independent auditor), and Claude Code. It is workflow/governance only, never CompuZign Platform architecture.

- Production branch: `main`
- Coordination branch: `Project-work-instructions`
- Claude is the only source-code editor.
- ChatGPT is source read-only and may update only this coordination control file on this branch.
- Never merge coordination files into `main`.
- Never treat local, pushed, workflow-complete, deployed, and live-runtime states as identical.

## Claude startup rule
At the start of every new Claude session/chat, and whenever Nath asks you to check project work:

1. Fetch/pull `Project-work-instructions`.
2. Check whether this branch changed since your last read.
3. Read this file first.
4. Read the current open file under `project-work/` completely.
5. Follow its current status literally.
6. Do not ask Nath whether to proceed when status already authorizes the next action.

Status meanings:

- `READY FOR CLAUDE` -> start the requested audit/implementation immediately.
- `AWAITING CLAUDE RESPONSE` -> answer the recorded review questions/corrections and update the same work file.
- `SOURCE PUSH NOT APPROVED` -> keep all source work local.
- `SOURCE PUSH APPROVED` -> push only the approved source work to `main`, then record the exact production commit and deployment evidence.
- `AWAITING CHATGPT REVIEW` -> stop source work and wait for Nath/ChatGPT review.
- `CLOSED` -> do not reopen; new work gets a new file.

Do not rely on remembered chat state instead of checking this branch.

## Work-file structure
Claude owns creation and maintenance of coordination work files on this branch:

```text
PROJECT-WORK-INSTRUCTIONS.md
project-work/
  YYYY-MM-DD-phase-or-topic.md
```

Rules:

- One work item = one Markdown file.
- Keep each work file normally <=600 words.
- Record decisions, evidence, SHAs, filenames, tests, questions and approvals; do not paste long transcripts or diffs.
- Preserve dated review rounds.
- Never silently rewrite an approved instruction.
- When work is finished and live validation is accepted, mark the file `CLOSED`.
- Closed files remain as history.

## Immediate bootstrap action for Claude
The currently approved work is **Phase 8E - Add-on Focused Occupant Parity**, based on `main@7b4b78608d4a229209a1e9c89116334a1917f4bf`.

On your next branch sync, do this without asking Nath for permission:

1. Create `project-work/2026-08-29-phase-8e-addon-focused-parity.md` on `Project-work-instructions`.
2. Put the existing Phase 8E instruction you already pulled/read into that file, condensed to <=600 words without changing its scope, non-change boundary, selected-state rules, or acceptance intent.
3. Include these sections: Status, Objective, Required Behavior, Hard Non-Change Boundary, Acceptance Tests, Claude Report, Review Rounds, Production Push Record, Live Browser Validation.
4. Set status `READY FOR CLAUDE` and source push `NOT APPROVED`.
5. Commit/push only the coordination-file change to `Project-work-instructions`.
6. Then immediately begin Phase 8E locally because `READY FOR CLAUDE` is already authorization to work.
7. Do not push Phase 8E source changes to `main` until Nath explicitly approves source push.

Phase 8E remains focused occupant parity only. Do not change Quote Summary totals, Total Contract Value, Initial Payment, `QuoteDetailsOverlay`, Total Commitment tabs, backend resolvers, WordPress persistence, admin behavior, Commercial Leg schemas, primary replacement behavior, Cost Builder behavior, focused visual design, or customer terminology.
