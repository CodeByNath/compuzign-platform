# Composable Upgrade Platform Identification — CZTU / CZTEU

## Status
- **AWAITING CHATGPT REVIEW — dual-identity audit complete; no source changes made**
- Auditor verdict (prior round): **Proceed with safeguards**.
- Production remains `main@28f716b1bde85717787418e29efbbf8dce978d3c` (unchanged this round).

## Nath's correction — locked
“Keep both” does **not** mean an Upgrade belongs to a Tier occupant.

The Rate Sheet Bundle is the precedent:
- the Bundle participates in the normal Rate Sheet ecosystem/pipeline through a real Rate Sheet row with its normal Rate Sheet native identity and `CZPRCI`;
- the same commercial thing also carries Bundle identity (`bundle_id` + `CZPRCB`) declaring that it is a Bundle;
- Bundle identity does not replace the Rate Sheet identity, and the Bundle does not become a child of the row merely because both identities travel together.

Therefore the prior proposal to define Upgrade identity as an occupant-owned `upgrade_pairings[]` child keyed by a base occupant is **not accepted**. It conflated relationship/context with ownership.

## Correct audit question
Audit Upgrade as a dual-identity participant in the existing Tier/Edition commercial pipeline, analogous to Bundle inside Rate Sheet:
- preserve the existing Tier/Edition ecosystem identity and routing needed for the established Tier pipeline;
- add an Upgrade-specific stable native identity + `CZTU` / `CZTEU` to declare that this commercial entity is an Upgrade;
- neither identity replaces the other;
- do not make CZTU/CZTEU a child identity of the base occupant merely because a customer Upgrade is applied relative to a base plan;
- any base-plan association required by a quote is composition/transaction context and must not silently redefine catalog ownership.

## Claude next action — audit only
1. Map Bundle exactly: which stored record owns `bundle_id`/CZPRCB, which Rate Sheet row carries `item_id`/CZPRCI, and how the same Bundle traverses ordinary Rate Sheet projector/resolver/routes while retaining Bundle identity.
2. Map the current composable Upgrade candidate to the Tier/Edition equivalent: identify the existing Tier/Edition pipeline record and identities it already carries, and determine where a sibling Upgrade native ID + CZTU/CZTEU can live without changing that ownership.
3. Do **not** introduce `upgrade_pairings[]`, base-occupant-qualified native Upgrade IDs, or a new occupant-owned child model unless hard source evidence proves they are required.
4. Separate three things explicitly: (a) ecosystem identity/routing, (b) Upgrade type identity, (c) quote-time relationship to a selected base Tier/Edition.
5. Show how the customer quote/Request can carry all relevant identities together without flattening or substituting them.
6. Give the smallest implementation phase after this ownership audit. No implementation yet. Set **AWAITING CHATGPT REVIEW**.

---

# Corrected audit — dual-identity model

Re-audited via `skills/compuzign-platform-architecture` (Bundle worked example + `SurfacePackages/CLAUDE.md`). The prior `upgrade_pairings[]` proposal is withdrawn — confirmed wrong for exactly the stated reason: it made "which base occupant" part of the catalog record's own key, which is relationship, not ownership.

## 1. Bundle mapped exactly

Precise mechanics (`PackageStationController.php:1486-1516`, `SurfacePackages/CLAUDE.md`):
- A sheet's `bundles[]` is a **sibling authoring list next to `items[]`**, not a child of any row. Each entry is keyed by its **own** `bundle_id` (an internal id, minted write-path-only in `commitConfiguration`, "like a sheet id" — never derived from or referencing another row) and carries `CZPRCB` against native reference `(rate_sheet_id, bundle_id)` — self-contained, no external entity in the key.
- The Bundle's own backing row lives in the **same sheet's** ordinary `items[]`, linked by a plain `bundle_id` field the row itself carries — reconciled by `linkBundleRows()`, "never trusted from input." That row gets its `CZPRCI`/`CZPRCIO` through the exact same reservation loop every ordinary row uses (`PackageStationController.php:1452-1465`) — "no special-casing" (`CLAUDE.md`).
- `supplied_content[]` (what the Bundle composes) is the Bundle's **own** live references to other rows it draws from — `CZPRCBI` per reference — analogous to "ingredients," never to "what this Bundle relates to externally."
- Net shape: **two coexisting, self-contained identities on two linked-but-independent records within the same parent container** (`CZPRCI` on the row, `CZPRCB` on its own sibling authoring entry) — never one identity keyed by reference to some other, external thing.

