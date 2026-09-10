# Focused Edition Selector Visual Refinement

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `1fde6df1e976704fac964b16a419047569621ec5`.
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
