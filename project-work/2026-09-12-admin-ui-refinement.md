# Admin UI Refinement

## Status
- **SOURCE PUSH APPROVED**
- Builder: **Claude Code**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `d8f3bba531c2ecaa57ad1f6b0cd506655bf3b497`
- Approved topic head: `d85544a4142c440c75fe3a25096bbcc759fa2aa5`

## Scope
One Admin UI work item. Preserve architecture, pricing, identity semantics, persistence, lifecycle authority, customer UI and customer flows. No backfill, migration-on-read, or new maintenance mechanism.

## Reviewer acceptance
Reviewer independently inspected the complete topic-branch candidate from production base `d8f3bba5` through `d85544a4`. GitHub confirms a clean fast-forward candidate: 10 commits ahead, 0 behind, merge base exactly current `main`.

Accepted work:
- Promotions hidden from navigation only; capability/data/routes preserved.
- Maintenance diagnostics moved to bottom; **Per values** removed from Rate Sheet overview only, with the directly affected contract updated.
- Family connection metrics use **Tiers / Service Categories / Services / Inclusions**; redundant internal IDs are presentation-hidden while data remains.
- Responsive Package Home order is Family -> Tier selector/tabs -> Tier occupant using existing earned breakpoints.
- Focused/list inclusion and connection identity presentation now uses Platform IDs where required; Tier System internal ID and redundant Rate Sheet/family/tier-group IDs are hidden.
- Build Your Own spacing and **Composable Occupant** heading corrected.
- Inclusion-list Platform ID is carried through the existing read/projection path only. **No backfill, no migration-on-read, no identity minting/write path was added.**
- Bundle-child compatibility safeguard preserves existing `cz_platform_id` and adds `platform_id` alongside it; no response-key removal.

## Service Overview
Independent source/history review confirms the retired Command Centre presentation was already removed by `34c8175b` (2026-07-23). The current Tier drawer Service connection is a live parent-Service relationship, not a retired component. **Do not remove it.** No further source change is required unless Nath identifies a different concrete UI element.

## Validation evidence
Builder reports clean `npx tsc --noEmit`, successful `npm run build`, successful `npm run docs:check`, relevant Package/Tier/Rate Sheet contracts and PHP projection tests passing. `contract:admin-station-css` retains only the same six pre-existing unrelated baseline failures; no new CSS-contract regression was introduced.

## Next action
Claude may fast-forward/push the **exact approved topic head `d85544a4`** to `main`. Do not amend or add source changes during the push. After push, record the exact resulting `main` SHA and deployment/workflow result here, then stop for Reviewer verification and final live Admin validation. Keep `admin-ui-refinement` until production/deployment/live acceptance is complete.
