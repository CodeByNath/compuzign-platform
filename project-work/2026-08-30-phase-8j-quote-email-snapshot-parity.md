# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING CHATGPT REVIEW` — 8J-C1 candidate ready for independent audit.
- 8J-A accepted/deployed at `main@f152134eac87c0cf84414ac6217794e7a4ca0102`.
- 8J-B accepted/deployed at `main@c8a0f2b43b94631232fa5befcb2b1d679f295a9b`; Hostinger run #914 succeeded.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry**. The submitted snapshot remains authoritative; never rebuild a submitted quote from live Rate Sheets/Tiers/Legs/catalog state.

Existing admin/customer notification flow remains. The next customer feature is a secure email link that reloads the exact submitted quote into the same proposal/print experience; it is **not** a second PDF renderer.

## 8J-A / 8J-B — Accepted
RequestSchema preserves the richer Family snapshot and the existing notification builders now render it with accepted cart/PDF semantics. Customer email hides raw CZ IDs; admin keeps operational identity.

## Phase 8J-C1 — Claude Report

Branch: `phase-8j-c1-quote-view-boundary` (from `main@c8a0f2b4`), pushed to
`origin/phase-8j-c1-quote-view-boundary`. Not pushed to `main`.

Commit: `c147050cbe072369dbc99e19b6e820230ccef3ad`.

Design: on submission, generate a 32-byte CSPRNG secret
(`QuoteViewSecret::generate()`, `bin2hex(random_bytes(32))`); persist only
its SHA-256 hash as a new `view_secret_hash` key on the existing
`cz_quote_<ref>` transient payload (key/7-day lifetime unchanged). The raw
secret is not yet surfaced anywhere (no email/UI wiring — deferred to
8J-C3) — this phase is the read boundary only, exactly as scoped.

New `GET /requests/quote/{ref}?secret=...` route (public, no nonce).
`QuoteViewAccess::resolve()` is the pure resolver (no transient/REST calls,
so contracts exercise it directly, mirroring `RequestSchema::validate()`'s
own separation from its WP-REST caller): malformed ref, no/wrong secret,
missing/expired quote, and a legacy snapshot with no stored hash all return
one identical `['ok' => false]`; the controller renders one generic 404 for
all of them. Verification uses `hash_equals()` (constant-time). The
returned quote is an explicit 8-field allow-list (quote_ref, type, contact,
company, email, phone, submitted, items) — never the raw payload, never the
hash. `RequestSchema::QUOTE_REF_PATTERN` extracted as a shared constant so
the read boundary reuses the exact reference shape rather than a second
regex literal.

Files: `RequestsController.php` (new route + `getQuote()`, secret
generation wired into `submitRequest()`), `RequestSchema.php`
(`QUOTE_REF_PATTERN` constant), `QuoteViewSecret.php` (new),
`QuoteViewAccess.php` (new), `tests/quote-view-access-boundary.php` (new —
generation/hash sanity, valid access, wrong secret, no-secret,
missing/expired, malformed ref, legacy-no-hash, non-string-hash,
non-array-payload), `docs/code-map/quote-builder.md`.

Tests/checks (all passed): the new contract plus every existing
Requests-module PHP test; `contract:quote-cart-addon`,
`contract:tier-addon-flow`, `contract:tier-edition-switch`,
`contract:request-flow-family-tier-parity`; full sweep of all 50
`npm run contract:*`; `npx tsc --noEmit`; `npm run build`;
`npm run docs:check`.

No changes to email content, customer UI, cart/PDF, notification
arithmetic, quote-ref format, CRM storage, or transient expiry.

Unresolved: none for this scope. 8J-C2/8J-C3 remain unauthorized.

## Later — Not Authorized Yet
- **8J-C2:** customer quote-view route/page reusing the accepted proposal rendering and Print / Save as PDF from the stored snapshot.
- **8J-C3:** add the secure `View / Print Quote` link to the customer email, then perform one combined live validation of email + reload + print. The earlier standalone live-email validation is deferred into this end-to-end validation so we test the final customer journey once.

## Next Work — CRM Station
After 8J closes: start small with CRM Station + **email management only**. Quote management, promotions and subscriptions come later as separate capabilities with proper durable CRM-owned storage. The 7-day quote transient is not future CRM durable storage.
