# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — revised Upgrade Journey Finalisation plan corrects the unsafe merge, no source changed.**
- Auditor verdict: **Stop — architectural risk** (on the *prior* plan; revision below addresses it).
- Production remains `main@aa820596e9cdb9bb496d2a5d9292e31e7b0801b2`; Hostinger run `33835470825` succeeded on that SHA.
- No Upgrade Journey source changes made or approved yet.

## Accepted production state retained
Request/Review rail geometry and hidden scrollbar chrome are accepted. Existing composable occupant, pricing/resolver, Rate Sheet, identity, Request persistence/email and published snapshot architecture stay locked. Remaining representation checks still need closure.

## Locked journey direction
**Upgrade your build** and standalone **Build Your Own** are different customer journeys.

Upgrade:
1. starts from an exact selected normal Tier/Edition;
2. customer adds/removes only Admin-authorised composable inclusions/quantities;
3. remains dependent on that exact base while in progress;
4. requires explicit **Finalise build**;
5. after finalisation becomes the final **Build Your Own** composed quote result.

Standalone Build Your Own is deferred and must not simply load beside normal Tier cards.

## Auditor finding on Claude's first plan
The proposed optional `upgradeDraftBase` idea is directionally useful for tying an in-progress upgrade to its base, but the proposed finalisation algorithm is unsafe.

Current `buildComposableFamilyTierQuoteItem()` builds the composable cart line only from the composable occupant preview: its own selected inclusions, resolved periods, headline price and payment summaries. It does **not** contain the selected primary Tier/Edition's inclusions or commercial streams.

Therefore the proposed `finaliseUpgradeQuoteDraft()` cannot safely remove primary + add-ons and merely clear `upgradeDraftBase`. Doing that would leave only the extras/composable commercial snapshot while deleting the base plan commercial value. That is not a composed Build Your Own result.

Second blocker: allowing **Review & Finalise Quote / Request submission** while the upgrade is still un-finalised contradicts the required explicit transition. The current "primary + Upgrades" fallback is not an acceptable final snapshot once this journey exists.

## Claude next instruction — audit/plan only
Before source editing, revise the plan and answer:
1. What exact final cart/snapshot shape represents **base Tier/Edition + selected upgrades** after Finalise Build, including inclusions, quantities, Legs/payment streams, commitment/headline and TCV, without double-counting?
2. Is finalisation best represented as one composed FamilyTierQuoteItem snapshot or another bounded quote-only structure? Reuse existing identities where possible; no new platform entity/Tier System.
3. How is the exact base Tier/Edition snapshot captured so later cart edits cannot silently mutate the finalised build?
4. What happens to normal Tier add-ons during finalisation: included, preserved separately, or rejected? Justify from current architecture.
5. How will Request/PDF/email persist/render the final composed result exactly once?
6. Add a hard customer-flow rule preventing Request submission while an Upgrade draft is un-finalised.
7. Define removal/replacement behavior before finalisation and legacy-cart handling.
8. List exact affected files/contracts and non-change boundaries.

Record the revised design here, set **AWAITING CHATGPT REVIEW**, and make **no source changes**.

## Claude revised audit/plan — corrects the unsafe finalisation algorithm

The auditor's finding is correct and confirmed by source: `buildComposableFamilyTierQuoteItem()` (`ComposableOfferBrowser.tsx`) resolves **only** the composable occupant's own preview (its own `periods`/`contributions`/`rows`) — it never sees the primary Tier/Edition's own inclusions or commercial legs. My first plan's `finaliseUpgradeQuoteDraft()` would have deleted the primary line while keeping only the extras' commercial snapshot. Revised below, answering all 8 questions.

### Key fact this revision relies on (verified from source, not assumed)
The composable occupant is architecturally a separate pricing engine from a normal Tier/Edition (its own Admin-authorised "browse rows", resolved through its own preview endpoint) — there is no existing mechanism to get one server-resolved snapshot covering both in a single call, and building one would mean touching the Tier System resolver, which is out of bounds. So the combination has to happen client-side, over two **already independently correct** resolved snapshots — never by re-deriving or recomputing either one's commercial math.

