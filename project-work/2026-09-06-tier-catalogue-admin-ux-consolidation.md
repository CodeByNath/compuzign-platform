# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Phase 5 polish + matrix QA done, final combined candidate pushed**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`; deploy #972 succeeded.
- Superseded candidate `review/upgrade-your-build-inclusions` @ `b4c4951523c98a2e26dbca4f6b443d7c47c43d4a` — branch deleted (local + remote), functional content accepted, folded into the final candidate below.
- **Final combined Phase 2+3+4+5 candidate: `review/upgrade-your-build-final` @ `f2d27ae06b73c4b934a8596510bc1c4c5b2c0f60`**, built fresh from `main` (`5c7eb062`) with no ancestry from any of the four prior superseded/rejected candidates — pushed to origin. Evidence below.

## Accepted functional state
- Shared `resolveComposableEligibleRows(family)` gates the flow.
- Primary Tier/Edition is already in quote before Upgrade stage.
- Pending gate hides normal Cart/MobileQuoteBar + Recommendations without mutating `items`.
- **Maybe next time** resumes the exact existing Recommendations-if-present, otherwise Cart path.
- **Browse Catalogue** enters `browsing`; only existing `ComposableOfferBrowser` mounts there.
- Existing filters/paging/featured/default selection/quantity/preview/auto-sync remain unchanged; auto-sync never exits the stage.
- Right side reuses `QuoteSummary`'s own `QuoteItemPricePresentation` + `QuoteTotalsPresentation` over only primary + composable lines.
- Selected Upgrade inclusions come from existing `disclosureRowsForFamilyTierItem(composableItem)`, always visible, Bundle-child hierarchy preserved, and `× quantity` shown only when authoritative quantity is non-null.
- **Add to Quote** is stage-exit only; no quote mutation/recommit/rebuild.

## Phase 5 only
Do final presentation/mobile hardening and matrix QA. Do not reopen architecture.

### Presentation
- Keep CompuZign dark/yellow visual grammar; no new design system or alternate recommendation/cart shell.
- Pending gate should visually read as the existing recommendation-stage slot: concise message + primary **Browse Catalogue** + secondary **Maybe next time**.
- Browsing desktop should remain catalogue left / scoped Cart presentation right.
- On narrow/mobile widths, stack predictably with catalogue first and `Your build` summary second; no horizontal overflow, clipped controls, unusable filter row, or hidden stage-exit CTA.
- Preserve existing customer terminology and current catalogue internals.

### Matrix QA
Cover at minimum:
1. eligible catalogue + recommended add-ons;
2. eligible catalogue + no add-ons;
3. no eligible catalogue + add-ons;
4. no eligible catalogue + no add-ons;
5. Browse -> auto-sync additions/removals -> Add to Quote exit;
6. Maybe next time bypass;
7. Family switch / primary remove or replace while gated;
8. primary only before first composable auto-sync, then composable line appears;
9. multi-stream primary/composable Cart presentation;
10. mobile/narrow stacking.

No new customer steps, pricing logic, cart store, persistence, recommendation engine, Admin changes, or unrelated cleanup.

Run `tsc`, relevant focused contracts and build. Prepare one **fresh final Phase 2+3+4+5 candidate from current production main**, with no superseded branch ancestry; remove superseded review branch after replacement is pushed. Record exact SHA/files/evidence here as **AWAITING CHATGPT REVIEW**. Do not push to main.

## Phase 5 evidence

### Presentation changes
- `.cz-package-builder__upgrade-browsing` (catalogue + scoped Cart summary) is now mobile-first: a plain `flex-direction: column` by default — catalogue then summary in DOM order, no `order` override needed — switching to `flex-direction: row` only inside `@media (min-width: 1024px)`. This is the **exact same breakpoint** `.cz-cost-builder__body` already uses for the real Cart-sidebar-vs-main relationship (verified by reading that rule directly), chosen because this stage structurally replaces where that sidebar sits — not an ad hoc flex-wrap point, which is what it was before this round.
- `.cz-package-builder__upgrade-summary`'s `flex-basis`/`min-width` moved inside that same `1024px` query, so it carries no competing width constraint below it (plain full-width column item on mobile).
- Gate panel's own flex-wrap layout (from Phase 2) is unchanged — its content (heading/eyebrow + two buttons) already wraps predictably at any width; no breakpoint needed for content that light.
- `contract:upgrade-your-build-gate` gained property 16, locking both the mobile-first default and the exact `1024px` switch-over so a future edit can't silently drift back to an undefined wrap point.

