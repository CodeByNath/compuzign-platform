# Upgrade journey — active correction track

## Status
- **READY FOR CLAUDE — review `b1bc63c1` requires one wording correction before push**
- Auditor verdict: **Proceed with safeguards**
- Production remains `main@6a03a18239cec8fa32ce13c5a3bf626293d6f0bd`; deploy run `33973451326` / #954 successful.
- Review head `b1bc63c1c401f998c32d526d02b3e10f7554b0ce` is exactly one clean commit ahead of production and is **NOT yet approved for main**.

## Independent audit
The implementation matches the requested bounded presentation changes in substance:
- starting finite range -> `Through Month N`;
- later ranges retain normal `Month X–Y` grammar;
- visible finalise-quote sidebar now uses `disclosureRowsForFamilyTierItem()` (compact cart base-once + extension groups);
- `QuoteProposalPreview` remains the separate detailed Period model for print/PDF/View-Print;
- finite `computeTotalContractValue()` numeric branch is untouched;
- non-finite Contract Value fallback changes from `Ongoing` only, with Initial Payment arithmetic unchanged;
- PHP email mirrors the customer-range and non-finite fallback behavior.

### One required correction: spelling is user-owned
Claude intentionally used **`Until Canceled`** (single L) because an earlier Plan Details phase had that spelling. The current live-validation instruction and Nath's explicit wording use **`Until Cancelled`** (double L). This newer customer terminology decision supersedes the earlier spelling convention for this flow.

Change every customer-facing occurrence touched by this correction to exactly:
**`Until Cancelled`**

That includes the shared TS range helper, PHP email mirror, non-finite Contract Value fallbacks, Plan Details/summary value-state wording where the same concept is surfaced, and all affected focused contracts/tests. Do not leave a split `Canceled` / `Cancelled` vocabulary across customer surfaces.

No other behavior change is requested in this round.

## Locked acceptance after spelling correction
1. Starting finite: `Through Month 10`; later `Month 11–23` unchanged.
2. Starting/open term and later open-end customer wording uses **Until Cancelled**; no customer-facing `Ongoing` in these term displays.
3. Fully finite Total Contract Value stays numeric exactly as today.
4. Any non-finite contributing stream -> Contract Value fallback **Until Cancelled**; Initial Payment stays numeric.
5. Finalise sidebar remains compact cart-style; PDF/email/View-Print remain detailed Period presentation.
6. No pricing, resolver, identity, persistence, snapshot, ordering, Bundle-total, mail transport/idempotency or legacy-fallback changes.

Update the same clean review branch with the spelling-only correction, re-run focused contracts, record exact new SHA, and set **AWAITING CHATGPT REVIEW**. Do not push to `main` before review.