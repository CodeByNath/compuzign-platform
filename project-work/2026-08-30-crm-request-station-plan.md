# CRM Request Station plan

## Status
- **AWAITING CHATGPT REVIEW — audit and phase plan below. No source changes made.**
- Production base: `main@48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`.
- Prior Package Bundle work is CLOSED; do not reopen it.
- Auditor verdict: **Proceed with safeguards**.
- **Stop condition triggered — see "Flagged conflicts" below.** Current durable-Request behavior does not cleanly support the requested Pending/Approved/Cancelled semantics as-is; a specific, reviewable reconciliation is proposed rather than implemented around.

## Goal
Define the first CRM phase for incoming customer Requests in Admin Station: list -> view -> approve/cancel -> contact client / first email. Keep scope small. This phase is architecture/planning only; implementation starts only after ChatGPT reviews the plan.

## Source facts already confirmed
- `RequestRepository` already defines the durable `cz_request` owner with `quote_ref`, payload and lifecycle meta.
- `RequestLifecycle` currently defines `new / reviewing / quoted / closed`.
- Current public `/requests/submit` stores the accepted quote snapshot in the 7-day `cz_quote_<ref>` transient and sends emails; the current controller does **not** visibly create a durable `RequestRepository` record in that submission method.
- `docs/code-map/quote-builder.md` says the retired Command Centre request UI is gone and the backend is to be rebuilt in Admin Station.
- Deferred identity handoff locks future durable Request identity to entity `request`, proposed Platform ID prefix `CZR`, native customer reference `quote_ref`, and no Quote Platform ID.

## Claude — audit and produce the phase plan
Read root instructions, `docs/ai-index.md`, `docs/code-map/quote-builder.md`, the complete Requests module, Platform Identifier Station/Policy integration patterns, and current Admin Station list/detail/action patterns. Then report here only; do not edit source.

Answer these exact questions:
1. **Durable intake boundary:** where, if anywhere, is `RequestRepository::create()` currently called? Is durable Request creation active, orphaned legacy backend, or acceptance-driven? Trace route/controller/module registration end-to-end.
2. **Lifecycle:** reconcile the desired CRM intake states **Pending / Approved / Cancelled** with existing `new / reviewing / quoted / closed`. Do not silently rename or add a second status system. Recommend one authoritative lifecycle model and transition table.
3. **Identity:** locate the authoritative Platform Identifier registration/reserve/bind pattern and confirm whether `request` + `CZR` can be added safely for **new durable Requests only**. No backfill in phase 1.
4. **Admin Station surface:** identify the smallest existing Station patterns to reuse for Request list, filters/sort, detail view, Approve/Cancel actions, contact details, and a first-email action. No new generic UI framework.
5. **API/security:** identify authenticated admin read/update endpoints required, permissions/nonces, and concurrency/idempotency safeguards. Customer secure quote-view (`quote_ref` + view secret) must stay unchanged.
6. **Data ownership:** define exactly what the CRM reads from the submitted immutable quote snapshot versus what it owns as CRM workflow metadata. CRM must not reprice/re-resolve the quote.

## Required proposed sequencing
Return a small phase sequence, ideally:
- CRM-1A: durable Request + identity/lifecycle contract
- CRM-1B: Admin Station read-only list/detail
- CRM-1C: approve/cancel mutations
- CRM-1D: contact/first-email action

If source evidence requires a different split, explain why. Keep promotions, subscriptions, customer accounts, opportunity pipelines, notes/history systems, broad contact CRM, and pricing changes out of scope.

## Stop condition
If current durable-request behavior conflicts with the Code Map or the requested Pending/Approved/Cancelled semantics, flag it explicitly rather than implementing around it. Record exact files/routes/classes and a recommended architecture. Set **AWAITING CHATGPT REVIEW** and stop.

---

## Claude Report — audit + phase plan — 2026-08-30

No source files were changed. Everything below is read-only findings plus a recommendation for review.

### Q1 — Durable intake boundary

`RequestRepository::create()` (`src/Modules/Requests/Repositories/RequestRepository.php:23-57`) has exactly **one** call site in the whole codebase: `AdminRequestsController::acceptRequest()` (`src/Modules/Admin/Http/AdminRequestsController.php:134-181`), behind `POST /admin/requests/{ref}/accept`, admin-gated (`requireAdmin` → `current_user_can('manage_compuzign')`), idempotent by `quote_ref` (checks `findByRef()` first, line 146-159).

