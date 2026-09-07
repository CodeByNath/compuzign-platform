# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Phase 2 implemented on review branch, not pushed to `main`**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`.
- Deploy independently confirmed: GitHub Actions **#972** (`Deploy to Hostinger`, run `34138809141`) completed **success** for exact `head_sha` `5c7eb0621c1c3610b6e970826a294065e7bdb89a`.
- Phase 1 eligibility extraction is accepted/deployed. No live customer behavior change was expected from Phase 1.
- Phase 2 evidence recorded below. Branch `review/upgrade-your-build-gate` @ `5eb320697b4d9075ff82b081a0ca3174ce5bee51`, pushed to origin.

## Locked customer flow
The primary Tier/Edition is already in the quote before this stage. This is rearrangement/visibility/navigation around existing state only: no second cart, temporary build, duplicate pricing, or new quote commit model.

1. Focused Tier -> existing Add to Quote.
2. When `resolveComposableEligibleRows(family).length > 0`, hide Cart + Recommended Add-ons and show **Upgrade your build** gate.
3. **Browse Catalogue** -> later Phase 3 opens existing `ComposableOfferBrowser` in the focused shell.
4. **Maybe next time** -> end gate -> existing Recommended Add-ons if present -> Cart; otherwise Cart directly.
5. Existing composable auto-sync must later remain active while browsing and must NOT close the gate.
6. Future right summary uses committed `inclusionItems[]` (`label`, resolved `quantity`) and existing cart/payment calculation authorities.
7. Future right-side **Add to Quote** is stage-control only; no quote mutation.

## Accepted phase sequence
1. Shared eligibility extraction. **Accepted/deployed.**
2. Gate state + Cart/MobileQuoteBar/Recommendations suppression + `Maybe next time`. **Implement now.**
3. Browse Catalogue routing to existing browser.
4. Right-side build summary + stage-exit CTA.
5. Mobile stacking/polish + matrix QA.

## Phase 2 — exact scope
Implement only the gate shell/state and visibility control.

### Must preserve
- Existing primary Add-to-Quote mutation and `stagedTierId` recommendation behavior underneath the gate.
- Existing add-on logic and cart contents/state; hide presentation only.
- Phase-1 `resolveComposableEligibleRows(family)` as the sole catalogue eligibility truth.
- Family-switch/reset behavior: gate cannot leak across Families or survive loss/replacement of the selected primary.

### Required behavior
- In `FamilyTierAdapter`, add the smallest local gate state (`'pending' | 'browsing' | null` is acceptable, but Phase 2 only enters `pending`; do not wire browsing yet).
- `commitSelection()` must set `pending` only when the shared eligibility result is non-empty. If no catalogue, preserve today's post-selection flow immediately.
- While gate active, suppress the existing Recommendations/staged view and tell `PackageBuilderApp` to hide both `QuoteSummary` and `MobileQuoteBar` without altering `items`.
- Render the real gate panel in the existing recommendation-stage visual area: copy `Your plan is already in the quote` / `Upgrade your build`; actions `Browse Catalogue` and `Maybe next time`.
- **Maybe next time** clears the gate and reveals exactly the existing continuation already represented by `stagedTierId`: Recommendations if add-ons exist; otherwise Cart.
- **Browse Catalogue in Phase 2 must not fake Phase 3.** Render it visibly but keep it non-destructive and do not mount/re-route the catalogue yet. Prefer a disabled/non-progressing control with an explicit phase-safe state over inventing a temporary route. If the current UI cannot support a non-broken staged CTA cleanly, stop and report rather than substituting behavior.

### Must not expand
No `ComposableOfferBrowser` routing/mount-condition change, no right-side summary, no Add-to-Quote stage-exit CTA, no pricing/preview/auto-sync changes, no new cart calculation, no add-on redesign, no Admin changes.

## Claude — next action
Prepare a clean Phase-2 review branch from current `main`, implement only the scope above, add focused contracts for gate eligibility/visibility/reset/Maybe-next-time behavior, run `tsc`, relevant contracts and build, and record exact branch/SHA/files/evidence here as **AWAITING CHATGPT REVIEW**. Do not push to `main`.

## Phase 2 evidence

Branch: `review/upgrade-your-build-gate`, based on `main` @ `5c7eb0621c1c3610b6e970826a294065e7bdb89a`, pushed to origin. Commit: `5eb320697b4d9075ff82b081a0ca3174ce5bee51` — "Add Upgrade Your Build gate shell + Cart/Recommendations suppression".

