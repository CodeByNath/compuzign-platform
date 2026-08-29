# Phase 8H — Plan Details Value-State Language

## Status
- Phase 8G: `CLOSED` at production `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`
- Phase 8H: `READY FOR CLAUDE`
- Source push: `SOURCE PUSH APPROVED`
- Verdict: `Proceed`
- Accepted candidate: `phase-8h-plan-details-value-states@1a74e785627bfae8f051ffa32093029e978b2b6e`

## Approved Display Rules
Bundle child Unit Price/Total = **Included**. Open-ended Charge Occurrences = **Until Canceled**. Open-ended Subtotal = formatted known Rate. Open-ended TCV = **Until Canceled** when rates are known. Missing/unresolved price = **To be confirmed**. Real numeric zero = **$0.00**. No explanatory TCV note. Finite minimum-term streams retain calculated occurrences/subtotals. A Period with any unresolved top-level `line_total` cannot show a partial total. Due at plan start cannot silently omit an unresolved starting rate.

## Accepted Source Scope
Independent GitHub comparison confirms candidate is exactly one commit ahead and zero behind production baseline `41c31b41...`, with merge base equal to that production SHA.

Changed source scope is limited to:
- `resources/ts/components/package-builder/PlanDetailsModal.tsx`
- `scripts/plan-details-value-states-contract.ts`
- `scripts/package-builder-bundle-inclusion-parity-contract.ts`
- `package.json` contract registration
- rebuilt `dist/js/cost-builder.js`

Independent source inspection confirms:
- Bundle children render `Included` in both price cells and remain outside top-level arithmetic.
- `periodItemsTotalDisplay()` returns `To be confirmed` if any top-level `line_total` is null; otherwise sums only top-level items.
- open-ended occurrences use `Until Canceled`.
- open-ended known-rate subtotal repeats the rate; unresolved subtotal uses `To be confirmed`.
- TCV distinguishes genuinely open-ended known-rate streams from unresolved pricing.
- Due-at-start refuses a partial/false `$0.00` when a starting price is null.
- all state checks use explicit null semantics, preserving real zero as `$0.00`.
- no pricing resolver, Leg math, identity, persistence, routing, admin, bundle composition, quote snapshot, review/PDF, or CSS behavior is changed.

The focused contract directly exercises all approved semantic states, including finite minimum-term behavior, mixed priced/null Periods, unresolved starting rates, and numeric zero. The existing bundle parity contract was updated only to call the extracted real Period-total helper while preserving the no-child-arithmetic invariant.

## Claude — Production Action
1. Fast-forward `main` to the **exact accepted commit** `1a74e785627bfae8f051ffa32093029e978b2b6e`. Do not amend or add source changes.
2. Push `main` and allow the normal GitHub Actions deployment to Hostinger.
3. Confirm exact resulting `main` SHA and workflow run/status in this same file.
4. Set Phase 8H to `AWAITING LIVE VALIDATION` and stop. Do not perform customer/runtime mutations.

## Final Gate
Nath will perform the browser/customer-facing validation. Phase 8H remains open until the pushed `main` SHA, deployment result, and Nath's live result agree with the accepted source.
