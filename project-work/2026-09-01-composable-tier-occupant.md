# Composable Tier occupant

## Status
- **AWAITING CHATGPT REVIEW — 2 of 3 blockers closed with real evidence; item 1 (admin UI) is deliberately still open.**
- Auditor verdict: **Proceed with safeguards — not yet accepted.**
- Base `main`: `7683a2f1b8d3b87819241f59d096e13a0786df28`.
- Review branch: `phase/composable-tier-occupant`, now at commit `3ab286a0a52e93fcd90b951868f6ac4167bd3338` (previous audited commit `5f610de4` is its direct parent — nothing rewritten, only added).
- **SOURCE PUSH NOT APPROVED.**

## Accepted architecture
Family keeps one assigned Tier System / `CZTG`. The Tier Instance owns one optional subordinate `composable_occupant` slot outside `tiers`; it contains one full Tier occupant using existing `CZT`, Rate Sheet, lifecycle, Editions and Commercial Legs. It is not a sixth peer slot, Add-on, second Tier Instance, or Family assignment and never controls parent Tier Group status.

## Audit of `5f610de4`
Actual diff is one commit from approved base, 10 files. Core foundation is directionally accepted:
- `TierInstanceSchema` stores one nullable slot outside `ALLOWED_TIERS`.
- CZT native identity remains `(tier_instance_id, occupant_id)`, so no new identity family is needed.
- dedicated archive/restore prevents swap/retarget into normal slots; composable bin origin is a sentinel, not an allowed Tier id.
- public projection is a sibling `composable_offer`, not merged into normal `tiers`.
- no `TierAssignmentSchema`, cart, quote, PDF/email or customer configurator changes.

### Blocking incompleteness
1. Phase 1A explicitly required an **admin launcher/manage surface**. None is wired. Typed APIs alone do not make the occupant administratively creatable/manageable.
2. The accepted foundation required reuse of the full occupant feature set including **Tier Editions**. The branch carries stored `tier_editions[]` but has no composable Edition CRUD/lifecycle routes, so the occupant is not feature-parity yet.
3. New controller routes have no direct request/controller contract execution; structural mirroring + `php -l` is insufficient evidence for mutation routing/response correctness before source approval.

## Claude — completion round
Continue on `phase/composable-tier-occupant`; do not broaden scope.

- Wire the smallest conforming Package Station admin entry/surface that creates and manages this one subordinate occupant using the existing Tier drawer/editor systems. Do not invent a second drawer/editor/footer/lifecycle system.
- Add composable-owned Tier Edition CRUD/lifecycle/bin addressing by reusing existing Edition engine behavior and identities; do not fork Edition semantics.
- Add focused controller/route contracts that actually invoke the new composable mutation paths under the existing test harness, covering at minimum first Save identity handoff, Publish/CZT, enable-disable, archive-restore, and one Edition lifecycle path.
- Preserve parent Tier Group status independence and all current non-scope boundaries.
- Run focused regression/type/build/docs validation. Do not push to `main`.

Push the completion commit(s) to the same review branch, report exact SHA/files/tests here, and set **AWAITING CHATGPT REVIEW**.

## Claude — completion round report

Commit `3ab286a0` on `phase/composable-tier-occupant` (parent: the already-audited `5f610de4` — nothing amended or force-pushed, only added on top). 7 files changed: `docs/code-map/tier-composable-occupant.md`, `dist/js/admin-station.js` (rebuild), `resources/ts/package-station/usePackageStation.ts`, `src/Modules/SurfacePackages/CLAUDE.md`, `src/Modules/SurfacePackages/Http/PackageStationController.php`, `src/Modules/SurfacePackages/Repositories/PackageRepository.php`, and new `tests/composable-occupant-controller-contract.php`.

### Blocker 2 — composable Tier Edition CRUD/lifecycle/bin: closed

New `SECTION: COMPOSABLE_OCCUPANT_EDITION` in the controller — 11 methods (`createComposableOccupantEdition`, module save/settle/revert, `updateComposableOccupantEditionStatus`, restore, guarded delete, move-to-bin/move-to-bin-command, edition-bin restore/trash/delete) — a line-for-line mirror of the existing `SECTION: TIER_EDITION`/`TIER_EDITION_BIN` methods, with a dedicated `composableEditionContext()`/`persistComposableEditionOccupant()` pair replacing `tierEditionContext()`/`persistTierEditionOccupant()`. Every one calls the *same* `PackageSchema` Edition functions (`addTierEdition`, `saveTierEditionDraft`, `settleTierEditionOverview`, `applyTierEditionStatus`, `moveTierEditionToBin`, etc.) — none forked, none touched. New routes under `.../composable/editions/...` and `.../composable/edition-bin/...`; zero existing Edition routes changed.