Files changed:
- `resources/ts/components/package-builder/FamilyTierAdapter.tsx` — adds `upgradeGateTierId`/`upgradeGateStage` state, derived `upgradeGateActive` (same belongs-to-tier validity pattern `stagedTierId`/`stagedTier` already use, so a primary swap/removal invalidates it without a separate reset). `commitSelection()` opens the gate to `'pending'` only when `resolveComposableEligibleRows(family).length > 0` (Phase 1's shared eligibility function, imported, not re-derived). The gate branch is inserted into the `mainContent` if/else-if chain BEFORE the `stagedTier` branch, so Recommendations never renders underneath an active gate. The Family-switch reset effect (`[family.family_id]`) now also clears the gate. `dismissUpgradeGate()` (Maybe next time) resets the same two state values `commitSelection` uses to open it. A new `useEffect` reports `upgradeGateActive !== null` up via the new required `onUpgradeGateActiveChange` prop. The gate panel renders the mockup copy (`Your plan is already in the quote` / `Upgrade your build`) with two actions: `Maybe next time` (wired, calls `dismissUpgradeGate`) and `Browse Catalogue` (rendered `disabled`/`aria-disabled` — inert this phase, per the "must not fake Phase 3" instruction). `ComposableOfferBrowser`'s own render gate is untouched (`selectedTierId !== null`, exactly as Phase 1 left it).
- `resources/ts/components/package-builder/PackageBuilderApp.tsx` — adds one `upgradeGateActive` boolean state, wired to `FamilyTierAdapter` via `onUpgradeGateActiveChange={setUpgradeGateActive}` (the raw state setter, a stable identity — no wrapper needed). `QuoteSummary`'s existing `items.length > 0` conditional gains `&& !upgradeGateActive`; `MobileQuoteBar` gains the same guard. `items` itself is untouched by any of this.
- `resources/css/modules/cost-builder.css` — adds `.cz-package-builder__upgrade-gate` and its three child classes (functional layout only: left copy / right actions, wraps to one column on narrow viewports, reuses existing design tokens). No mockup-accurate visual polish — that's Phase 5 per the accepted sequence.
- `scripts/upgrade-your-build-gate-contract.ts` (new) — static source-scan contract (same convention `package-builder-addon-focus-contract.ts` already established for this exact component pair, since both carry too much live-fetched Family/pricing state to instantiate standalone). Locks: shared-eligibility reuse; gate validity derived the same way as `stagedTier`; gate branch precedes `stagedTier` in source order; Family-switch reset clears the gate; `Maybe next time` reuses the same reset path as `commitSelection`'s open path; Browse Catalogue is rendered `disabled`; `ComposableOfferBrowser`'s mount condition is untouched; `PackageBuilderApp` suppresses both Cart components via the one reported boolean.
- `package.json` — registers `contract:upgrade-your-build-gate`.
- `dist/css/cost-builder.css`, `dist/js/cost-builder.js` — rebuilt output.

Verification run on this branch:
- `npx tsc --noEmit -p tsconfig.json` — clean, no errors.
- `npm run contract:upgrade-your-build-gate` — PASS (new contract).
- `npm run contract:composable-offer-eligibility` / `composable-offer-choice` / `composable-offer-contribution` / `composable-quote-cart` — all PASS (Phase 1 + composable behavior unchanged).
- `npm run contract:package-builder-addon-focus` / `package-builder-customer-tabs` / `package-family-request-flow` / `request-flow-family-tier-parity` / `commercial-leg-inclusion-groups` / `commercial-leg-extension-groups` / `package-builder-bundle-inclusion-parity` — all PASS (broader Package Builder behavior unchanged).
- `npm run contract:package-builder-flow` — pre-existing failure (`ENOENT` on a stale `FullBuildDetail.tsx` reference), confirmed by stashing this branch's changes and re-running on unmodified `main`: identical failure. Not caused by this change; out of Phase 2 scope, not touched.
- `npm run build` (`vite build`) — clean, `dist/css/cost-builder.css` + `dist/js/cost-builder.js` rebuilt and committed.

One observation for review, not a scope decision: because `ComposableOfferBrowser`'s mount condition was deliberately left untouched per the "must not expand" boundary, it still renders as a sibling immediately below `mainContent` whenever `selectedTierId !== null` — including while the gate is `'pending'`. So in this Phase-2-only interim (before Phase 3 gates it to `'browsing'`), a customer who reaches the gate will see the live, fully-functional Upgrade Your Build catalogue directly beneath the gate panel on the same page, not hidden behind it. This matches the letter of the Phase 2 scope as written; flagging in case that specific interim visual overlap wasn't anticipated.

Not pushed to `main`. Set **AWAITING CHATGPT REVIEW**.