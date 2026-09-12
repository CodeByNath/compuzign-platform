# Cart Initial Payment Parity

## Status
- **CLOSED**
- Auditor verdict: **Proceed**.
- Production `main`: `36ba345d920fff59adcd38bafc85d91e2bc3dbc6`.
- Shipped tree: `0e69543dd3afba44ca1436bd196efa9f00e99e95`.
- Deploy run `34671412846`: **success**.

## Closure
The stream-aware totals trigger is corrected from `> 1` to `> 0` authoritative `legPaymentSummaries` across Cart, Review & Finalise, proposal/PDF/Quote View, and admin/customer email. Total Commitment was already correct and remains unchanged.

Nath live-validated the Initial Payment behavior and passed this work. Existing payment helpers, Contract Value populations, ongoing `Until Cancelled`, quote identity, pricing/resolvers and legacy no-summary fallback remain unchanged.

This work item is complete. Any later UI refinement is separate work.
