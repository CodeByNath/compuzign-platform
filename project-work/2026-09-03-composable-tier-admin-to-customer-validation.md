# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW**
- Production remains `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`, deploy run `33964003314` / #953 successful (unchanged from live-validation report — this round's work is not yet pushed).
- Review head `0e0d4fc3` on `review/upgrade-journey-finalisation` is **NOT approved for push**.

## Claude's report

### Root cause of the rejected presentation
`disclosureRowsForFamilyTierItem()` and `QuoteProposalPreview.tsx`/`OrderSummary.tsx`'s `FamilyInclusionsList` both walked the raw `commercialBreakdown` Period array directly for every surface (cart, PDF, email) — literally rendering "Month 0–10" / "Month 11–Indefinite" headings and repeating each Period's full inclusion list, which is exactly the debugger-style dump you rejected.

### Two presentation models, matching your split exactly
**Cart quick-view** (`QuoteSummary.tsx`/`QuoteDetailsOverlay.tsx` via `InclusionDisclosurePanel`): `disclosureRowsForFamilyTierItem()` now reads a new `cartBreakdown` field instead — computed once at capture time by `buildQuotedCartBreakdown()` (`PricingTiers.tsx`), which mirrors `FamilyTierAdapter.tsx`'s own live `commercialLegInclusionGroups()`/`commercialLegExtensionGroups()` (same first-seen-wins dedup, same Headline-Leg-relative Extension eligibility, same "only the difference from Headline" filter). Starter Cloud now reads exactly: User Seats (base, once) → **Extensions billed Annually** → Static IP Block, Qty 2. No Period ranges anywhere in the cart.

**PDF/Review/customer View-Print/email**: `commercialBreakdown` gained `continuesFromPrevious` per component — computed once by `buildQuotedCommercialBreakdown()` while live Leg identity is still available to pair a component with its predecessor, via a local copy of `PlanDetailsModal.tsx`'s own `sameComposition()`. `periodBreakdownRowsForFamilyTierItem()` (new, `InclusionDisclosure.tsx`) reuses that file's exact Billing Breakdown by Period shape: Period heading → payment-timing note ("Begins in Month 11 at $80 / yr" / "Continues unchanged at $156.50 / mo") → inclusion table, suppressed only when continuing unchanged. `NotificationTemplates.php`'s new `emailPeriodBreakdownRows()`/`emailComponentNoteText()` mirror the identical rule server-side, no second pricing calculator.

### Customer-safety boundary preserved
Both new fields are safe by construction: `cartBreakdown`'s inclusions reuse the same identifier-free `QuotedBreakdownInclusion`/`QuotedExtensionGroup` shapes (no `source`/`id`), and `continuesFromPrevious` is a plain boolean. `RequestSchema::sanitizeCartBreakdown()` and the `continuesFromPrevious` allow-list entry extend the existing per-field allow-list discipline; `restArgs()` schema updated. Layering: `commercialLegInclusionGroups()`/`commercialLegExtensionGroups()`-equivalent logic and `sameComposition()` are deliberately **local copies** in `PricingTiers.tsx` rather than imports from `FamilyTierAdapter.tsx`/`PlanDetailsModal.tsx` — package-builder already imports from cost-builder, never the reverse, matching this file's own established cross-layer convention (see its `BREAKDOWN_CYCLE_SUFFIX_OVERRIDES` precedent).

### Changed files
`paymentSummary.ts` (types), `PricingTiers.tsx` (`buildQuotedCommercialBreakdown()` + `continuesFromPrevious`, new `buildQuotedCartBreakdown()`), `types.ts` (`cartBreakdown` field), `FamilyTierAdapter.tsx`/`ComposableOfferBrowser.tsx` (wire `headlineLegId`/`cartBreakdown` into both producers), `InclusionDisclosure.tsx` (`disclosureRowsForFamilyTierItem()` repurposed to `cartBreakdown`; new `periodBreakdownRowsForFamilyTierItem()`/`PeriodBreakdownRow`), `QuoteProposalPreview.tsx`/`OrderSummary.tsx` (switch to the new period derivation), `cost-builder.css` (`--note` row style), `RequestSchema.php` (`sanitizeCartBreakdown()`, `continuesFromPrevious`, `restArgs()`), `NotificationTemplates.php` (`emailPeriodBreakdownRows()` replaces the old cadence-collision section model).

### Validation
- `composable-quote-cart-contract.ts`: cart shape (base once, Extensions billed Annually, no Period headings anywhere), continuity suppression (User Seats table renders once), collision handling (two same-cadence components each get their own note+table, no special-case needed), no-headline fallback, cross-item isolation.
- `request-schema-family-quote-snapshot.php`: `continuesFromPrevious` persists verbatim and defaults false; `cartBreakdown` sanitizes with the same identifier-free discipline (a real-looking raw `source`/`id` still stripped).
- `notification-templates-family-quote-parity.php`: email shows the same continuity notes; User Seats table renders exactly once across both Periods.
- Full `tests/*.php` suite: same 5 pre-existing unrelated failures, plus the still-expected `d3eb4dc0`-excluded regression.
- Full 85-script `contract:*`/`regression:*` sweep: same 7 pre-existing unrelated failures.
- `tsc --noEmit` clean, `vite build` clean.

## Not independently verifiable without a live browser/real mail client
Same disclosure as prior rounds — actual visual rendering of the cart Extension grouping, the Period-note wording in a real mail client, and PDF pagination remain unverified beyond fixture/DOM-string assertions.

Review the exact SHA `0e0d4fc3` on `review/upgrade-journey-finalisation` (parent `a42eeba8`, currently == `main`) against the required correction and acceptance criteria above.