## 2. Mapping to Upgrade

The composable occupant already IS the Tier/Edition-pipeline participant, minted through the exact same choreography every ordinary occupant/Edition gets:
- `settleComposableOccupant()` (`PackageStationController.php:2617`) already reserves/binds this occupant's own `CZT`/`CZTA`/`CZTL` — same reservation loop as `settlePackageStationTier()`, no special-casing.
- `updateComposableOccupantEditionStatus()` (`PackageStationController.php:3007`) already reserves/binds this occupant's own `CZTE`/`CZTEL` when one of its Editions activates — same choreography `updateTierEditionStatus()` uses for an ordinary occupant's Editions.

So the composable occupant's ecosystem identity/routing is **already fully Bundle-equivalent to an ordinary row**: nothing needs to change there. What's missing is purely the **type tag** — the Upgrade-specific "declare this participant is an Upgrade" identity — which, mirroring `CZPRCB`, must be a coexisting identity on this **same** record (or its own Edition record), never a reference to anything external.

## 3. Corrected shape — no `upgrade_pairings[]`, no base-occupant key

- **`CZTU`**: native reference `(tier_instance_id, occupant_id)` — **the identical native key `CZT` already uses for this same occupant**, just a different entity type/prefix. Self-contained, exactly mirroring `CZPRCB`'s `(rate_sheet_id, bundle_id)` (its own record's own key, never an external one).
- **`CZTEU`**: native reference `(tier_instance_id, occupant_id, editionId)` — the identical key `CZTE` already uses for this occupant's Edition.
- Minting is gated by an explicit admin declaration on the composable occupant's own settle payload — a new boolean, e.g. `is_upgrade_offer`, defaulting `false` — mirroring `bundle_id`'s own explicit-authoring precedent (a row only becomes a Bundle when an admin configures it as one; a composable occupant only becomes Upgrade-typed when an admin flags it as one). No new list, no new child record, no reference to any base occupant anywhere in either native reference.
- Minted inside the **existing** `settleComposableOccupant()` call (for `CZTU`, gated on `is_upgrade_offer`) and the **existing** `updateComposableOccupantEditionStatus()` call (for `CZTEU`, same gate, same `STATUS_ACTIVE` trigger `CZTE` already uses) — zero new settle boundary, because both calls already have every input this needs (`occupant_id`/`tier_instance_id`/`editionId` — never a base occupant).

## 4. The three things, separated