**Honest limitation**: this environment has no local WordPress/browser to render the page in (per this project's own established "no local WP env exists" constraint) — the breakpoint/stacking claims above are verified by reading the CSS source against the established `.cz-cost-builder__body` precedent, not by a live/visual render. Flagging this plainly rather than claiming a visual confirmation that didn't happen.

### Matrix QA — traced against source, not a live browser

1. **Eligible catalogue + recommended add-ons** — `commitSelection` sets `upgradeGateStage: 'pending'` (catalogue eligible) and `stagedTierId` (add-ons exist) simultaneously; the `'pending'` branch is checked before `stagedTier` in the render chain, so the gate wins and Recommendations stays hidden underneath it. Confirmed by source order.
2. **Eligible catalogue + no add-ons** — same gate opens regardless of add-ons (independent conditions); `Maybe next time` clears the gate and `stagedTierId` is `null` (no add-ons), so it falls through to the full comparison grid with Cart already visible — the pre-existing "no add-ons" behavior, unchanged.
3. **No eligible catalogue + add-ons** — `commitSelection` never opens the gate (`hasCatalogue` false); `stagedTierId` is still set, so Recommendations render immediately, Cart visible — today's baseline, untouched.
4. **No eligible catalogue + no add-ons** — neither gate nor staged view opens; full comparison grid, Cart visible — baseline, untouched.
5. **Browse → auto-sync additions/removals → Add to Quote exit** — `onCommit`/`onRemoveFromQuote` passed to `ComposableOfferBrowser` are the parent's unwrapped `onComposableCommit`/`onComposableRemove` (confirmed no gate setter reachable from that render call, contract property 9); `selectedComposableItem` flows back through props on each cart update, so `UpgradeBuildSummary`'s `scopedItems`/inclusion rows/totals recompute reactively with no missed update. `Add to Quote` calls `dismissUpgradeGate` only — never a commit/remove call — so the already-auto-synced cart state is left exactly as-is; ending the gate falls through to Recommendations-if-present-else-Cart, both already holding that state.
6. **Maybe next time bypass** — covered by 1/2 above; only exists in the `'pending'` branch (confirmed, contract property 5), no equivalent control exists mid-browsing (by design — Phase 4's own stage-exit CTA is the only way out of `'browsing'`).
7. **Family switch / primary remove or replace while gated** — Family switch: the existing `[family.family_id]` reset effect now also clears `upgradeGateTierId`/`upgradeGateStage` (contract property 4), verified correct. Primary remove/replace: traced the actual reachable UI paths and found **no live path currently exists** to remove or replace the primary while the gate/browsing stage is active — both the comparison grid (where Tier selection/removal buttons live) and the real Cart (where its own remove `×`/replace paths live) are hidden by `mainContent`'s branch priority and the `upgradeGateActive` suppression, respectively, for as long as either stage is active. The derived belongs-to-tier invalidation (`upgradeGateTierId === selectedTierId`) still exists and would correctly invalidate the gate if some other path ever changed `selectedTierId` while gated, but today only the Family-switch path exercises it live. Flagging this as an observation, not a gap: nothing can violate the invariant via the UI, but the "remove/replace while gated" scenario as literally stated has no live trigger to test against today.
8. **Primary only before first composable auto-sync, then composable line appears** — `upgradeInclusionRows`/`scopedItems` are plain derived consts recomputed every render from `composableItem` (a prop); before any auto-sync commit, `composableItem` is `null` so both derive to "primary only, no inclusion list" (the `<ul>` itself is conditionally omitted when the row list is empty); once the debounced preview auto-commits, `composableItem` becomes non-null on the next render and both update in the same pass, no separate effect/state needed.
9. **Multi-stream primary/composable Cart presentation** — `QuoteTotalsPresentation`'s `hasMultiStreamItem`/TCV-combination logic runs over `scopedItems` exactly as `QuoteSummary` runs it over the whole cart; since a composable item also carries `isAddon: false` (same as a primary), it's already included in `primaryFamilyTierItems`/the TCV sum in the **real** Cart today — this is inherited, pre-existing behavior faithfully reproduced on the smaller scoped list, not a new decision made in this phase.
10. **Mobile/narrow stacking** — addressed by the CSS changes above; verified by source reasoning against the `.cz-cost-builder__body` precedent only, per the honest limitation noted above — not visually confirmed in a browser.

### Verification run on this branch
- `npx tsc --noEmit -p tsconfig.json` — clean, no errors.
- `npm run contract:upgrade-your-build-gate` — PASS (16 properties, including the new mobile-first/1024px breakpoint lock).
- `npm run contract:composable-offer-eligibility` / `composable-offer-choice` / `composable-offer-contribution` / `composable-quote-cart` / `composable-live-correction` — all PASS.
- `npm run contract:payment-summary-extraction-parity` / `package-builder-addon-focus` / `package-builder-customer-tabs` / `package-family-request-flow` / `request-flow-family-tier-parity` / `commercial-leg-inclusion-groups` / `commercial-leg-extension-groups` / `package-builder-bundle-inclusion-parity` / `cost-builder-isolation` — all PASS.
- `npm run build` (`vite build`) — clean; ran twice (once before committing to confirm the copied `dist/` matched a from-scratch build, `git diff --stat` empty).

### Branch construction
`git checkout -b review/upgrade-your-build-final main` (tip `5c7eb0621c1c3610b6e970826a294065e7bdb89a`, unchanged since Phase 1), then `git checkout review/upgrade-your-build-inclusions -- <the 9 changed files>` — working-tree-only copy, no commit history attaches — then the Phase 5 CSS/contract changes were made directly on top and everything committed as **one** commit. `git log review/upgrade-your-build-final` shows a single commit whose only parent is `main`'s `5c7eb062`; none of the five prior superseded/rejected candidate branches (`review/upgrade-your-build-gate`, `-catalogue`, `-summary`, `-cart-reuse`, `-inclusions` — all now deleted, local + remote) is an ancestor.

Commit: `f2d27ae06b73c4b934a8596510bc1c4c5b2c0f60` — "Phase 5: mobile-first browsing stack at the real Cart breakpoint".

Not pushed to `main`. Set **AWAITING CHATGPT REVIEW**.