The public `POST /requests/submit` (`src/Modules/Requests/Http/RequestsController.php:41-106`) never touches `RequestRepository` — it only `set_transient('cz_quote_'.$ref, ...)` (line 69) and sends two `wp_mail()`s. So:
- Durable creation is **acceptance-driven**, not submission-driven.
- The route exists and is live, but is **UI-orphaned**: `acceptIntakeRequest()` is defined in `resources/ts/api/endpoints/admin.ts:294-296` with **zero callers** anywhere in `resources/ts`. `docs/code-map/quote-builder.md` confirms: the old admin request-review surface was hosted in the retired Command Centre and removed; the intake backend was left as-is.
- `RequestRepository::updateStatus()` (lines 111-123) already exists and is fully correct for a status write, but also has **zero callers** anywhere. No code path currently ever moves a Water record out of `STATUS_NEW`.

### Q2 — Lifecycle reconciliation

`RequestLifecycle` (`src/Modules/Requests/Support/RequestLifecycle.php:7-17`) currently defines `new / reviewing / quoted / closed`, with only a flat membership check (`isValid()`) — no transition table, and (per Q1) no code ever writes anything but `new`.

The desired CRM states are `Pending / Approved / Cancelled`. These aren't a natural rename of the current four — `reviewing`/`quoted` describe a sales-pipeline stage *after* acceptance, while `Pending/Approved/Cancelled` describe the **admin intake decision itself**, which today has no persisted representation at all (see Q3/flag below).

**Recommendation (one authoritative model, not a second system):** replace `RequestLifecycle`'s vocabulary outright with `PENDING / APPROVED / CANCELLED` for CRM-1A. This is a safe rename, not a parallel system, because:
- Nothing in production code currently reads or writes `reviewing`/`quoted`/`closed` (only `new` is ever set, and only as an unread default).
- `RequestMetaSchema.php:34`'s registered default (`RequestLifecycle::STATUS_NEW`) becomes `STATUS_PENDING` — same mechanism, new label.
- `reviewing`/`quoted` are not lost conceptually — they become an **explicit future extension of the same field**, added only when CRM-1D+ builds real quote-sending, and only after a review cycle, per the "no silent second status system" instruction.

### Q3 — Identity

`PlatformIdentifierPolicy.php` (`src/PlatformIdentifier/PlatformIdentifierPolicy.php:16-76`) has no `request`/`CZR` entry yet. Adding one is a two-line change (one entity-type constant + one `PREFIXES` entry) — the same shape as every existing entity (`CZC`, `CZS`, `CZPG`, …).

The proven end-to-end pattern is Category creation (`AdminCategoriesController::createCategory()`, lines 283-353): `reserve()` **before** the native record exists → create native record → `assign()` binds reservation to native id via a scalar read/write meta pair (`CategoryMeta::platformId()` / `claimPlatformId()`) → rollback both on failure.

`RequestsModule` currently receives **no** `PlatformIdentifierStation` instance at all (unlike Category/Service/PackageFamily, all wired in `Core/Plugin.php:34-46`), and `RequestRepository`/`RequestMetaSchema` define no `cz_platform_id` meta key or claim helper. Both need to be added in CRM-1A, replicating the Category shape exactly.

**Recommendation:** mint `CZR` **only** when a Water record is created — i.e., only on the first admin decision (Approve or Cancel; see flag below), never for a River-only Pending row. This matches "no backfill in phase 1" and avoids reserving identifiers for spam/abandoned/never-triaged submissions (rate-limited at 5/hour/IP, but still not worth an identity each).

### Q4 — Admin Station surface to reuse

Smallest fit is the **Service Station** list → drawer → status-action shape, not a new framework:
- List/filter/sort: `resources/ts/service-station/presentation/ServiceCatalogue.tsx` — client-side filter/sort/pagination over an already-fetched array (lines 63-93, 104-139, 192-232), row → `onIntent(id, 'view')` (line 282).
- Detail: drawer, not a page — `ServiceDrawerHost.tsx` → `ServiceDrawerContent.tsx`, pinned action footer in `ServiceDrawerFooter.tsx`, confirm dialogs in `ServiceDrawerDialogs.tsx`.
- Status action wiring: `useServiceLifecycle.ts` — `await station.xAction(); setService(prev => ...)`, folding the response directly into local state without a full list refetch (lines 31-93), mirrored generically in `useCategoryStation.ts:229-245`'s `applyStatus()`.
- Backend precedent for the Approve/Cancel route: `ServiceController::updateStatus()` (`src/Modules/Service/Http/ServiceController.php:782-854`) — load → branch on action → `StationLifecycle`-style transition → persist → return the full refreshed projection (never a bare `{success:true}`).

