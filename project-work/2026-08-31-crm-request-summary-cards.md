# CRM Request summary cards

## Status
- **AWAITING LIVE VALIDATION**.
- Production `main` = `96d5593799af4336c071f462aef445baf5872836`.
- Deploy run `33337306396` / run #922 = `completed/success` on attempt 5, exact `head_sha=96d5593799af4336c071f462aef445baf5872836`.
- Auditor verdict: **Proceed**.

## Locked scope
Display-only metric strip above Requests list using shared `StationMetricBlock` visual language:
- **All Requests**
- **New Today**
- **Pending**
- **Approved**

No filters, buttons, links, lifecycle actions, pricing, transient scans, backfill, customer-flow changes, or `Expires Soon`.

## Independent source/deploy audit
Production `main` independently confirmed at the exact approved SHA `96d5593799af4336c071f462aef445baf5872836`; no extra source commit is present.

GitHub Actions run `33337306396` independently confirmed `completed/success` for that exact SHA. The successful deployment is attempt 5 of the same run; earlier failures were deployment/connectivity infrastructure issues, not source changes.

Accepted implementation remains unchanged:
- `AdminRequestsController::summarize()` derives non-persisted `is_today` from site-local stored `submitted` against `current_time('Y-m-d')`;
- generic Station data-source/template contracts are untouched;
- `deriveRequestSummaryMetrics()` tallies the already-fetched rows only;
- `RequestsSummaryCards` reuses `StationMetricBlock` directly and has no click/filter/intent behavior;
- Requests search/list/drawer behavior is unchanged.

## Live acceptance required before closure
Read-only browser validation only:
1. Four cards appear above Requests: **All Requests / New Today / Pending / Approved**.
2. Values match the durable Request rows/statuses and today's site-local submissions.
3. Cards are non-interactive and do not filter or navigate.
4. Existing Requests search, list, and read-only drawer still work unchanged.

No source correction is requested. Close only after live validation passes.
