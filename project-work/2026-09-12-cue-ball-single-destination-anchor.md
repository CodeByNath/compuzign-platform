# Cue Ball — Single-Destination Anchor

## Status
- **AWAITING CHATGPT REVIEW** — new, separate work item.
- Baseline `main`: `80676874e6da8728dfefee8115628d0cb296196d`.
- Commit: `924c560e6f62da5f7bafcdc0f27ea02c5149964c`; tree `26e03908e3a6ad95a793438cb8b48942e5fc99a1`.
- Currently sitting **on top of** review branch `responsive-modal-close-and-focused-entry`, after approved candidate `0d5e242b`.

## Why it is on that branch
Nath asked for this during the same session, after `0d5e242b` was already approved SHA-exact with "fast-forward unchanged". Amending or rebuilding that candidate would have silently changed an audited tree, and the branch cap (main + coordination + 1 topic) leaves no room for a fourth branch while the approved one is still unmerged.

So it was committed **after** the approved SHA. `0d5e242b` remains byte-identical and independently fast-forwardable; this commit is not carried by that fast-forward. Once `main` holds the approved candidate, this can move to its own topic branch.

## Nath's instruction
`.cz-package-builder__cue-ball` should sit at `left: 0` when there is only one destination. It was centred.

## Change
`EditionCueSelector` (`FamilyTierAdapter.tsx`) — one value:

```
const cuePercent = hasEditions ? (activeIndex / (destinations.length - 1)) * 100 : 50;   // before
const cuePercent = hasEditions ? (activeIndex / (destinations.length - 1)) * 100 : 0;    // after
```

With nothing to switch between, a centred ball invented a midpoint on a track that has only one position. `0%` is the same place the first destination of a multi-destination track already occupies, so the indicator reads as "here, at the beginning" in both cases.

No CSS change. `--cz-cue-inset` (11px) already exceeds the ball's own 9px half-width, so `translate(-50%)` at `0%` lands it inside the track rather than clipping at the edge — this is the same inset reasoning the track's original comment records.

The stale comment "a centered cue ball" on the no-Edition branch was corrected to match.

## Boundary
Presentation only, and only the `hasEditions === false` branch. The multi-destination formula, pots, click targets, `aria-current`/`aria-label`, the group role, `showLabels`, and the deliberate absence of a positional transition on the ball are all untouched. No Tier/Edition/composable identity, quote, pricing or navigation behavior is involved.

## Files changed
- `resources/ts/components/package-builder/FamilyTierAdapter.tsx` (one value + two comments)
- rebuilt `dist/`

## Validation
`tsc --noEmit` clean; `npm run build` clean; `docs:check` passes.
PASS: contract:focused-edition-selector-presentation (the contract that owns this control), responsive-focused-entry, package-builder-regression-lock, package-builder-customer-tabs, composable-edition-resolution, composable-recommendations-cta, manage-build, plan-details-value-states.

## Not verified
No browser/live verification; no local WP environment exists.

## Open question for the auditor
Should a contract lock the single-destination anchor at `0%`? `focused-edition-selector-presentation-contract.ts` owns this control but currently asserts nothing about `cuePercent`. Not added unilaterally.
