# Composable Edition Catalogue Filtering

## Status
- **CLOSED**
- Auditor verdict: **Proceed**.
- Production `main`: `de4ad6fa906741ba1d561d29c2e74bda6c539fba`.
- Production tree: `9066f60cdc92483308c6082b72dcaa8a4ab70e55`.
- Deploy: `Deploy to Hostinger` run `34436202558`, attempt 1, **success**.
- Topic branch removed; only `main` and `Project-work-instructions` remain.

## Accepted result
Composable Edition catalogue resolution now follows the required identity boundary: an Edition with its own `rate_sheet_id` resolves only that Rate Sheet's selected rows; a bound Edition with zero selected rows publishes `[]`; only an Edition with no binding inherits Default. The same inclusion may exist in multiple Rate Sheets without mixing because projector and Bundle lookup are scoped to the owning Rate Sheet.

The browser consumes the active Edition's server-published catalogue directly; it no longer falls back to Default based on `inclusions_override.length`. Edition identity, preview `edition_id`, server pricing, policy inheritance, Upgrade auto-sync, Cart, Add-ons and normal Tier/Edition behavior are preserved.

## Validation
Static/behavioral coverage proved distinct Default/Edition Rate Sheets, Edition-only policy joins, same-`item_id` cross-sheet isolation, Bundle identity scoping, bound-empty behavior, metadata survival and normal-Tier scope containment. TypeScript/build/docs/relevant contracts/regressions were accepted; known unrelated baseline failures were unchanged.

Nath's live screenshots on 2026-09-10 confirm the customer defect is fixed: switching between `Default` and `Subscriptions` changes the actual Upgrade catalogue rows instead of showing the same Default catalogue. This satisfies the reported live failure that opened this work. The cross-sheet and bound-empty edge cases remain contract-covered and were not contradicted by live behavior.

## Closure
No further source action belongs to this file. The requested heading/hover presentation refinements are a separate UI work item and must not reopen this accepted projection architecture.
