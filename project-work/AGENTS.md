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
- The Builder may validate the live CompuZign UI through Chrome integrated with VS Code **when that browser capability is actually available and authorized**. Browser access is not presumed; report its availability and evidence. Default to read-only observation.

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
- Nath validates only the deployed CompuZign Admin/customer interface when that intended UI exists; all underlying runtime/API verification belongs to the technical agents.
- The Builder should first use available authorized VS Code Chrome access for read-only checks of the deployed CompuZign Admin UI at `https://compuzign.weerax.com/studio/` and relevant customer pages. Record exact deployed SHA, tested URL, screenshots/observations and failures. If browser access is unavailable, say so; never assign low-level browser/API checks to Nath.
- The Reviewer audits Nath's reported live result together with the exact deployed `main` SHA and deployment evidence, then either closes the work or issues the next bounded Builder correction.

## Owner validation boundary — permanent instruction (2026-10-09)
- **Never ask Nath to perform "WordPress testing", manual REST/API calls, browser-console scripts, nonce/cookie checks, direct backend endpoint probing, or low-level storage verification.** Do not reintroduce these as release or phase gates, even when implementation runs on WordPress.
- The product under validation is **CompuZign**. The runtime/hosting technology does not change platform ownership or turn an infrastructure test into an Owner task.
- Builder owns automated/source-level integration, authorization, API, lifecycle and persistence verification, using safe non-production test facilities as needed. Reviewer independently audits that evidence and the deployed commit. Do not erase technical verification obligations; route them to the technical actors.
- Prefer Builder's authorized VS Code Chrome validation first. Ask Nath only for **meaningful live CompuZign Admin/customer UI behavior** checks that need Owner judgement after the intended interface is available, with the page and visible actions clearly identified. If there is no appropriate UI yet, record that UI validation is unavailable and defer that *UI check* to the relevant UI phase without requesting manual backend substitutes.
- Chrome/browser observation is **read-only by default**: no Save, Publish, Enable/Disable, user or pricing changes, persistent test records, admin configuration changes, or destructive operations on live production without separate explicit Owner authorization for that exact action. A browser session cannot by itself prove runtime identity, persistence or deployment; correlate with repository SHA, Actions and technical evidence.
- Describe unresolved verification internally as "CompuZign platform integration/contract evidence", not as a request for "WordPress testing" from Nath. This instruction controls future work handoffs and supersedes contrary validation requests in older active files.

## Baseline-first independent audit rule
Before calling an implementation a violation or requiring a new safeguard, **compare the exact behaviour against the existing owning/analogous Station and shared platform implementation in `main`** (source, Code Maps, contracts, frontend orchestration, and tests). Classify each finding explicitly as (a) proven deviation from current architecture, (b) existing baseline behaviour adopted by the Builder, (c) new-domain risk needing proportional verification, or (d) unproven concern. Do not impose stricter theoretical/database/industry patterns on one Station when the platform's accepted Stations use a different pattern, unless a concrete new failure mode justifies it. Read frontend and backend together before alleging missing Publish orchestration. Correct mistaken findings promptly in the same work file, explicitly superseding old instructions so the Builder does not undertake unnecessary changes. External best practices are secondary to verified repository authority and Owner-approved rules.

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
