# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW**
- Production remains `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy `33945492532` live.
- Review head `2e49b8bf` on `review/upgrade-journey-finalisation` is **NOT approved for push**.

## Claude's report

### Blocking finding fixed: raw commercial identifiers removed
`QuotedBreakdownComponent.source` and `QuotedBreakdownInclusion.id` are now gone from the type entirely (`paymentSummary.ts`), not merely stripped at one boundary — `buildQuotedCommercialBreakdown()`/`mapBreakdownInclusion()` (`PricingTiers.tsx`) never set them, so the client never sends them, `RequestSchema::sanitizeCommercialBreakdown()`/`sanitizeCommercialBreakdownInclusions()` never persist them (allow-list no longer contains either field; `label`, not `id`, is now the inclusion validity gate), and `restArgs()`'s REST schema matches. `NotificationTemplates.php`'s email renderer needed no change — it never read either field.

### Occurrence keying (requirement #4)
`disclosureRowsForFamilyTierItem()` (`InclusionDisclosure.tsx`) now derives `sectionKey` purely from snapshot position — `${periodIndex}:${componentIndex}` — and inclusion row keys from row index, never `source`/`id`. Two components sharing the same Period+cadence still get distinct sections and the `(charge N/M)` disambiguation, unaffected since that logic never depended on `source`.

### getQuote() verified (requirement #7)
Read `RequestsController::getQuote()` → `QuoteViewAccess::resolve()`: `RETURNED_FIELDS` includes `items` and passes it through **verbatim**, no re-resolution, no live catalog access. Since the stored `commercialBreakdown` never contains `source`/`id` after the fix above, nothing further was needed here — added a round-trip assertion in `quote-view-access-boundary.php` proving it explicitly rather than only by inference.

### Generated-output hygiene
Removed the two now-orphaned intermediate `QuoteProposalPreview-*.js` chunks this branch's own prior two commits introduced (`D2uMjkHC.js`, `DJpwzeCJ.js`) — both superseded by this round's rebuild. Only `QuoteProposalPreview-DNBsfHLO.js` (the currently referenced hash in `cost-builder.js`/`admin-station.js`) remains.

### Validation
- `request-schema-family-quote-snapshot.php`: raw fixture now sends `source`/`id` (simulating an unmodified/malicious client) and asserts neither survives sanitization; added a two-same-Period/same-cadence-component fixture proving distinct, ordered sanitized output with no `source` to key by.
- `notification-templates-family-quote-parity.php`: fixtures updated to the real post-fix shape (no `source`/`id`); added assertions that rendered admin/customer email never contains the Leg source identifiers.
- `composable-quote-cart-contract.ts`: finds components by inclusion label instead of `source`; asserts `source`/`id` are absent from the builder's own output.
- `quote-view-access-boundary.php`: new round-trip assertion for a `commercialBreakdown` item shape through `resolve()`.
- Full `tests/*.php` suite: same 5 pre-existing unrelated failures, plus the still-expected reappearance of the admin/customer email-label regression in `notification-templates-composable-quote-parity.php` (`d3eb4dc0` remains deliberately excluded from this review head).
- Full 85-script `contract:*`/`regression:*` sweep: same 7 pre-existing unrelated failures (unchanged from last round).
- `tsc --noEmit` clean, `vite build` clean.

## Not independently verifiable without a live browser/real mail client
Same disclosure as prior rounds — visual rendering, email-client display, and PDF pagination remain unverified beyond fixture/DOM-string assertions.

Review the exact SHA `2e49b8bf` on `review/upgrade-journey-finalisation` (parents `8eb2467b` → `fcd5e0f6` → `main@93ac03ec`) against the blocking finding and acceptance criteria above.
