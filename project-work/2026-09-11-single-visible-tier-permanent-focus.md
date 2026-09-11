# Single Visible Tier Permanent Focus

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main` (branch point): `2c2c83e2096872b2847300afef307ffe27441af8`.
- Candidate branch: `lone-tier-active-customer-group`, pushed to origin, exactly one commit ahead of `main`.
- Candidate commit: `bb4adfd4185f1dbe032427a8b468aabc20f98086`.
- Candidate tree: `56c3994bfc2ec537663b8c5bc1f3f9961bd9cb94`.
- `main` not touched. No push to `main`.

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

## Implementation

`FamilyTierAdapter.tsx` adds one new derived condition, scoped to normal-Tier
count only (add-ons/catalogue untouched):

```ts
const loneWithinActiveCustomerGroup = singleVisibleTier !== null && normalOccupants.length > 1;
```

`isLockedSingleTierLanding` becomes:

```ts
const isLockedSingleTierLanding = isImplicitSingleTierView
  && (!singleTierIsQuoted || familyOffersNothingElse || loneWithinActiveCustomerGroup);
```

`normalOccupants` is the existing Family-wide normal-Tier list; `singleVisibleTier`/`normalTiers` are the existing audience-filtered ones. `loneWithinActiveCustomerGroup` is true only when the active group's one visible Tier is not the Family's only normal Tier overall — i.e. another normal occupant exists, but solely behind the OTHER group's tab. An add-on or Upgrade catalogue in the active group is unaffected: those already stage the primary via `commitSelection()`, so a quoted single occupant with same-group add-ons never reaches this fallback at all, exactly as before.

No change to Cart eligibility, customer-group filtering/switching, staging, Edition identity, pricing, or Commercial Legs. Customer-group tabs are untouched and remain the way off the now-locked landing.

Updated stale comments/docs that described the old "cross-audience keeps its X" behavior: the multi-paragraph comment blocks around `singleVisibleTier`/`familyOffersNothingElse`/`isLockedSingleTierLanding` in `FamilyTierAdapter.tsx`, the `resolvedStep` step-matrix comment, and `docs/code-map/package-builder-tier-navigation.md`.

One observation for the reviewer, not acted on unilaterally: `singleTierDismissedTierId`/`singleTierDismissed` (the X-click dismissal state) no longer has any live path that sets it — the only case that used to reach `isImplicitSingleTierView && singleTierIsQuoted && !familyOffersNothingElse` was exactly this cross-group case, which is now also locked before the X can render. Left in place since removing it wasn't asked for in this round; flagging in case the auditor wants a follow-up to remove it.

## Regression coverage

Both `scripts/single-occupant-quoted-focus-regression.mjs` (section 10a) and `scripts/tier-next-step-navigation-regression.mjs` (sections 10–11) had their cross-audience assertions flipped from "X returns once quoted" to "X stays hidden," and gained new checks for the exact cross-customer-group case: tabs stay visible on the locked quoted landing, quoted-state removal goes through the shell's own toggle (never a dismiss-to-card path, since there is no card), re-quoting lands back on the locked shell, and switching to the other group's tab and back preserves the first Tier's locked quoted state. Section 10b (an add-on, not a normal Tier, hidden in the other group) is deliberately unchanged — add-ons stay outside customer-group Tier counting, confirmed still passing.

## Evidence

- `npx tsc --noEmit`: clean, no errors.
- `npm run build`: succeeds, `dist/js/cost-builder.js` regenerated and included in the candidate commit.
- `npm run docs:check`: passes (118 Markdown files, 47 Code Maps, 22 numbered history records).
- `npm run regression:single-occupant-quoted-focus`: 66 checks passed, same count as unmodified `main` (checks removed from the old X-click/View-Plan-reopen flow in section 10a offset by new tab-visible/tab-switch-back checks added for the locked case).
- `npm run regression:tier-next-step-navigation`: 78 checks passed (was 81 on `main`; the drop is the removed X-click/View-Plan-reopen assertions in section 10, which tested a flow that no longer exists once the X is hidden — replaced with new tab-switch-back coverage for the same case).
- `npm run contract:package-builder-customer-tabs`: passes.
- `npm run contract:package-builder-regression-lock`: passes.
- `npm run contract:package-builder-addon-focus`: passes.
- Baseline comparison against unmodified `main` (branch point `2c2c83e2`) for adjacent package-builder/tier suites: `regression:cart-bundle-upgrade-refinements` (48 passed), `regression:cart-initial-payment-addons` (24 passed), and `regression:family-tier-membership-boundary` (all passed) are clean on both `main` and the candidate. `regression:tier-system-footer-loop`, `regression:composable-quote-cart-loop`, `regression:tier-occupant-lifecycle`, and `regression:tier-edition-lifecycle` fail identically on unmodified `main` and on the candidate (same assertion/crash in each case) — pre-existing, not introduced by this change. `composable-quote-cart-loop` matches the already-recorded "pre-existing red on main, undecided" item from `2026-09-11-upgrade-cta-cart-suppression.md`.

Candidate branch `lone-tier-active-customer-group` is exactly one commit (`bb4adfd4185f1dbe032427a8b468aabc20f98086`, tree `56c3994bfc2ec537663b8c5bc1f3f9961bd9cb94`) ahead of `main` (`2c2c83e2096872b2847300afef307ffe27441af8`), touching only: `resources/ts/components/package-builder/FamilyTierAdapter.tsx`, generated `dist/js/cost-builder.js`, `scripts/single-occupant-quoted-focus-regression.mjs`, `scripts/tier-next-step-navigation-regression.mjs`, and `docs/code-map/package-builder-tier-navigation.md`. Pushed to origin. `main` was not pushed to.
