# Phase 8J — Submitted Quote / Email Parity

## Status
- `SOURCE PUSH APPROVED` — full 8J-C1+C2+C3 review chain accepted for one production push.
- Production base remains `main@c8a0f2b43b94631232fa5befcb2b1d679f295a9b`.
- Accepted review head: `195896e0376c5b4988c4337f0ded769fb0c3bc09` (6 commits ahead of production).
- Auditor verdict: `Proceed with safeguards`.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, transient storage and **7-day expiry**. Stored submitted snapshot is authoritative; never rebuild from current catalog/pricing. Customer journey: email -> secure quote view -> exact stored snapshot -> existing proposal -> Print / Save as PDF. WordPress remains runtime/host/storage only.

## Accepted C1–C3 Chain
**C1:** 32-byte CSPRNG view secret; only SHA-256 hash persisted; `hash_equals`; public read boundary requires `X-Quote-View-Secret`; uniform non-disclosing failures; explicit response allow-list; no query-string credential.

**C2:** code-owned `/compuzign-quote-view/` entrypoint via `RequestsModule::quoteViewUrl()`; fragment is read client-side and sent as the C1 header; proposal/print renderer reused; no live catalog re-resolution. Legacy Service/Bundle descriptions required for parity are captured only into the submitted snapshot, sanitized, and rendered from there.

**C3:** independently audited commit `195896e...` is one commit on accepted C2. `submitRequest()` builds the link from `RequestsModule::quoteViewUrl($quoteRef) . '#' . $viewSecret`; raw secret stays local, is not persisted or returned, and customer `quote_cart` email alone receives the escaped View / Print Quote action. Admin and assessment email behavior remain unchanged. Focused contract exercises real submit flow and asserts fragment-only transport, no raw-secret persistence/response leak, and no link in admin/assessment emails.

Cumulative compare from production to `195896e...` is exactly the reviewed six-commit 8J chain. `main` was independently confirmed still at `c8a0f2b...`; no premature C1/C2 deployment occurred.

## Claude — Production Push Now
Push the **accepted cumulative review head `195896e0376c5b4988c4337f0ded769fb0c3bc09`** to `main` using the normal project workflow. Do not add or amend source while pushing. After push:
1. record the exact resulting `main` SHA;
2. record the GitHub Actions deployment run ID/status/head SHA;
3. verify the deployed workflow targets that exact main SHA;
4. set this file to `AWAITING CHATGPT REVIEW` and stop.

Do not perform live quote submission on ChatGPT's behalf. Final customer validation requires a real submission/email and therefore mutates transient/mail state; it will be done only with explicit user authorization or by the user.

## Request Platform ID — Deferred
Do not add Platform identity in 8J. First durable CRM Request phase owns proposed `request` / `CZRxxxxx`, native reference `quote_ref`, through the existing Platform Identifier Station. No separate Quote identity.

## Next Work
After deployment is independently verified and the end-to-end customer email -> secure reload -> proposal -> print flow is live-validated, close 8J. Only then plan the small CRM Station handoff phase.
