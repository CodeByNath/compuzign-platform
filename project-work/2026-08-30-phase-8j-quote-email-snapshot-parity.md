# Phase 8J — Submitted Quote / Email Parity

## Status
- `READY FOR CLAUDE — 8J-B correction`
- `SOURCE PUSH NOT APPROVED`
- 8J-A accepted/deployed at `main@f152134eac87c0cf84414ac6217794e7a4ca0102`.
- Auditor verdict: `Proceed with safeguards`.
- Phase 8I remains the accepted cart/review/proposal reference; do not reopen it.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry** unchanged.

`resolved customer selection -> FamilyTierQuoteItem snapshot -> server validation/sanitisation -> 7-day transient snapshot -> email`

Never re-resolve live pricing/catalog state. Family add-ons remain separate from the primary Family TCV/Initial Payment calculation exactly as the accepted quote surfaces do.

## Phase 8J-A — Accepted
`main@f152134eac87c0cf84414ac6217794e7a4ca0102`; Hostinger workflow #913 succeeded.

## 8J-B Candidate Review
Claude review branch `phase-8j-b-quote-email-parity`, candidate `c8a0f2b43b94631232fa5befcb2b1d679f295a9b`, is exactly one commit ahead of accepted main. Diff scope is four files: `NotificationTemplates.php`, new focused email parity test, updated package-family notification test, and quote-builder code map.

Most of the implementation is directionally correct: Family emails consume only the preserved snapshot, render separate Leg streams, Edition/inclusion/Bundle quantities, suppress raw IDs only for customer email while retaining them for admin, and preserve legacy fallback.

### Blocking correctness finding
`buildQuoteSections()` currently sets `$hasMultiStreamItem` by scanning **both** `familyMainItems` and `familyAddonItems`. That flag then:
- removes **all Family items** from the old general-cycle totals;
- emits `familyContractValueBlock()` and `familyInitialPaymentRow()` using **primary Family items only**.

This violates the locked add-on exclusion boundary. Example: a legacy/single-stream primary Family item plus a multi-stream Family add-on. The add-on alone flips the quote into enhanced Family-summary mode, the primary legacy Family line is removed from general totals, and `familyContractValueBlock()` sees no primary Leg summaries and reports `Contract Value: Ongoing`. The add-on has incorrectly changed the primary quote summary even though it must not enter primary TCV/Initial Payment.

## Claude — Correct 8J-B on Same Review Branch
1. Make the enhanced Family TCV/Initial-Payment mode eligibility derive from **primary `familyMainItems` only**. A Family add-on must never trigger, suppress, or alter the primary Family summary mode.
2. Keep each add-on's own snapshotted Leg streams/per-item Total rendering unchanged.
3. Preserve correct handling of mixed legacy/non-Family totals. Do not broadly hide Family headline totals merely because an add-on is multi-stream.
4. Add a focused regression fixture: primary Family item with no `legPaymentSummaries` (legacy/single-stream fallback) + Family add-on with multi-stream/ongoing summaries. Assert the add-on does **not** trigger `Contract Value: Ongoing`, does not remove/suppress the primary's legacy cycle total, and does not enter Initial Payment/primary TCV.
5. Retain the existing customer-ID suppression/admin-ID split and all other accepted 8J-B behavior.
6. Do not change RequestSchema, pricing/resolvers, snapshot construction, 7-day lifecycle, controller flow, cart/review/PDF, or catalog state.
7. Run focused email tests plus relevant existing contracts/checks. Commit/push the correction to the **same non-production review branch**, record new SHA/tests here, set `AWAITING CHATGPT REVIEW`, and stop. Do not push `main`.

## Phase 8J-C — Not Authorized
Cross-boundary/live validation follows only after corrected 8J-B source review and production approval.
