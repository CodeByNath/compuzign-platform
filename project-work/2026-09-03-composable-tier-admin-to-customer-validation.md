# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW**
- Production remains `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`, deploy `33964003314` / #953 successful.
- Review head `1e99da02` on `review/upgrade-journey-finalisation` is **NOT approved for push**.

## Claude's report

### 1. Blocking presentation drift fixed
`periodBreakdownRows()` (new, `resources/ts/utils/commercialLegPresentation.ts`) now reproduces `PlanDetailsModal.tsx`'s Billing Breakdown by Period **exactly**:
- `customerFacingRange()` wording — "Plan start–Month 10" / "Month 11–Ongoing", never the raw "Month 0–10"/"Indefinite" text the prior round used.
- The Period payment/category fact line you found missing entirely — a sole active component gets `paymentCategoryLabel()` ("Recurring payment"/"Fixed payment"); a collision Period gets the combined "Active payments" line summing every active component's own `priceWithCadence()`.
- A component's own authoritative subtotal line ("Annual total: $80.00"), never combined across components, never repeated for a continuing component.
- Collision/continuation notes and inclusion-table suppression, unchanged in substance from the prior round.

### 2. Reuse/ownership drift fixed
Moved `commercialLegPresentation.ts` from `package-builder/` to `utils/` (package-builder already depends on cost-builder, never the reverse — this file needed a home neither layer owns) and consolidated every duplicated rule into it:
- `sameComposition()`, `customerFacingRange()`, `paymentCategoryLabel()`, `frequencyLabel()`, `priceWithCadence()`/`billingSuffixLong()`, `formatMoney()` — moved out of `PlanDetailsModal.tsx` (which now imports them; re-exports `formatMoney` for its one existing external importer).
- `commercialLegInclusionGroups()`/`CommercialLegInclusionGroup`, `commercialLegExtensionGroups()`/`CommercialLegExtensionGroup`, `extensionHeading()` — moved out of `FamilyTierAdapter.tsx` (which now imports and re-exports them, so the two existing standalone contract scripts importing these directly needed no changes).
- `buildQuotedCommercialBreakdown()`/`buildQuotedCartBreakdown()`/`mapBreakdownInclusion()` — moved out of `cost-builder/PricingTiers.tsx`, now calling the co-located functions above directly. The `sameLiveComposition()`/`CART_EXTENSION_BILLING_CYCLE_LABELS` local copies you flagged are deleted entirely.

**Proof by construction, not convention**: `PlanDetailsModal.tsx`'s own live "Billing Breakdown by Period" JSX now calls `periodBreakdownRows(buildQuotedCommercialBreakdown(periods))` and renders from that row list — the exact same two functions the durable snapshot rendering (`periodBreakdownRowsForFamilyTierItem()`, now a two-line wrapper) calls. They cannot drift apart because they're the same function calls, not merely equivalent ones. Added a source-string contract check confirming this and confirming neither `PlanDetailsModal.tsx` nor `FamilyTierAdapter.tsx` still defines its own copy of any relocated rule.

### 3. Cart shape unaffected
`disclosureRowsForFamilyTierItem()`/`buildQuotedCartBreakdown()` (base-once + Extensions billed X, no Period headings) is unchanged in behavior — only its implementation now calls the shared `commercialLegInclusionGroups()`/`commercialLegExtensionGroups()`/`extensionHeading()` instead of local copies.

### 4. Email
`NotificationTemplates.php`'s `emailPeriodBreakdownRows()` rewritten with PHP mirrors of the same rules (`frequencyLabel()`, `paymentCategoryLabel()`, `priceWithCadence()`/`billingSuffixLong()`, `customerFacingRange()`) — necessarily a separate implementation since PHP can't import TS, but matching the identical wording/facts (verified by fixture, below). No second pricing calculator — all figures still come from the stored snapshot.

### Validation
- `composable-quote-cart-contract.ts`: exact-wording assertions for the fact line, component notes (cadence label + status text), table labels, subtotals, plus the source-string proof described above.
- `commercial-leg-inclusion-groups-contract.ts`/`commercial-leg-extension-groups-contract.ts`/`plan-details-value-states-contract.ts`/`package-builder-bundle-inclusion-parity-contract.ts` (all pre-existing, importing the relocated symbols): all pass unchanged, confirming the re-exports preserve every existing consumer.
- `notification-templates-family-quote-parity.php`: exact wording assertions matching the TS side ("Plan start–Month 10", "Month 11–Ongoing", "Recurring payment", "Active payments", "Annual total: $80.00", Monthly total appears exactly once).
- Full `tests/*.php` suite: same 5 pre-existing unrelated failures, plus the still-expected `d3eb4dc0`-excluded regression.
- Full 85-script `contract:*`/`regression:*` sweep: same 7 pre-existing unrelated failures.
- `tsc --noEmit` clean, `vite build` clean.

## Not independently verifiable without a live browser/real mail client
Same disclosure as prior rounds — actual visual rendering of the popup/proposal/email and PDF pagination remain unverified beyond fixture/DOM-string assertions.

Review the exact SHA `1e99da02` on `review/upgrade-journey-finalisation` (parent `0e0d4fc3` → `a42eeba8` → `main`) against the required correction and acceptance criteria above.
