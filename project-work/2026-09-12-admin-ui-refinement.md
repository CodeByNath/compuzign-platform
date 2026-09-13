# Admin UI Refinement

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Codex**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `b537ea96e426476ca5b636d6060e4821d9057bdb`
- Pushed Builder topic head: `b537ea96e426476ca5b636d6060e4821d9057bdb`

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
- The focused card's display is now the bare existing ID, with no label or placeholder.
- The earlier unrelated migration-notice correction remains reverted.

Builder reports focused contract, TypeScript, build, and `git diff --check` passing.

## Display-only follow-up

User requested removal of the visible `Platform ID` label and `Platform ID not
assigned` placeholder. `b537ea96` changes the focused card to render only the
existing `CZPRCI…` value, or nothing when the row has none. It does not change
the resolver, drawer, stored identity, or any action.

## Production handoff

Builder fast-forwarded GitHub `main` from `965c41e0` to `b537ea96`. **Deploy
to Hostinger** run `34757201800` started for that exact SHA and is currently
`in_progress` (checked 2026-09-13 12:28 UTC). No live-data mutation was made.

Reviewer must verify the deployment result and targeted live behaviour: the
focused `2 vCPU` card must display `CZPRCI36GRM` without a label or placeholder.
Builder stops here pending that independent verification.
