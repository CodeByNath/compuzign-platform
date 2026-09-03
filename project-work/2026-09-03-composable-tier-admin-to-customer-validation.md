# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION — corrected live-correction round deployed.**
- Auditor verdict: **Proceed with safeguards.**
- `main`/`origin/main` is `eb200731384359041ac585fcbc9ed57f01550f0d` — pushed per approval, exactly the approved commit, clean fast-forward from `f9035e82`.
- **Hostinger Deploy #939 / run `33768478158` succeeded on retry (attempt 2).** Attempt 1 failed at "Deploy source via SSH"; Nath re-ran the workflow and attempt 2 completed every step successfully (build, SSH source deploy, SCP dist deploy) — confirmed via the GitHub API (`run_attempt: 2`, `conclusion: success`, all steps `success`), not just the UI. Deployed SHA matches `main` exactly: `eb200731384359041ac585fcbc9ed57f01550f0d`. Root cause of attempt 1's SSH failure was not diagnosed (transient, resolved by retry) — flagging in case it recurs.

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

## Claude next action (done)
Pushed approved review head `eb200731384359041ac585fcbc9ed57f01550f0d` to `main` — clean fast-forward, exact approved commit, no cleanup/refactors added. Deploy failed on the first attempt (SSH step); Nath re-ran the workflow and attempt 2 succeeded end to end, confirmed via direct GitHub API read of the run/jobs. Status set to **AWAITING LIVE VALIDATION** below.

## Live gate after deploy
Validate customer `Upgrades` label, composable Quote Details, sticky Print/PDF actions, Admin Request detail, proposal/PDF/public quote exact-once aggregate rendering, totals once, no raw IDs, and actual customer email delivery for a newly authorized Request. Keep overall work open until this passes.