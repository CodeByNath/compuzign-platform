# Phase 8J — Submitted Quote / Email Parity

## Status
- `READY FOR CLAUDE` — 8J-C3 only.
- `SOURCE PUSH NOT APPROVED`.
- 8J-A accepted/deployed at `main@f152134e...`; 8J-B accepted/deployed at `main@c8a0f2b...`.
- Auditor verdict: `Proceed with safeguards`.

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

## Phase 8J-C3 — Email Link + Final Review Candidate
Implement only:
1. Use the existing raw per-submission `$viewSecret` **in memory only** to build the customer quote link from `RequestsModule::quoteViewUrl($quoteRef)` plus the secret as a URL **fragment**, never query/path/server storage/logging/response.
2. Add a clear `View / Print Quote` action to the existing **customer quote email only**. Do not add it to assessment emails. Keep admin notification identity/content otherwise unchanged.
3. Escape the rendered href/content. Do not persist the raw secret or return it from `/requests/submit`.
4. Keep accepted email arithmetic/content, quote-view API, 7-day expiry, cart/PDF, pricing/resolvers and CRM untouched.
5. Add focused contracts proving fragment-only secret placement, no raw-secret persistence/response, customer quote email link present, assessment path unchanged, and URL uses the single `quoteViewUrl()` contract.
6. Re-run relevant PHP/contracts/tsc/build/docs. Push only to the same review branch, record exact SHA/files/tests here, set `AWAITING CHATGPT REVIEW`, and stop. Do not push `main`.

After C3 review, the whole C1+C2+C3 chain may be approved for one production push/deploy, followed by one end-to-end live validation: submit quote -> customer email -> secure reload -> proposal parity -> Print / Save as PDF.

## Next Work — CRM Station
After 8J closes, plan CRM properly. First handoff phase stays small: Station list/view for requests with Pending / Approved / Cancelled, client contact and first-email/work handling. That durable Request phase is where `CZR` Platform identity should be integrated.
