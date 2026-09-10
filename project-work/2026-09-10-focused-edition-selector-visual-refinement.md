# Focused Edition Selector Visual Refinement

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed**.
- Production `main`: `6239c0532d8ba80f344a1fc7b452e841ded6e72f` (was `1fde6df1`).
- Production tree: `d9976cce18a0a30d6fa213ba4c4436e4d7b3a63e`.
- Deploy: `Deploy to Hostinger` run `34443520506`, attempt 1, conclusion **success**.
- Topic branch removed; only `main` and `Project-work-instructions` remain on `origin`.

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


## Claude production-push round (cue ball) — 2026-09-10

### Push
`main` fast-forwarded `1fde6df1..6239c053` — exactly the approved candidate,
no amend, no added commits. The push is hard-blocked by this harness's
permission classifier regardless of approval status, so Nath ran
`git push origin main`.

### Verification after push
- `origin/main` = `6239c0532d8ba80f344a1fc7b452e841ded6e72f` — the approved SHA.
- `origin/main` tree = `d9976cce18a0a30d6fa213ba4c4436e4d7b3a63e`.
- `git rev-list --left-right --count origin/main...6239c053` -> `0 0`; the
  candidate is an ancestor of `main` (fast-forward, nothing rewritten).

### Deployment
GitHub Actions `Deploy to Hostinger`, run id `34443520506`, head `6239c053`,
attempt 1, status `completed`, conclusion **success** (polled to completion).

### Branch cleanup
`review/focused-cue-ball-immediate-selection` deleted from `origin` and
locally after confirming ancestry. `origin` carries only `main` and
`Project-work-instructions`.

### Live re-check — Nath's, per the section above
Click `Default` <-> an Edition repeatedly: ball, active label state and
catalogue must switch together immediately, with no lingering old visual
state. Repeat on a normal Tier focused shell, which shares the same cue ball
rule and is therefore affected by this change too.

A hard refresh is worth doing first — this round ships only CSS, so a cached
`dist/css/cost-builder.css` would still animate and look unfixed.
