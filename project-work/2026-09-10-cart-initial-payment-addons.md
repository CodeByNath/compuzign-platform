# Cart Initial Payment Must Include Add-ons

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `1a9b6cc0322e662dbad233532c44bd1ad40bbe30`.
- Current review branch: `review/cart-initial-payment-addons` @ `d33376c2462cbadd15dfc0d83a29b0045216565a`, exactly 1 ahead / 0 behind production.
- **SOURCE PUSH NOT APPROVED.**

## Defect
Nath reports: KAIROS primary + add-on are quoted; the primary is later replaced by OMNIA; the KAIROS add-on correctly survives; **Initial Payment** then omits that surviving add-on's starting charge.

## Audit of Claude round 1
The cart-footer correction itself is correct: `QuoteTotalsPresentation()` now passes the whole `familyTierItems` set into `startingPaymentsByCycle()`, while keeping primary-only Total Contract Value logic unchanged. The helper already works per quoted item's own earliest start and aggregates only same-cycle starts. The new regression reproduces the defect and covers add-on, composable, later-starting-leg and TCV boundaries.

However, I independently confirmed the SAME omission still exists in downstream customer surfaces:
- `request-flow/OrderSummary.tsx` builds `familyCommercialItems = [...familyMainItems, ...familyComposableItems]` and uses that for Initial Payment, excluding `familyAddonItems`.
- `request-flow/QuoteProposalPreview.tsx` does the same.

Therefore shipping only `d33376c2` would make the Cart truthful while Review & Finalise / proposal/PDF remain wrong for the same quote. That is not an acceptable customer-state split.

## Required behavior
Initial Payment is one whole-quote fact. Every surviving Family Tier line with valid `legPaymentSummaries` must contribute its own starting streams in every customer surface that renders Initial Payment: primary, add-on, composable/Upgrade.

Total Contract Value remains on the current primary/composable policy in this phase. Do not broaden TCV just because Initial Payment broadens.

## Claude — correction round 2
Continue on the SAME review branch for this work item.
1. Apply the same whole-Family-line Initial Payment population to `OrderSummary.tsx` and `QuoteProposalPreview.tsx`: include `familyAddonItems` alongside primary/composable when calling `startingPaymentsByCycle()`.
2. Keep each surface's TCV population exactly unchanged.
3. Audit `NotificationTemplates.php` (or whatever current PHP email renderer owns the Family Initial Payment figure). If it independently computes Initial Payment and excludes add-ons, correct that same population there too. If it does not compute this figure independently, record evidence and do not invent a new path.
4. Extend regression/contracts so the same surviving-add-on scenario proves consistent Initial Payment across Cart, Review & Finalise, proposal/PDF renderer, and email renderer when applicable.
5. Preserve `startingPaymentsByCycle()` itself unless hard evidence shows a helper defect; current source indicates caller populations are the issue.
6. Run the relevant quote/request/PDF/email parity contracts, TypeScript, build, docs check, and any affected PHP tests. Push review branch only, record exact SHA/diff/tests, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
Surviving add-ons; cart ordering; exact quote snapshots; per-item payment rows; each item's own earliest-start semantics; same-cycle aggregation only; primary/composable TCV policy; ongoing/finite disclosure; quantity; composable/Upgrade behavior; legacy Cost Builder fallback; existing customer email/PDF structure.

## Must remove
The primary/composable-only population from **Initial Payment** wherever customer-facing quote surfaces use it.

## Must not substitute
Do not delete surviving add-ons on primary replacement; do not reattach them to OMNIA; do not change TCV to make totals agree; do not fake add-on prices from flat headline values; do not re-resolve live Rate Sheet pricing; do not create a second Initial Payment algorithm; do not add cross-cycle arithmetic.

## Live validation after deployment
Reproduce KAIROS add-on + replacement OMNIA primary. The add-on remains. Cart, Review & Finalise, and proposal/PDF must show the same Initial Payment including OMNIA's starting charge(s) plus the surviving KAIROS add-on's own starting charge(s), excluding later-starting Legs. Email must match too if it displays this figure.
