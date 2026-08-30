# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING CHATGPT REVIEW` — the full C1+C2+C3 chain is on `main` and independently confirmed deployed.
- `main` is `195896e0376c5b4988c4337f0ded769fb0c3bc09` (confirmed via `origin/main`).
- GitHub Actions "Deploy to Hostinger" run [#33296070898](https://github.com/CodeByNath/compuzign-platform/actions/runs/33296070898), `head_sha` = `195896e0376c5b4988c4337f0ded769fb0c3bc09`. The first attempt (`run_attempt: 1`) failed at "Deploy source via SSH" — the first deployment failure in this repo's history, and infrastructure-side (the prior "Build frontend assets" step succeeded; every one of the prior 10 deploys back through `b299563d` had succeeded). Nath re-ran the job manually; `run_attempt: 2` shows every step, including "Deploy source via SSH" and "Deploy built dist assets via SCP", `completed`/`success`, independently re-verified against the GitHub Actions API job list.
- Deployment is confirmed complete. Live browser validation (customer email -> secure reload -> proposal parity -> Print / Save as PDF) is the one remaining step before this phase can close, and per standing instruction is not something Claude performs unprompted (mutates live transient/mail state).

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, transient storage and **7-day expiry**. Stored submitted snapshot is authoritative; never rebuild from current catalog/pricing. Customer journey: email -> secure quote view -> exact stored snapshot -> existing proposal -> Print / Save as PDF. WordPress remains runtime/host/storage only.

## Accepted C1–C3 Chain
**C1:** 32-byte CSPRNG view secret; only SHA-256 hash persisted; `hash_equals`; public read boundary requires `X-Quote-View-Secret`; uniform non-disclosing failures; explicit response allow-list; no query-string credential.

**C2:** code-owned `/compuzign-quote-view/` entrypoint via `RequestsModule::quoteViewUrl()`; fragment is read client-side and sent as the C1 header; proposal/print renderer reused; no live catalog re-resolution. Legacy Service/Bundle descriptions required for parity are captured only into the submitted snapshot, sanitized, and rendered from there.

**C3:** independently audited commit `195896e...` is one commit on accepted C2. `submitRequest()` builds the link from `RequestsModule::quoteViewUrl($quoteRef) . '#' . $viewSecret`; raw secret stays local, is not persisted or returned, and customer `quote_cart` email alone receives the escaped View / Print Quote action. Admin and assessment email behavior remain unchanged.

## Next Action
Production push and deployment are both done and independently confirmed. Remaining: ChatGPT's post-deployment source review, then live browser validation of the end-to-end customer journey. Do not perform live quote submission on ChatGPT's behalf — that requires explicit user authorization or user action.

## Request Platform ID — Deferred
Do not add Platform identity in 8J. First durable CRM Request phase owns proposed `request` / `CZRxxxxx`, native reference `quote_ref`, through the existing Platform Identifier Station. No separate Quote identity.

## Next Work
After deployment is independently verified and the end-to-end customer email -> secure reload -> proposal -> print flow is live-validated, close 8J. Only then plan the small CRM Station handoff phase.
