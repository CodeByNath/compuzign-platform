# Admin UI Refinement

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Codex**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `d07c73c7312316ba2ff6994f100f142046164be9`
- Pushed Builder correction `admin-ui-refinement`: `965c41e0`

## Current live defect
The supplied Admin screenshots establish that the Focused inclusions card for `2 vCPU` omits its Platform ID while the same row's existing drawer Overview already shows `CZPRCI36GRM`. This is a presentation defect, not an identity-assignment defect.

## Post-deployment correction

The deployed `d07c73c` label change exposed the actual missing link: every
card showed `Platform ID not assigned` even while the opened `2 vCPU` drawer
showed `CZPRCI36GRM`. The fallback was false, not evidence of missing data.

`usePackageStation.tierView()` reconstructs selections through the shared
`resolveRateSheetSelection()` function. That function had dropped the bound
Rate Sheet row's existing `platform_id`. The drawer reads the same row directly,
which is why it remained correct.

Pushed candidate `965c41e0` preserves `rateItem.platform_id` in that shared
selection projection and adds a runtime contract for `CZPRCI36GRM`. It changes
no identity assignment, endpoint, persistence, price, quantity, or selection
behaviour. It is not yet on `main`.

## Earlier reviewer audit
GitHub confirmed `admin-ui-refinement` was 2 commits ahead of the original production base and 0 behind, with merge base exactly at `974c025c`.

The candidate intentionally contains:
1. `821c7d94` — exact revert of the earlier `974c025c` migration-notice change made from the wrong missing-ID diagnosis.
2. `d07c73c7` — focused lower-deck presentation fix.

The focused fix uses the already-resolved `DeckInclusion.platformId` and renders the identity reference explicitly as `Platform ID · <CZPRCI>`. No lookup, repair action, assignment path, pricing logic, selection behavior, endpoint, or persistence mutation is added.

The existing read projection that carries stored `cz_platform_id` into selection `platform_id` remains intact. Regression coverage still verifies that projection and now also asserts the focused lower-deck source renders the Platform ID reference explicitly.

## Safeguards verified
- No Platform-ID assignment/migration behavior is introduced by this candidate.
- The unrelated migration-notice change is removed.
- No pricing, selection, connection, or identity-persistence behavior changes.
- Prior accepted Admin UI work remains outside this correction.
- Builder reports focused workspace contract, TypeScript, production build, and `git diff --check` passing.

## Production handoff

Builder fast-forwarded GitHub `main` from `974c025c` to `d07c73c`. Its live
result exposed the resolver omission above. **Deploy to Hostinger** run
`34750364010` served that failed presentation; no live-data mutation was made.

Reviewer must audit the pushed `965c41e0` candidate before any new `main` push,
then verify that the Focused inclusions card displays the same `CZPRCI36GRM`
shown in its Overview drawer. Builder stops here pending that independent review.
