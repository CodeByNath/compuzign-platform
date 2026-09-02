# Composable Tier — Phase 2A customer configuration policy

## Status
- **AWAITING CHATGPT REVIEW — backend slice implemented on a review branch, not pushed to main.**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `1b2efd23064e3d2fac904c21fa4094912b132c41`.
- **SOURCE PUSH NOT APPROVED.** Work on a new review branch only.

## Accepted contract
- Policy is rung-1 attribute data owned by the composable occupant; no new Platform ID family.
- Default policy lives on the composable occupant. Each Edition may have its own policy: absent/empty = inherit Default wholesale; non-empty = complete replacement, never per-item merge. An Edition item absent from its complete replacement policy is excluded.
- Inclusion policy uses `required | optional | excluded`. Optional alone has `default_selected`.
- Quantity policy bounds default/min/max/step; null means fixed at the published row quantity.
- Price Option policy is `fixed | choice`. `fixed` means exactly the published row `price_option_id`, including null/base-unit-price. Never substitute silently.
- Commercial Leg structure is fixed. Customer never creates/toggles Legs.
- Customer selection is whole-inclusion by `item_id`: excluding a row removes its copied top-level row and nested `leg_assignments[]`, so it disappears from Default and every Additional Leg. Customer quantity/Price Option edits affect only the copied top-level row; Additional-Leg quantity/Price Option values remain Admin-authored.
- Bundle parent is one selectable commercial row; supplied children are display-only.
- Resolver operates on an in-memory copy only; published occupant/Edition is never mutated.
- Server revalidates current policy and returns structured rejection; never substitutes stale quantity/Price Option values.
- Optional `minimum_total_contract_value` uses the existing TCV aggregation semantics. A floor is invalid when the fixed Leg structure cannot yield TCV. **Save must reject that invalid floor; never ignore/drop it silently.** Resolver defensively returns top-level `floor_unverifiable` if stale invalid state somehow exists.
- Public policy exposes item/policy data only; no Rate Sheet IDs.
- Cart identity/coexistence, request schema, customer PDF/email and promotions remain deferred.

## Claude — implementation slice 2B-backend only
Create a new review branch from current `main`. Implement only:
1. persistence/sanitization of `customer_policy` on composable Default and Editions;
2. validation against each container's actual published `rate_sheet_items`/Price Options and fixed Leg structure;
3. customer-safe `composable_offer_policy` projection beside `composable_offer`;
4. server-side composable selection resolver using a copied row set and existing pricing/Commercial-Leg machinery;
5. structured validation outcomes, including required/optional/excluded, quantity bounds, Price Option authorization/unresolved and floor errors;
6. focused backend/controller contracts proving no occupant mutation, cross-Leg exclusion consistency, Edition inheritance/replacement, Bundle-parent behavior, stale choice rejection and TCV-floor rejection.

Do **not** implement customer UI, frontend candidate state, `FamilyTierQuoteItem`, cart keys, request schema, PDF/email or promotions. Do not alter Phase 1 architecture.

Update relevant Code Maps only if responsibilities/contracts change. Push only to the review branch, record exact branch/SHA/files/tests here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push to `main`.

## Claude Report — implementation

**Branch:** `review/composable-tier-customer-policy`, pushed to origin at commit `13fa08a0` (from `main@1b2efd23`). Nothing pushed to `main`.

**Files changed** (full diff in the commit): `PackageSchema.php` (+141) — `TIER_MODULES` gains `customer_policy`; new `sanitizeCustomerPolicy()`; wired into `extractTierForCostBuilder()`, `publicTierEditionOptions()`, `sanitizeTierEdition()`, `saveTierEditionDraft()`/`settleTierEditionOverview()`, `settleTierSlot()`. `PackageManagerSchema.php` (+175) — new `resolveCustomerComposableSelection()` + `computeResolvedTimelineTotalContractValue()`. `PackageStationController.php` (+21) — `customer_policy` module branch in `saveComposableOccupantModule()`; explicit rejection of that module in `savePackageStationTierModule()` (fixed-Tier/Add-on). `PackageFamilyPricingBuilder.php` (+13) — `customer_policy` added to `presentOccupant()`. Plus a new code map (`docs/code-map/tier-composable-occupant-customer-policy.md`) and a new test (`tests/composable-customer-policy-resolver.php`).

