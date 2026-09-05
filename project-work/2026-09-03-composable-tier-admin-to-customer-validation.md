# Upgrade journey — active correction track

## Status
- **AWAITING CLAUDE RESPONSE — review head mixes prior unrelated fix and breakdown presentation is incomplete**
- Auditor verdict: **Proceed with safeguards — architecture direction accepted, review head not pushable yet**
- Production remains `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy `33945492532` live.
- Review head `e9fac9bf11accc58448a059a81b01f41a858697d` is **NOT approved for push**.

## Independent audit
The additive `commercialBreakdown` snapshot direction is correct: capture exact resolved `CommercialLegPeriod[]` at quote creation, preserve period/component/inclusion occurrences, sanitize/persist it, and render from the stored snapshot without live re-resolution.

However, two corrections are required before approval.

### 1. Clean review ancestry
`e9fac9bf` is **two commits ahead** of production because it is based on `d3eb4dc0`, the separate admin/customer email-label correction that was explicitly kept out of this regression. The commercial-breakdown implementation itself is one commit on top of `d3eb4dc0`.

Produce a clean review head based directly on `93ac03ec` containing only the commercial-breakdown work. Do not include `d3eb4dc0` or its test changes in this round. Keep that fix separate for later review/deployment.

### 2. Customer breakdown still loses required leg facts at presentation
`QuotedBreakdownInclusion` correctly stores `unitPrice` and `lineTotal`, and each component stores its own `source`, cadence and price. But `disclosureRowsForFamilyTierItem()` currently drops `unitPrice` and component subtotal/price from the display row model. `InclusionDisclosurePanel` renders only **Inclusion / Qty / Price**, where Price is the line total, and then one total across the whole disclosure.

This does not satisfy the approved contract:
- customer must see **unit price** separately from line total;
- each Commercial Leg/component occurrence needs its own **leg subtotal**;
- two components in the same Period with the same cadence must remain visibly separate;
- current grouping by only `"Month X–Y · Cadence"` collapses adjacent same-period/same-cadence components into one visual group because identical `groupLabel` values are treated as the same section.

## Required correction
1. Keep component `source` internal only as stable section identity/key; never render it.
2. Shared presentation derivation must preserve one distinct section per snapshot component occurrence, even when Period and cadence are identical.
3. Customer section header may repeat the same human text when two independent same-cadence components coexist; section identity must not depend on that label. If disambiguation is needed, use neutral presentation-only wording such as `Yearly charge 1/2`, never Leg IDs/Rate Sheet keys.
4. Each inclusion row must expose separate columns/facts: Inclusion, Qty, **Unit price**, **Line total**.
5. Each component section must show its own authoritative component subtotal/price from the snapshot as **Leg/charge subtotal**; do not recompute pricing authority. Row sums may be used only as a test reconciliation check, not the displayed source of truth.
6. Do not show one grand inclusion-list total that can be mistaken for a Leg subtotal across mixed periods/components. Existing top-level Monthly/Yearly/Total remains the commercial summary.
7. Apply the same corrected section model to cart disclosure, Total Commitment disclosure, Review/PDF/customer View-Print, and customer email.
8. Starter Cloud must visibly read, under the Month 11 yearly section: Static IP Block, Qty 2, Unit price `$40`, Line total `$80`, section subtotal `$80/year` (using existing customer cadence wording).
9. Preserve legacy fallback for snapshots without `commercialBreakdown`.

## Validation required
Add fixtures for:
- two independent components in the same Period with the same cadence — both sections remain distinct;
- unit price != line total (qty > 1) — both values render correctly;
- component subtotal displayed from stored snapshot;
- Main + Upgrade + add-on each retains only its own breakdown;
- sanitized/persisted quote remains stable after live catalog changes.

Return exact clean review SHA, changed files and focused test evidence, then set **AWAITING CHATGPT REVIEW**. Do not push source to `main`.