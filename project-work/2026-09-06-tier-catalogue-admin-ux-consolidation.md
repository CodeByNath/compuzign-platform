# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — Cart footer Upgrade recovery route accepted**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `c331909f0b1abc3323f28eafa566c2501f593862`; deploy #974 succeeded.
- Approved candidate: `review/upgrade-build-cart-footer-recovery-v2` @ `6f8f8cad9d49c6c728979e7ed327a714cbf28163`.
- Independent compare: exactly one commit ahead of current `main`, merge-base = current `main`.

## Accepted behavior
- Cart footer renders **Upgrade your build** immediately before **View details** only for the currently active Family when: quoted primary exists, `resolveComposableEligibleRows(family)` is non-empty, and no composable/Upgrades line exists.
- `QuoteSummary` remains generic via optional `onUpgradeYourBuild`; non-package-builder caller is unaffected.
- Clicking the footer action reuses the same race-safe one-shot Cart→`FamilyTierAdapter` request path as line-level **Manage build**, with explicit `intent: 'start_upgrade'`.
- `manage_existing` and `start_upgrade` have separate complete guards: Manage requires the composable line still exists; Start requires no composable line plus eligible catalogue. Neither can silently substitute for the other across a race.
- Cross-Family mismatch waits until the matching Family/Instance renders; matching requests resolve exactly once.
- No quote mutation occurs on entry. Existing `ComposableOfferBrowser`/auto-sync/right-side scoped Cart presentation and **Add to Quote** exit remain unchanged.
- Once a composable line exists, footer **Upgrade your build** disappears and line-level **Manage build** is the sole re-entry route.

## Validation accepted
Claude reports clean `tsc`, `contract:manage-build`, `contract:upgrade-build-footer`, Upgrade gate, add-on focus, regression lock, composable quote-cart, package-family-cart, and clean Vite build. Source review confirms footer target is explicit active Family identity, not first Cart item or label inference.

## Claude — next action
Fast-forward/push **only** `6f8f8cad9d49c6c728979e7ed327a714cbf28163` to `main` if `main` is still exactly `c331909f0b1abc3323f28eafa566c2501f593862`. If `main` moved, stop and report instead of merging/rebasing automatically.

After push, record exact `main` SHA and GitHub Actions deployment result here and set **AWAITING LIVE VALIDATION**. Nath will validate: skip initial Upgrade → Cart footer Upgrade your build → direct browsing → Add to Quote → footer disappears / Manage build appears. Do not start new work until validated or explicitly deferred.