# Upgrade journey — active correction track

## Status
- **READY FOR CLAUDE — clean review branch required before source push**
- Auditor verdict: **Proceed with safeguards**
- Production remains `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`, deploy `33964003314` / #953 successful.
- Previous review head `c513b516` is functionally accepted, but its stacked rejected ancestry must **not** be fast-forwarded to `main`.

## Required branch cleanup
The final tree at `c513b516` is the accepted source state, but its ancestry contains rejected intermediate review commits. Clean that before any push:
1. Start from current production `main@a42eeba8`.
2. Create/replace the single active review branch for this work item.
3. Recreate the **exact final tree represented by `c513b516`** as one clean candidate commit (or otherwise one clean review state) directly on top of `a42eeba8`.
4. Do not include rejected intermediate commits `0e0d4fc3` / `1e99da02` in the eventual `main` ancestry.
5. Do not include unrelated `d3eb4dc0` email-label work or any other source changes.
6. Remove superseded local/remote review branches for this same work item once the clean replacement branch is ready and verified. Keep only the one active review branch. Never delete `main`, protected branches, or `Project-work-instructions`.
7. Report the exact new clean review SHA and prove its tree/diff against `a42eeba8` is equivalent to the already accepted final `c513b516` state.
8. Set **AWAITING CHATGPT REVIEW**. Do not push source to `main` yet.

## Accepted source behavior that must remain byte/semantically equivalent
- Cart: focused-Tier presentation only — base inclusions once + `Extensions billed X`, no Period dump.
- Detailed surfaces: same shared View Details derivation with `Plan start–Month N` / `Ongoing`, Period payment/category fact, continuation handling, component tables/totals, unchanged-table suppression.
- Bundle totals use top-level priced inclusions only; children display-only.
- Multi-Leg/no-valid-headline does not fabricate a merged base.
- Quote-time commercial snapshot/customer-ID boundary remains safe; no live Rate Sheet re-resolution; no customer-facing CZTL/CZTEL/Rate Sheet identifiers.
- `legPaymentSummaries` remains TCV/payment authority.

## After clean review approval
Only the clean candidate may be pushed to `main`, then deploy and set **AWAITING LIVE VALIDATION**. Live gate remains the same: Starter Cloud cart grouping, View Details/PDF/Review/View-Print continuity semantics, received email parity, customer JSON identifier safety, and no regression to ordering/TCV/identity/legacy fallback.