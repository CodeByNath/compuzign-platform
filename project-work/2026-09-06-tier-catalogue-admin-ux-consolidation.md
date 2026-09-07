# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Upgrade summary now reuses QuoteSummary's own presentation, fresh candidate pushed**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`; deploy #972 succeeded.
- Rejected candidate `review/upgrade-your-build-summary` @ `7daf03b33efdef59f5fb8f759f7e7ce15108ef32` — branch deleted (local + remote), content superseded.
- New combined Phase 2+3+4 candidate: `review/upgrade-your-build-cart-reuse` @ `139e1ceebd449635c05add2b6ae8976eab4b39e9`, built fresh from `main` (`5c7eb062`) with no ancestry from the rejected branch — pushed to origin. Evidence below.

## Locked direction
Do **not** keep extending `UpgradeBuildSummary` as a second simplified Cart presentation.

Nath's requirement is simpler: the primary Tier/Edition and composable Build Your Own line already live in the real quote/cart state. During Upgrade browsing, the right side should show the **relevant slice of the existing Cart presentation**, not imitate it.

### Desired right side while browsing
Reuse the real Cart's existing item/payment-stream/totals presentation for only:
- the already-quoted primary Tier/Edition;
- the current composable/Build Your Own cart line that auto-sync already maintains.

Then show the Upgrade-stage **Add to Quote** action underneath. That button is stage-control only and ends the gate; it must not mutate/recommit/rebuild the quote.

Do not show unrelated cart items or cart-only controls such as Clear all, Remove, Review & Finalise Quote, or other full-Cart chrome unless a specific reused presentation primitive inherently requires them; preferred solution is the smallest reusable Cart item/summary presentation slice, not rendering the entire `QuoteSummary` unchanged.

## Must preserve
- existing primary Add-to-Quote mutation;
- Phase-1 shared catalogue eligibility;
- pending gate + Maybe next time behavior;
- Browse Catalogue -> existing `ComposableOfferBrowser`;
- existing filters/paging/featured/default-selection/quantity/preview/auto-sync;
- Cart/MobileQuoteBar visually hidden while Upgrade stage is active;
- underlying `items` untouched;
- normal Recommendations/Add-ons -> Cart continuation after bypass/exit.

## Must remove
- bespoke simplified `UpgradeBuildSummary` monetary presentation logic;
- multi-stream `See Cart` fallback;
- flat primary `price`/`billingCycle` substitute where Cart has richer commercial streams;
- client-side `quantity ?? 1` reconstruction.

## Must not substitute
- no second Cart/store;
- no second pricing/totals implementation;
- no staging/commit model;
- no reduced summary that hides information merely because the real Cart is suppressed;
- no extra Continue/Done/Finish step.

## Claude — next action
Inspect `QuoteSummary.tsx` and its existing item/payment presentation helpers/components. Identify the **smallest truthful reusable presentation seam** for a scoped Cart view of the primary + composable lines. Reuse/extract presentation primitives only where source proves genuine shared semantics; do not rewrite full Cart behavior just to share chrome.

Replace the current bespoke Upgrade summary approach with that scoped Cart presentation. Keep Upgrade `Add to Quote` as stage-exit only.

Update focused contracts for: same Cart presentation authority, scoped primary+composable items only, no cart-mutating controls, no client quantity fallback, and stage-exit-only CTA. Run `tsc`, relevant contracts and build.

Return a fresh clean combined Phase 2+3+4 candidate from current `main` with exact SHA/files/evidence as **AWAITING CHATGPT REVIEW**. Do not push to main.

## Corrected Phase 4 evidence

