# Phase 8J — Submitted Quote / Email Parity

## Status
- `CLOSED` — source, deployment, and live customer journey accepted.
- Production `main` = `195896e0376c5b4988c4337f0ded769fb0c3bc09`.
- Auditor verdict: `Proceed`.

## Accepted Result
Keep `/requests/submit`, `cz_quote_<ref>`, transient storage and **7-day expiry**. Stored submitted snapshot is authoritative; never rebuild from current catalog/pricing. Customer journey is now live: email -> secure quote view -> exact stored snapshot -> existing proposal -> Print / Save as PDF. WordPress remains runtime/host/storage only.

**C1:** 32-byte CSPRNG view secret; only SHA-256 hash persisted; `hash_equals`; public read boundary requires `X-Quote-View-Secret`; uniform non-disclosing failures; response allow-list; no query-string credential.

**C2:** code-owned `/compuzign-quote-view/` entrypoint via `RequestsModule::quoteViewUrl()`; fragment secret is sent client-side as the C1 header; proposal/print renderer reused; no live catalog re-resolution. Legacy Service/Bundle descriptions are captured only into the submitted snapshot and sanitized.

**C3:** customer `quote_cart` email alone receives the escaped View / Print Quote action. Raw secret is not persisted, returned, logged, or sent to admin/assessment emails.

## Production / Live Evidence
GitHub `main` resolves to exact accepted head `195896e0376c5b4988c4337f0ded769fb0c3bc09`. Deploy run `33296070898` / run `915` completed successfully on attempt 2 with exact matching `head_sha`; build, source SSH deploy, and dist SCP deploy all succeeded.

Nath completed the real live customer test and reported the full flow good: customer email, secure reload, stored proposal parity, and Print / Save as PDF all worked as expected. This satisfies the remaining live-validation gate and closes 8J.

## Documentation Check
`docs/code-map/quote-builder.md` on current `main` already documents the secure read route, `QuoteViewSecret`, `QuoteViewAccess`, code-owned public entrypoint, fragment-to-header transport, stored legacy descriptions, customer-only View / Print Quote email link, and the focused validation commands. No extra source documentation change is required solely to close 8J.

## Request Platform ID — Deferred
First durable CRM Request phase owns proposed `request` / `CZRxxxxx`, native reference `quote_ref`, through the existing Platform Identifier Station. No separate Quote identity.

## Next Work Order
Do the pending **Admin UI/UX work first**. After that is accepted, plan the small CRM Station handoff phase. Do not start CRM implementation from this closed file.
