# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — intent-safe Cart footer recovery route**
- Auditor verdict pending re-review.
- Production `main`: `c331909f0b1abc3323f28eafa566c2501f593862`; deploy #974 succeeded (unchanged; not pushed).
- Superseded candidate `review/upgrade-build-cart-footer-recovery` @ `dd5f26fb94cfd8aadc75d95fc474fddb01ed33de` — rejected for the entry-intent gap below; left in place, not force-pushed over.
- New candidate `review/upgrade-build-cart-footer-recovery-v2` @ `6f8f8cad` — one clean commit ahead of current `main` (merge-base = current `main`).

## Correction applied (intent-safe shared Cart-to-browsing request)
The shared `ManageBuildRequest` now carries an explicit `intent: 'manage_existing' | 'start_upgrade'` instead of a single disjunctive open guard:
- `requestManageBuild(familyId, tierInstanceId, intent)` takes the intent as a parameter; `handleManageBuild` (line-level Manage build) always supplies `'manage_existing'`, the Cart footer's `onUpgradeYourBuild` always supplies `'start_upgrade'`.
- `FamilyTierAdapter`'s consuming effect computes `intentSatisfied` per-intent, each a COMPLETE, separate guard: `'manage_existing'` requires the composable line to STILL be committed at consumption time, with **no** fallback to catalogue eligibility; `'start_upgrade'` requires **no** composable line committed AND a genuinely eligible catalogue (`resolveComposableEligibleRows`).
- Consequence: a `manage_existing` request whose composable line disappears before its Family/Instance renders is dropped without opening — it can never silently fall back to starting a fresh Upgrade merely because the catalogue remains eligible. A `start_upgrade` request is likewise dropped without opening if a composable line now exists (Manage build is then the correct route).
- Cross-Family mismatch-waits/matched-consumes-exactly-once behavior (prior round) is untouched; still no mutation on entry; `UpgradeBuildSummary`'s `onExit={dismissUpgradeGate}` is unchanged.

## Accepted in candidate (unchanged from prior round)
- Cart footer places **Upgrade your build** immediately before **View details**, in one row.
- Footer availability is decided in `PackageBuilderApp` for the active Family only: quoted primary + `resolveComposableEligibleRows(family).length > 0` + no committed composable line.
- `QuoteSummary` remains generic through the optional `onUpgradeYourBuild` callback; `CostBuilderApp.tsx` caller unaffected.
- Once a composable line exists, footer recovery disappears and line-level **Manage build** remains the visible route.

## Implementation evidence
- Files: `PackageBuilderApp.tsx`, `FamilyTierAdapter.tsx`, `QuoteSummary.tsx`, `cost-builder.css` (unchanged from prior round), `scripts/upgrade-build-footer-contract.ts` and `scripts/manage-build-contract.ts` (both revised for the `intent` field).
- New contract assertions: `upgrade-build-footer-contract.ts` locks `start_upgrade`'s own complete guard; `manage-build-contract.ts` locks `manage_existing`'s own complete guard and the `requestManageBuild(familyId, tierInstanceId, intent)` signature — each proving its own intent cannot substitute for the other's.
- Validation: `tsc --noEmit` clean; `contract:manage-build`, `contract:upgrade-build-footer`, `contract:upgrade-your-build-gate`, `contract:package-builder-addon-focus`, `contract:package-builder-regression-lock`, `contract:composable-quote-cart`, `contract:package-family-cart` all pass; clean Vite build.
- Live visual validation remains for after any main push.

## ChatGPT — next action
Review `review/upgrade-build-cart-footer-recovery-v2` @ `6f8f8cad` against the required intent-safe guards above. Approve for source push, or reject with correction.
