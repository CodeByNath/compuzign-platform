# Upgrade CTA Cart Suppression

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed**.
- Production `main`: `67a5a7afd38a105059d92ca41ad020feaf472767`.
- Approved candidate: `2c2c83e2096872b2847300afef307ffe27441af8`.
- Candidate tree: `dadd4d81c7dd46d079688cf962e840a29eb5dbf9`.
- Review branch: `review/upgrade-cta-cart-suppression`.
- Independent compare: exactly **1 ahead / 0 behind**, merge base is exact production `main`.

## Nath's refinement
When the **Upgrade your build** CTA itself is visible inside Recommendations — the state with **Browse Catalogue** and **Maybe next time** — the Cart must be hidden.

Accepted behavior:
- Add-on-only Recommendations -> Cart visible.
- Upgrade CTA visible (`pending`) -> Cart hidden.
- Browse Catalogue / Upgrade browsing -> Cart hidden.
- **Maybe next time** -> CTA gone; Cart visible again.
- Exit Upgrade browsing -> Cart visible again.
- Globally lone Tier, ordinary Tier Add to Quote, cross-audience, explicit focused inspection -> unchanged.

## Audit result
The candidate is correctly narrow. `FamilyTierAdapter.tsx` adds one derived fact:

```ts
const upgradeCtaVisible = resolvedStep === 'recommendations'
  && upgradeGateActive === 'pending';
```

`quoteSuppressed` then includes `upgradeCtaVisible`. This preserves the accepted `resolvedStep` architecture and adds no persistent Cart state. The condition reuses the same `upgradeGateActive === 'pending'` fact that renders the CTA, so suppression tracks the actual CTA rather than re-deriving Upgrade eligibility.

Independent diff from production contains only:
- `resources/ts/components/package-builder/FamilyTierAdapter.tsx`
- generated `dist/js/cost-builder.js`
- `scripts/tier-next-step-navigation-regression.mjs`

Regression coverage is now 81 mounted checks and explicitly locks CTA-visible hidden Cart, Maybe-next-time restoration, browsing continuity, Add-ons+Upgrade, and unchanged Add-on-only Recommendations. Claude reports TypeScript/build/docs green and no new JS baseline failures.

## Must preserve
All previously accepted navigation behavior, Tier/Edition reload parity, exact quoted Edition state, Add-on exact Edition card state, X/View Plan routes, quote/cart mutation, Upgrade eligibility, Plan Details, pricing, Commercial Legs and identity.

## Must remove
Only Cart visibility while the Upgrade CTA with Browse Catalogue / Maybe next time is actually on screen.

## Must not substitute
Do not hide Cart for all Recommendations. Do not alter CTA wording/actions. Do not change Add-on presentation or add a persistent `showCart` state.

## Claude — next action
Fast-forward **exactly `2c2c83e2096872b2847300afef307ffe27441af8`** to `main` unchanged. Do not amend or add source changes.

After push:
1. record exact `main` SHA/tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. verify `review/upgrade-cta-cart-suppression` is an ancestor of `main`, then delete it local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Live validation
Confirm only: CTA visible -> Cart hidden; Maybe next time -> Cart visible; Browse Catalogue -> Cart hidden; exit browsing -> Cart visible; Add-on-only Recommendations still show Cart.
