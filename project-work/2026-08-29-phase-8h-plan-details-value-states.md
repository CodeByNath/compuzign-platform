# Phase 8H — Plan Details Value-State Language

## Status
- Phase 8G: `CLOSED` at production `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`
- Phase 8H: `READY FOR CLAUDE`
- Source push: `SOURCE PUSH NOT APPROVED`
- Verdict: `Proceed with safeguards`

## Finding
Plan Details uses dashes for values whose meaning is already known. Bundle children are included inside one priced parent, while an uncapped recurring stream has a known rate but no fixed number of occurrences.

## Approved Display Rules
| Situation | Display |
|---|---|
| Bundle child Unit Price | **Included** |
| Bundle child Total | **Included** |
| Open-ended Charge Occurrences | **Until Canceled** |
| Open-ended Subtotal | the stream’s formatted **Rate** amount |
| Open-ended Total Contract Value | **Until Canceled** |
| Missing/unresolved price | **To be confirmed** |
| Real numeric zero | **$0.00** |

Do not add an explanatory note beneath Total Contract Value.

“Open-ended Subtotal = Rate” means the cell repeats the same known amount shown in Rate (for OMNIA Basic, Rate `$4,000.00` and Subtotal `$4,000.00`). It is not a lifetime multiplication. When admin later supplies a finite minimum term and the existing Leg logic derives finite charge occurrences, show the existing calculated occurrence count and calculated subtotal instead.

## Claude — Implement Phase 8H Only
Production baseline: `41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`.

1. Change only the shared `PlanDetailsContent` / `ItemBreakdownTable` presentation so focused Plan Details and cart View details stay identical.
2. Bundle child rows: keep real quantity; render **Included** in Unit Price and Total. Children remain display-only and excluded from arithmetic.
3. Summary rows:
   - `s.isOngoing` Charge Occurrences → **Until Canceled**;
   - `s.isOngoing` Subtotal with a numeric `s.price` → `formatMoney(s.price)`;
   - `s.isOngoing` with null price → **To be confirmed**;
   - finite streams keep their existing calculated occurrence count and formatted subtotal;
   - non-ongoing null subtotal → **To be confirmed**.
4. Total Contract Value:
   - finite number → formatted money;
   - null because at least one stream is open-ended and all applicable rates are known → **Until Canceled**;
   - null because pricing is unresolved → **To be confirmed**;
   - render no explanatory note.
5. Prevent partial-sum misrepresentation:
   - a Period with any top-level null `line_total` shows **To be confirmed**, never a partial total;
   - Due at plan start shows **To be confirmed** if any starting stream has null price, never false `$0.00`.
6. Keep a real zero formatted as `$0.00`. Do not globally replace `formatMoney(null)`; select language from each value’s semantic state.
7. Do not change pricing/resolvers, Leg summary/occurrence/Contract Value math, bundle structure, quote snapshots, review/PDF, CSS layout, persistence, identity, routing, or admin behavior.
8. Add a focused contract with runtime fixtures proving: Included child cells; Until Canceled occurrences; open-ended subtotal equals numeric rate; finite minimum-term subtotal remains calculated; unresolved price is To be confirmed; mixed finite+null Period never shows a partial total; null starting rate never becomes $0.
9. Run type-check, build, the new contract, Phase 8G bundle parity, request-flow Family parity, and relevant Package Builder regression/isolation contracts. Commit locally, report exact SHA/diff/tests here, and do not push source.

## Acceptance
OMNIA Basic shows **Included** in all six bundle-child price cells, **Until Canceled** under Charge Occurrences, `$4,000.00` under Subtotal, and **Until Canceled** for Total Contract Value. Its monthly rate and all pricing math remain unchanged. A plan with a finite admin-configured minimum term continues to show calculated occurrences and a finite calculated subtotal.
