# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — plan/phasing only, no source edits made**
- Production `main`: `bd0a48d8be81c591e48ebe220dda21645b349089`; deploy #970 succeeded.
- Nath accepts the Admin result and wants the final customer-facing Upgrade Your Build stage planned before implementation.
- Claude's plan recorded below. Three open questions flagged before Phase 1 can start (catalogue-eligibility signal, auto-commit-as-confirmation, and the right-side summary's CTA mismatch with `QuoteSummary`).

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

## Claude's plan (source read from `main`)

This coordination branch's checkout is 575 commits behind `main` and does not contain any composable/Upgrade-Your-Build source. All file:line references below come from `git show main:<path>` — read-only, no checkout performed. `main` tip (`bd0a48d8`) matches the "Production" SHA already recorded in Status above, so it is the correct base for this plan and for the eventual implementation branch.

### Existing components/state to reuse

- **`FamilyTierAdapter.tsx`** (`resources/ts/components/package-builder/FamilyTierAdapter.tsx`) is the owner of the post-Add-to-Quote decision today. `commitSelection` (lines 610-621) is the single handler both "Add to Quote" entry points call; it currently sets `stagedTierId` to stage the Recommendations view whenever `addonTiers.length > 0` (line 620, `addonTiers` filtered at line 503). This is where the new gate state joins.
- **Recommended Add-ons** is `recommendationsShell` inside `PricingTiers.tsx` (lines 945-950), rendered only when the staged/isolated view is active. It has no dismiss action today — the only way off it is "← All plans" or adding an add-on.
- **Upgrade Your Build catalogue** is `ComposableOfferBrowser.tsx` (`resources/ts/components/package-builder/ComposableOfferBrowser.tsx`), already rendered by `FamilyTierAdapter.tsx` (lines 1194-1203) with `context="upgrade_your_build"`. It currently mounts unconditionally as soon as `selectedTierId !== null` — that render condition is what needs to change, not the component itself. Left-side filters/paging/featured logic (lines 587-738) are untouched by this plan.
- **Cart** is `QuoteSummary.tsx`, rendered by `PackageBuilderApp.tsx` (lines 204-213) purely on `items.length > 0`. There is no existing show/hide flag beyond that — one has to be added.
- **Quote/cart state** is plain `useState` in `PackageBuilderApp.tsx` (`items`, line 48) plus pure derivations in `utils/quote.ts` (`resolveQuoteItemRole`, `classifyQuoteItems`, `calcQuoteTotals`). The "quoted Tier/Edition" (`primary`) and "selected upgrade inclusions" (`composableItem`) are already derived at PackageBuilderApp.tsx line 132/141 and passed down — nothing new needs computing for the gate or the catalogue's right side.

### Where the gate should be owned

In **`FamilyTierAdapter.tsx`**, next to `stagedTierId`, as a new state value — e.g. `upgradeGate: 'pending' | 'browsing' | null` — set alongside `stagedTierId` inside `commitSelection`. Render priority becomes:
1. `upgradeGate === 'pending'` → render the new gate panel (sibling branch to `stagedTier`/full-grid, following the same "one nullable state, sibling-rendered panel" pattern already used for `planDetailsOverlay`, lines 1164-1193).
2. `upgradeGate === 'browsing'` → render `ComposableOfferBrowser` (render condition changes from `selectedTierId !== null` to `upgradeGate === 'browsing'`) plus the new "Your build" summary.
3. `upgradeGate === null` → today's unchanged behavior: `stagedTier`/`recommendationsShell` if `addonTiers.length > 0`, else full grid.

Because `PackageBuilderApp.tsx` owns the Cart's visibility and has no knowledge of this state, `FamilyTierAdapter` needs one new callback prop (e.g. `onUpgradeGateActiveChange(active: boolean)`) so `PackageBuilderApp` can add `&& !upgradeGateActive` to the existing `items.length > 0` conditional for both `QuoteSummary` (lines 204-213) and `MobileQuoteBar` (line 216). No new state store, no context — one boolean threaded up through existing prop-drilling.

### Continuation events

