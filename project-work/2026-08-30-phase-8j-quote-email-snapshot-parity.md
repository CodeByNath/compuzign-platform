# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING CLAUDE RESPONSE` — 8J-C2 needs one correction round before C3.
- 8J-A accepted/deployed at `main@f152134eac87c0cf84414ac6217794e7a4ca0102`.
- 8J-B accepted/deployed at `main@c8a0f2b43b94631232fa5befcb2b1d679f295a9b`; Hostinger run #914 succeeded.
- Auditor verdict: `Proceed with safeguards`.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry**. Submitted snapshot is authoritative; never rebuild from current Rate Sheets/Tiers/Legs/catalog state. Target journey: customer email -> secure quote view -> stored submitted snapshot -> accepted proposal / Print / Save as PDF. No second PDF renderer.

## 8J-C1 — Accepted on Review Chain
Accepted cumulative head `b122eb777cd8517324212a29fba7ea692ca984b9`; do not deploy C1 alone. Secret transport is header-only, CSPRNG/hash/`hash_equals` boundary accepted.

## 8J-C2 — Audit of `9eaa6f326f4fd5e6058b1a8d76d2bbaa793eabc7`
Independent compare confirms two commits on accepted C1. Fragment -> `X-Quote-View-Secret`, stored-snapshot API call, generic failure state, and reuse of `QuoteProposalPreview`/existing print portal are directionally correct.

Two gaps remain before C2 acceptance:

1. **Customer destination is not yet actually routable.** `RequestsModule.php` only registers `[compuzign_quote_view]`; `QuoteViewApp` mounts only when a WordPress page already contains that shortcode. No source-backed customer URL/page contract exists yet. Before C3 can emit a link, establish the exact supported destination using existing WordPress conventions. Do not rely on an undeclared manually-created page. If the intended model is a WP page, identify the canonical page/slug and how deployment guarantees it exists; otherwise implement the smallest existing-pattern route mechanism. Record the final URL contract for C3.

2. **Legacy proposal parity is not exact with `services=[]`.** `QuoteProposalPreview` currently uses the `services` prop for legacy Service short descriptions and recommended-Bundle descriptions. Passing an empty array means a reloaded submitted quote can omit text that the checkout proposal/print showed. “Conditional rendering” does not remove the parity requirement. Do not fetch live catalog data. Audit the smallest snapshot-safe fix: preserve only the missing presentation fields at submission/quote-item snapshot time (or another already-established snapshot location), sanitize them through the existing request boundary, and render from that stored data. Do not change Family pricing/commercial semantics or introduce a resolver. If exact parity can be proven without new fields, provide concrete source evidence.

Keep all C1/C2 work on the same review branch. Add focused contracts for the chosen routable destination and legacy-description snapshot parity. Re-run relevant PHP/contracts/tsc/build/docs, update this file with exact SHA/files/tests, set `AWAITING CHATGPT REVIEW`, and stop. No `main` push. C3 remains unauthorized.

## Next Work — CRM Station
After 8J closes, plan CRM properly. First handoff phase stays small: Station list/view for requests with Pending / Approved / Cancelled, client contact and first-email/work handling. Broader CRM comes later; the 7-day transient is not durable CRM storage.
