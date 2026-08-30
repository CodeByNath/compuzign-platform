# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING CHATGPT REVIEW` — 8J-C2 candidate pushed to review chain.
- 8J-A accepted/deployed at `main@f152134eac87c0cf84414ac6217794e7a4ca0102`.
- 8J-B accepted/deployed at `main@c8a0f2b43b94631232fa5befcb2b1d679f295a9b`; Hostinger run #914 succeeded.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry**. Submitted snapshot is authoritative; never rebuild a submitted quote from current Rate Sheets/Tiers/Legs/catalog state. Target journey: customer email -> secure quote view -> stored submitted snapshot -> accepted proposal / Print / Save as PDF. No second PDF renderer.

## 8J-C1 — Accepted on Review Chain
Cumulative review head: `b122eb777cd8517324212a29fba7ea692ca984b9`, two commits ahead of production `c8a0f2b...`; not on `main`.

Independent audit confirms the correction resolves both blockers:
- bearer secret is read only from `X-Quote-View-Secret`, not query params;
- missing/wrong secret, missing quote and malformed reference converge on the same controller 404 path; focused HTTP contract covers the actual route/controller boundary.

Accepted safeguards remain: 32-byte CSPRNG secret, only SHA-256 hash persisted, `hash_equals`, explicit response allow-list, stored snapshot only, unchanged transient key/lifetime. **Do not deploy C1 alone** because the raw secret is intentionally not retained and C3 is what delivers it to the customer.

## Phase 8J-C2 — Claude Report

Branch: `phase-8j-c1-quote-view-boundary`, head `9eaa6f326f4fd5e6058b1a8d76d2bbaa793eabc7` (two commits added on top of accepted C1 `b122eb77`). Not on `main`.

**Mounting:** audited the existing shortcode/registry pattern (`resources/ts/runtime/registry.ts` + `conditions.ts` — shortcode is the only implemented condition). New `[compuzign_quote_view]` shortcode (`RequestsModule.php`) shares the existing `compuzign-cost-builder` JS/CSS handles — no new build entry/SPA/router.

**Fragment/header transport:** `QuoteViewApp.tsx` reads `?ref=` from the query string and the secret from `location.hash` only; `apiClient.get()` gained an optional `extraHeaders` param (timeout/abort logic untouched) so the secret travels as `X-Quote-View-Secret`. Never persisted to storage. The fragment is **not** stripped from the address bar — stripping it would leave nothing to re-authenticate a refresh with, given storage is disallowed; documented as a deliberate trade-off, not an oversight.

**Snapshot-parity audit (item 5):** `QuoteProposalPreview`'s only `services` dependency is an optional Service/Bundle description that already renders conditionally (nothing shown when absent); Family items never touch `services` at all. Exact accepted rendering is achievable passing `services=[]` — no live catalog lookup, no missing required field, so no STOP was triggered.

**Print:** reuses `QuoteProposalPreview` and the exact `#cz-print-root`/`cz-printing` portal `RequestFlowModal.tsx` already uses, extracted into an exported `installPrintPortal(doc, win)` for direct testing; kept out of a shared hook to avoid touching that unrelated component.

**Generic failure:** one unconditional message for every rejection reason (missing ref/secret, wrong secret, missing/expired quote) — the branch never inspects error content.

**Contracts:** `scripts/quote-view-contract.ts` (fragment/query parsing, date/contact mapping, header-only transport, no secret in URL or thrown-error text) and `scripts/quote-view-print-portal-contract.ts` (real DOM assertions via `happy-dom` — clone/toggle/cleanup). Correction note: my first pass claimed this repo has no DOM-testing library; `happy-dom` is actually a devDependency (unused elsewhere, no established convention, but available) — added the print-portal contract against it rather than let that claim stand. Full Preact rendering of `<QuoteViewApp/>` was not attempted (no precedent, low marginal value for the remaining single-branch "generic failure" property, which is verified by inspection instead).

All PHP tests, `contract:quote-view`, `contract:quote-view-print-portal`, the 4 other focused contracts, full sweep of all 52 `npm run contract:*`, `tsc`, `build`, `docs:check` — passed.

No changes to notification email, C1's security model, pricing/resolver logic, transient lifetime, CRM storage, or `main`.

## Later — Not Authorized Yet
**8J-C3:** wire secure `View / Print Quote` link into customer email using the same per-submission raw secret, then one combined production push/deploy/live validation of email + reload + print.

## Next Work — CRM Station
After 8J closes, plan CRM properly. First handoff phase stays small: Station list/view for requests with Pending / Approved / Cancelled, client contact and first-email/work handling. Broader CRM comes later; the 7-day transient is not durable CRM storage.
