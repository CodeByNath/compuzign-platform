# Upgrade journey — active correction track

## Status
- **SOURCE PUSH APPROVED — reviewed `c513b516`**
- Auditor verdict: **Proceed with safeguards**
- Production before this push remains `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`, deploy `33964003314` / #953 successful.

## Independent review
Fresh cycle read confirmed Claude had advanced the file to **AWAITING CHATGPT REVIEW** with review head `c513b516`; the review branch is exactly 3 commits ahead of production with merge-base `a42eeba8`.

The two bounded defects from the previous review are corrected:
1. `componentTotalValue()` now validates/sums only top-level priced inclusions. Bundle children remain display-only and cannot invalidate or double-count a resolved parent total. PHP `emailComponentTotal()` follows the same top-level-only rule.
2. `buildQuotedCartBreakdown()` no longer fabricates a combined base when Headline identity is unavailable: one resolved Leg may safely become base; 2+ resolved Legs return an empty derived breakdown so the established generic `inclusionItems`/`features` fallback is used.

The previously reviewed presentation corrections remain intact:
- Cart uses focused-Tier semantics: base inclusions once + `Extensions billed X`, no Period dump.
- `PlanDetailsModal` and durable PDF/Review/View-Print rendering now consume the same shared `periodBreakdownRows(buildQuotedCommercialBreakdown(...))` derivation.
- Detailed semantics retain `Plan start–Month N` / `Ongoing`, Period payment/category fact, collision/continuation notes, new-component inclusion table, component total, and suppression of unchanged repeated tables.
- Quote-time snapshot/customer-ID boundary remains unchanged; no live Rate Sheet re-resolution and no customer-facing CZTL/CZTEL/Rate Sheet identifiers.
- Existing `legPaymentSummaries` remains TCV/payment authority.

Reported validation: focused cart and Bundle contracts, notification parity fixture, request snapshot fixture, tsc, Vite build, full PHP/contracts sweeps with only the same classified pre-existing failures.

## Approved source action
Claude may push **only the reviewed 3-commit chain ending at `c513b516`** to `main`, with no unrelated `d3eb4dc0` email-label work or other source changes. After push/deploy, record:
- exact resulting `main` SHA;
- GitHub Actions/deploy run and result;
- status **AWAITING LIVE VALIDATION**.

## Required live gate
Use a fresh Starter Cloud quote and validate read-only:
1. Cart: base list once; **Extensions billed Annually** -> Static IP Block qty 2; no Period headings.
2. View Details and PDF/Review/View-Print: `Plan start–Month 10` monthly fact/table once; Month 11 shows monthly continuation plus the new annual $80 payment and Static IP qty 2 x $40 = $80; unchanged monthly inclusion table is not repeated; final open range says `Ongoing`.
3. Email mirrors the same detailed semantics and is actually received.
4. Customer quote JSON remains free of internal Leg/Rate Sheet identifiers.
5. Main -> Upgrade -> Add-on ordering, TCV, initial payments, identity and legacy fallback remain unchanged.

Do not close until deployment and live customer behavior agree.