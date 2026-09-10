# Cart Bundle + Upgrade Refinements

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8406252c421f2adfb65eba5a54464b039f7f4550`.
- Prior Initial Payment live validation is explicitly deferred by Nath; no source correction belongs to that file now.

## Issue 1 — Bundle children in compact disclosures
Live screenshots show Cart quick view and Total Commitment disclosure render Bundle children as `Contact Us` and produce `Total $NaN`, while the established View Details renderer correctly shows Bundle children as `Included` / `Included` and totals only the priced Bundle parent.

Source confirms the compact path already carries `row.isChild`, but `InclusionDisclosurePanel` ignores it for Unit price / Line total and treats `undefined` line totals as priced because it checks only `!== null`. `formatPrice(undefined)` becomes `Contact Us`; reducing `undefined` produces `NaN`.

### Required correction
Use the already-established Bundle-child semantic in the shared compact disclosure:
- Bundle parent keeps its resolved Unit price / Line total.
- Bundle children render **Included** in Unit price and Line total.
- Bundle children never participate in the compact disclosure Total.
- Cart quick view and Total Commitment disclosure stay identical because both use the same shared component.
- Preserve genuine non-Bundle unresolved pricing behavior; do not globally map unknown values to `Included`.

## Issue 2 — Family Upgrade survives Tier swaps; suppress duplicate CTA
Current `replaceFamilyNormalQuoteItem()` still removes the composable line when `tierOccupantId` or `tierEditionPlatformId` changes. That is stale. Nath's rule is simpler: **Upgrade Your Build belongs to the Family, not the selected Tier/Edition.**

### Required correction
- Swapping primary Tier or Edition within the same Family must **preserve the existing composable/Upgrade cart line unchanged**.
- Do not reprice, rebuild, reattach or mutate that Upgrade snapshot when the Tier changes.
- The Upgrade line remains until the customer explicitly removes/replaces the Upgrade itself.
- If that Family already has a composable/Upgrade line in the cart, **do not show the Upgrade Your Build CTA in Recommendations**. No duplicate Browse Catalogue entry while the Upgrade is already quoted.
- Preserve the existing Manage-build path for an already-quoted Upgrade.

## Claude — implementation
From current production `main`, create one review branch for BOTH refinements.
1. Fix `InclusionDisclosurePanel` using existing `isChild` semantics; no new pricing source.
2. Fix `replaceFamilyNormalQuoteItem()` so primary Tier/Edition replacement does not delete composable lines for the same Family/Tier system.
3. Find the Recommendations CTA visibility derivation and gate it off when the current Family already has a composable line in cart; reuse existing quote-role/system-key helpers rather than label matching.
4. Add/extend focused regressions for both defects, including: Bundle parent $4,000 + child Included rows + total $4,000/no NaN; Tier A→Tier B and Edition A→Edition B preserve exact Upgrade snapshot; CTA absent when Upgrade exists and returns when Upgrade is explicitly removed.
5. Preserve existing add-on, cart ordering, Manage build, quote identity, pricing, and View Details behavior.
6. Run relevant cart/package-builder/composable/request contracts, TypeScript, build, docs. Push review branch only, record exact SHA/diff/tests here, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
Bundle parent pricing; View Details semantics; genuine unresolved non-Bundle pricing; exact Upgrade snapshot; cart ordering; add-ons; Manage build; Family/Tier identity; quote persistence; pricing/Rate Sheet authority.

## Must remove
`Contact Us`/`$NaN` for Bundle children in compact disclosures; automatic Upgrade deletion on same-Family Tier/Edition swap; duplicate Upgrade CTA when Upgrade already exists.

## Must not substitute
No global `undefined => Included`; no flat-price fabrication; no live Rate Sheet re-resolution; no Tier-attached Upgrade identity; no hidden orphan cleanup workaround; no label/string matching; no duplicate composable line; no route redesign.
