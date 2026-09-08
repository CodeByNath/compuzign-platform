# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — add Cart footer Upgrade your build recovery route**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `c331909f0b1abc3323f28eafa566c2501f593862`; deploy #974 succeeded.
- Existing initial Upgrade flow + deployed **Manage build** route remain accepted and must not be reopened.

## New live refinement
Nath confirmed the current flow is acceptable but identified the skipped-upgrade gap: when a customer chooses **Maybe next time** and later lands at Cart without any composable/Upgrades line, there is no recovery route back into Upgrade Your Build.

Preferred simple solution: add **Upgrade your build** in the Cart footer immediately before existing **View details**:

`Upgrade your build` | `View details`

Do not move/recreate the recommendation gate/card.

## Required behavior
Show footer **Upgrade your build** only when the currently relevant Package Family has:
- a quoted primary Tier/Edition;
- a real eligible composable catalogue;
- **no committed composable/Upgrades cart line** yet.

Clicking it:
- goes directly to the existing Upgrade **`browsing`** stage;
- does **not** show the first-time Browse/Maybe-next-time gate;
- hides Cart/MobileQuoteBar + Recommendations exactly as current browsing does;
- mounts the same `ComposableOfferBrowser` with the quoted primary and no initial composable item;
- keeps existing auto-sync as the only quote mutation path;
- keeps the current scoped Cart-backed right side;
- existing **Add to Quote** remains stage-exit only and returns to Recommendations-if-present, otherwise Cart.

Once a composable line exists, the footer **Upgrade your build** action disappears; the deployed line-level **Manage build** becomes the correct re-entry route.

## Source-grounded implementation boundary
- `resolveComposableEligibleRows(family)` is already the shared eligibility authority; reuse it, do not derive a second catalogue test.
- `PackageBuilderApp` already knows active Family, its `primary`, and `composableItem`; decide footer-action availability/target there.
- `QuoteSummary` should stay generic via an optional package-builder-only footer callback/label; other callers remain unaffected.
- Reuse/generalise the existing one-shot race-safe Cart→`FamilyTierAdapter` browsing request rather than create a second navigation state machine. The consumer may enter browsing with matching primary + eligible catalogue even when `selectedComposableItem` is null; **Manage build** still originates only from an existing composable line.
- Keep cross-Family routing deterministic: the footer action targets an explicit eligible Family/primary, never “first item in Cart” or a rendered label.

## Must preserve / must not substitute
Preserve initial gate, Maybe next time, Manage build, auto-sync, add-ons, Cart totals, mobile behavior, and Add-to-Quote exit. No duplicate card, second catalogue, edit mode, staging cart, pricing/persistence change, or extra customer step.

Add focused contracts for footer eligibility, disappearance after composable exists, direct browsing re-entry, cross-Family race safety, and unchanged Manage build semantics. Run `tsc`, relevant contracts and build. Push a clean review candidate from current `main`, record exact SHA/files/evidence here, set **AWAITING CHATGPT REVIEW**. Do not push to main.