# CRM Request summary cards

## Status
- **SOURCE PUSH APPROVED — exact review head only.**
- Production base: `main@fe5725db3d0be4d8e020504568979797db493010`.
- Approved review head: `96d5593799af4336c071f462aef445baf5872836` on `review/crm-request-summary-cards`.
- Auditor verdict: **Proceed**.

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

## Claude next action
Fast-forward/push **exactly** `96d5593799af4336c071f462aef445baf5872836` to `main` unchanged using the normal workflow. Do not amend or add source commits. Then record the resulting `main` SHA plus GitHub Actions deploy run/status/head SHA in this same file, set **AWAITING CHATGPT REVIEW**, and stop.

Live browser validation will be required after successful deployment: confirm the four cards appear above Requests, values match the visible durable data, cards are non-interactive, and the existing Requests list/drawer remains unchanged.