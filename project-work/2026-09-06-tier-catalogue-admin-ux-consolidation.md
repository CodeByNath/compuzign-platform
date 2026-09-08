# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — live flow accepted; add Manage build re-entry refinement**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `f2d27ae06b73c4b934a8596510bc1c4c5b2c0f60`.
- Hostinger deploy #973 succeeded.
- Nath live validation: build/flow accepted; refinement required before closure.

## Accepted live behavior
Initial flow is correct and must remain unchanged:
Primary Tier/Edition already in quote → Upgrade gate when eligible → Browse Catalogue → existing `ComposableOfferBrowser` auto-sync → right scoped Cart presentation → **Add to Quote** exits → existing Recommendations/Add-ons + Cart.

## Missing capability — Manage build
After a composable/Upgrade line has been added, the customer currently has no route from Cart back into the focused Upgrade catalogue to change it.

Add **Manage build** on the Cart's composable **Upgrades** line. This action belongs to Upgrade Your Build, not generic Cart navigation.

### Required behavior
Cart **Manage build** → directly reopen the existing Upgrade **`browsing`** stage for that committed composable line.
- Do **not** show the first-time Browse/Maybe-next-time gate again.
- While reopened, hide normal Cart/MobileQuoteBar + Recommendations exactly as current browsing does.
- Hydrate the existing `ComposableOfferBrowser` from the already-committed composable item; no copy/reseed model beyond its existing `initialCartItem` path.
- Existing auto-sync remains the only mutation path while editing.
- Existing right-side scoped Cart presentation remains live.
- Existing **Add to Quote** remains stage-exit only and returns to Recommendations-if-present, otherwise Cart.

## Source-grounded implementation boundary
Current source: `QuoteSummary` renders each cart row but has no Manage callback; `PackageBuilderApp` owns Cart and current Family selection; `FamilyTierAdapter` owns the internal Upgrade pending/browsing state.

Implement the smallest navigation signal between those existing owners:
- Add an optional package-builder-only `onManageBuild(item)` affordance to `QuoteSummary`; other `QuoteSummary` callers remain unaffected.
- Render **Manage build** only for the composable Upgrades line that coexists with its primary (reuse existing quote role/composable coexistence authority; do not infer from labels).
- `PackageBuilderApp` should route that item to its Family and send only an identity/request signal into `FamilyTierAdapter`.
- `FamilyTierAdapter` consumes that request only when the matching primary + committed composable item exist, then enters its existing `browsing` state. Do not hoist/rebuild the Upgrade state machine or duplicate build/cart state.
- Make the request one-shot so exiting browsing cannot immediately reopen it.

## Must preserve / must not substitute
Preserve all accepted initial-flow behavior, pricing, Cart presentation, auto-sync, add-ons, and mobile behavior. No new edit mode, staging cart, quote mutation on entry, pricing resolver, persistence model, second catalogue, or extra customer step.

Add focused contracts for: Manage only on real composable-with-primary line; one-shot direct re-entry to `browsing`; cross-Family routing; no mutation on entry; Add-to-Quote exit unchanged. Run `tsc`, relevant contracts and build. Push a clean review candidate from current `main`, record SHA/files/evidence here, set **AWAITING CHATGPT REVIEW**. Do not push to main.