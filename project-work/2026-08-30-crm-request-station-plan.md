# CRM Request Station plan

## Status
- **READY FOR CLAUDE — planning/audit only. No source changes.**
- Production base: `main@48c791b4f6d3d87ae8d6ef8e895a905ec2cc00a8`.
- Prior Package Bundle work is CLOSED; do not reopen it.
- Auditor verdict: **Proceed with safeguards**.

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