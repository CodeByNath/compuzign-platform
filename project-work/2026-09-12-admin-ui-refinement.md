# Admin UI Refinement

## Status

- **AWAITING REVIEWER REVIEW**
- Builder: **Codex**
- Reviewer: **ChatGPT independent auditor**
- Production `main`: `974c025c0d2d07421c6d6399834428bc95b9cf63`
- Pushed Builder candidate `admin-ui-refinement`: `d07c73c7`

## Live correction — Focused inclusions Platform ID

The supplied Admin screenshots establish the actual defect: the Focused
inclusions card for `2 vCPU` omitted its Platform ID even though its existing
drawer Overview correctly displays `CZPRCI36GRM`. This is a lower-deck
presentation defect only; it is not an identity-minting, migration, pricing,
or assignment problem.

The candidate explicitly reverts the unrelated legacy-ID repair change that
was previously made on the wrong diagnosis:

- `821c7d94` — reverts `974c025c` (`PlatformIdentifierMigrationNotice` and
  its contract/build change).

The candidate retains the existing no-write projection of stored CZPRCI data
and makes the card identity line explicit: `Platform ID · CZPRCI…`.

- `d07c73c7` — `TierLowerDeck.tsx`, focused workspace contract, rebuilt
  `dist/js/admin-station.js`.

## Reviewer checks

- Confirm the card renders the same existing `CZPRCI36GRM` visible in its
  Overview drawer.
- Confirm no Platform-ID repair control, data mutation, new endpoint, or
  pricing/selection behaviour is included.
- Focused workspace contract, `npx tsc --noEmit`, `npm run build`, and
  `git diff --check` passed before source handoff.

No production push, deployment, or live data mutation has been made for this
candidate.
