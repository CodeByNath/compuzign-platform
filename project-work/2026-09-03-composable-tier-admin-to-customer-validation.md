# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — Phase 0 clean reset pushed, not merged to main**
- Auditor verdict (prior round): **Stop — architectural risk**
- Current production/source: `main@eaead45338f9cc464e56d4510fa798d8b4c558b3` (unchanged — nothing pushed to `main` this round)
- Phase 0 reset pushed to `review/upgrade-journey-finalisation@04b871e3` (reused topic branch; 4 commits on top of `main@eaead453`)
- User direction dated 2026-09-04 overrides the prior hybrid finalisation design.

## Architecture direction
There is **one active customer journey only: Upgrade your plan/build**.

Standalone **Build Your Own** is deferred. Disable it from the working route with a clear source TODO for the next phase. Upgrade must never fall through, relabel, or transition into Build Your Own.

The prior mistake was forcing Upgrade and standalone Build Your Own through one finalisation pipeline. Stop extending that hybrid design.

## Platform identity / occupant rule — mandatory
Claude must use the **CompuZign Platform skill** before implementing this identity work, because this extends the platform ecosystem.

The system already has Tier/Edition occupant identity and lifecycle pipelines. **Reuse those same pipelines. Do not create a parallel entity, allocator, persistence model, or resolver path.** Upgrade and future Custom/New Build are distinct occupant variants with their own Platform IDs and normal sortable ordering.

Tier occupant identity classes:
- Default Tier: `CZT...`
- Upgrade occupant: `CZTUXXXXX`
- Future Custom/New Build occupant: `CZTCXXXXX`

Edition occupant identity classes:
- Default Edition: `CZTE...`
- Upgrade occupant: `CZTEUXXXXX`
- Future Custom/New Build occupant: `CZTECXXXXX`

Rules:
- Existing occupant/native identity remains the foundation; add the new Platform-ID class through the established Platform Identifier/occupant pipeline.
- Upgrade derived from a Tier uses `CZTU`; Upgrade derived from an Edition uses `CZTEU`.
- `CZTC` / `CZTEC` are reserved for the later standalone Build Your Own phase and must not be minted or routed now.
- Upgrade/Custom occupants must participate in the same established occupant ordering/sort pipeline rather than introducing a special ordering system.
- Do not reuse the base `CZT` / `CZTE` Platform ID for an Upgrade result.

## Phase 0 — clean reset only
Before implementing the unified Upgrade route, surgically remove the recent machinery that exists only to convert Upgrade into Build Your Own or repair consequences of that conversion. Audit the series around `4e2188f2`, `528f7295`, `eaead453` and related reverted attempts; do not rewrite Git history or revert unrelated work.

Preserve working composable browsing, server-resolved pricing, selection/quantity, normal Tier/Edition base, add-ons, Rate Sheet ownership, Commercial Legs, occupant identity/lifecycle infrastructure, and unrelated UI fixes.

Remove hybrid-only assumptions such as Upgrade -> Build Your Own conversion, context fallback into `build_your_own`, composed peer machinery used solely for that conversion, post-finalise clobber guards, and presentation patches that only compensate for the hybrid result. Shared primitives stay unless proven hybrid-only.

## Phase 0 end state / Claude report
- Normal Tier/Edition + Upgrade selection still works up to pre-finalise state.
- No customer action enters Build Your Own; no Upgrade becomes Build Your Own.
- Build Your Own is explicitly disabled/commented for next phase.
- No `CZTC`/`CZTEC` minted yet; no new Upgrade finalisation implemented yet.
- Report exact removals/preservations, Platform-skill findings on the existing occupant/Platform-ID/sort pipeline, affected tests/contracts, source commit, and remaining coupling.
- Push only to the review branch and set **AWAITING CHATGPT REVIEW**. Do not push to `main` until audited.

## Claude's Phase 0 report (2026-09-04)

