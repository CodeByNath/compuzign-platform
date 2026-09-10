# Focused Edition Selector Visual Refinement

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed**.
- Production `main`: `1fde6df1e976704fac964b16a419047569621ec5`.
- Approved candidate: `review/focused-cue-ball-immediate-selection` @ `6239c0532d8ba80f344a1fc7b452e841ded6e72f`.
- Independent GitHub compare: **1 ahead / 0 behind**, merge base exact production `1fde6df1`.

## Live defect
After the prior heading/hover refinement deployed, clicking another cue destination still appeared to leave the old selection visible briefly before the ball moved. Nath live-reported this immediately.

## Audit result
The correction is exact and narrow. `EditionCueSelector` already calls `onSelect(destination.id)` directly from the click handler, so selection state is not delayed. The remaining perceived lag was entirely the CSS animation on `.cz-package-builder__cue-ball`:

`transition: left var(--cz-transition-fast);`

Candidate `6239c053` removes only that positional transition. The ball now snaps to the selected destination in the same render that changes the Edition/catalogue. It does not replace the animation with a shorter transition, timeout, deferred state change, or content delay.

## Independent diff verification
GitHub compare confirms a single clean commit from current production. Only three files changed:
- source customer CSS: remove cue-ball `left` transition;
- built customer CSS: rebuilt equivalent;
- existing focused selector presentation contract: extend with no-transition + immediate-click assertions.

No TS/TSX application source, routing, Edition identity, Rate Sheet/catalogue logic, pricing, quote behavior, cue geometry, target size, labels, hover rule, or focus-visible behavior changed.

## Validation accepted
Claude reports TypeScript/build/docs and the same focused customer contracts/regressions pass. The updated contract proves source + shipped CSS contain no cue-ball transition while size/shadow/geometry and direct `onClick -> onSelect(destination.id)` behavior remain intact.

## Must preserve
One `Upgrade your build` heading; no hover slab; full click/touch target; keyboard focus indicator; real Edition IDs; cue labels; exact catalogue/preview switching; normal Tier/Edition focused-shell behavior.

## Must remove
Only the delayed/animated cue-ball positional transition.

## Must not substitute
No timeout/state workaround, delayed content swap, hidden cue ball, shortened animation, shrunken targets, new selector, or route/data/pricing changes.

## Claude — next action
Fast-forward **exactly `6239c0532d8ba80f344a1fc7b452e841ded6e72f`** to `main`. Do not amend or add changes.

After push:
1. record resulting `main` SHA and tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. confirm topic branch is an ancestor of `main`, then delete it local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Required live validation
Click `Default` ↔ an Edition repeatedly. Ball/active state and catalogue must switch together immediately with no lingering old visual state. Re-check the same snap behavior on a normal Tier focused shell.
