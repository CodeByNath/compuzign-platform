# Single Visible Tier Permanent Focus

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Stop — architectural risk**.
- Production `main`: `2c2c83e2096872b2847300afef307ffe27441af8`.
- Blocked candidate: `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f` (tree `771639952fce7e092d2e5e64af5b73ccab141acb`) — untouched, still on the review branch.
- Review branch: `lone-tier-active-customer-group`.
- Audit only this pass. **No source modified, nothing committed to the review branch, `main` not pushed.**
- **The blocking premise does not hold on production — see the audit below before actioning any option.**

## What the candidate gets right
The corrected candidate now implements Nath's narrow no-X rule across both implicit and explicit focus:
- lone normal Tier in the active customer group -> no X;
- customer-group tabs remain visible;
- multi-Tier active group explicit focus still gets X;
- no Family/Tier hardcoding;
- Cart/Upgrade/Add-on pricing/quote logic is not directly rewritten.

The branch is one clean commit ahead of production, and Claude's focused validation is green.

## Blocking issue found by Claude and confirmed by audit
The candidate itself exposes a capability regression in the **lone-in-group + same-group Add-on** case.

Current production flow can stage the quoted primary into Recommendations when an Add-on exists. From there the customer can use **View Plan** to inspect the quoted Tier and then use the focused shell's X to return directly to Recommendations.

The candidate correctly removes that X because the Tier is lone in the active customer group — but it supplies no equivalent direct return path. Claude's own mounted run confirms the customer can only recover by either:
1. switching customer-group tabs away and back; or
2. removing and re-quoting the primary.

Those are extra customer actions and are not acceptable substitutes for the existing downstream return capability. Passing regressions does not override this capability loss.

This is exactly the interaction risk Nath wanted us to stop rather than patch around blindly.

## Must preserve
- lone-in-active-group Tier has no X and keeps customer-group tabs;
- existing globally-lone behavior;
- Add-on Recommendations remain reachable and do not become a dead-end/detour;
- exact Tier/Edition identity, reload parity, Cart/Upgrade/Add-on behavior, quote mutation, pricing/Legs;
- multi-Tier focused Tier keeps ordinary X behavior.

## Must remove
Only the X/dismiss-to-one-card behavior for a Tier that is lone in the active customer group.

## Must not substitute
Do not use customer-group switching, primary removal/requote, hidden Add-ons, or loss of View Plan as the replacement route back to downstream Recommendations. Do not redesign All Plans or broader navigation without Nath approving that separately.

## Claude — next action: audit only, no patch
Do not modify source yet. On the same work item, report the **smallest source-level way to preserve a direct return from an explicitly opened lone-in-group Tier back to its existing downstream Recommendations without restoring X**.

Audit current focused-shell entry/exit and Recommendations ownership and give 1-2 narrowly scoped options, with exact affected booleans/components and trade-offs. Do not touch Cart, Upgrade, quote mutation, pricing, Add-on architecture, or introduce Family/Tier special cases.

Record the options here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.

## Claude — audit result

### 1. Correcting my own earlier claim: the capability being "lost" does not exist on production

My previous hand-off said the explicit route's sticky X "was the way back to Recommendations… it is genuinely gone now." **That was wrong, and I did not verify it before writing it.** The audit brief then carried it forward as the blocking issue. Correcting it here.

I mounted the real `FamilyTierAdapter` from production `main` (`2c2c83e2`) through the same happy-dom/esbuild/Preact harness the committed regressions use, drove it with real clicks, and recorded where each control actually lands. Temporary probe only — deleted after the run, nothing committed, tree clean.

Observed on **production `main`**, lone-in-group Tier + same-group Add-on:

| Step | Result |
|---|---|
| Add to Quote | staged Recommendations, Add-on visible |
| → View Plan | explicit focused shell, **X present** |
| → click X | **comparison grid. `staged=false`, Add-on NOT visible** |
| → View Plan → X again | same grid again; Add-on never returns |
| → remove primary, re-quote | Recommendations returns, Add-on visible |
| (alt) `← All plans` from Recommendations | auto-focused lone-Tier shell; Add-on NOT visible |

