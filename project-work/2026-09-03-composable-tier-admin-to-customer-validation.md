# Upgrade journey — active correction track

## Status
- **AWAITING CHATGPT REVIEW**
- Review branch: `review/upgrade-journey-finalisation` (reused, same production base) @ `b1bc63c1c401f998c32d526d02b3e10f7554b0ce` — one clean commit ("Fix customer range/Contract Value wording and finalise-sidebar detail") on top of production `main@6a03a18239cec8fa32ce13c5a3bf626293d6f0bd`. Pushed to origin. `main` untouched — do not push before review per this file's own instruction.
- Source architecture/snapshot work remains accepted. This round is customer presentation only.

### Spelling note for the auditor
This implementation uses **"Until Canceled"** (single L) everywhere this doc says "Until Cancelled" (double L). Reason: `PlanDetailsModal.tsx`'s Charge Occurrences/TCV cells already established "Until Canceled" (single L) for the exact same open-ended concept, back in the accepted Phase 8h work (`project-work/2026-08-29-phase-8h-plan-details-value-states.md`, still enforced by `plan-details-value-states-contract.ts`). Introducing a second, differently-spelled term for the same customer-facing concept seemed worse than a literal read of this doc's own spelling — flagging this explicitly in case the double-L spelling was intentional and something else should change instead.

