# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Cart footer Upgrade your build recovery route**
- Auditor verdict pending re-review.
- Production `main`: `c331909f0b1abc3323f28eafa566c2501f593862`; deploy #974 succeeded (unchanged; not pushed).
- Existing initial Upgrade flow + deployed **Manage build** route remain accepted and untouched by this candidate.

## New live refinement (unchanged from prior round)
Nath confirmed the current flow is acceptable but identified the skipped-upgrade gap: when a customer chooses **Maybe next time** and later lands at Cart without any composable/Upgrades line, there is no recovery route back into Upgrade Your Build.

Added **Upgrade your build** in the Cart footer immediately before existing **View details**, in the same row.

## Implementation evidence
- Branch: `review/upgrade-build-cart-footer-recovery` @ `dd5f26fb` (base: current `main`, `c331909f`; one commit ahead).
- `PackageBuilderApp.tsx`: `showUpgradeYourBuildFooter` gates on the active Family's `primary !== null && composableItem === null && resolveComposableEligibleRows(family).length > 0` — the same shared eligibility authority `FamilyTierAdapter`'s own `commitSelection` gate uses, never a second/derived test. `handleManageBuild`'s routing body was extracted into a shared `requestManageBuild(familyId, tierInstanceId)` helper (Manage build now a thin wrapper over it); the footer's `onUpgradeYourBuild` calls the same helper with the active Family's own `family.family_id`/`family.tier_instance_id` — never "first item in Cart" or a rendered label.
- `QuoteSummary.tsx`: optional `onUpgradeYourBuild` prop, rendered in a new `.cz-quote-summary__footer-links` row immediately before View details; absent for `CostBuilderApp.tsx`.
- `FamilyTierAdapter.tsx`: the request-consuming effect's open guard is generalized to `selectedPrimaryItem && (selectedComposableItem || resolveComposableEligibleRows(family).length > 0)` — opens with no composable item yet (this route) or with one already committed (Manage build), never requiring both; no synthetic auto-commit performed. Race-safe mismatch-waits/matched-consumes behavior (prior round) is untouched.
- `cost-builder.css`: `.cz-quote-summary__footer-links` (row layout) and `.cz-quote-summary__upgrade-your-build` (same quiet text-link recipe as the row's other entries).
- New contract: `scripts/upgrade-build-footer-contract.ts` (`npm run contract:upgrade-build-footer`), locking eligibility, disappearance-once-composable-exists (same `composableItem === null` check, so mutually exclusive with Manage build by construction), the shared-routing reuse, and the generalized open guard. `scripts/manage-build-contract.ts` updated for the `requestManageBuild` extraction — Manage build's own semantics (button gating, race safety, one-shot consumption, no mutation on entry, unchanged Add-to-Quote exit) re-verified intact.
- Validation: `tsc --noEmit` clean; `contract:manage-build`, `contract:upgrade-build-footer`, `contract:upgrade-your-build-gate`, `contract:package-builder-addon-focus`, `contract:package-builder-regression-lock`, `contract:composable-quote-cart`, `contract:package-family-cart` all pass; clean Vite build.
- Live visual validation remains for after any main push.

## ChatGPT — next action
Review `review/upgrade-build-cart-footer-recovery` @ `dd5f26fb` against the required behavior (project-work history above) and boundary. Approve for source push, or reject with correction.
