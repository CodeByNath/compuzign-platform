# Focused Edition Selector Visual Refinement

## Status
- **AWAITING CHATGPT REVIEW**
- Candidate: `review/focused-cue-ball-immediate-selection` @ `6239c053`, 1 ahead / 0 behind `main@1fde6df1`. `main` NOT pushed.
- Prior auditor verdict: **Proceed with safeguards**.
- Production `main`: `1fde6df1e976704fac964b16a419047569621ec5` (unchanged).
- Deploy: `Deploy to Hostinger` run `34439695707`, attempt 1, **success**.
- Only `main` and `Project-work-instructions` remain on origin.
- **SOURCE PUSH NOT APPROVED.**

## Live validation result
Nath confirms the heading cleanup and hover-slab removal are correct, but the selector is not yet fully right: after clicking another destination, the control visibly remains on the old selection for a brief moment before the selected cue moves/switches.

## Auditor finding
This is the same presentation work item, not a new architecture issue.

Source shows `EditionCueSelector` updates selection directly in the click handler (`onClick={() => onSelect(destination.id)}`), so there is no intentional delayed state transition in the selector path. The visible lag is instead encoded in CSS on the selected cue ball:

` .cz-package-builder__cue-ball { transition: left var(--cz-transition-fast); } `

The ball therefore animates from the previous destination to the new destination after state has already changed. That creates the impression that the old tab remains selected before the new one takes over. The cue labels themselves have no transition.

## Required behavior
Clicking a focused-shell Edition destination must make the selected state visually **immediate**. This selector is declaration switching, not a progress animation; the cue ball should snap to the chosen destination in the same render that changes the Edition/catalogue.

## Claude — correction
From current production `main`, one narrow review branch:
1. Remove the `left` transition from `.cz-package-builder__cue-ball` in source CSS. Do not replace it with a shorter animation.
2. Rebuild the shipped CSS asset.
3. Keep cue geometry, ball size/shadow, target hit areas, labels, focus-visible outline, destination IDs and click handler unchanged.
4. Extend the existing focused selector presentation contract to prove the cue ball has **no positional transition** in source and built CSS while all prior no-hover/accessibility checks remain.
5. Run the same focused customer contracts/regressions used in the previous round.
6. Push review branch only, record SHA/diff/tests here, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
One `Upgrade your build` heading; no hover slab; full click/touch target; keyboard focus indicator; real Edition IDs; cue labels; exact catalogue/preview switching; normal Tier/Edition focused-shell behavior.

## Must remove
The cue ball's delayed/animated positional transition after selection.

## Must not substitute
No timeout/state workaround, no delayed content swap, no hiding the cue ball during change, no shrinking targets, no new selector implementation, no route/data/pricing changes.

## Live re-check after deployment
Click `Default` ↔ an Edition repeatedly. Ball/active state and catalogue should switch together immediately with no lingering old visual state. Re-check the same behavior on a normal Tier focused shell.


## Claude correction round (cue ball) — 2026-09-10

Branch `review/focused-cue-ball-immediate-selection`, one commit `6239c053`,
parent `main@1fde6df1`. Three files, +43/-3.

### Change
`resources/css/modules/cost-builder.css` — `.cz-package-builder__cue-ball`
loses `transition: left var(--cz-transition-fast)`. Nothing replaces it: no
shorter duration, no alternative animation. A comment in the rule records why,
so a later reader does not "restore" it as a missing polish.

Your diagnosis matches the source exactly: `onSelect(destination.id)` fires
straight from the click handler, so state was always immediate — only the
ball's own `left` animation ran after the fact, which is what read as the old
destination staying selected.

`dist/css/cost-builder.css` rebuilt; the shipped rule is now
`…transform:translate(-50%,-50%);pointer-events:none;z-index:1}` with no
`transition`.

### Untouched (verified by the contract, not just by reading)
Ball `width`/`height`/`border-radius`/`box-shadow`/`transform`/`position`/
`top`/`pointer-events`; cue track geometry and `--cz-cue-inset`; every cue
target declaration and therefore the full click/tap and mobile hit area; the
`:focus-visible` outline; cue labels and `showLabels`; destination ids;
`aria-current`/`aria-label`; the click handler itself. No TS/TSX file changed
in this round at all.

### Coverage
`scripts/focused-edition-selector-presentation-contract.ts` gains property 9:
- no `transition` declaration in `.cz-package-builder__cue-ball` in the source
  CSS — comments stripped before the check, since the rule now documents in
  prose why the animation is gone;
- no `transition` in the shipped `dist/css/cost-builder.css` rule either, so a
  source-only edit without a rebuild fails;
- all eight geometry/appearance declarations still present, proving only the
  animation was removed;
- `onClick={() => onSelect(destination.id)}` still present — locking out the
  "must not substitute" list: no timeout, deferred state or delayed content
  swap could pass in place of the removed animation.

Properties 1-8 from the previous round (single fixed heading, no duplicate
title, accessible section name, cue semantics, no hover slab in source and
built CSS, unchanged target geometry, intact focus indicator) all still run
and pass unchanged.

**Verified failing at `main@1fde6df1`**: reverting the CSS alone fails "the
cue ball declares no transition at all …".

### Check results
- `npx tsc --noEmit`: clean. `npm run build`: success.
- `node scripts/docs-check.mjs`: passed — 117 Markdown files, 46 Code Maps.
- Contracts PASS (same set as the previous round):
  `focused-edition-selector-presentation`, `composable-recommendations-cta`,
  `composable-offer-eligibility`, `composable-edition-resolution`,
  `package-builder-customer-tabs`, `manage-build`, `upgrade-build-footer`,
  `composable-quote-cart`, `package-builder-regression-lock`,
  `package-builder-addon-focus`.
- Regressions PASS: `quoted-single-tier-dismissible`,
  `family-tier-membership-boundary`.
- PHP suite not re-run beyond the previous round's result: no PHP, TS or
  template file changed in this commit — CSS, its build output and one
  contract script only.

### Unresolved risks
- A CSS-only property this contract cannot observe: the ball's position is
  driven by an inline `left: N%` style, and with no transition a browser
  paints it in the same frame as the catalogue swap. Nothing else on the
  track animates, so there is no remaining source of perceived lag in the
  selector itself — but if the live re-check still shows one, it would be
  coming from the catalogue render below, not this control.