### Changed files
- `resources/ts/utils/commercialLegPresentation.ts` — `customerFacingRange()`: plan-start-anchored (`from === 0`) now reads `Through Month N` (finite) / `Until Canceled` (open); a later-starting range keeps normal `Month X–Y` grammar, never prepends `Through`, and never emits the bare word `Ongoing` for a still-open end either.
- `src/Modules/Requests/Notifications/NotificationTemplates.php` — ported the identical fix into its own `customerFacingRange()` PHP mirror (email generation is server-side and can't share the TS function) and its own Contract Value fallback block (`Ongoing` -> `Until Canceled`).
- `resources/ts/components/cost-builder/QuoteSummary.tsx`, `resources/ts/components/request-flow/QuoteProposalPreview.tsx`, `resources/ts/components/request-flow/OrderSummary.tsx`, `resources/ts/components/package-builder/QuoteDetailsOverlay.tsx` — the non-finite Contract Value fallback now renders `Until Canceled` instead of `Ongoing`. `computeTotalContractValue()`'s own finite/non-finite decision and the numeric branch are untouched.
- `resources/ts/components/request-flow/OrderSummary.tsx` — `FamilyInclusionsList()` now derives rows from `disclosureRowsForFamilyTierItem()` (the compact cart shape: base inclusions once + Extension-group headings) instead of `periodBreakdownRowsForFamilyTierItem()`. `QuoteProposalPreview.tsx`'s own `FamilyInclusionsList()` is untouched and keeps the detailed Period-by-Period rows — it stays in the DOM specifically for print/PDF/email cloning.
- `scripts/composable-quote-cart-contract.ts` — updated the one stale assertion that literally expected the old `Plan start–Month 10`/`Month 11–Ongoing` wording, plus new checks: `customerFacingRange()` pure-function coverage (all four from/to shapes), all four Contract Value fallback surfaces read `Until Canceled` and never `Ongoing`, the fully-finite branch is untouched, `OrderSummary.tsx` now calls `disclosureRowsForFamilyTierItem()`/never `periodBreakdownRowsForFamilyTierItem()`, and `QuoteProposalPreview.tsx` keeps the reverse (print-preview independence from the visible sidebar).
- `tests/notification-templates-family-quote-parity.php` — updated the two assertions that expected the old `Plan start–Month 10`/`Month 11–Ongoing`/bare `Ongoing` email wording to expect the new wording.
- Rebuilt `dist/js/admin-station.js`, `dist/js/cost-builder.js`, `dist/js/QuoteProposalPreview-*.js` (new content hash).

### Tests run (all pass; pre-existing unrelated failures confirmed identical on unmodified `main` and left alone)
- `npx tsc --noEmit` — clean.
- `npm run contract:composable-quote-cart` (updated/extended) — pass.
- `npm run contract:plan-details-value-states`, `contract:composable-live-correction`, `contract:request-flow-family-tier-parity`, `contract:quote-cart-addon`, `contract:package-family-request-flow`, `contract:package-family-cart`, `contract:composable-request-line`, `contract:money-format`, `contract:commercial-leg-inclusion-groups`, `contract:commercial-leg-extension-groups` — pass.
- `php tests/notification-templates-family-quote-parity.php` (updated) — pass.
- `php tests/package-family-notification.php`, `tests/request-durable-submission.php` — pass.
- `npm run build` — clean.
- Pre-existing, unrelated, unchanged by this round (verified identical failure on stashed/clean tree): `contract:package-builder-flow` (missing `FullBuildDetail.tsx`), `contract:admin-station-css` (stale Rate Sheet import-tool classes), `contract:platform-identity-schema` (script error), `tests/notification-templates-composable-quote-parity.php` (Build Your Own badge assertion), `tests/quote-view-email-link.php` (`RequestsController` constructor arity).

## Live evidence
Fresh quote/PDF `CZ-FP7VKT` shows rejected wording:
- `PLAN START–MONTH 10`
- `PLAN START–ONGOING`
- `Contract Value Ongoing`

The cart quick-view presentation is good: base inclusions once + **Extensions billed Annually**. The finalise-quote sidebar instead expands every Family item into the full period breakdown, duplicating detail already available in the PDF/email/View-Print output.

## Required range wording contract
Customer-facing range formatter must stop using `Plan start–...`.
- Only when a period/stream begins at the plan start (`from/start = 0`):
  - finite end: `Through Month 10`, `Through Year 2`, etc., using the existing unit/context already owned by that surface;
  - open-ended: **Until Cancelled**.
- Later ranges such as `Month 3–11` keep normal range grammar; never prepend `Through`.
- Do not output customer-facing `Ongoing` for these plan/term displays. Internal `null` remains the resolver/storage open-end representation.
- Apply through the shared customer range presentation used by Plan Details, quote/PDF, customer View/Print, email and other repeated customer surfaces; do not create per-surface copies.

## Contract Value — narrow correction only
Do **not** rename Contract Value / Total Contract Value and do **not** change TCV arithmetic.

Keep the existing behavior when the quote is fully finite:
- all contributing items/streams finite -> show the existing numeric **Total Contract Value** (e.g. `$208,000`).

Only the non-finite fallback wording changes:
- all contributing items/streams indefinite -> show **Until Cancelled** instead of `Ongoing`;
- mixed finite + indefinite -> show **Until Cancelled** instead of `Ongoing`.

So the existing `computeTotalContractValue()` null/non-null decision remains authoritative: non-null -> numeric value; null because any contributing stream is open-ended -> **Until Cancelled**. Initial Payment remains numeric and unchanged. This should be a minimal shared presentation change, not a new commitment model.

## Finalise-quote sidebar correction
`OrderSummary.tsx` currently renders `FamilyInclusionsList()` with `periodBreakdownRowsForFamilyTierItem()`, causing the screenshot-4 full period dump. This visible sidebar may safely use the same compact Family disclosure semantics as the cart because `QuoteProposalPreview` is separately kept in the DOM specifically for print cloning (`.cz-proposal`) regardless of expand state. Therefore:
- visible finalise-quote Family items should use the compact cart shape: base inclusions once + Extension groups;
- do **not** remove or weaken `QuoteProposalPreview`, PDF/email/View-Print detailed period rendering, or stored `commercialBreakdown`;
- printing/PDF/email must continue using the detailed View Details-derived model.

## Preserve
- pricing/TCV authority and numeric values;
- quote-time snapshots and customer-safe ID boundary;
- Main → Upgrade → Add-on ordering;
- Bundle child total rules;
- mail transport/idempotency;
- legacy quote fallbacks.

## Acceptance
1. Starter Cloud detailed output: `Through Month 10`; Month 11–23 unchanged continuation + annual detail; no `Ongoing`.
2. Specifically open-ended Upgrade/Add-on range: **Until Cancelled**.
3. Fully finite Contract Value remains numeric exactly as today.
4. Mixed or indefinite Contract Value shows **Until Cancelled**; Initial Payment remains numeric.
5. Finalise sidebar matches compact cart presentation; PDF/email/View-Print remain detailed and unchanged structurally.
6. Add focused contracts for range wording, finite vs non-finite Contract Value fallback, and print-preview independence from visible sidebar rendering.

Report changed files/tests/clean review SHA and set **AWAITING CHATGPT REVIEW**. Do not push to `main` before review.