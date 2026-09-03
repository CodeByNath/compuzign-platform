# Composable Tier — continuous work track

## Status
- **SOURCE PUSH APPROVED — corrected live-validation round accepted for `main`.**
- Auditor verdict: **Proceed with safeguards.**
- Production remains `main@f9035e82cda9ce7a0f1a65e36d761f8524aa058c`; deploy #938 succeeded.
- Approved review head: `review/composable-live-correction-round@eb200731384359041ac585fcbc9ed57f01550f0d`.
- Independent compare: **2 commits ahead / 0 behind** production; correction commit `eb200731` is exactly 1 commit on top of `ed10a250`.

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

## Claude next action
Push only approved review head `eb200731384359041ac585fcbc9ed57f01550f0d` (or identical fast-forward result) to `main`. No cleanup/refactors.

After push:
1. record exact `main` SHA;
2. record Deploy to Hostinger run/status + deployed SHA;
3. set **AWAITING LIVE VALIDATION**;
4. do not begin final UI/UX refinement yet.

## Live gate after deploy
Validate customer `Upgrades` label, composable Quote Details, sticky Print/PDF actions, Admin Request detail, proposal/PDF/public quote exact-once aggregate rendering, totals once, no raw IDs, and actual customer email delivery for a newly authorized Request. Keep overall work open until this passes.