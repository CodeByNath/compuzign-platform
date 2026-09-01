# Composable Tier occupant

## Status
- **AWAITING CHATGPT REVIEW — Phase 1A pushed to a review branch, not `main`.**
- Auditor verdict: **Proceed with safeguards**.
- Base `main`: `7683a2f1b8d3b87819241f59d096e13a0786df28`.
- Review branch: `phase/composable-tier-occupant`, commit `5f610de4e7802e8ed022cb6381f1273b292618dc`, pushed to `origin/phase/composable-tier-occupant` (branches cleanly off the base SHA above).

## Accepted architecture
A Family keeps exactly one assigned Tier System / `CZTG`.

```text
Family
└─ assigned Tier System
   ├─ existing five-slot normal/Add-on occupants
   └─ subordinate composable child
      └─ exactly one full Tier occupant
```

The composable child is **not** a sixth peer slot, second Tier Instance, second Family assignment, or Add-on. It never competes with/replaces/controls the normal Tier choices.

Persist it as one optional sibling container on the existing Tier Instance, outside `tiers` (working name `composable_occupant`). The stored value must reuse the existing slot/occupant lifecycle shape (`current_occupant` + history), not invent a reduced occupant record.

The child container needs no Platform ID. Its occupant uses normal `CZT`; Editions/Legs retain `CZTE`/`CZTL`/`CZTEL`. Independent audit confirms Tier occupant native identity is `(tier_instance_id, occupant_id)`, explicitly not slot-qualified, so this reuse is valid.

Keep Tier Group status derivation based on the existing `tiers` collection. The subordinate composable occupant must not make its parent Tier System Active or otherwise become superior to it.

Public Family projection should expose this occupant separately from `tiers` (working key `composable_offer`) through the same Rate-Sheet-backed compiler and stripping rules.

## Phase 1A scope
Implement only the persisted/lifecycle/admin/projection foundation:
- optional subordinate slot on `TierInstanceSchema`, default absent/null;
- exact-one cardinality by shape (single slot, never array);
- dedicated addressing into that slot while reusing existing occupant Save/Publish/Disable/Enable/Edition/Leg/Rate-Sheet machinery;
- archive/restore/bin support, including a composable origin sentinel without adding it to `ALLOWED_TIERS`;
- admin launcher/surface sufficient to create and manage that one occupant;
- public projection as a separate sibling from normal `tiers`;
- focused backend/frontend contracts and affected Code Maps.

## Safeguards / non-scope
- Do not touch `TierAssignmentSchema` or create a second `CZTG`.
- Do not add `composable` to `ALLOWED_TIERS`.
- `is_addon` semantics remain untouched.
- Do not implement customer inclusion selection, quantity rules, Price Option choice, configurator UI, cart key changes, quote snapshot additions, PDF/email changes, or promotions yet.
- Existing Families with no composable child must remain behaviorally unchanged; no migration/backfill.

Commit/push Phase 1A to a review branch, report exact SHA, files and focused tests in this file, then set **AWAITING CHATGPT REVIEW**. Do not push to `main`.

## Claude — Phase 1A report

### What's implemented and locally verified

**Backend (PHP), fully implemented and exercised by tests:**
- `TierInstanceSchema::sanitizeInstance()` — new `composable_occupant` field, defaults `null`, never a member of `ALLOWED_TIERS`, sanitized through the same `PackageSchema::ensureTierLifecycle()` shape a normal slot gets.
- `PackageSchema` — `COMPOSABLE_OCCUPANT_ORIGIN` bin-origin sentinel accepted by `ensureOccupantBin()`'s whitelist alongside (never joining) `ALLOWED_TIERS`; dedicated `archiveComposableOccupant()`/`restoreComposableOccupant()` — deliberately NOT the existing `archiveTierOccupant()`/`restoreBinnedOccupant()` widened, because those support swap/retarget across the five peer slots, which must never apply here (an occupied composable slot blocks restore with `target_occupied`, offering no swap). `trashBinnedOccupant()`/`deleteBinnedOccupant()` are reused completely unchanged — they were already generic over any `occupant_bin` entry by `bin_id`, never `origin_tier`.
- `PackageStationController` — a dedicated, additive `.../tier-instances/{instance}/composable/...` route family (module save, revert, enable/disable, settle, archive, restore) calling the *exact same* `PackageSchema` module/lifecycle functions the `tiers/{tier}/...` routes call, just addressed at `composable_occupant`. **Zero existing routes or methods were touched** — every one of the 26 pre-existing `tiers[tierId]` call sites in this file is untouched, byte-identical to `main`. Settle mirrors `settlePackageStationTier`'s CZT/CZTL identity-reservation choreography exactly, minus the `is_addon`/CZTA branch (this occupant is never an Add-on). The admin read (`getPackageStation`) and repository per-tier compile loops were each extracted into a shared private method (`compileAdminOccupantDetail()`, `compileOccupantSlotForCostBuilder()`) so the composable occupant reads/prices through the identical code path a normal Tier does, not a parallel one.
- `PackageRepository` — `composable_offer` sibling key (never merged into `tiers`) in both `projectTierInstanceForCostBuilder()` and `findAllActiveFamiliesForCostBuilder()`.
- `PackageFamilyPricingBuilder` — **a real gap found and fixed during implementation**: this class explicitly whitelists only `pricing.tiers` from the repository's family row; without touching it, `composable_offer` would have reached `PackageRepository` correctly but silently never reached the public customer response at all. Extracted `presentOccupant()` so both `tiers` entries and `composable_offer` share one presentation transform.
- New `tests/tier-composable-occupant.php` — schema shape/cardinality, bin sentinel, archive/restore no-swap-or-retarget semantics (via `ReflectionMethod` proving the restore signature carries no `mode`/`target_tier` parameter at all, not just a runtime guard), and public-projection sibling-key behavior exercised through a real `PackageRepository` + `PackageFamilyPricingBuilder` fixture (same WP-function-mock harness pattern as `tests/tier-instance-public-projection.php`) — proving `composable_offer` is absent when unconfigured, present and separately keyed when configured, dropped when not yet identified (no minted `CZT`), and resolves price/`commercial_legs` through the identical compiler as a normal Tier given identical `rate_sheet_id`/`rate_sheet_items`.
- Full regression sweep run locally and passing unchanged: `tier-instance-schema`, `tier-occupant-compatibility`, `tier-group-composition`, `tier-instance-public-projection`, `tier-pricing-parity`, `tier-public-projection-is-addon`, `tier-edition-public-projection`, `package-manager-schema`, `tier-instance-mutations`, `tier-instance-guards`, `active-package-contract`, `tier-occupant-platform-identity`, `tier-instance-update`, `package-family-notification`. (`tier-capability-invariants.php` fails identically on unmodified `main` — confirmed via `git stash` — pre-existing, unrelated to this change.)

