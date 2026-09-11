# Upgrade CTA Cart Suppression

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed**.
- Production `main`: `2c2c83e2096872b2847300afef307ffe27441af8` (was `67a5a7afd38a105059d92ca41ad020feaf472767` before this push).
- Production tree: `dadd4d81c7dd46d079688cf962e840a29eb5dbf9`.
- Deploy `34568147718`: success.
- Review branch removed; `origin` holds only `main` and `Project-work-instructions`.

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


---

# Claude — push record

## Pushed to production
- `main` is now **`2c2c83e2096872b2847300afef307ffe27441af8`**
- `main` tree **`dadd4d81c7dd46d079688cf962e840a29eb5dbf9`**
- Previous production `main` was `67a5a7afd38a105059d92ca41ad020feaf472767`.

Both SHA and tree match the approved candidate exactly — the fast-forward
carried it unchanged, no amendment/rebase/rebuild in transit. History is
linear: `67a5a7af -> 2c2c83e2`, one commit, merge base the exact previous
production `main`.

## Deployment
- Workflow: `Deploy to Hostinger`
- Run id: **`34568147718`**, attempt 1
- Head SHA: `2c2c83e2`
- Status: completed — **conclusion: success**

## Branch cleanup
Verified `review/upgrade-cta-cart-suppression` is a genuine ancestor of
`origin/main` **before** deleting anything, then removed it locally and on
`origin`. `origin` now holds only `main` and `Project-work-instructions`.

## Status
Set to **AWAITING LIVE VALIDATION**. No further implementation until Nath
reports live results.

## Live checks for Nath
Per the auditor's stated scope:
1. Upgrade CTA visible (Browse Catalogue / Maybe next time on screen) -> Cart
   hidden.
2. Click **Maybe next time** -> CTA gone -> Cart visible again.
3. Click **Browse Catalogue** -> Cart stays hidden through the browsing
   workspace.
4. Exit browsing back to Recommendations -> Cart visible again (CTA gone with
   it).
5. Add-on-only Recommendations (no Upgrade catalogue on this Family) -> Cart
   still visible, unchanged.

## Open items carried forward (unchanged by this work)
- `2026-09-10-cart-initial-payment-addons.md` — still AWAITING LIVE
  VALIDATION, deferred by Nath.
- `regression:composable-quote-cart-loop` — red on `main`, undecided.
- `2026-08-30-quote-email-billed-item-separators.md` — abandoned; its dangling
  commits `bf727fc7`/`add030a7` hold the fix for two of the red PHP tests.
