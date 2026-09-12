# Admin UI Refinement

## Status
- **AWAITING LIVE VALIDATION**
- Builder: **Claude Code**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `d85544a4142c440c75fe3a25096bbcc759fa2aa5`
- Approved topic head: `d85544a4142c440c75fe3a25096bbcc759fa2aa5` — matches `main` exactly

## Scope
One Admin UI work item. Preserve architecture, pricing, identity semantics, persistence, lifecycle authority, customer UI and customer flows. No backfill, migration-on-read, or new maintenance mechanism.

## Accepted source
Reviewer independently audited the complete candidate and approved the exact topic head `d85544a4`. `main` was then fast-forwarded to that exact SHA with no additional source changes.

Accepted work:
- Promotions hidden from navigation only; capability/data/routes preserved.
- Maintenance diagnostics moved to bottom; **Per values** removed from Rate Sheet overview only, with the directly affected contract updated.
- Family connection metrics use **Tiers / Service Categories / Services / Inclusions**; redundant internal IDs are presentation-hidden while data remains.
- Responsive Package Home order is Family -> Tier selector/tabs -> Tier occupant using existing earned breakpoints.
- Focused/list inclusion and connection presentation uses Platform IDs where required; Tier System internal ID and redundant Rate Sheet/family/tier-group IDs are hidden.
- Build Your Own spacing and **Composable Occupant** heading corrected.
- Inclusion-list Platform ID is carried through the existing read/projection path only. No backfill, migration-on-read, minting, or write-on-read was added.
- Bundle-child compatibility preserves existing `cz_platform_id` and adds `platform_id` alongside it.

## Service Overview
The retired Command Centre presentation was already removed by `34c8175b` (2026-07-23). The current Tier drawer Service connection is a live parent-Service relationship, not a retired component. **Do not remove it** unless Nath identifies a different concrete UI element.

## Deployment verified
Reviewer independently verified GitHub Actions run **34698758330** for head SHA `d85544a4`:
- workflow: **Deploy to Hostinger**
- event: push to `main`
- conclusion: **success**
- frontend build: success
- source deployment via SSH: success
- built dist assets via SCP: success
- completed 2026-09-12 14:16:01 UTC

This verifies the approved production commit crossed the GitHub Actions deployment boundary successfully. It does not by itself prove live Admin rendering/runtime state.

## Validation evidence
Builder reported clean `npx tsc --noEmit`, successful `npm run build`, `npm run docs:check`, relevant Package/Tier/Rate Sheet contracts and PHP projection tests. `contract:admin-station-css` retains only the same six pre-existing unrelated baseline failures; no new CSS-contract regression.

## Remaining gate
Perform read-only authenticated live Admin Station validation against deployed Hostinger. Check the changed surfaces at desktop and responsive widths: hidden Promotions nav, Maintenance ordering, no Per-values overview rollup, Family metrics/ID presentation, Package Home responsive order, focused/list Platform IDs, hidden Tier System/internal IDs, and Build Your Own heading/spacing. Also confirm no visible regression in live Tier Service connection.

Do not close or delete `admin-ui-refinement` until live validation passes. This reviewer session currently has no authenticated live-browser control, so no live acceptance is claimed.
