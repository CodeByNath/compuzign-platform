# CRM Request summary cards

## Status
- **AWAITING CHATGPT REVIEW — inspection report below; no source edited.**
- Production base: `main@fe5725db3d0be4d8e020504568979797db493010`.
- Source push: **NOT APPROVED**.
- Auditor verdict (prior round): **Proceed with safeguards**.

## User direction
Add a very small display-only number-card strip to the Requests Admin Station above the CRM Request list.

The visual reference is the **Service Station Home lower deck / Service Catalogue small detail-card style already in the repository**. Do not invent a new card family. Reuse that established component/style language as closely as the existing architecture allows.

These cards are numbers only — **not filters, buttons, links, or lifecycle actions**.

Proposed counts:
- **All Requests** — all durable Requests.
- **New Today** — durable Requests whose stored submitted timestamp falls on the current local/site day. This is a derived display metric only; do not resurrect legacy lifecycle status `new`.
- **Pending** — lifecycle `pending`.
- **Approved** — lifecycle `approved`.

Do **not** add `Expires Soon` in this phase. Durable CRM Requests do not expire; the 7-day secure quote-view transient is security/view plumbing and must not become CRM list authority.

## Locked boundaries
- CRM-1A/1B architecture stays closed.
- `RequestRepository` remains the durable CRM authority.
- No mutation, lifecycle transitions, filtering behavior, pricing/re-resolution, backfill, transient scanning, or customer-flow changes.
- No new generic dashboard/card system.

## Claude action — plan/source check only

### 1–2. There is no bespoke "Service lower deck" number-card — the real shared primitive is `StationMetricBlock`
Searched `resources/ts/admin-station/` and `resources/ts/service-station/` directly. **Service Station's own lower deck (`ServiceLowerDeck.tsx`) is a tab-deck composer, not a metric-card strip — it has no small number-card of its own.** The actual small labelled-metric card language the request is describing lives one level down, as a shared, entity-neutral primitive already used by two other surfaces:

- `resources/ts/admin-station/presentation/StationMetricBlock.tsx:29-43` — the one metric-row renderer (glyph/label/value). File header (lines 1-13) states it is deliberately generic: "no Services, Inclusions, or Packages component."
- `resources/ts/admin-station/presentation/category-groups/CategoryGroupCard.tsx:69-75` — wraps a list of `StationMetricBlock`s in a `.cz-cg-card__metrics` container; rendered on Admin Station Home via `CategoryGroupCardGrid.tsx` → `AdminStationGroups.tsx` → `AdminStationHome.tsx:29`.
- Also consumed by Package's `resources/ts/package-station/presentation/package-tier-workspace/PackageFamilySummary.tsx`.

CSS (`resources/ts/admin-station/styles/admin-station.css`): `.cz-station-metric` (603), `__glyph` (611), `__icon` (624), `__label` (631, sentence case), `__value` (640, `margin-inline-start: auto`, tabular-nums); container: `.cz-cg-card__metrics` (961) with `border-top` divider and `> * + *` row separators (973), `--compact` value-de-emphasis modifier (982).

**Recommendation**: reuse `StationMetricBlock` directly (it is the actual shared primitive, not something to mirror), inside a new small strip container with its own `cz-requests-*` class name — consistent with the house convention already stated in `RequestsCatalogueKit.tsx`'s own file header ("a surface adds its own selector to the shared family, it does not reuse another surface's template"), and structurally identical to `.cz-cg-card__metrics`'s divider/row pattern rather than a new visual language. This is the closest-possible reuse given the architecture: the component is shared, only the container class is new (as every other surface already does).

### 3. Smallest data projection for the four counts
`AdminRequestsController::summarize()` (`AdminRequestsController.php:90-116`) already returns `status` (lifecycle: `pending`/`approved`/`cancelled`) and `submitted` (a `current_time('mysql')` string — confirmed **site-local**, not UTC, at `RequestSchema.php:71`) on every row, and `listRequests()` already returns the full unfiltered `total`. No pagination exists today, so the entire `RequestSummary[]` is already in the browser.

- **All Requests** = `total` (already returned) or `requests.length`.
- **Pending** / **Approved** = client-side count by `status ===`.
- **New Today** = client-side count by `submitted` date-prefix match — but comparing against a browser-computed date would reintroduce exactly the local-drift the item forbids. Since `submitted` is stamped site-local via a bare `current_time('mysql')` (matching the pattern at `RequestSchema.php:71`, not the `current_time($fmt, true)` UTC pattern used elsewhere for `starts_at`/`ends_at` comparisons), the one honest site-time reference is the server's own site-local "today." Smallest fix: add one additive top-level field to the existing list envelope, `'today' => current_time('Y-m-d')`, in `AdminRequestsController::listRequests()`. The client then does a pure string-prefix compare (`request.submitted.startsWith(today)`) — no `Date` parsing, no timezone math, no browser clock involved anywhere.

Verified this is safe to add: `tests/admin-requests-durable-surface.php:150,164` assert closed key sets only on the **per-row** `summarize()`/`detail()` projections (`array_keys($row) === [...]`), never on the top-level `{success, requests, total}` envelope — so a new top-level `today` field breaks no existing assertion.

### 4. Exact files to change (once approved)
- `src/Modules/Admin/Http/AdminRequestsController.php` — add `'today' => current_time('Y-m-d')` to `listRequests()`'s response array (1 line).
- `resources/ts/api/types/admin.ts` — add `today: string` to `AdminRequestsResponse`.
- `resources/ts/admin-station/stations/requests/` — new small file, e.g. `RequestsSummaryCards.tsx`, deriving the four `StationMetric`-shaped counts via `useMemo` over the already-fetched `RequestSummary[]` + `today`, rendering `StationMetricBlock` × 4 inside a new `.cz-requests-summary` container.
- `resources/ts/admin-station/stations/requests/RequestsCatalogueKit.tsx` — mount `<RequestsSummaryCards requests={requests} today={today} />` above the existing toolbar/list (near line 50-51); thread `today` through from the data source.
- `resources/ts/admin-station/stations/requests/useRequestsCatalogue.ts` — expose `today` alongside the existing collection (or read it directly off the raw API response before it's narrowed to `RequestSummary[]`).
- `resources/ts/admin-station/styles/admin-station.css` — add `.cz-requests-summary` container rules only (layout/spacing), reusing `.cz-station-metric*` for all card-internal styling — no new control-level CSS, keeping the admin-station CSS contract's "no control painting from feature CSS" rule intact.
- Tests/contracts: extend `tests/admin-requests-durable-surface.php` with one assertion that `today` is present and is a `Y-m-d` string; extend `scripts/requests-admin-station-surface-contract.ts` with a pure-function check on the four-count derivation (fixture `RequestSummary[]` + `today` → expected counts), mirroring the existing `requestItemDisplay()` pure-function contract style already in that file.

### 5. Conflict check against the locked read-only CRM-1B architecture
None identified. The one backend change is a single additive read-only field on the existing allow-listed list envelope — no new mutation, no lifecycle transition, no pricing/re-resolution, no transient scanning, no backfill, and `RequestRepository` remains the sole durable authority (the new field is computed inline from `current_time()`, not stored or read from any new source). The cards are explicitly non-interactive (no `onIntent`, no links, no filter state), so they add no new action surface to the read-only Requests drawer/list contract. No new generic dashboard/card system is introduced — `StationMetricBlock` already exists and is reused as-is.

Waiting for review/approval before any source edit.
