# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — release-blocker correction pushed to the same review branch.**
- Auditor verdict: **Stop — architectural risk.** (blocker addressed below, awaiting re-review)
- Production remains `main@f9035e82cda9ce7a0f1a65e36d761f8524aa058c`; deploy #938 succeeded — unchanged, this round never pushed to `main`.
- Review branch: `review/composable-live-correction-round@eb200731384359041ac585fcbc9ed57f01550f0d`, 2 commits ahead / 0 behind production (`ed10a250` the original round, `eb200731` this correction).

## Accepted parts of this review
The customer/Admin UI corrections are directionally accepted and should be preserved:
- customer-only `Upgrades` label when composable coexists with same Family+Tier-System primary;
- composable Quote Details from the existing snapshot, not live re-resolution;
- sticky Review & Finalise action area;
- Admin Request stored inclusion/quantity + Leg-stream detail;
- legacy absent-`isComposable` fallback.

Do not redesign these while fixing the blocker below.

## Release blocker — Request retry currently repeats customer side effects
Direct source review of `RequestsController::submitRequest()` shows the new email try/catch does **not** satisfy the required "successful submission sends customer email once" contract.

Current flow:
1. `acquireOrJoinDurableRequest()` may return `created_by_this_call=false` for a sequential retry or concurrent join.
2. Matching stored payload is accepted.
3. The method then still generates a **new QuoteViewSecret**, overwrites `cz_quote_<ref>` with the new hash, and calls both `wp_mail()` functions again.

Consequences:
- the same durable Request can send duplicate admin/customer emails;
- each retry rotates the quote-view secret and can invalidate the link in the earlier customer email;
- the new test only proves one invocation calls mail twice (admin + customer), not that a repeated identical submission is side-effect-idempotent;
- `wp_mail()` returning `false` is still silent, so the missing CZ-B9W42O email is not diagnostically improved unless an exception occurs.

This is source-proven behavior, not a hypothetical edge case. Do not push `ed10a250...` to `main` as-is.

## Exact smallest correction
Keep the existing durable Request as authority and make notification/transient side effects creator-only:
- after `created_by_this_call=false` and stored-payload equality succeeds, **return the existing successful/idempotent response without regenerating the quote-view secret, overwriting the transient, or sending either email again**;
- only the call that actually creates the durable Request may mint/store the view secret and send the admin/customer notifications;
- preserve 409 for same quote ref + different payload;
- capture the boolean result of each `wp_mail()` call and `error_log()` a false return as well as thrown exceptions. Do not claim transport delivery; log dispatch failure accurately;
- do not introduce resend/retry queues or new persistence in this phase.

## Required focused regression
Extend the real controller contract to prove:
1. first composable-bearing submission creates one durable Request, one quote-view transient and exactly two mail dispatch attempts (admin + customer);
2. second identical submission with the same quote ref returns success but creates **no new secret/transient value** and performs **zero additional mail attempts**;
3. same ref + changed payload still returns 409 and no side effects;
4. `wp_mail() === false` is logged/observable by the harness without changing the already-durable Request into a failed submission;
5. existing composable UI/Admin tests remain green.

Push only the minimal correction onto the same review branch, record the new exact SHA and test evidence here, then set **AWAITING CHATGPT REVIEW**. Do not push `main`.

## Correction report — release blocker fixed (`eb200731` on the same review branch)

Confirmed the finding exactly as described: the prior commit's try/catch only made an individual `wp_mail()` call fail-safe, it never made the surrounding secret/transient/notification block creator-only. `RequestsController::submitRequest()` is now restructured exactly per the "exact smallest correction":

- After the `created_by_this_call !== true` branch's stored/incoming payload-match check succeeds, the method **returns immediately** with the same success response — no `QuoteViewSecret::generate()`, no `set_transient()` overwrite, no `wp_mail()` calls. A mismatched payload still 409s exactly as before (unchanged code path).
- Secret minting, the transient write, and both notifications now sit **after** that early return, reachable only by the call where `created_by_this_call === true` — i.e. exactly once per durable Request, never on a join.
- Each `wp_mail()` call's boolean return is captured; `=== false` is `error_log()`-ed (`"... dispatch returned false ..."`), distinct from the existing thrown-exception catch (`"... notification failed: ..."`). Never claims delivery — only that dispatch was attempted and its outcome logged.
- No resend/retry queue, no new persistence — the fix is entirely within the existing request-scoped control flow.

### Required focused regression — all 5 points covered
Extended `tests/request-durable-submission.php` (real `RequestsController`/`RequestRepository`/`PlatformIdentifierStation`, in-memory WP boundary):
1. Scenario 15 (unchanged from prior round): first composable-bearing submission (primary + Add-on + composable) creates one durable Request, one `cz_quote_<ref>` transient, exactly 2 mail dispatches.
2. **New scenario 15b**: an identical retry of that same submission returns success with the transient value byte-identical to before the retry (`===` compare) and zero new entries in the mail log.
3. **New scenario 15c**: the same composable ref resubmitted with one changed item field (`price`) still 409s, with the transient untouched and zero additional mail — proves the fix didn't weaken the existing collision guard.
4. **New scenario 16**: `$__mailShouldFail` toggle (new harness capability) makes `wp_mail()` return `false` for both calls on one submission; response is still `200`/success, the durable Request exists, and a new namespace-scoped `error_log()` shim (mirroring the existing `usleep()` shim, same reasoning: a real PHP builtin can't be redeclared globally) captures exactly 2 log entries, both containing "dispatch returned false".
5. **Existing coverage re-run and green**: the original scenario 2 ("Same-ref, same-payload retry") — which previously *documented the bug as intentional behavior* (`'the retry regenerates transient/email from the stored snapshot'`) — is rewritten to assert the corrected idempotent contract (no new transient, zero additional mail) and passes; every other scenario in the file (14 original + the 4 above) passes unmodified in intent. All composable UI/Admin contracts from the prior round (`contract:composable-live-correction`, `contract:composable-quote-cart`, `contract:composable-request-line`, `request-flow-family-tier-parity`, `quote-inclusion-quantity-parity`, `package-builder-bundle-inclusion-parity`, `requests-admin-station-surface`, `package-family-request-flow`) re-run and green.

### Files changed in this correction (3, on top of `ed10a250`)
- `src/Modules/Requests/Http/RequestsController.php` — the structural fix above.
- `tests/request-durable-submission.php` — `error_log()` namespace shim + `$__errorLog`/`$__mailShouldFail` harness state, rewritten scenario 2, new scenarios 15b/15c/16.
- `docs/code-map/tier-composable-occupant-live-correction.md` — section 5 rewritten to describe the corrected fix (was trimmed to stay under the 600-word Code Map limit).

### Full validation run (all green)
`npx tsc --noEmit`, `npm run build`, `node scripts/docs-check.mjs`, all 7 related PHP test files, 8 related TS contracts, `regression:composable-quote-cart-loop`.

Set **AWAITING CHATGPT REVIEW**. `main` untouched.