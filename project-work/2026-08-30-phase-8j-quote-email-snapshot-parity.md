# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING CLAUDE RESPONSE` — 8J-C1 requires two security/transition corrections before approval.
- `SOURCE PUSH NOT APPROVED`.
- 8J-A accepted/deployed at `main@f152134eac87c0cf84414ac6217794e7a4ca0102`.
- 8J-B accepted/deployed at `main@c8a0f2b43b94631232fa5befcb2b1d679f295a9b`; Hostinger run #914 succeeded.
- Auditor verdict: `Proceed with safeguards`.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry**. Submitted snapshot is authoritative; never rebuild from current Rate Sheets/Tiers/Legs/catalog state. Existing admin/customer notification flow remains.

Target journey remains: customer email -> secure quote view -> exact stored submitted snapshot -> accepted proposal/Print / Save as PDF experience. This is not a second PDF renderer.

## 8J-A / 8J-B — Accepted
RequestSchema preserves the richer Family snapshot and notification builders consume it with accepted cart/PDF semantics. Customer email hides raw CZ IDs; admin keeps operational identity.

## Phase 8J-C1 — Independent Audit
Candidate: `phase-8j-c1-quote-view-boundary@c147050cbe072369dbc99e19b6e820230ccef3ad`, exactly one commit ahead of production `c8a0f2b...`. Scope is otherwise clean: CSPRNG 32-byte secret, SHA-256 stored hash, `hash_equals`, explicit response allow-list, no pricing/catalog re-resolution, unchanged transient key/expiry, and focused contracts.

Two issues must be corrected before main:

1. **Do not transmit the bearer secret as a REST query parameter.** `/requests/quote/{ref}?secret=...` exposes the credential to normal URL/access logging and browser/network history. Keep the future emailed secret out of the server URL: design the C1 read endpoint to receive it in a non-URL credential channel suitable for C2 (for example a dedicated request header), while retaining public/no-login access and constant-time verification. C2 can later keep the emailed secret in the client-side URL fragment and pass it to the API without placing it in the request URL.

2. **Make failure handling truly uniform at the HTTP boundary.** Current REST args mark `secret` `required => true`; WordPress can reject a missing secret before `getQuote()` with its own 400 response, while wrong/missing/expired data returns the controller's generic 404. Remove framework-level validation that bypasses the generic failure path. Missing credential, wrong credential, malformed reference that reaches the route, missing/expired transient and legacy no-hash snapshot must converge on the same non-disclosing controller response.

Also address the deployment transition explicitly: C1 currently generates then discards the raw secret. If C1 were deployed alone, quotes submitted before C3 would have an unrecoverable hash and could never receive a working view link. **Do not push/deploy C1 to main by itself.** After corrected C1 is accepted, keep it on the review chain and build C2/C3 before one production push, unless Claude can demonstrate an equally safe compatibility path without persisting the raw secret.

Update the focused contract to cover the credential transport/generic HTTP-boundary behavior where practical. Push a correction commit to the same review branch, record exact SHA/files/tests here, set `AWAITING CHATGPT REVIEW`, and stop.

## Later — Not Authorized Yet
- **8J-C2:** customer quote-view route/page reusing accepted proposal rendering and Print / Save as PDF from stored snapshot.
- **8J-C3:** add secure `View / Print Quote` link to customer email; then one combined live validation of email + reload + print.

## Next Work — CRM Station
After 8J closes, plan CRM properly. First handoff phase stays small: Station list/view for client requests with Pending / Approved / Cancelled workflow, client contact and first-email/work handling. Broader CRM capabilities come later; the 7-day quote transient is not future durable CRM storage.
