# Composable Tier Occupant — Quote/Cart Connection

**Quote/cart connection phase — review branch, not yet live-validated.**
Implements `project-work/2026-09-03-composable-tier-admin-to-customer-validation.md`.
Connects the customer-facing composable browsing surface documented in
[Composable Tier Occupant — Customer UX](tier-composable-occupant-customer-ux.md)
to the existing quote/cart engine. Browser-only: no Request/PDF/email
changes this phase (see that boundary below).

## Locked architecture

The composable occupant reuses the existing `FamilyTierQuoteItem`/`offer_type:
'family_tier'` shape — never a third `CartItem` union member — so every
generic consumer (cart persistence, admin Request mapping, PDF/quote-view)
stays unaware a new role exists. A new `isComposable?: boolean` field is
orthogonal to `isAddon`, never reused from it (`resolveQuoteItemRole()`,
`utils/quote.ts`, the one place primary/addon/composable is resolved — no
call site re-derives it independently). `tierId` is additively widened to
admit a customer-side `COMPOSABLE_QUOTE_TIER_ID` sentinel
(`components/cost-builder/types.ts`) — deliberately a SEPARATE constant
from Package Station's admin-only `COMPOSABLE_TIER_ID`; neither module
imports the other's.

`quoteItemKey()` gives the composable line its own `:composable` suffix
(never colliding with `:primary`/`:addon:*`). `replaceFamilyNormalQuoteItem()`
and `removeFamilyTierSystemQuoteItems()` both now exclude a composable line
from primary-replace/-removal — a standalone "Build Your Own" selection
(`context: 'build_your_own'`, no primary Tier chosen) must survive the
primary's own removal, unlike an Add-on's existing orphan-cascade rule,
which is otherwise unchanged. New `upsertFamilyComposableQuoteItem()`/
`removeFamilyComposableQuoteItem()` mirror the existing Add-on functions.
`classifyQuoteItems()` gained a distinct `familyComposableItems` bucket —
`familyMainItems` (still read as "the primary") never includes it, though a
combined commercial total (Total Contract Value/Initial Payment) may
legitimately aggregate both.

## Commit/removal — driven only by a successful server preview

`ComposableOfferBrowser.tsx` owns building and committing the one aggregate
composable line, via new `onCommit`/`onRemoveFromQuote` props
(`FamilyTierAdapter.tsx` -> `PackageBuilderApp.tsx`). The exported
`buildComposableFamilyTierQuoteItem()` builds it entirely from the LATEST
SUCCESSFUL `resolveComposablePreview()` response: `price`/`billingCycle`
via the existing `resolveHeadlinePrice()`, `legPaymentSummaries` via the
existing `buildLegPaymentSummaries()`, and `inclusionItems` from the
already-resolved `contributions` map — never recomputed from the
submitted `choice` payload, which becomes only the item's own
`composableSelection` (intent/history for re-seeding, not a pricing
source). A failed/unavailable preview response returns before any
commit; a superseded in-flight request is dropped by the existing
`cancelled` debounce guard — both already covered the preview-only surface
and now equally protect the cart from a stale/failed write.

Sync only fires after genuine customer interaction (`hasInteracted`,
local state set by the row Add/Remove/quantity handlers) — never from the
initial default-seeded render or from re-seeding an already-committed
selection back from the cart, so merely viewing this surface never itself
mutates the cart. When the resolved choice contains zero required and zero
selected-optional items, `onRemoveFromQuote()` fires instead of a
zero-value placeholder commit; a required-only composition (no optional
rows at all) always resolves as non-empty and persists. Reopening an
already-quoted Family reseeds `selection` from the existing item's own
`composableSelection` (falling back to policy defaults for any row it
doesn't cover), not from scratch.

## Presentation — reused, not forked

`QuoteSummary.tsx`'s cart list/count/TCV already iterate the flat cart
array or `!item.isAddon`, so a composable line renders and totals
correctly there with zero code changes. `OrderSummary.tsx` (the live
pre-submission review step) gained one more `.map()` over
`familyComposableItems`, matching the existing primary/Add-on row
structure, and its Family Contract Value block now sums
`[...familyMainItems, ...familyComposableItems]`.
`QuoteDetailsOverlay.tsx`'s per-item Plan Details tab falls back to
"Details unavailable" for a composable line (`family.pricing.tiers` has no
composable entry to resolve against) — its Total Commitment tab and cart
rendering are otherwise already correct, since neither is primary-name-
specific the way `classifyQuoteItems()` was.

## Phase boundary — deliberately untouched

`QuoteProposalPreview.tsx` (shared by the live "View full quote" expand
panel AND Admin PDF print — see `admin-station/CLAUDE.md`), `RequestSchema.php`,
Request mapping, and proposal email are all out of scope this phase. A
composable line is consequently invisible in that one expanded-preview/PDF
surface today (silently absent, never mislabeled as primary) until the
deferred Request -> PDF -> email phase lands.

## Validation

`scripts/composable-quote-cart-contract.ts`
(`npm run contract:composable-quote-cart`) proves coexistence with unique
keys, primary/composable mutual independence, the empty-composition removal
rule, single-use `legPaymentSummaries`, legacy-cart compatibility, and the
stale/failed-preview guard. `scripts/request-flow-family-tier-parity-contract.ts`
updated for the new third per-item Total row in `OrderSummary.tsx` only.

## Related Code Maps

[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant — Customer UX](tier-composable-occupant-customer-ux.md),
[Composable Tier Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md),
and [Commercial Legs](commercial-legs.md).
