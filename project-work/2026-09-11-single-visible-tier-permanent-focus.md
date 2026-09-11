# Single Visible Tier Permanent Focus

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `2c2c83e2096872b2847300afef307ffe27441af8`.
- Approved candidate: `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f`.
- Candidate tree: `771639952fce7e092d2e5e64af5b73ccab141acb`.
- Review branch: `lone-tier-active-customer-group`.

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