**Frontend (TypeScript), type-checked and built:**
- `types.ts` — `composable_occupant` on `ServicePackageStationData`; new `ComposableOccupantLifecycleResponse`/`ComposableOccupantArchiveResponse`/`ComposableOccupantRestoreResponse`.
- `api.ts` — six typed calls (`saveComposableOccupantModule`, `revertComposableOccupantModule`, `setComposableOccupantEnabled`, `settleComposableOccupant`, `archiveComposableOccupant`, `restoreComposableOccupant`), mirroring the existing per-tier call patterns exactly (including `stripLegSelfIdentity`).
- `npx tsc --noEmit` and `npm run build` both pass clean; `npm run docs:check` passes (111 files, 40 Code Maps).

**Documentation:** new `docs/code-map/tier-composable-occupant.md`, linked from `docs/code-map/000-README.md`. (Not linked from `tiers.md`'s own body/footer — that file is already at Code Maps' 600-word ceiling; adding even one link line pushed it over, so I left `tiers.md` byte-identical to `main` rather than trim its existing prose for this addition. `tier-composable-occupant.md` links back to `tiers.md`, so discoverability is one-directional but present.)

### What is explicitly NOT done, and why

- **Admin drawer/launcher UI.** The Phase 1A list asks for a "launcher/surface sufficient to create and manage that one occupant." I did not build one. `package-station/CLAUDE.md`'s own description of the locked Station/Drawer Lifecycle Contract (chrome suppression, controlled-prop focused-task shells, the dual-split footer grammar, draft-preferred projection rules) makes this a genuinely stateful, interaction-heavy surface that I cannot responsibly build correctly without running the dev server and verifying it in a browser — which this environment cannot do. Building it blind risked violating that locked contract in ways `npx tsc`/`npm run build` cannot catch. The typed API surface above (`api.ts`/`types.ts`) is deliberately the hand-off point for that follow-up round.
- **Tier Edition CRUD for the composable occupant.** `tier_editions[]` rides inside `current_occupant` regardless of container, so nothing prevents it structurally, but no dedicated `.../composable/editions/...` routes exist yet — only Overview/Pricing Rules/Features/FAQs/settle/enable-disable/archive/restore.
- **Everything the doc's own Safeguards section already excludes** (customer selection, cart key, quote snapshot, PDF/email, promotions) — untouched, confirmed by the diff touching no `quote.ts`, `RequestSchema.php`, or Cost-Builder customer components.
- **Runtime/WP-REST verification of the controller.** No local WordPress environment exists in this session, so the new REST routes/methods are verified only by `php -l` syntax checking and structural mirroring of already-tested sibling methods — never actually invoked. This is the review branch's job to close before any `main` push.

### Files changed (10)
`docs/code-map/000-README.md`, `docs/code-map/tier-composable-occupant.md` (new), `wp-content/plugins/compuzign-platform/resources/ts/package-station/{api,types}.ts`, `wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Services/PackageFamilyPricingBuilder.php`, `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php`, `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php`, `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/{PackageSchema,TierInstanceSchema}.php`, `wp-content/plugins/compuzign-platform/tests/tier-composable-occupant.php` (new).