# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — plan/phasing only, no source edits**
- Production `main`: `bd0a48d8be81c591e48ebe220dda21645b349089`; deploy #970 succeeded.
- Nath accepts the Admin result and wants the final customer-facing Upgrade Your Build stage planned before implementation.

## Locked customer flow from Nath + live mockup
The primary Tier/Edition is already in the quote before this stage begins. Do **not** create a second cart, temporary build, commit model, or duplicate pricing/total calculation.

Flow:
1. Existing focused Tier -> Add to Quote.
2. Hide normal Cart and existing Recommended Add-ons while a new **Upgrade your build** gate is active in the existing recommendation-stage shell.
3. Gate actions:
   - **Browse Catalogue** -> open the existing Upgrade Your Build catalogue inside the focused Tier shell.
   - **Maybe next time** -> dismiss gate and resume the existing flow unchanged: Recommended Add-ons if present, otherwise Cart.
4. Catalogue stage reuses the existing Upgrade Your Build UI/pipeline. Left side keeps the existing filters, featured/default-selection behavior and current max-6 inclusion presentation; no new catalogue logic.
5. Right side is a simple hydrated view of the already-existing quote/cart state: quoted Tier/Edition + selected upgrade inclusions as simple `name × qty` rows + the same totals the cart already knows. The normal cart panel stays hidden while this stage is active.
6. The catalogue's existing **Add to Quote** keeps its existing quote behavior and additionally ends/breaks the Upgrade gate. After it, resume the same existing continuation: Recommended Add-ons if present -> Cart; otherwise Cart directly.

Visual grammar from approved mockup:
- Gate: left copy `Your plan is already in the quote` / `Upgrade your build`; right actions `Browse Catalogue` and `Maybe next time`.
- Catalogue: focused shell heading `Upgrade your build`; left catalogue/filter list; right `Your build` summary with quoted plan, `Upgrades`, running totals, existing `Add to Quote`.
- Do not create a new commerce surface; this is rearrangement/visibility/navigation around existing components/state.

## Claude — next action
Read the relevant current frontend Code Maps/source and **plan only**. Return in this same file:
- exact existing components/state to reuse for gate, recommendations, catalogue and cart;
- where the visibility gate should be owned;
- exact continuation events for `Maybe next time` and existing catalogue `Add to Quote`;
- a small implementation phase sequence, each phase independently reviewable/live-testable;
- risks or source constraints that would require changing the agreed flow.

Do not implement, branch, build, or modify source yet. Set **AWAITING CHATGPT REVIEW** when the plan is recorded.