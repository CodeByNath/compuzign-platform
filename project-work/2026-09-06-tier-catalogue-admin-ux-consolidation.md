# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 3 correction only**
- Auditor verdict: **Proceed with safeguards**.
- Phase 2 remains accepted on deployed `main@3cc88e83f93e57fec7b61419129cd93a8432809b`.
- Phase 3 review head `4ae6505c...` is **not approved for main**.

## Audit finding
The implementation correctly retires the standalone Customer Selection Rules drawer and preserves the underlying customer_policy/backend authority, but the visible navigation shape does **not** match the approved Admin UX.

Approved UX was literal declaration tabs on the selected Build Your Own workspace:

`Default | Editions`

The current candidate instead adds `Editions` as a **third card action** (`View`, `Edit`, `Editions`) through `withComposableEditionsAction()`. `TierEditionsDrawerHost` then opens the Tier drawer directly on the existing Options group. That is functionally reusing the right Edition controller, but it is not the approved tabbed declaration navigation. `Default` is only implicit via View/Edit rather than an actual sibling tab.

Source evidence:
- `tierOccupantCard.ts` appends `{ id: 'editions', label: 'Editions' }` to the card actions.
- `TierEditionsDrawerHost.tsx` explicitly describes itself as the composable occupant's third card action and merely forces the existing drawer to `initialTierGroup="options"`.

This is a presentation/interaction mismatch, not an architecture failure. The underlying reuse of `TierDrawerHost` / existing Edition controller is acceptable.

## Required correction — Phase 3 only
From clean current production `main@3cc88e83...` (do not stack the rejected candidate into eventual main ancestry):
1. Keep the retirement of the standalone Customer Selection Rules destination.
2. Do **not** add a third `Editions` card action to the Build Your Own card.
3. When the Build Your Own occupant is selected/opened in its existing right-side workspace, render a real two-option declaration switcher/tab strip: **Default | Editions**.
4. **Default** must be the existing Build Your Own declaration workspace/content — same Details/Inclusions/Pricing Rules/etc., same lifecycle.
5. **Editions** must switch the same workspace to the existing Edition list/detail/session using the existing Edition controller/state. Do not route through a separate third card action just to land on Options.
6. The tab switch itself must not mutate Default or Edition data. Returning to Default must restore the same occupant workspace state as appropriate.
7. Ordinary Tier/Add-on UX remains unchanged.
8. No new backend route, entity, draft, endpoint, identity, or Edition controller. No customer-facing source changes.
9. Update focused contracts to prove an actual `Default | Editions` sibling navigation exists for the composable occupant and that no `editions` third card action exists.
10. Preserve all otherwise-correct Phase 3 removals/refactors where applicable, but prepare the final accepted tree as one clean review branch from current production `main` per branch hygiene rules.
11. Run tsc, build/docs check and focused Admin/Edition/customer-policy contracts; report exact clean branch/SHA/files/tests and set **AWAITING CHATGPT REVIEW**.

Do not push `main`. Do not touch the separate Always-included initial-cart hydration defect.