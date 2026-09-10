# Focused Edition Selector Visual Refinement

## Status
- **AWAITING CHATGPT REVIEW**
- Candidate: `review/focused-edition-selector-presentation` @ `1fde6df1`, 1 ahead / 0 behind `main@de4ad6fa`. `main` NOT pushed.
- Prior auditor verdict: **Proceed**.
- Production `main`: `de4ad6fa906741ba1d561d29c2e74bda6c539fba` (unchanged).
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


## Claude implementation round — 2026-09-10

Branch `review/focused-edition-selector-presentation`, one commit `1fde6df1`,
parent `main@de4ad6fa`. Paths under `wp-content/plugins/compuzign-platform/`.

### Changed files
| File | Change |
| --- | --- |
| `resources/ts/components/package-builder/FamilyTierAdapter.tsx` | Focused composable browsing branch: `<h3 class="cz-package-builder__focused-name">` is now the literal `Upgrade your build`, replacing `selectedEdition?.label ?? composableData?.label ?? 'Build Your Own'`. |
| `resources/ts/components/package-builder/ComposableOfferBrowser.tsx` | Its own `<h3>` renders only when `context === 'build_your_own'`; the section carries the title as `aria-label` when the shell above owns the heading. |
| `resources/css/modules/cost-builder.css` | `.cz-package-builder__cue-target:hover { background }` removed, along with the now-unused `transition: background`. |
| `scripts/focused-edition-selector-presentation-contract.ts` | New contract (registered as `contract:focused-edition-selector-presentation`). |
| `dist/css/cost-builder.css`, `dist/js/cost-builder.js` | Rebuilt. |
| `package.json` | Contract registration. |

### Against the numbered instructions
1. Fixed heading `Upgrade your build` above the cue — static text, no
   expression deriving a declaration label.
2. No `Default`/`Subscriptions`/Edition label is rendered as a heading on this
   surface any more; the cue labels (`showLabels`, retained) are the only
   place those names appear.
3. The inner duplicate title is gone in this context only. `Recommended
   Upgrades`, the Category/Service/Sort filters and the catalogue/paging
   structure are untouched. The browse `<section>` keeps an accessible name
   either way: `aria-labelledby` its own heading on `build_your_own`,
   `aria-label="Upgrade your build"` in the focused shell.
4. The hover background is removed from `.cz-package-builder__cue-target`
   itself, so it is gone for **every** focused-shell caller — normal
   Tier/Edition shells included, not just composable. `position: absolute`,
   `top: 0`, `bottom: 0`, `padding/margin/border: 0` and `cursor: pointer`
   are all unchanged, so the full invisible click/tap target and the mobile
   hit area are exactly as before; only the paint is gone.
5. Nothing was split or weakened for accessibility: `:hover` and
   `:focus-visible` were already two separate rules, and the focus rule
   (`outline: 2px solid var(--cz-color-accent); outline-offset: 2px`) is
   untouched in both the source and the built stylesheet. `aria-label`,
   `aria-current`, keyboard focusability and the cue-ball/label selected
   state are unchanged.
6. No change to Edition identities, `composableEditionId` selection state,
   catalogue filtering, pricing, quote behavior, focused-shell routing, cue
   geometry or hit areas. `EditionCueSelector` itself is not edited at all —
   the fix is one CSS rule plus two headings.
7. `dist/css/cost-builder.css` and `dist/js/cost-builder.js` rebuilt; one
   narrow contract added.
8. `review/*` pushed, `main` untouched.

### Coverage
`scripts/focused-edition-selector-presentation-contract.ts` locks: the fixed
heading and that it is static; no `selectedEdition?.label` presentation read
in the branch; cue destinations still built from real Edition ids with
`showLabels` and `aria-current`/`aria-label` intact; the conditional inner
title plus the section's accessible name both ways; `Recommended Upgrades`
and the filter structure; absence of any `cue-target:hover` rule in **both**
`resources/css/modules/cost-builder.css` and the shipped
`dist/css/cost-builder.css`; every geometry declaration of the target; and
the `:focus-visible` indicator in source and built CSS.

**Verified failing at `main@de4ad6fa`** on both halves independently:
- reverting `FamilyTierAdapter.tsx` alone -> fails "the focused composable
  shell renders the fixed heading `Upgrade your build`";
- reverting the CSS alone -> fails "no :hover rule exists for the cue
  target …".

### Check results
- `npx tsc --noEmit`: clean. `npm run build`: success.
- `node scripts/docs-check.mjs`: passed — 117 Markdown files, 46 Code Maps.
- Contracts PASS: `focused-edition-selector-presentation`,
  `composable-recommendations-cta`, `composable-offer-eligibility`,
  `composable-edition-resolution`, `package-builder-customer-tabs`,
  `manage-build`, `upgrade-build-footer`, `composable-quote-cart`,
  `package-builder-regression-lock`, `package-builder-addon-focus`.
- Regressions PASS: `quoted-single-tier-dismissible` (mounts the focused
  shell and reads `.cz-package-builder__focused-name`/`cue-target` directly),
  `family-tier-membership-boundary`.
- Full PHP suite: 80 pass, the same 7 pre-existing failures as previous
  rounds (unchanged on clean `main`).

### Code Map — deliberately not edited
No Code Map states which component owns this heading or describes the cue's
hover paint, so nothing there became inaccurate.
`docs/code-map/package-builder-focused-shell.md` (the file that describes
this shell) is at **599 of the 600 prose-word cap**, as are the other
candidate maps — adding a sentence would require cutting unrelated prose from
an accepted map. Say so if you want that trade made and I will do it in the
next round.

### Unresolved risks
- The heading is now hard-coded English text in the branch, matching how
  `ComposableOfferBrowser` already derives its own (`'Build Your Own'` /
  `'Upgrade your build'`) — no i18n layer exists on this surface to route it
  through.
- Hover feedback for the cue is now carried by the cursor and the label/ball
  state alone. That is what was asked; if any focused-shell surface relied on
  the slab as its only pointer affordance, it no longer has one.
