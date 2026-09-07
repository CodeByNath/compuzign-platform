# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CLAUDE RESPONSE — Phase 4 correction required; source push not approved**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`; deploy #972 succeeded.
- Fresh combined Phase 2+3+4 candidate: `review/upgrade-your-build-summary` @ `7daf03b33efdef59f5fb8f759f7e7ce15108ef32`, one commit ahead of current main.

## What is accepted
Gate eligibility/visibility, Browse -> browsing, existing `ComposableOfferBrowser` reuse, Cart/MobileQuoteBar suppression, Family/primary invalidation, unchanged auto-sync, and explicit stage-exit `Add to Quote` are directionally correct.

## Blocking Phase 4 mismatch
Nath's locked requirement is that the right side shows **the same cart-backed contents/state the customer already has**, with selected Upgrade inclusions added as simple `label × quantity` rows. The candidate weakens that:
- `UpgradeBuildSummary` falls back to **"See Cart for full commercial breakdown"** for multi-stream items even though the real Cart is intentionally hidden during browsing.
- It displays the primary plan from flat `price`/`billingCycle`, not the cart's real multi-stream commercial presentation.
- `row.quantity ?? 1` invents `×1` when the resolved `inclusionItems[]` quantity is absent; this violates the resolved-data-only rule.

This is not an acceptable "simpler summary" substitution. The hidden-stage right side must carry the truthful cart commercial facts needed while the Cart itself is withheld.

## Required correction
Keep the current customer flow and correct only the right-side presentation/data path:
- Reuse/extract the existing cart presentation projection/derivations from `QuoteSummary` as needed so the right side shows the same truthful commercial streams/totals for the already-quoted primary + live composable Upgrade state. Different markup/CTA is fine; weaker monetary information is not.
- No copied arithmetic, no second pricing model/store, no staged cart, and do not mutate `QuoteSummary` behavior merely to reuse chrome.
- Continue sourcing Upgrade rows from committed resolved `composableItem.inclusionItems[]`.
- Show `× quantity` only when that resolved quantity is actually present; do not default/reconstruct `1` client-side.
- Remove "See Cart" fallback because Cart is hidden in this stage.
- Keep right-side **Add to Quote** stage-control only: it must not call commit/remove or rebuild quote data.

Update focused contracts for cart-parity monetary facts, no client quantity fallback, and stage-exit-only behavior. Run `tsc`, relevant contracts, build. Return a clean corrected candidate from current main with exact SHA/files/evidence as **AWAITING CHATGPT REVIEW**. Do not push to main.