- **`Maybe next time`** → `setUpgradeGate(null)`. Falls straight into today's unchanged branch 3 above (`stagedTier`/`recommendationsShell` if add-ons exist, otherwise nothing — Cart reappears automatically once `onUpgradeGateActiveChange(false)` fires).
- **Catalogue's existing "Add to Quote"** → this does **not** map to a literal button. `ComposableOfferBrowser.tsx` has no discrete Add-to-Quote click handler; every Add/Remove interaction mutates local selection and a debounced (400ms) preview effect (lines 499-576) auto-calls `onCommit` once the resolved selection is non-empty, or `onRemoveFromQuote` if it resolves empty. The gate-ending hook must sit on the **commit success path**: wrap the `onComposableCommit` prop `FamilyTierAdapter` passes down so that, after it forwards to `PackageBuilderApp.addComposable`, it also calls `setUpgradeGate(null)`. A resolve-to-empty (`onRemoveFromQuote`) must **not** end the gate — the customer is still actively browsing with nothing selected yet.

### Implementation phases (each independently live-testable)

1. **Gate state + Cart/Recommendations suppression only.** Add `upgradeGate` to `FamilyTierAdapter`, wire `commitSelection`, add the gate panel (real mockup copy/buttons, not a placeholder), add `onUpgradeGateActiveChange` and thread it into `PackageBuilderApp`'s Cart/MobileQuoteBar conditionals. Add `upgradeGate` to the existing Family-switch reset `useEffect` (per `package-builder-focused-shell.md`'s reset pattern) so it can't leak across Families. Testable end-to-end: Add to Quote now shows the gate with Cart and Recommendations both hidden; refresh/switch-Family clears it correctly.
2. **Browse Catalogue wiring.** Change `ComposableOfferBrowser`'s mount condition to `upgradeGate === 'browsing'`. No changes inside the component itself. Testable: clicking Browse Catalogue swaps the gate for the existing catalogue UI, filters/paging/Add-Remove all behave exactly as before.
3. **Right-side "Your build" summary.** Build the read-only summary panel next to the catalogue, fed by the same `primary`/`composableItem`/`calcQuoteTotals` values `PackageBuilderApp` already computes — passed down as plain props, no new calculation. (See open question below on whether this reuses `QuoteSummary` directly or is a new minimal display component.)
4. **Gate-ending commit hook.** Wrap `onComposableCommit` as described above so a successful catalogue commit clears `upgradeGate`, resuming Recommendations-if-present-else-Cart. Verify the empty-selection/remove path leaves the gate in `browsing`.
5. **Polish + matrix QA.** Mockup-accurate styling, 767px stacking parity for the gate and catalogue+summary panels (neither is designed in the mockup, which reads desktop-only). Manually verify all four Family combinations: no add-ons/no catalogue, add-ons only, catalogue only, both — confirming the resume path lands correctly in every case.

### Risks / open questions before Phase 1 starts

1. **No existing "does this Tier have an eligible catalogue" signal.** `ComposableOfferBrowser` mounts unconditionally today and presumably self-manages an empty state; there's no equivalent to `addonTiers.length > 0` to gate the new prompt on. Left unresolved, the gate would show even for Tiers with nothing in the catalogue. Needs a source check (or explicit confirmation from Nath/ChatGPT that "always show the gate after Add to Quote" is acceptable) before Phase 1.
2. **Auto-commit vs. explicit confirmation.** Because the catalogue has no real "Add to Quote" button, the gate will close as soon as a valid selection resolves post-debounce — not on a deliberate click. Flagging in case the intended UX wants an explicit confirming action instead.
3. **Mockup shows an "Add to Quote" CTA in the right-side summary; `QuoteSummary`'s only CTA is "Review & Finalise Quote."** Reusing `QuoteSummary` verbatim would show the wrong label/action in this context. Recommend Phase 3 build a small new **presentational-only** summary (reads existing derived values, adds no calculation) rather than reusing `QuoteSummary`'s CTA — flagging since it is technically a new component file, even though it duplicates no logic.
4. **Mobile stacking is undesigned.** The approved mockup appears desktop-only; Phase 5 will need a stacking decision consistent with the existing 767px behavior already established for `stagedTier`/`QuoteSummary`.

Set to **AWAITING CHATGPT REVIEW**.