**Approach:** sequential `git revert` of the three hybrid commits (newest-first: `eaead453`, `528f7295`, `4e2188f2`), each applied cleanly with zero conflicts — confirming all three were hybrid-Finalise-scoped only, never touching unrelated code (verified against each commit's own `--stat` before reverting). No Git history rewritten; no unrelated commit touched (`aa820596`/`5112f5f5`/`8751a233`/`eb200731`/`ed10a250`/`f9035e82` — the scrollbar/reachability/retry fixes between `84ebbb28` and `4e2188f2` — are untouched, confirmed by clean reverts and unchanged files). Net: **-1,870/+125 lines across 19 files** vs `main@eaead453`; a 4th commit adds the one thing reverting couldn't (below).

**Removed (hybrid-only):** `finaliseUpgradeQuoteDraft()`, `deriveComposedProjection()`, `composableDraftIsStale()`, `hasUnfinalisedUpgradeDraft()`, `isFinaliseBuildReady()`/`composableChoicesMatch()`, `shouldAutoCommitComposableSelection()` (my own last-round guard), `upgradeDraftBase`/`composedBase`/`composedUpgrade`/`isComposedUpgrade` fields, the "Finalise build" button/action, RequestSchema.php's `sanitizeComposedBase()`/`sanitizeComposedUpgrade()`, NotificationTemplates.php's composed-item admin/customer rendering, the Base/Upgrades grouping presentation in `OrderSummary.tsx`/`QuoteSummary.tsx`/`QuoteProposalPreview.tsx`/`QuoteDetailsOverlay.tsx`, `LegPaymentSummary.provenance`/`ServiceInclusion.provenance`, and the two now-empty contract files (`upgrade-quote-draft-contract.ts`, `composable-finalise-race-contract.ts`) plus their two PHP tests. Confirmed via full-tree grep: zero remaining references to any of the removed symbols.

**Preserved (verified present, unchanged):** composable browsing/server-resolved preview (`ComposableOfferBrowser.tsx`'s `buildComposableChoice`/`resolveItemContributions`/`buildComposableFamilyTierQuoteItem`/debounced commit effect), selection/quantity state, normal Tier/Edition primary selection, add-ons (upsert/remove, primary-removal cascade), Rate Sheet ownership, Commercial Legs resolution, occupant identity/lifecycle infra (untouched — this feature never touched it), and every unrelated fix from the intervening commits.

**Additional change (4th commit, `04b871e3`):** the standalone `build_your_own` entry point (composable browsing with no primary selected) predates the hybrid feature and survived the reverts untouched — reverting couldn't remove it since it isn't hybrid-only. `FamilyTierAdapter.tsx` now renders `ComposableOfferBrowser` only when `selectedTierId !== null` (always `context="upgrade_your_build"`), with a TODO comment for re-enabling standalone Build Your Own later. `ComposableOfferBrowser.tsx`'s own `'build_your_own'` branch is left in place, unused.

**Platform-skill findings (identity/occupant/sort pipeline) — no minting done, investigation only:**
- Identity infra: `PlatformIdentifierStation.php` + `PlatformIdentifierPolicy.php` mint/validate/reserve/bind — domain-agnostic engine, never branches on domain storage. Extending it = one `const` + one `PlatformIdentifierPolicy::PREFIXES` entry, plus the domain's own adapter (five callbacks: enumerate/read/claim/exists/project) via the existing `PackagePlatformIdentifierAdapters.php` factory pattern — never a new engine/controller.
- `CZT`/`CZTE` reference shape is already `(tier_instance_id, occupant_id)` / `(tier_instance_id, occupant_id, editionId)` — `occupant_id` is already the flexible unit the composable occupant reuses today, so `CZTU`/`CZTEU`/`CZTC`/`CZTEC` fit this exact shape as new occupant_id values under the same tier_instance, not a parallel structure.
- Minting happens only at a settle/mutation boundary (e.g. `reserveTierLegPlatformIds()` inside `settlePackageStationTier()`, `src/Modules/SurfacePackages/Support/PackageSchema.php`), never on a read path — the same rule a Phase 1 Upgrade-occupant mint must follow.
- **Open question for Phase 1, not resolved here:** no existing "occupant sort/ordering pipeline" was located by name (searched `PackageSchema.php`/`PackageStationController.php`/`PackageRepository.php` under `src/Modules/SurfacePackages/`). Today's five Tier slots (`basic`/`standard`/`premium`/`enterprise`/`custom`, per `QuoteDetailsOverlay.tsx`'s own comment "`family.pricing.tiers` only ever holds the five fixed slots") are fixed-slot, not a generic sortable list. "Upgrade/Custom occupants must participate in the same established occupant ordering/sort pipeline" may need that pipeline to be identified more precisely, or designed fresh, before Phase 1 implementation — flagging rather than guessing.

**Tests:** `tsc --noEmit`, `npm run build`, `npm run docs:check` all pass. Remaining PHP tests (`request-schema-is-addon`, `request-schema-minimum-term`, `request-schema-family-quote-snapshot`, `request-schema-legacy-snapshot-description`, `request-durable-submission`, `package-family-notification`, `notification-templates-family-quote-parity`, `quote-view-access-boundary`, `quote-view-entrypoint`) and JS contracts (`quote-view`, `quote-view-print-portal`, `quote-view-legacy-description`, `quote-cart-addon`, `tier-addon-flow`, `tier-edition-switch`, `request-flow-family-tier-parity`, `request-flow-rail-scroll`, `quote-sidebar-scroll`, `composable-quote-cart`) all pass unchanged.

**Remaining coupling:** none identified beyond the sort-pipeline open question above. `composableCoexistsWithPrimary()`/"Upgrades" vs "Build Your Own" label in `QuoteSummary.tsx`/`OrderSummary.tsx` predates the hybrid feature and is untouched — still governs display when an Upgrade coexists with its primary, which is now the only reachable case. `removeFamilyTierSystemQuoteItems()` still lets a composable line survive its primary's removal (pre-existing, pre-hybrid behavior, designed for standalone Build Your Own) — since that entry point is now gated off, an existing Upgrade item could still end up "orphaned" (no primary, survives) if a customer removes the primary after committing an Upgrade; this is unchanged legacy behavior, not something this round was asked to alter, flagging for the auditor to decide if Phase 1 should address it.

**Branch:** `review/upgrade-journey-finalisation@04b871e3` (base `main@eaead453`). Not merged to `main`.