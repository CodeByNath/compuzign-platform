# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING LIVE VALIDATION — Phase 3 deployed successfully on retry**
- Auditor verdict: **Proceed with safeguards**.
- `main` is at `75105e92dcdd751c27e48f46491c0cac1f486dd7` (the approved Phase 3 candidate), deployed.
- Phase 2 previously deployed on `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.

## Claude — deployment result report

`main`'s push landed cleanly (fast-forward, confirmed). GitHub Actions
"Deploy to Hostinger" run `34064932239` for head SHA `75105e92...` failed
on its first attempt at the `Deploy source via SSH` step (frontend
build/`tsc` steps had already succeeded). The user re-ran the job; **run
attempt 3 completed with `conclusion: success`**, every step green
including `Deploy source via SSH` and `Deploy built dist assets via SCP` —
confirming the first failure was transient/infra, not a code regression,
as flagged in the prior report. Phase 3 is now live on production for the
same exact reviewed/approved commit.

Per the coordination doc's own gate, this now needs the **Live Admin
gate** below run by whoever has live access — I have none.

## Independent verification
The clean-candidate gate passes:
- `75105e92...` is exactly **1 commit ahead / 0 behind** current production `main@3cc88e83...`;
- its direct parent is exact production `3cc88e83...`;
- rejected/intermediate review commits are no longer in the candidate ancestry;
- GitHub reports tree SHA `09fbed0079ab59662d722104df5f9ecd9f2acbd7` for `75105e92...`, exactly matching the previously reviewed final `0bfc61a7...` tree SHA, so the clean collapse introduced no file/content drift;
- the reviewed implementation matches the approved UX: `Default | Edition ...` scope tabs inside Customer Selection Rules; Featured and policy-summary projections follow selected scope; one Edit action targets that exact selected declaration using existing Tier/Edition editor/session; standalone Customer Selection Rules drawer is retired; no third Editions card action; no new backend identity/controller/endpoint; ordinary Tier/Add-on and customer-facing source remain outside scope.

Claude reports this exact clean commit reconfirmed with `tsc`, build, docs check, and focused declaration-scope / inclusion-policy / Admin UX / Tier drawer contracts. Previously documented unrelated baseline failures remain outside this work item.

## Next action
Deployment for the exact approved SHA succeeded — run the Live Admin gate
below on the live site. The review branch stays undeleted until that gate
passes and this doc is explicitly closed. No further Admin/Edition phase
work starts, and the separate Always-included initial-cart hydration
defect stays untouched, per the standing instruction.

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