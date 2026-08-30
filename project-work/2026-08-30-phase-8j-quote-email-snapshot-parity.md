# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING LIVE VALIDATION` — source/deployment chain accepted; only the customer end-to-end flow remains.
- Production `main` = `195896e0376c5b4988c4337f0ded769fb0c3bc09`.
- Auditor verdict: `Proceed with safeguards`.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, transient storage and **7-day expiry**. Stored submitted snapshot is authoritative; never rebuild from current catalog/pricing. Customer journey: email -> secure quote view -> exact stored snapshot -> existing proposal -> Print / Save as PDF. WordPress is runtime/host/storage only.

## Accepted C1–C3
**C1:** 32-byte CSPRNG view secret; only SHA-256 hash persisted; `hash_equals`; public read boundary requires `X-Quote-View-Secret`; uniform non-disclosing failures; response allow-list; no query-string credential.

**C2:** code-owned `/compuzign-quote-view/` entrypoint via `RequestsModule::quoteViewUrl()`; fragment secret is sent client-side as the C1 header; proposal/print renderer reused; no live catalog re-resolution. Legacy Service/Bundle descriptions are captured only into the submitted snapshot and sanitized.

**C3:** customer `quote_cart` email alone receives the escaped View / Print Quote action. Link is `RequestsModule::quoteViewUrl($quoteRef) . '#' . $viewSecret`; raw secret is not persisted, returned, logged, or sent to admin/assessment emails.

## Independent Production Audit
GitHub `main` independently resolves to the exact accepted review head `195896e0376c5b4988c4337f0ded769fb0c3bc09`; no extra source commit was inserted.

GitHub Actions **Deploy to Hostinger** run `33296070898` / run number `915` is `completed/success`, attempt 2, with exact `head_sha=195896e0376c5b4988c4337f0ded769fb0c3bc09`. Independent job inspection confirms `Build frontend assets`, `Deploy source via SSH`, and `Deploy built dist assets via SCP` all completed successfully. Source/deployment boundary is accepted.

## Live Validation Required
Do not close 8J until a real customer quote submission confirms:
- customer email shows the expected quote snapshot and View / Print Quote action;
- link opens `/compuzign-quote-view/?ref=<quote_ref>#<secret>` and reload succeeds;
- rendered proposal matches the submitted snapshot, including legacy descriptions where applicable and accepted Family commercial/inclusion semantics;
- Print / Save as PDF works;
- customer view exposes no raw CZ Platform IDs;
- invalid/missing secret produces the generic failure state.

A real submission mutates transient/mail state. ChatGPT must not submit one without Nath's explicit authorization. Nath may submit it himself and open/share the resulting email/link for read-only validation.

## Request Platform ID — Deferred
First durable CRM Request phase owns proposed `request` / `CZRxxxxx`, native reference `quote_ref`, through the existing Platform Identifier Station. No separate Quote identity.

## Next Work
After live validation passes, mark 8J `CLOSED`, then plan the small CRM Station handoff phase. No CRM implementation before closure.
