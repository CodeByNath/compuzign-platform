# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — Phase 2 only: Upgrade gate + visibility control**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `5c7eb0621c1c3610b6e970826a294065e7bdb89a`.
- Deploy independently confirmed: GitHub Actions **#972** (`Deploy to Hostinger`, run `34138809141`) completed **success** for exact `head_sha` `5c7eb0621c1c3610b6e970826a294065e7bdb89a`.
- Phase 1 eligibility extraction is accepted/deployed. No live customer behavior change was expected from Phase 1.

## Locked customer flow
The primary Tier/Edition is already in the quote before this stage. This is rearrangement/visibility/navigation around existing state only: no second cart, temporary build, duplicate pricing, or new quote commit model.

1. Focused Tier -> existing Add to Quote.
2. When `resolveComposableEligibleRows(family).length > 0`, hide Cart + Recommended Add-ons and show **Upgrade your build** gate.
3. **Browse Catalogue** -> later Phase 3 opens existing `ComposableOfferBrowser` in the focused shell.
4. **Maybe next time** -> end gate -> existing Recommended Add-ons if present -> Cart; otherwise Cart directly.
5. Existing composable auto-sync must later remain active while browsing and must NOT close the gate.
6. Future right summary uses committed `inclusionItems[]` (`label`, resolved `quantity`) and existing cart/payment calculation authorities.
7. Future right-side **Add to Quote** is stage-control only; no quote mutation.

## Accepted phase sequence
1. Shared eligibility extraction. **Accepted/deployed.**
2. Gate state + Cart/MobileQuoteBar/Recommendations suppression + `Maybe next time`. **Implement now.**
3. Browse Catalogue routing to existing browser.
4. Right-side build summary + stage-exit CTA.
5. Mobile stacking/polish + matrix QA.

## Phase 2 — exact scope
Implement only the gate shell/state and visibility control.

### Must preserve
- Existing primary Add-to-Quote mutation and `stagedTierId` recommendation behavior underneath the gate.
- Existing add-on logic and cart contents/state; hide presentation only.
- Phase-1 `resolveComposableEligibleRows(family)` as the sole catalogue eligibility truth.
- Family-switch/reset behavior: gate cannot leak across Families or survive loss/replacement of the selected primary.

### Required behavior
- In `FamilyTierAdapter`, add the smallest local gate state (`'pending' | 'browsing' | null` is acceptable, but Phase 2 only enters `pending`; do not wire browsing yet).
- `commitSelection()` must set `pending` only when the shared eligibility result is non-empty. If no catalogue, preserve today's post-selection flow immediately.
- While gate active, suppress the existing Recommendations/staged view and tell `PackageBuilderApp` to hide both `QuoteSummary` and `MobileQuoteBar` without altering `items`.
- Render the real gate panel in the existing recommendation-stage visual area: copy `Your plan is already in the quote` / `Upgrade your build`; actions `Browse Catalogue` and `Maybe next time`.
- **Maybe next time** clears the gate and reveals exactly the existing continuation already represented by `stagedTierId`: Recommendations if add-ons exist; otherwise Cart.
- **Browse Catalogue in Phase 2 must not fake Phase 3.** Render it visibly but keep it non-destructive and do not mount/re-route the catalogue yet. Prefer a disabled/non-progressing control with an explicit phase-safe state over inventing a temporary route. If the current UI cannot support a non-broken staged CTA cleanly, stop and report rather than substituting behavior.

### Must not expand
No `ComposableOfferBrowser` routing/mount-condition change, no right-side summary, no Add-to-Quote stage-exit CTA, no pricing/preview/auto-sync changes, no new cart calculation, no add-on redesign, no Admin changes.

## Claude — next action
Prepare a clean Phase-2 review branch from current `main`, implement only the scope above, add focused contracts for gate eligibility/visibility/reset/Maybe-next-time behavior, run `tsc`, relevant contracts and build, and record exact branch/SHA/files/evidence here as **AWAITING CHATGPT REVIEW**. Do not push to `main`.