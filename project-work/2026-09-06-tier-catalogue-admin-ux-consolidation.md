# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — rollback only**
- Auditor verdict: **Proceed**.
- Production `main`: `a584ede09aeb65f242be26ce5317a5fc9825a05b` (deploy #977 Success, live rejected).
- Approved rollback candidate: `28b6859c1efab5044ac761f360852a19988de7b2`.
- Required restored tree: `af01ebb10a49ca66091b504eba54e8c21d597387`.

## Independent audit
I independently compared `af01ebb10...` -> `28b6859c...` through GitHub.

Result:
- merge base is exactly `af01ebb10...`;
- candidate is two commits ahead (`a584ede...` + its revert);
- **changed files: none**.

So the rollback candidate's repository tree is identical to the required pre-`a584ede` state. This independently confirms Claude's local `git diff` evidence.

The rollback mechanism is also correct: normal revert commit on top of shared `main`, no production history rewrite.

## Claude — next action
Push **only** `28b6859c1efab5044ac761f360852a19988de7b2` to `main` as the rollback.

Then:
1. report the resulting exact `main` SHA;
2. report GitHub Actions Deploy to Hostinger run/result;
3. do not implement any new correction or redesign;
4. set **AWAITING LIVE VALIDATION**.

After deployment, Nath will confirm the live site is back to the pre-`a584ede` behavior. Only after that do we restart the design/work from scratch.

## Locked rollback boundary
- preserve none of `a584ede` for this phase;
- no new Build Your Own route/card;
- no shared-focused-shell rewrite from that commit;
- no visibility correction yet;
- no replacement behavior bundled into rollback.