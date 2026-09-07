# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Phase-4 data-path correction recorded, no source edits made**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `bd0a48d8be81c591e48ebe220dda21645b349089`; deploy #970 succeeded.
- Correction: `UpgradeBuildSummary` takes raw cart `items` (same prop-drilling seam as `QuoteSummary`/`MobileQuoteBar`) and calls the same exported `calcQuoteTotals`/`computeTotalContractValue`/`startingPaymentsByCycle` functions `QuoteSummary` already uses — no precomputed totals prop, no second arithmetic.

## Locked customer flow
The primary Tier/Edition is already in the quote before this stage. This is rearrangement/visibility/navigation around existing state only: no second cart, temporary build, duplicate pricing, or new quote commit model.

1. Focused Tier -> existing Add to Quote.
2. When a real Upgrade Your Build catalogue exists, hide Cart + Recommended Add-ons and show **Upgrade your build** gate.
3. **Browse Catalogue** -> existing `ComposableOfferBrowser` in the focused shell.
4. **Maybe next time** -> end gate -> existing Recommended Add-ons if present -> Cart; otherwise Cart directly.
5. Catalogue left remains existing filters/featured/default-selection/quantity/max-6 paging behavior.
6. Catalogue right shows the already-quoted plan plus upgrade rows as `name × qty` and the same truthful commercial totals used by the cart.
7. Existing composable auto-sync remains active while browsing and must NOT close the gate.
8. New right-side **Add to Quote** is stage-control only: no quote mutation; it ends the gate and resumes the same Add-ons/Cart continuation.

## Accepted phase sequence
1. Extract/share the existing composable eligibility derivation with no behavior change.
2. Add eligibility-gated `pending|browsing|null` state; hide Cart/MobileQuoteBar/Recommendations while gated; `Maybe next time` resumes existing flow.
3. Wire Browse Catalogue to the existing `ComposableOfferBrowser`; keep its existing auto-sync and catalogue behavior unchanged.
4. Add the right-side build summary + explicit stage-exit **Add to Quote**.
5. Mobile stacking/polish + matrix QA for catalogue/add-on combinations.

## One correction required before implementation
Claude's revised plan says `PackageBuilderApp` already computes the cart totals and can pass those computed values down. Source does **not** support that statement: `PackageBuilderApp` currently derives `primary`/`addonItems`/`composableItem`, while `QuoteSummary.tsx` performs its own `calcQuoteTotals(items)`, TCV, starting-payment and related presentation derivations.

Do not introduce a second total implementation inside `UpgradeBuildSummary`, and do not weaken/rewrite the real `QuoteSummary` merely to reuse its CTA shell.

Claude: amend Phase 4 planning only. Identify the smallest truthful reuse seam for the right-side summary. Preferred direction: extract/reuse a pure shared cart-summary projection/derivation from the existing `QuoteSummary` logic where needed, or pass the existing cart items through the same authoritative helper functions. The Upgrade summary may have different markup/CTA, but its monetary facts must come through the same existing calculation authority, not copied arithmetic.

Also confirm where the simple `name × qty` rows come from (existing committed composable quote item/inclusion data) without inventing a second selection state.

No implementation yet. Record the corrected Phase-4 data path and set **AWAITING CHATGPT REVIEW**.

## Claude's Phase-4 correction (source read from `main`)

Confirmed against source: the earlier claim was wrong. `QuoteSummary.tsx` receives only `items: CartItem[]` plus callbacks (props at `QuoteSummary.tsx:9-26`) — it is not handed precomputed totals. It performs its own derivations internally: `calcQuoteTotals(items)` (`QuoteSummary.tsx:36`, defined `utils/quote.ts:363-375`, `export function calcQuoteTotals(items: CartItem[]): QuoteTotals`), plus `computeTotalContractValue` and `startingPaymentsByCycle` from `utils/paymentSummary.ts` (`QuoteSummary.tsx:61,83,139`, exported at `paymentSummary.ts:44` and `:66`). All are pure, `export`ed functions of `items` (or of a cart item's own `legPaymentSummaries` field) — none are module-private, none live inside `QuoteSummary` itself.

**Corrected reuse seam:** `UpgradeBuildSummary` does not receive precomputed totals as props, and does not import/render `QuoteSummary`. Instead:
- `PackageBuilderApp.tsx` passes the same raw `items` state (line 48) down to `UpgradeBuildSummary` exactly as it already does to `QuoteSummary` (`PackageBuilderApp.tsx:207`) and `MobileQuoteBar` (`:216`) — an established, repeated pattern, not a new one.
- Inside `UpgradeBuildSummary`, import and call the identical exported functions `QuoteSummary` calls — `calcQuoteTotals` from `@/utils/quote`, `computeTotalContractValue`/`startingPaymentsByCycle` from `@/utils/paymentSummary`, and `orderedQuoteItems`/`isFamilyTierQuoteItem`/`resolveQuoteItemRole` as needed to pick out the primary vs. composable rows — the same call shapes `QuoteSummary.tsx` already uses. This is a second *call* to the same authoritative pure functions on the same data, not a second *implementation* — zero new arithmetic.
- Only `QuoteSummary`'s own markup/CTA (`Review & Finalise Quote`, clear-all, per-line remove) is skipped; its underlying calculation authority is fully reused.

**`name × qty` rows:** sourced from the already-committed composable `CartItem` living in `items` (the entry `resolveQuoteItemRole` resolves as `'composable'`) — specifically its `composableSelection: ComposablePreviewChoiceItem[]` field, the same field `ComposableOfferBrowser.tsx`'s `seedSelectionFromCartItem` already reads to reseed Add/Remove state. `UpgradeBuildSummary` reads this array directly off the cart item passed down from `PackageBuilderApp`; no new selection state is created — this is display of state that already exists because auto-sync already wrote it.

Phase 4 in the accepted sequence above is unchanged in scope/order; only its internal data path is corrected: `UpgradeBuildSummary` takes raw `items` (not precomputed totals) and calls the same exported `utils/quote.ts` / `utils/paymentSummary.ts` functions `QuoteSummary` uses.

Set **AWAITING CHATGPT REVIEW**.