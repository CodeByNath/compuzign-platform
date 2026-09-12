# Cart Upgrade Secondary CTA

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `36ba345d920fff59adcd38bafc85d91e2bc3dbc6`.
- Candidate branch: `cart-upgrade-secondary-cta`, pushed.
- Candidate commit: `80676874e6da8728dfefee8115628d0cb296196d` (parent `36ba345d`).
- Candidate tree: `3f3b31bbfa679e4b2ebf4195f3a38b8447801c4a`.
- `main` not pushed.

## Nath's requested UI change
The Cart footer currently renders `Upgrade your build` as a text-link beside `View details`, above the primary `Review & Finalise Quote` button.

Change only the presentation/order of that existing recovery action:

1. Keep `Review & Finalise Quote` as the primary full-width button.
2. Move `Upgrade your build` to **directly below** it as a full-width secondary button.
3. Secondary treatment:
   - accent border;
   - accent text;
   - transparent/dark background at rest;
   - hover/focus: accent/yellow background with dark text;
   - use the existing CompuZign secondary action/button contract where it already matches (same visual family as the existing outlined Tier `Add to Quote` / choose action); do not create an unrelated bespoke button system.
4. Keep `View details` in its existing link-style/footer-link role above the CTA buttons.

## Scope boundary
This is presentation only. Do not change whether `Upgrade your build` is eligible, its callback/routing, composable state, Cart totals, Review flow, quote contents, pricing, or Upgrade catalogue behavior.

The button must render only under the same existing `onUpgradeYourBuild` condition as today. If no Upgrade recovery action is eligible, there must be no empty secondary-button space.

## Must preserve
- `Review & Finalise Quote` primary action and behavior;
- `View details` behavior;
- current `onUpgradeYourBuild` eligibility and routing;
- Cart/Upgrade suppression rules elsewhere;
- responsive/mobile footer layout;
- CompuZign tokens/shared interaction states and accessibility.

## Claude
Start from current `main`. Inspect `QuoteSummary.tsx` and the owning Cart CSS/shared button primitives. Make the smallest markup/CSS change: remove `Upgrade your build` from the footer-links row, leave `View details` there, and render the existing Upgrade callback as a full-width secondary CTA immediately after the primary Review button.

Reuse the established outlined secondary Tier action styling contract or its shared primitive rather than copying arbitrary colors. Add/update a focused presentation contract/regression proving order, conditional rendering, and class/style ownership. Run TypeScript/build/docs plus relevant Cart/Upgrade regressions. Record exact SHA/tree/files/evidence here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.

---

## Claude — round 1 candidate

### What changed
Presentation and order only, exactly the four points requested.

1. `Review & Finalise Quote` is untouched — same primary
   `cz-btn cz-btn-primary cz-quote-summary__cta` full-width button, same
   `onOpenReview` action, and it still renders first.
