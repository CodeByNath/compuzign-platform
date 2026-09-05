# Upgrade journey — active correction track

## Status
- **SOURCE PUSH APPROVED — clean head `28f716b1bde85717787418e29efbbf8dce978d3c`**
- Auditor verdict: **Proceed with safeguards**
- Production before push remains `main@6a03a18239cec8fa32ce13c5a3bf626293d6f0bd`; deploy run `33973451326` / #954 successful.

## Independent clean-head verification
Fresh cycle confirms `28f716b1` is exactly **one commit** ahead of production with merge-base/parent `6a03a182`.

Git object verification confirms the clean candidate tree SHA is `16272016f7309a3d0a17bdd42bf9ebfd48adac6b`, exactly the same tree SHA as the previously reviewed final state `bdfec37c`. Therefore the clean candidate is byte-for-byte the accepted source state with rejected/intermediate history removed.

Accepted behavior:
- starting finite customer range: `Through Month N`;
- starting/open and later open-end wording: exact **Until Cancelled**;
- later finite ranges retain normal `Month X–Y` grammar;
- fully finite Total Contract Value remains numeric;
- any non-finite contributing stream uses **Until Cancelled** as the Contract Value fallback;
- Initial Payment remains numeric and unchanged;
- visible finalise-quote sidebar uses compact cart disclosure (`disclosureRowsForFamilyTierItem()`);
- detailed `QuoteProposalPreview` remains the print/PDF/View-Print period model;
- PHP email mirrors the same customer wording;
- Plan Details spelling is aligned;
- no pricing/resolver/identity/persistence/snapshot/order/Bundle/mail/legacy behavior changes.

## Approved source action
Claude/user may fast-forward/push **only `28f716b1bde85717787418e29efbbf8dce978d3c`** to `main`. No other source change may be included.

After push/deploy, record:
- exact resulting `main` SHA;
- GitHub Actions/deploy run/result;
- deletion of `review/upgrade-journey-finalisation` once merged;
- status **AWAITING LIVE VALIDATION**.

## Live gate
Validate a fresh quote read-only:
1. Starter Cloud detailed output says `Through Month 10`; later `Month 11–23`; no `Ongoing`/`Canceled`.
2. Open-ended Upgrade/Add-on says **Until Cancelled**.
3. Fully finite Total Contract Value remains numeric; mixed/indefinite Contract Value says **Until Cancelled**; Initial Payment remains numeric.
4. Finalise sidebar matches compact cart disclosure; PDF/email/View-Print keep the detailed period breakdown.
5. Main → Upgrade → Add-on ordering and all quoted amounts remain unchanged.

Do not close until deployment and live customer behavior match.