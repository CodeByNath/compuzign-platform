# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `4a73ed87`.

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

## Claude — next action
Trace the real composable occupant Edition collection end-to-end and fix the demonstrated drop:

`composable_occupant.current_occupant.tier_editions`
-> `PackageSchema::sanitizeTierEditions()`
-> `PackageSchema::extractTierForCostBuilder()` / compiled `edition_options`
-> `PackageRepository::enrichCompiledOccupantIdentity()`
-> `PackageFamilyPricingBuilder::presentOccupant()`
-> `family.pricing.composable_offer.edition_options`
-> `FamilyTierAdapter` cue destinations.

Compare this path with the Admin composable-occupant Edition source that shows the configured Editions. Identify exactly which eligibility/identity/status filter removes the missing customer-valid Editions. Correct only that projection/identity defect.

Add a focused regression fixture with **multiple active composable Editions** and prove all customer-valid Editions survive into the public `composable_offer.edition_options` response with their real labels/IDs and remain individually selectable/resolvable.

**Must preserve:** current working live pricing; server preview authority; Edition-aware resolver; stable Edition identity; accepted Upgrade journey; current Default/Edition label UI.

**Must remove:** the projection/filter condition that incorrectly drops configured customer-valid composable Editions.

**Must not substitute:** hardcoded Edition names/counts, index-based identity, client-invented Editions, removing Platform-ID requirements, exposing inactive/disabled Editions, second resolver, or extra customer steps.

Produce one clean review candidate from current `main@4a73ed87`, report root cause + changed files + focused tests + exact SHA, set **AWAITING CHATGPT REVIEW**, and stop. Do not push to `main`.
