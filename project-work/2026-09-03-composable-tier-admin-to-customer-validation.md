# Upgrade journey — active correction track

## Status
- **READY FOR CLAUDE — live validation failed: restore established customer presentation**
- Auditor verdict: **Proceed with safeguards**
- Production remains `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`, deploy run `33964003314` / #953 successful.
- Live evidence: quote `CZ-G5XFRS` PDF/customer output turns the stored commercial breakdown into repeated low-level Period/component tables. This is rejected customer presentation.

## Auditor correction
My prior approval protected snapshot/identity/pricing boundaries but wrongly allowed the persistence/debug shape to become the customer UI model. Do **not** delete the durable quote-time facts or re-resolve current Rate Sheet/Tier data. Correct the presentation layer by reusing the already-established customer semantics.

### Cart
Use the focused Tier state already present in `FamilyTierAdapter.tsx`, not Period tables:
- primary/base inclusions once;
- then the existing `extensionHeading` + `extensionInclusions` split;
- target Starter Cloud shape: base list once, then **Extensions billed annually** → Static IP Block qty 2.
No Month 0–10 / 11–23 / 24–48 debugger sections in cart disclosure.

### PDF / Review / customer View-Print / email
Reuse the semantic behavior already established by `PlanDetailsModal.tsx` **Billing Breakdown by Period**. Extract/reuse a pure presentation model rather than rendering `commercialBreakdown` directly.
- First appearance may show the component's inclusions/pricing.
- A component unchanged in the next Period must use the existing “continues unchanged from prior period” semantics rather than repeat its entire inclusion list.
- A newly starting annual component at Month 11 shows its own Static IP Block qty 2 × $40 = $80 detail.
- Preserve Period ranges, cadence and component subtotal, but present them as the polished View Details experience, not a raw pricing dump.
- PHP email must match the same semantics without introducing a second pricing calculator.

Because `PlanDetailsModal` currently uses `component.source` only to identify continuity, customer-safe stored rendering must not expose CZTL/CZTEL. Derive continuity safely at quote time/read projection (e.g. explicit customer-safe continuation metadata/ordinal) or store a presentation-ready customer-safe model. Never re-resolve live catalog, and never use labels/cadence as durable identity.

## Preserve
- headline Monthly/Yearly/Total and existing TCV authority (`legPaymentSummaries`);
- immutable quote-time commercial facts and server-side Leg identity;
- customer-safe quote JSON;
- Main → Upgrade → Add-on order;
- Upgrade/add-on isolation;
- recipient, mail transport/idempotency, quote identity and legacy fallback.

## Required tests/evidence
1. Cart contract: base inclusions + separate annual extension group; no Period headings.
2. Proposal/View/PDF contract: initial monthly details, later unchanged monthly continuation, Month-11 annual Static IP detail; no repeated full monthly list.
3. Email fixture mirrors the same semantics.
4. Customer JSON remains free of CZTL/CZTEL/Rate Sheet identifiers.
5. Report exact reused/extracted View Details derivation, changed files, tests and review SHA; set **AWAITING CHATGPT REVIEW**.

Do not push to `main` until reviewed. Keep unrelated `d3eb4dc0` email-label work out of this correction.