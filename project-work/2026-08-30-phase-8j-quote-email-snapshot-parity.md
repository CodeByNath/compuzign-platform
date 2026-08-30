# Phase 8J — Submitted Quote / Email Parity

## Status
- `READY FOR CLAUDE`
- Auditor verdict: `Proceed with safeguards`
- Production baseline to confirm before work: `main@6736d45d669f61c442527419269f16d7a711fbdd`.
- Phase 8I remains the reference for the accepted customer cart/review/proposal semantics; do not reopen that architecture.

## Decision
Keep the existing request lifecycle exactly as-is: `/requests/submit`, WordPress transient storage, `cz_quote_<ref>`, and the current **7-day expiry** remain unchanged. Do not introduce durable quote records in this phase.

Audit found the backend request boundary is lossy. The browser submits the final `CartItem[]`, but `RequestSchema::sanitizeItems()` rebuilds Family items using the older whitelist and drops newer quote snapshot fields used by the finished customer surfaces. `NotificationTemplates.php` therefore receives only the old headline `price`/`billingCycle` shape and renders the outdated email shown by Nath.

## Locked Architecture
`resolved customer selection -> FamilyTierQuoteItem snapshot -> server validation/sanitisation -> 7-day transient snapshot -> email`

Never re-resolve Rate Sheets, Tiers, Editions, Commercial Legs, Bundles, quantities, or pricing from live catalog data during submission/email. Existing quotes must represent what the customer selected at submission time.

## Phase 8J-A — Claude Implementation Only
Repair the **submission/snapshot contract only**. Do not change email presentation yet.

1. Audit current `FamilyTierQuoteItem` and preserve through `RequestSchema` the already-snapshotted fields required by the accepted final quote surfaces, including at minimum:
   - `tierEditionTitle`;
   - `legPaymentSummaries` with the exact fields already present on the TS type;
   - structured `inclusionItems`, including Bundle children and `quantity`.
2. Extend both `sanitizeItems()` and `restArgs()` consistently. Validate/sanitise every nested value explicitly; do not pass arbitrary client JSON through.
3. Preserve existing Family identity fields and legacy/non-Family behavior.
4. Do not alter arithmetic, resolver behavior, `FamilyTierAdapter.itemFor()`, quote reference generation, transient key/lifetime, controller mail flow, or any customer UI/PDF/email rendering.
5. Add a focused contract proving a representative Family quote survives the PHP boundary with Edition label, multi-stream Leg summaries, ordinary inclusion quantity, Bundle parent/children, Bundle-child quantity, add-on marker, and existing identity fields intact.
6. Include a negative assertion that unknown nested fields are not blindly retained.
7. Run the repository-required type/build checks plus focused/relevant request-flow contracts and one concise full contract sweep.
8. Commit and push to a non-production review branch, record exact SHA/files/tests here, set `AWAITING CHATGPT REVIEW`, and stop. **Do not push to `main`.**

## Later Phases — Not Authorized Yet
- **8J-B:** make admin/customer email consume the preserved snapshot using the same accepted commercial semantics: human labels, no raw CZ IDs, per-Leg streams, per-item finite Total, quote Contract Value/Ongoing, Initial Payment, add-on exclusion from primary TCV, Bundle children and quantities.
- **8J-C:** cross-boundary parity validation against cart/review/proposal/email using a fixed KAIROS + add-on + OMNIA multi-stream fixture.

Only 8J-A is authorized now.
