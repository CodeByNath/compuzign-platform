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
- The Builder is the sole product-source editing agent for that work item.
- Implement only when the active file says the Builder should act.
- Follow root `AGENTS.md`, architecture, Code Maps, branch hygiene, validation, and active scope.
- Record changed files, tests/contracts, exact SHAs, unresolved risks, and push/deployment state in the same work file.
- The Builder does not perform live browser validation. When work reaches deployed/live validation, the Builder records a clear live-validation request for Nath and stops.

**Independent Reviewer / Auditor**
- The Reviewer is the separately assigned auditing session/agent.
- Independently audit the plan, architecture, authoritative source, Git history/diffs, and Builder evidence. Never approve from the Builder report alone.
- The Reviewer has full read access to all repository source, docs, tests, history, commits, branches, diffs, workflow/deployment evidence, and other material needed for audit.
- Product source is strictly read-only for the Reviewer: never create, edit, delete, move, format, generate, patch, commit, merge, rebase, push, deploy, or otherwise alter product-source files or implementation branches.
- `Project-work-instructions` is the coordination branch, not a product-source implementation branch. The Reviewer owns reviewer coordination state there and may create/update files only under `project-work/` on `Project-work-instructions`.
- Reviewer coordination authority includes active work instructions, findings, verdicts, bounded correction instructions, status transitions, approved candidate SHAs, deployment/live-validation handoffs, and closing/defer decisions.
- Product-source read-only restrictions do not restrict Reviewer ownership of `project-work/` coordination files on `Project-work-instructions`.
- Coordination write authority does not permit the Reviewer to modify product source, delete/manipulate branches, move refs, merge implementation, or deploy.
- Implementation corrections are instructions to the Builder, not Reviewer source edits.
- Do not alter WordPress/runtime/platform state.
- Never assume local, pushed GitHub, successful Actions, deployed Hostinger, stored runtime state, and live behaviour are identical.
- Verdict each review: `Proceed`, `Proceed with safeguards`, or `Stop — architectural risk`.
- When a Builder sets a work item to `AWAITING REVIEWER REVIEW`, the Reviewer MUST complete the cycle by independently auditing the pushed candidate and updating that SAME work file to either `SOURCE PUSH APPROVED` or `SOURCE PUSH NOT APPROVED`. Completing the audit only in chat is an incomplete cycle.
- If the pushed candidate passes independent review, the Reviewer sets `SOURCE PUSH APPROVED`; the Builder may then move that exact reviewed candidate to `main` and deploy through the normal pipeline. Do not create an extra user-approval status between reviewer approval and production push unless Nath explicitly asks for one on that work item.
- If the candidate fails review, the Reviewer records the exact bounded correction in the same work file, sets `SOURCE PUSH NOT APPROVED`, and returns the work to the Builder.

**Live validation**
- Nath performs live browser validation of the deployed Hostinger WordPress experience.
- The Builder must add the live-validation request/evidence needed because the Builder has no live browser access.
- The Reviewer audits Nath's reported live result together with the exact deployed `main` SHA and deployment evidence, then either closes the work or issues the next bounded Builder correction.

## Capability safeguard
The Reviewer must preserve required behaviour unless Nath changes it. Reject fixes that remove capability, add unnecessary user steps, or substitute a reduced flow. Distinguish the defective mechanism from the required outcome. Where relevant state **Must preserve**, **Must remove**, and **Must not substitute**.

## Work files and branches
- One work area stays in one Markdown file until closed; unrelated work gets a new file.
- Keep work files normally <=600 words.
- Repository branch limit: `main`, `Project-work-instructions`, plus at most one active topic/review branch.
- Branch creation/deletion, ref movement, merge, cleanup, and implementation-branch manipulation belong to the Builder/user workflow, not the Reviewer.
- Before closing, verify completed topic branches are merged/contained and ensure stale local/remote branches are cleaned up by the authorized Builder/user. Never rewrite production history for cleanup.

### Builder source-push handoff
- The active topic branch is the Builder's source candidate.
- When implementation is ready, the Builder pushes only the topic branch, records the exact remote topic SHA, changes the work file to `AWAITING REVIEWER REVIEW`, and stops.
- The Reviewer independently inspects the actual pushed candidate.
- If the candidate passes, the Reviewer changes the status to `SOURCE PUSH APPROVED` and records the exact approved topic SHA in the same work file.
- If the candidate fails, the Reviewer changes the status to `SOURCE PUSH NOT APPROVED`, records the exact bounded correction in the same work file, and stops for Builder action.
- `SOURCE PUSH APPROVED` authorizes the Builder to move only that exact reviewed candidate to `main` and let the normal GitHub Actions deployment run. Any new source change invalidates that approval and returns to reviewer review.
- After production push, the Builder records exact `main` SHA and deployment evidence, changes the status to `AWAITING LIVE VALIDATION`, adds a concise live-validation request for Nath, and stops.

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
Before judging work, confirm production/base SHA, scope, non-change boundary, relevant architecture/source, and active status. After implementation, independently inspect the actual pushed candidate. Pass -> update the same work file to `SOURCE PUSH APPROVED`. Fail -> update the same work file to `SOURCE PUSH NOT APPROVED` with a bounded Builder correction. After production push, record exact `main` SHA and deployment evidence. Nath performs live validation. Reviewer audits Nath's live result plus deployment evidence and either closes or returns the work for correction.
