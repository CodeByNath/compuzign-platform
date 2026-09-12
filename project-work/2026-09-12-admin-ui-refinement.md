# Admin UI Refinement

## Status
- **READY FOR BUILDER**
- Builder: **Claude Code**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `d8f3bba531c2ecaa57ad1f6b0cd506655bf3b497`
- Topic branch: `admin-ui-refinement`, currently through `7785885b`
- No merge/push to `main` until Reviewer approves the complete branch.

## Workflow
This is one Admin UI work item. Continue in phases, one commit per phase on `admin-ui-refinement`. When all requirements are complete, validate, push only the topic branch, record exact commits/results here, set `AWAITING REVIEWER REVIEW`, and stop.

## Requirements
1. Hide Promotions navigation only; preserve capability/data/routes. Move Maintenance diagnostics to bottom. Hide **Per values** from overview presentation.
2. Package-family connections show **Tiers / Service Categories / Services / Inclusions**. Hide internal IDs where Platform IDs already appear; retain internal IDs in data.
3. Responsive Package Home order including Grid: Family -> Tier selector/tabs -> Tier occupant. At responsive Family layout, description/status/metrics sit beneath selector; remove metrics top border; use the existing earned breakpoint.
4. Remove old **Service Overview** presentation from Default, Add-on and Build Your Own only after proving the intended component is retired. Do not remove valid live Service/inclusion relationships.
5. Platform-ID presentation: focused inclusion shows Platform ID, not Inclusion ID/Rate Sheet row ID; inclusion connections show applicable Platform IDs; inclusion list rows show Platform ID instead of internal ID; hide Tier System ID; hide redundant family/tier-group internal IDs; remove duplicate Rate Sheet Platform ID beneath name.
6. Build Your Own: spacing plus heading exactly **Composable Occupant**.

## Reviewer audit of current candidate
Current branch is six commits ahead of `main`. Implemented Promotions/Maintenance changes, family metrics/ID hiding, responsive ordering, focused Platform-ID changes, Tier System ID hiding, Build Your Own copy/spacing and generated build are directionally acceptable. Three requirements remain unresolved; production push is not approved.

### Required correction A — `Per values`
The approved UI requirement supersedes the old presentation assertion. Remove `Per values` from the overview and update only the directly affected contract so it asserts the approved presentation. Do not change Rate Sheet pricing semantics or stored data.

### Required correction B — inclusion-list Platform ID
Complete the list-row requirement. Extending the read/projection path so the existing Rate Sheet row `platform_id` reaches `TierLowerDeck` is acceptable. Do not change identity semantics.

**No backfill.** Do not add an automatic backfill, migration-on-read, or new maintenance path. If any legacy record truly lacks a required Platform ID, reuse the existing **CompuZign Admin action/button** from prior Platform-ID work for deliberate admin-triggered repair/minting. Do not create a second mechanism. Prefer projecting existing IDs whenever available.

### Required correction C — `Service Overview`
Do one targeted source/history trace for the exact old presentation Nath means. Current evidence says the Connections-tab Service module inspected so far is live. Do not delete that live module just to satisfy wording. If a separate retired Service Overview exists, remove only that presentation/dead code. If none is found, record the evidence here and leave this item for Reviewer/Nath decision.

## Validation
Run `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, relevant focused contracts, and compare `contract:admin-station-css` against its existing baseline failures. No customer UI changes, pricing/resolver changes, persistence migration, identity mutation, or unrelated refactor.
