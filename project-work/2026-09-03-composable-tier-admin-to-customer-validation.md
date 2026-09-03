# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — correction required before source push approval.**
- Auditor verdict: **Stop — architectural risk.**
- Production remains `main@f9035e82cda9ce7a0f1a65e36d761f8524aa058c`; deploy #938 succeeded.
- Review branch under audit: `review/composable-live-correction-round@ed10a25059fe23f485aa54779e2556ac47b9e8ce`, exactly 1 commit ahead / 0 behind production.

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