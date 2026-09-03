# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — next phase: Request -> PDF -> customer email propagation audit.**
- Auditor verdict: **Proceed with safeguards.**
- Production accepted: `main@84ebbb2850f9e8f9ead8cec8c13ee67462cb3f33`; Hostinger Deploy #937 / run `33754346845` succeeded.

## Accepted chain through quote/cart
Live customer validation passed on deployed `/pricing/`:
- standalone Build Your Own creates one aggregate composable line;
- zero-selected/no-required removes it;
- primary + composable coexist independently;
- quote count/payment streams include composable once;
- no reactive re-sync loop after idle;
- update does not duplicate;
- primary removal does not remove composable and vice versa;
- reload re-seeds persisted composable choice without auto-mutating cart.

Accepted architecture remains locked: centralized `primary | addon | composable`; no per-inclusion products; no `is_addon` reuse; Family+Tier-System composable key; commercial facts only from successful server preview.

This overall work track remains open. Do not reopen the accepted Admin/customer/quote-cart architecture without hard evidence.

## Next phase — Request / PDF / customer email
Goal: carry the already-accepted composable quote snapshot through the existing Request pipeline and every customer representation without inventing a second commercial model.

### Claude first action — audit only, no source edits
Trace the exact current pipeline:
`FamilyTierQuoteItem` cart snapshot -> Request submit payload -> REST schema/sanitizer -> stored Request line -> Admin Request read/display -> proposal/quote PDF -> customer email content/attachment/view`.

Inspect at minimum:
- `RequestSchema.php` sanitizer + REST args for `family_tier`;
- request submission mapping/payload construction;
- `RequestLine` / `requestLineToCartItem` and any request-item display helpers;
- Admin Request surface representation;
- `QuoteProposalPreview` / print/PDF generation path;
- customer email template/body/attachment generation path;
- every allow-list/serialization boundary that would currently drop `isComposable` or `composableSelection`;
- existing handling of `inclusionItems`, `legPaymentSummaries`, quantities, Tier/Edition labels, TCV/payment streams.

Report in this same file:
1. exact fields that must persist for a truthful composable snapshot;
2. fields that are display-only and should NOT be stored;
3. how Request/Admin/PDF/email should distinguish `primary | addon | composable` without misusing `is_addon`;
4. exact customer-facing label/section for composable (prefer **Build Your Own**, not raw IDs or “primary”);
5. how selected inclusion names + quantities and per-Leg payment streams appear consistently across Admin, proposal/PDF and email;
6. backward compatibility for old Requests with no composable fields;
7. any schema/version/migration risk;
8. exact source files and focused contracts/tests required.

### Hard safeguards
- One stored aggregate composable Request line, never one line per inclusion.
- Persist the resolved commercial snapshot already in cart; do not re-resolve pricing from current Rate Sheet/occupant state when viewing an old Request/PDF/email.
- `composableSelection` is customer-choice audit/reseed context; resolved `inclusionItems` + `legPaymentSummaries` remain the commercial/display snapshot.
- No new entity/CZTG/Rate Sheet identity.
- No changes to pricing/resolver math in this phase, including the known occurrence-month issue.
- Existing primary/Add-on Request behavior must remain byte-compatible when new optional fields are absent.
- Do not implement until auditor approves the audit design.

Set **AWAITING CHATGPT REVIEW** after the audit. Overall final UI/UX refinement remains a later phase after this representation chain is accepted.