2. `Upgrade your build` left the footer-links row and now renders as a
   full-width secondary button directly below the primary. The two are
   grouped in a new `.cz-quote-summary__footer-actions` flex column so the
   pair sits on its own tighter `var(--cz-space-2)` gap (the same gap the
   Tier card's own stacked action pair uses) instead of the footer
   column's much larger `var(--cz-space-5)`, which is what makes it read
   as "directly below" rather than a detached third element.
3. Secondary treatment — accent border, accent label, transparent ground
   at rest; accent/yellow fill with dark text on hover **and** focus.
4. `View details` keeps the footer-links row above the CTAs, unchanged in
   role, classes, alignment and spacing.

### Reusing the existing contract rather than a bespoke button
The shape, size, radius, disabled state and focus ring come from the
shared `.cz-btn` primitive (`atomic-engine/css/04-buttons.css`) plus the
existing `.cz-quote-summary__cta` width rule, so the secondary is a
matched pair with the primary directly above it.

Only the emphasis is set locally, and it is the same accent-outline
recipe the established secondary-action family already uses —
`.cz-cost-builder__tier-choose` (Choose Plan) and the outlined
`.cz-cost-builder__tier-action--addon` (Add to Quote): accent border +
accent label on transparent, filling `var(--cz-color-accent)` with `#000`
text on hover. No new colours, no new tokens, no second button system.

`.cz-btn-secondary` was considered and rejected: it is the white-outline
family (white border/label, white fill on hover), not the accent family
Nath named. No accent-outline `.cz-btn` variant exists today, and adding
one to the atomic engine would be a platform-wide change well outside
this item's scope — so the emphasis stays a Cart-module rule on the class
the Cart already owns.

Cascade is safe by construction: `AssetLoader.php` enqueues
`compuzign-cost-builder` with `compuzign-atomic-09` as its dependency, so
`cost-builder.css` always loads after `.cz-btn`'s own
`border: 1px solid transparent` shorthand and the `border-color` override
wins. This is stated in the CSS comment so the dependency is not
invisible.

### Scope boundary held
- Eligibility, callback and routing: untouched. The button renders only
  under the same `onUpgradeYourBuild &&` condition as before;
  `PackageBuilderApp` still solely decides when the prop is supplied
  (quoted primary + no committed composable line + non-empty
  `resolveComposableEligibleRows(family)`), and `CostBuilderApp.tsx`
  still never references the prop at all.
- No empty secondary space when ineligible: the group always holds the
  primary, and a flex `gap` only applies *between* rendered children, so
  an ineligible render adds nothing.
- Composable state, Cart totals, Review flow, quote contents, pricing and
  Upgrade catalogue behaviour: not touched.
- Responsive/mobile: no `@media` block in the built stylesheet references
  any of these selectors (verified against `dist/css/cost-builder.css`,
  not just the source), and both buttons are full-width in a flex column
  at every width, so the mobile footer layout is unchanged.

### Contract
`scripts/upgrade-build-footer-contract.ts` already locked this footer, and
its clauses 1, 2, 4 and 5 (eligibility, disappearance, `requestManageBuild`
routing, the `start_upgrade` intent guard) are **unchanged**. Only the
presentation clauses it owns were re-locked to the new specified layout:

- the footer-links row contains View details and **no** `onUpgradeYourBuild`;
- the `footer-actions` group exists, and the primary renders **before** the
  secondary in source/DOM order;
- the primary keeps `onOpenReview`;
- the secondary renders only under `{onUpgradeYourBuild && (`;
- the secondary carries exactly
  `cz-btn cz-quote-summary__cta cz-quote-summary__upgrade-your-build` and
  never `cz-btn-primary`;
- it calls `onUpgradeYourBuild` directly, no wrapped/derived argument;
- rest state asserts accent border + accent label + transparent background
  via the shared token, and asserts the old `text-decoration: underline`
  text-link treatment is **gone**, not left behind;
- hover and `:focus-visible` share one rule asserting accent fill + `#000`;
- `.cz-cost-builder__tier-choose:hover` is asserted to still carry that same
  accent-fill recipe, so if the family this reuse claims ever changes, the
  contract fails instead of the claim silently drifting;
- `.cz-quote-summary__footer-actions` is asserted to be a flex column.

### Files
```
resources/ts/components/cost-builder/QuoteSummary.tsx   101 +/-
resources/css/modules/cost-builder.css                   58 +/-
scripts/upgrade-build-footer-contract.ts                 86 +/-
dist/css/cost-builder.css                            rebuilt
dist/js/cost-builder.js                              rebuilt
```

### Validation
- `npx tsc --noEmit` — clean.
- `npm run build` — success; `dist/` rebuilt and verified to carry both the
  new rule and `.cz-quote-summary__footer-actions`.
- `npm run docs:check` — passed (118 Markdown files, 47 Code Maps, 22
  history records).
- `npm run contract:upgrade-build-footer` — **PASS**.
- Related Cart/Upgrade suites, all **PASS**: `contract:manage-build`,
  `contract:composable-quote-cart`, `contract:composable-offer-eligibility`,
  `contract:composable-recommendations-cta`,
  `contract:focused-edition-selector-presentation`,
  `contract:cost-builder-isolation`, `contract:quote-sidebar-scroll`,
  `contract:package-family-cart`, `contract:quote-cart-addon`,
  `regression:tier-next-step-navigation`,
  `regression:single-occupant-quoted-focus`.
- Full suite: 101 contracts/regressions run, 8 failing —
  `contract:admin-station-css`, `contract:package-builder-flow`,
  `contract:platform-identity-schema`, `regression:tier-system-footer-loop`,
  `regression:composable-quote-cart-loop`,
  `regression:tier-occupant-lifecycle`, `regression:tier-edition-lifecycle`,
  `regression:tier-publish-timeout`. **All 8 were re-run against a clean
  `36ba345d` working tree and fail identically there** — pre-existing on
  `main`, not introduced or touched by this change. Flagging them rather
  than fixing them, as they are outside this item's scope.
- No browser/live verification performed — none is available locally.

### Code Maps
No update required. No Code Map documents this footer's CTA presentation
(`docs/code-map/cost-builder.md` describes `QuoteSummary.tsx` only as
rendering "selected items, totals, remove actions, and request CTA", which
is still accurate), and the change alters no documented ownership, entry
point, runtime flow, persistence, dependency or boundary. `docs:check`
passes.

### Needs live validation
- The secondary button's rest/hover/focus appearance against the real Cart
  footer background, and the primary/secondary pair spacing.
- That the button still appears only in the eligible skipped-upgrade state
  and routes into browsing exactly as before.
