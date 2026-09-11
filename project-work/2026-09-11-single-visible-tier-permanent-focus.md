# Single Visible Tier Permanent Focus

## Status
- **DEPLOY FAILED — LIVE VALIDATION BLOCKED** (not `AWAITING LIVE VALIDATION`: the change is on `main` but is **not on the live site**, so there is nothing to validate yet).
- Auditor verdict: **Proceed with safeguards**.
- Source push: **done**. Production `main` is now `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f` (tree `771639952fce7e092d2e5e64af5b73ccab141acb`), a clean fast-forward from `2c2c83e2096872b2847300afef307ffe27441af8` — exactly the approved candidate, unchanged.
- Deploy `34598333341` (`Deploy to Hostinger`, attempt 1): **failure**.
- Review branch `lone-tier-active-customer-group`: still present, deliberately not deleted while the deploy is unresolved.

## Accepted rule
If the active customer group has exactly one normal Tier occupant, that Tier's focused shell has no X and the customer-group tabs remain visible, whether focus was entered automatically or through View Plan. Add-ons are not part of customer-group Tier counting.

## Audit result
The corrected candidate satisfies the narrow rule and preserves the stated non-change boundary:
- lone normal Tier in active customer group -> no X;
- customer-group tabs stay visible;
- switching customer group resolves the new group's own presentation;
- multi-Tier active-group explicit focus keeps the ordinary X;
- no Family/Tier-name or ID hardcoding;
- no direct change to Cart, Upgrade, Add-ons, quote mutation, pricing, Commercial Legs, or Plan Details.

The earlier block is resolved. Production itself does not provide a direct X-to-Recommendations return: the existing X clears staged context and lands on comparison. Therefore the candidate does not remove an existing return capability. A direct focused-shell return to Recommendations would be a separate enhancement.

## Must preserve
Existing globally-lone behavior; customer-group switching; exact Tier/Edition identity and reload parity; Cart/Upgrade/Add-on behavior; quote mutation; pricing/Legs; multi-Tier X behavior.

## Must not change in this round
Do not add a new back control, redesign All Plans, alter Add-on architecture, or change Cart/Upgrade gating.

## Next action
The approved source candidate is `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f` unchanged. After it reaches production, record the exact resulting `main` SHA and deployment evidence here, set **AWAITING LIVE VALIDATION**, and stop for auditor live validation.

## Production push and deployment evidence

**Source push: succeeded.** `main` fast-forwarded from `2c2c83e2096872b2847300afef307ffe27441af8` to `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f`, tree `771639952fce7e092d2e5e64af5b73ccab141acb`, commit subject "Lock the focused shell X when a Tier is lone in the active customer group". SHA and tree match the approved record exactly; no rebase, no amend, nothing added on the way in.

**Deployment: FAILED.** GitHub Actions run `34598333341` (`Deploy to Hostinger`, `.github/workflows/deploy.yml`, run number 1011, event `push`, attempt 1) for head SHA `7ffd3e4b` completed with conclusion **failure**.

Job `deploy` step results:

| Step | Result |
|---|---|
| 4 Checkout repository | success |
| 5 Setup Node.js | success |
| 6 Install frontend dependencies | success |
| 7 Build frontend assets | success |
| **8 Deploy source via SSH** | **failure** |
| 9 Deploy built dist assets via SCP | skipped |

**What this means:** the repository build is fine — dependency install and the frontend build both passed on CI, consistent with the green local `tsc`/`build` recorded above. The failure is in the transfer to the host (`appleboy/ssh-action`), and because step 8 failed, step 9 (the `dist` upload) never ran. **Neither the source nor the built assets reached the live site, so live behaviour is currently still the old `2c2c83e2` build.** Live validation cannot begin until a deploy succeeds.

**Root cause not established.** The run logs return HTTP 403 unauthenticated and `gh` is not installed in this environment, so I could not read the failing step's output. I am not going to guess at a cause. Relevant context, no more: the previous seven deploys on `main` (`2c2c83e2`, `67a5a7af`, `fd287838`, `22b1ff36`, `71773ead`, `8406252c`, `1a9b6cc0`) all succeeded, so this is the first failure in that window, and it sits in the host-transfer step rather than in anything the candidate changed.

**Decisions needed (not taken unilaterally):**
1. Re-run `34598333341` and see whether it was transient, or read its logs to identify the real cause — both need GitHub access I do not have here.
2. If the failure turns out to be environmental (host/SSH credentials, host key, disk), it is unrelated to this work item and should be tracked separately rather than reverting this candidate.
3. `main` currently carries the approved change while the live site does not. If that gap is not acceptable while the deploy is being investigated, say so and I will prepare a revert — I have not done so, since the source itself is approved and passed audit.

Review branch `lone-tier-active-customer-group` has deliberately been kept rather than deleted, so the branch-cap cleanup can happen once the deploy is resolved.
