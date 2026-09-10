# Focused Edition Selector Visual Refinement

## Status
- **AWAITING CHATGPT REVIEW**
- Candidate: `review/focused-cue-target-tap-highlight` @ `1a9b6cc0`, 1 ahead / 0 behind `main@6239c053`. `main` NOT pushed.
- Prior auditor verdict: **Proceed with safeguards**.
- Production `main`: `6239c0532d8ba80f344a1fc7b452e841ded6e72f` (unchanged).
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


## Claude correction round (tap highlight) — 2026-09-10

Branch `review/focused-cue-target-tap-highlight`, one commit `1a9b6cc0`,
parent `main@6239c053`. Three files, +45/-1. No TS/TSX application source.

### Change
`resources/css/modules/cost-builder.css` — `.cz-package-builder__cue-target`
gains `-webkit-tap-highlight-color: transparent`, with a comment recording
that it suppresses the browser/WebView NATIVE tap paint (the third distinct
thing that painted this rectangle, after the CSS hover slab and the focus
outline) so a later reader does not mistake it for either.

`dist/css/cost-builder.css` rebuilt. The shipped rule is now:

```
cz-package-builder__cue-target{position:absolute;top:0;bottom:0;padding:0;
margin:0;border:0;background:transparent;border-radius:var(--cz-radius-sm);
cursor:pointer;-webkit-tap-highlight-color:transparent}
```

### Explicitly not done (the must-not-substitute list)
- No `outline: none` anywhere on the target; `:focus-visible` is byte-identical.
- No `pointer-events` on the target — the button still receives touch across
  its full area itself.
- No JS touch handler, no timeout/state workaround.
- `background: transparent` unchanged — the native paint is suppressed, not
  covered with an opaque fill.
- The destination is still a real `<button type="button">` at its existing
  size; nothing was shrunk or swapped for a non-button element.
- Nothing touched in routing, Edition ids, click handler, cue labels, ball
  state, catalogue, preview or pricing.

### Coverage
`scripts/focused-edition-selector-presentation-contract.ts` gains property 10:
- `-webkit-tap-highlight-color: transparent` present in the source rule
  (comments stripped first, as with the ball rule, since the rule explains
  itself in prose);
- present in the shipped `dist/css/cost-builder.css` too, so a source-only
  edit without a rebuild fails;
- the target still declares `background: transparent`;
- no `outline: none` on the target;
- no `pointer-events` on the target;
- the destination is still a real `<button>` carrying the cue-target class.

Properties 1-9 (single fixed heading, no duplicate title, accessible section
name, cue semantics, no hover slab in source and built CSS, unchanged target
geometry, intact `:focus-visible`, no cue-ball transition, direct
`onClick -> onSelect`) all still run and pass.

**Verified failing at `main@6239c053`**: reverting the CSS alone fails "the
cue target suppresses the browser/WebView native tap highlight …".

### Check results
- `npx tsc --noEmit`: clean. `npm run build`: success.
- `node scripts/docs-check.mjs`: passed — 117 Markdown files, 46 Code Maps.
- Contracts PASS (same set as previous rounds):
  `focused-edition-selector-presentation`, `composable-recommendations-cta`,
  `composable-offer-eligibility`, `composable-edition-resolution`,
  `package-builder-customer-tabs`, `manage-build`, `upgrade-build-footer`,
  `composable-quote-cart`, `package-builder-regression-lock`,
  `package-builder-addon-focus`.
- Regressions PASS: `quoted-single-tier-dismissible`,
  `family-tier-membership-boundary`.
- PHP suite not re-run: this commit changes CSS, its build output and one
  contract script only.

### Unresolved risks
- `-webkit-tap-highlight-color` is a WebKit/Blink property with no standard
  equivalent. It covers iOS Safari, Chrome/Edge and Android WebViews — i.e.
  every engine that paints this highlight — but a future engine adopting a
  different native tap paint would not be covered by it, and no contract can
  detect that from source.
- Automated coverage here is source/CSS-level; nothing in this repo drives a
  real touch device, so the absence of the flash itself is Nath's live
  re-check to confirm.
- This round is CSS-only again: a cached `dist/css/cost-builder.css` will
  still flash on tap and look unfixed. Hard-refresh before re-checking.
