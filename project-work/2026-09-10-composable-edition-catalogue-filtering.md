# Composable Edition Catalogue Filtering

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `f9ca5b187c70ef8e4daf2d863e985e2fe540d545`.
- Scope: focused composable occupant, left-side Edition tabs and catalogue content only.
- **SOURCE PUSH NOT APPROVED.**

## Independent audit result
Claude's static trace is correct and independently confirmed in source.

The tab/identity path is already Edition-aware. `EditionCueSelector` stores the real Edition selector id; `ComposableOfferBrowser` resolves by that id and sends the same `edition_id` to preview. Backend `resolveComposableOfferSelection()` fails closed on unknown/inactive ids and, for a valid Edition, replaces the Default container with that Edition's own commercial declaration while inheriting only `customer_policy` when absent.

The defect is the public read/display projection. `compileOccupantSlotForCostBuilder()` resolves the Default occupant's Rate Sheet through `projectTierRateSheetWith()` and replaces `inclusions_override` with decorated resolved rows. But its per-Edition block currently recomputes only Edition price, Commercial Legs and headline pointer. `PackageSchema::publicTierEditionOptions()` therefore exposes raw stored `inclusions_override` for Editions; on the current Rate-Sheet-era authoring path that field is not the authoritative resolved inclusion source and is commonly empty. The browser then falls back to `offer.inclusions`, so Edition tabs show the Default catalogue.

This also explains why Edition policy items unique to an Edition Rate Sheet can disappear: the policy is joined against Default resolved inclusions and unmatched `item_id`s are dropped.

## Authoritative rule
For customer projection, an Edition with its own Rate Sheet binding is a full Edition commercial declaration. Its browse inclusions must therefore be resolved from **that Edition's own `rate_sheet_id` + `rate_sheet_items`**, using the same authoritative Rate Sheet projector and browse decoration as the Default occupant. `inclusions_override` must not be used as the authority for deciding whether a Rate-Sheet-era Edition has its own catalogue.

Inheritance rule for this fix:
- Edition has its own valid Rate Sheet binding -> project that Edition's rows;
- Edition has no own Rate Sheet binding -> inherit the Default occupant's already-resolved customer inclusion rows.

Do not change the existing `customer_policy` inherit-when-absent rule.

## Claude — implementation phase
Implement only this projection repair from current `main` on one topic branch.

1. In the existing per-Edition projection boundary, resolve each active Edition's browse inclusions through the same `projectTierRateSheetWith()` path used by the occupant, against the Edition's own Rate Sheet binding/selections.
2. Apply the same customer-safe decoration: id/label/quantity/unit_price/line_total/categories/service and Bundle display children where applicable.
3. If the Edition has no own Rate Sheet binding, publish the Default occupant's already-resolved inclusion rows as its inherited source.
4. Keep preview/resolver logic, Edition id/CZTE identity, policy semantics and frontend tab wiring unchanged unless a narrow type adjustment is required.
5. Add behavioral/contract coverage proving:
   - Default and Edition with distinct Rate Sheets publish distinct row ids;
   - Edition-specific policy joins its own unique rows instead of dropping them;
   - Edition without own Rate Sheet inherits Default resolved rows;
   - browse metadata survives on Edition rows;
   - switching cue changes catalogue and preview continues to receive the same Edition id.
6. Update affected Code Map only if current-state responsibility text changes.
7. Push review branch only, record SHA/diff/tests here, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
Server preview/pricing authority; real Edition identity; Admin-authored Rate Sheet selections and policy; legitimate policy inheritance; Bundle semantics; Upgrade auto-sync; Cart; Add-ons; normal Tier/Edition focused shell.

## Must not substitute
No client-side hardcoded filters, label/index matching, duplicated catalogues, persistence of derived inclusion rows merely to feed customer UI, or removal of Edition Rate Sheet ownership.

## Live validation after deployment
Use a Family with genuinely different Default/Edition Rate Sheet selections. Each cue must show that Edition's catalogue/metadata and Add/Remove preview must price the same Edition.
