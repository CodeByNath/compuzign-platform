# Phase 8J — Submitted Quote / Email Parity

## Status
- **DEPLOYMENT FAILURE — needs human/infrastructure attention, not a Claude source action.** `main` was pushed to exactly the approved SHA, but the automated Hostinger deployment failed. Not `AWAITING CHATGPT REVIEW` — there is nothing deployed yet to review.
- `main` is now `195896e0376c5b4988c4337f0ded769fb0c3bc09` (git push confirmed via `origin/main`).
- GitHub Actions "Deploy to Hostinger" run [#33296070898](https://github.com/CodeByNath/compuzign-platform/actions/runs/33296070898), `head_sha` = `195896e0376c5b4988c4337f0ded769fb0c3bc09` (correct target, confirmed), status `completed`, conclusion **`failure`**. Job step "Deploy source via SSH" failed; "Deploy built dist assets via SCP" was skipped as a result.
- This is the first deployment failure in this repo's history — the prior 10 consecutive runs (back through `b299563d`) all succeeded, so this looks infrastructure-side (SSH/host/credential/connectivity), not a defect in the pushed code — the earlier "Build frontend assets" step completed successfully.
- I could not read the job's detailed log from here (`GET .../jobs/{id}/logs` returned `403 Must have admin rights to Repository` for this session's unauthenticated access) — someone with GitHub repo admin access needs to open the run directly to see the actual SSH error, then either fix the underlying issue (rotated key, host key change, Hostinger-side outage/disk/quota, etc.) and re-run the failed job, or re-trigger a fresh deploy once resolved.
- **Live site status is unknown/unconfirmed** — do not assume Hostinger is serving `195896e0`'s code. Treat the previous commit (`c8a0f2b4`) as what's still live until this is confirmed fixed.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, transient storage and **7-day expiry**. Stored submitted snapshot is authoritative; never rebuild from current catalog/pricing. Customer journey: email -> secure quote view -> exact stored snapshot -> existing proposal -> Print / Save as PDF. WordPress remains runtime/host/storage only.

## Accepted C1–C3 Chain
**C1:** 32-byte CSPRNG view secret; only SHA-256 hash persisted; `hash_equals`; public read boundary requires `X-Quote-View-Secret`; uniform non-disclosing failures; explicit response allow-list; no query-string credential.

**C2:** code-owned `/compuzign-quote-view/` entrypoint via `RequestsModule::quoteViewUrl()`; fragment is read client-side and sent as the C1 header; proposal/print renderer reused; no live catalog re-resolution. Legacy Service/Bundle descriptions required for parity are captured only into the submitted snapshot, sanitized, and rendered from there.

**C3:** independently audited commit `195896e...` is one commit on accepted C2. `submitRequest()` builds the link from `RequestsModule::quoteViewUrl($quoteRef) . '#' . $viewSecret`; raw secret stays local, is not persisted or returned, and customer `quote_cart` email alone receives the escaped View / Print Quote action. Admin and assessment email behavior remain unchanged.

## Next Action (Blocked on Infrastructure, Not Source)
The approved source push is done — `main` is exactly `195896e0376c5b4988c4337f0ded769fb0c3bc09`, confirmed correct. What remains is entirely deployment-infrastructure: someone with GitHub repo admin access needs to inspect run #33296070898's "Deploy source via SSH" step log and fix whatever the SSH-level failure is (I cannot read that log with this session's access). Once fixed, either re-run the failed job on that same run or push again (no-op re-push, since `main` already has the right content) to trigger a fresh deploy — either way, re-check the resulting run's `head_sha`/`conclusion` the same way before treating this as deployed.

Do not perform live quote submission on ChatGPT's behalf. Final customer validation mutates transient/mail state and requires explicit user authorization or user action, and cannot happen until the deployment above is actually confirmed successful.

## Request Platform ID — Deferred
Do not add Platform identity in 8J. First durable CRM Request phase owns proposed `request` / `CZRxxxxx`, native reference `quote_ref`, through the existing Platform Identifier Station. No separate Quote identity.

## Next Work
After deployment is independently verified and the end-to-end customer email -> secure reload -> proposal -> print flow is live-validated, close 8J. Only then plan the small CRM Station handoff phase.
