# Upgrade journey — active correction track

## Status
- **SOURCE PUSH APPROVED — clean head `6a03a18239cec8fa32ce13c5a3bf626293d6f0bd`**
- Auditor verdict: **Proceed with safeguards**
- Production before push remains `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`, deploy `33964003314` / #953 successful.

## Independent clean-head audit
Fresh cycle confirms `6a03a182` is exactly **one commit** ahead of production with merge-base `a42eeba8`; rejected `0e0d4fc3`, `1e99da02`, prior `c513b516` ancestry, and unrelated `d3eb4dc0` are not in the candidate ancestry.

Git object verification is stronger than the reported empty diff: both accepted final state `c513b516` and clean candidate `6a03a182` point to the **same tree SHA `0e1757948075075e83f4a4a9fe6f209fe07e291a`**. Therefore the clean candidate is byte-for-byte the previously audited final tree, with clean ancestry.

The already accepted behavior remains the approval basis:
- cart = focused-Tier base inclusions once + `Extensions billed X`, no raw Period dump;
- detailed Review/PDF/View-Print = shared View Details period semantics, with unchanged continuations suppressed;
- Bundle children display-only in totals;
- no fabricated multi-Leg base when Headline is unresolved;
- customer quote snapshot remains identifier-safe and never live-re-resolved;
- `legPaymentSummaries` remains TCV/payment authority.

## Approved source action
Claude may fast-forward/push **only `6a03a18239cec8fa32ce13c5a3bf626293d6f0bd`** to `main`, then record exact resulting `main` SHA and GitHub Actions/deploy result. No additional source change in that push.

## Branch hygiene required before closure
Remote branch inventory still contains numerous older `review/*`, `fix/*`, and `phase/*` branches. Do not assume they are safe to delete by name alone. Claude must inventory every non-protected branch other than `main`, `Project-work-instructions`, and the one currently active review branch; for each, verify whether its work is completed/merged/superseded. Delete local+remote branches only when that is proven. Preserve any branch with unresolved or unmerged work and report it explicitly. After `6a03a182` is on `main`, delete `review/upgrade-journey-finalisation` once it is no longer needed. Completed work must not remain as stale branches.

Then set **AWAITING LIVE VALIDATION**.

## Required live gate
Fresh Starter Cloud quote, read-only validation:
1. Cart: base list once; **Extensions billed Annually** -> Static IP Block qty 2; no Period headings.
2. View Details and PDF/Review/View-Print: `Plan start–Month 10` monthly fact/table once; Month 11 shows monthly continuation + new annual $80 and Static IP qty 2 x $40 = $80; unchanged monthly table not repeated; final open range says `Ongoing`.
3. Email mirrors the same semantics and is actually received.
4. Customer quote JSON exposes no internal Leg/Rate Sheet identifiers.
5. Main -> Upgrade -> Add-on ordering, TCV, initial payments, quote identity and legacy fallback remain unchanged.

Do not close until deployment, branch hygiene report, and live customer behavior agree.