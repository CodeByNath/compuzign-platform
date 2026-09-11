# Single Visible Tier Permanent Focus

## Status
- **SOURCE PUSH NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `2c2c83e2096872b2847300afef307ffe27441af8`.
- Rejected candidate: `bb4adfd4185f1dbe032427a8b468aabc20f98086` (tree `56c3994bfc2ec537663b8c5bc1f3f9961bd9cb94`).
- Review branch: `lone-tier-active-customer-group`.

## Nath's exact rule
The existing globally-lone Family no-X behavior gains one additional qualifying case:

**If the active customer group has exactly one normal Tier occupant, that Tier's focused shell has no X and the customer-group tabs remain visible.**

This must be true because the Tier is lone in that customer group, not only while the shell happens to be implicit.

Add-ons are not part of customer-group Tier counting. Do not change Cart, Upgrade, Add-ons, All Plans, quote logic, pricing, Commercial Legs, Plan Details, audience filtering, or Family membership in this round.

## Auditor review of candidate
The candidate correctly adds `loneWithinActiveCustomerGroup` and locks the **implicit** single-Tier landing. It also correctly updates the stale cross-audience Code Map and preserves the production base as one clean commit.

But it does **not** fully implement Nath's rule. Source still says and implements:

```ts
const isLockedSingleTierLanding = isImplicitSingleTierView
  && (!singleTierIsQuoted || familyOffersNothingElse || loneWithinActiveCustomerGroup);
```

and explicitly documents that `View Plan` / explicit focus remains unlocked and keeps the sticky X. The focused render also shows customer tabs only under `isImplicitSingleTierView`.

Therefore a Tier that is lone in the active customer group can still acquire an X and lose the customer-group tabs when reached through an explicit focused route (for example a `View Plan` route from downstream Recommendations). That violates the requested invariant and leaves the same implicit-vs-explicit loophole that caused the defect class.

## Must preserve
Existing globally-lone behavior; current staging/Cart/Upgrade/Add-on behavior; exact Tier/Edition identity and reload parity; customer-group switching; no Family/Tier hardcoding.

## Must remove
For a normal Tier that is the **only normal Tier visible in the active customer group**, remove the X regardless of whether its focused shell was entered implicitly or explicitly. Keep the customer-group tabs visible for that lone-in-group focused shell whenever both groups exist. No one-card fallback from that shell.

## Must not substitute
Do not remove X from focused Tiers when the active group contains multiple normal Tiers. Do not make Add-ons part of the count. Do not alter downstream Cart/Upgrade/Add-on rules. Do not redesign navigation.

## Claude — correction
Reuse the same review branch but rebuild the next review as one clean candidate from current production `main` per branch-hygiene rules.

Make the **lone-in-active-group fact**, not `isImplicitSingleTierView`, the authority for X suppression and customer-tab visibility on that Tier's focused shell. Preserve the existing globally-lone rule as well.

Add regression coverage that explicitly enters the same lone-in-group Tier through an explicit `View Plan`/focused route and proves:
1. no X;
2. customer-group tabs remain visible;
3. switching customer group still works;
4. a multi-Tier active group still gets the ordinary X on explicit focus.

Retain the existing cross-group implicit coverage. Run the same focused validation/baseline checks, record the new exact SHA/tree/files here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.
