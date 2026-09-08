# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — live rejection: Upgrade cue is bound to the primary Tier occupant; correct composable occupant/Edition path first**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `af01ebb10a49ca66091b504eba54e8c21d597387`; deploy #976 succeeded but this refinement is **not live-accepted**.
- Second live issue (selected Tier card hiding / Add-on+Cart visibility) is explicitly deferred until this focused-shell defect is corrected and accepted.

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