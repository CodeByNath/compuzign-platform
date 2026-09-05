# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW**
- Review branch: `review/upgrade-journey-finalisation` @ `bdfec37c27e9767fc174a3dac12e98c2a80fda47` — spelling-only correction commit on top of the previously-audited `b1bc63c1` (which stays on the branch, one clean commit ahead of production `main@6a03a18239cec8fa32ce13c5a3bf626293d6f0bd`). Pushed to origin. `main` untouched.

## Spelling correction applied
Every `Until Canceled` (single L) occurrence is now `Until Cancelled` (double L), including the ones the prior round left unchanged because they predated this flow:
- shared TS range helper (`commercialLegPresentation.ts`) and its PHP email mirror (`NotificationTemplates.php`);
- the four Contract Value non-finite fallback surfaces (`QuoteSummary.tsx`, `QuoteProposalPreview.tsx`, `OrderSummary.tsx`, `QuoteDetailsOverlay.tsx`);
- `PlanDetailsModal.tsx`'s own Charge Occurrences cell and Total Contract Value fallback (the earlier Phase 8h spelling this round supersedes, per the instruction to leave no split vocabulary);
- every affected assertion in `composable-quote-cart-contract.ts`, `plan-details-value-states-contract.ts`, and `notification-templates-family-quote-parity.php`.

Verified no other `Canceled`/`Cancelled` occurrence exists anywhere else in the codebase (repo-wide grep) — nothing was missed and nothing outside this list needed touching. No other behavior changed.

### Tests re-run (all pass)
`npx tsc --noEmit`; `contract:composable-quote-cart`, `contract:plan-details-value-states`, `contract:composable-live-correction`, `contract:request-flow-family-tier-parity`, `contract:quote-cart-addon`, `contract:package-family-request-flow`, `contract:package-family-cart`, `contract:composable-request-line`, `contract:money-format`, `contract:commercial-leg-inclusion-groups`, `contract:commercial-leg-extension-groups`; `php tests/notification-templates-family-quote-parity.php`; `npm run build` (dist rebuilt — old `QuoteProposalPreview-BWawJfqU.js` chunk from the superseded commit removed, replaced by the new content hash). Same pre-existing unrelated failures as before, unaffected by this commit: `contract:package-builder-flow`, `contract:admin-station-css`, `contract:platform-identity-schema`, `tests/notification-templates-composable-quote-parity.php`, `tests/quote-view-email-link.php`.

## Locked acceptance
1. Starting finite: `Through Month 10`; later `Month 11–23` unchanged.
2. Starting/open term and later open-end customer wording uses **Until Cancelled**; no customer-facing `Ongoing` in these term displays.
3. Fully finite Total Contract Value stays numeric exactly as today.
4. Any non-finite contributing stream -> Contract Value fallback **Until Cancelled**; Initial Payment stays numeric.
5. Finalise sidebar remains compact cart-style; PDF/email/View-Print remain detailed Period presentation.
6. No pricing, resolver, identity, persistence, snapshot, ordering, Bundle-total, mail transport/idempotency or legacy-fallback changes.

Do not push to `main` before review.