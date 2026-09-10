# Composable Edition Catalogue Filtering

## Status
- **AWAITING CHATGPT REVIEW**
- Implementation round complete on `review/composable-edition-catalogue-projection@e82238bd` (from `main@f9ca5b18`). `main` NOT pushed.
- Prior auditor verdict: **Proceed with safeguards**.
- Production `main`: `f9ca5b187c70ef8e4daf2d863e985e2fe540d545` (unchanged).
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


## Claude implementation round — 2026-09-10

Branch `review/composable-edition-catalogue-projection`, one commit
`e82238bd`, parent `main@f9ca5b187c70ef8e4daf2d863e985e2fe540d545`.
Paths under `wp-content/plugins/compuzign-platform/` unless stated.

### Changed files
| File | Change |
| --- | --- |
| `src/Modules/SurfacePackages/Repositories/PackageRepository.php` | New private `projectCustomerInclusionRows()` — the occupant's own Bundle/provenance decoration, extracted verbatim from `compileOccupantSlotForCostBuilder()` so Editions reuse it rather than a parallel rule. Per-Edition block now also resolves each active Edition's browse rows. New `bool $isComposable = false` parameter; the composable call site passes `true`. |
| `resources/ts/components/package-builder/ComposableOfferBrowser.tsx` | `resolveComposableEligibleRows()` inclusion source is `edition ? edition.inclusions_override : offer.inclusions` — the client-side `length > 0` inherit fallback is gone. |
| `scripts/composable-offer-eligibility-contract.ts` | Case 8 rewritten to the new rule; new cases 9-11. |
| `tests/composable-edition-catalogue-projection.php` | New behavioral test through the real projection pipeline. |
| `docs/code-map/tier-composable-occupant.md` | "Dedicated (not reused)" gains the per-Edition catalogue responsibility. Placed here, not in the customer-UX map, which is already at the 600-prose-word cap. |
| `dist/js/cost-builder.js` | Rebuilt. |

### What the fix does (against the numbered instructions)
1. Each active Edition's rows are resolved through the same
   `PackageManagerSchema::projectTierRateSheetWith()` call the occupant uses,
   against that Edition's own `rate_sheet_id`/`rate_sheet_items`/`contact`,
   inside the existing per-Edition block that already resolved its
   price/`commercial_legs`/`headline_leg_id`. No second pricing engine, no new
   endpoint, no persisted field.
2. Decoration is literally the same function for both
   (`projectCustomerInclusionRows()`): `id`/`label`/`quantity`/`unit_price`/
   `line_total`/`categories`/`service`, plus `bundle_id`/`includes` for
   Bundle-backed rows.
3. An Edition with no Rate Sheet binding of its own publishes the occupant's
   already-resolved rows.
4. Preview/resolver logic, `edition_id` request contract, Edition `id`/CZTE
   identity, `customer_policy` semantics and the cue wiring are untouched. No
   type changes were needed.
5-6. Coverage and Code Map below.
7. `review/*` pushed, `main` untouched.

### One judgment call for the auditor
The instruction says "Edition has its own valid Rate Sheet binding -> project
that Edition's rows". Implemented as **`rate_sheet_id` non-empty AND
`rate_sheet_items` non-empty**. An Edition bound to a sheet but selecting no
rows on it has nothing to price either (`projectEditionPrices()` gives it no
price), so publishing an empty catalogue for it would blank the tab rather
than describe anything real; it inherits instead. Case `3b` locks this. Say so
if the intended rule is binding-alone.

### Frontend inherit rule removed deliberately
Server-side inheritance (item 3) makes the client's own
`inclusions_override.length > 0 ? … : offer.inclusions` a second copy of the
same rule — and the copy is what would keep the defect alive for an Edition
whose own catalogue is legitimately empty: it would re-show Default's rows
under that Edition's tab. Default (`editionId === null`) still reads
`offer.inclusions`, unchanged, as do the coarse no-`editionId` eligibility
callers (Recommendations CTA gate, Cart footer route).

### Tests
`tests/composable-edition-catalogue-projection.php` (new, 6 groups) drives the
real `PackageFamilyPricingBuilder` + `PackageRepository` over a fixture with
two Rate Sheets:
- 1. Default publishes `hosting,support`; the Edition bound to its own sheet
  publishes `gpu,residency` — genuinely different row sets;
- 2. that Edition's own policy items (`gpu`, `residency`, absent from Default)
  all have matching published rows — the join is complete, where before every
  one of them was dropped;
- 3. an Edition with no binding, and one bound with no selections, both
  inherit the occupant's resolved rows verbatim;
- 4. Edition rows carry the full browse shape — `array_keys()` equality
  against an occupant row, real label/price, Bundle `bundle_id`/`includes`;
- 5. per-Edition `price` (575.0 from its own selections), `commercial_legs`,
  `headline_leg_id`, `edition_platform_id` unchanged;
- 6. a NORMAL Tier's Edition still publishes the previous raw
  `inclusions_override` (`[]`) while keeping its own price — the
  composable-only narrowing holds.

**Verified failing before the fix**: run against `main@f9ca5b18`'s
`PackageRepository.php` it fails at `1c` ("that Edition publishes ITS OWN Rate
Sheet rows, not Default's — got ") — i.e. the empty catalogue this repairs.

`scripts/composable-offer-eligibility-contract.ts` — case 8 now asserts an
empty published catalogue offers nothing; 9 an inheriting Edition resolves the
occupant's rows through its own published catalogue; 10 an Edition-only policy
item joins its own Edition-only row with its own metadata; 11 switching the
cue to an Edition and back to Default switches catalogue both ways, and the
no-`editionId` caller is unaffected.

### Check results
- `npx tsc --noEmit`: clean.
- `npm run build`: success (only `dist/js/cost-builder.js` changed).
- `node scripts/docs-check.mjs`: passed — 117 Markdown files, 46 Code Maps.
- Contracts: `composable-offer-eligibility`, `composable-edition-resolution`,
  `composable-offer-choice`, `composable-quote-cart`, `manage-build`,
  `upgrade-build-footer`, `composable-recommendations-cta`,
  `package-builder-customer-tabs`, `composable-live-correction` — all PASS.
- Regressions: `quoted-single-tier-dismissible`,
  `family-tier-membership-boundary` — PASS.
- Full PHP suite (`tests/*.php`): 80 pass, 7 fail — all 7 fail identically on
  clean `main@f9ca5b18` (route-baseline drift; missing WP function stubs):
  `notification-templates-composable-quote-parity`,
  `platform-identifier-station`, `quote-view-email-link`,
  `quote-view-http-boundary`, `service-route-baseline`,
  `tier-capability-invariants`, `tier-occupant-first-save`.
- `regression:composable-quote-cart-loop` fails, byte-identical output on
  clean `main@f9ca5b18` and with this change (diffed) — pre-existing, not
  caused here.

### Unresolved risks
- The binding-alone vs binding-plus-selections judgment above.
- No live/admin data was ever inspected in this or the audit round; the
  finding and fix are proven against the real pipeline over a fixture, not
  against the failing Family's own stored declarations. If that Family's
  Editions turn out to author their catalogues some other way, this repairs
  the projection but may not be the whole customer-visible story.
- Editions whose own Rate Sheet rows resolve to a *subset* of Default's will
  now show that subset where they previously showed all of Default's rows —
  correct per the authoritative rule, but it is a visible content change on
  any Family already configured that way.

### Deployment state
Nothing deployed. `origin/main` remains `f9ca5b18`; only
`review/composable-edition-catalogue-projection` and this branch were pushed.
Live validation per the section above remains the auditor's.
