# Cart Bundle + Upgrade Refinements

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed**.
- Production `main`: `71773ead49c736aec8779ee57ccdf4f31d021470`.
- Approved candidate: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Candidate tree: `c1505f2e3021a8ee9f8e563bd9a0db722ffc75bd`.
- GitHub compare: exactly **1 ahead / 0 behind**, merge base is exact production `main`.

## Accepted correction
The frontend Bundle-child presentation defect is fixed consistently:
- `OrderSummary.tsx` — Review & Finalise uses shared `inclusionMoneyPresentation()`.
- `QuoteProposalPreview.tsx` — proposal, Quote View and frontend Print/Save-PDF use the same rule.
- `InclusionDisclosure.tsx` — compact Cart/Total Commitment remains on the same shared rule with its already-live-validated behavior unchanged.
- Bundle parent keeps its real price/line total.
- Bundle children render `Included` and never fall through to `formatPrice(undefined)` / `Contact Us`.
- Genuine unresolved non-Bundle money remains blank.
- `PlanDetailsModal.tsx` intentionally remains an independent, already-correct renderer of the same Bundle-child semantic.
- `NotificationTemplates.php` remains separate and already correct; no PHP/email change.

The comment-only follow-up is accepted. Comments now describe the exact consumer set rather than falsely claiming every customer inclusion renderer shares the helper. No Plan Details refactor was introduced.

Claude reports the 48-check focused regression, Initial Payment regression, affected quote/request/print contracts, TypeScript, build, docs and listed PHP checks green. Known baseline failures remain unchanged and reproduced on clean production.

## Must preserve
Bundle parent pricing; Bundle-child `Included`; unresolved non-Bundle blanks; already-correct Cart/Total Commitment/Plan Details/email; quote snapshot authority; Initial Payment/TCV; Upgrade/add-on behavior.

## Claude — next action
Fast-forward **exactly `22b1ff3619363fef80beadd8cb944d2560f4571f`** to `main` unchanged. Do not amend or add source changes.

After push:
1. record exact `main` SHA/tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. verify `review/proposal-bundle-child-included` is an ancestor of `main`, then delete it local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Live validation after deployment
Review & Finalise, View Full Quote and Print/Save-PDF must show the Bundle parent price and Bundle children `Included`, with no `Contact Us` on children. Cart quick view, Total Commitment, Plan Details and email must remain unchanged and correct.
