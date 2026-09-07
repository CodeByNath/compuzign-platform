# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — combined Phase 2+3+4 implemented on a fresh review branch, not pushed to `main`**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`; deploy #972 succeeded.
- Phase 1 deployed.
- Phase 2+3-only candidate `review/upgrade-your-build-catalogue` @ `b5290e2eec097b7e51b2f3d4835a0ccdb9b561cf` was **not approved for main** (no customer exit from browsing) and its branch has been deleted (local + remote) — content was correct, just incomplete.
- Combined Phase 2+3+4 candidate: `review/upgrade-your-build-summary` @ `7daf03b33efdef59f5fb8f759f7e7ce15108ef32`, built fresh from `main` (`5c7eb062`) with no ancestry from the superseded branch — pushed to origin. Evidence below.

## Independent audit
The Phase 2+3 candidate correctly:
- reuses `resolveComposableEligibleRows(family)` for gate eligibility;
- hides Cart/MobileQuoteBar/Recommendations without altering `items`;
- makes **Browse Catalogue** enter `browsing`;
- mounts the existing `ComposableOfferBrowser` only while browsing;
- leaves its preview/selection/quantity/auto-sync callbacks unchanged;
- prevents auto-sync from ending the gate;
- preserves Family/primary invalidation.

But it is not independently shippable: once browsing starts there is no customer exit back to Recommendations/Cart. Shipping that dead-end would reduce the existing customer capability. Phase 4 is therefore required before approval.

## Locked customer flow
Primary Tier/Edition is already in the quote. This work only rearranges presentation/navigation around existing quote/cart state.

Pending gate:
- **Browse Catalogue** -> browsing.
- **Maybe next time** -> existing Recommendations if present, otherwise Cart.

Browsing:
- left = existing `ComposableOfferBrowser` unchanged;
- right = simple **Your build** summary of existing quote/cart state;
- existing composable auto-sync continues while browsing;
- right-side **Add to Quote** is stage-control only: it performs no quote mutation and exits browsing to existing Recommendations-if-present, otherwise Cart.

## Phase 4 safeguards
- Summary display rows must come from the committed composable item's resolved `inclusionItems[]` (`label`, resolved `quantity`), not `composableSelection` intent/history.
- Monetary facts must reuse existing exported cart/payment calculation authorities used by `QuoteSummary`; no copied arithmetic, second pricing model, or staging cart.
- Do not alter `ComposableOfferBrowser` preview, filter, paging, featured/default-selection, quantity, commit/remove, pricing, or persistence semantics.
- Do not add another Continue/Done/Finish action.

## Claude — Phase 4
Implement the right-side `Your build` presentation beside the existing browser and the explicit **Add to Quote** stage-exit CTA. Its handler only clears/ends the Upgrade gate; it must not call composable commit/remove or rebuild quote data.

Update focused contracts to prove: resolved `inclusionItems[]` drive `label × quantity`; existing shared monetary helpers are reused; Add to Quote only exits; auto-sync remains independent; exit resumes the existing staged Add-ons-or-Cart path.

Run `tsc`, relevant contracts and build. Before requesting push approval, prepare **one fresh combined Phase 2+3+4 candidate from current production main** with no rejected/interim commit ancestry, push that review branch, record exact SHA/files/evidence here, and set **AWAITING CHATGPT REVIEW**. Do not push to main.

## Combined Phase 2+3+4 evidence

Branch construction: `git checkout -b review/upgrade-your-build-summary main` (tip `5c7eb0621c1c3610b6e970826a294065e7bdb89a`, unchanged since Phase 1), then `git checkout review/upgrade-your-build-catalogue -- <the 8 changed files>` — a working-tree-only copy from that branch's tip (which by then locally carried an additional, never-pushed Phase 4 commit on top of `b5290e2e`), so no commit history attaches. Rebuilt (`npm run build`) on the new branch to confirm the copied `dist/` output matches a from-scratch build byte-for-byte (`git diff --stat` empty after rebuild) before committing everything as **one** commit. `git log review/upgrade-your-build-summary` shows a single commit whose only parent is `main`'s `5c7eb062`; neither the deleted `review/upgrade-your-build-gate` nor `review/upgrade-your-build-catalogue` branch is an ancestor.

Commit: `7daf03b33efdef59f5fb8f759f7e7ce15108ef32` — "Add Upgrade Your Build right-side summary + stage-exit CTA".

