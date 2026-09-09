# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `4a73ed87` (unchanged).
- Candidate: `review/composable-edition-set-completeness` @ `09f453ec`, one commit from current `main`.

## Release scope
Finish the existing customer-facing **Upgrade Your Build** flow as one working release. No standalone Build Your Own journey and no unrelated composable architecture expansion.

Accepted flow remains: normal Tier/Edition first -> staged Tier + Recommendations -> Upgrade CTA -> Browse Catalogue in existing focused shell -> server preview/auto-sync authority -> Add to Quote returns to staged view.

## Live validation — 2026-09-09
Nath validated deployed `main@4a73ed87`.

### Pricing
**PASS at live customer level.** The previous red `Could not resolve pricing right now` error is gone. The Upgrade summary resolves real pricing (screenshot shows Monthly `$36.15`, Initial Payment `$192.65`). Do not reopen pricing without new evidence.

### Composable Edition loading
**FAIL.** The UI now renders labels, but it only shows `Default` + `Subscriptions`. This is not the requested behavior: the customer selector must load the composable occupant's complete customer-valid Edition set dynamically. The prior work fixed label visibility, not the underlying Edition collection/projection.

This is now direct live evidence and the remaining release blocker.

## Source evidence
Customer UI reads `family.pricing.composable_offer.edition_options`. `PackageFamilyPricingBuilder::presentOccupant()` only passes through whatever `edition_options` the repository compiled. `PackageRepository::enrichCompiledOccupantIdentity()` then rebuilds/filter-maps those options against sanitized `tier_editions` and drops any option whose `edition_platform_id` resolves empty. The exact stage responsible for the missing live Editions must now be traced rather than guessed.

## Claude — report (2026-09-09, round 4)

### Root cause, confirmed by reproduction
Traced the exact path named above. `PackageRepository::enrichCompiledOccupantIdentity()` filtered `edition_options` to only entries whose `edition_platform_id` (CZTE — minted only when an admin transitions that Edition to Active through `updateComposableOccupantEditionStatus()`) was non-empty:
```php
), static fn(array $option): bool => $option['edition_platform_id'] !== ''));
```
That mirrors the correct "never surfaced half-identified" rule for the **occupant itself** (no `cz_platform_id` → the whole `composable_offer` is null) — but the same rule applied per individual Edition-child is wrong here: **nothing in the actual selection/pricing/resolution path reads `edition_platform_id`.** `resolveComposableOfferSelection()` matches an Edition purely by its own `id`; `EditionCueSelector`/`resolveComposableEligibleRows()` on the frontend do the same. `edition_platform_id` only ever reaches the eventually-committed quote item's own `tierEditionPlatformId` field (`buildComposableFamilyTierQuoteItem()`), which already tolerates an empty string there (`?? null` only substitutes on null/undefined, not `''`). A real, active, customer-configured Edition that simply hadn't been through the CZTE-minting transition (or predates it) was invisible to the customer with no way to select it — exactly the "only Default + Subscriptions" live symptom.

New `tests/composable-edition-set-projection.php` reproduces this exactly against the unfixed code first (3 active Editions, only 1 minted → 1 survives, confirmed before writing the fix), then locks the corrected behavior.

### Fix
`enrichCompiledOccupantIdentity()` still attaches `edition_platform_id` to every surviving option (real value when minted, `''` when not) but no longer filters on it. The occupant-level Platform ID gate is untouched (still returns `null` for the whole `composable_offer` with no occupant `cz_platform_id`). `edition_options` is already restricted to ACTIVE editions upstream (`PackageSchema::publicTierEditionOptions()`), so this cannot expose a disabled/trashed one — verified directly (test section 4).

### Must-preserve / must-not-substitute — verified, not just claimed
- Live pricing: untouched, no changes outside `enrichCompiledOccupantIdentity()`.
- Edition-aware resolver: untouched (`resolveComposableOfferSelection()` not modified).
- Stable Edition identity: `id` values pass through verbatim, no fabrication.
- No hardcoded names/counts/index identity: the fix is a filter removal, not a hardcoded list.
- No exposing inactive/disabled Editions: locked by test section 4 (a disabled Edition alongside an active one — only the active one survives).
- No removed Platform-ID requirement at the occupant level: locked by test section 5 (occupant with no `cz_platform_id` still yields no `composable_offer` at all).
- No second resolver, no extra customer steps: none added.

### Changed files
- `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php` (the fix)
- `wp-content/plugins/compuzign-platform/tests/composable-edition-set-projection.php` (new — reproduces the live defect, locks the fix and every preserved invariant)
- `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/CLAUDE.md` (validation list +1 test)

No frontend changes this round — `dist/` untouched (rebuilt anyway to confirm, no diff).

### Tests/contracts run — all green
`php tests/composable-edition-set-projection.php` (new), `tier-edition-public-projection.php` (separate Cost-Builder-only projection, confirmed unaffected — it never leaks `edition_platform_id`, which is by design a different, older read path from the one fixed here), `composable-customer-ux-preview.php`, `composable-preview-controller-boundary.php`, `tier-instance-public-projection.php`, `tier-public-projection-is-addon.php`, `tier-pricing-parity.php`, `tier-edition-schema.php`, `tier-edition-repository.php`, `tier-edition-default-resolution.php`; `npm run contract:tier-edition-switch`, `contract:composable-offer-choice`, `contract:composable-offer-contribution`, `contract:composable-quote-cart`, `contract:composable-recommendations-cta`, `contract:composable-edition-resolution`; `npx tsc --noEmit`; `npm run build`; `npm run docs:check`.

### Candidate
`review/composable-edition-set-completeness` @ `09f453ec`, one commit from current `main@4a73ed87`, pushed. `main` untouched.

Stopping here for auditor review, per Status above.
