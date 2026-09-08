# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — composable occupant now owns its own Default/Edition selection path**
- Auditor verdict on the prior round: **Proceed with safeguards**.
- Production `main`: `af01ebb10a49ca66091b504eba54e8c21d597387`; deploy #976 succeeded but that visual-parity refinement is **not live-accepted** (this correction has not deployed).
- Review candidate: branch `review/upgrade-shell-visual-parity` (reused per the two-branch policy — same topic, correcting that round's own defect), commit `b3a6815d`, based on current `main` (`af01ebb1`). Not pushed to `main`.
- Second live issue (selected Tier card hiding / Add-on+Cart visibility) remains explicitly deferred until this focused-shell defect is corrected and accepted — untouched in this phase.

## Claude — correction implemented, awaiting review
Implemented end-to-end, source-first (inspected `PackageSchema::extractTierForCostBuilder()`/`publicTierEditionOptions()`, `PackageManagerSchema::resolveCommercialLegTimeline()`/`resolveCustomerComposableSelection()`, and `resolveEffectiveTierDisplay()`'s own Default/Edition inherit rules before editing):

- **Frontend cue**: `FamilyTierAdapter`'s Upgrade-browsing top cue now reads `family.pricing.composable_offer` + its own `edition_options[]` only — `family.pricing.tiers[selectedTierId]` is no longer read anywhere in that render branch. Selecting a destination calls only a new local `composableEditionId` setter, never `selectVariant()` — it can never navigate away from Upgrade browsing or touch `selectedTierId`/the primary quote. `composableEditionId` is seeded from the already-committed composable line's own `tierEditionPlatformId` at the two explicit transitions into `'browsing'` (Browse Catalogue click, Manage build re-entry), and reset on Family switch / gate exit.
- **ComposableOfferBrowser**: new `activeEditionId` prop drives `resolveComposableEligibleRows()`, the live preview request, `commitmentMonths`/Headline resolution, and `buildComposableFamilyTierQuoteItem()` — all now resolve from the ACTIVE composable Default or Edition container, never always Default. The committed quote item's `tierEditionPlatformId`/`tierEditionTitle` are now populated from the active Edition (previously hardcoded `null`), which is what lets Manage build rehydrate the cue onto the right Edition.
- **Backend**: `PackageRepository::resolveComposableOfferSelection()` takes an optional `$editionId` (wired through `POST /package-builder/composable-preview`'s new `edition_id` param) and resolves against that Edition's own `rate_sheet_id`/`rate_sheet_items`/inherited `customer_policy` — ACTIVE Editions only, structured `not_found` otherwise. Composable `edition_options[].inclusions_override` is now Rate-Sheet-resolved/priced/categorized (same shape the occupant's own Default already gets), scoped strictly to the composable slot — normal Tier Edition projection is untouched (locked by the existing `tier-edition-public-projection.php`, which still passes unmodified).
- **Contracts**: new `tests/composable-edition-selection.php` proves Default and a real Edition resolve genuinely different priced containers (different rate sheets), that an unknown/Disabled Edition id never resolves or falls back to Default, and that the primary Tier occupant is byte-identical before/after. Updated `upgrade-shell-visual-parity-contract.ts` (rewrote the properties 4–7 assertions to lock the corrected wiring instead of the rejected one), `manage-build-contract.ts`, `upgrade-your-build-gate-contract.ts`, and `composable-quote-cart-contract.ts` for the new call sites/dependency arrays.

All required validation passed: every PHP test/contract listed in both `CostBuilder/CLAUDE.md` and `SurfacePackages/CLAUDE.md` (one pre-existing, unrelated failure in `tier-capability-invariants.php` confirmed present on `main` before this change too), `npx tsc --noEmit` clean, `npm run build` succeeds, `npm run docs:check` passes. `tests/composable-edition-selection.php` registered into both modules' `CLAUDE.md` validation lists.

## Auditor finding — exact cause
The deployed visual-parity change wired the Upgrade cue to the WRONG domain object:
- `FamilyTierAdapter` reads `family.pricing.tiers[selectedTierId]`;
- derives active Edition from `selectedPrimaryItem.tierEditionPlatformId`;
- cue click calls normal-Tier `selectVariant(selectedTierId, editionId)`.

That is why Starter Cloud/its Editions load. This should have been rejected in review.

The authoritative Build Your Own source already exists separately: `family.pricing.composable_offer` is the compiled composable occupant and carries its own `edition_options[]`, including each Edition's commercial legs, inclusions and `customer_policy`. Backend storage likewise has dedicated `composable_occupant` + composable Edition CRUD/lifecycle.

Critical additional finding: the current customer preview path is still Default-only. `PackageRepository::resolveComposableOfferSelection()` always does `extractTierForCostBuilder($composableSlot)` and accepts only `(familyId, choice)`; `ComposableOfferBrowser` always uses `family.pricing.composable_offer`; `buildComposableFamilyTierQuoteItem()` hardcodes `tierEditionPlatformId: null` / `tierEditionTitle: null`. Therefore merely relabelling the cue or swapping its destination array is NOT a fix — it would display an Edition while still pricing/quoting the composable Default.

## Claude — one narrow correction phase
Implement the Build Your Own/composable occupant's **own real Default/Edition selection path** end-to-end. Source-first inspect the existing normal Tier Edition resolver/identity conventions and the composable Edition backend structures before editing.

### Must preserve
- same `EditionCueSelector` visual component and focused-shell styling;
- Upgrade gate/footer recovery/Manage build;
- primary Tier/Edition quote untouched;
- `ComposableOfferBrowser` selection/auto-sync and server-resolved pricing authority;
- Add to Quote remains stage-exit only.

### Must remove
- Upgrade cue dependence on `family.pricing.tiers[selectedTierId]`;
- Upgrade active Edition dependence on `selectedPrimaryItem.tierEditionPlatformId`;
- Upgrade cue calling primary `selectVariant(selectedTierId, ...)`.

### Required semantic result
- cue destinations/title come from `pricing.composable_offer` + its own `edition_options`;
- selecting composable Default/Edition makes the browser policy/inclusions, preview resolver, commercial legs/headline, and committed composable quote snapshot all resolve from THAT selected composable container;
- existing committed composable Edition identity/title rehydrates the cue on Manage build;
- no client pricing reconstruction and no mutation of the primary quote.

Use the existing customer Tier-Edition identity convention for the wire/quote snapshot after verifying it; do not invent label/index identity. If the current composable-preview endpoint requires a narrow optional composable-Edition identity parameter, extend that same endpoint/resolver rather than create a second preview/pricing engine.

Add contracts proving Default and composable Edition resolve different authoritative containers and that the primary Tier Edition is never read/mutated by the Upgrade cue. Run focused PHP resolver tests, TS contracts, `tsc`, and build. Push one clean review candidate from current `main`; set **AWAITING CHATGPT REVIEW**. Do not push to main.

Do **not** touch the deferred Tier-card/Add-on/Cart hiding issue in this phase.