### Blocker 3 — real controller/route contract execution: closed, and it caught a real bug

`tests/composable-occupant-controller-contract.php` instantiates the *actual* `PackageStationController` against a *real* `PlatformIdentifierStation` (same proven pattern as `tests/tier-occupant-platform-identity.php`) and invokes it directly — no HTTP layer, but no mocking of the mutation logic either. It covers exactly what was asked: first-Save identity handoff (Pending occupant, no CZT), Publish minting a real, validly-formatted CZT and binding it to the correct `(tier_instance_id, occupant_id)` native reference, a repeat-Publish idempotency check, enable/disable, archive → restore isolation from the five normal `tiers` slots (byte-identical before/after), and one full composable Edition lifecycle (create → draft → settle → Publish minting a real CZTE bound to the composable occupant's own native reference, never the primary Tier's).

Running it immediately failed at the Publish step with `"Platform identifier binding requires reconciliation."` — `reserve()` and the station write both succeeded, but `bind()` threw. Root cause: `PackageRepository`'s `locateTierOccupant()`/`claimTierOccupantPlatformId()`/`tierOccupantPlatformIdExists()`/`tierOccupantAssignmentPage()` — and the equivalent four functions each for `tierLeg`, `tierEdition`, and `tierEditionLeg` (16 functions total) — only ever scanned `instance.tiers[*]` and `instance.occupant_bin[]` to resolve a native reference back to a stored record. A composable occupant's reference matched nothing there. This is exactly the class of bug the review correctly predicted structural mirroring + `php -l` couldn't catch. All 16 functions now also check `instance.composable_occupant.current_occupant` as a fourth occupant location. Full detail in `docs/code-map/tier-composable-occupant.md`'s Identity section.

Validation run after the fix: the new test passes; a 40+-test sweep across every tier/edition/identity/projection/migration test in the suite (`tier-instance-schema`, `tier-occupant-platform-identity`, `tier-leg-platform-identity`, `tier-edition-lifecycle`, `platform-identifier-temporary-migration`, `rate-sheet-platform-identity-reconciliation`, `tier-instance-delete-cascade`, `package-capability-peer-isolation`, `commercial-leg-*`, `tier-edition-*`, `rate-sheet-bundle`, etc.) all still pass unchanged; `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` all pass clean.

### Blocker 1 — admin launcher/manage surface: NOT closed, by deliberate choice

`usePackageStation.ts` now has the full data/mutation layer ready to consume: `composableView()` (extracted `buildTierViewFromSlot()` gives it the identical draft-preferred, live-priced, per-module-evaluated view `tierView()` gives any normal Tier occupant) plus `saveComposableOverview`/`saveComposablePricingRules`/`saveComposableFeatures`/`saveComposableFaqs`/`revertComposableModule`/`settleComposable`/`toggleComposableEnabled`.

No screen mounts any of it. I looked hard at doing this: `TierDrawerContent.tsx` (670 lines) and `useTierDrawerController.ts` (314 lines) are the locked four-group Tier drawer — tightly coupled to `useTierEditions`, footer split-menu state, focused-task-shell chrome suppression, and scroll-hide wiring. `package-station/CLAUDE.md`'s own history section documents multiple real defects in exactly this file that were caught only by live browser validation, not code review (a lifecycle Save that silently auto-settled; an Edition bin icon showing in the wrong state; a Remove-Bundle identity mismatch that made a confirmed action a silent no-op). I have no dev server or browser in this session — `tsc`/`build` catch type errors, not the interaction-state class of bug this file's own history says is the real risk here. Given the Edition-parity bug just found by *actually running* the backend, I judged that touching this specific file *without* an equivalent way to execute/verify it was more likely to introduce a defect than to safely deliver one, so I stopped short of it rather than guess.

Concretely still needed: a "Composable Occupant" card/section somewhere in the Tier drawer (Details group is the natural fit) with Create (first Overview save) → Edit (reusing `TierOverviewEditor`/`TierPricingRulesEditor`/etc., which are already generic `{draft, onChange}` components with no Tier-specific coupling) → Publish/Enable/Disable, wired to the hook methods above. Archive/restore UI and Edition UI are lower-priority follow-ons — their APIs exist but have no affordance either.

**My recommendation**: either (a) accept this as the honest stopping point for Phase 1A and open a Phase 1B scoped purely to the UI mount, ideally with live-validation access in the loop from the start, or (b) if you want me to proceed into `TierDrawerContent.tsx` anyway despite no interactive verification, say so explicitly and I will, with that risk acknowledged up front rather than discovered later.