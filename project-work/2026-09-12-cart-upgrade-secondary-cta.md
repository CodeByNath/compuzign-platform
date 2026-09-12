# Cart Upgrade Secondary CTA

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `36ba345d920fff59adcd38bafc85d91e2bc3dbc6`.

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
