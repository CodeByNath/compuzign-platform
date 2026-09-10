# Composable Edition Catalogue Filtering

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `f9ca5b187c70ef8e4daf2d863e985e2fe540d545`.
- Review branch: `review/composable-edition-catalogue-projection` @ `e82238bd`, 1 ahead / 0 behind, merge base `f9ca5b18`.
- **SOURCE PUSH NOT APPROVED.**

## Audit result
Claude found the right boundary and the candidate is directionally correct. The Edition cue/identity path is already sound: real Edition selector id -> `ComposableOfferBrowser.activeEditionId` -> preview `edition_id` -> backend Edition container. The defect is the public browse projection: Default gets resolved/decorated Rate Sheet rows, while Editions previously exposed raw `inclusions_override`, causing the customer browser to fall back to Default rows.

The candidate correctly reuses the same Rate Sheet projector and one shared decoration helper for Default and composable Editions, preserving Bundle children, provenance metadata, server pricing authority, Edition identity, policy semantics and the existing preview contract.

## Required correction before approval
Nath clarified the architectural rule: **Rate Sheet identity + that Rate Sheet's selected row identities are the boundary.** The same underlying inclusion may legitimately appear in multiple Rate Sheets without mixing because resolution is always through the owning Rate Sheet and its row/selection references. This is already proven by the Bundle path, which scopes Bundle lookup to the exact Rate Sheet passed into the projector/decorator.

Therefore Claude's judgment call is resolved as follows:

- **Own `rate_sheet_id` present = this Edition owns its catalogue boundary.**
- Its `rate_sheet_items` may be non-empty or empty.
- If bound and selections are empty, publish an **empty Edition catalogue**; do **not** inherit Default rows.
- Inherit Default resolved rows only when the Edition has **no own Rate Sheet binding**.

Current candidate instead does:
`if ($editionRateSheetId === '' || $editionSelections === []) inherit Default`.
That second condition is wrong because it lets an explicitly bound Edition leak back into another declaration's catalogue.

## Claude — next action
On the same review branch:
1. Change inheritance to depend only on absence of Edition `rate_sheet_id`.
2. Bound + zero selections must project to `[]`.
3. Update the behavioral test: replace the current "bound with no selections inherits" expectation with "bound with no selections publishes empty catalogue".
4. Add/retain proof that two different Rate Sheets can reference the same underlying inclusion without cross-sheet mixing: each Edition must resolve the price/quantity/Bundle metadata from its own Rate Sheet context.
5. Keep frontend Edition fallback removal, shared projector/decorator helper, preview/resolver identity flow and all unrelated behavior unchanged.
6. Push corrected review head only, record SHA/tests here, set **AWAITING CHATGPT REVIEW**, stop.

## Must preserve
Real Edition/CZTE identity, Rate Sheet/row identity, Bundle semantics, Admin-authored selections/policy, server preview/pricing authority, legitimate no-binding inheritance, Upgrade auto-sync, Cart, Add-ons and normal Tier/Edition focused shell.

## Must not substitute
No client-side hardcoded filters, label/index matching, duplicated catalogues, derived-row persistence, global item-name matching, or Default fallback for an explicitly bound Edition.
