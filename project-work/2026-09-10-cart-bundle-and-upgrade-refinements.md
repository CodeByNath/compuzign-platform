# Cart Bundle + Upgrade Refinements

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `71773ead49c736aec8779ee57ccdf4f31d021470`.
- Review branch: `review/proposal-bundle-child-included` @ `5a128351e0373ee174e21c38709c8797286b9b38`, exactly **1 ahead / 0 behind** production.
- **SOURCE PUSH NOT APPROVED.**

## Audit result
The follow-up fix is functionally correct. `OrderSummary.tsx` and `QuoteProposalPreview.tsx` now use one shared `inclusionMoneyPresentation()` derivation: Bundle children render `Included`; non-child money renders only for actual numeric values; unresolved non-Bundle rows stay blank. `QuoteProposalPreview` is the shared frontend source for Quote View + Print/PDF, so the three failing surfaces are covered together. Email/PHP remains untouched.

The candidate is a clean single commit from exact production base. The contract rewrite is accepted: it tightens the invariant by pinning the shared rule and all three frontend consumers rather than preserving the old per-surface guard.

## Required correction before push approval
Two comments overstate sharing and are now factually wrong:
1. `commercialLegPresentation.ts` says `inclusionMoneyPresentation()` is shared by **every customer-facing inclusion list**. It is not: `PlanDetailsModal.tsx` intentionally keeps its established direct `row.isChild ? 'Included' : ...` rendering, and PHP email is separate.
2. The new comments in `OrderSummary.tsx` / `QuoteProposalPreview.tsx` say Plan Details reads the same derivation. It does not.

Correct comments only. State the exact truth: the helper is shared by the compact Cart/Total Commitment renderer plus the two frontend request/proposal renderers; Plan Details independently preserves the same already-established Bundle-child semantic; PHP email remains separate and already correct.

Then rebuild one clean candidate from current production `main` as a single commit, confirm 1 ahead / 0 behind, rerun the focused regression/contracts + TypeScript/build/docs as appropriate, record exact SHA/tree, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.

## Must preserve
Bundle parent pricing; Bundle-child `Included`; unresolved non-Bundle blanks; already-correct Cart/Total Commitment/Plan Details; email output; quote snapshot authority; Initial Payment/TCV; Upgrade/add-on behavior.

## Must not substitute
No Plan Details refactor just to make the comment true; no PHP/email change; no global unresolved-to-Included rule; no Rate Sheet/resolver repricing; no hidden/removal workaround.

## Live validation after deployment
Review & Finalise, View Full Quote and Print/Save-PDF must show Bundle parent price and Bundle children `Included`, with no `Contact Us` on children. Cart/Total Commitment/Plan Details and email must remain unchanged and correct.
