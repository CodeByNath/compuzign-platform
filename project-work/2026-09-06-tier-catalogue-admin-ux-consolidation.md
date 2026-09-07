# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — revised plan recorded, no source edits made**
- Production `main`: `bd0a48d8be81c591e48ebe220dda21645b349089`; deploy #970 succeeded.
- Corrected plan below: eligibility is extracted (not duplicated) into `resolveComposableEligibleRows(family)`, auto-commit no longer ends the gate, and the right-side `Add to Quote` is a new presentational stage-exit CTA only (`setUpgradeGate(null)`, no quote mutation).

## Locked customer flow
The primary Tier/Edition is already in the quote before this stage. This work rearranges existing UI/state only: no second cart, temporary build, new commit model, duplicate pricing, or duplicate totals authority.

1. Existing focused Tier -> Add to Quote.
2. If this Tier/Family has a real Upgrade Your Build catalogue, hide normal Cart + Recommended Add-ons and show an **Upgrade your build** gate in the existing recommendation-stage shell.
3. Gate actions:
   - **Browse Catalogue** -> existing `ComposableOfferBrowser` inside the focused Tier shell.
   - **Maybe next time** -> end the gate; resume existing Recommended Add-ons if present, otherwise Cart.
4. Catalogue left side remains the existing filters, featured/default-selection, quantity, max-6/paging behavior.
5. Catalogue right side is a simple hydrated view of existing quote/cart state: quoted Tier/Edition + upgrade inclusion rows as `name × qty` + the same cart-derived totals.
6. Normal Cart remains hidden while browsing.
7. Right-side **Add to Quote** is the deliberate stage-exit CTA. Because `ComposableOfferBrowser` already auto-syncs successful customer changes into the quote, this CTA must **not create/commit another quote mutation**. It simply ends the Upgrade gate and resumes Recommended Add-ons -> Cart, or Cart directly when no add-ons exist.

## Independent source findings
- `FamilyTierAdapter.commitSelection()` already owns post-primary Add-to-Quote staging.
- `ComposableOfferBrowser` currently auto-commits after customer interaction + successful debounced preview; there is no literal Add-to-Quote button in that component today.
- Therefore Claude's proposed "clear the gate from onComposableCommit" is **rejected**: it would close browsing after the first successful inclusion change, before the customer deliberately finishes.
- `PackageBuilderApp` owns Cart/MobileQuoteBar visibility and already derives `primary`, `composableItem`, and quote/cart totals authority.
- The current browser returns `null` when no composable offer/policy/rows exist, so the new gate must not become a blocker for a Tier with no real catalogue. Reuse/extract the same eligibility truth; do not invent a second business rule.

## Must preserve / remove / not substitute
**Must preserve:** existing composable auto-sync semantics; existing Recommendation/Add-on behavior after the gate; existing cart/quote data authority; catalogue filters/paging/selection behavior.

**Must remove from plan:** gate-ending behavior on `onComposableCommit`.

**Must not substitute:** no separate staging cart, explicit re-commit model, second pricing calculation, or auto-close-on-first-selection behavior.

## Claude — revise plan only
Return a corrected phase plan in this file, no source edits yet. It must:
- identify the exact existing eligibility derivation to reuse/extract so the gate only appears when a real catalogue exists;
- keep auto-commit active during browsing without ending the gate;
- place a new **presentational/stage-control** `Add to Quote` CTA in the right-side build summary whose only new responsibility is `setUpgradeGate(null)` / equivalent continuation;
- state what existing QuoteSummary/cart presentation primitives can be reused vs what minimal new presentational component is justified, without duplicating calculation logic;
- phase the work into small independently reviewable/live-testable steps, including mobile stacking.

Set **AWAITING CHATGPT REVIEW** when the corrected plan is recorded.

## Claude's revised plan (source read from `main`)

### Eligibility derivation to reuse/extract

There is **no existing shared/exported eligibility function** — the check is currently inline and component-local, in `ComposableOfferBrowser.tsx` (`resources/ts/components/package-builder/ComposableOfferBrowser.tsx`):
- `offer`/`policy` sourced straight off the `family` prop (lines 291-292): `family.pricing.composable_offer ?? null`, `offer?.customer_policy ?? null`.
- `rows` (lines 303-321, `useMemo`) joins `offer.inclusions` × `policy.items` by `item_id` — an inclusion with no matching, non-`excluded` policy entry is dropped.
- The render gate itself (line 578): `if (!offer || !policy || rows.length === 0) return null;`

`FamilyTierAdapter.tsx` already receives the identical `family: PackageBuilderFamily` prop, so it has `family.pricing.composable_offer` and `.customer_policy.items` in hand — but re-implementing the join a second time in `FamilyTierAdapter` would be exactly the "invent a second business rule" the audit warned against, since the two copies could drift.

