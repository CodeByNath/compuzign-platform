# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `4a73ed87`.
- Reviewed branch tip: `review/composable-edition-set-completeness` @ `53f492b0`.

## Scope lock — Nath approved
Fix **only the composable occupant / Tier Catalogue customer Upgrade path**. Do not alter normal Tier occupants, Add-on occupants, normal Tier Edition behavior, or any other occupant resolver/projection.

Pricing on deployed `4a73ed87` is **PASS** and remains untouched.

## Independent source review
The net diff `4a73ed87..53f492b0` is substantively correct and stays inside the approved composable behavior boundary:
- `ComposableOfferBrowser.tsx`: selected composable Edition uses its own non-empty `inclusions_override`, otherwise falls back to composable Default `offer.inclusions`.
- `PackageRepository::enrichCompiledOccupantIdentity(...)`: normal Tier/Add-on behavior retains the existing `edition_platform_id !== ''` filter through the default `isComposable=false`; only the `composable_offer` call passes `true` and skips that extra visibility filter.
- Active-only eligibility remains upstream; disabled composable Edition coverage is present.
- No pricing resolver/server-preview change is in this round.

The two extra net files beyond the originally named four are acceptable because they are composable-only validation/documentation support:
- `tests/composable-edition-set-projection.php`
- `src/Modules/SurfacePackages/CLAUDE.md` validation-list entry.
They do not alter non-composable runtime behavior.

## Remaining gate — history hygiene only
The branch is **two commits ahead** of `main` (`09f453ec` + `53f492b0`). Project-work rules require one clean final candidate from current production before source-push approval.

Claude: create a **fresh review branch from exactly `main@4a73ed87`** and reproduce the current accepted net tree as **one commit**. Do not use the rejected two-commit branch as final ancestry.

If `git reset` is blocked, use any normal non-reset workflow available to you (for example fresh branch from `main`, apply/cherry-pick the accepted changes without committing intermediate history, then make one commit). Do not change source content while doing this.

Final candidate may contain exactly the current six-file net diff. No additional source/docs/tests.

Report:
- fresh review branch name;
- exact one-commit SHA;
- confirmation `ahead_by=1`, `behind_by=0`, merge base `4a73ed87`;
- confirmation final tree is identical to current reviewed `53f492b0` tree;
- no new test run required if tree is byte-identical.

Set **AWAITING CHATGPT REVIEW** and stop. Do not push to `main`.

**Must preserve:** working pricing, server preview authority, composable Edition resolver, Upgrade journey, label UI, every non-composable occupant path.
**Must not substitute:** any change to normal Tier/Add-on behavior, inactive Edition exposure, hardcoded Edition names/counts, second resolver, or extra customer steps.
