# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — REVERT LAST PRODUCTION COMMIT COMPLETELY**
- Auditor verdict: **Proceed**.
- Current production `main`: `a584ede09aeb65f242be26ce5317a5fc9825a05b` (deploy #977 Success, live rejected).
- Required restored tree: exact parent state `af01ebb10a49ca66091b504eba54e8c21d597387`.
- **Do not start another redesign/correction until this revert is independently reviewed, pushed, deployed, and live accepted.**

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

## After rollback is accepted
We will restart from the restored pre-`a584ede` behavior and define the next change from Nath's screenshots/rules only. No prior proposed redesign survives automatically.