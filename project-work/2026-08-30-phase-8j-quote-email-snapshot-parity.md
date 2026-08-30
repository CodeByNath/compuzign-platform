# Phase 8J — Submitted Quote / Email Parity

## Status
- `AWAITING CHATGPT REVIEW` — 8J-C2 correction round pushed; item 3 stopped with a proposal (see below), not implemented.
- 8J-A accepted/deployed at `main@f152134e...`; 8J-B accepted/deployed at `main@c8a0f2b...`.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry**. Submitted snapshot is authoritative; never rebuild from current catalog/pricing state. Target journey: customer email -> secure quote view -> stored submitted snapshot -> accepted proposal / Print / Save as PDF. No second PDF renderer.

WordPress is runtime/host/storage only. CompuZign owns the public quote-view behavior and identity.

## Accepted Review Chain
8J-C1 accepted at `b122eb777cd8517324212a29fba7ea692ca984b9`; do not deploy alone. C2 candidate `9eaa6f326f4fd5e6058b1a8d76d2bbaa793eabc7` has correct fragment -> header transport, stored-snapshot read, generic failure and proposal/print reuse, but needs the corrections below.

## Claude Report — C2 Correction Round

Branch: `phase-8j-c1-quote-view-boundary`, head `da3fc0cf87eb0f4d9ae439012a9daa320e248ad2`. Not on `main`.

**Item 1 (stable entrypoint) — done.** Replaced the `[compuzign_quote_view]` shortcode (needed a manually-authored Page) with `RequestsModule::QUOTE_VIEW_PATH` (`/compuzign-quote-view/`) intercepted via `template_redirect` — no rewrite-rule flush, no virtual post, no WP page dependency. Outputs a minimal standalone document (no theme header/footer — the proposal already renders its own CompuZign header). **URL contract for C3:** `RequestsModule::quoteViewUrl($quoteRef)`; the view secret is never part of it (fragment-only, client-side). Routing decision extracted into a pure `matchesQuoteViewPath()` predicate for testing (the real method calls `exit()`).

**Item 2 (legacy snapshot parity) — done.** `QuoteCartFlow.tsx`'s new `withSubmissionDescriptions()` captures the live catalog's Service short description / recommended-Bundle description onto the *outgoing submission payload only* (never mutates the live cart) at the one point item + catalog are both available. `RequestSchema` sanitises/stores `serviceDescription`/`bundleDescription`. `QuoteProposalPreview` prefers the stored value when present, else the exact same live lookup as before — interactive-flow behavior is byte-identical (the field is always absent until a request is actually submitted). Family items untouched; no Family commercial/pricing semantics touched.

**Item 3 (Request Platform ID) — stopped per instruction, proposal only, not implemented.** Independently grepped `PlatformIdentifierPolicy::PREFIXES` directly: confirms no `request`/`quote` entry exists. Proposal for approval:
- New entry: `const REQUEST = 'request'`; prefix `CZR` (no collision — no existing prefix starts with `R` after `CZ`; format `CZR` + 5-char suffix from the standard alphabet, per the anchored-full-string rule).
- Native reference: `quote_ref` (already globally unique, assigned at mint time, before any admin promotion to a durable `cz_request` post) — rung 3, independent atom, since CRM Station and future work need to address a Request on its own.
- Scope if approved: mint on new submission only (`RequestsController::submitRequest()`), bind/persist via `PlatformIdentifierStation`, project into admin/CRM views later. No existing-record backfill in 8J.
Not implemented pending explicit sign-off on the prefix/native-reference choice above.

Files: `RequestsModule.php`, `RequestSchema.php`, `types.ts`, `QuoteCartFlow.tsx`, `QuoteProposalPreview.tsx`, plus new `tests/quote-view-entrypoint.php`, `tests/request-schema-legacy-snapshot-description.php`, `scripts/quote-view-legacy-description-contract.ts`.

Tests/checks (all passed): the 3 new contracts, every existing Requests-module PHP test, the 4 other focused npm contracts, full sweep of all 53 `npm run contract:*`, `tsc`, `build`, `docs:check`.

C3 remains unauthorized.

## Next Work — CRM Station
After 8J closes, plan CRM properly. First handoff phase stays small: Station list/view for requests with Pending / Approved / Cancelled, client contact and first-email/work handling. Broader CRM comes later; the 7-day transient is not durable CRM storage.
