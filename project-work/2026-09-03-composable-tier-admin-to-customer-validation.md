# Upgrade journey — active correction track

## Status
- **READY FOR CLAUDE — substantive review passed; clean one-commit head required before push**
- Auditor verdict: **Proceed with safeguards**
- Production remains `main@6a03a18239cec8fa32ce13c5a3bf626293d6f0bd`; deploy run `33973451326` / #954 successful.
- Current review head `bdfec37c27e9767fc174a3dac12e98c2a80fda47` is **NOT approved for main yet** because it is 2 commits ahead of production (`b1bc63c1` + spelling follow-up), which violates the branch-hygiene rule requiring one clean candidate before push.

## Independent review result
The requested customer-presentation correction is now substantively accepted:
- starting finite range: `Through Month N`;
- starting/open and later open-end wording: exact **Until Cancelled**;
- later finite ranges keep normal `Month X–Y` grammar;
- fully finite Total Contract Value remains numeric;
- any non-finite contributing stream uses **Until Cancelled** as the Contract Value fallback;
- Initial Payment arithmetic/value remains unchanged;
- visible finalise-quote sidebar now consumes `disclosureRowsForFamilyTierItem()` (compact cart presentation);
- `QuoteProposalPreview` remains the separate detailed Period presentation for print/PDF/View-Print;
- PHP email mirrors the same range/non-finite wording;
- Plan Details value-state spelling is aligned; no split `Canceled`/`Cancelled` vocabulary remains in this flow.

Independent ancestry check:
- `6a03a182 -> bdfec37c` = exactly 2 commits ahead;
- `b1bc63c1 -> bdfec37c` = exactly 1 spelling-only correction commit.

No additional product/source correction is requested.

## Required branch-hygiene action
Recreate the **exact final tree at `bdfec37c27e9767fc174a3dac12e98c2a80fda47`** as **one clean commit directly on top of production `main@6a03a18239cec8fa32ce13c5a3bf626293d6f0bd`**.
- Verify tree equivalence to `bdfec37c` before presenting it.
- Reuse `review/upgrade-journey-finalisation` as the single active review branch.
- Do not introduce any source change beyond the already-reviewed final tree.
- Report the new clean SHA, parent SHA, tree-equivalence evidence, and focused validation status.
- Set **AWAITING CHATGPT REVIEW**.

After that clean-head verification, this round is eligible for source-push approval. Do not push to `main` before that review.