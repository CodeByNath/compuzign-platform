# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING CHATGPT REVIEW` — 8J-C3 candidate pushed (final chain candidate).
- 8J-A accepted/deployed at `main@f152134e...`; 8J-B accepted/deployed at `main@c8a0f2b...`.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry**. Submitted snapshot is authoritative; never rebuild from current catalog/pricing state. Target journey: customer email -> secure quote view -> stored submitted snapshot -> accepted proposal / Print / Save as PDF. No second PDF renderer.

WordPress is runtime/host/storage only. CompuZign owns public quote-view behavior and identity.

## 8J-C1 — Accepted on Review Chain
Accepted at `b122eb777cd8517324212a29fba7ea692ca984b9`; do not deploy alone. Secret is 32-byte CSPRNG, only its SHA-256 hash is persisted, verification uses `hash_equals`, and transport is fragment -> `X-Quote-View-Secret` header with uniform non-disclosing failures.

## 8J-C2 — Accepted on Review Chain
Candidate correction head `da3fc0cf87eb0f4d9ae439012a9daa320e248ad2` is accepted. Independent compare confirms one correction commit on prior C2. The stable CompuZign-owned runtime entrypoint is `/compuzign-quote-view/` via `RequestsModule::quoteViewUrl()`, with no manually-authored WP Page dependency. Legacy Service/Bundle descriptions are now captured only into the outgoing submitted snapshot, sanitized, and reused by `QuoteProposalPreview`; Family commercial behavior is untouched. Reported focused PHP/contracts, all 53 npm contracts, `tsc`, build and docs checks passed.

## Request Platform ID — Deferred to CRM Durable-Record Phase
Claude correctly stopped because `PlatformIdentifierPolicy` has no Request entity/prefix. Deeper auditor review found a more important boundary: Platform IDs are permanent owner-backed identities with reservation/binding/tombstone semantics, while the current quote snapshot is an automatically expiring 7-day transient. Minting and binding `CZRxxxxx` to the transient now would leave a permanent bound identity after owner storage silently expires, unless we also redesign persistence/lifecycle — outside 8J and contrary to the narrow scope.

Therefore do **not** add Request Platform ID in 8J. Lock the proposal for the first durable CRM Request phase: entity `request`, proposed prefix `CZR`, native reference `quote_ref`, using the existing shared Platform Identifier Station when the durable Request record becomes authoritative. No separate Quote identity is needed. `quote_ref` remains customer reference; view secret remains authorization; WP IDs/transient keys remain storage details.

## Phase 8J-C3 — Claude Report

Branch: `phase-8j-c1-quote-view-boundary`, head `195896e0376c5b4988c4337f0ded769fb0c3bc09`. Not on `main`.

1. `RequestsController::submitRequest()` builds `$quoteViewLink = RequestsModule::quoteViewUrl($quoteRef) . '#' . $viewSecret` in a local variable, after `$payload` (without it) is already persisted — never added to `$payload`, never in the REST JSON response, never logged.
2. `NotificationTemplates::buildCustomerHtmlEmail()` gained an optional `$quoteViewLink` param, rendered (href + text both escaped via `esc_url()`/`esc_html()`) only on the `quote_cart` branch, right after the Reference Badge. The `free_it_assessment` branch ignores the parameter entirely — verified directly by passing a non-empty forced link into that branch and asserting it never appears. Admin email untouched (no link, no signature change).
3. Escaping confirmed above; no persistence/response leak confirmed by test below.
4. No changes to email arithmetic elsewhere, the quote-view read API, transient expiry, cart/PDF UI, pricing/resolvers, or CRM.
5. New `tests/quote-view-email-link.php` runs the real `submitRequest()` end to end (stubbed WP surface): stored transient never carries a raw `view_secret` key; REST response has only its 3 documented fields; customer email's link is fragment-only (`#`, never `?secret=`/`&secret=`) and its base exactly equals `RequestsModule::quoteViewUrl($quoteRef)`; admin email never carries the action; assessment customer email never carries it; the raw secret appears exactly once in the customer email body (no accidental duplication).

Tests/checks (all passed): the new test plus every existing Requests-module PHP test, the 7 other focused contracts, full sweep of all 53 `npm run contract:*`, `tsc`, `build` (no dist change — no frontend files touched), `docs:check`.

After this review, the whole C1+C2+C3 chain may be approved for one production push/deploy, followed by one end-to-end live validation: submit quote -> customer email -> secure reload -> proposal parity -> Print / Save as PDF.

## Next Work — CRM Station
After 8J closes, plan CRM properly. First handoff phase stays small: Station list/view for requests with Pending / Approved / Cancelled, client contact and first-email/work handling. That durable Request phase is where `CZR` Platform identity should be integrated.
