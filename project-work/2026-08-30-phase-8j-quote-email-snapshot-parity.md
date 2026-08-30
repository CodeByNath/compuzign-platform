# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING CHATGPT REVIEW` — 8J-C1 correction round pushed to review branch.
- 8J-A accepted/deployed at `main@f152134eac87c0cf84414ac6217794e7a4ca0102`.
- 8J-B accepted/deployed at `main@c8a0f2b43b94631232fa5befcb2b1d679f295a9b`; Hostinger run #914 succeeded.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry**. Submitted snapshot is authoritative; never rebuild from current Rate Sheets/Tiers/Legs/catalog state. Existing admin/customer notification flow remains.

Target journey remains: customer email -> secure quote view -> exact stored submitted snapshot -> accepted proposal/Print / Save as PDF experience. This is not a second PDF renderer.

## 8J-A / 8J-B — Accepted
RequestSchema preserves the richer Family snapshot and notification builders consume it with accepted cart/PDF semantics. Customer email hides raw CZ IDs; admin keeps operational identity.

## Phase 8J-C1 — Correction Round (Claude Response)

Branch: `phase-8j-c1-quote-view-boundary`, correction commit
`b122eb777cd8517324212a29fba7ea692ca984b9` (on top of the original
`c147050c`, still exactly one review branch, not pushed to `main`).

**Issue 1 (query-param transmission) — fixed.** The secret now arrives only
via an `X-Quote-View-Secret` request header, read in `getQuote()` via
`$request->get_header(...)`. No query parameter, no URL/log/history
exposure. Compatible with a future C2 fragment-based email link (fragment
never reaches the server; client JS reads it and sends it as this header).

**Issue 2 (non-uniform HTTP-boundary failure) — fixed.** `secret` removed
from `registerRoutes()`'s REST `args` entirely (a header isn't validated by
that mechanism, so this is resolved by construction, not a special case).
`ref` keeps `required => true` — harmless, since the URL route pattern
itself can't match without a `ref` segment, so it never produces a
distinguishing rejection in practice.

**Deployment sequencing — acknowledged, not engineered around.** No
compatibility path was built for the current-transition gap (a quote
submitted between a standalone C1 deploy and C3's email-link wiring would
have an unrecoverable hash); manufacturing one would add scope/complexity
this phase doesn't need. Per the guidance: **C1 stays on the review chain
and is not pushed to `main` alone** — it waits for C2/C3 to be ready for one
combined production push, or an explicit separate approval.

New test `tests/quote-view-http-boundary.php`: exercises the real
`registerRoutes()`/`getQuote()` (stubs `register_rest_route`,
`get_transient`, `WP_REST_Request`/`WP_REST_Response`) — asserts `secret`
is absent from the captured route's `args`, and that missing header, wrong
secret, missing/expired quote, and malformed reference all return a
byte-identical 404 body. `docs/code-map/quote-builder.md` updated.

Tests/checks (all passed): the new HTTP-boundary contract plus every prior
Requests-module PHP test (including the original `quote-view-access-
boundary.php`, unaffected — it tests the transport-agnostic pure resolver);
the same 4 focused npm contracts; full sweep of all 50 `npm run contract:*`;
`npx tsc --noEmit`; `npm run build`; `npm run docs:check`.

## Later — Not Authorized Yet
- **8J-C2:** customer quote-view route/page reusing accepted proposal rendering and Print / Save as PDF from stored snapshot.
- **8J-C3:** add secure `View / Print Quote` link to customer email; then one combined live validation of email + reload + print.

## Next Work — CRM Station
After 8J closes, plan CRM properly. First handoff phase stays small: Station list/view for client requests with Pending / Approved / Cancelled workflow, client contact and first-email/work handling. Broader CRM capabilities come later; the 7-day quote transient is not future durable CRM storage.
