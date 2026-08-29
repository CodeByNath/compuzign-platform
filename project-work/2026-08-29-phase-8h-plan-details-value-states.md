# Phase 8H — Plan Details Value-State Language

## Status
- Phase 8G: `CLOSED` at production `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`
- Phase 8H: `READY FOR CLAUDE`
- Source push: `SOURCE PUSH NOT APPROVED`
- Verdict: `Proceed with safeguards`

## Finding
Plan Details currently uses an em dash for unrelated states:
1. Bundle children are supplied inside one priced parent.
2. A recurring stream with no fixed end date has no finite subtotal or Total Contract Value.
3. Pricing data may genuinely be unresolved.

Those meanings must not share one symbol. “Ongoing” is also rejected here: it reads as a post-contract status, not a pre-contract quote value.

## Approved Customer Language
| Situation | Display |
|---|---|
| Bundle child Unit Price | **Included** |
| Bundle child Total | **Included** |
| Open-ended recurring stream Subtotal | **No fixed total** |
| Total Contract Value containing an open-ended stream | **No fixed total** |
| Missing/unresolved price or finite subtotal | **To be confirmed** |
| Real numeric zero | formatted **$0.00** |

For a non-finite Total Contract Value, add: **“This quote includes recurring charges with no fixed end date.”**

Why “No fixed total”: the rate and cadence are known, so “To be confirmed” would falsely imply missing pricing; the lifetime total is simply uncapped. “Ongoing” is reserved for post-contract/service-status contexts.

Never use “Included” for a top-level priced item, never turn an open-ended value into $0, and never call unresolved pricing “No fixed total.”

## Claude — Implement Phase 8H Only
Production baseline: `41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`.

1. Change only Plan Details’ shared `PlanDetailsContent` / `ItemBreakdownTable` presentation, so the focused modal and cart View details remain identical.
2. Bundle child rows: keep real quantity; render **Included** in Unit Price and Total. Children remain display-only and excluded from every calculation.
3. Summary table:
   - `s.isOngoing` subtotal → **No fixed total**;
   - finite numeric subtotal → formatted money;
   - non-ongoing null subtotal → **To be confirmed**.
4. Total Contract Value:
   - finite number → formatted money;
   - null because at least one stream is open-ended → **No fixed total** plus the approved quote note;
   - null without an open-ended stream → **To be confirmed**.
5. Audit the same component’s other partial-sum hazards:
   - period total must not sum past a top-level null `line_total`; show **To be confirmed** instead of an understated partial total;
   - Due at plan start must show **To be confirmed** if any starting stream has a null price, not silently sum it as zero.
6. Keep `formatMoney(0)` as `$0.00`. Do not globally replace all null formatting; choose copy from the semantic state at each call site.
7. Do not change pricing/resolvers, Leg summaries, occurrence math, Contract Value math, bundle structure, quote snapshots, review/PDF, CSS layout, persistence, identity, routing, or admin behavior.
8. Add a focused contract with runtime fixtures proving all six states above, including mixed finite+null period items (no partial total) and null starting price (no false $0).
9. Run type-check, build, the new contract, Phase 8G bundle parity, request-flow Family parity, and relevant Package Builder regression/isolation contracts. Commit locally, report the exact SHA/diff/tests here, and do not push source.

## Acceptance
OMNIA Basic shows **Included** in all six bundle-child price cells, **No fixed total** for its stream subtotal and Total Contract Value, the quote-specific explanatory note, and unchanged $4,000/month pricing. Other plans use **To be confirmed** only for genuinely unresolved values and never display a misleading partial sum.
