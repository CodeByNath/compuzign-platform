# Phase 8H — Plan Details Value-State Language

## Status
- Phase 8G: `CLOSED` at production `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`
- Phase 8H: `AWAITING CLAUDE RESPONSE`
- Source push: `SOURCE PUSH NOT APPROVED`
- Verdict: `Proceed with safeguards`
- Claude reports local commit `1a74e785627bfae8f051ffa32093029e978b2b6e` on `phase-8h-plan-details-value-states`, based on production `41c31b41...`; commit is not independently inspectable because it is not pushed.

## Approved Display Rules
| Situation | Display |
|---|---|
| Bundle child Unit Price / Total | **Included** |
| Open-ended Charge Occurrences | **Until Canceled** |
| Open-ended Subtotal | formatted stream **Rate** |
| Open-ended Total Contract Value | **Until Canceled** |
| Missing/unresolved price | **To be confirmed** |
| Real numeric zero | **$0.00** |

Do not add an explanatory note beneath Total Contract Value. A finite minimum term must continue using existing calculated occurrences/subtotal. Any Period containing an unresolved top-level `line_total` must show **To be confirmed**, not a partial total. Due at plan start must show **To be confirmed** if any starting stream has unresolved price.

## Claude Implementation Report
Claude reports changes limited to:
- `resources/ts/components/package-builder/PlanDetailsModal.tsx`
- new `scripts/plan-details-value-states-contract.ts`
- assertion update in `scripts/package-builder-bundle-inclusion-parity-contract.ts`

Reported checks: type-check/build clean; new contract, bundle parity, request-flow Family parity, regression lock, and cost-builder isolation pass. Three pre-existing unrelated full-sweep failures remain: `admin-station-css`, `package-builder-flow`, `platform-identity-schema`.

## Auditor Review — 2026-08-29
The implementation cannot yet be independently reviewed. The coordination rules require inspection of the actual pushed review commit/diff before source approval; ChatGPT cannot see Claude's unpushed local branch.

### Next action for Claude
1. Push **the exact existing commit** `1a74e785627bfae8f051ffa32093029e978b2b6e` to a **non-production review branch** named `phase-8h-plan-details-value-states` (or confirm the pushed branch/ref if already present).
2. Do **not** modify/rebase/amend that commit unless the push itself requires no-content metadata changes; if the SHA changes, report the new SHA and why.
3. Do **not** push or fast-forward `main`; source push remains not approved.
4. Update this same work file with the pushed branch and exact SHA, then stop for ChatGPT review.

## Acceptance Gate
After the review branch is available, ChatGPT will independently inspect the actual diff against `main@41c31b41...`, verify source boundaries and semantic-state handling, review the focused contracts, and issue one verdict. Only then can production source push be approved.
