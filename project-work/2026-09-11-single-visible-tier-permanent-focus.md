# Single Visible Tier Permanent Focus

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- Source push: **done**. Production `main` is `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f` (tree `771639952fce7e092d2e5e64af5b73ccab141acb`), a clean fast-forward from `2c2c83e2096872b2847300afef307ffe27441af8` — exactly the approved candidate, unchanged.
- Deploy `34598333341` (`Deploy to Hostinger`): **attempt 1 failed, attempt 2 succeeded**. The change is now genuinely on the live site.
- Review branch `lone-tier-active-customer-group`: removed (local and remote). Remote now contains only `main` and `Project-work-instructions`.

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

**Deployment: succeeded on attempt 2.** GitHub Actions run `34598333341` (`Deploy to Hostinger`, `.github/workflows/deploy.yml`, run number 1011, event `push`) for head SHA `7ffd3e4b`:

| Step | Attempt 1 | Attempt 2 |
|---|---|---|
| 4 Checkout repository | success | success |
| 5 Setup Node.js | success | success |
| 6 Install frontend dependencies | success | success |
| 7 Build frontend assets | success | success |
| **8 Deploy source via SSH** | **failure** | success |
| **9 Deploy built dist assets via SCP** | **skipped** | success |
| Job `deploy` conclusion | **failure** | **success** |

Attempt 1 failed in the host-transfer step (`appleboy/ssh-action`), which also skipped the `dist` upload — so after attempt 1 neither source nor built assets had reached the host and live was still the old `2c2c83e2` build. A re-run (attempt 2) completed green end to end, including **both** transfer steps, so source and built assets are now genuinely on the live host.

**On the attempt-1 failure:** root cause was never established — run logs return HTTP 403 unauthenticated and `gh` is not installed in this environment, so the failing step's output could not be read, and no cause is claimed here. What is on record: every CI build step passed on both attempts (consistent with the green local `tsc`/`build` above), the failure sat purely in host transfer, the previous seven deploys on `main` were all green, and an unchanged re-run of the same commit succeeded. That pattern is consistent with a transient host/SSH condition and inconsistent with anything in this candidate, but it is **not proof** — if `Deploy to Hostinger` fails again on an unrelated commit, treat it as its own infrastructure work item rather than re-opening this one.

## Live validation — what to exercise

The Family shape that matters is **one normal Tier occupant visible in the active customer group, with at least one more normal Tier in the other group**. Worth checking:
1. that lone Tier's focused shell shows **no X**, before and after Add to Quote;
2. the **customer-group tabs stay visible** on it, and switching group lands on the other group's own presentation;
3. reaching the same Tier through **View Plan** (explicit focus) also shows no X and keeps the tabs — this is the case the second audit pass added;
4. a customer group holding **two or more** normal Tiers still gets the **ordinary X** on explicit focus, and its tabs behave as before;
5. Cart, Add-ons, Upgrade, Editions, Plan Details and pricing all unchanged throughout.
