# Admin UI Refinement

## Status
- **SOURCE PUSH APPROVED**
- Builder: **Codex**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `d07c73c7312316ba2ff6994f100f142046164be9`
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

## Next action
Builder may move the **exact approved head `965c41e0f07206a6009e0f1f1e93b3953a05bb85`** to `main` with no amendment or unrelated source change. After push, record the resulting `main` SHA and deployment workflow result here, then stop for Reviewer deployment verification and targeted live validation that the focused `2 vCPU` inclusion shows the same `CZPRCI36GRM` as its Overview drawer.