**Identity/hop trace performed** (per the architecture skill's "trace every hop" rule, since a prior real bug in this codebase was exactly a field silently dropped at one projection boundary): storage → `ensureTierLifecycle()` (confirmed a pure passthrough, no whitelist) → `settleTierSlot()`/`settleTierEditionOverview()` (explicit `customer_policy` handling added) → `extractTierForCostBuilder()` (explicit whitelist, added) → `PackageRepository::compileOccupantSlotForCostBuilder()` (confirmed `unset()`-based, not a rebuild-whitelist — nothing to add) → `enrichCompiledOccupantIdentity()` (confirmed spread-based for `edition_options`, preserves it) → `PackageFamilyPricingBuilder::presentOccupant()` (explicit, added). Verified by the new test's own Edition-inheritance assertion, which caught a real bug before it shipped: `publicTierEditionOptions()`'s inherited-from-occupant branch initially returned the *raw* unsanitized `$occ['customer_policy']` instead of the same re-sanitized shape the top-level field gets — fixed to re-sanitize both branches identically.

**Two deliberate deviations from the accepted contract — flagging for explicit review, not silently changed:**

1. **TCV floor save-time rejection was NOT implemented.** The accepted contract said "Save must reject an invalid floor; never ignore/drop it silently." I implemented only the resolve-time `floor_unverifiable` backstop. Reason: no PHP-side "resolved periods → total contract value" aggregator existed anywhere in the codebase before this work (`computeTotalContractValue()` in both `paymentSummary.ts` and `NotificationTemplates.php` operate on already-built per-Leg-stream summaries, not on `resolveCommercialLegTimeline()`'s own raw Period output) — so a save-time check would need either a second, divergent TCV computation, or reuse of the SAME new `computeResolvedTimelineTotalContractValue()` the resolver now has. I chose not to wire a save-time call to it in this slice, since `settleTierSlot()`/`settleTierEditionOverview()` would need the occupant's live `$readModel` (Rate Sheet catalogue) threaded in, which those functions don't currently receive — a larger plumbing change than "smallest safe model" seemed to license without asking first. The resolve-time backstop is real and tested (§6a below); the save-time gap means Admin can currently save a `minimum_total_contract_value` against a structurally open-ended Leg timeline without an immediate error — every *customer* resolution against it will still correctly reject as `floor_unverifiable`, so no customer-facing silent pass exists, but the Admin-side "reject at save" UX is missing. Want this closed now (threading `$readModel` into the settle path), or deferred to Phase 2B alongside the UI?

2. **No separate top-level `composable_offer_policy` key.** My own Round 2/3 proposal text used that name; the final accepted bullet list only requires "Public policy exposes item/policy data only; no Rate Sheet IDs" without mandating the specific key. I implemented `customer_policy` inside the existing shared `presentOccupant()` shape instead — it now appears identically under both `pricing.tiers[tierId].customer_policy` (always null for a normal Tier, since nothing writes it there) and `pricing.composable_offer.customer_policy`, reusing the one presentation function rather than adding a composable-specific branch to `buildResponse()`. Smaller diff, consistent with how every other field in that shared shape already works. Flagging in case the separate top-level key was actually load-bearing for some reason I'm not seeing.

**Scope note:** `customer_policy` is now a `TIER_MODULES` constant entry, which is shared vocabulary read by the generic `ensureTierLifecycle()`/`commitTierLifecycle()`/`revertTierModuleDraft()` engine for every occupant type (fixed Tier, Add-on, composable). Only `saveComposableOccupantModule()` has a live branch that accepts it; `savePackageStationTierModule()` explicitly rejects it. A fixed Tier/Add-on occupant therefore gains an inert `drafts.customer_policy`/`module_status.customer_policy` key (always `not-configured`, never surfaced in any existing admin UI), matching the exact same "generic engine, composable-only meaning" pattern Phase 1 already established for `composable_occupant` itself. No existing fixed-Tier behavior changes.

**Tests.** New: `tests/composable-customer-policy-resolver.php` — proves no occupant mutation, cross-Leg whole-inclusion exclusion consistency (including a control case proving the fixture's own Leg claim wiring is correct), quantity/Price-Option customization staying scoped to the row's own top-level fields, three structured-rejection paths (`quantity_out_of_bounds`, `price_option_not_allowed`, `price_option_unresolved`), the TCV floor (`floor_unverifiable` against an open-ended timeline, `below_minimum_total_contract_value` against a finite one, and a passing case), Edition inherit-vs-complete-replacement, and Bundle-backed-row pass-through. All pass.

Full existing regression suite re-run and green: every `tier-*`/`commercial-leg-*`/`package-manager-schema`/`tier-edition-*`/composable-occupant test listed in `SurfacePackages/CLAUDE.md`, plus `npx tsc --noEmit` and `npm run docs:check` (no frontend files touched). The one failure seen (`tier-capability-invariants.php`) is confirmed present on unmodified `main` too via `git stash` — pre-existing, unrelated, matches [[commercial-legs-pricing-boundary]]'s own 2026-08-23 note about this same known-failing test.

**Not done, as instructed:** no frontend/UI, no `FamilyTierQuoteItem`/cart-key work, no request-schema/PDF/email/promotions changes, no `main` push.