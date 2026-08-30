# Phase 8J — Submitted Quote / Email Parity

## Status
- `READY FOR CLAUDE` — 8J-C2 only.
- `SOURCE PUSH NOT APPROVED`.
- 8J-A accepted/deployed at `main@f152134eac87c0cf84414ac6217794e7a4ca0102`.
- 8J-B accepted/deployed at `main@c8a0f2b43b94631232fa5befcb2b1d679f295a9b`; Hostinger run #914 succeeded.
- Auditor verdict: `Proceed with safeguards`.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry**. Submitted snapshot is authoritative; never rebuild a submitted quote from current Rate Sheets/Tiers/Legs/catalog state. Target journey: customer email -> secure quote view -> stored submitted snapshot -> accepted proposal / Print / Save as PDF. No second PDF renderer.

## 8J-C1 — Accepted on Review Chain
Cumulative review head: `b122eb777cd8517324212a29fba7ea692ca984b9`, two commits ahead of production `c8a0f2b...`; not on `main`.

Independent audit confirms the correction resolves both blockers:
- bearer secret is read only from `X-Quote-View-Secret`, not query params;
- missing/wrong secret, missing quote and malformed reference converge on the same controller 404 path; focused HTTP contract covers the actual route/controller boundary.

Accepted safeguards remain: 32-byte CSPRNG secret, only SHA-256 hash persisted, `hash_equals`, explicit response allow-list, stored snapshot only, unchanged transient key/lifetime. **Do not deploy C1 alone** because the raw secret is intentionally not retained and C3 is what delivers it to the customer.

## Phase 8J-C2 — Customer Quote View
Implement on the same review chain only. Do not touch email yet.

1. Audit existing public WordPress/frontend mounting and `QuoteProposalPreview.tsx` before choosing a route. Reuse established page/app conventions; no new SPA/router architecture.
2. Build a customer quote-view entry that accepts a non-secret quote ref in the normal URL and the bearer secret in the URL **fragment** only. Client JS must read the fragment locally and call C1 using `X-Quote-View-Secret`; never send the secret in query/path/body or persist it to local/session storage.
3. After reading the fragment, remove/neutralize it from the visible browser URL where practical without breaking refresh behavior. Do not expose the secret in DOM text, analytics, console output or errors.
4. Reuse the accepted `QuoteProposalPreview` rendering and existing Print / Save as PDF behavior. Do not copy its commercial arithmetic or create a second renderer.
5. **Snapshot-parity safeguard:** current `QuoteProposalPreview` still consults `services` for some legacy Service descriptions/bundle descriptions, while the stored request snapshot contains `items` but not the live `services` catalog. The secure view must not fetch/re-resolve current Service/catalog data. Audit this dependency first. If exact accepted rendering can be achieved from stored item data, do so. If required displayed legacy data is absent from the submitted snapshot, STOP and report the exact missing fields/affected surfaces in this file rather than silently dropping content or introducing live lookup.
6. Loading/error/expired access must be generic and customer-safe; no distinction between wrong secret and missing/expired quote.
7. Do not change notification email, C1 security model, pricing/resolver logic, transient lifetime, CRM storage or main.
8. Add focused frontend/contracts for fragment handling, header transport, no secret leakage, valid stored quote render, generic failure, and print path. Run relevant existing quote/request contracts, tsc/build/docs.
9. Push review commit, record exact SHA/files/tests here, set `AWAITING CHATGPT REVIEW`, stop.

## Later — Not Authorized Yet
**8J-C3:** wire secure `View / Print Quote` link into customer email using the same per-submission raw secret, then one combined production push/deploy/live validation of email + reload + print.

## Next Work — CRM Station
After 8J closes, plan CRM properly. First handoff phase stays small: Station list/view for requests with Pending / Approved / Cancelled, client contact and first-email/work handling. Broader CRM comes later; the 7-day transient is not durable CRM storage.
