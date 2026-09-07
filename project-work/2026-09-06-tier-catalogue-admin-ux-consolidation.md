# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — exact Phase 3 corrected candidate only**
- Auditor verdict: **Proceed with safeguards**.
- Production remains `main@75105e92dcdd751c27e48f46491c0cac1f486dd7` until Claude pushes the approved commit.
- Approved candidate: `review/tier-catalogue-admin-ux-phase3-correction-v3@fa4b53b5ee0193b0580f31af876225c812056108`.

## Independent verification
GitHub now resolves the reported branch and SHA correctly. The candidate:
- is exactly 1 commit ahead / 0 behind production `main@75105e92...`;
- has merge base and direct parent exactly `75105e92...`;
- includes only the reviewed Phase 3 UI correction, regenerated Admin assets, focused contracts, and the required current-state Code Map updates;
- preserves the previously reviewed source tree: core source blobs including `PackageTierWorkspace.tsx` and `TierComposableMiddleShell.tsx` are identical to reviewed `9318ce53...`;
- updates `tier-composable-occupant-admin-ui.md` to correctly document that `PackageTierWorkspace` owns `selectedDeclarationId` / `activeDeclarationScope` and one scope drives upper `TierDetailPanel`, Featured Inclusions, policy metrics, and Edit target.

Reviewed behavior remains accepted:
- Default/Edition scope selection drives upper Build Your Own price/billing, Included features, Common questions, lower Featured Inclusions, Customer Selection Rules metrics, and Edit target;
- left lower column is Featured only;
- right lower column is tabs -> metrics -> `Edit`;
- tabs reuse shared `StationTabSet`; Edit uses existing Admin primary-button treatment;
- Edition price reuses established `resolveRateSheetSelection` logic;
- selected-scope editor routing/identity remains unchanged;
- no backend/customer/quote/cart authority changed.

Claude reports `tsc`, build, docs check and focused contracts all pass on this exact clean candidate. No further source redesign is requested.

## Claude — next action
Push **exactly `fa4b53b5ee0193b0580f31af876225c812056108`** to `main` with no additional source changes. Then:
1. record the resulting exact `main` SHA;
2. verify GitHub Actions deployment for that exact head SHA and record run/result;
3. keep the review branch until deployment/live validation pass;
4. set **AWAITING LIVE VALIDATION** after successful deployment;
5. do not touch the separate Always-included initial-cart hydration defect and do not start another phase.

## Live Admin gate after deploy
Read-only validation required:
- scope tabs appear in the top-right of the right Customer Selection Rules column;
- lower-left contains only Featured Inclusions;
- right column shows tabs, selected-scope metrics, then bottom-right `Edit` primary action;
- switching Default/Edition updates upper price/billing, Included features, Common questions, Featured Inclusions, rule metrics, and Edit target together;
- Edition `Edit` opens that exact Edition Inclusions editor; Default `Edit` opens Default Inclusions;
- ordinary Tier/Add-on UI remains unchanged.

Do not close until the deployed live gate passes and the review branch is cleaned up.