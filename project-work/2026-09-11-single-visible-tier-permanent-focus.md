# Single Visible Tier Permanent Focus

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `2c2c83e2096872b2847300afef307ffe27441af8`.

## Nath's exact change
Treat **lone inside the active customer group** as an addition to the existing lone-Family Tier rule.

If the active customer group contains exactly **one normal Tier occupant**:
- show that Tier in the existing focused shell;
- **hide the X**;
- keep the customer-group tabs visible when both customer groups exist;
- do not allow X to fall back to a one-card Tier view.

This is the same presentation already accepted for a globally lone Family, extended to the case where the Tier is lone **within the selected customer group** even if another normal Tier exists in another customer group.

## Scope boundary
This round is deliberately narrow. Do **not** redesign the navigation system, All Plans, Cart, Add-ons, Upgrade flow, quote behavior, or business-group architecture.

Add-ons remain outside customer-group Tier counting and must not affect whether the primary Tier is lone inside the active customer group.

## Must preserve
- existing globally lone Family behavior;
- current customer-group filtering and switching;
- existing focused Tier shell and Edition behavior;
- exact quoted Tier/Edition identity and reload parity;
- current Cart behavior;
- current Add-on and Upgrade behavior;
- pricing, Commercial Legs, Plan Details and quote mutation;
- no Family/Tier-name or ID special cases.

## Must remove
Only the ability for a Tier that is the sole normal Tier in the active customer group to become dismissible merely because another normal Tier exists in another customer group.

## Must not substitute
Do not hide customer-group tabs. Do not collapse customer groups. Do not make Add-ons part of customer-group Tier counts. Do not add persistent navigation state or CSS-only suppression. Do not alter Cart/Upgrade/Add-on rules in this round.

## Claude — implementation
Start from current production `main`. Inspect the existing lone-Family logic around `singleVisibleTier`, `isImplicitSingleTierView`, `isLockedSingleTierLanding`, `familyOffersNothingElse`, customer tabs, and the relevant regressions/Code Maps.

Make the smallest generic correction so the **no-X lock applies when either**:
1. the existing globally lone-Family rule applies; **or**
2. the active customer group has exactly one normal Tier occupant.

Ensure a single Tier in one customer group plus a different Tier in the other group still shows customer-group tabs and never shows X for the lone Tier in the active group.

Add focused regression coverage for that exact cross-customer-group case and update any Code Map text that currently says cross-audience single Tier should show X.

Create one clean review branch from current `main`, run the focused navigation regressions plus TypeScript/build/docs and relevant baseline comparison, record exact SHA/tree/files/evidence here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.
