# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed**.
- Pushed: `28b6859c1efab5044ac761f360852a19988de7b2` is now `main` (clean fast-forward from prior `a584ede0`, confirmed via `git merge-base --is-ancestor` before push).
- Deploy: GitHub Actions "Deploy to Hostinger" run #978, commit `28b6859c`, **Success**.
- Restored tree confirmed identical to `af01ebb10a49ca66091b504eba54e8c21d597387` (see prior empty-diff proof).
- Nath to confirm the live site is back to pre-`a584ede` behavior.

## Independent audit
I independently compared `af01ebb10...` -> `28b6859c...` through GitHub.

Result:
- merge base is exactly `af01ebb10...`;
- candidate is two commits ahead (`a584ede...` + its revert);
- **changed files: none**.

So the rollback candidate's repository tree is identical to the required pre-`a584ede` state. This independently confirms Claude's local `git diff` evidence.

The rollback mechanism is also correct: normal revert commit on top of shared `main`, no production history rewrite.

## Claude — next action
Pushed and deployed (see Status). Waiting on Nath's live confirmation. No new correction/redesign until then.

## Locked rollback boundary
- preserve none of `a584ede` for this phase;
- no new Build Your Own route/card;
- no shared-focused-shell rewrite from that commit;
- no visibility correction yet;
- no replacement behavior bundled into rollback.