**Correction to the plan:** extract lines 291-321's offer/policy/rows derivation out of `ComposableOfferBrowser.tsx` into one small exported pure function — e.g. `resolveComposableEligibleRows(family: PackageBuilderFamily): BrowseRow[]` — kept in the same file (or moved to `utils/quote.ts` alongside the other pure quote/cart derivations if a shared home is preferred; either is fine since it's a pure function of `family`, no behavior change). `ComposableOfferBrowser.tsx` then calls it internally instead of the inline `useMemo`+manual `offer`/`policy` reads, and its own `rows.length === 0` gate is unchanged in effect. `FamilyTierAdapter.tsx` imports the same function and computes `hasComposableCatalogue = resolveComposableEligibleRows(family).length > 0` once, using it as the trigger condition for the gate. One source of truth, no duplicated join logic, no new business rule.

### Auto-commit stays untouched; gate ends only via explicit CTA

Per the audit, `onComposableCommit`/`onComposableRemove` are left exactly as they are today — `ComposableOfferBrowser`'s existing debounced auto-sync keeps writing to the quote while the gate is in `browsing`, with no side effect on gate state. The **only** way `browsing` ends is:
- `Maybe next time` (from the `pending` gate step) → `setUpgradeGate(null)`.
- The new right-side **`Add to Quote`** button (see below) → `setUpgradeGate(null)`. This button does not call `onCommit`/`addComposable`/anything in `utils/quote.ts` — the selection is already live in the quote via auto-sync by the time the customer can see it reflected in the summary rows. Its only job is closing the stage.

### Right-side summary: reuse vs new component

`QuoteSummary.tsx`'s data authority (`primary`, `composableItem`, `calcQuoteTotals` — all already computed once in `PackageBuilderApp.tsx` at lines 132/141 and passed down) is reused as-is: no second totals calculation, no new derivation. But `QuoteSummary.tsx` itself is not reused as a component here, because its only CTA is "Review & Finalise Quote," which is the wrong action for this stage and would either need conditional CTA-swapping inside a shared cart component (risking regressions to the real Cart) or be misleading if left as-is.

**Justified new component:** a small presentational-only `UpgradeBuildSummary` (or similar), which:
- takes `primary`, `composableItem` (or its `composableSelection[]`), and the already-computed totals as props — reads, never recalculates;
- renders `name × qty` rows exactly per the mockup, plus the totals;
- renders exactly one new CTA, `Add to Quote`, whose handler is a prop (`onExit` / `onFinishBrowsing`) supplied by `FamilyTierAdapter` and wired straight to `setUpgradeGate(null)`.

This is new markup, not new business logic — it duplicates no calculation and owns no state beyond what's passed in.

### Implementation phases (each independently reviewable/live-testable)

1. **Extract eligibility function, no behavior change.** Pull the offer/policy/rows join out of `ComposableOfferBrowser.tsx` into `resolveComposableEligibleRows(family)`; have the component call it. Testable: catalogue behavior is byte-for-byte identical for every existing Family (including ones that currently render `null`) — pure refactor, verify via existing catalogue QA pass, no new UI yet.
2. **Gate state + eligibility-gated trigger + Cart/Recommendations suppression.** Add `upgradeGate: 'pending' | 'browsing' | null` to `FamilyTierAdapter`, set in `commitSelection` only when `resolveComposableEligibleRows(family).length > 0` (Phase 1's function). Add the gate panel (real mockup copy/buttons). Add `onUpgradeGateActiveChange` callback threaded into `PackageBuilderApp`'s existing `items.length > 0` conditionals for `QuoteSummary`/`MobileQuoteBar`. Add `upgradeGate` to the existing Family-switch reset `useEffect`. Testable: Add to Quote shows the gate only for Families with a real catalogue; Cart/Recommendations hidden while gate is up; `Maybe next time` restores exactly today's behavior; switching Family clears the gate correctly.
3. **Browse Catalogue wiring.** Change `ComposableOfferBrowser`'s mount condition from `selectedTierId !== null` to `upgradeGate === 'browsing'`. No internal changes to the component. Testable: clicking Browse Catalogue swaps the gate for the existing catalogue UI; filters/paging/Add-Remove/auto-sync all behave exactly as before, and the gate does **not** close on any interaction.
4. **Right-side `UpgradeBuildSummary` + explicit exit CTA.** Build the new presentational component per above, wire its `Add to Quote` CTA to `setUpgradeGate(null)`. Testable: while browsing, the summary reflects live auto-synced quote state (rows/totals update as the customer adds/removes); clicking `Add to Quote` ends the gate and resumes Recommended Add-ons-if-present-else-Cart, with the quote already containing whatever was auto-synced — no double mutation.
5. **Mobile stacking + polish + matrix QA.** Design and verify 767px stacking for both the gate panel and the catalogue+summary pair (mockup is desktop-only, matching the existing `stagedTier`/`QuoteSummary` stacking precedent). Manually verify all four Family combinations (no add-ons/no catalogue, add-ons only, catalogue only, both) for correct resume path in every case, on both desktop and mobile widths.

Set **AWAITING CHATGPT REVIEW**.