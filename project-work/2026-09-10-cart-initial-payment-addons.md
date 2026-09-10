# Cart Initial Payment Must Include Add-ons

## Status
- **AWAITING LIVE VALIDATION — DEFERRED BY NATH**
- Auditor verdict: **Proceed**.
- Production `main`: `8406252c421f2adfb65eba5a54464b039f7f4550`.
- Deploy: `Deploy to Hostinger` run `34460597631`, success.
- Review branch deleted; origin returned to `main` + `Project-work-instructions`.

## Accepted correction
Initial Payment now consistently reads every surviving Family Tier line with valid `legPaymentSummaries`: primary + composable/Upgrade + add-on. Each item contributes only streams at its own earliest `startMonth`; same-cycle starts aggregate; later-starting Legs do not join the initial figure.

Total Contract Value remains on the existing primary/composable-only population. Cart, Review & Finalise, proposal/PDF/Quote View and PHP email were corrected consistently. Tests/contracts/build/docs passed apart from documented pre-existing baseline failures.

## Deferred live validation
Nath chose to proceed to two newly observed cart/customer defects before performing this work item's final live validation. This work is not rejected and no source correction is requested here.

When resumed, reproduce KAIROS add-on + replacement OMNIA primary. Add-on must remain. Cart, Review & Finalise, proposal/PDF and email must agree on Initial Payment and include the surviving add-on's own starting charge(s), excluding later-starting Legs. TCV must remain unchanged.
