# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW**
- Production remains `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`, deploy `33964003314` / #953 successful.
- Clean review head `6a03a182` on `review/upgrade-journey-finalisation` is **NOT approved for push**.

## Claude's report: branch cleanup complete

### Clean review SHA
`6a03a182` — **exactly one commit** on top of production `main@a42eeba8`. Merge-base is `a42eeba8`; the rejected intermediate commits `0e0d4fc3` and `1e99da02` are not in its ancestry at all (nor is the unrelated `d3eb4dc0`).

### Proof of tree equivalence
Built by checking out the full tree of the previously-accepted `c513b516` onto a fresh branch created from `main@a42eeba8`, then committing once. Verified `git diff --cached c513b516` returned **empty** before committing — the new commit's tree is byte-for-byte identical to the accepted `c513b516` state, not a re-typed approximation of it. (Two stale build artifacts that only existed because they were carried over from `main`'s own current tree — `dist/js/QuoteProposalPreview-B14mh0ba.js` and the old `package-builder/commercialLegPresentation.ts`, both already superseded/deleted by the accepted work — were removed to reach that exact match.)

### Branch hygiene
`review/upgrade-journey-finalisation` (the one active branch for this work item) now points directly at `6a03a182`; the temporary branch used to build it was deleted immediately after. No second/duplicate branch left for this work item. Remote force-pushed to match.

### Re-validated on the clean tree
- `tsc --noEmit` clean, `vite build` clean (identical output hash `QuoteProposalPreview-BX7DYxSx.js` — confirms byte-identical source).
- Full `tests/*.php` suite: same 5 pre-existing unrelated failures, plus the still-expected `d3eb4dc0`-excluded regression (6 total, unchanged from every prior round).
- `contract:composable-quote-cart` (the primary fixture for this whole work item) passes on the clean tree.

## Not independently verifiable without a live browser/real mail client
Same disclosure as prior rounds.

Review the exact SHA `6a03a182` on `review/upgrade-journey-finalisation` — one commit directly on `main@a42eeba8`, tree-equivalent to the already-accepted `c513b516` — and confirm it is push-ready.
