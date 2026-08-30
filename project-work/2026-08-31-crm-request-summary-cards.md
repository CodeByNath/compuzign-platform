# CRM Request summary cards

## Status
- **AWAITING CHATGPT REVIEW — deployed successfully after a re-run; live browser validation still pending.**
- `main` is `96d5593799af4336c071f462aef445baf5872836` (unchanged since the last round — exactly the approved commit).
- GitHub Actions `deploy` run `33337306396`, job [`99333329292`](https://github.com/CodeByNath/compuzign-platform/actions/runs/33337306396/job/99333329292): **success** on re-run, head SHA `96d5593799af4336c071f462aef445baf5872836`, all 9 steps (including the SSH deploy and SCP dist-asset steps that failed/skipped on the first attempt) completed.
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

## Deploy history
First attempt (job `99326407131`) failed at step 8, "Deploy source via SSH" — an infrastructure/connectivity issue, not a source regression (every step through frontend build succeeded, and `main`'s source was already correct and unchanged from the approved review head). Nath ran the Hostinger upload check and the workflow was re-run: job `99333329292` on the same run `33337306396` completed all 9 steps successfully, including the SSH deploy and SCP dist-asset upload, on the exact same approved SHA.

## Claude next action
None pending on the source side. Live browser validation is the one remaining step before this item can close:
- the four summary cards (All Requests / New Today / Pending / Approved) appear above the Requests list;
- their values match the visible durable Request data;
- the cards are non-interactive (no click/filter behavior);
- the existing Requests list, search, and drawer remain unchanged.