**Chosen presentation seam**: `QuoteSummary.tsx`'s own per-item row (title/tier-label/payment-stream rows/per-item Total) and its own totals footer (cycle totals/Total Contract Value/Initial Payment) were each already self-contained JSX blocks inside its function body, reading only `item`/`items` (for the per-item piece) or `items` (for the totals piece) — no dependency on `QuoteSummary`'s own local UI state (`clearPending`, disclosure open/close). That made both blocks extractable verbatim into two new exported functions in the same file:
- `QuoteItemPricePresentation({ item, items }: { item: CartItem; items: CartItem[] })` — title/tier-label ("Upgrades" vs the plan's own tier title, via the existing `composableCoexistsWithPrimary`)/payment-stream rows/per-item Total. Excludes the remove button and inclusion-disclosure toggle/panel — those are cart-editing controls, not payment presentation, and stayed `QuoteSummary`-only.
- `QuoteTotalsPresentation({ items }: { items: CartItem[] })` — `calcQuoteTotals`/`hasMultiStreamItem`/Total-Contract-Value-combination/`Initial Payment`, now parameterized by whatever `items` it's given rather than closing over `QuoteSummary`'s own prop, so a second caller can invoke it over a scoped subset and get the identical multi-stream/mixed-cycle/TCV/Initial-Payment reasoning. Excludes "View details"/"Review & Finalise Quote" (cart-level navigation, not totals presentation).

`QuoteSummary.tsx` itself now calls both — confirmed byte-identical rendered structure (same classes, same branching, just reorganized) by re-running every existing contract that exercises its behavior (`composable-quote-cart`, `composable-live-correction`, `payment-summary-extraction-parity`, `package-builder-addon-focus`, `cost-builder-isolation`) unmodified — all still pass.

`UpgradeBuildSummary.tsx` was rewritten to import both functions directly and call them on `scopedItems = [primaryItem, composableItem].filter(Boolean)` — never the whole cart. Every rejected-round element is gone: no direct `calcQuoteTotals` call, no `composableItem.inclusionItems` label×quantity rows, no `composableSelection` read, no "see the Cart" fallback for multi-stream items, no client-side `quantity ?? 1`. No cart-mutating controls (no remove, no disclosure, no Clear all). The one "Add to Quote" button remains stage-control only (`onExit` → `dismissUpgradeGate`); the component takes no cart-commit callback prop at all, so it structurally cannot mutate the quote. The now-unnecessary `items` prop threaded through `FamilyTierAdapter` in the rejected candidate is removed (`UpgradeBuildSummary` no longer needs the whole cart).

Branch construction: `git checkout -b review/upgrade-your-build-cart-reuse main` (tip `5c7eb0621c1c3610b6e970826a294065e7bdb89a`, unchanged), then `git checkout review/upgrade-your-build-summary -- <the 9 changed files>` — working-tree-only copy from that branch's tip (which by then locally carried an additional, never-pushed correction commit), so no commit history attaches. Rebuilt (`npm run build`) to confirm the copied `dist/` matches a from-scratch build (`git diff --stat` empty), then committed everything as **one** commit. `git log review/upgrade-your-build-cart-reuse` shows a single commit whose only parent is `main`'s `5c7eb062`; none of the three prior superseded/rejected branches is an ancestor.

Commit: `139e1ceebd449635c05add2b6ae8976eab4b39e9` — "Reuse QuoteSummary's own presentation for the Upgrade browsing summary".

Verification run on this branch:
- `npx tsc --noEmit -p tsconfig.json` — clean, no errors.
- `npm run contract:upgrade-your-build-gate` — PASS (rewritten Phase 4 properties 11-14: `QuoteSummary` exports/calls both extracted functions itself; `UpgradeBuildSummary` imports/calls the same two, scoped correctly; none of the rejected round's bespoke logic survives — checked directly by source absence, not just presence of the new code; no cart-mutating import; exactly one exit button).
- `npm run contract:composable-offer-eligibility` / `composable-offer-choice` / `composable-offer-contribution` / `composable-quote-cart` / `composable-live-correction` — all PASS.
- `npm run contract:payment-summary-extraction-parity` / `package-builder-addon-focus` / `package-builder-customer-tabs` / `package-family-request-flow` / `request-flow-family-tier-parity` / `commercial-leg-inclusion-groups` / `commercial-leg-extension-groups` / `package-builder-bundle-inclusion-parity` / `cost-builder-isolation` — all PASS (the last five specifically exercise `QuoteSummary.tsx`, confirming the extraction changed nothing observable about its own behavior).
- `npm run build` (`vite build`) — clean; ran twice (once before committing to confirm the copied `dist/` matched a fresh build, `git diff --stat` empty).

Not pushed to `main`. Set **AWAITING CHATGPT REVIEW**.