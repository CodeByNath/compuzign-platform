# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — race-safe Manage build candidate**
- Auditor verdict pending re-review.
- Production `main`: `f2d27ae06b73c4b934a8596510bc1c4c5b2c0f60`; deploy #973 succeeded; initial Upgrade flow live-accepted by Nath.
- Superseded candidate `review/manage-build-cart-reentry` @ `3ff0f4409fe371846bad4651dff261318b548742` — rejected for the cross-Family race below; left in place, not force-pushed over.
- New candidate `review/manage-build-cart-reentry-v2` @ `c331909f` — one clean commit ahead of current `main` (merge-base = current `main`).

## Correction applied (race-safe cross-Family re-entry)
`FamilyTierAdapter`'s consuming effect no longer assumes `PackageBuilderApp`'s two setState calls (`setActiveFamilyId`, then `setManageBuildRequest`) are observed in one batched render:
- The effect's dependency array is now `[manageBuildRequest, family.family_id, family.tier_instance_id]`, so it re-evaluates the moment the target Family/Instance actually renders, not just when the request object itself changes.
- A request for a Family/Instance other than the one currently rendered is left **untouched** (returns before calling `onManageBuildConsumed()`) — it waits for the matching render instead of being dropped as a mismatch.
- Once the Family/Instance genuinely matches, the request is always resolved exactly once: opened (`setUpgradeGateTierId`/`setUpgradeGateStage('browsing')`) when the primary + committed composable line both exist, or silently dropped (still consumed, never opened) when that guard fails — so a matched-but-guard-failed request can never linger and fire later once conditions change.
- One-shot behavior after a successful open is preserved: the request is already consumed at open time, so a later browsing-stage exit (`dismissUpgradeGate`) has nothing left to re-trigger.

## Accepted in candidate (unchanged from prior round)
- `QuoteSummary` adds optional **Manage build** only for a real composable line that coexists with its primary (`composableCoexistsWithPrimary`); other callers (`CostBuilderApp.tsx`) remain unaffected.
- `PackageBuilderApp` sends an identity-only request (`familyId`, `tierInstanceId`, `requestId`) and routes `activeFamilyId`; no gate setter or cart-mutating function is called from `PackageBuilderApp` itself.
- `FamilyTierAdapter` alone re-enters the existing `browsing` stage — no new/parallel state machine.
- Existing `ComposableOfferBrowser`, auto-sync, scoped Cart presentation, and **Add to Quote** exit (`onExit={dismissUpgradeGate}`) remain unchanged.

## Implementation evidence
- Files (same set as prior round, `FamilyTierAdapter.tsx` and `scripts/manage-build-contract.ts` further revised): `QuoteSummary.tsx`, `PackageBuilderApp.tsx`, `FamilyTierAdapter.tsx`, `cost-builder.css`, `scripts/manage-build-contract.ts`, `package.json` (`contract:manage-build` script).
- `scripts/manage-build-contract.ts` updated to lock the race-safe behavior: mismatch leaves the request untouched (no `onManageBuildConsumed()` call), the mismatch check precedes the primary/composable guard, and `onManageBuildConsumed()` fires only after a Family/Instance match (guard passed or failed) — replacing the prior "always consume, matched or not" assertion.
- Validation: `tsc --noEmit` clean; `contract:manage-build`, `contract:upgrade-your-build-gate`, `contract:package-builder-addon-focus`, `contract:package-builder-regression-lock`, `contract:composable-quote-cart`, `contract:package-family-cart` all pass; clean Vite build. (`contract:package-builder-flow` still fails identically on unmodified `main` — pre-existing broken reference to a removed `FullBuildDetail.tsx`, unrelated, not touched.)
- Live visual validation remains for after any main push.

## ChatGPT — next action
Review `review/manage-build-cart-reentry-v2` @ `c331909f` against the required race-safe behavior above. Approve for source push, or reject with correction.
