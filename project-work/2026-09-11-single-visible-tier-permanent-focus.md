# Single Visible Tier Permanent Focus

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `2c2c83e2096872b2847300afef307ffe27441af8`.

## Live defect
Nath supplied APTOS Enterprise live screenshots showing this sequence:
1. Enterprise has one visible normal Tier -> focused shell (correct).
2. Add to Quote with no Add-on/Upgrade step -> focused shell stays + Cart appears (correct).
3. The shell exposes an X; dismissing it produces a one-card Tier view + Cart; reopening with View Plan hides the customer-group tabs and shows X again (wrong).

## Root cause
Current source deliberately treats a single visible Tier as permanently locked only when the whole Family is globally lone (`familyOffersNothingElse`). A Family with another normal Tier in another audience is therefore treated as dismissible. `isLockedSingleTierLanding` depends on `familyOffersNothingElse`, while explicit `View Plan` sets `focusedTierId`, making `isImplicitSingleTierView` false; that is why the customer tabs disappear and X returns.

The current Code Map also explicitly documents the now-wrong cross-audience rule: "X shown, Cart visible." This is not a random runtime regression; it is an architectural exception that was preserved in the last navigation round and must now be removed.

## Nath's corrected invariant
For the **currently selected customer group**, if exactly one normal Tier is visible, that Tier is the permanent presentation for that group.

- No one-card fallback for that group.
- No X on that single-Tier focused shell, before or after quote.
- Customer-group tabs remain visible whenever the Family has both groups available, so those tabs are the navigation away from the single Tier.
- After Add to Quote, if there is no blocking Add-on/Upgrade workspace, the focused shell remains and Cart appears beside it.
- Reload must preserve the same focused shell + exact quoted Edition + Cart state.
- Switching customer group resolves that group's own presentation normally.

Add-ons/Upgrade remain authoritative intermediate steps: if quoting the single visible Tier should stage Recommendations, the focused shell still yields to that existing stage exactly as today.

## Must preserve
Resolved-step Cart model; Upgrade CTA Cart suppression; Add-on/Upgrade staging; exact quoted Tier/Edition identity; Add-on Edition identity; quote/cart mutation; pricing/Legs; Family membership; audience filtering; Plan Details.

## Must remove
- The rule that another normal Tier in another audience makes the current single-visible Tier dismissible.
- The one-card fallback reached by X for a group with exactly one visible normal Tier.
- X on that single-visible Tier shell.
- Loss of customer-group tabs when the same single-visible Tier is reopened/represented after quote.

## Must not substitute
Do not hide the customer-group tabs to achieve permanence. Do not collapse audience groups. Do not treat Family-wide occupant count as the lock criterion. Do not add persistent navigation flags or CSS-only hiding.

## Required implementation/audit scope
Use current `main`; inspect `FamilyTierAdapter.tsx`, `single-occupant-quoted-focus-regression.mjs`, `tier-next-step-navigation-regression.mjs`, and `docs/code-map/package-builder-tier-navigation.md` / focused-shell map. Make the smallest architectural correction so **visible normal Tier count for the active audience** owns permanence, while existing Recommendations precedence still wins after quote.

Add mounted regression coverage for: one Tier in active audience + another Tier in other audience; no X; tabs visible; Add to Quote -> focused + Cart; reload same; switching audience works; no one-card fallback; explicit interaction must not convert this permanent shell into dismissible explicit focus.

Create one clean review branch from current `main`, update affected Code Maps because the documented cross-audience rule changes, run focused regressions + TypeScript/build/docs and relevant baseline comparison, record exact SHA/tree/files here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.
