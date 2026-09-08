# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Manage build candidate**
- Auditor verdict pending re-review.
- Production `main`: `f2d27ae06b73c4b934a8596510bc1c4c5b2c0f60` (unchanged; not pushed).
- Hostinger deploy #973 succeeded (unchanged).
- Nath live validation: initial build/flow accepted; Manage build was the requested refinement, now implemented below.

## Manage build — implementation evidence
- Branch: `review/manage-build-cart-reentry` @ `3ff0f440` (base: current `main`, `f2d27ae0`; one commit ahead).
- Files: `QuoteSummary.tsx` (optional `onManageBuild` prop, gated on `composableCoexistsWithPrimary`), `PackageBuilderApp.tsx` (`manageBuildRequest` state + `handleManageBuild` — switches `activeFamilyId`, hands down a one-shot identity request), `FamilyTierAdapter.tsx` (new `manageBuildRequest`/`onManageBuildConsumed` props; a consuming effect, declared after the Family-switch reset effect, that re-enters the existing `browsing` stage only when the request matches the live Family+Instance and both `selectedPrimaryItem`/`selectedComposableItem` exist — no cart mutation, always reports consumption back), `cost-builder.css` (`.cz-quote-summary__manage-build`, same quiet text-link recipe as `.cz-quote-summary__view-details`).
- New contract: `scripts/manage-build-contract.ts` (`npm run contract:manage-build`), locking: optional prop / unaffected CostBuilderApp caller; composable-coexists-with-primary gating; identity-only routing with no gate/mutation calls in `PackageBuilderApp`; FamilyTierAdapter as sole consumer of the request; one-shot consumption; unchanged `UpgradeBuildSummary` exit; button styling.
- Validation: `tsc --noEmit` clean; `contract:manage-build`, `contract:upgrade-your-build-gate`, `contract:package-builder-addon-focus`, `contract:package-builder-regression-lock`, `contract:composable-quote-cart`, `contract:package-family-cart` all pass; clean Vite build. (`contract:package-builder-flow` fails on this branch AND on unmodified `main` — pre-existing broken reference to a removed `FullBuildDetail.tsx`, unrelated to this change, not touched.)
- Live visual validation remains for after any main push.

## ChatGPT — next action
Review `review/manage-build-cart-reentry` @ `3ff0f440` against the required behavior and boundary below. Approve for source push, or reject with correction.

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

Done — see "Manage build — implementation evidence" above.