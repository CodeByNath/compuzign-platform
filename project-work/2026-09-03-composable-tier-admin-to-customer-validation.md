# Upgrade journey — active correction track

## Status
- **AWAITING CLAUDE RESPONSE — commercial breakdown is structurally correct, but raw internal identifiers leak through the customer quote API**
- Production remains `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy `33945492532` live.
- Review head `8eb2467b1db20c9999198b602092519c87b1d720` is **NOT approved for push**.
- Auditor verdict: **Proceed with safeguards after one bounded correction**.

## Auditor review
Clean ancestry is now correct: `93ac03ec -> fcd5e0f6 -> 8eb2467b`; `d3eb4dc0` is excluded. The presentation corrections are accepted in principle:
- distinct component occurrence sections even for same Period + cadence;
- Qty / Unit price / Line total separated;
- per-component authoritative charge subtotal shown;
- no mixed-section grand inclusion total;
- legacy fallback preserved.

## Blocking finding: customer payload exposes internal commercial identity
`QuotedBreakdownComponent.source` is copied from `CommercialLegComponent.source` (CZTL/CZTEL or legacy `default`). `RequestSchema::sanitizeCommercialBreakdown()` persists that `source` unchanged into the quote snapshot. `RequestsController::getQuote()` returns the stored quote payload directly to the authenticated customer View/Print endpoint.

Therefore the Leg Platform ID is not merely an internal React key: it is delivered in customer-visible JSON. This conflicts with the explicit boundary for this round: **do not expose component/Leg IDs, Rate Sheet keys, post IDs or pricing plumbing to customers**.

The breakdown inclusion `id` is likewise presentation plumbing copied from the priced-item identifier and is not required for commercial meaning in the durable customer snapshot.

## Required bounded correction
1. Separate **live internal occurrence identity** from the **durable/customer snapshot**.
2. The persisted/submitted `commercialBreakdown` must contain only customer-safe commercial facts:
   - period from/to;
   - cadence;
   - component price/subtotal fact;
   - inclusion label, quantity, unit price, line total and Bundle display children.
3. Do not persist/return CZTL/CZTEL `source`, Rate Sheet item IDs/keys, or equivalent internal identifiers in `commercialBreakdown`.
4. For rendering/keying distinct component occurrences, use a presentation-only occurrence key derived from snapshot position (`period index + component index + row index`) or another non-domain display key. This key is not ownership/identity and must never be treated as one.
5. Same-Period/same-cadence components must remain visually distinct after removing source IDs.
6. Add a request-schema/customer-quote contract proving the sanitized stored/public breakdown contains no `source`, CZTL/CZTEL, Rate Sheet item key, or other internal identifier while still rendering the two-colliding-component fixture distinctly.
7. Verify `getQuote()`/Quote View consumes the sanitized safe snapshot only; no live catalog re-resolution.

## Generated-output hygiene
The two-commit head contains two newly generated `QuoteProposalPreview-*.js` assets. Before review, confirm only the currently referenced build artifact remains required; do not ship an orphaned intermediate build asset if it is no longer referenced.

## Acceptance
- Starter Cloud still shows Month 11 Yearly: Static IP Block, Qty 2, Unit price $40, Line total $80, subtotal $80/year.
- Same-period/same-cadence components remain separate.
- Cart, Total Commitment, Review/PDF, email and View/Print Quote agree.
- Customer quote JSON contains no Leg Platform IDs or Rate Sheet/item keys introduced by this snapshot.
- No pricing, identity authority, cart mutation, mail transport/idempotency, hydration or existing quote semantics change.

Return a clean review SHA and exact tests. Set **AWAITING CHATGPT REVIEW**. Do not push source to `main` until approved.