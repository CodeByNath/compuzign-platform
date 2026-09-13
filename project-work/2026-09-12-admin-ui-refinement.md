# Admin UI Refinement

## Status
- **SOURCE PUSH APPROVED**
- Builder: **Codex**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `974c025c0d2d07421c6d6399834428bc95b9cf63`
- Approved topic head: `d07c73c7312316ba2ff6994f100f142046164be9`

## Current live defect
The supplied Admin screenshots establish that the Focused inclusions card for `2 vCPU` omits its Platform ID while the same row's existing drawer Overview already shows `CZPRCI36GRM`. This is a presentation defect, not an identity-assignment defect.

## Reviewer audit
GitHub confirms `admin-ui-refinement` is 2 commits ahead of current production and 0 behind, with merge base exactly at `974c025c`.

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

## Next action
Builder may move the **exact approved head `d07c73c7312316ba2ff6994f100f142046164be9`** to `main` with no amendment or unrelated source changes. After push, record the resulting `main` SHA and deployment workflow result here, then stop for Reviewer deployment verification and targeted live validation of the focused inclusion Platform ID display.
