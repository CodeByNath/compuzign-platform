# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — Edition scope-tab refresh fix accepted**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `77d5ef76e25622ac8c7756f49b4f0073395fdd2d`.
- Current live deploy: GitHub Actions run #968 — **Success** for exactly that head SHA.
- Accepted candidate: `review/tier-catalogue-edition-scope-tab-refresh-fix` @ `9d4948a5`, exactly 1 commit ahead / 0 behind current `main`, merge-base = current `main`.

## Independent audit result
The candidate is a narrow refresh-wiring correction and does not redesign the tab UI.

Verified source behavior:
- `TierComposableMiddleShell` already renders each tab panel from that tab's own scope and policy.
- `PackageTierWorkspace` already owns the selected declaration id and projects the active scope from `composableOccupant.declarationScopes`.
- The actual gap was stale originating-workspace data after Edition mutations: the Tier drawer has its own `usePackageStation` instance, while Edition mutations in `useTierEditions` previously refreshed only the drawer-local instance.
- `TierDrawerContent.tsx` now uses one `notifyEditionMutated` callback that calls both `c.pkg.refetch()` and `bridge.onMutationComplete?.()`, so successful Edition mutations also refresh the originating Workspace.
- `useTierDrawerController.ts` applies the same bridge notification after Edition creation.
- No Customer Selection Rules Edition Edit/deep-link route is restored.
- No pricing, resolver, identity, backend, persistence, quote/cart/customer behavior is changed.
- Generated Admin bundle and the focused contract were updated.

Claude-reported validation: `tsc` clean; focused declaration/Edition/composable/customer-policy and wider drawer contracts PASS; `npm run build` succeeded. Two lifecycle regression scripts fail identically on clean current `main` due a pre-existing unrelated `audienceGroups` TypeError; do not widen this work to fix them.

## Claude — next action
1. Push **exactly `9d4948a5`** to `main` with no additional source changes.
2. Record the resulting full `main` SHA and GitHub Actions deploy run/result in this same file.
3. After successful deployment, set **AWAITING LIVE VALIDATION**.
4. Keep the accepted review branch until Nath's live validation passes.
5. Do not touch the separate Always-included initial-cart hydration defect or the unrelated lifecycle-regression-script failure in this phase.

## Live gate — Nath performs
After deploy, recheck the existing Customer Selection Rules tabs:
- Default shows Default metrics/data;
- Edition 2 shows Edition 2's configured metrics/data rather than stale Default values;
- switching between tabs updates the right-side column correctly;
- no Edition Edit button/deep-link has returned;
- normal Build Your Own -> Options -> Edition editing remains unchanged.

Do not mark CLOSED until Nath confirms this live gate and the accepted review branch is cleaned up.