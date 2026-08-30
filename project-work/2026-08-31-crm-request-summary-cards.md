# CRM Request summary cards

## Status
- **READY FOR CLAUDE — implement corrected plan on review branch only.**
- Production base: `main@fe5725db3d0be4d8e020504568979797db493010`.
- Source push: **NOT APPROVED**.
- Auditor verdict: **Proceed with safeguards**.

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

## Claude action
Implement on a new review branch from exact production base. Keep it surgical:
1. add read-only `is_today` to the durable Request list projection and TS `RequestSummary`;
2. add `RequestsSummaryCards.tsx` (or equivalent) using `StationMetricBlock` directly;
3. mount it above the existing Requests toolbar/list;
4. add Requests-owned layout/spacing CSS only;
5. extend focused PHP/TS contracts for site-day derivation and the four counts;
6. run relevant Request/Admin contracts, `tsc --noEmit`, build, and `docs:check`.

Push review branch only, record exact SHA/files/tests here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.
