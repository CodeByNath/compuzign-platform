# Phase 8H — Plan Details Value-State Language

## Status
- Phase 8G: `CLOSED` at production `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`
- Phase 8H: `AWAITING CHATGPT REVIEW`
- Source push: `SOURCE PUSH NOT APPROVED`
- Verdict: `Proceed with safeguards` — implemented locally, not pushed
- Local branch (not pushed): `phase-8h-plan-details-value-states@1a74e785627bfae8f051ffa32093029e978b2b6e`, based on `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`

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

## Claude Report — 2026-08-29 (implemented locally, not pushed)

Local branch `phase-8h-plan-details-value-states` @ `1a74e785627bfae8f051ffa32093029e978b2b6e`, based on `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`. Not pushed anywhere per this round's instruction (learned from the Phase 8G round: if review needs the actual diff and this stays purely local, say so and I'll push the same commit to a non-production branch on request).

**Files changed — `package-builder/PlanDetailsModal.tsx` (the shared component both the focused card's Plan Details and the cart's "View details" overlay render through, so this one change covers both surfaces):**
- `ItemBreakdownTable`: bundle child rows' Unit Price/Total cells changed from `—` to `Included`. The Period's own total changed from an inline reduce that silently skipped null `line_total` items (producing a partial sum) to the new `periodItemsTotalDisplay(items)` — `To be confirmed` whenever any top-level item is unresolved, the real total otherwise.
- New `occurrencesCell(s, label)`: `Until Canceled` for `s.isOngoing`, unchanged calculated count for a finite stream.
- New `subtotalCell(s)`: `s.isOngoing` repeats `formatMoney(s.price)` when the rate is known, `To be confirmed` when not; a finite stream keeps its existing calculated `formatMoney(s.subtotal)`; a finite stream with an unresolved `s.subtotal` reads `To be confirmed` instead of a bare dash.
- New `totalContractValueCell(summaries, totalContractValue)`: finite value untouched; when null, `Until Canceled` only if every subtotal-null contributor is `isOngoing` with a known `price`, otherwise `To be confirmed`. No explanatory note rendered.
- New `dueAtPlanStartDisplay(summaries, planStartMonth)`: replaces the old reduce that silently skipped a null-price starting stream (risking a false `$0.00`) — now `To be confirmed` if any starting stream's price is unresolved, the real sum otherwise.
- `occurrencesCell`, `subtotalCell`, `totalContractValueCell`, `periodItemsTotalDisplay`, `dueAtPlanStartDisplay`, and `formatMoney` are now `export`ed (previously module-private) — pure extraction/export only, so the new contract can prove the real logic with runtime fixtures instead of regex-guessing at inline JSX. No behavior change from the exports themselves.
- Every check above uses `!== null`/`=== null`, never a falsy check — a real `price`/`subtotal` of `0` still formats as `$0.00` everywhere (covered by dedicated fixtures in the new contract).
- Nothing else in this file changed: pricing/Leg resolution, `buildLegPaymentSummaries`/`computeTotalContractValue` themselves, bundle structure, CSS, and every other section (Plan Overview, Billing Breakdown's own per-Period narrative sentences, Payment Timing sentences) are untouched.

**New contract** `scripts/plan-details-value-states-contract.ts` (`contract:plan-details-value-states`): runtime fixtures via `LegPaymentSummary`/`CommercialLegPricedItem` objects covering every rule above — Included child cells (source-verified against the real `ItemBreakdownTable`, rejecting the old dash), Until Canceled occurrences (including the unresolved-price open-ended case, which is still Until Canceled — Subtotal is where unresolved-ness shows), open-ended Subtotal equals the numeric Rate, finite minimum-term occurrences/subtotal remain calculated and untouched, unresolved price reads To be confirmed (three distinct call sites), the Until-Canceled-vs-To-be-confirmed TCV distinction, mixed finite+null Period never shows a partial total, null starting rate never becomes `$0.00`, and real zero still formats as `$0.00` in three different cells.

**Updated existing contract** `scripts/package-builder-bundle-inclusion-parity-contract.ts`: its one assertion referenced the old literal inline reduce expression for the Period total, which this phase legitimately replaced — updated to check for the real `periodItemsTotalDisplay(items)` call and to run that real function against its existing Bundle-parent-with-priced-children fixture instead of duplicating the old reduce inline. The invariant it protects (children never enter the table's arithmetic) is unchanged; only the expression it checks for changed, matching the source.

**Tests:** `tsc --noEmit` clean. `npm run build` clean. Full contract sweep (every registered `contract:*`): only `admin-station-css`, `package-builder-flow`, `platform-identity-schema` fail — the same three confirmed pre-existing/unrelated failures from every prior round. `contract:plan-details-value-states`, `contract:package-builder-bundle-inclusion-parity`, `contract:request-flow-family-tier-parity`, `contract:package-builder-regression-lock`, `contract:cost-builder-isolation` all pass.

Awaiting review before any push (local branch or main).
