# Focused Edition Selector Visual Refinement

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed**.
- Production `main`: `de4ad6fa906741ba1d561d29c2e74bda6c539fba`.
- Scope: customer focused-shell heading + shared Edition cue hover presentation only.

## Live finding
Nath live-validated the just-deployed composable Edition catalogue repair: switching `Default` ↔ `Subscriptions` changes the actual Upgrade catalogue rows. That prior work is closed.

The remaining screenshots show presentation duplication:
1. In focused composable browsing, the active composable declaration label (`Default` / `Subscriptions`) is rendered as a large heading above the cue selector even though the cue already labels those destinations.
2. `Upgrade your build` should be the one stable heading for this focused composable surface, independent of which cue destination is selected.
3. Hovering a cue destination creates a large rectangular/slab background. Nath wants that visible hover background removed for the **shared focused-shell Edition cue selector**, including normal Tier/Edition focused shells, not only composable.

Source confirms the duplicate heading in `FamilyTierAdapter.tsx`: focused composable browsing currently renders `cz-package-builder__focused-name` from the selected Edition/composable label, then renders `EditionCueSelector(showLabels)`, while `ComposableOfferBrowser` separately owns the `Upgrade your build` browse content below.

## Claude — implementation
From current `main`, one narrow topic branch.

1. Focused composable browsing: replace the dynamic declaration heading above the cue with the fixed customer heading **`Upgrade your build`**.
2. Do not render `Default`, `Subscriptions`, or any other composable Edition label as an additional large heading. The cue labels remain the declaration names.
3. Remove the redundant inner `Upgrade your build` heading from the browse content if keeping it would create a second copy. Preserve the subordinate `Recommended Upgrades` text and catalogue/filter structure.
4. For `EditionCueSelector`, remove the **visible large rectangular hover background** from `.cz-package-builder__cue-target` across all focused-shell callers. Preserve the full invisible click/tap target, pointer interaction, `aria-label`, `aria-current`, keyboard focusability and cue-ball/label selected state.
5. Do not remove or reduce focus-visible accessibility. If current hover and focus share one rule, split them so hover slab is gone while keyboard focus still has a clear non-obstructive indicator.
6. Do not change Edition identities, selection state, catalogue filtering, pricing, quote behavior, focused-shell routing, cue geometry or mobile hit areas.
7. Rebuild generated customer asset if this repo requires it; add/update focused presentation regression/contract only as narrowly needed.
8. Push review branch only, record SHA/diff/tests, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
Shared `EditionCueSelector`; destination IDs; clickable/touchable target size; keyboard accessibility; selected cue-ball/label state; composable catalogue behavior just accepted; normal Tier/Edition focused flow.

## Must remove
Dynamic `Default`/Edition large heading in focused composable browsing; duplicate `Upgrade your build` title; visible cue-target hover slab.

## Must not substitute
No composable-only duplicate selector/CSS, no shrinking hit targets, no disabling keyboard focus, no hiding cue labels, no route/state changes, no redesign of the cue control.
