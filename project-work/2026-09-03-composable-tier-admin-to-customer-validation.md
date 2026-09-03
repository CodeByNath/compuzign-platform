# Composable Tier — Admin UX restructuring + customer validation

## Status
- **SOURCE PUSH APPROVED — exact reviewed commit `bb86513c38fb4e0eea39c290ddf07961e6ecfd1a` only.**
- Auditor verdict: **Proceed with safeguards.**
- Production baseline before push: `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`.
- Reviewed branch: `review/composable-tier-admin-ux@bb86513c38fb4e0eea39c290ddf07961e6ecfd1a`, exactly 1 commit ahead / 0 behind baseline.

## Independent audit result
Actual pushed diff inspected: 17 files, Admin presentation/contracts/docs + built assets only; no PHP/schema/API/quote/cart changes.

Accepted safeguards:
1. `TierNavigation` receives composable as separate `composableSlot`; it is appended only for rendering/keyboard navigation and never merged into the five `slots` array or Tier/Add-on filter semantics.
2. `PackageTierWorkspace` uses the existing `COMPOSABLE_TIER_ID` sentinel only as focus state. `focusedSlot` switches between normal selected slot and subordinate composable slot; five-slot source remains untouched.
3. Normal Tier focus path is unchanged; composable focus uses the same `TierDetailPanel` and existing `TierLowerDeck` rather than a fork.
4. New `TierComposableMiddleShell` mounts only for `viewMode === 'focus' && isComposableFocused && composable item exists`.
5. Customer rule summary derives only from settled `customer_policy`; normal `WorkspaceTierSlot.customerPolicy` is hard-null in `projectWorkspaceTierSlots()`, so no normal Tier/Add-on policy leakage.
6. Customer Options still dispatches the existing standalone `tier-customer-policy` drawer.
7. Inclusion/Rate Sheet drawer token validation is widened only by adding the existing composable sentinel to otherwise closed allowed-slot sets; arbitrary slot IDs still fail closed.
8. Grid mode keeps the existing subordinate composable box and never turns it into a sixth backend Tier.

One UX note for live validation: the sixth destination is visually separated by divider/dashed treatment, but live browser must confirm it reads as subordinate rather than a peer Tier and that the middle shell visually fits Nath's intended Package-home flow.

## Reviewed implementation
Commit: `bb86513c38fb4e0eea39c290ddf07961e6ecfd1a`.
Reported green: typecheck, build, docs, new `contract:composable-tier-admin-ux`, and relevant Package/Tier/composable contracts. Known unrelated `contract:admin-station-css` six `cz-rate-sheet-tool__*` findings remain pre-existing.

## Claude next action
Push **only this exact reviewed commit** to `main`. Do not amend, squash with unrelated work, or add follow-up source changes in the same push. Then record in this file:
- exact new `main` SHA;
- proof it is the reviewed `bb86513c...` commit or exact equivalent fast-forward;
- GitHub Actions deploy run ID/status/head SHA;
- set **AWAITING LIVE VALIDATION** once deployment succeeds.

Do not start quote/cart work. Live Admin validation is the next gate after deploy.