- **(a) Ecosystem identity/routing**: `CZT`/`CZTA`/`CZTL` (Tier-derived) or `CZTE`/`CZTEL` (Edition-derived) on the composable occupant — unchanged, already correct today.
- **(b) Upgrade type identity**: `CZTU`/`CZTEU` on that **same** occupant/Edition record (§3) — a coexisting declaration, never replacing (a), never keyed by anything outside itself.
- **(c) Quote-time relationship to a selected base Tier/Edition**: which specific base occupant/Edition a given customer already holds when they add this Upgrade — this is **never** catalog data. It is captured only on the quote item/Request record at Add-to-Quote time (new fields, e.g. `baseOccupantPlatformId`/`baseTierEditionPlatformId`, copied from the sibling primary item already in the customer's cart) — pure transaction context, exactly as the auditor specified. This is the one piece of the original audit that was already correctly scoped as quote-item-level, not catalog-level, and stands unchanged.

## 5. What the quote/Request carries — all four facts, none flattened

A composable/Upgrade quote line, once wired, carries:
1. Its own ecosystem identity — `tierOccupantId`/`tierPlatformId` (+ `tierEditionPlatformId` when Edition-derived) — **already correct today**, pointing at the composable occupant itself (the original audit's "critical gap" claim — that this was pointed at the "wrong" occupant — is withdrawn; per §4(a) this is exactly right, it is the Upgrade's own ecosystem identity, not a mistake).
2. Its own type identity — `upgradePlatformId` (`CZTU` or `CZTEU`) — new field, engine-minted only, copied read-only from the catalog record settled in §3.
3. The customer's base identity — `baseOccupantPlatformId` (+ `baseTierEditionPlatformId`) — new fields, transaction context per §4(c), never written back into the catalog.
4. Everything it composes — the existing `commercialBreakdown`/`cartBreakdown`/`legPaymentSummaries` snapshot machinery, untouched.

All four survive quote → Request via `RequestSchema.php`'s existing copy-only allow-list pattern (extended to include the two new field pairs), exactly as `CZT`/`CZTE` already do — no re-minting, no flattening one into another.

## 6. Platform Identifier wiring (corrected)

1. `PlatformIdentifierPolicy.php`: `TIER_UPGRADE`→`CZTU`, `TIER_EDITION_UPGRADE`→`CZTEU` (unchanged from every prior draft — collision-safe under the anchored-length regex, verified against `CZT`/`CZTA`/`CZTE`/`CZTG`/`CZTL`/`CZTEL`).
2. `PackagePlatformNativeReference.php`: reuse the **existing** `tierOccupant()`/`tierEdition()`-style composite helper with the new entity types — no new composite shape needed, since the native reference tuple is identical to `CZT`/`CZTE`'s own.
3. `PackageRepository.php`: new scalar fields on the composable occupant's own stored record (`upgrade_platform_id` alongside its existing `platform_id`; `upgrade_edition_platform_id` alongside `edition_platform_id` per Edition) with matching read/claim/exists/enumerate/project methods — mirroring `tierEditionPlatformId()`/`claimTierEditionPlatformId()`'s own scalar-field mechanics exactly (closer precedent now than the Leg-list mechanics the previous draft wrongly reached for, since there is no list here at all).
4. `PackagePlatformIdentifierAdapters.php`: `tierUpgrade()`/`tierEditionUpgrade()` factories, same shape as every existing factory.
5. `PackageStationController.php`: add the gated reserve/bind pair inside `settleComposableOccupant()` and `updateComposableOccupantEditionStatus()` (§3); extend `rejectPlatformIdMutation()`'s guarded field list.
6. `TemporaryMigrationController.php`: two new `ENTITY_TYPES` entries + `adapterFor()` arms + a progress-option version bump, unaffected by this correction.

No second identity engine, no custom backfill, no new child record — everything attaches directly to records that already exist and already mint identity today.

## 7. Compatibility

Unaffected: non-composable items untouched; every existing composable occupant has `is_upgrade_offer: false` today (new field, defaults false) so nothing mints until an admin explicitly opts in; the accepted upgrade-journey presentation reads none of these fields.

## 8. Smallest implementation phase

**Phase 1 — `CZTU` + `CZTEU` together, catalog side only, no quote-time consumption.** Because both mint inside settle boundaries that already exist and already have every input needed (§3), there is no reason to split Tier-derived from Edition-derived this time — both are the same size of change (one gated boolean + one reserve/bind pair, reusing an existing call). Add `is_upgrade_offer` + the wiring in §6 to `settleComposableOccupant()`/`updateComposableOccupantEditionStatus()`. Prove an admin can flag a composable occupant as an Upgrade offer and get a stable, reconciliation-safe `CZTU` (and `CZTEU` once an Edition activates), with zero change to any customer-facing surface. Tests: settle-boundary tests proving mint-once/reconcile-on-repeat/no-mint-when-flag-false, plus a `PlatformIdentifierPolicy` collision test for the two new prefixes.

**Phase 2 — quote-time consumption.** Wire §5: Add-to-Quote stamps `upgradePlatformId` (already-minted, read-only) plus the new `baseOccupantPlatformId`/`baseTierEditionPlatformId` transaction-context fields onto the composable quote item; `RequestSchema.php` copies all three through. Tests: extend `composable-quote-cart-contract.ts` proving these survive quote→Request, and proving an occupant with `is_upgrade_offer: false` still produces `upgradePlatformId: null` with no other behavior change.

No implementation performed in this round.
