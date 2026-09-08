# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — narrow Manage build re-entry correction**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `f2d27ae06b73c4b934a8596510bc1c4c5b2c0f60`; deploy #973 succeeded; initial Upgrade flow live-accepted by Nath.
- Review candidate `review/manage-build-cart-reentry` @ `3ff0f4409fe371846bad4651dff261318b548742` is one clean commit ahead of current main and is **not approved for main yet**.

## Accepted in candidate
- `QuoteSummary` adds optional **Manage build** only for a real composable line that coexists with its primary; other callers remain unaffected.
- `PackageBuilderApp` sends an identity-only request and routes `activeFamilyId`; no cart/pricing mutation occurs on entry.
- `FamilyTierAdapter` alone re-enters the existing `browsing` stage when matching primary + committed composable exist.
- Existing `ComposableOfferBrowser`, auto-sync, scoped Cart presentation and **Add to Quote** exit remain unchanged.
- Reported `tsc`, focused contracts and Vite build pass; `package-builder-flow` failure is pre-existing on main.

## Blocking cross-Family race
The requested cross-Family path currently relies on both parent state updates being observed in one render:
`setActiveFamilyId(item.familyId)` then `setManageBuildRequest(...)`.

`FamilyTierAdapter`'s consuming effect depends **only** on `manageBuildRequest` and always calls `onManageBuildConsumed()` even when the request does not match the currently rendered Family. If the request is observed while the old Family is still rendered, it is consumed as a mismatch; when the target Family then renders, the same request is already gone. The contract source-scan does not prove runtime batching/order, so this explicit required route is not independently safe.

## Claude — narrow correction
Do not redesign the flow. Make consumption race-safe without relying on parent update batching:
- When a request targets a different currently-rendered Family/Instance, **do not consume it yet**.
- Ensure the consuming effect re-evaluates when the rendered Family/Instance changes (include the required Family identity dependency/trigger).
- Once the matching Family/Instance is rendered, consume the request exactly once; if matching but primary/composable guards fail, consume without opening so it cannot fire later unexpectedly.
- Preserve one-shot behavior after a successful open/exit.
- Preserve current Manage-button gating, no mutation on entry, direct `browsing` re-entry, existing auto-sync and stage-exit behavior.

Update `contract:manage-build` to lock the mismatch-waits / matching-family-consumes behavior rather than "always consume matched or not". Run `tsc`, relevant contracts and build.

Return a fresh clean candidate from current `main`, exact SHA/files/evidence, status **AWAITING CHATGPT REVIEW**. Do not push to main.