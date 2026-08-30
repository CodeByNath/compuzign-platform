# Phase 8J — Submitted Quote / Email Parity

## Status
- `READY FOR CLAUDE` — Phase 8J-C1 only.
- `SOURCE PUSH NOT APPROVED`.
- 8J-A accepted/deployed at `main@f152134eac87c0cf84414ac6217794e7a4ca0102`.
- 8J-B accepted/deployed at `main@c8a0f2b43b94631232fa5befcb2b1d679f295a9b`; Hostinger run #914 succeeded.
- Auditor verdict: `Proceed with safeguards`.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry**. The submitted snapshot remains authoritative; never rebuild a submitted quote from live Rate Sheets/Tiers/Legs/catalog state.

Existing admin/customer notification flow remains. The next customer feature is a secure email link that reloads the exact submitted quote into the same proposal/print experience; it is **not** a second PDF renderer.

## 8J-A / 8J-B — Accepted
RequestSchema preserves the richer Family snapshot and the existing notification builders now render it with accepted cart/PDF semantics. Customer email hides raw CZ IDs; admin keeps operational identity.

## Phase 8J-C1 — Secure Quote Retrieval Boundary Only
Implement only the secure read boundary. Do **not** build the customer page or add the email button/link yet.

1. Audit `RequestsController`, request schema, request-flow API/bootstrap, and existing WordPress routing conventions first.
2. On successful quote submission, create a **cryptographically strong unguessable view secret server-side**. The current short `CZ-xxxxxx` quote reference is identification only and must never be sufficient to retrieve customer quote data.
3. Keep the existing `cz_quote_<ref>` transient and 7-day lifetime. Store only what is necessary to verify the view secret with that snapshot; prefer storing a one-way hash rather than the raw bearer secret when practical.
4. Add a public read endpoint for one stored quote that requires both quote reference and valid view secret. No WordPress-login/REST nonce requirement for the email recipient, but invalid/missing secret, missing/expired transient, or malformed reference must return a non-disclosing failure. Use constant-time secret comparison.
5. Returned data must come **only from the stored submitted snapshot**. Do not query current catalog/pricing state.
6. Do not expose server-only verification material in the response. Return only the fields needed by the future customer quote renderer; do not broaden PII beyond what the accepted proposal needs.
7. Do not change current email content, customer UI, cart/PDF, notification arithmetic, quote-ref format, CRM storage, or transient expiry.
8. Add focused contracts for valid access, wrong secret, missing/expired quote, no quote-ref-only access, and no secret/hash leakage.
9. Commit/push to a non-production review branch, record exact SHA/files/tests here, set `AWAITING CHATGPT REVIEW`, and stop. Do not push main.

## Later — Not Authorized Yet
- **8J-C2:** customer quote-view route/page reusing the accepted proposal rendering and Print / Save as PDF from the stored snapshot.
- **8J-C3:** add the secure `View / Print Quote` link to the customer email, then perform one combined live validation of email + reload + print. The earlier standalone live-email validation is deferred into this end-to-end validation so we test the final customer journey once.

## Next Work — CRM Station
After 8J closes: start small with CRM Station + **email management only**. Quote management, promotions and subscriptions come later as separate capabilities with proper durable CRM-owned storage. The 7-day quote transient is not future CRM durable storage.
