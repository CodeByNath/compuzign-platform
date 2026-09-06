# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 3 clean-candidate preparation only**
- Auditor verdict: **Proceed with safeguards**.
- Phase 2 remains accepted on deployed `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.
- Current Phase 3 head `0bfc61a7c4feabdc019d0bb04f3aa3d0a9e7e92c` is **not approved for main yet**.

## Independent review result
The second-round correction now matches the approved interaction:
- Customer Selection Rules panel retains `Default | Edition ...` scope tabs;
- Featured inclusions and all policy-summary metrics follow the selected declaration;
- one `Edit Customer Options` action now targets the currently selected scope;
- Default dispatches directly to the existing Default Inclusions editor;
- an Edition dispatches the same existing Tier drawer with that exact Edition id, preselecting its existing Edition session/Inclusions editor;
- no new drawer/action/endpoint/controller/identity family was introduced;
- standalone Customer Selection Rules drawer remains retired;
- ordinary Tier/Add-on and customer-facing source remain outside scope.

Source inspection confirms `TierComposableMiddleShell` dispatches `active.id`, and `PackageTierWorkspace.dispatchDeclarationEdit()` carries that declaration identity through the existing Tier drawer `edit` intent. This satisfies the editor-target requirement without tab selection itself mutating data.

## Blocking issue — branch hygiene only
`main@3cc88e83... -> 0bfc61a7...` is **2 commits ahead**. The ancestry contains intermediate `4375642e...`, which was previously a rejected review candidate because it lacked the selected-scope editor target. Project work rules require rejected/intermediate review commits not to enter `main` ancestry and require the final accepted tree to be collapsed onto a fresh branch from current production `main`.

This is not a product/code rejection. Do not alter the accepted final tree unless required to reproduce it cleanly.

## Claude — next action
1. From exact current production `main@3cc88e83f93e57fec7b61419129cd93a8432809b`, create/reset the Phase 3 review branch to a **single clean candidate commit** whose tree matches the current accepted `0bfc61a7...` final tree.
2. Do not include `4375642e...` or `0bfc61a7...` in the eventual `main` ancestry.
3. Re-run/confirm the same focused validation needed for the clean candidate (`tsc`, build, docs check, focused Admin/Edition/customer-policy contracts; unchanged pre-existing failures may remain documented).
4. Record exact clean branch/SHA and confirmation that its tree matches the reviewed final tree, then set **AWAITING CHATGPT REVIEW**.
5. Do not push `main` yet. Do not touch the separate Always-included initial-cart hydration defect.

After the clean single-commit candidate is independently verified, source push approval can be granted; live Admin validation will still be required after deployment.