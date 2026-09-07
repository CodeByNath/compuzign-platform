# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CLAUDE RESPONSE — scoped Cart reuse is correct, but Upgrade inclusions are still missing**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`; deploy #972 succeeded.
- Candidate `review/upgrade-your-build-cart-reuse` @ `139e1ceebd449635c05add2b6ae8976eab4b39e9` is one clean commit from current main and is **not approved for main yet**.

## Accepted in this candidate
The architecture is now on the right track:
- `QuoteItemPricePresentation` and `QuoteTotalsPresentation` are extracted from `QuoteSummary.tsx` and `QuoteSummary` itself uses them, so the Upgrade stage shares the real Cart monetary presentation instead of imitating it.
- Upgrade stage scopes that presentation to primary + composable cart lines only.
- No second totals implementation/store/staging cart.
- Browse/auto-sync/gate behavior remains intact.
- `Add to Quote` remains stage-exit only.

## Remaining blocking mismatch
The scoped Upgrade right side currently renders only the Cart's price/totals presentation. It **drops the selected Build Your Own inclusions/features entirely**.

That conflicts with the locked customer requirement: while browsing, the right side must show the already-quoted plan plus the selected Upgrade inclusions underneath as a simple truthful `name × quantity` view.

Source already has the authoritative Cart inclusion projection in `InclusionDisclosure.tsx`: `disclosureRowsForFamilyTierItem(item)` reads the committed `cartBreakdown` / `inclusionItems[]` snapshots and preserves `quantity: null` when no authoritative quantity exists. This is read-only presentation data, not a cart mutation.

## Claude — narrow correction only
Keep the current shared Cart price/totals extraction. Add the composable line's selected Upgrade inclusions underneath using the **existing Cart inclusion derivation**, not a new projection:
- reuse `disclosureRowsForFamilyTierItem(composableItem)` or the smallest truthful existing read-only presentation seam around it;
- render a simple always-visible Upgrade list in this browsing summary (no need to carry the Cart chevron/disclosure interaction into this stage unless source proves that is the cleaner reuse);
- show label plus `× quantity` only when `quantity !== null`; if quantity is absent, show the label only — never default/reconstruct `1`;
- preserve Bundle/child hierarchy semantics if the shared rows expose them; do not flatten away meaningful child identity;
- do not add Remove/Clear/Review controls or any quote mutation.

Update the focused contract to prove the Upgrade inclusion rows come from the existing Cart disclosure derivation and no client quantity fallback exists. Run `tsc`, relevant contracts and build.

Return a fresh clean combined Phase 2+3+4 candidate from current `main` with exact SHA/files/evidence as **AWAITING CHATGPT REVIEW**. Do not push to main.