# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `0a13fd14`.
- Prior candidate `12e00e91` is accepted only for the Edition-label portion; it is **not** a complete release candidate.

## Release scope
Finish the existing customer-facing **Upgrade Your Build** flow as one working release. No broader composable-Edition architecture work.

Accepted flow remains: normal Tier/Edition first -> staged Tier + Recommendations -> Upgrade CTA -> Browse Catalogue in existing focused shell -> server preview/auto-sync authority -> Add to Quote returns to staged view. No standalone Build Your Own journey.

## Decision correction
Do **not** push `12e00e91` by itself. The customer pricing failure is part of this same active release and remains blocking. Nath will perform browser/customer validation only after a complete reviewed candidate is pushed to `main` and deployed.

## Defect B — Edition top control
The `12e00e91` `showLabels` implementation is accepted. Preserve it in the final clean candidate. Do not redesign or broaden Edition architecture.

## Defect A — pricing request failure
The live customer flow on `main@0a13fd14` reaches `ComposableOfferBrowser`'s Promise rejection path (`Could not resolve pricing right now`). The PHP fixture added in `12e00e91` does not reproduce the REST/HTTP boundary and therefore does not close this defect.

## Claude — next action
Fix the pricing failure **before any source push**.

Start from current production `main`, then reproduce/trace the full existing boundary locally as far as the environment permits:
`ComposableOfferBrowser -> resolveComposablePreview -> apiClient.post -> /compuzign/v1/package-builder/composable-preview -> PackageBuilderController::postComposablePreview -> PackageRepository::resolveComposableOfferSelection`.

Audit specifically for a defect that can make the client Promise reject even when repository resolution itself passes: route registration/path, request/argument schema, nonce/public permission handling, controller return/serialization, thrown PHP/runtime errors, malformed/non-JSON success response, or client endpoint construction. Add a focused regression test/contract at the REST/controller boundary rather than another repository-only fixture.

Fix only the demonstrated source defect. If local reproduction is impossible, report the exact remaining boundary and evidence instead of guessing.

**Must preserve:** server preview as pricing authority; debounced preview/auto-sync; customer-policy/Commercial-Leg resolver; Edition-aware resolution; accepted Upgrade journey; accepted dynamic Edition labels.

**Must remove:** the actual condition causing the composable-preview Promise rejection.

**Must not substitute:** client-calculated pricing, published unit-price fallback as quote authority, error suppression, second resolver, removal of Edition support, extra customer steps, or a separate Build Your Own journey.

When complete, create one **clean replacement review candidate from current `main`** containing both the accepted Edition-label fix and the pricing correction. Run focused contracts/tests, update affected Code Map only as needed, report root cause + changed files + evidence + exact SHA, set **AWAITING CHATGPT REVIEW**, and stop. Do not push to `main`.
