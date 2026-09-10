# Focused Edition Selector Visual Refinement

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `6239c0532d8ba80f344a1fc7b452e841ded6e72f`.
- Production tree: `d9976cce18a0a30d6fa213ba4c4436e4d7b3a63e`.
- Deploy: `Deploy to Hostinger` run `34443520506`, attempt 1, **success**.
- Only `main` and `Project-work-instructions` remain on origin.
- **SOURCE PUSH NOT APPROVED.**

## Live validation result
Nath confirms the cue-ball snap fix is deployed, but on touch/responsive devices tapping a cue destination still briefly paints a light bluish rectangle across the entire invisible click target. This is not the keyboard focus outline and not the removed CSS hover slab.

## Auditor finding
The shared cue destination is a real transparent `<button>` spanning the full destination slice. Source CSS currently preserves that large hit area with `background: transparent`, but does not suppress the browser/WebView native tap highlight. On touch browsers that highlight is painted over the whole button rectangle, which visually recreates the large hover-looking slab for the duration of the tap.

This is a browser-native touch feedback artifact, not Edition selection state, cue-ball motion, or catalogue timing.

## Claude — correction
From current production `main`, one narrow review branch:
1. Add `-webkit-tap-highlight-color: transparent;` to `.cz-package-builder__cue-target` in source CSS.
2. Rebuild the shipped customer CSS asset.
3. Do **not** remove or alter `:focus-visible`; keyboard focus must remain clearly visible.
4. Do not change `background: transparent`, target geometry, button semantics, destination IDs, click handler, cue labels, ball state, routing, pricing, catalogue, or responsive hit areas.
5. Extend the existing focused selector presentation contract to prove source + built CSS include transparent tap-highlight suppression while prior hover/focus/geometry/no-transition checks still pass.
6. Run the same focused customer contracts/regressions as the previous round.
7. Push review branch only, record SHA/diff/tests here, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
One `Upgrade your build` heading; no CSS hover slab; immediate cue-ball snap; full touch/click target; keyboard focus indicator; real Edition IDs; cue labels; exact catalogue/preview switching; normal Tier/Edition focused-shell behavior.

## Must remove
Only the browser-native touch tap flash/light-blue rectangle on the cue target.

## Must not substitute
No `outline: none`; no focus suppression; no pointer-events tricks; no shrinking/replacing the button target; no JS touch handlers; no timeout/state workaround; no route/data/pricing changes.

## Live re-check after deployment
On a real touch/responsive device, tap `Default` ↔ an Edition repeatedly. The destination must switch immediately with no light-blue/full-rectangle tap flash. Keyboard focus must still show the existing focus indicator when navigating without touch.
