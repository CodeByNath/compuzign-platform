# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — final Phase 2+3+4+5 candidate accepted**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`.
- Approved candidate: `review/upgrade-your-build-final` @ `f2d27ae06b73c4b934a8596510bc1c4c5b2c0f60`.
- Independent compare confirms candidate is exactly one commit ahead of current `main`, merge-base = current `main`, no superseded candidate ancestry.

## Accepted implementation
- Shared catalogue eligibility gates the Upgrade step.
- Primary Tier/Edition is already in quote before the gate.
- Pending gate hides normal Recommendations/Cart presentation only; underlying `items` stay unchanged.
- **Maybe next time** resumes the existing Recommendations-if-present, otherwise Cart path.
- **Browse Catalogue** mounts the existing `ComposableOfferBrowser`; existing filters, paging, featured/default selection, quantity, preview, and auto-sync remain authoritative.
- Right side is a scoped reuse of the real Cart presentation: `QuoteItemPricePresentation` + `QuoteTotalsPresentation` over primary + composable lines only.
- Upgrade inclusion rows reuse `disclosureRowsForFamilyTierItem(composableItem)`; Bundle-child hierarchy is retained and quantity is shown only when authoritative.
- **Add to Quote** is stage-exit only; no quote mutation/recommit/rebuild.
- Final CSS uses mobile-first column stacking and switches to catalogue-left / summary-right at the same `1024px` breakpoint used by the real Cost Builder body.

## Validation accepted
Claude reports clean `tsc`, focused Upgrade/composable/payment/package-builder contracts, and clean Vite build. Matrix was source-traced for eligible/no-eligible catalogue, add-on/no-add-on, Browse/auto-sync/exit, bypass, family switch, pre/post first composable sync, multi-stream Cart presentation, and mobile stacking. Live visual validation remains for after deployment.

## Claude — next action
Fast-forward/push **only** the approved candidate `f2d27ae06b73c4b934a8596510bc1c4c5b2c0f60` to `main` if `main` is still exactly `5c7eb0621c1c3610b6e970826a294065e7bdb89a`. If `main` moved, stop and report instead of merging/rebasing automatically.

After push, record exact new `main` SHA and GitHub Actions/deployment result here. Set **AWAITING LIVE VALIDATION** after successful deployment. Nath will perform the customer browser validation. Do not start new work until this item is closed or explicitly deferred.