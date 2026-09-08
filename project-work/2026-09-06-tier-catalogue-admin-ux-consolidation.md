# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — race-safe Manage build candidate accepted**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `f2d27ae06b73c4b934a8596510bc1c4c5b2c0f60`.
- Approved candidate: `review/manage-build-cart-reentry-v2` @ `c331909f0b1abc3323f28eafa566c2501f593862`.
- Independent compare confirms exactly one commit ahead of current `main`, merge-base = current `main`.

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
Fast-forward/push **only** `c331909f0b1abc3323f28eafa566c2501f593862` to `main` if `main` is still exactly `f2d27ae06b73c4b934a8596510bc1c4c5b2c0f60`. If `main` moved, stop and report rather than merge/rebase automatically.

After push, record exact `main` SHA and GitHub Actions/Hostinger deployment result here. Set **AWAITING LIVE VALIDATION** after successful deploy. Nath will validate the customer Cart -> Manage build -> browsing -> Add to Quote -> Add-ons/Cart loop. Do not start new work until this refinement is live-accepted or explicitly deferred.