# Phase 8J — Submitted Quote / Email Parity

## Status
- `READY FOR CLAUDE` — 8J-C2 correction + surgical Request Platform ID check.
- `SOURCE PUSH NOT APPROVED`.
- 8J-A accepted/deployed at `main@f152134e...`; 8J-B accepted/deployed at `main@c8a0f2b...`.
- Auditor verdict: `Proceed with safeguards`.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry**. Submitted snapshot is authoritative; never rebuild from current catalog/pricing state. Target journey: customer email -> secure quote view -> stored submitted snapshot -> accepted proposal / Print / Save as PDF. No second PDF renderer.

WordPress is runtime/host/storage only. CompuZign owns the public quote-view behavior and identity.

## Accepted Review Chain
8J-C1 accepted at `b122eb777cd8517324212a29fba7ea692ca984b9`; do not deploy alone. C2 candidate `9eaa6f326f4fd5e6058b1a8d76d2bbaa793eabc7` has correct fragment -> header transport, stored-snapshot read, generic failure and proposal/print reuse, but needs the corrections below.

## Claude — C2 Correction Round
Keep the same review branch. Do not push `main`.

1. **Stable CompuZign public entrypoint.** Guarantee one stable deployed URL that mounts the quote-view app using the smallest existing runtime mechanism. No manual WordPress content/page dependency and no new WP-owned product model. Record the final URL contract for C3.

2. **Legacy proposal snapshot parity.** `services=[]` currently drops legacy Service short descriptions / recommended-Bundle descriptions that checkout proposal may show. Do not fetch live catalog data. Preserve only the minimum missing display fields in the submission/item snapshot, sanitize them through the existing request boundary, and have reload render them from stored data. Do not touch Family commercial/pricing semantics.

3. **Request Platform ID — surgical identity correction only.** Source audit confirms `PlatformIdentifierPolicy` is the sole prefix authority and currently has **no Request/Quote entity type or prefix**. The stored `cz_request` currently uses `quote_ref` + WP post ID only. Treat the durable business entity as **Request** (not a separate Quote identity per request type): Platform ID = permanent internal identity; `quote_ref` remains customer-facing reference; view secret remains access credential; WP post ID/transient key remain storage details.
   - First check current Platform Identifier docs/source for any already-approved Request entity type/prefix. **Do not coin a prefix downstream.**
   - If no approved prefix exists (current audit found none), stop implementation of this one identity sub-item and report the smallest proposed `REQUEST` policy entry/prefix for auditor/user approval. Do not widen this into CRM, migration/backfill, new routing, or persistence redesign.
   - If an approved prefix is found, integrate only new-request mint/bind/persist/projection through the existing `PlatformIdentifierStation`; no existing-record migration in 8J.

Add focused contracts for the public entrypoint and legacy snapshot parity; if Platform ID integration proceeds, add the minimal identity contract too. Re-run relevant PHP/contracts/tsc/build/docs. Update this file with exact head SHA/files/tests, set `AWAITING CHATGPT REVIEW`, and stop. C3 remains unauthorized.

## Next Work — CRM Station
After 8J closes, plan CRM properly. First handoff phase stays small: Station list/view for requests with Pending / Approved / Cancelled, client contact and first-email/work handling. Broader CRM comes later; the 7-day transient is not durable CRM storage.
