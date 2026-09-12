# Project Work Agent Rules

This folder coordinates work on `Project-work-instructions`. Platform architecture still comes from root `AGENTS.md`, `docs/ai-index.md`, relevant Code Maps, authoritative source, and approved history/work documents.

## Startup
On every new session/tool:
1. Check and sync `Project-work-instructions`.
2. Read this file.
3. Read the active work file and follow its status literally.
4. Then read root `AGENTS.md` -> `docs/ai-index.md` -> relevant Code Map only -> authoritative source -> history only when needed.
5. Do not rely on remembered chat state when the coordination branch can answer it.

## Roles
Roles are governance roles, not model/vendor names.

**Builder / implementation agent**
- The Builder is whichever implementation agent Nath assigns for the active work item, e.g. Claude Code or Codex.
- The Builder is the sole source-editing agent for that work item.
- Implement only when the active file says the Builder should act.
- Follow root `AGENTS.md`, architecture, Code Maps, branch hygiene, validation, and active scope.
- Record changed files, tests/contracts, exact SHAs, unresolved risks, and push/deployment state in the same work file.
- Stop when independent review is required.

**Independent Reviewer / Auditor**
- The Reviewer is the separately assigned auditing session/agent.
- Audit architecture, source, Git history/diffs, deployment evidence, runtime state, and live behaviour.
- Source is read-only for the Reviewer. The Reviewer may write coordination files only inside `project-work/` on `Project-work-instructions`.
- Implementation corrections are instructions to the Builder, not Reviewer source edits.
- Do not alter WordPress/runtime/platform state unless Nath explicitly authorizes that exact action.
- Never assume local, pushed `main`, successful Actions, deployed Hostinger, stored runtime state, and live behaviour are identical.
- Verdict each review: `Proceed`, `Proceed with safeguards`, or `Stop — architectural risk`.
- A Reviewer does not become the Builder merely because both use the same vendor/model family.

When useful, active work files state `Builder: ...` and `Reviewer: ...` explicitly.

## Capability safeguard
The Reviewer must preserve required behaviour unless Nath changes it. Reject fixes that remove capability, add unnecessary user steps, or substitute a reduced flow. Distinguish the defective mechanism from the required outcome. Where relevant state **Must preserve**, **Must remove**, and **Must not substitute**.

## Work files and branches
- One work area stays in one Markdown file until closed; unrelated work gets a new file.
- Keep work files normally <=600 words.
- Repository branch limit: `main`, `Project-work-instructions`, plus at most one active topic/review branch.
- Before closing, verify completed topic branches are merged/contained and remove stale local/remote branches. Never rewrite production history for cleanup.

## Status vocabulary
- `READY FOR BUILDER`
- `AWAITING BUILDER RESPONSE`
- `SOURCE PUSH NOT APPROVED`
- `SOURCE PUSH APPROVED`
- `AWAITING REVIEWER REVIEW`
- `AWAITING LIVE VALIDATION`
- `CLOSED`

Legacy files using `READY FOR CLAUDE`, `AWAITING CLAUDE RESPONSE`, or `AWAITING CHATGPT REVIEW` are equivalent legacy statuses and need no retrospective rewrite.

## Review chain
Before judging work, confirm production/base SHA, scope, non-change boundary, relevant architecture/source, and active status. After implementation, independently inspect the actual pushed candidate. After production push, record exact `main` SHA and deployment evidence. If live validation is required, do not close until live behaviour matches the accepted result.
