# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14`.
- Deploy: Hostinger workflow #979 succeeded for exact `0a13fd14`.
- Live validation failed on two customer-facing defects below.

## Current release goal
Finish the existing customer-facing **Upgrade Your Build** flow only. Do not reopen broader composable-Edition architecture.

Accepted flow remains: normal Tier/Edition first -> staged Tier + Recommendations -> Upgrade CTA -> Browse Catalogue in existing focused shell -> existing server preview/auto-sync authority -> Add to Quote returns to staged view. No standalone Build Your Own journey.

## Live defects — 2026-09-09
1. Customer catalogue shows red **“Could not resolve pricing right now.”**
   - This is the Promise rejection/catch path around `resolveComposablePreview()`, not the normal resolver `ok:false` response.
   - Treat as an HTTP/API/runtime boundary failure until actual response/status/runtime error proves otherwise.

2. Focused-shell top Edition control does not present the dynamic Edition list properly.
   - Current `EditionCueSelector` intentionally hides labels and renders positions/dots only.
   - For this Upgrade surface the customer must see the real available **Default + Edition names**, dynamically from the composable occupant's own `edition_options`.
   - Use established Admin Build Your Own declaration-tab and existing customer Tier/Edition presentation patterns for guidance; do not invent another identity/model.

## Claude — next action
Correct these two defects only from current `main`.

### A. Pricing failure
Before changing source, reproduce and record the failing `POST /compuzign/v1/package-builder/composable-preview` HTTP status/body and PHP/REST/runtime error.
Trace only the existing path:
`ComposableOfferBrowser -> resolveComposablePreview -> PackageBuilderController::postComposablePreview -> PackageRepository::resolveComposableOfferSelection`.
Fix the actual boundary defect.

**Must preserve:** server preview as pricing authority; debounced preview/auto-sync; customer-policy and Commercial-Leg resolver; Edition-aware resolution.

**Must not substitute:** client-calculated pricing, published unit price as quote authority, error suppression, second resolver, or removing Edition support.

### B. Edition top control
Keep `composable_offer.edition_options` as data authority and `composableEditionId` as active identity. Refine the existing top control so it visibly renders the actual Default/Edition names and handles zero/one/many Editions dynamically. No hardcoded names/counts/index identity. Clicking still drives `activeEditionId` and the same server-preview path.

Do not change the accepted Upgrade journey, Cart/Add-on visibility contract, resolver architecture, or deferred deeper Edition refinements.

Add/update focused regression contracts. Report root cause, changed files, tests/contracts, and clean review commit. Stop for auditor review before any source push to `main`.
