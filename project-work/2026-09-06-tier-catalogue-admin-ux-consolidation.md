# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — Phase 3 exact candidate only**
- Auditor verdict: **Proceed with safeguards**.
- Phase 2 remains accepted on deployed `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.
- Approved Phase 3 candidate: `review/tier-catalogue-declaration-navigation@75105e92dcdd751c27e48f46491c0cac1f486dd7`.

## Independent verification
The clean-candidate gate passes:
- `75105e92...` is exactly **1 commit ahead / 0 behind** current production `main@3cc88e83...`;
- its direct parent is exact production `3cc88e83...`;
- rejected/intermediate review commits are no longer in the candidate ancestry;
- GitHub reports tree SHA `09fbed0079ab59662d722104df5f9ecd9f2acbd7` for `75105e92...`, exactly matching the previously reviewed final `0bfc61a7...` tree SHA, so the clean collapse introduced no file/content drift;
- the reviewed implementation matches the approved UX: `Default | Edition ...` scope tabs inside Customer Selection Rules; Featured and policy-summary projections follow selected scope; one Edit action targets that exact selected declaration using existing Tier/Edition editor/session; standalone Customer Selection Rules drawer is retired; no third Editions card action; no new backend identity/controller/endpoint; ordinary Tier/Add-on and customer-facing source remain outside scope.

Claude reports this exact clean commit reconfirmed with `tsc`, build, docs check, and focused declaration-scope / inclusion-policy / Admin UX / Tier drawer contracts. Previously documented unrelated baseline failures remain outside this work item.

## Next action — Claude
Push **exactly `75105e92dcdd751c27e48f46491c0cac1f486dd7`** to `main` with no additional source changes. Then:
1. record resulting exact `main` SHA;
2. record GitHub Actions deployment run/result for that exact head SHA;
3. do not delete the review branch until deployment and live validation pass;
4. after successful deployment set **AWAITING LIVE VALIDATION** in this same file;
5. do not start any further Admin/Edition phase and do not touch the separate Always-included initial-cart hydration defect.

## Live Admin gate after deploy
Validate read-only:
- Customer Selection Rules panel shows `Default` plus every existing Build Your Own Edition tab;
- Default is selected initially;
- switching to an Edition changes Featured inclusions and every policy-summary metric to that Edition's scope;
- inherited Edition policy renders Default-equivalent state; Edition-owned replacement renders its own state;
- `Edit Customer Options` follows selected scope: Default opens Default Inclusions/customer-policy controls, Edition opens that exact Edition already selected with its Inclusions editor;
- save/reopen on an Edition remains isolated to that Edition and does not overwrite Default/another Edition;
- standalone Customer Selection Rules drawer/action is gone;
- ordinary Tier/Add-on UI remains unchanged.

Do not close Phase 3 until this live gate passes.