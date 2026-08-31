# CRM Request summary cards

## Status
- **CLOSED** — live validation accepted 2026-08-31.
- Production `main` = `96d5593799af4336c071f462aef445baf5872836`.
- Deploy run `33337306396` / #922 = `completed/success` on attempt 5 for exact `head_sha=96d5593799af4336c071f462aef445baf5872836`.
- Final auditor verdict: **Proceed**.

## Locked scope
Display-only metric strip above Requests using shared `StationMetricBlock`:
- **All Requests**
- **New Today**
- **Pending**
- **Approved**

No filters, buttons, lifecycle actions, pricing, transient scans, backfill, customer-flow changes, or `Expires Soon`.

## Accepted implementation
- `AdminRequestsController::summarize()` derives non-persisted `is_today` from site-local stored `submitted` against `current_time('Y-m-d')`.
- Generic Station data-source/template contracts remain unchanged.
- `deriveRequestSummaryMetrics()` tallies already-fetched durable Request rows only.
- `RequestsSummaryCards` reuses `StationMetricBlock` and has no click/filter/intent behavior.
- Existing Requests search/list/drawer behavior remains unchanged.

## Live validation — 2026-08-31
Nath validated the deployed Requests surface and reported **all good**. The screenshot/validation confirmed the Request list remains healthy and the new summary-card work is accepted in production. No source correction was requested.

This item is closed and must not be reopened; later CRM lifecycle/action work belongs in a new file.
