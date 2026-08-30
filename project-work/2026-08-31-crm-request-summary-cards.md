# CRM Request summary cards

## Status
- **AWAITING CHATGPT REVIEW — implemented on review branch only.**
- Production base: `main@fe5725db3d0be4d8e020504568979797db493010`.
- Review head: `96d55937` on `review/crm-request-summary-cards`.
- Source push: **NOT APPROVED**.
- Auditor verdict (prior round): **Proceed with safeguards**.

## Locked scope
Add a small **display-only** metric strip above the Requests list. Reuse the existing shared `StationMetricBlock` visual language already used by the Service/Admin home metric areas; do not create a new card family.

Metrics only:
- **All Requests**
- **New Today**
- **Pending**
- **Approved**

No filters, buttons, links, lifecycle actions, pricing, transient scans, backfill, customer-flow changes, or `Expires Soon`.

## Auditor review of Claude inspection
Claude correctly found that the visual primitive is `resources/ts/admin-station/presentation/StationMetricBlock.tsx`, an entity-neutral shared metric row. Reuse it directly with only a Requests-owned container/layout class.

One correction is required to Claude's proposed data plumbing before implementation: `SurfaceCollection` exposes only `{items, loading, error, refetch}` and `TemplateKitProps` only receives `{items, loading, error, onIntent}`. Therefore a new top-level API envelope field such as `today` cannot simply be threaded through `useRequestsCatalogue()` into `RequestsCatalogueKit` without widening the generic Station contracts, which is out of scope.

Use the smaller compatible projection instead:
- backend `summarize()` adds a derived boolean `is_today` per Request row, computed from the stored site-local `submitted` date against `current_time('Y-m-d')`;
- do not persist `is_today`;
- client counts `request.is_today`, `status === 'pending'`, `status === 'approved'`, and total rows;
- no browser timezone parsing and no generic Station contract changes.

## Implementation report

Branch `review/crm-request-summary-cards`, one commit `96d55937`, cut from exact production base `fe5725db`.

1. `AdminRequestsController::summarize()` adds `'is_today' => substr((string) ($data['submitted'] ?? ''), 0, 10) === current_time('Y-m-d')` — inline, not persisted, not a new query, sits after `submitted` in the allow-list.
2. `resources/ts/api/types/admin.ts` — `RequestSummary` gains `is_today: boolean`.
3. New `resources/ts/admin-station/stations/requests/requestSummaryMetrics.ts` — pure `deriveRequestSummaryMetrics(requests: RequestSummary[]): StationMetric[]` (all/today/pending/approved tally), mirroring the existing `requestItemDisplay()` pure-function convention so it's independently testable without rendering.
4. New `resources/ts/admin-station/stations/requests/RequestsSummaryCards.tsx` — renders `StationMetricBlock` × 4 inside a new `.cz-requests-summary` grid of `.cz-requests-summary__card` boxes; no click handler, no intent dispatch, no props beyond `requests`.
5. `RequestsCatalogueKit.tsx` — mounts `<RequestsSummaryCards requests={requests} />` above the existing toolbar.
6. `admin-station.css` — added `.cz-requests-summary` (auto-fit grid) and `.cz-requests-summary__card` (border/radius/background matching `.cz-cg-card`'s own box language) only; all metric-row styling still comes from the existing `.cz-station-metric*` rules — no new control-level CSS.
7. Tests extended:
   - `tests/admin-requests-durable-surface.php` — added a `current_time()` stub (fixed site-local "today," matching the existing fixtures' shared submitted date) since the route now calls it; asserts a fresh Request's row is `is_today === true` and the pre-existing 2020 legacy fixture's row is `is_today === false`; updated the list-row closed-key assertion to include `is_today`.
   - `scripts/requests-admin-station-surface-contract.ts` — asserts the cards mount in the kit, reuse `StationMetricBlock` directly, carry no click/intent handler, and that `is_today` is server-derived from `current_time`; plus a fixture-driven check of `deriveRequestSummaryMetrics()` (4 rows → correct all/today/pending/approved counts, including an empty-list all-zero case).

Full validation on the review branch: `tsc --noEmit`, `npm run build`, `contract:requests-admin-station-surface`, `php tests/admin-requests-durable-surface.php`, `contract:admin-station-css` (same 6 pre-existing unrelated `cz-rate-sheet-tool__*` failures, no new ones), `docs:check` — all passed.

No Code Map was updated (not requested; the change is additive/display-only within the already-documented CRM-1B surface).

Waiting for review before any push to `main`.
