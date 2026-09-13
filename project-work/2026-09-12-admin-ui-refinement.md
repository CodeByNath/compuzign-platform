# Admin UI Refinement

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Codex**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `965c41e0f07206a6009e0f1f1e93b3953a05bb85`
- Approved topic head: `965c41e0f07206a6009e0f1f1e93b3953a05bb85`

## Current live defect
The deployed focused-card label exposed the true missing link: the drawer Overview shows existing `CZPRCI36GRM`, but every focused inclusion card reported `Platform ID not assigned`. The data exists; the client-side selection resolver dropped it.

## Reviewer audit
Independent review confirms `resolveRateSheetSelection()` is the shared reconstruction path used by the Tier view. The approved candidate adds only:
`platform_id: rateItem?.platform_id ?? null`
so the Rate Sheet row's existing CZPRCI survives client-side re-resolution into the focused lower deck.

Changed source is limited to:
- `resources/ts/package-station/rateSheetLabels.ts`
- `scripts/rate-sheet-price-option-selection-contract.ts`
- rebuilt `dist/js/admin-station.js`

The new contract resolves a row carrying `CZPRCI36GRM` through the shared resolver and asserts that exact Platform ID remains on the selection.

## Safeguards verified
- No identity minting, assignment, migration, persistence, endpoint, or registry behavior changes.
- No pricing, quantity, selection, or relationship behavior changes.
- The existing drawer path remains unchanged.
- The earlier focused presentation label remains unchanged and now receives the real ID.
- The earlier unrelated migration-notice correction remains reverted.

Builder reports focused contract, TypeScript, build, and `git diff --check` passing.

## Production handoff

Builder fast-forwarded GitHub `main` from `d07c73c` to the exact approved
`965c41e0` head with no amendment or unrelated source change. **Deploy to
Hostinger** run `34755576823` started for that exact SHA and is currently
`in_progress` (checked 2026-09-13 11:52 UTC). No live-data mutation was made.

Reviewer must verify the deployment result and targeted live behaviour: the
focused `2 vCPU` card must display the same `CZPRCI36GRM` as its Overview
drawer. Builder stops here pending that independent verification.
