# Single Visible Tier Permanent Focus

## Status
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Stop — architectural risk**.
- Production `main`: `2c2c83e2096872b2847300afef307ffe27441af8`.
- Rejected candidate: `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f` (tree `771639952fce7e092d2e5e64af5b73ccab141acb`).
- Review branch: `lone-tier-active-customer-group`.

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
