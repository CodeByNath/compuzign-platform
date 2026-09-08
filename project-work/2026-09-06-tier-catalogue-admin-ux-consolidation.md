# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- Rollback candidate: `review/upgrade-shell-visual-parity` @ `28b6859c1efab5044ac761f360852a19988de7b2` — a normal `git revert --no-edit a584ede0` on top of current `main` (`a584ede0` is still `main`'s HEAD; this candidate is NOT pushed to `main` yet).
- Production `main` (unchanged, still the live-rejected commit): `a584ede09aeb65f242be26ce5317a5fc9825a05b` (deploy #977 Success, live rejected by Nath).
- Required restored tree: exact parent state `af01ebb10a49ca66091b504eba54e8c21d597387`.
- **Do not start another redesign/correction until this revert is independently reviewed, pushed, deployed, and live accepted.**

### Proof the reverted tree matches `af01ebb1` exactly
```
$ git diff af01ebb1 28b6859c
(empty — 0 lines of output, entire repo, not just the touched-file set)
```
Also confirmed: `git diff af01ebb1 28b6859c --stat` is empty (no files differ at all), and the revert's own file-mode summary matches exactly the inverse of `a584ede0`'s diff — e.g. it re-creates `UpgradeBuildSummary.tsx`, restores `scripts/upgrade-your-build-gate-contract.ts` and `scripts/upgrade-shell-visual-parity-contract.ts`, and deletes `scripts/composable-edition-cue-sync-contract.ts` and `scripts/composable-focused-shell-unification-contract.ts` (both of which `a584ede0` had newly created, not merely edited — verified via `git log --follow` before trusting the revert).

### Validation on the candidate (`28b6859c`)
- `npx tsc --noEmit`: clean.
- `npm run build`: succeeds; `dist/css/cost-builder.css` back to 92.36 kB (matches pre-`a584ede0` size exactly).
- `npm run docs:check`: passes (117 Markdown files, 46 Code Maps, 22 numbered history records).
- All 77 registered `contract:*` scripts: 2 failures — `package-builder-flow`, `platform-identity-schema`. Both are pre-existing/unrelated (previously verified against this same `af01ebb1` baseline in the prior round via `git stash`); since the candidate tree is byte-identical to `af01ebb1`, these are not new.
- Standalone PHP tests (`tests/*.php`, no WP bootstrap in this shell): 7 fail with WP-runtime-only errors (`sanitize_text_field()` undefined, `RequestsController` missing its 2 constructor args, etc.) — these require a WordPress request context this shell doesn't provide, not something the revert changed; the byte-identical-to-`af01ebb1` proof above is the authoritative check for this rollback, not this harness limitation.

## Nath's instruction
Revert **everything introduced by the last production commit `a584ede...`**. Start again only after the platform is back to the exact pre-`a584ede` source state.

This explicitly supersedes the previous instruction to preserve pieces of `a584ede`. Preserve **none** of that commit for this rollback phase.

## Claude — rollback only
Prepare a clean rollback that makes the production source tree for every path touched by `a584ede09aeb65f242be26ce5317a5fc9825a05b` exactly match its parent `af01ebb10a49ca66091b504eba54e8c21d597387`.

Use a normal revert/new commit from current `main`; **do not reset/rewrite shared `main` history**.

### Must do
- revert the full `a584ede` diff, including source, CSS, dist assets, contracts/tests/docs/package changes it introduced;
- do not preserve the shared-focused-shell rewrite, new Build Your Own route/card, deleted gate code, or any other part of that commit;
- do not add replacement behavior in the rollback;
- do not touch unrelated commits before `a584ede`;
- verify the resulting tree against `af01ebb...` for the complete touched-file set.

Return one rollback candidate with exact SHA and proof that `diff af01ebb... <candidate tree>` is empty for the files affected by `a584ede`. Set **AWAITING CHATGPT REVIEW**. Do not push to `main` yet.

Done — see Status above for the candidate, proof, and validation. Not pushed to `main`.

## After rollback is accepted
We will restart from the restored pre-`a584ede` behavior and define the next change from Nath's screenshots/rules only. No prior proposed redesign survives automatically.