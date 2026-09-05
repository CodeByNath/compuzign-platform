# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW**
- Production remains `main@93ac03ec08a9f96b883fc4dd9deb8f8686cc129e`, deploy `33945492532` live.
- Clean review head `8eb2467b` on `review/upgrade-journey-finalisation` is **NOT approved for push**.

## Claude's report

### 1. Clean review ancestry
Rewound `review/upgrade-journey-finalisation` to `main@93ac03ec` and cherry-picked only the commercial-breakdown commit on top: `fcd5e0f6` — one commit directly on production, `d3eb4dc0` excluded entirely (kept local/unpushed as its own separate follow-up candidate, untouched by this round).

### 2. Presentation corrections (commit `8eb2467b`, on top of `fcd5e0f6`)
- `InclusionDisclosure.tsx`: `DisclosureInclusionRow` gains `unitPrice`; `groupLabel` replaced by `sectionKey` (internal identity — one per resolved component *occurrence*, keyed by `${fromMonth}:${source}:${componentIndex}`, never derived from label text, never rendered), `sectionLabel`, `sectionSubtotal` (the component's own snapshot `price`, formatted with existing cadence wording, e.g. `$80 / yr` — never a sum of its own rows). Two components sharing a Period+cadence get a neutral `(charge N/M)` suffix on the label; identity itself never depends on that text. `InclusionDisclosurePanel` is now Inclusion/Qty/**Unit price**/**Line total**, each section's own subtotal on its heading row, and the combined grand total is suppressed entirely once any row belongs to a section (existing top-level Monthly/Yearly/Total stays the one summary in that case).
- `QuoteProposalPreview.tsx`/`OrderSummary.tsx`: their `FamilyInclusionsList` mirrors the same section+subtotal+unit-price model — covers Review/PDF, customer View/Print Quote, Admin print.
- `NotificationTemplates.php`: `emailCommercialBreakdownRows()`/`emailBreakdownInclusionRows()` mirror the same section identity, disambiguation, unit price, and per-component subtotal for customer/admin email.
- Legacy fallback (no `commercialBreakdown`) is byte-identical to before: `unitPrice` stays `null`, no section heading, combined total renders exactly as it did.

### Starter Cloud acceptance check
Month 11 Yearly section now reads: Static IP Block, Qty 2, Unit price $40, Line total $80, section subtotal `$80 / yr` — verified via extended fixtures on both sides (below), reproducing the auditor's literal example.

### Validation
- New fixtures (TS `composable-quote-cart-contract.ts`, PHP `notification-templates-family-quote-parity.php`): two independent same-cadence components in one Period (distinct `sectionKey`s, `(charge 1/2)`/`(charge 2/2)` labels, independent subtotals `$80`/`$50`, never combined); unit price ($40) distinct from line total ($80); component subtotal sourced from the snapshot, not recomputed; a second item's own independent `buildQuotedCommercialBreakdown()` call proven not to leak rows into a sibling item's disclosure (Main/Upgrade/add-on independence).
- Full `tests/*.php` suite: same 5 pre-existing unrelated failures (Service route fixtures, Tier capability routes, RequestsController test constructor signature ×2, `tier-occupant-first-save` Package schema stub), **plus the expected reappearance of the admin/customer email-label regression** in `notification-templates-composable-quote-parity.php` — that regression's fix (`d3eb4dc0`) is deliberately excluded from this review head per your instruction; it is a real, already-live `main@93ac03ec` bug, not something this round introduced or should silently absorb.
- Full 85-script `contract:*`/`regression:*` sweep: same 7 pre-existing unrelated failures (`admin-station-css` Rate Sheet Tool classes, `package-builder-flow` stale file reference, `platform-identity-schema` Rate Sheet/Requests prefixes, 4 Tier Admin `regression:tier-*` scripts — none touch Family/cost-builder/request-flow).
- `tsc --noEmit` clean, `vite build` clean.

## Not independently verifiable without a live browser/real mail client
Same disclosure as the prior round — visual disambiguation-suffix readability, email-client rendering of the section-subtotal column alignment, and PDF pagination of a multi-section breakdown are unverified beyond fixture/DOM-string assertions.

Review the exact SHA `8eb2467b` on `review/upgrade-journey-finalisation` (parent `fcd5e0f6`, grandparent `main@93ac03ec`) against the required-correction list above.
