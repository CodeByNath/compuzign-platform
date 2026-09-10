# Focused Edition Selector Visual Refinement

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed**.
- Production `main`: `6239c0532d8ba80f344a1fc7b452e841ded6e72f`.
- Approved candidate: `review/focused-cue-target-tap-highlight` @ `1a9b6cc0322e662dbad233532c44bd1ad40bbe30`.
- Independent GitHub compare: **1 ahead / 0 behind**, merge base exact production `6239c053`.

## Live defect
On touch/responsive devices, tapping a cue destination still briefly painted a light-blue rectangle across the whole invisible destination button. This is not the keyboard focus outline, not the removed CSS hover slab, and not the cue-ball transition.

## Audit result
The correction is exact and narrow. The shared cue target remains a real transparent `<button>` spanning the full destination slice. Candidate `1a9b6cc0` adds only `-webkit-tap-highlight-color: transparent;` to that target so WebKit/Blink/Android WebView native tap paint no longer fills the entire invisible button rectangle.

The existing `:focus-visible` outline is untouched. The target remains `background: transparent`, keeps the same geometry/hit area and still receives pointer/touch events itself. No JS touch handler, timeout, selector fork, destination identity change, routing change, pricing change, catalogue change or state workaround was introduced.

## Independent diff verification
GitHub compare confirms a single clean commit from current production. Only three files changed:
- source customer CSS: native tap-highlight suppression;
- built customer CSS: rebuilt equivalent;
- existing focused selector presentation contract: property 10 for touch highlight while retaining all prior checks.

No TS/TSX application source changed. The candidate commit directly shows the exact CSS addition and contract coverage. 

## Validation accepted
Claude reports TypeScript/build/docs and the same focused customer contracts/regressions pass. The updated contract checks source + shipped CSS for transparent tap-highlight suppression and proves the real button, transparent background, focus outline, hit-area behavior, no-hover state and no cue-ball transition remain intact.

## Must preserve
One `Upgrade your build` heading; no CSS hover slab; immediate cue-ball snap; full touch/click target; keyboard focus indicator; real Edition IDs; cue labels; exact catalogue/preview switching; normal Tier/Edition focused-shell behavior.

## Must remove
Only the browser-native touch tap flash/light-blue full-rectangle paint.

## Must not substitute
No `outline: none`, focus suppression, pointer-events tricks, shrunken/replaced button, JS touch handlers, timeout/state workaround, route/data/pricing changes.

## Claude — next action
Fast-forward **exactly `1a9b6cc0322e662dbad233532c44bd1ad40bbe30`** to `main`. Do not amend or add changes.

After push:
1. record resulting `main` SHA and tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. confirm topic branch is an ancestor of `main`, then delete it local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Required live validation
On a real touch/responsive device, tap `Default` ↔ an Edition repeatedly. The destination must switch immediately with no light-blue/full-rectangle tap flash. Keyboard focus must still show the existing focus indicator when navigating without touch.
