# Composable Tier — continuous work track

## Status
- **BLOCKED — `main` pushed, Hostinger deploy FAILED. Needs Nath's investigation before proceeding.**
- Auditor verdict: **Proceed with safeguards.** (source approval stands; deploy infra failed downstream of it)
- `main`/`origin/main` is now `eb200731384359041ac585fcbc9ed57f01550f0d` — pushed per approval, exactly the approved commit, fast-forward from `f9035e82`, verified via `git merge-base`.
- **Hostinger Deploy #939 / run `33768478158` FAILED** at the "Deploy source via SSH" step. "Build frontend assets" succeeded (the code itself builds cleanly); the SSH deploy step is what failed. I could not read the step's raw log — GitHub's job-log API returned 403 "Must have admin rights to Repository" for my access level. **The live site's actual deployed code is therefore unconfirmed and may still be the prior `f9035e82` build** — `main` advancing does not mean production advanced this time.
- Run link: `https://github.com/CodeByNath/compuzign-platform/actions/runs/33768478158` — Nath/ChatGPT should open this directly to read the SSH step's actual error (credential expiry, host connectivity, disk space, etc. are all plausible; I have no evidence pointing to any one cause).

## Action needed (not performed by me)
I did not re-run the workflow and did not attempt any deploy-infrastructure change — a repository-secrets/host-level SSH failure needs someone with GitHub Actions log access (and likely Hostinger host access) to diagnose, and re-running a failed deploy without knowing why it failed isn't a call I should make unilaterally. Once the actual cause is known and either fixed or confirmed transient, a plain workflow re-run (same `eb200731` commit, no new push needed) should be sufficient if the SSH issue was transient.

## Auditor review
The prior release blocker is fixed correctly.

Accepted behavior:
- customer cart/review says **Upgrades** only when composable coexists with the same Family+Tier-System primary; standalone/Admin Build Your Own naming is unchanged;
- composable Quote Details renders the stored/current successful snapshot (`inclusionItems` + `legPaymentSummaries`) instead of the fixed-slot resolver fallback;
- Review & Finalise action area is sticky/reachable without redesign;
- Admin Request renders stored composable inclusion quantities and payment streams beneath the aggregate line;
- legacy Requests with no `isComposable` remain unchanged;
- no pricing/resolver/Rate Sheet/entity/identity changes.

### Retry/idempotency blocker — now accepted
`RequestsController::submitRequest()` now returns immediately on a matching existing durable Request. Therefore only the creator call may:
1. mint a QuoteViewSecret;
2. write `cz_quote_<ref>`;
3. dispatch admin/customer email.

This prevents duplicate notifications and prevents retry-driven secret rotation from invalidating the first emailed quote link. Same ref + changed payload still returns 409. `wp_mail() === false` and thrown exceptions are now logged separately without converting an already-durable Request into a failed submission.

The real controller regression now proves first submission side effects once, identical retry with zero new side effects and byte-identical transient, changed retry 409/no side effects, and `wp_mail() === false` observability. Reported focused PHP/TS contracts, typecheck/build/docs and loop regression are green.

## Remaining safeguard
This proves **dispatch semantics**, not external mail delivery. The earlier missing CZ-B9W42O email still has no confirmed transport root cause. After deploy, live validation must submit/inspect a fresh composable Request only with Nath's authorization and verify the actual customer email arrives; if not, inspect the new dispatch-failure evidence rather than changing product architecture blindly.

## Claude next action (done, partially)
Pushed approved review head `eb200731384359041ac585fcbc9ed57f01550f0d` to `main` — clean fast-forward, exact approved commit, no cleanup/refactors added. Recorded the SHA and the deploy run/status above: **the deploy itself failed**, so steps 3/4 below did not happen — do not treat this as AWAITING LIVE VALIDATION, since there is no confirmed new live build to validate yet.

Blocked on: someone with GitHub Actions admin/log access reading the actual "Deploy source via SSH" failure reason (run `33768478158`) and either fixing the underlying cause or confirming it was transient before a re-run is attempted.

## Live gate after deploy
Validate customer `Upgrades` label, composable Quote Details, sticky Print/PDF actions, Admin Request detail, proposal/PDF/public quote exact-once aggregate rendering, totals once, no raw IDs, and actual customer email delivery for a newly authorized Request. Keep overall work open until this passes.