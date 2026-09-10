# Cart Bundle + Upgrade Refinements

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `71773ead49c736aec8779ee57ccdf4f31d021470`.
- Deploy `34475621534`: success.
- Prior two fixes passed Nath's live validation: Bundle compact disclosures, Upgrade preservation, duplicate CTA suppression, Manage build, whole-system cleanup.

## New live defect — proposal/review Bundle children
Nath confirmed steps 1–10 pass, but one adjacent customer inconsistency remains:
- Cart quick view: correct.
- Total Commitment disclosure: correct.
- Full Plan Details: correct.
- Email: correct.
- **Review & Finalise: wrong — Bundle children show `Contact Us`.**
- **View Full Quote / quote-view: wrong — same defect.**
- **Print / Save-as-PDF from that frontend quote: wrong — same defect.**

The screenshot proves the correct semantic: Bundle parent `Foundation Bundle` carries `$4,000`; nested children are included content and must not read as separately unresolved priced inclusions.

## Source audit
`QuoteProposalPreview.tsx::FamilyInclusionsList()` consumes shared `periodBreakdownRowsForFamilyTierItem()` but its inclusion row still tests only `row.unitPrice !== null` / `row.lineTotal !== null` and sends the values to `formatPrice()`. A Bundle child with an absent/undefined money fact therefore reaches `formatPrice(undefined)` and renders `Contact Us`.

`OrderSummary.tsx::FamilyInclusionsList()` has the same frontend pattern on its compact review list. Both already receive `row.isChild`, just like the now-correct shared cart disclosure and Plan Details renderer.

Email is already correct, so **do not change `NotificationTemplates.php`**.

## Claude — correction
From current production `main`, create one review branch.
1. In the shared frontend request/proposal presentation paths, use the existing `row.isChild` Bundle-child semantic: child money presentation must be **Included**, never `formatPrice(undefined)` / `Contact Us`.
2. Keep Bundle parent price/line total unchanged.
3. Preserve genuine unresolved **non-Bundle** pricing behavior; no global unknown-to-Included conversion.
4. Review & Finalise, QuoteProposalPreview/quote-view and print/PDF must agree because they are the affected frontend path. Do not patch surfaces independently if one shared presentation derivation can express the rule safely.
5. Add/extend regression/contract proof for parent `$4,000`, children Included, and no `Contact Us` on Bundle children across Review + proposal/print path. Preserve existing detailed billing and email parity.
6. Run relevant request-flow/quote-view/print contracts, TypeScript, build, docs; push review branch only; record SHA/diff/tests here; set **AWAITING CHATGPT REVIEW**; stop. Do not push `main`.

## Must preserve
Bundle parent pricing; correct Cart/Total Commitment/Plan Details; email output; unresolved non-Bundle semantics; quote snapshot authority; Initial Payment/TCV behavior; Upgrade/add-on behavior.

## Must remove
`Contact Us` from Bundle child money presentation in Review & Finalise, View Full Quote, and frontend Print/PDF.

## Must not substitute
No PHP email change; no Rate Sheet/resolver repricing; no global `undefined => Included`; no hiding child rows; no removal of money columns; no new quote model.
