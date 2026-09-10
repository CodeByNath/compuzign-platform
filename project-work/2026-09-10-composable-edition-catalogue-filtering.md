# Composable Edition Catalogue Filtering

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `f9ca5b187c70ef8e4daf2d863e985e2fe540d545`.
- Approved candidate: `review/composable-edition-catalogue-projection-v2` @ `de4ad6fa906741ba1d561d29c2e74bda6c539fba`.
- Candidate tree: `9066f60cdc92483308c6082b72dcaa8a4ab70e55`.
- Independent GitHub compare: **1 ahead / 0 behind**, merge base exact production `f9ca5b18`.

## Final audit
The candidate now matches the required identity model and the accepted final tree. Composable Edition catalogue resolution is scoped by the Edition's own `rate_sheet_id` plus that Rate Sheet's selected row identities. A bound Edition owns its catalogue even when it selects zero rows; only an Edition with no Rate Sheet binding inherits the Default occupant's already-resolved catalogue.

The same underlying inclusion may safely exist in multiple Rate Sheets because projection and Bundle lookup are performed against the exact owning Rate Sheet. The regression fixture proves the same `item_id` resolves different price, label and Bundle identity on two Rate Sheets without cross-sheet mixing.

The frontend no longer re-derives inheritance from `inclusions_override.length`; when an Edition is active it consumes that Edition's server-published catalogue directly. Edition cue identity, CZTE identity, preview `edition_id`, server pricing/resolver authority, `customer_policy` inheritance, Upgrade auto-sync, Cart, Add-ons and normal Tier/Edition behavior remain unchanged.

## Validation accepted
Claude reports the clean candidate is byte-identical to the previously accepted corrected tree. Focused projection test, TypeScript, build, docs, relevant contracts and regressions are green. The remaining PHP-suite failures and `composable-quote-cart-loop` failure are unchanged from clean production `main` and are out of scope.

## Claude — next action
Push **exactly `de4ad6fa906741ba1d561d29c2e74bda6c539fba`** to `main` by fast-forward only. Do not amend or add changes.

After push:
1. record resulting `main` SHA and confirm tree `9066f60cdc92483308c6082b72dcaa8a4ab70e55`;
2. record `Deploy to Hostinger` run id + conclusion;
3. confirm the topic branch is an ancestor of `main`, then delete it local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Required live validation
Use a Family whose composable Default and Edition Rate Sheets differ. Switching cue must switch catalogue rows and metadata. Verify one inclusion shared across two Rate Sheets keeps each sheet's own price/Bundle identity. A bound Edition with zero selected rows must show an empty catalogue, not Default rows.

## Must preserve
Real Edition/CZTE identity; Rate Sheet/row identity; Bundle scoping; server preview/pricing authority; policy inheritance; Upgrade auto-sync; Cart; Add-ons; normal focused shell.

## Must not substitute
No label/index matching, global item-name matching, client-side filters, duplicated catalogues, derived-row persistence, or Default fallback for a bound Edition.
