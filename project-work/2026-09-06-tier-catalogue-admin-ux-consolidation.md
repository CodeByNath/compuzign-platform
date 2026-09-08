# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `c331909f0b1abc3323f28eafa566c2501f593862` (fast-forwarded from `f2d27ae06b73c4b934a8596510bc1c4c5b2c0f60`, pushed by Nath).
- Hostinger deploy: GitHub Actions run #974, "Deploy to Hostinger", conclusion **success**.

## Accepted behavior
- **Manage build** renders only on a real composable/Upgrades line that coexists with its primary.
- `QuoteSummary` stays generic via optional `onManageBuild`; non-package-builder caller remains unaffected.
- `PackageBuilderApp` only routes the clicked line's Family and emits a one-shot identity request; it performs no quote mutation and does not own the Upgrade stage.
- `FamilyTierAdapter` remains the sole owner of entering existing `browsing`.
- Cross-Family re-entry is race-safe: a request for a non-current Family/Instance is left pending; the consuming effect re-evaluates when `family.family_id` / `family.tier_instance_id` changes; only the matching render may resolve it.
- On a matching Family/Instance, the request is consumed exactly once: opens browsing only when the selected primary + committed composable item exist; otherwise it is dropped without later surprise activation.
- Existing `ComposableOfferBrowser` hydration/auto-sync, scoped Cart presentation, and **Add to Quote** stage-exit behavior remain unchanged.

## Validation accepted
Claude reports clean `tsc`, `contract:manage-build`, Upgrade gate, add-on focus, regression lock, composable quote-cart, package-family-cart, and clean Vite build. The known `contract:package-builder-flow` failure is independently reported as pre-existing on unmodified `main` due to removed `FullBuildDetail.tsx`; this change does not touch it.

## Claude — next action
Push to `main` was classifier-blocked for Claude; Nath ran `git push origin origin/review/manage-build-cart-reentry-v2:main` directly and confirmed. Deployment succeeded (run #974). Nath will validate the customer Cart -> Manage build -> browsing -> Add to Quote -> Add-ons/Cart loop. Do not start new work until this refinement is live-accepted or explicitly deferred.