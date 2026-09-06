# Tier Catalogue Admin UX Consolidation

## Status
- **DEPLOYMENT FAILED — main updated, GitHub Actions deploy run failed (SSH step); needs a decision before AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- `main` is now at `75105e92dcdd751c27e48f46491c0cac1f486dd7` (the approved Phase 3 candidate) — pushed by the user per SOURCE PUSH APPROVED, confirmed via `git fetch origin main`.
- Phase 2 previously deployed on `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.

## Claude — deployment result report

`main`'s push landed cleanly (fast-forward, confirmed). GitHub Actions
"Deploy to Hostinger" run `34064932239` for head SHA `75105e92...` (the
exact pushed commit) **completed with `conclusion: failure`**:
- `Set up job` → `Install frontend dependencies` → `Build frontend assets`
  all **succeeded** (the source itself builds cleanly on CI, consistent
  with every local `tsc`/`build` I ran on this exact commit).
- **`Deploy source via SSH` failed** (step 8, ~31s runtime).
- `Deploy built dist assets via SCP` was skipped as a consequence.

I do not have a GitHub token in this environment, so I could not fetch the
step's own log output (the logs API returned 403 unauthenticated) — I
cannot state the exact SSH error.

**This looks like a transient/infra failure, not a code regression**: the
previous 7 runs on `main` (`3cc88e83`, `bfb203c7`, `4bd3a35d`, `34b2e84f`,
`573dc72b`, `ca803bb3`, `badb3664`) all completed successfully on the SAME
workflow, and nothing in this work item touches `.github/workflows/`,
deploy scripts, or server-side config. But per this project's "no
unevidenced claims about live" rule, I am reporting the observed fact
(SSH step failed) without asserting a root cause I cannot verify from
here.

**Awaiting explicit direction before proceeding:**
- Should the user/auditor re-run the failed GitHub Actions job (I have no
  `gh` CLI or token to trigger this myself)?
- Or is there a known transient Hostinger/SSH issue that simply needs a
  retry with no other action?

I have NOT touched `main`, the review branch, or any source further while
this is unresolved, per "record the deployment result" and "do not close
Phase 3 until the live gate passes."

## Independent verification
The clean-candidate gate passes:
- `75105e92...` is exactly **1 commit ahead / 0 behind** current production `main@3cc88e83...`;
- its direct parent is exact production `3cc88e83...`;
- rejected/intermediate review commits are no longer in the candidate ancestry;
- GitHub reports tree SHA `09fbed0079ab59662d722104df5f9ecd9f2acbd7` for `75105e92...`, exactly matching the previously reviewed final `0bfc61a7...` tree SHA, so the clean collapse introduced no file/content drift;
- the reviewed implementation matches the approved UX: `Default | Edition ...` scope tabs inside Customer Selection Rules; Featured and policy-summary projections follow selected scope; one Edit action targets that exact selected declaration using existing Tier/Edition editor/session; standalone Customer Selection Rules drawer is retired; no third Editions card action; no new backend identity/controller/endpoint; ordinary Tier/Add-on and customer-facing source remain outside scope.

Claude reports this exact clean commit reconfirmed with `tsc`, build, docs check, and focused declaration-scope / inclusion-policy / Admin UX / Tier drawer contracts. Previously documented unrelated baseline failures remain outside this work item.

## Next action
`main` push is done (step 1 of the prior instruction complete); step 2
(deployment result) is recorded above as a **failure**, not a success — so
per the prior instruction's own step 4, status does NOT advance to
**AWAITING LIVE VALIDATION** yet. Needs a decision:
1. Retry the GitHub Actions deploy run for `75105e92...` (whoever has
   dashboard/`gh` access), or diagnose the SSH step further;
2. Once a deploy run for this exact SHA completes successfully, Claude
   will record that and set **AWAITING LIVE VALIDATION**;
3. The review branch is kept (not deleted) until that happens;
4. No further Admin/Edition phase work starts, and the separate
   Always-included initial-cart hydration defect stays untouched, per the
   standing instruction.

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