Files changed (Phase 2+3 content unchanged from the prior audited diff except where noted):
- `resources/ts/components/package-builder/UpgradeBuildSummary.tsx` (new) — presentational-only component, takes `items`/`primaryItem`/`composableItem`/`onExit` as props. Upgrade rows read from `composableItem?.inclusionItems ?? []` (`label`, resolved `quantity`) — never `composableSelection`. Totals come from calling `calcQuoteTotals(items)` directly (the exact same exported function from `@/utils/quote` that `QuoteSummary.tsx` calls on the same raw cart). Its `hasMultiStreamItem` guard mirrors `QuoteSummary.tsx`'s own (`items.filter(isFamilyTierQuoteItem).some(item => (item.legPaymentSummaries?.length ?? 0) > 1)`) — a one-line boolean derivation over existing item fields, not a second pricing calculation — because `calcQuoteTotals`'s cycle bucketing is genuinely untrustworthy once any item has more than one payment stream (`QuoteSummary.tsx`'s own comment on this). **Implementation choice, flagging explicitly**: in that multi-stream case, this summary shows no running total at all (a "See Cart for full commercial breakdown" label) rather than reconstruct `QuoteSummary`'s own Total Contract Value combination logic (`computeTotalContractValue`/`startingPaymentsByCycle` summed across primaries) — chosen to keep this a genuinely "simple hydrated view" per the locked customer flow, rather than duplicate that presentation branching a second time. If full parity with `QuoteSummary`'s TCV display is actually required here, that's a scope change worth an explicit decision rather than something to infer. Renders exactly one button ("Add to Quote"), wired to the `onExit` prop only — the component takes no cart-commit callback prop at all, so it structurally cannot perform a quote mutation.
- `resources/ts/components/package-builder/FamilyTierAdapter.tsx` — imports and renders `UpgradeBuildSummary` as a sibling inside the same browsing-stage wrapper `<div>` as `ComposableOfferBrowser` (which itself receives the exact same props as before, untouched), wired with the props this component already has (`selectedPrimaryItem`, `selectedComposableItem`) plus one new `items: CartItem[]` prop (threaded straight through from `PackageBuilderApp`, read only by the summary). `UpgradeBuildSummary`'s `onExit` is `dismissUpgradeGate` directly.
- `resources/ts/components/package-builder/PackageBuilderApp.tsx` — passes `items={items}` to `FamilyTierAdapter` (same array already handed to `QuoteSummary`/`MobileQuoteBar`); no other change from the audited Phase 2+3 diff.
- `resources/css/modules/cost-builder.css` — adds `.cz-package-builder__upgrade-browsing` (left/right flex layout for the browsing stage) and `.cz-package-builder__upgrade-summary` + 7 child classes (functional layout only, reusing existing design tokens — no mockup-accurate polish, that's Phase 5).
- `scripts/upgrade-your-build-gate-contract.ts` — extended with Phase 4 checks (properties 11-14 in the file's own docblock): `UpgradeBuildSummary` is wired with only pre-existing props and `onExit={dismissUpgradeGate}`; rows come from `inclusionItems[]` (a precise `\.composableSelection\b` field-access check, not a prose-comment substring match, since the explanatory comment naming that field is legitimate); totals call `calcQuoteTotals(items)` directly; no cart-mutating function is imported; exactly one `<button>` exists.
- `package.json`, `dist/css/cost-builder.css`, `dist/js/cost-builder.js` — registration + rebuilt output.

Verification run on this branch:
- `npx tsc --noEmit -p tsconfig.json` — clean, no errors.
- `npm run contract:upgrade-your-build-gate` — PASS (extended contract, 14 properties).
- `npm run contract:composable-offer-eligibility` / `composable-offer-choice` / `composable-offer-contribution` / `composable-quote-cart` — all PASS.
- `npm run contract:package-builder-addon-focus` / `package-builder-customer-tabs` / `package-family-request-flow` / `request-flow-family-tier-parity` / `commercial-leg-inclusion-groups` / `commercial-leg-extension-groups` / `package-builder-bundle-inclusion-parity` — all PASS.
- `npm run build` (`vite build`) — clean; ran twice (once before committing to confirm the copied `dist/` matched a fresh build, `git diff --stat` empty) — `dist/css/cost-builder.css` + `dist/js/cost-builder.js` committed.

Not pushed to `main`. Set **AWAITING CHATGPT REVIEW**.