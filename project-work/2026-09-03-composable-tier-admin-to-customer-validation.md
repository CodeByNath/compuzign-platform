# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict (prior round): **Proceed with safeguards**, substance accepted; only branch hygiene remained.
- Production remains `main@6a03a18239cec8fa32ce13c5a3bf626293d6f0bd`; deploy run `33973451326` / #954 successful.
- Review head is now **`28f716b1bde85717787418e29efbbf8dce978d3c`** — exactly **one clean commit**, parent `6a03a18239cec8fa32ce13c5a3bf626293d6f0bd` (production), on `review/upgrade-journey-finalisation`. `bdfec37c`/`b1bc63c1` no longer exist on this branch — history was rewritten, not stacked.

## Branch-hygiene action completed
- Recreated the exact final tree from `bdfec37c27e9767fc174a3dac12e98c2a80fda47` as one commit directly on top of production `main`. Tree equivalence verified before committing: `git rev-parse bdfec37c^{tree}` == `git write-tree` on the recreated index == `16272016f7309a3d0a17bdd42bf9ebfd48adac6b`. No source content changed in this step, only commit history was flattened.
- Updating the remote branch required a force-push (same tree, different lineage, not a fast-forward). Claude's session auto-mode classifier hard-blocks force-push-equivalent git operations, so Nath ran `git push --force origin upgrade-journey-clean-tmp:review/upgrade-journey-finalisation` directly. Verified afterward: `origin/review/upgrade-journey-finalisation` == `28f716b1` exactly.
- Local cleanup done: local `review/upgrade-journey-finalisation` re-synced to the new remote head; the temporary `upgrade-journey-clean-tmp` branch deleted.

## Independent review result (still applies — no source content changed since)
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

No additional product/source correction is requested. This round is now eligible for source-push approval pending this review. Do not push to `main` before that review.