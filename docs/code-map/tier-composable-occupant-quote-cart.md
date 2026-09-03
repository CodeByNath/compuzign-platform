# Composable Tier Occupant — Quote/Cart Connection

**Quote/cart connection phase — live and accepted; Request/PDF/email
propagation phase — review branch, not yet live-validated.**
Implements `project-work/2026-09-03-composable-tier-admin-to-customer-validation.md`.
Connects the customer-facing composable browsing surface documented in
[Composable Tier Occupant — Customer UX](tier-composable-occupant-customer-ux.md)
to the existing quote/cart engine, and — per the Request/PDF/email
propagation phase below — carries the same `isComposable` discriminator
through the Request pipeline to Admin display, print/PDF, and email.

## Locked architecture

Reuses the existing `FamilyTierQuoteItem`/`offer_type: 'family_tier'` shape
— never a third `CartItem` union member. `isComposable?: boolean` is
orthogonal to `isAddon` (`resolveQuoteItemRole()`, `utils/quote.ts` — the
one place primary/addon/composable is resolved). `tierId` is additively
widened to admit a customer-side `COMPOSABLE_QUOTE_TIER_ID` sentinel — a
SEPARATE constant from Package Station's admin-only `COMPOSABLE_TIER_ID`.

`quoteItemKey()` gives the composable line its own `:composable` suffix.
`replaceFamilyNormalQuoteItem()`/`removeFamilyTierSystemQuoteItems()` both
exclude a composable line — it must survive the primary's own removal,
unlike an Add-on's orphan cascade. `upsertFamilyComposableQuoteItem()`/`removeFamilyComposableQuoteItem()`
mirror the Add-on functions. `classifyQuoteItems()` carries a distinct
`familyComposableItems` bucket, never merged into `familyMainItems`, though
a combined commercial total may legitimately aggregate both.

## Commit/removal — driven only by a successful server preview

`ComposableOfferBrowser.tsx` owns building and committing the one aggregate
composable line, via `onCommit`/`onRemoveFromQuote` props
(`FamilyTierAdapter.tsx` -> `PackageBuilderApp.tsx`). `buildComposableFamilyTierQuoteItem()`
builds it entirely from the LATEST SUCCESSFUL `resolveComposablePreview()`
response — `price`/`billingCycle`/`legPaymentSummaries`/`inclusionItems` all
via the existing resolvers, never recomputed from the submitted `choice`
payload, which becomes only the item's own `composableSelection`
(intent/history for re-seeding, not a pricing source). A failed/unavailable
preview never commits; a superseded in-flight request is dropped by the
existing `cancelled` debounce guard.

Sync only fires after genuine customer interaction — never from the
initial default-seeded render. Zero required/selected-optional items fires
`onRemoveFromQuote()` instead of a zero-value commit. Reopening an
already-quoted Family reseeds `selection` from `composableSelection`.

## Correction round — reactive-sync callback stability

Review found a release-blocking loop: `addComposable`/`removeComposable`
were plain closures redefined every render; the preview effect depends on
them, so a commit's own `setItems()` re-render re-triggered the effect,
re-committing the SAME unchanged selection unbounded. Fixed with
`useCallback`, keyed on the Family's own identity strings, constructed
before the early returns (Rules of Hooks). `composable-quote-cart-loop-regression.mjs`
mounts the real composition (esbuild + happy-dom + Preact `render()`)
proving one interaction yields exactly one preview call and one cart write.

## Presentation — reused, not forked

`QuoteSummary.tsx` already iterates the flat cart array, so a composable
line renders with zero code changes. `OrderSummary.tsx` gained a `.map()`
over `familyComposableItems`; its combined totals sum
`[...familyMainItems, ...familyComposableItems]`. `QuoteDetailsOverlay.tsx`
falls back to "Details unavailable" for a composable line's Plan Details.

## Request / PDF / email propagation phase

Audit found the discriminator dropped at the one sanitisation gate:
`RequestSchema::sanitizeItems()`'s `family_tier` branch built its stored
line from a fixed allow-list that never copied `isComposable`/`composableSelection`.
Every downstream reader fell back to its `isAddon`-only split and
misclassified a stored composable line as primary — including a
reproducible duplicate-key defect: primary and composable lines for the
same Family+Tier-Instance reconstructed to the identical `quoteItemKey()`.

Fix persists ONLY `isComposable` (default false) — never
`composableSelection`, which is browser re-seed state, not a fact about a
terminal, immutable Request. The sanitiser guards the impossible state at
the write boundary: `isComposable: true` forces `isAddon: false`
regardless of the raw payload, rather than relying on every reader to
re-apply that precedence. `requestLineToCartItem.ts::toCartItem()`
reconstructs it — the one line that fixes the misclassification.
`QuoteProposalPreview.tsx` (shared by "View full quote" AND Admin PDF
print) gained its own composable block, a "Build Your Own" eyebrow, and
folds into the same combined totals as `OrderSummary.tsx`
(`familyCommercialItems = [...familyMainItems, ...familyComposableItems]`).
`NotificationTemplates.php` ports the same split — `resolveItemRole()`
(mirrors `resolveQuoteItemRole()`), a fourth `familyComposableItems`
bucket, a "Build Your Own" email badge — so email, PDF, and cart never
diverge on classification.

`inclusionItems`/`legPaymentSummaries`/`tierEditionTitle` already
round-tripped correctly (predating composable) — wiring/classification
only, no new commercial-data plumbing.

## Validation

`contract:composable-quote-cart` proves coexistence with unique keys,
primary/composable mutual independence, the empty-composition removal rule,
single-use `legPaymentSummaries`, and legacy-cart compatibility.
`regression:composable-quote-cart-loop` proves the callback-stability fix
above. `contract:composable-request-line` proves Request-line role
reconstruction and the duplicate-key fix. `tests/request-schema-composable.php`
and `tests/notification-templates-composable-quote-parity.php` cover the
PHP sanitiser guard and email three-way classification. `request-flow-family-tier-parity-contract.ts`
and two siblings updated: `QuoteProposalPreview.tsx` now carries the same
third per-item row `OrderSummary.tsx` already had.

## Related Code Maps

[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant — Customer UX](tier-composable-occupant-customer-ux.md),
[Composable Tier Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md),
and [Commercial Legs](commercial-legs.md).