So on production today, **the X does not return to Recommendations — it lands on the grid and destroys the Recommendations context.** Cause is one statement in the X handler, `FamilyTierAdapter.tsx:1517`, which clears `stagedTierId` alongside the focus state; `stagedTier` (`:714`) then derives null and the staged branch can no longer render.

**Control case** — an ordinary Add-on Family with no cross-group Tier, so the lone-in-group rule is not involved at all — behaves identically (`staged=false`, Add-on not visible after X). The staged-context loss is generic to the X, not something this work item's rule introduces.

### 2. What this means for the block

- There is **no existing direct-return capability to preserve**. On `main`, once the customer leaves Recommendations by *either* route (View Plan, or `← All plans`), the only way back to the Add-on offer is remove-and-re-quote — the exact route the brief calls an unacceptable substitute. That is already production behaviour, not a candidate regression.
- On this axis the candidate is **better than production, not worse**: with no X there is nothing to clear `stagedTierId`, so the staged context survives, and the customer-group tab round-trip lands back on the staged Recommendations view (verified in the previous pass). `main` has no equivalent, because its X destroys staging permanently.
- Net: the candidate removes a control that led to the grid, and leaves intact a context that production throws away. I could not reproduce a capability the candidate loses relative to production.

### 3. Options, if a direct return is still wanted

Because nothing exists to restore, both options below **add a new capability**. That is a scope decision for Nath, not a fix for a regression.

**Option A — dedicated back control in the focused shell (smallest, recommended if anything is done).**
- Render condition: `stagedTier !== null` (already derived at `:714`, in scope at the focused branch `if (focusedTier)`, `:1365`). Narrow to `focusedTierIsLoneInActiveGroup && stagedTier !== null` to touch only the blocked case.
- onClick: `setFocusedTierId(null); setFocusedEditionId(null);` — deliberately **not** `setStagedTierId(null)` and **not** `setSingleTierDismissedTierId(...)`. `stagedTier` then re-resolves and the existing `else if (stagedTier)` branch renders Recommendations. No new state, no new branch, no new derived rule.
- Reuses the existing `.cz-package-builder__focused-back` control the staged header already renders (`:1901`), so no new CSS and no atomic-engine/`cz-station-*` collision question.
- Trade-offs: adds a control to a shell meant to stay minimal; needs a label decision; X and the new control would deliberately differ (X → grid, back → Recommendations), which must be intentional rather than accidental; if not narrowed it also appears for ordinary staged Tiers, changing the control case above.

**Option B — stop the X destroying the staged context, and let the X survive where a real destination exists.**
- Exclude the staged case from the lock (`focusedTierIsLoneInActiveGroup && stagedTier === null`) and make the X's `setStagedTierId(null)` conditional rather than unconditional.
- Satisfies "remove only the X/dismiss-to-one-card behavior" literally — the X would return to Recommendations instead of a one-card grid.
- Trade-offs: **conflicts with the Must-preserve line "lone-in-active-group Tier has no X"** — Nath would have to say which invariant wins. Also `setStagedTierId(null)` is load-bearing: the comment at `:1512` records it as the fix for a real stale-staging defect (closing focus for a Tier other than the quoted one fell through to whatever WAS staged), so it cannot simply be dropped — it needs guarding by `stagedTierId === selectedTierId`, which is what `stagedTier` already tests. Larger and riskier than Option A, and it touches a previously-reported defect's fix.

**Option 0 — no source change (my recommendation).** The block rests on a premise that production does not exhibit. Accept the candidate as it stands, and treat "a direct return from a focused shell to Recommendations" as a separate work item if Nath wants it — noting it would improve the ordinary Add-on flow too, not just this case.

I have not implemented any of these. Awaiting direction.
