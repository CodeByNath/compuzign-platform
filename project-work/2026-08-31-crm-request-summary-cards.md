# CRM Request summary cards

## Status
- **AWAITING CHATGPT REVIEW — pushed to main; deploy FAILED (infra, not source).**
- `main` is now `96d5593799af4336c071f462aef445baf5872836` (clean fast-forward from `fe5725db`, exactly the approved commit).
- GitHub Actions `deploy` run [`33337306396`](https://github.com/CodeByNath/compuzign-platform/actions/runs/33337306396/job/99326407131): **failure**, head SHA `96d5593799af4336c071f462aef445baf5872836`.
- Auditor verdict (prior round): **Proceed**.

## Locked scope
Display-only metric strip above Requests list using shared `StationMetricBlock` visual language:
- **All Requests**
- **New Today**
- **Pending**
- **Approved**

No filters, buttons, links, lifecycle actions, pricing, transient scans, backfill, customer-flow changes, or `Expires Soon`.

## Independent audit
Compared production `fe5725db...` to review head `96d55937...`: exactly **1 commit ahead / 0 behind**, with 10 scoped files only.

Accepted implementation:
- `AdminRequestsController::summarize()` adds derived, non-persisted `is_today` from the stored site-local `submitted` day against `current_time('Y-m-d')`.
- `RequestSummary` carries `is_today: boolean`; generic Station data-source/template contracts are untouched.
- `deriveRequestSummaryMetrics()` purely tallies the already-fetched rows.
- `RequestsSummaryCards` reuses `StationMetricBlock` directly and is non-interactive.
- `RequestsCatalogueKit` mounts the strip above the existing search/list without changing search behavior.
- CSS adds only Requests-owned container/card layout; metric internals remain the shared `.cz-station-metric*` family.
- focused PHP/TS contracts cover today/non-today counts, all four metrics, empty list, shared primitive reuse, and absence of click/intent behavior.

Claude-reported validation passed: `tsc --noEmit`, build, Requests surface contract, durable Request PHP test, docs check; the known 6 unrelated `cz-rate-sheet-tool__*` CSS-contract failures remain pre-existing.

## Deploy failure — infrastructure, not source

`main` was fast-forwarded and pushed exactly as approved. The GitHub Actions "Deploy to Hostinger" workflow ran and failed at **step 8, "Deploy source via SSH"** — every step before it succeeded, including step 6 "Install frontend dependencies" and step 7 "Build frontend assets" (so the review branch's own `tsc`/build result is not implicated). Step 9 "Deploy built dist assets via SCP" was skipped as a consequence of step 8's failure; the job otherwise completed cleanly.

I could not retrieve the step's actual log output — the GitHub API's job-logs endpoint requires repository admin auth, which is unavailable to this unauthenticated public API access. So the SSH failure's root cause (credential/host/network) is not yet known from here.

`main`'s source is correct and unchanged in shape from the approved review head; this is not a code regression to fix. It needs someone with GitHub Actions run access (and/or Hostinger SSH credential access) to inspect the actual log and either fix the credential/host issue and re-run the job, or re-trigger the workflow once resolved.

## Claude next action
None pending on the source side. Awaiting either:
(a) confirmation the deploy was manually re-run/succeeded, to close this item with live browser validation, or
(b) further instruction if the SSH failure turns out to need a source-side fix (e.g. a changed deploy path) once the actual log is available.

Live browser validation (still required before closure, once deployed): confirm the four cards appear above Requests, values match the visible durable data, cards are non-interactive, and the existing Requests list/drawer remains unchanged.