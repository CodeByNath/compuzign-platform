# Upgrade CTA Cart Suppression

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `67a5a7afd38a105059d92ca41ad020feaf472767`.
- This is a small follow-up to the now-CLOSED Tier navigation stabilization. Do not reopen or alter that closed file.

## Nath's refinement
When the **Upgrade your build** CTA itself is visible inside Recommendations — the state with the two actions **Browse Catalogue** and **Maybe next time** — the Cart should be hidden.

This is intentionally narrower than the prior navigation rule. Do not change any other state:
- Add-on-only Recommendations -> Cart remains visible.
- Upgrade CTA visible (`pending`) -> Cart hidden.
- Browse Catalogue / Upgrade browsing -> Cart hidden, unchanged.
- After **Maybe next time** dismisses the CTA -> normal Recommendations resume and Cart becomes visible again.
- After leaving Upgrade browsing back to Recommendations with CTA dismissed -> Cart visible again.
- Globally lone Tier -> existing focused/no-X + Cart behavior unchanged.
- Normal Tier card/focused Add to Quote with no intermediate step -> Cart visible, unchanged.
- Cross-audience and explicit focused inspection behavior unchanged.

## Implementation boundary
Add one narrow condition to the existing resolved navigation model. Do **not** add a new persistent `showCart` flag, do not redesign `resolvedStep`, and do not change quote/cart mutation, Upgrade eligibility, CTA actions, Add-on presentation, Plan Details, pricing, Commercial Legs, or identity.

Prefer expressing this as Cart suppression when the current resolved Recommendations state also has the active Upgrade gate in `pending` state. The actual rendered CTA is the authority: suppression must correspond to the same condition that renders **Browse Catalogue** + **Maybe next time**.

## Required regression changes
Update the mounted navigation regression only as needed to lock these exact transitions:
1. Upgrade-only: after Tier Add to Quote, CTA visible + Cart hidden.
2. Click **Maybe next time** -> CTA gone + Cart visible.
3. Upgrade-only: CTA visible -> Browse Catalogue -> Cart remains hidden while browsing -> exit -> Cart visible.
4. Add-ons + Upgrade: while CTA visible, Cart hidden; after **Maybe next time**, add-ons return + Cart visible.
5. Add-on-only Recommendations still show Cart.

## Must preserve
The accepted `resolvedStep` architecture; all Tier/Edition reload and exact-Edition fixes; Add-on exact Edition card state; X/View Plan behavior; Upgrade browsing behavior; all quote/cart data semantics.

## Must remove
Only Cart visibility while the Upgrade CTA with Browse Catalogue / Maybe next time is actually on screen.

## Must not substitute
Do not hide Cart for all Recommendations. Do not hide Add-ons beyond their existing CTA presentation rule. Do not alter CTA wording/actions. No CSS-only workaround.

Create one clean review branch from current `main`, make the minimum change, run the focused navigation regressions plus TypeScript/build/docs and relevant baseline comparison, record exact SHA/tree and changed files here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.


---

# Claude — implementation record

## Branch
- `review/upgrade-cta-cart-suppression`, pushed to `origin`.
- Commit **`2c2c83e2096872b2847300afef307ffe27441af8`**, tree
  **`dadd4d81c7dd46d079688cf962e840a29eb5dbf9`**.
- Branched from production `main` `67a5a7afd38a105059d92ca41ad020feaf472767`;
  exactly 1 ahead / 0 behind, merge base is that exact `main`.
- `main` NOT pushed.

## What changed

One derived boolean added to the existing `resolvedStep`/`quoteSuppressed`
model in `FamilyTierAdapter.tsx` — no new persistent state, no change to
`resolvedStep`'s own shape or values:

```
const upgradeCtaVisible = resolvedStep === 'recommendations' && upgradeGateActive === 'pending';
const quoteSuppressed = resolvedStep === 'tier_landing'
  || resolvedStep === 'focused_inspection'
  || resolvedStep === 'upgrade_browsing'
  || upgradeCtaVisible;
```

`upgradeCtaVisible` reuses the exact `upgradeGateActive === 'pending'`
expression that already gates `recommendationsCta`'s own render a few
hundred lines below — the actual rendered CTA is the authority, not a
second/parallel eligibility check, per the work file's own instruction.

## Confirmed scope

- Add-on-only Recommendations (no catalogue; `upgradeGateActive` stays
  `null` for the whole Family) never touches this branch — Cart stays
  visible, unchanged.
- "Maybe next time" and exiting Browse Catalogue both clear
  `upgradeGateActive` back to `null`/leave it non-`'pending'`, landing on
  ordinary Recommendations where `quoteSuppressed` is false again.
- `upgrade_browsing` (Browse Catalogue) was already suppressing; the CTA's
  own suppression is now continuous with it — no Cart flicker on that
  transition, tested explicitly.
- Nothing else touched: no change to CTA actions/wording, quote/cart
  mutation, Upgrade eligibility, Add-on presentation, Plan Details, pricing,
  Commercial Legs, or identity.

## Coverage

`scripts/tier-next-step-navigation-regression.mjs` updated in place — **81
checks** (was 78), covering exactly the five transitions the work file
specifies:
1. catalogue-only: CTA visible -> Cart hidden;
2. Maybe next time -> CTA gone -> Cart visible;
3. CTA visible -> Browse Catalogue -> Cart stays hidden throughout -> exit ->
   Cart visible;
4. add-ons + catalogue: CTA visible -> Cart hidden; Maybe next time -> add-ons
   return + Cart visible;
5. add-on-only Recommendations (section 5, pre-existing) still shows Cart —
   re-verified unchanged, not re-asserted as new coverage.

`single-occupant-quoted-focus-regression.mjs` and
`family-tier-membership-boundary-regression.mjs` were checked for any
`cartVisible`/CTA assumption this touches — neither asserts Cart visibility
for a catalogue-CTA-visible state, so neither needed a change.
`composable-recommendations-cta-contract.ts` asserts the CTA's own render
condition and `hideAddonsInRecommendations` wiring (source-text, unrelated
to Cart visibility) — unaffected, not modified.

## Validation

- `npx tsc --noEmit` — clean.
- `npm run build` — clean; `dist/js/cost-builder.js` rebuilt.
- `npm run docs:check` — clean: 118 Markdown files, 47 Code Maps, 22 history
  records (no Code Map touched this round — the existing
  `package-builder-tier-navigation.md` step table already describes
  `recommendations` at the step level; this change is a narrowing inside
  that step, not a new step, and doesn't warrant a rewrite there yet unless
  the auditor wants one added now).
- Full JS suite (every `contract:*` + `regression:*`): **92 pass / 8 fail**,
  the identical failure set already recorded as pre-existing on `main` in
  the prior closed round (`contract:admin-station-css`,
  `contract:package-builder-flow`, `contract:platform-identity-schema`,
  `regression:tier-system-footer-loop`,
  `regression:composable-quote-cart-loop`,
  `regression:tier-occupant-lifecycle`, `regression:tier-edition-lifecycle`,
  `regression:tier-publish-timeout`). No new failure.
- No browser/live validation performed. No PHP tests run.

## Status
Set to **AWAITING CHATGPT REVIEW**. No further source work until the
verdict.
