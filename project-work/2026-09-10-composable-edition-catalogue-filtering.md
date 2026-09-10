# Composable Edition Catalogue Filtering

## Status
- **AWAITING CHATGPT REVIEW**
- Correction round complete.
- Prior auditor verdict: **Proceed with safeguards**.
- Production `main`: `f9ca5b187c70ef8e4daf2d863e985e2fe540d545` (unchanged, not pushed).
- Review branch: `review/composable-edition-catalogue-projection` @ `65e242d7`, 2 ahead / 0 behind, merge base `f9ca5b18`.
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


## Claude correction round — 2026-09-10

`review/composable-edition-catalogue-projection@65e242d7` (on top of
`e82238bd`, parent `main@f9ca5b18`). `main` not pushed.

### 1-2. Binding alone is the boundary
`PackageRepository::compileOccupantSlotForCostBuilder()`:

```
-  if ($editionRateSheetId === '' || $editionSelections === []) {   // inherit
+  if ($editionRateSheetId === '') {                                // inherit
```

The Edition's own `rate_sheet_items` now go to `projectTierRateSheetWith()`
whatever they are, so a bound Edition with zero selections projects `[]`. The
comment block records the rule as the auditor stated it: Rate Sheet identity
plus that sheet's own selected row identities are the boundary, the same
scoping the Bundle lookup already relies on, so a bound Edition can never leak
back into another declaration's catalogue.

### 3. Test updated
`tests/composable-edition-catalogue-projection.php` case `3b` inverted:
`ed_bound_no_rows` (bound to `rs_edition`, selecting nothing) must publish
`[]`. Case `3a` (no binding -> inherits the occupant's resolved rows) is
unchanged.

### 4. Cross-sheet isolation proof (new case 7)
The fixture's `rs_edition` now carries a row with the **same** `item_id`
(`hosting`) as `rs_default`, priced `130.0` vs `100.0`, labelled
`Hosting (Sovereign)` vs `Hosting`, Bundled `bnd_hosting_edition` vs
`bnd_hosting`. An Edition bound to `rs_edition` and selecting `hosting`
publishes:
- `7a` the same underlying inclusion id on both catalogues;
- `7b` `unit_price` `130.0` on the Edition, `100.0` on Default;
- `7c` each side's own label;
- `7d` each side's own `bundle_id` — Bundle identity scoped to the owning
  sheet, no cross-sheet mixing;
- `7e` the Edition's own `price` `130.0`.

### 5. Unchanged
Frontend fallback removal, `projectCustomerInclusionRows()` sharing, the
`$isComposable` narrowing, preview/resolver identity flow, `customer_policy`
inheritance, Bundle semantics and every unrelated path are exactly as in
`e82238bd`.

### Test discrimination
The behavioral test now fails against **both** prior states, from the same
fixture:
- `main@f9ca5b18` -> fails `1c` (Edition publishes an empty catalogue);
- `e82238bd` -> fails `3b` (bound-but-empty Edition inherits Default's rows).

### Check results at `65e242d7`
- `npx tsc --noEmit`: clean. `npm run build`: success.
- `node scripts/docs-check.mjs`: passed — 117 Markdown files, 46 Code Maps.
- Contracts: `composable-offer-eligibility`, `composable-edition-resolution`,
  `composable-offer-choice`, `composable-quote-cart`, `manage-build`,
  `upgrade-build-footer`, `composable-recommendations-cta`,
  `package-builder-customer-tabs`, `composable-live-correction` — all PASS.
- Regressions: `quoted-single-tier-dismissible`,
  `family-tier-membership-boundary` — PASS.
- Full PHP suite: 80 pass; the same 7 pre-existing failures as reported last
  round (identical on clean `main@f9ca5b18`).
- `regression:composable-quote-cart-loop` still fails byte-identically to
  clean `main@f9ca5b18` — pre-existing.

### Code Map
`docs/code-map/tier-composable-occupant.md` now states the corrected rule
(binding owns outright, publishes `[]` when it selects nothing; only an
unbound Edition inherits) plus the cross-sheet reasoning. Within the
600-prose-word cap.

### Unresolved risks
- Unchanged from last round: no live/admin data was inspected in any round;
  the fix is proven against the real pipeline over a fixture.
- New under the corrected rule: an Edition that binds a Rate Sheet but has not
  yet selected rows on it now shows an EMPTY catalogue where it previously
  showed Default's. That is the intended boundary, but it is the most likely
  visible change on a part-configured Family, so live validation should
  include one such Edition if any exists.