This is safe because of how the existing math already works (`utils/paymentSummary.ts`):
- `LegPaymentSummary` is keyed by `source` — a specific commercial Leg identifier. Primary and composable Legs always have distinct `source`s (they come from genuinely different Leg configs), so concatenating the two arrays produces no collisions; `QuoteSummary.tsx` already keys each rendered stream row by `stream.source`, so concatenated streams render as correctly separate rows, not merged/overwritten ones.
- `computeTotalContractValue(summaries)` is a flat `reduce`/sum over whatever `LegPaymentSummary[]` it's given, with no assumption about which item a stream came from. Summing primary's real streams + composable's real streams together is not double-counting — it is the correct combined total, arithmetically identical to today's already-correct cart-level total (see next point).
- `startingPaymentsByCycle(itemStreams: LegPaymentSummary[][])` is **already designed to combine across items** ("genuinely same-cycle streams from DIFFERENT items DO add" — its own docblock) and computes "earliest start" as `Math.min` over whichever streams it's given. `Math.min` over a merged array equals `Math.min` of the two separate per-item mins, so folding two items' streams into one item's array before calling it produces the identical result as calling it on two separate items today. Verified, not assumed.
- Today, a composable line already has `isAddon: false` (same as primary), so `QuoteSummary.tsx`'s cart-level Total Contract Value/Initial Payment **already sums primary + composable together correctly**, as two separate cart lines. Nothing about finalisation changes that arithmetic — it only changes the *representation* from two cards to one. This reframes the whole feature: **the math was never wrong; only the structure was** (two coexisting lines instead of one composed result), which is exactly what the auditor's requirement 6 asks to fix.

### Answers

**Q1 — exact final snapshot shape, no double-counting.** One `FamilyTierQuoteItem` whose `inclusionItems` is the **concatenation** of the primary's own resolved `inclusionItems` and the composable draft's own resolved `inclusionItems` (each entry keeps its own already-resolved `quantity`/`line_total` — nothing recomputed), and whose `legPaymentSummaries` is the **concatenation** of both items' own resolved `legPaymentSummaries` arrays (each stream keeps its own `source`/`price`/`subtotal` — nothing recomputed). `computeTotalContractValue`/`startingPaymentsByCycle`/per-item stream-row rendering all already operate generically over "a list of resolved streams for one item" (verified above), so this combined item's TCV/Initial Payment/stream rows come out correct with zero new arithmetic.

**Q2 — representation.** One composed `FamilyTierQuoteItem` snapshot, reusing the existing `isComposable: true` shape exactly as-is (no schema change: `inclusionItems`/`legPaymentSummaries` already support arbitrary-length arrays). No new platform entity, no new quote-only structure, no second Tier System — just populating the existing arrays with entries from two sources instead of one.

**Q3 — mutation-proof snapshot.** `finaliseUpgradeQuoteDraft()` performs one mutation: build the combined item (concatenation above) using the primary and composable lines' *current* resolved field values, then **remove the primary line from the cart entirely** and replace the composable line with the combined one, clearing `upgradeDraftBase`. There is nothing left in the cart to "silently mutate" afterward — the primary no longer exists as a separate line, and the combined item is a plain data snapshot exactly like every other cart line already is (the same "captured once, never re-resolved from live data" guarantee `inclusionItems`/`legPaymentSummaries` already carry today). No new mutation-protection mechanism needed; this is the existing cart-item-as-frozen-data invariant, just applied to one more field combination.

