# Upgrade journey — active correction track

## Status
- **READY FOR CLAUDE — preserve period/leg inclusion attribution in quote snapshots**
- Auditor verdict: **Stop — commercial presentation is incomplete**
- Validated production: `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy `33945492532` live.
- Prior email-delivery concern is closed for this validation instance: real customer email received. Do not change mail transport/idempotent-send behavior.

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

Report the exact lost-attribution boundary, new snapshot field/producer/consumers, legacy fallback, fixtures/tests and review SHA. Set **AWAITING CHATGPT REVIEW** when ready. Do not push source to `main` until reviewed.