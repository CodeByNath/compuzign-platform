# Cart Upgrade Secondary CTA

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed**.
- Production `main`: `36ba345d920fff59adcd38bafc85d91e2bc3dbc6`.
- Approved candidate: `80676874e6da8728dfefee8115628d0cb296196d`.
- Candidate tree: `3f3b31bbfa679e4b2ebf4195f3a38b8447801c4a`.
- Review branch: `cart-upgrade-secondary-cta`.
- Independent compare: exactly **1 ahead / 0 behind**; merge base is exact production `main`.

## Nath's requested UI change
Cart footer presentation only:
- keep **Review & Finalise Quote** as the primary full-width CTA;
- move **Upgrade your build** directly below it as a full-width secondary CTA;
- secondary rest state: accent border/text, transparent background;
- hover/focus: accent fill with dark text;
- keep **View details** in its existing link-style row above;
- do not change eligibility, callback/routing, quote contents, totals, composable state, Review flow or Upgrade catalogue behavior.

## Audit
Candidate is correctly scoped and preserves behavior. `QuoteSummary.tsx` removes the Upgrade action only from the footer-links row and renders the same `onUpgradeYourBuild` callback after the unchanged primary button inside a new stacked `.cz-quote-summary__footer-actions` wrapper. `View details` retains its existing condition and link class.

The secondary uses the shared `.cz-btn` primitive plus the existing full-width `.cz-quote-summary__cta`. Local emphasis rules only set the requested accent-outline state. The atomic button primitive still supplies shape, sizing, disabled state and focus outline. `AssetLoader.php` confirms `cost-builder.css` depends on `compuzign-atomic-09`, so the module rule loads after the atomic button shorthand as claimed.

Independent diff contains only:
- `resources/ts/components/cost-builder/QuoteSummary.tsx`
- `resources/css/modules/cost-builder.css`
- `scripts/upgrade-build-footer-contract.ts`
- rebuilt `dist/css/cost-builder.css`
- rebuilt `dist/js/cost-builder.js`

No Code Map update is required: ownership/runtime responsibility did not change. Claude reports TypeScript, build, docs and focused Cart/Upgrade contracts green; full-suite failures exactly match clean-main baseline.

## Must preserve
Primary Review action/behavior; View details; exact `onUpgradeYourBuild` eligibility and routing; Cart/Upgrade suppression; responsive behavior; quote/pricing/composable semantics.

## Must remove
Only the old text-link presentation and placement of **Upgrade your build** beside View details.

## Must not substitute
Do not alter eligibility, route through a new state/callback, create a new button system, hide View details, or change Cart totals/Review flow.

## Claude — next action
Fast-forward **exactly `80676874e6da8728dfefee8115628d0cb296196d`** to `main` unchanged. Do not amend or add source changes.

After push:
1. record exact `main` SHA/tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. verify `cart-upgrade-secondary-cta` is an ancestor of `main`, then delete it local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Live validation
Confirm the eligible Cart shows: View details link, primary Review button, then full-width outlined Upgrade button; hover/focus treatment is correct; ineligible Cart has no secondary gap; clicking Upgrade still opens the existing Upgrade browsing route.