Convention note already flagged in-repo (`AdminCategoriesController.php:44-47`): Category uses `PATCH .../status`, Service uses `POST .../status` — the two disagree on verb today. CRM-1C should pick one deliberately rather than copy either by default; recommend `POST`, since Approve/Cancel are discrete verbs more than a generic status PATCH (matches the existing `/accept` route's own `POST`).

### Q5 — API/security

Reuse the existing admin pattern exactly: `register_rest_route('compuzign/v1', '/admin/...', ['permission_callback' => [$this, 'requireAdmin'], ...])`, `requireAdmin()` → `current_user_can(PlatformAccess::CAP)` (`CAP = 'manage_compuzign'`). No manual nonce check needed on admin routes — WP core validates `X-WP-Nonce` before the permission callback runs; the frontend `api/client.ts:47-61` already attaches it to every call automatically. New routes needed: `POST /admin/requests/{ref}/approve`, `POST /admin/requests/{ref}/cancel` (or reuse/rename the existing `/accept` — see flag below), and `POST /admin/requests/{ref}/notify` (first-email).

**Concurrency/idempotency:** no optimistic-locking/version-field/ETag pattern exists anywhere in this codebase (confirmed by repo-wide grep) — idempotency is handled ad hoc by natural-key lookup-before-write, exactly as `acceptRequest()` already does (`findByRef()` before `create()`). Recommend matching this precedent for Approve/Cancel (idempotent by ref, last-write-wins on genuinely concurrent double-clicks) rather than introducing a new locking mechanism unique to Requests — flagging this as a deliberate consistency choice, not an oversight, since a genuine double-submit race here has low real-world likelihood (one admin, one record) and no existing precedent to match against.

The customer secure quote-view (`quote_ref` + header-only view secret, `QuoteViewAccess::resolve()`, `RequestsModule::QUOTE_VIEW_PATH`) is fully independent — different controller, different route, reads only the transient, never `RequestRepository`. CRM-1A–D touch none of its files.

### Q6 — Data ownership

CRM reads the immutable submitted snapshot (contact fields, item list, `quote_ref`) **read-only** from the existing `cz_request_data` meta / River transient payload — it must never reprice or re-resolve rate sheet items. CRM owns, as new meta on the same `cz_request` post: `cz_request_status` (repurposed per Q2), `cz_platform_id` (new, per Q3), and — for CRM-1D — a send-log (timestamp + template used) for the first-email action. No existing meta key changes shape, only the status vocabulary and one new key.

### Flagged conflicts (stop condition)

1. **Pending has no durable home today.** Only `Approve`-equivalent action (today's `/accept`) ever creates a Water record; `Cancel` has nothing to attach to — a rejected River request would just expire silently in 7 days with no record it was ever seen. **Recommendation:** broaden Water-record creation to trigger on *either* first admin decision (Approve or Cancel), not Approve alone — `Pending` itself stays a River-only *virtual* state (already listable today via the existing `GET /admin/requests`, which decorates transients with `is_accepted`), and a Water record + `CZR` identity is minted only once an admin actually decides. This needs explicit sign-off since it changes what "accept" currently means.
2. **Naming collision on "accept."** The codebase already uses "accept" for the *customer's* quote/cart acceptance feeding `/requests/submit` (per `docs/code-map/quote-builder.md`'s "accepted quote snapshot" language) — a *different* concept from the *admin's* `/admin/requests/{ref}/accept`. Recommend the CRM phase renames the admin verb to **Approve** throughout (route, method, UI) specifically to stop these two unrelated "accept" concepts from colliding in code and docs going forward.
3. **`RequestLifecycle` rename is a real (if currently inert) contract change** — flagged per Q2, not implemented, pending review.

### Proposed sequencing

- **CRM-1A — durable Request + identity/lifecycle contract.** Rename `RequestLifecycle` to `PENDING/APPROVED/CANCELLED`; add `request`→`CZR` to `PlatformIdentifierPolicy`; inject `PlatformIdentifierStation` into `RequestsModule`/`AdminRequestsController`; add `cz_platform_id` claim/read meta pair (mirroring `CategoryMeta`); change Water-record creation to trigger on first admin decision (either verb), not only Approve. No admin UI yet.
- **CRM-1B — Admin Station read-only list/detail.** New `resources/ts` Requests module modeled on Service Station's list+drawer; consumes existing `GET /admin/requests` / `GET /admin/requests/{ref}`, extended to surface Water status once CRM-1A exists. No mutation.
- **CRM-1C — approve/cancel mutations.** New `POST /admin/requests/{ref}/approve` and `.../cancel` (idempotent-by-ref, matching `acceptRequest()`'s existing shape; retire or alias the old `/accept` name per flag #2), wired via the Service Station's await→fold-into-state action pattern.
- **CRM-1D — contact/first-email action.** New `POST /admin/requests/{ref}/notify` reusing the already transport-decoupled `NotificationTemplates` (new admin-manual-send template variant) + `wp_mail()`; logs send timestamp as new CRM-owned meta (Q6).

Out of scope, confirmed untouched by this plan: promotions, subscriptions, customer accounts, opportunity pipelines, notes/history systems, broad contact CRM, pricing changes, and the customer secure quote-view boundary (Q5).

Setting status to **AWAITING CHATGPT REVIEW** per the stop condition — no implementation until the flagged conflicts and proposed sequencing are reviewed.