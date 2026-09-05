# Upgrade journey — active correction track

## Status
- **READY FOR CLAUDE — review `0e0d4fc3` rejected before push**
- Auditor verdict: **Proceed with safeguards — presentation direction is right, implementation still diverges from established View Details semantics**
- Production remains `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`, deploy `33964003314` / #953 successful.
- `0e0d4fc3` is **NOT approved for main**.

## Independent audit findings
The cart correction is directionally right: it no longer renders raw Period tables and snapshots a base-once + Extensions shape. The durable quote-time breakdown/customer-ID boundary is also preserved.

However, PDF/Review/View-Print/email do **not** actually reuse `PlanDetailsModal` Billing Breakdown semantics yet.

### Blocking presentation drift
`PlanDetailsModal.tsx` currently renders, per Period:
- customer range via `customerFacingRange()` (`Plan start–Month 10`, `Month 11–23`, `...–Ongoing`);
- an `Active payments` / payment-category fact with the Period's price + cadence;
- collision/continuation note(s);
- inclusion table only for a new/changed component.

`periodBreakdownRowsForFamilyTierItem()` in `0e0d4fc3` instead renders `Month 0–10` / `Indefinite`, omits the Period payment fact entirely, and for a first sole component can jump straight from the Period heading to inclusion rows. Email independently repeats the same reduced model. That is not the already-accepted View Details experience Nath asked to carry into PDF/email/View-Print.

### Reuse/ownership drift
The review head also introduces local copies of the exact same rules:
- `sameLiveComposition()` copies `PlanDetailsModal.sameComposition()`;
- `buildQuotedCartBreakdown()` copies `FamilyTierAdapter` inclusion/extension grouping and cadence-heading policy;
- PHP separately reconstructs the period presentation wording.

There are now multiple real consumers with the **same semantic responsibility**, so root `AGENTS.md` reuse rules apply. Do not keep parallel copies that can drift again.

## Required correction
1. Extract a **pure shared customer presentation model** for Billing Breakdown by Period from the established `PlanDetailsModal` behavior. `PlanDetailsModal` itself and durable quote rendering must consume that same semantic derivation.
2. Preserve exactly: customer-facing range wording, Period payment/category fact, collision/continuation notes, and suppression of unchanged inclusion tables.
3. Snapshot whatever customer-safe facts are required at Add-to-Quote time; never expose Leg/Rate Sheet IDs and never re-resolve live pricing.
4. Cart must remain the focused-Tier shape only: base inclusions once + `Extensions billed X`; no Period headings. Reuse/extract the existing focused grouping semantics instead of maintaining another hand-copied implementation.
5. PHP email may render HTML separately, but it must consume equivalent stored/presentation facts rather than invent a second rule set. No second pricing calculator.
6. Legacy quote fallback stays today's generic inclusion display; do not merge all unresolved Legs into a fabricated base list.

## Acceptance
Starter Cloud must show:
- cart: base list once; **Extensions billed Annually** → Static IP Block qty 2;
- detailed surfaces: `Plan start–Month 10` monthly fact + table once; Month 11 period shows monthly continuation plus new Yearly $80 fact and Static IP qty 2 × $40 = $80; unchanged monthly table is not repeated; final range uses established `Ongoing` wording where applicable.

Update tests to assert the established View Details semantics, report exact changed files/tests/review SHA, then set **AWAITING CHATGPT REVIEW**. Do not push source to `main`.