**Q4 — Tier add-ons.** **Preserved separately, untouched.** Tier add-ons (`resolveQuoteItemRole() === 'addon'`) are an orthogonal existing system (`PricingTiers.tsx`'s "Optional add-ons" recommendations) — architecturally distinct from the composable occupant's own "Admin-authorised composable inclusions," and the Upgrade journey's own description (requirement 2) only ever mentions composable inclusions, never Tier add-ons. Folding add-ons into the combined snapshot too would require merging a third independently-resolved commercial source, multiplying double-counting surface area for a case that isn't in scope. `finaliseUpgradeQuoteDraft()` therefore only removes/merges the **primary**; any add-on lines for that Family+Instance keep coexisting exactly as they already do today, both before and after finalisation.

**Q5 — Request/PDF/email, exactly once.** No backend change needed. The combined item is still just one `FamilyTierQuoteItem` with `isComposable: true` — `RequestSchema.php`'s existing per-field allow-list already copies `isComposable`/`inclusionItems`/`legPaymentSummaries` unconditionally regardless of array length, and `QuoteProposalPreview.tsx`/`NotificationTemplates.php` already render whatever `inclusionItems`/`legPaymentSummaries` an item carries generically. Because finalisation collapses two cart lines into one, the composed result now renders exactly once (one card, one set of streams) where today's coexistence would render as two — this is a direct, automatic consequence of the cart now containing one line instead of two, not a new rendering rule.

**Q6 — hard submission gate (added; corrects my first plan's "no gate needed" call, which the auditor is right to reject).** New pure predicate `hasUnfinalisedUpgradeDraft(items: CartItem[]): boolean` in `utils/quote.ts` — true iff any cart item is `resolveQuoteItemRole() === 'composable'` with `upgradeDraftBase` still set (i.e., a valid or stale in-progress draft; either way, un-finalised). Wired into **two** existing, already-boolean-gated places (defense in depth, same predicate both times):
- `QuoteSummary.tsx`'s "Review & Finalise Quote" CTA — add `|| hasUnfinalisedUpgradeDraft(items)` to its `disabled` condition (new; today it's never disabled), with a small inline hint ("Finalise your build before requesting a quote") — same visual pattern already used for the modal's own disabled Submit button.
- `QuoteCartFlow.tsx`'s `canSubmit` (currently `step === 'review' && isValid && !isSubmitting`) — add `&& !hasUnfinalisedUpgradeDraft(items)`, so even if the modal was already open before a draft went stale, Submit stays blocked. This reuses the exact existing `canSubmit`/`disabled` gating pattern already in the codebase — no new UI mechanism.

**Q7 — removal/replacement before finalisation, legacy handling.** Unchanged from the first plan, still correct on its own terms (the auditor's finding was about finalisation, not this part): `composableDraftIsStale(item, items)` — true iff the item is a composable line with `upgradeDraftBase` set and no primary in `items` for the same `familyId`+`tierInstanceId` matches its recorded `tierPlatformId`/`tierEditionPlatformId`. `replaceFamilyNormalQuoteItem()` and `removeFamilyTierSystemQuoteItems()` each gain one filter clause dropping the composable line when this becomes true for it — covers both full removal and swapping to a different Tier/Edition. A finalised line (no `upgradeDraftBase`) is never touched. Legacy/existing carts and Requests simply omit `upgradeDraftBase` entirely, which reads as "not a draft" (today's unconditional-survive behavior) — no migration needed in either direction.

### Affected files (still not touched — plan only)
- `resources/ts/components/cost-builder/types.ts` — add `upgradeDraftBase`.
- `resources/ts/utils/quote.ts` — `composableDraftIsStale()`, `hasUnfinalisedUpgradeDraft()`, revised `finaliseUpgradeQuoteDraft()` (builds the combined item per Q1, removes the primary, leaves add-ons alone), extend `replaceFamilyNormalQuoteItem()`/`removeFamilyTierSystemQuoteItems()`.
- `resources/ts/components/package-builder/ComposableOfferBrowser.tsx` — stamp `upgradeDraftBase` in the commit builder; add the explicit "Finalise build" action.
- `resources/ts/components/package-builder/FamilyTierAdapter.tsx` — pass the primary's exact identity (and its resolved `FamilyTierQuoteItem`, needed for the Q1 combination) down alongside `context`.
- `resources/ts/components/package-builder/PackageBuilderApp.tsx` — wire a `finaliseComposable` callback (mirrors `addComposable`/`removeComposable`).
- `resources/ts/components/cost-builder/QuoteSummary.tsx` — gate the "Review & Finalise Quote" CTA on `hasUnfinalisedUpgradeDraft()`.
- `resources/ts/components/request-flow/QuoteCartFlow.tsx` — add the same predicate to `canSubmit`.
- **No change:** `OrderSummary.tsx`, `QuoteProposalPreview.tsx`, `RequestSchema.php`, `RequestRepository.php`, `NotificationTemplates.php`, `RequestLifecycle.php`, `composableCoexistsWithPrimary()` (already correctly returns `false` once the primary is removed — no change needed there), any Tier/Package/Rate Sheet backend surface.

### Proposed focused contracts
`contract:upgrade-quote-draft` (pure `utils/quote.ts` logic, no DOM): (1) draft survives an unchanged-base replace/remove; (2) dropped when the base is removed; (3) dropped when the base is replaced with a different Tier/Edition; (4) a finalised line is never touched by either mutation; (5) `finaliseUpgradeQuoteDraft()` is a no-op on a stale/absent draft; (6) on a valid draft, the combined item's `inclusionItems`/`legPaymentSummaries` are exactly the concatenation of both sources with no entries lost or duplicated, the primary line is gone, add-on lines are untouched, and `upgradeDraftBase` is cleared; (7) `computeTotalContractValue`/`startingPaymentsByCycle` over the combined item's streams equal the sum of what the two separate items would have produced before finalisation (regression-locks the "math was already correct" claim above); (8) `hasUnfinalisedUpgradeDraft()` is true exactly when a draft (valid or stale) exists and false once finalised or absent; (9) `composableCoexistsWithPrimary()` returns `false` immediately post-finalisation.

## Work journey
Representation closure → Upgrade Journey semantics → implementation/review/deploy/live validation → final customer UI/UX refinement → later standalone Build Your Own journey.