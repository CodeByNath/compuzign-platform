# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW — period/leg inclusion attribution implemented**
- Auditor verdict: **Stop — commercial presentation is incomplete**
- Validated production (unchanged, `main` not touched this round): `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy `33945492532` live.
- Prior email-delivery concern remains closed for this instance — nothing in this round touches mail transport/idempotent-send behavior.
- Review head with this round's implementation: `review/upgrade-journey-finalisation@e9fac9bf11accc58448a059a81b01f41a858697d` — **not yet pushed to `main`**, awaiting this review.

## Claude's report — implementation: preserve period/leg inclusion attribution

### The exact lost-attribution boundary
`buildLegPaymentSummaries()` (`cost-builder/PricingTiers.tsx`) dedupes every `CommercialLegPeriod[]` by `component.source` into one continuous payment stream per Leg, and **never reads `component.items` at all** — the per-inclusion `item_id`/`label`/`quantity`/`unit_price`/`line_total` rows are discarded the instant `LegPaymentSummary[]` is built. Separately, `FamilyTierQuoteItem.inclusionItems` is one flat, Period-less list captured from `effective.inclusionItems` (the currently-displayed card's own resolved inclusions), with no record of which Period/cadence produced which charge. Neither shape can be reconstructed backward into "which inclusion caused this specific Monthly/Yearly figure" — confirmed by reading both functions/types directly rather than assumed.

### New snapshot: `FamilyTierQuoteItem.commercialBreakdown`
Additive, nullable, alongside `legPaymentSummaries` (untouched) — `QuotedBreakdownPeriod[]` (new types in `utils/paymentSummary.ts`, colocated with `LegPaymentSummary` for the same reason that file was extracted from `PricingTiers.tsx`: importable without pulling `PricingTiers.tsx`'s whole component tree in):
```ts
interface QuotedBreakdownInclusion { id; label; quantity; unitPrice; lineTotal; includes?: QuotedBreakdownInclusion[] | null; }
interface QuotedBreakdownComponent { source; billingCycle; price; inclusions: QuotedBreakdownInclusion[]; }
interface QuotedBreakdownPeriod { fromMonth; toMonth; components: QuotedBreakdownComponent[]; }
```
`source` is retained only for stable internal grouping (matches `CommercialLegComponent.source`, a Leg Platform ID or the `'default'` legacy fallback) — I verified it is never rendered as visible text anywhere: every consumer below uses it only as a React list `key` (DOM-internal, never displayed) or drops it entirely from customer-facing labels, which are built from `fromMonth`/`toMonth`/`billingCycle` only.

### Producer: `buildQuotedCommercialBreakdown(periods)`
`cost-builder/PricingTiers.tsx`, beside `buildLegPaymentSummaries()` (same reasoning for staying there: it consumes raw `CommercialLegPeriod[]`, which only ever exists during live resolution). A straightforward structural map — every Period, every *available* component, every inclusion (recursing into Bundle `includes`) — preserving each occurrence exactly once, the deliberate opposite of both `buildLegPaymentSummaries()`'s dedup and `commercialLegInclusionGroups()`'s first-seen-wins shape (neither touched).

Wired into **both** quote-item producers, confirmed to be the only two in the codebase (`grep -rn "offer_type: 'family_tier'"` across `resources/ts` returns only the type declaration and these two object literals):
- `FamilyTierAdapter.tsx`'s `itemFor()` — covers primary Tier/Edition selection AND Tier add-ons (the same function builds both, `isAddon` parameterized) — from the same `activeCommercialLegs` already feeding `legPaymentSummaries`.
- `ComposableOfferBrowser.tsx`'s `buildComposableFamilyTierQuoteItem()` — the Upgrade producer — from its own `periods` parameter.

Since each item independently builds its own breakdown from its own resolved Periods at its own producer call site, primary/Upgrade/add-on structurally cannot cross-assign rows — there is no shared array they could contaminate.

### Shared presentation derivation and consumers
`disclosureRowsForFamilyTierItem()` (`cost-builder/InclusionDisclosure.tsx`) — the ALREADY-existing shared row derivation `QuoteSummary.tsx`'s cart disclosure and `QuoteDetailsOverlay.tsx`'s Total Commitment disclosure both already call — now checks `item.commercialBreakdown` first, producing rows tagged with a `groupLabel` (e.g. `"Month 11–Indefinite · Yearly"`), before falling through unchanged to the existing `inclusionItems`/`features` rendering. This is the ONE pure shared derivation reused everywhere:
- **Cart disclosure** (`QuoteSummary.tsx`) and **Total Commitment disclosure** (`QuoteDetailsOverlay.tsx`) — automatically, since both already call this function; `InclusionDisclosurePanel` now renders a group-heading row ahead of each label run.
- **Review/PDF and customer View/Print Quote** — `QuoteProposalPreview.tsx`'s `FamilyInclusionsList` now calls the same `disclosureRowsForFamilyTierItem()` and renders its grouped rows; `QuoteViewApp.tsx` reuses `QuoteProposalPreview.tsx` directly, so it's covered by the same change with no separate edit. (Admin print reuses this same component too, per its own docblock describing it as "the exact customer proposal presentation" — a bonus, not a new requirement.)
- **Customer email** — `NotificationTemplates.php`'s new `emailCommercialBreakdownRows()`, wired into `emailFamilyRow()` ahead of the existing `emailInclusionItemsList()`/`familyDisplayInclusions()` fallback, in both admin and customer templates (the one shared code path both already run through).
- Also applied to `OrderSummary.tsx`'s own compact "Selected services" feature list (the same component pattern duplicated there for its own CSS namespace) for end-to-end consistency within the single Review & Finalise screen — not explicitly named in the required-consumers list, but directly adjacent to it.

### Persistence: no live re-resolution
`RequestSchema::sanitizeCommercialBreakdown()` (new, mirrors `sanitizeInclusionItems()`'s exact recursive per-field allow-list convention) threads the snapshot through submission at `sanitizeItems()`, plus a matching `restArgs()` schema entry. Carried through exactly as captured — never re-derived from `legPaymentSummaries` (which has already discarded the data) or re-resolved from any live source.

### Legacy fallback
Every consumer checks for `commercialBreakdown` presence first and falls through unchanged to today's existing rendering when absent (`null`, or a pre-existing Request predating this field) — never fabricating attribution. Verified explicitly in both the TS contract test and the PHP fixture (an item with `features` set but no `commercialBreakdown` renders exactly as it always did).

### Fixtures/tests
- `tests/request-schema-family-quote-snapshot.php` — extended with the exact "Starter Cloud" shape end to end through `sanitizeItems()`: both Periods survive, the Month-11 Period keeps all 3 of its own components (never deduplicated), the Static IP Block inclusion's label/quantity/unit price/$80 line total survive intact, Bundle parent/child survive, unknown nested fields stripped, legacy items default to `null`, `restArgs()` declares the new field.
- `tests/notification-templates-family-quote-parity.php` — extended with the same shape through both `buildAdminHtmlEmail()` and `buildCustomerHtmlEmail()`: both show the `"Month 11–Indefinite"` group heading, the exact inclusion label, the `$80.00` line total, the first Period's own heading, and — critically — that the legacy flat inclusion list does NOT render when `commercialBreakdown` is present (proves fallback priority order is correct, not just that both paths individually work).
- `scripts/composable-quote-cart-contract.ts` (section 15) — pure-function coverage for `buildQuotedCommercialBreakdown()`: Period preservation, open-ended `toMonth` never coerced, unavailable components excluded, multiple available components in the SAME Period never deduplicated together (the exact "Static IP Block alongside the continuing base Leg" shape); and for `disclosureRowsForFamilyTierItem()`: group-label priority over the legacy `features[]` fallback, and legacy items completely unaffected.
- Full `tests/*.php` suite and full `npm run contract:*`/`regression:*` sweep (85 scripts) + `docs:check` run: only the same pre-existing, unrelated failures from prior rounds remain (Tier Occupant/Edition Admin, Rate Sheet Tool CSS, Platform Identifier schema, a `RequestsController` test's own outdated constructor signature, Service route fixtures) — none touch any file this round changed.

### Not independently verifiable without a live browser / real mail client
Actual visual rendering of the group headings across the 5 surfaces, and a real received customer email showing the Starter Cloud breakdown — no live browser or mail-send capability is available in this environment. Verified at the source/logic level (pure-function + PHP fixture regressions matching the exact reported shape) but not visually confirmed.

## Live defect
Starter Cloud shows Monthly `$156.50`, Yearly `$80`, Total `$7,592`, but cart disclosure, Review/PDF, received email, customer View/Print Quote and Total Commitment expose only a generic inclusion list. They do not explain that the yearly charge beginning Month 11 is **Static IP Block (8 IPs, 5 usable), qty 2 x $40 = $80/year**.

View Details -> Billing Breakdown by Period already has the authoritative explanation. Customer outputs must preserve it.

## Auditor architecture correction before implementation
Current snapshot shapes are insufficient:
- `FamilyTierQuoteItem.inclusionItems` is one generic flattened inclusion snapshot.
- `LegPaymentSummary` deliberately deduplicates by `component.source` across Periods and contains no inclusion rows.
- `buildLegPaymentSummaries()` therefore cannot recover period-level inclusion attribution later.
- Durable customer quote view/Request rendering must not re-resolve live Family/Rate Sheet catalog data after submission.

Therefore **do not try to reconstruct this presentation from `legPaymentSummaries`, `inclusionItems`, headline totals, or current live catalog data**.

Create an **additive quoted commercial-breakdown snapshot** at the existing Add-to-Quote/preview boundary, sourced directly from the already-resolved `CommercialLegPeriod[]` for the exact Tier/Edition/Upgrade selection. Preserve, per period and available component:
- from/to month;
- component source internally for stable grouping only;
- billing cadence;
- component price/subtotal fact;
- each priced inclusion's label, quantity, unit price, line total, Bundle display children where already projected.

Do not expose component/Leg IDs or Rate Sheet keys to customers. Do not replace existing `legPaymentSummaries`; they remain the compact payment/TCV snapshot. This new field explains those numbers.

Do **not** use `commercialLegInclusionGroups()` as the persistence shape: it intentionally first-seen-deduplicates each Leg source and drops Period boundaries. A display helper may consume the new snapshot, but the stored snapshot must retain the original period/component occurrences exactly once.

## Required implementation
1. Audit all quote producers: primary Tier, Edition, add-on, and Upgrade preview. Capture the same exact resolved breakdown for each item at successful quote creation.
2. Thread the additive snapshot through request sanitization/persistence without live re-resolution.
3. Build one pure shared customer presentation derivation over that snapshot.
4. Reuse it in cart disclosure, Total Commitment disclosure, Review/PDF, customer email, and View/Print Quote.
5. Keep top-level Monthly/Yearly/Total unchanged; breakdown only explains them.
6. Same inclusion in multiple Legs/Periods remains separate. No merging/deduping across components or periods.
7. Primary + Upgrade + add-on never cross-assign breakdown rows.
8. Legacy snapshots lacking the new field fall back to today's generic inclusion display; never fabricate attribution.

## Acceptance
- Starter Cloud explicitly shows Month 11 yearly Static IP Block qty 2 x $40 = $80.
- All customer surfaces agree on period, cadence, inclusion, qty, unit price, line total and leg subtotal.
- Breakdown reconciles to existing stream totals/TCV without a second pricing calculator.
- Submitted quote remains stable if live Rate Sheet/Tier data later changes.
- No identity, pricing authority, cart mutation, recipient, mail transport, filter, hydration or PDF-name behavior changes.

Done — see "Claude's report" above. Awaiting review of `review/upgrade-journey-finalisation@e9fac9bf11accc58448a059a81b01f41a858697d`. Do not push source to `main` until reviewed.