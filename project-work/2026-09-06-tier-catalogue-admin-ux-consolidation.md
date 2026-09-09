# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `ee624fdc6d71e9499396097b872afd3bee97b26f`.
- Review branch: `fix/quoted-single-tier-dismissible` @ `6086f9e5b2f6e6e0be2a270c5367fb278242d64b` — 1 ahead, 0 behind, merge base `ee624fdc`.
- **SOURCE PUSH NOT APPROVED.**

## Accepted direction
The new state split is correct:
- one real primary, unquoted -> automatic focused landing, no X;
- same Tier quoted -> focused shell may show normal sticky X;
- X -> one quoted card, focused shell inactive so Cart can render beside it;
- quoted card keeps `View Plan` and exact quoted Edition route back into the same shell.

The implementation correctly blocks immediate X bounce-back by honoring `singleTierDismissedTierId` in the render-time fallback rather than adding an auto-open effect, fake click, timer, route change, or CSS-only workaround. Mounted regression coverage is appropriate and the Family-membership fix remains intact.

## Required safeguard — stale dismissal can resurrect
Current candidate does **not actually reset** the dismissal when the primary is removed. It only makes it temporarily invalid by deriving:
`singleTierDismissed = singleTierDismissedTierId === selectedTierId`.

That means this sequence is wrong:
1. quote single Tier;
2. X -> dismissal stores that Tier id;
3. remove primary -> locked auto-focus correctly returns because `selectedTierId` is null;
4. quote the **same Tier again** -> stale stored id becomes valid again and can suppress the fresh quoted focused fallback.

Nath explicitly required the dismissal to reset when the primary is removed, not merely become dormant. The regression currently stops after removal and therefore misses the resurrection case.

### Claude — next action
On the same topic branch:
1. Ensure a dismissal is genuinely cleared when the selected primary is removed or changes away from the dismissed Tier, including removal from Cart outside this component.
2. Do not use an effect to auto-open anything. A small synchronization/reset effect over external selected-primary identity is acceptable if it only clears stale presentation state.
3. Extend the mounted regression with: dismiss -> remove primary -> locked landing/no X -> re-add same Tier -> fresh quoted focused state with X -> X works again.
4. Preserve Family/customer-group reset behavior, exact Tier+Edition `View Plan` reopen, Recommendations/Add-ons/composable flow, Cart visibility, pricing and quote identity.
5. Push the corrected topic head, record SHA/tests here, set **AWAITING CHATGPT REVIEW**, stop. Do not push to `main`.

## Non-blocking observation
`commitSelection()` still clears `focusedEditionId`, so immediately after quoting an Edition the fallback shell can transiently show Default while the Cart holds that Edition. This predates this refinement; do not broaden scope unless Nath asks.

## Out of scope
Pre-existing `contract:package-builder-flow` ENOENT on removed `FullBuildDetail.tsx` remains non-blocking.
