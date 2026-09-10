# Cart Initial Payment Must Include Add-ons

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `1a9b6cc0322e662dbad233532c44bd1ad40bbe30`.
- Prior focused-selector work is **CLOSED**; origin is clean with only `main` + `Project-work-instructions`.

## Live defect
Nath reports this cart sequence:
1. KAIROS primary + KAIROS add-on are quoted.
2. Primary is later changed/replaced by OMNIA.
3. The KAIROS add-on correctly remains in the quote.
4. **Initial Payment** no longer includes that surviving add-on's starting charge.

The surviving add-on behavior is accepted. This work is only about truthful Initial Payment calculation.

## Source audit
`QuoteTotalsPresentation()` in `QuoteSummary.tsx` correctly derives `familyTierItems`, but then creates `primaryFamilyTierItems = familyTierItems.filter((item) => !item.isAddon)`.

That primary-only set is intentionally used for Total Contract Value, because current comments explicitly exclude add-ons from canonical finite-contract TCV math.

The defect is that **Initial Payment reuses the same primary-only set**:

`startingPaymentsByCycle(primaryFamilyTierItems.map((item) => item.legPaymentSummaries ?? []))`

So every add-on is excluded before the starting-payment helper runs. `startingPaymentsByCycle()` itself is already a generic multi-item helper: for each supplied item it finds that item's own earliest `startMonth`, includes streams beginning there, and groups same-cycle amounts. The omission is therefore in the caller, not the helper.

## Required behavior
Initial Payment is a whole-cart "what is due at each quoted item's own start" fact. Every quoted `family_tier` line with valid `legPaymentSummaries` that survives in the cart must contribute its own starting streams — **primary, add-on, and composable/Upgrade**. Do not make Initial Payment depend on which Family owns the current primary.

Do **not** change the existing primary-only TCV policy in this phase.

## Claude — implementation phase
From current production `main`, create one review branch.
1. Correct only the Initial Payment input set in `QuoteTotalsPresentation()` so all applicable Family Tier cart lines contribute their starting streams.
2. Preserve `startingPaymentsByCycle()` semantics: each item's own earliest start; same-cycle aggregation only; no timeline multiplication or cross-cycle pricing invention.
3. Keep Total Contract Value logic and its primary-only eligibility exactly unchanged.
4. Add/extend a contract proving a surviving add-on contributes to Initial Payment after a different primary is present/replaced. Also prove primary + add-on same-cycle starting charges aggregate correctly, and a later-starting leg within an item is excluded.
5. Include composable/Upgrade coverage if it has `legPaymentSummaries`, because Initial Payment is whole-cart, while preserving all existing Upgrade cart behavior.
6. Run relevant quote/cart/payment-summary contracts, TypeScript, build, docs check. Push review branch only; record SHA/diff/tests here; set **AWAITING CHATGPT REVIEW**; stop. Do not push `main`.

## Must preserve
Surviving add-ons; cart ordering; exact quote snapshots; per-item stream rows; starting-payment helper semantics; primary-only TCV policy; ongoing/finite disclosure; quantity; composable/Upgrade behavior; legacy Cost Builder fallback.

## Must remove
The accidental primary-only filter from the **Initial Payment** calculation path.

## Must not substitute
Do not delete surviving add-ons when primary changes; do not attach an add-on to the new primary; do not fake a flat add-on price; do not alter TCV to make the number match; do not re-resolve live pricing from Rate Sheets; do not invent cross-cycle arithmetic.

## Live validation after deployment
Reproduce KAIROS add-on + replacement OMNIA primary. Cart must retain the add-on and Initial Payment must include the OMNIA primary starting charge(s) **plus** the surviving KAIROS add-on's own starting charge(s), with no unrelated later-starting Leg included.
