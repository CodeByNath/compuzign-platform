# Tier Capability — Repository Audit and Phased Implementation Blueprint

**Status:** Audit + plan only. Nothing implemented, edited, or committed.
**Audit date:** 2026-07-25
**Tree:** `main` @ `0ffe12f`, working tree clean at audit start.
**Method:** AGENTS.md read order — `AGENTS.md` → `docs/ai-index.md` → Code Maps (tiers, package-station, package-manager, rate-sheet, cost-builder, lifecycle-system, station-manager, admin-station) → Project History 003/011/012 → architecture (`platform-architecture-standards-v1.md`, `CommercialModel-v1.md`, `TierModuleL5MigrationSpec-v1.md`) → authoritative source.

Every claim in **Part 1** is verified from source with a path and symbol. Everything in **Parts 2–8** is recommendation.

---

# PART 1 — VERIFIED CURRENT REPO REALITY

## 1.1 Storage: one option, one global Tier set

`PackageRepository::OPTION_KEY = 'cz_package_station'`
— `src/Modules/SurfacePackages/Repositories/PackageRepository.php` line 42

The entire Package domain lives in one WordPress option, request-cached in `$stationCache` (`PackageRepository.php:49`). Shape from `PackageRepository::defaultStation()` (`:151`):

```php
[
  'platform_status'        => 'disabled',
  'tiers'                  => [],       // ← GLOBAL slot map. Five slots, station-wide.
  'popular_tier'           => null,     // ← GLOBAL
  'popular_label'          => '',       // ← GLOBAL
  'sort_position'          => 0,
  'bundle'                 => [...],
  'occupant_bin'           => [],       // ← GLOBAL
  'promotions'             => [],
  'package_manager'        => PackageManagerSchema::defaultManager(),
  'legacy_host_service_id' => 0,
]
```

**Verified fact:** there is exactly one Tier set for the entire platform. There is no per-Family, per-Service, or per-consumer Tier storage anywhere in the repository. A grep for `tier_instance`, `consumer_type`, `consumer_id` across `src/`, `resources/ts/`, `tests/`, `scripts/` returns zero hits.

### Slot shape

`PackageSchema::ALLOWED_TIERS = ['basic','standard','premium','enterprise','ultimate']`
— `src/Modules/SurfacePackages/Support/PackageSchema.php:37`

Each `station['tiers'][$slotId]` carries:

| Key | Owner symbol | Notes |
| --- | --- | --- |
| `current_occupant` | `PackageSchema::upsertOccupant` (`:1190`) | The settled record. `null` = empty shell. |
| `history` | `upsertOccupant` (`:1197`, `:1231`) | Carried forward verbatim. **Never appended to by any write path** — verified: the only `'history'` sites are `PackageSchema.php:1197/1231/1569/1579-80` and `PackageStationController.php:539`, all pass-through or default-`[]`. Structurally present, empirically always `[]`. |
| `drafts` | `PackageSchema::emptyTierLifecycle` (`:1292`), `ensureTierLifecycle` (`:1310`) | `{overview, features, faqs}`, `null` = no draft. |
| `module_status` | same | `not-configured` / `pending` / `settled`. |

`PackageSchema::TIER_MODULES = ['overview','features','faqs']` — `:45`.

### Occupant identity — `occ_…`

Minted once in `PackageSchema::upsertOccupant`:

```php
'id' => $existingId ?? ('occ_' . bin2hex(random_bytes(4))),   // PackageSchema.php:1218
```

`$existingId` is read from `$tierSlot['current_occupant']['id']` (`:1198`), so the id survives every edit, every settle, and every sheet switch. Proven by `tests/tier-occupant-compatibility.php:70`.

Exposed to the client as `SurfaceTierDetail.occupant_id` by `PackageSchema::normaliseTierSlot` (`:1071`). An empty shell exposes `occupant_id: null` (`emptyTierDetail`, `:1273`) and is therefore **omitted from every card wall** by `deriveTierOccupants` (`resources/ts/package-station/tierOccupants.ts:14-20`).

**Slot id vs occupant id — the distinction is real and currently correct:**

- `slotId` (`'basic'`…) is the mutation/storage address. Every REST route is `.../tiers/(?P<tier>[a-z]+)`, validated against `ALLOWED_TIERS` (`PackageStationController.php:89,99,112,188`).
- `occupant_id` is the surface/drawer identity. `TierDrawerHost` passes `recordId` straight through as `initialOccupantId` without parsing (`surface/tierSurface/TierDrawerHost.tsx:59`), and `useTierDrawerController` re-resolves the slot after load via `pkg.resolveOccupantSlot` (`drawer/tier/useTierDrawerController.ts:69-73` → `tierOccupants.ts:22`).

### Occupant bin

`station['occupant_bin'][]`, normalised by `PackageSchema::ensureOccupantBin` (`:1360`). Entry shape:
`{bin_id ('bin_'+8hex, generateBinId :1344), origin_tier, occupant, status: archived|trashed, previous_enabled, displaced_at}`.

Lifecycle ops, all pure, controller persists:
`archiveTierOccupant` (`:1405`), `restoreBinnedOccupant` (`:1501`, modes `swap`/`retarget`, single atomic write), `trashBinnedOccupant` (`:1599`), `deleteBinnedOccupant` (`:1624`). Legality delegated to `Modules\Admin\Support\StationLifecycle`.

### Popular Tier

Station-level `popular_tier` + `popular_label`. Written by `PackageStationController::setPackageStationPopular` (`:975`) and as a side effect of `savePackageStationTier` (`:545-552`). The value is a **slot id**, validated against `ALLOWED_TIERS` (`:994`).

### Lifecycle / module state

Per-slot `drafts` + `module_status`. Save path `savePackageStationTierModule` (`:613`), revert `revertPackageStationTierModule` (`:896` → `PackageSchema::revertTierModuleDraft` `:1651`), settle `settlePackageStationTier` (`:939` → `PackageSchema::settleTierSlot` `:1687`).

**Station status is derived globally:** `PackageSchema::deriveStationStatus` (`:1250`) returns `'active'` if **any** slot has a live active occupant. One consumer's live Tier therefore makes the whole station active for every other consumer.

### Public projections

Two read paths, both projecting the single global Tier map:

1. `PackageRepository::findAllActiveIndexedByServiceId()` (`:360`) — builds `$flatTiers` from `station['tiers']` (`:391-413`), then:
   ```php
   foreach ($coveredServiceIds as $coveredServiceId) {
       $map[$coveredServiceId] = $station;      // PackageRepository.php:423-425
   }
   ```
   **Every covered Service receives the identical global Tier set.** Consumed by `PricingBuilder::buildResponse` (`src/Modules/CostBuilder/Services/PricingBuilder.php:67`) and applied per slot by `overlayPackage` (`:299`).
2. `PackageStationReadController::list()` (`:36`) — one synthetic `"Package Station"` row carrying the same global tier summaries.

---

## 1.2 Duplicate and parallel Tier schema authority (must be resolved before migration)

**Three separate five-slot vocabularies exist in PHP:**

| Location | Symbol | Status |
| --- | --- | --- |
| `SurfacePackages/Support/PackageSchema.php:37` | `ALLOWED_TIERS` | **Live authority** for the Package Station option. |
| `SurfacePackages/Support/PackageSchema.php:60-69` | `registerPostMeta()` → `cz_package` meta on `cz_surface_package`, with `sanitize()` (`:78`) → `sanitizeTiers()` (`:170`) and `defaultPackage()` (`:106`) | **Live registration of a dead parallel schema.** `SurfacePackagesModule::register()` line 25 calls it every boot. It produces a *second, differently-shaped* five-slot map (`label/price/contact/billing_cycle/inclusions_override/features/faq_refs/enabled` — no occupant envelope, no drafts, no `rate_sheet_id`) plus its own `popular_tier`, `bundle`, `service_refs`. `SurfacePackagesModule.php:18-19` states nothing writes to it; `PackageStationReadController.php:13` confirms no `cz_surface_package` posts are read. The post type is still registered (`src/Core/PostTypeRegistrar.php:14`). |
| `CostBuilder/Support/MetaSchema.php:7` | `ALLOWED_TIERS` | Legacy Service-side XLSX pricing (`cz_service_pricing`). **Not Package-owned** — out of scope, do not touch. |

`PackageStationSchema` is **not** an aggregate authority — verified, it holds only `sanitizeSourceRelationships` (`:44`) and `evaluateTierPricing` (`:91`). Its former divergent aggregate was already retired (`docs/code-map/package-manager.md`).

**Frontend vocabulary:** `resources/ts/package-station/vocabulary.ts:3-7` (`TIER_KEYS`, `TIER_LABELS`) — Package-owned, correct location, single copy.

**Promotion coupling:** `PackageSchema::ALLOWED_BASED_ON` (`:40`) repeats the same five names for promotion `based_on` (`:438-455`, `:687-693`). Promotions are a **station-level** collection (`station['promotions']`, `PackageRepository::loadPromotions` `:88`) and are consumed by `PricingBuilder` via `$package['promotion_tiers']` (`PackageRepository.php:418`). They are not per-instance and must be explicitly scoped out.

---

## 1.3 Family Group relationship — provenance filter, not ownership

**Family storage:** `package_manager.category_groups[]`, owned by `Support/PackageCategoryGroups.php`. Ids `pcg_…` (`:108`). Full `StationLifecycle` participation with overview draft/settle/revert.

**Family → Service** is recorded on the *source relationship*, never on the Service:
`package_manager.sources[].category_group_id` — `PackageManagerSchema::sanitize` (`:107-113`) reassigns unknown ids to `null` rather than dropping. Projected by `PackageCategoryGroups::relatedServiceIds` (`:309`), exposed as `related_service_ids` by `PackageFamiliesController::listGroups` (`:148`).

**Family → Tier is computed, never stored.** `PackageCategoryGroups::dependents` (`:339`) walks:

```
Family → sources[].category_group_id → entity_id (Service)
      → readModelItems[].source_service_id → item_id
      → rate_sheets[].items[].source_item_id → (sheet_id, item_id)
      → tiers[*].rate_sheet_items[].item_id      (countTierSelections :399)
```

`countTierSelections` (`:399`) recurses the whole slot (occupant *and* drafts), scoping each `rate_sheet_items` group by its sibling `rate_sheet_id`, defaulting to `PRIMARY_RATE_SHEET_ID` for legacy (`:413-416`).

**Frontend mirrors the same chain as a filter:**
`surface/packageTierWorkspace/projection.ts` — `buildRateItemServiceMap` (`:85`), `occupantSupplyingServiceIds` (`:112`), `projectFamilyTierWorkspace` (`:131`). Its own header comment (lines 9–22) states the design explicitly: *"This is a FILTER over the single, shared Package Station tier set — never per-Family ownership."*

Assembled in `usePackageTierWorkspace.ts:70-101`; consumed by `presentation/package-tier-workspace/PackageTierWorkspace.tsx:80-95`, which re-derives the selected Family and Tier from the current items each render.

**Why selection provenance is not ownership — verified consequences:**

1. `scripts/package-tier-workspace-contract.ts:88-92` asserts a shared occupant **must** appear under two Families simultaneously. The contract currently *enforces* the obsolete model.
2. Because the tier set is global and slot-keyed, two Families cannot both own a `basic`. Saving `basic` while KAIROS is focused rewrites the identical slot APTOS is viewing (`PackageStationController::savePackageStationTierModule` `:669-671`, addressed only by `$tierId`).
3. An occupant with zero resolved selections has `supplyingServiceIds: []` and therefore projects under **no** Family — it becomes invisible in the workspace despite existing and being live in the public projection.
4. The Family filter depends on Rate Sheet row provenance, so re-pointing a Rate Sheet row silently re-parents Tier visibility.

**Deletion guards (Family):** `PackageCategoryGroups::delete` (`:261`) requires `StationLifecycle::canDelete` (trashed only) **and** `array_sum($dependents) === 0`. `PackageFamiliesController::permanentDeleteGroup` (`:238`) returns HTTP 409 with `{message, assigned_count, dependents}`.

---

## 1.4 Rate Sheet relationship

**Collection:** `package_manager.rate_sheets[]` — `PackageManagerSchema::sanitizeRateSheets` (`:156`). Each sheet `{rate_sheet_id, title, status: active|archived, groups[], items[]}`.

- Read-time migration lifts the legacy singleton `rate_sheet` to `PRIMARY_RATE_SHEET_ID = 'rs_primary'` (`:78`, `:180-191`). **This is the only read-time id assignment in the codebase** and is the precedent Phase 2 must follow.
- Write-path mint only: `mintRateSheetId()` (`:212`), called from `commitConfiguration` (`:582`).
- Row identity: `deriveRateItemId($sourceItemId)` (`:206`) = `'rate_' + sha256[0:16]`. **Identical row ids recur across sheets by design** — which is exactly why `(rate_sheet_id, item_id)` is the only valid lookup.
- Selection: `findRateSheet` (`:224`) returns `null` for null/empty/unknown id and **never scans other sheets**.
- Resolution: `projectTierRateSheet(..., ?string $rateSheetId)` (`:976`) resolves strictly inside the named sheet (`:989-994`).

**Tier ↔ Sheet binding:** occupant field `rate_sheet_id`. Clear-on-switch enforced twice:
- `PackageSchema::upsertOccupant` (`:1208-1214`)
- `PackageSchema::settleTierSlot` (`:1713-1721`)
First configuration keeps incoming selections; a switch drops them. Proven by `tests/tier-occupant-compatibility.php:55-76`.

**Legacy default:** `PackageSchema::defaultRateSheetId` (`:1112`) — an occupant with selections but no id resolves to `rs_primary`.

**Allowed-sheet selection (current, UI-level only):** `drawer/tier/TierDrawerContent.tsx:224-227` offers active sheets plus the currently-bound one even if archived. **There is no backend allow-list** — any sheet id the client sends is accepted by `savePackageStationTierModule` (`:654-656`, plain `sanitize_text_field`).

**Existing delete guard:** `PackageStationController::rateSheetIdsReferencedByTiers` (`:438`), enforced at `:382-392` returning `code: 'rate_sheet_in_use'`.

**Verified gaps in that guard:**

| Gap | Evidence |
| --- | --- |
| Bin entries are not scanned | `:442` iterates `$station['tiers']` only; `occupant_bin[].occupant.rate_sheet_id` is never read. Restoring a binned occupant after its sheet was deleted yields a dangling binding. |
| Slot `history` is not scanned | Same loop. (Low impact today — history is always empty — but the guard is structurally incomplete.) |
| A bound-but-empty occupant is unprotected | `:446-448` requires `$hasSelections`; an occupant bound to a sheet with no rows selected does not mark the sheet referenced. |
| Archived sheets | Archiving is a status change only; nothing prevents a Tier from staying bound to an archived sheet (the drawer even keeps offering it, `TierDrawerContent.tsx:226`). |

---

## 1.5 Package Station boundaries

**Package Station owns** (`docs/code-map/package-station.md`, verified against source): Package Families, Rate Sheets, Sources, Relationships, Tiers, grouping, quantity, pricing, contracts, endpoints, hooks, surfaces, presentation, drawers, editors, schema, validation, saves, persistence.

**Station Manager registers only** (`resources/ts/package-station/register.ts`):
- nav `packages`, destination `packages/catalog`
- data sources `package-families`, `service-tiers`, `package-tier-workspace`
- template kit `tier-workspace`
- drawer templates `package-family`, `tier`, `rate-sheet`

`register.ts` is entry-only, imported solely by `resources/ts/modules/admin-station.ts`, never re-exported from `index.ts`.
`service-tiers` is registered but bound by no surface — verified against `admin-station/register.ts`.

**Admin Station only hosts.** All placement is Admin-authored string-key policy — `resources/ts/admin-station/register.ts:88-106`:

```ts
{ stationId: 'packages', surfaceId: 'tier-tool', placement: 'presentation', order: 0,
  title: 'Tier Workspace Engine',
  dataSourceKey: 'package-tier-workspace', templateKitKey: 'tier-workspace',
  drawerTemplateKey: 'tier',
  actionIntents: [ view→drawer, edit→drawer, 'rate-sheet'→drawer(rate-sheet) ] }
```

**Domain-private (must stay inside Package Station):** occupant lifecycle, slot vocabulary, bin travel, draft/settle, Rate Sheet binding and clear-on-switch, pricing derivation, and — after this work — the Tier Instance envelope and the consumer contract.

**Route addressing quirk (important):** every Package Station route is `/compuzign/v1/admin/services/(?P<id>\d+)/package-station/...`. The Service id is **navigation context only** — the handlers load the single global option regardless (`PackageStationController.php:211`, `:317`, `:470`, …). The client picks that id heuristically in `surface/tierSurface/useHostService.ts:30-34`: first surface package's first `service_refs[0]`, else the first catalogue row.

---

## 1.6 Public pricing and Cost Builder

```
PricingBuilder::buildResponse            (PricingBuilder.php:67)
  → PackageRepository::findAllActiveIndexedByServiceId  (:360)
      → global station['tiers'] → PackageSchema::extractTierForCostBuilder (:1149)
      → PackageManagerSchema::projectTierRateSheet(..., $extracted['rate_sheet_id'])  (:394-402)
      → $map[everyCoveredServiceId] = $station                                        (:423-425)
  → PricingBuilder::overlayPackage        (:299) — per slot: enabled gate, configured gate,
      contact→null price, billing_cycle, inclusions_override, label
  → popular_tier resolution               (:382-400)
  → promotion tiers                       (:413)
```

Visibility gates in `findAllActiveIndexedByServiceId`: `platform_status !== 'active'` → `[]` (`:368-371`); `valid_from` / `valid_until` windows (`:375-380`). `findDisabledPackageServiceIds` (`:437`) suppresses the legacy XLSX fallback.

**Verified defects for the consumer model:**

1. **No consumer resolution exists.** The mapping is Service-coverage-based and fans the same Tier set out to every covered Service.
2. **No fail-closed path for a missing relationship.** A Service with no Family, or a Family with no Tier instance, still receives the global Tiers.
3. `deriveStationStatus` (`:1250`) is global — one instance's live occupant would publish every other instance.
4. **Performance:** `projectTierRateSheet` (`:976`) calls `buildReadModel` (`:811`) *per Tier*, which reconciles the full item pool each time. Today that is 5 calls; with N instances it becomes 5N. This must be addressed in Phase 7, not discovered there.

---

## 1.7 Existing contracts and documentation

### Contracts that protect valid occupant behaviour — **preserve**

| Contract | Protects |
| --- | --- |
| `tests/tier-occupant-compatibility.php` | flat→occupant migration, `occ_` id stability across edits and sheet switches, draft-wins-at-settle, selection survival, clear-on-switch |
| `tests/tier-pricing-parity.php` + `scripts/tier-pricing-parity-contract.ts` + `tests/fixtures/tier-pricing-parity.json` | PHP/TS pricing parity, contact mode, fail-closed totals |
| `scripts/tier-occupant-admin-contract.ts` | occupant→card identity |
| `tests/package-manager-schema.php` | rate-sheet collection: minting, curation, upsert-by-id, `rs_primary` lift, provenance, availability |
| `npm run contract:rate-sheet-tool` | Rate Sheet tool read/save mapping |
| `tests/package-category-groups.php` | Family lifecycle + dependency guard |
| `scripts/module-state-snapshot.mjs`, `scripts/mode-renderer-snapshot.mjs` | module-state and renderer snapshots |

### Contracts that enforce the obsolete global/provenance model — **must change**

| Contract | Obsolete assertion |
| --- | --- |
| `scripts/package-tier-workspace-contract.ts:88-92` | *"a shared occupant is a filter result under multiple families, not owned by one"* — directly contradicts the new rule. |
| same, `:64-102` | whole `projectFamilyTierWorkspace` suite is provenance-filter-shaped. |
| same, `:36-62` | `buildRateItemServiceMap` / `occupantSupplyingServiceIds` exist **only** to power Family scoping. |

### Documentation carrying the obsolete model

| File | Obsolete statement |
| --- | --- |
| `docs/code-map/tiers.md:18` | "scopes occupants to a Family through Rate Sheet source-Service provenance" |
| `docs/code-map/tiers.md:24` | "A Package Family is working scope only. It never owns Tier records or gains a per-Family Tier store." |
| `docs/code-map/package-station.md:13` | describes `surface/` as Family/Tier workspace reads |
| `docs/code-map/rate-sheet.md:27` | Tier↔sheet binding (still true, needs instance scoping) |
| `docs/code-map/cost-builder.md` | global Tier projection |
| `docs/code-map/lifecycle-system.md:19` | `usePackageStation` owns "Package/Tier drafts…" |
| `src/Modules/SurfacePackages/CLAUDE.md:16` | slot/occupant identity note |
| `resources/ts/package-station/CLAUDE.md:13` | surface adapter inventory |

### Project History affected (immutable — reference, never edit)

- `003-family-first-workspace.md` — Family-as-scope decision.
- `011-package-tier-workspace-lower-deck.md` — "The Rate Sheet is the station-owned singleton configuration" (already superseded by the `rate_sheets[]` collection).
- `012-package-tier-workspace-product-repair.md` — Family/Tier selection and empty-state rules.

These record decisions that this work supersedes. Per `docs/project-history/000-README.md`, they stay closed; the supersession is recorded in a **new** sequentially numbered document (next available: `013-`).

---

# PART 2 — ARCHITECTURE RISKS AND INCORRECT ASSUMPTIONS

**R1 — "Family Groups already own Tiers." False.** Nothing in storage links them. The relationship is a computed provenance filter (§1.3). Any plan that "moves" Tier data out of Family Groups is a no-op; the work is *creating* the ownership edge that never existed.

**R2 — Slot-name collision is the actual blocker.** With a single global `tiers` map, two consumers cannot both hold a `basic`. This is the concrete bug the instance model fixes, and it must be stated as the migration's motivation.

**R3 — Provenance filtering silently hides live Tiers.** An occupant with no resolved selections projects under no Family (`projection.ts:137-139`) yet still publishes through `findAllActiveIndexedByServiceId`. Explicit resolution must replace the filter, and unassigned instances must be *visible*, not filtered away.

**R4 — Global `platform_status`.** `deriveStationStatus` (`PackageSchema.php:1250`) makes one instance's live occupant publish the whole station. Per-instance readiness must be introduced with the instance, in the same phase, or Phase 7 leaks.

**R5 — `useHostService` heuristic must not become consumer routing.** `useHostService.ts:30-34` picks a host Service by "first package's first ref, else first catalogue row." That is acceptable as a *transport* address for a global option. It must never be reused to decide *which consumer's* instance is being edited.

**R6 — `history` is structurally present but empirically empty.** Preserve it byte-for-byte; do not design restore-from-history behaviour on the assumption it holds data.

**R7 — `cz_package` post meta is a live-registered second Tier schema.** `SurfacePackagesModule.php:25` → `PackageSchema::registerPostMeta()`. Adding `tier_instances[]` while a differently-shaped five-slot schema is still registered guarantees a future reader picks the wrong authority. Resolve in Phase 1, before migration.

**R8 — Promotions share the slot vocabulary.** `ALLOWED_BASED_ON` (`:40`) and station-level `promotions[]`. Do not scope promotions per instance in this work; state the exclusion explicitly or the migration silently changes promotion targeting.

**R9 — Cost Builder cost grows 5× per instance.** `projectTierRateSheet` re-runs `buildReadModel` per Tier. Address by hoisting the read model once per request in Phase 7.

**R10 — The Rate Sheet delete guard is already incomplete.** Four gaps in §1.4. Widening it is required by Phase 4, not optional hardening.

**R11 — Two consumers, one Rate Sheet.** Nothing prevents two instances binding occupants to the same sheet, and nothing should. `allowed_rate_sheet_ids` is a *curation* aid, not exclusivity. Do not let an implementer turn it into a lock.

**R12 — `PackageSchema.php` is 1741 lines.** Per AGENTS.md §"File size and navigation" it is already past the audit threshold. Adding the instance envelope to it is the wrong move; §3 places it in a new focused class.

---

# PART 3 — CANONICAL PROPOSED MODEL

## 3.1 Capability shape

```text
Package Station  (sole Tier capability authority)
├─ Package Families[]          package_manager.category_groups[]   (existing)
├─ Rate Sheets[]               package_manager.rate_sheets[]        (existing)
├─ Tier Engine                 PackageSchema slot/occupant/lifecycle/bin ops (existing, unchanged)
└─ Tier Instances[]            station.tier_instances[]             (NEW envelope only)
```

The **Tier Engine is unchanged**. A Tier Instance is an *envelope* around the existing five-slot map, bin, and popular setting. No occupant behaviour, validation, drawer, editor, or pricing rule moves or is rewritten.

## 3.2 Canonical storage

```text
cz_package_station
├─ package_manager { sources[], groups[], category_groups[], items[], rate_sheets[] }
├─ tier_instances[]                                   ← NEW sibling collection
│   ├─ tier_instance_id      'ti_…'   (ti_primary for the migrated one)
│   ├─ consumer { type, id }          type ∈ CONSUMER_TYPES | null (unassigned)
│   ├─ title                 string
│   ├─ status                StationLifecycle vocabulary
│   ├─ allowed_rate_sheet_ids[]       [] = every active sheet is selectable
│   ├─ popular_tier          slot id | null
│   ├─ popular_label         string
│   ├─ tiers { basic|standard|premium|enterprise|ultimate → SLOT }   ← shape UNCHANGED
│   └─ occupant_bin[]                                                ← shape UNCHANGED
├─ tiers{}                    ← legacy, read-only compatibility
├─ occupant_bin[]             ← legacy, read-only compatibility
├─ popular_tier / popular_label ← legacy, read-only compatibility
├─ promotions[]               ← station-level, OUT OF SCOPE, unchanged
├─ platform_status            ← station aggregate, re-derived from instances
└─ legacy_host_service_id     ← unchanged
```

Precedent: this is exactly the `rate_sheets[]` pattern — identified sibling collection, deterministic primary id, read-time lift, write-path mint.

## 3.3 Consumer contract — the smallest controlled form

```php
// TierInstanceSchema
public const CONSUMER_TYPES = ['package_family'];   // exactly one member today
```

Rules:

1. `consumer.type` must be in `CONSUMER_TYPES`, or the whole `consumer` is `null` (unassigned).
2. `consumer.id` must resolve in that type's registry. For `package_family`: `PackageCategoryGroups::idSet($manager['category_groups'])`. An unresolvable id **downgrades the instance to unassigned** — it is never dropped and never silently re-pointed. (Mirrors `PackageManagerSchema::sanitize`'s existing reassign-not-delete rule at `:107-113`.)
3. **Cardinality: at most one assigned instance per `(consumer_type, consumer_id)`.** Enforced in `sanitizeInstances` (first occurrence wins) and rejected at the write boundary with `code: 'consumer_already_owns_instance'`.
4. Unassigned instances are permitted and unlimited (migration landing state).
5. `title` is stored from day one so relaxing rule 3 to multi-instance later is a **rule change, not a shape change**.

**Explicitly not built:** no generic ownership registry, no polymorphic resolver interface, no consumer-type plugin table, no reverse index on the Family record. Adding a second type is a one-line allow-list edit plus one resolver branch — which is the correct amount of extensibility for one proven consumer.

## 3.4 Placement — new focused class

**`src/Modules/SurfacePackages/Support/TierInstanceSchema.php`** (new, target < 400 lines).

Owns: collection sanitisation, `ti_primary` migration lift, consumer validation/uniqueness, instance find/resolve, allowed-sheet curation, per-instance readiness derivation, station aggregate re-derivation.

Does **not** own: slot shape, occupant shape, drafts, module status, bin entries, settle, archive, restore. Those stay in `PackageSchema` and are invoked *by* `TierInstanceSchema` on the slot map an instance carries. Rationale: AGENTS.md "one coherent reason to change" + `PackageSchema.php` already at 1741 lines (R12).

---

# PART 4 — PHASED IMPLEMENTATION BLUEPRINT

> Each phase = one commit. Do not push. Run the phase's validation before moving on.

---

## Phase 1 — Authority and canonical model

**Purpose.** Define the canonical Tier Instance schema and eliminate the competing Tier schema authority *before* any data moves.

**Exact files**

| File | Action |
| --- | --- |
| `src/Modules/SurfacePackages/Support/TierInstanceSchema.php` | **create** |
| `src/Modules/SurfacePackages/Support/PackageSchema.php` | edit: retire `registerPostMeta()` + `sanitize()` + `defaultPackage()` + `sanitizeTiers()` + `sanitizeType()` + `sanitizeServiceRefs()` + `sanitizeContexts()` + `sanitizeBundle()` + `sanitizeDatetime()` + `sanitizePopularTier()` + `sanitizePopularLabel()` + `sanitizeFaqRefs()` **only if provably unreferenced**; update FILE INDEX |
| `src/Modules/SurfacePackages/SurfacePackagesModule.php` | edit: drop `(new PackageSchema())->register();` (line 25) |
| `resources/ts/package-station/types.ts` | add TS contracts |
| `tests/tier-instance-schema.php` | **create** |

**Exact symbols to add** (`TierInstanceSchema`):

```php
public const PRIMARY_INSTANCE_ID = 'ti_primary';
public const CONSUMER_TYPES      = ['package_family'];
public const ALLOWED_STATUSES    = StationLifecycle::STATUSES;   // reuse, do not invent

public static function defaultInstances(): array;                        // []
public static function sanitizeInstances(mixed $instances, array $consumerRegistry): array;
public static function sanitizeInstance(mixed $instance, array $consumerRegistry): ?array;
public static function sanitizeConsumer(mixed $consumer, array $consumerRegistry): ?array;
public static function mintInstanceId(): string;                         // 'ti_' . bin2hex(random_bytes(6))
public static function findInstance(array $instances, ?string $id): ?array;
public static function findInstanceForConsumer(array $instances, string $type, string $id): ?array;
public static function upsertInstance(array $instances, array $instance): array;
public static function removeInstance(array $instances, string $id): array;
public static function emptyTierMap(): array;                            // array_fill_keys(ALLOWED_TIERS, [])
public static function sanitizeAllowedRateSheetIds(mixed $ids, array $rateSheets): array;
public static function deriveInstanceStatus(array $instance): string;    // per-instance, PackageSchema::deriveStationStatus logic scoped
public static function deriveStationStatusFromInstances(array $instances): string;
```

**Exact symbols to retire.** Only after confirming zero references — required greps, all must return empty outside the file itself:
`rg "PackageSchema::sanitize\(" src/ tests/`, `rg "defaultPackage" src/ resources/ tests/`, `rg "cz_package'" src/`, `rg "registerPostMeta" src/`.
`PackageSchema::ALLOWED_TIERS`, `TIER_MODULES`, `ALLOWED_MODULE_STATUSES`, `ALLOWED_PLATFORM_STATUSES`, `ALLOWED_BASED_ON`, `PROMOTION_MODULES` and the whole `TIER_OCCUPANTS`/`TIER_LIFECYCLE`/`OCCUPANT_BIN`/`PROMOTION_SCHEMA` sections **stay**.
Leave `cz_surface_package` registered in `PostTypeRegistrar.php` (historical queryability, documented at `SurfacePackagesModule.php:18-19`); only the *meta schema registration* goes.

**TS contracts** (`resources/ts/package-station/types.ts`):

```ts
export type TierConsumerType = 'package_family';
export interface TierConsumerRef { type: TierConsumerType; id: string }
export interface TierInstanceSummary {
  tier_instance_id: string;
  consumer: TierConsumerRef | null;
  title: string;
  status: PackageFamilyStatus;
  allowed_rate_sheet_ids: string[];
  popular_tier: string | null;
  popular_label: string;
  readiness: 'ready' | 'not-ready' | 'unassigned';
  occupant_count: number;
  bin_count: number;
}
```

**Storage changes.** None yet. Schema only.

**Migration behaviour.** None yet.

**Compatibility rules.** Existing endpoints, responses, and the `station['tiers']` shape are untouched. Retiring `cz_package` meta must not alter any REST response (verified: no read path consumes it).

**Tests required.** `tests/tier-instance-schema.php`:
1. `sanitizeInstances([])` → `[]`.
2. An instance without `tier_instance_id` is dropped (parity with `sanitizeRateSheets`).
3. Duplicate ids → first wins.
4. `consumer.type` outside `CONSUMER_TYPES` → instance becomes unassigned, is **not** dropped.
5. `consumer.id` absent from the registry → unassigned, not dropped.
6. Two assigned instances for the same `(type,id)` → second becomes unassigned; instance count unchanged.
7. `emptyTierMap()` returns exactly the five `ALLOWED_TIERS` keys, in order.
8. `sanitizeAllowedRateSheetIds` drops unknown ids, dedupes, preserves order.
9. `deriveInstanceStatus` returns `active` iff a slot holds a live active occupant; `disabled` otherwise.
10. `sanitizeInstances` is idempotent — `sanitize(sanitize(x)) === sanitize(x)`.
11. `mintInstanceId()` matches `/^ti_[0-9a-f]{12}$/` and is never called by any sanitiser.

**Documentation changes.** New `docs/code-map/tier-instances.md` (< 600 words), indexed **exactly once** under "Catalogue and commercial domains" in `docs/code-map/000-README.md`. Update `src/Modules/SurfacePackages/CLAUDE.md` ownership list.

**Completion criteria.**
- `php tests/tier-instance-schema.php` passes; all pre-existing PHP tests pass byte-identically.
- `SurfacePackagesModule` no longer registers `cz_package` meta; `rg "register_post_meta\('cz_surface_package'" src/` empty.
- `npx tsc --noEmit`, `npm run build`, `npm run docs:check` clean.
- **Nothing reads or writes `tier_instances` yet.**

---

## Phase 2 — Safe migration

**Purpose.** Lift the existing global Tier system into exactly one deterministic instance, `ti_primary`, preserving every byte.

**Exact files**

| File | Action |
| --- | --- |
| `src/Modules/SurfacePackages/Support/TierInstanceSchema.php` | add `liftLegacyStation()` |
| `src/Modules/SurfacePackages/Repositories/PackageRepository.php` | `loadStation()` applies the in-memory lift; `defaultStation()` gains `'tier_instances' => []` |
| `tests/tier-instance-migration.php` | **create** |

**Exact symbol**

```php
/**
 * In-memory lift of the legacy global Tier system into ONE instance.
 * NEVER mints an occupant, bin, or slot id. NEVER writes. Idempotent.
 * Mirrors PackageManagerSchema::sanitizeRateSheets's rs_primary rule.
 */
public static function liftLegacyStation(array $station, array $consumerRegistry): array;
```

Behaviour:
1. If `$station['tier_instances']` is a non-empty array → return `$station` unchanged. **The lift runs once, ever.**
2. Otherwise construct one instance:
   ```php
   [
     'tier_instance_id'       => self::PRIMARY_INSTANCE_ID,     // 'ti_primary'
     'consumer'               => self::inferPrimaryConsumer(...),  // see below
     'title'                  => 'Primary Tier Set',
     'status'                 => $station['platform_status'] ?? 'disabled',
     'allowed_rate_sheet_ids' => [],                            // [] = all active sheets
     'popular_tier'           => $station['popular_tier']  ?? null,
     'popular_label'          => $station['popular_label'] ?? '',
     'tiers'                  => $station['tiers']        ?? [],  // VERBATIM
     'occupant_bin'           => $station['occupant_bin'] ?? [],  // VERBATIM
   ]
   ```
3. **Leave `station['tiers']`, `station['occupant_bin']`, `station['popular_tier']`, `station['popular_label']` in place.** They remain as the legacy compatibility copy until Phase 8.

**Preservation — non-negotiable.** `tiers` and `occupant_bin` are assigned by reference-copy, not rebuilt. That mechanically guarantees: slot keys, `occ_…` ids, occupant field order, `history`, `drafts`, `module_status`, `bin_id`, `origin_tier`, `previous_enabled`, `displaced_at`, `rate_sheet_id`, and every `rate_sheet_items` entry survive unchanged. **Do not call `ensureTierLifecycle`, `ensureOccupantBin`, `normaliseTierSlot`, or `upsertOccupant` during the lift.**

**No write-on-read.** `loadStation()` applies the lift to the returned array and to `$stationCache` only. It must **not** call `update_option`. This is a deliberate divergence from `ensurePromotions` (`PackageRepository.php:138`, which does write) and matches `getPackageStationManager`'s stated no-write-on-read contract (`PackageStationController.php:322-327`). The lifted shape persists the first time any mutation route calls `saveStation`.

**Consumer inference — never guess**

```php
private static function inferPrimaryConsumer(array $station, array $readModelItems): ?array;
```

1. Compute, for each Family in `package_manager.category_groups`, `PackageCategoryGroups::dependents($station, $readModelItems, $groupId)`.
2. Collect Families with `dependents['tier_selections'] > 0`.
3. **Exactly one** → `['type' => 'package_family', 'id' => $thatGroupId]`.
4. **Zero or two-plus** → `null`. The instance lands **unassigned** and the Tier Tool surfaces an explicit adoption action (Phase 5). No heuristic, no "first Family", no `legacy_host_service_id` fallback.

Because inference needs the reconciled read model, and `loadStation()` must stay cheap, **inference runs only on the write path** (`TierInstanceSchema::inferPrimaryConsumer` is called from the Phase 3 assignment endpoint and from the first mutation that persists the lifted shape). The read-time lift always produces `consumer => null`; the assignment is a separate, explicit, auditable step.

**Compatibility rules.** Every existing endpoint keeps its exact response shape. All existing routes continue reading `station['tiers']` in Phase 2 — the instance exists but nothing consumes it yet. Instance and legacy copy are identical until Phase 4 switches the writers.

**Tests required.** `tests/tier-instance-migration.php`:
1. A legacy station with occupants in `basic` and `premium` lifts to exactly one `ti_primary`.
2. Every `occ_…` id is byte-identical before and after — assert on the full occupant arrays.
3. `drafts`, `module_status`, `history` preserved per slot, including `null` drafts.
4. `occupant_bin` entries preserved: `bin_id`, `origin_tier`, `status`, `previous_enabled`, `displaced_at`.
5. `popular_tier` / `popular_label` carried onto the instance.
6. Each occupant's `rate_sheet_id` and `rate_sheet_items` preserved exactly.
7. Idempotence: `lift(lift(x)) === lift(x)`.
8. A station that already has `tier_instances` is returned unchanged — the lift never re-runs.
9. Empty station (`tiers => []`) lifts to one instance with `emptyTierMap()`.
10. The lift produces `consumer === null` always (inference is a separate step).
11. `inferPrimaryConsumer` with one dependent Family → that Family. With zero → `null`. With two → `null`.
12. **No-write proof:** call `loadStation()` twice against a fixture double for `update_option` and assert zero write calls.

**Documentation changes.** `docs/code-map/tier-instances.md` gains a Migration section. Note `rs_primary`/`ti_primary` symmetry in `docs/code-map/rate-sheet.md`.

**Completion criteria.**
- Both new PHP tests pass; every pre-existing test passes unchanged.
- No endpoint response differs (verify with `tests/service-route-baseline.php`).
- No `update_option` on any read path.

---

## Phase 3 — Consumer ownership contract

**Purpose.** Make the consumer reference real, writable, and validated. Family Group first.

**Exact files**

| File | Action |
| --- | --- |
| `src/Modules/SurfacePackages/Support/TierInstanceSchema.php` | add `assignConsumer`, `clearConsumer`, `consumerRegistryFor` |
| `src/Modules/SurfacePackages/Http/PackageStationController.php` | add the instance route family |
| `src/Modules/SurfacePackages/Support/PackageCategoryGroups.php` | extend `dependents()` with `tier_instances` |
| `resources/ts/package-station/api.ts` | add typed calls |
| `resources/ts/package-station/types.ts` | add response contracts |
| `tests/tier-instance-consumer.php` | **create** |

**Routes** (same `/admin/services/{id}/package-station/` grammar — Service id stays navigation context, per `docs/code-map/package-station.md:22`):

```
GET    …/package-station/tier-instances
POST   …/package-station/tier-instances                       { consumer_type, consumer_id, title }
GET    …/package-station/tier-instances/(?P<instance>[a-z0-9_]+)
PATCH  …/package-station/tier-instances/(?P<instance>[a-z0-9_]+)  { title?, allowed_rate_sheet_ids?, status? }
POST   …/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/consumer   { consumer_type, consumer_id }
DELETE …/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/consumer
DELETE …/package-station/tier-instances/(?P<instance>[a-z0-9_]+)
```

Route param pattern `[a-z0-9_]+` matches the existing bin routes (`PackageStationController.php:138`). `permission_callback` = `[$this, 'requireAdmin']` for all.

**Symbols**

```php
public static function assignConsumer(array $instances, string $instanceId, string $type, string $id, array $registry): array;
  // errors: 'unknown_instance' | 'unknown_consumer_type' | 'unknown_consumer' | 'consumer_already_owns_instance'
public static function clearConsumer(array $instances, string $instanceId): array;
public static function consumerRegistryFor(string $type, array $manager): array;
  // 'package_family' → PackageCategoryGroups::idSet($manager['category_groups'])
```

**Cardinality and uniqueness (decided — the implementer chooses nothing):**
- One consumer owns **at most one** Tier instance. `assignConsumer` rejects a second with `consumer_already_owns_instance` (HTTP 409).
- An instance has **at most one** consumer.
- Unassigned instances are legal and unlimited.
- `title` is stored and editable now; multi-instance-per-consumer is deferred until a real need. When relaxed, only rule 1 and `findInstanceForConsumer`'s return type change — no storage migration.

**Storage changes.** `tier_instances[*].consumer` becomes writable. **No Tier data is stored on the Family Group.** `category_groups[]` gains no Tier fields.

**Family dependency counting extension.** `PackageCategoryGroups::dependents()` (`:339`) gains a fourth count:

```php
'tier_instances' => count of instances whose consumer is {package_family, $groupId}
```

Returned shape becomes `{services, rate_sheet_rows, tier_selections, tier_instances}`. Because `PackageCategoryGroups::delete()` (`:270`) uses `array_sum($dependents) > 0`, an owned instance automatically blocks Family deletion with no change to the guard expression. Update the TS `PackageFamilyDependents` interface (`types.ts:109`) and `PackageFamilySummary`'s three-metric contract (`surface/packageTierWorkspace/familySummary.ts`, asserted at `scripts/package-tier-workspace-contract.ts:114-121`) — **that assertion moves from three metrics to four.**

**Compatibility rules.** Existing Tier routes untouched. Family list/mutation responses gain one dependents key (additive).

**Tests required.** `tests/tier-instance-consumer.php`:
1. Assign to a live Family → `consumer` set.
2. Assign to an unknown Family id → `unknown_consumer`, collection unchanged.
3. Assign an unsupported `consumer_type` → `unknown_consumer_type`.
4. Assign a second instance to the same Family → `consumer_already_owns_instance`.
5. Clear then re-assign to a different Family → succeeds.
6. Deleting a Family that owns an instance → 409 with `dependents.tier_instances >= 1`.
7. Clearing the consumer then deleting the Family (all other dependents zero) → succeeds.
8. `sanitizeInstances` re-run after the owning Family is deleted → instance becomes unassigned, **is not deleted**, and its occupants survive.

Extend `tests/package-category-groups.php` with the four-key `dependents` shape.

**Documentation changes.** `docs/code-map/tier-instances.md` — consumer contract, cardinality, guard. `docs/code-map/package-station.md` — new route family. `src/Modules/SurfacePackages/CLAUDE.md` — route inventory.

**Completion criteria.** New + extended PHP tests pass. `npx tsc --noEmit` clean. Family delete guard demonstrably blocks on an owned instance. No Tier field exists on any Family record.

---

## Phase 4 — Backend mutations and guards

**Purpose.** Scope every Tier operation by `tier_instance_id` *before* slot and occupant resolution. Preserve occupant ids as drawer identity. Close the guard gaps.

**Exact files**

| File | Action |
| --- | --- |
| `src/Modules/SurfacePackages/Http/PackageStationController.php` | re-scope all Tier/bin handlers |
| `src/Modules/SurfacePackages/Support/TierInstanceSchema.php` | add `withInstance()` |
| `src/Modules/SurfacePackages/Repositories/PackageRepository.php` | `rateSheetIdsReferencedByTiers` moves here, widened |
| `resources/ts/package-station/api.ts`, `usePackageStation.ts`, `types.ts` | thread `tierInstanceId` |
| `tests/tier-instance-mutations.php`, `tests/tier-instance-guards.php` | **create** |

**Route re-scoping.** Every Tier and bin route gains the instance segment:

```
…/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/tiers/(?P<tier>[a-z]+)
…/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/tiers/(?P<tier>[a-z]+)/enabled
…/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/tiers/(?P<tier>[a-z]+)/modules/(?P<module>[a-z]+)
…/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/tiers/(?P<tier>[a-z]+)/modules/(?P<module>overview|features|faqs)/revert
…/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/tiers/(?P<tier>[a-z]+)/archive
…/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/tiers/(?P<tier>[a-z]+)/settle
…/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/bin/(?P<bin>[a-z0-9_]+)/restore
…/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/bin/(?P<bin>[a-z0-9_]+)/trash
…/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/bin/(?P<bin>[a-z0-9_]+)
…/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/popular
GET …/package-station/tier-instances/(?P<instance>[a-z0-9_]+)/read
```

The nine legacy unscoped routes (`PackageStationController.php:83-201`) stay registered for one release and **alias to `ti_primary`**. Each logs nothing and behaves identically. They are removed in Phase 8.

**Mandatory handler order** — every re-scoped handler:

```php
1. $instanceId = sanitize_text_field((string) $request->get_param('instance'));
2. $station    = $this->packages()->loadStation();            // lift already applied
3. $instance   = TierInstanceSchema::findInstance($station['tier_instances'], $instanceId);
   if ($instance === null) return ['success'=>false,'code'=>'unknown_tier_instance', …];   // ← BEFORE slot lookup
4. $slot       = PackageSchema::ensureTierLifecycle($instance['tiers'][$tierId] ?? []);
5. …existing PackageSchema operation, byte-for-byte unchanged…
6. $station    = TierInstanceSchema::withInstance($station, $instanceId, $updatedInstance);
7. $station['platform_status'] = TierInstanceSchema::deriveStationStatusFromInstances($station['tier_instances']);
8. $this->packages()->saveStation($station);
```

**Rule: no handler may read `$station['tiers']` after Phase 4.** Enforce with a contract scan (see tests).

```php
public static function withInstance(array $station, string $instanceId, array $instance): array;
// replaces one instance by id, re-derives instance['status'], leaves every other instance untouched
```

**Occupant identity — unchanged.** `upsertOccupant`'s `$existingId ?? mint` (`PackageSchema.php:1218`) is not touched. `occ_…` remains the drawer/entity identity. **Do not derive occupant ids from `tier_instance_id`, do not prefix them, do not re-mint on migration or on instance move.** Occupant ids are unique per instance and *may* collide across instances in principle — resolution is always `(tier_instance_id, slot_id) → occupant`, and `resolveOccupantSlot` operates within one loaded instance.

**Operations covered.** create (`savePackageStationTier`), edit (`savePackageStationTierModule`), settle, revert, enabled toggle, popular, archive, restore (incl. `swap` / `retarget` — both stay **within one instance**; cross-instance restore is not supported and returns `cross_instance_restore_unsupported`), trash, delete, instance delete.

**Instance deletion guard** (`DELETE …/tier-instances/{id}`) — refuse when any of:
- the instance holds any live occupant → `instance_has_occupants`
- `occupant_bin` is non-empty → `instance_has_bin_entries`
- any slot holds a non-null draft → `instance_has_drafts`
- `consumer !== null` → `instance_has_consumer` (clear the consumer first)

Deletion is the only operation that removes an instance, mirroring `deleteBinnedOccupant`'s "only operation that removes an entry" rule (`PackageSchema.php:1618-1619`).

**Rate Sheet delete guard — widened.** Replace `PackageStationController::rateSheetIdsReferencedByTiers` (`:438`) with:

```php
// PackageRepository (it already owns whole-station traversal)
public function rateSheetIdsInUse(array $station): array;   // array<string, true>
```

Scans, across **every** instance (and the legacy copy while it exists):
1. `instance.tiers[*].current_occupant.rate_sheet_id` — **regardless of whether selections exist** (closes gap 3 of §1.4).
2. `instance.tiers[*].drafts.overview.rate_sheet_id` — a pending sheet switch.
3. `instance.tiers[*].drafts.features` non-empty → the occupant's or draft's bound sheet.
4. `instance.tiers[*].history[*].rate_sheet_id` — closes gap 2.
5. `instance.occupant_bin[*].occupant.rate_sheet_id` — closes gap 1.
6. `instance.allowed_rate_sheet_ids[*]` — an explicitly curated sheet is in use.

Legacy `rs_primary` default (`PackageSchema::defaultRateSheetId` semantics) applies at every site.
Enforced at `savePackageStationManager` (`:382-392`), same `code: 'rate_sheet_in_use'`. Also add an **archive** guard: archiving a sheet that any instance binds returns `code: 'rate_sheet_in_use_archive'` with the bound instance ids so the UI can explain (closes gap 4).

**Compatibility rules.** Legacy routes alias to `ti_primary` and return identical shapes. Instance-scoped routes add `tier_instance_id` to their response envelope. Clients migrate in Phase 5.

**Tests required.**

`tests/tier-instance-mutations.php`:
1. Save `basic` in instance A → instance B's `basic` occupant is byte-identical afterwards. **(The core regression.)**
2. Two instances each hold a `basic` occupant with different `occ_…` ids; both survive independent saves.
3. Settle in A leaves B's drafts and `module_status` untouched.
4. Archive in A moves the occupant into **A's** bin; B's bin unchanged.
5. Restore with `swap` inside A displaces only A's occupant.
6. Restore targeting a bin id from another instance → `unknown_bin_entry` (bins are instance-scoped).
7. Popular set on A does not change B's `popular_tier`.
8. Unknown `tier_instance_id` → `unknown_tier_instance` **before** any slot resolution; station bytes unchanged.
9. Occupant id survives every operation in 1–7.
10. `deriveStationStatusFromInstances`: one active instance ⇒ station `active`; all disabled ⇒ `disabled`.
11. Legacy unscoped route ⇒ identical result to the `ti_primary`-scoped route.

`tests/tier-instance-guards.php`:
12. Delete a sheet bound by a **current occupant with zero selections** → `rate_sheet_in_use`.
13. Delete a sheet referenced only by a **bin entry** → `rate_sheet_in_use`.
14. Delete a sheet referenced only by a **pending overview draft** → `rate_sheet_in_use`.
15. Delete a sheet referenced only by **`allowed_rate_sheet_ids`** → `rate_sheet_in_use`.
16. Archive a bound sheet → `rate_sheet_in_use_archive` naming the instances.
17. Delete an instance with occupants / bin entries / drafts / a consumer → each specific code.
18. Delete a fully-empty unassigned instance → succeeds.

Contract scan (extend `scripts/tier-occupant-admin-contract.ts` or add `scripts/tier-instance-scope-contract.ts`): assert `PackageStationController.php` contains **zero** occurrences of `$station['tiers']` outside the legacy alias block.

**Documentation changes.** `docs/code-map/tier-instances.md` (routes, handler order, guards), `docs/code-map/tiers.md` (mutation scoping), `docs/code-map/rate-sheet.md` (widened guard), `src/Modules/SurfacePackages/CLAUDE.md`.

**Completion criteria.** All new + existing PHP tests pass. The scope scan passes. Legacy aliases prove response-identical. `npx tsc --noEmit`, `npm run build` clean.

---

## Phase 5 — Package Station Tier Tool

**Purpose.** One Package-owned Tier Tool that manages instances and consumer context — reusing the existing workspace, drawers, editors, and occupant lifecycle.

**Exact files**

| File | Action |
| --- | --- |
| `resources/ts/package-station/surface/tierInstance/useTierInstances.ts` | **create** — instance collection read + mutations |
| `resources/ts/package-station/surface/tierInstance/tierInstanceModel.ts` | **create** — pure list/readiness/eligibility projections |
| `resources/ts/package-station/usePackageStation.ts` | edit — accept `tierInstanceId`, thread through every call |
| `resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts` | edit — resolve by instance, drop provenance filter |
| `resources/ts/package-station/surface/packageTierWorkspace/projection.ts` | edit — replace filter with explicit resolution |
| `resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx` | edit — instance context + states |
| `resources/ts/package-station/presentation/package-tier-workspace/TierInstancePanel.tsx` | **create** — instance list / create / open / allowed sheets |
| `resources/ts/package-station/surface/tierSurface/TierDrawerHost.tsx` | edit — carry instance id |
| `resources/ts/package-station/drawer/tier/tierDrawerTypes.ts`, `useTierDrawerController.ts`, `TierDrawerContent.tsx` | edit — accept `tierInstanceId` |
| `resources/ts/package-station/register.ts` | edit only if a data-source key is added |
| `scripts/tier-instance-tool-contract.ts` | **create** |

**Reuse, do not rebuild.** `TierDrawerContent`, `useTierDrawerController`, `useTierModuleEditing`, `useTierBinTravel`, `tierDetailModel`, `TierBinList`, `TierDrawerFooter`, `TierDrawerDialogs`, `TIER_ENTITY`, all `drawer/editors/*`, `TierNavigation`, `TierDetailPanel`, `TierLowerDeck`, `deck.ts`, `tierOccupantCard.ts`, `evaluateTierPricing.ts` **change only by receiving the instance id**. No new drawer, no second Tier composition, no generic CRUD engine.

**`usePackageStation` signature change:**

```ts
export function usePackageStation(
  serviceId: number,
  tierInstanceId: string | null,        // ← NEW, second positional
  onRefresh?: () => void,
): PackageStation
```

`tierInstanceId === null` holds the unloaded state exactly as `serviceId === 0` does today (`usePackageStation.ts:51` precedent). Every mutation in the hook passes it to the corresponding `api.ts` call.

**Tool capabilities (exactly these — no generic CRUD):**

| Capability | Implementation |
| --- | --- |
| List Tier instances | `useTierInstances()` → `GET …/tier-instances`; rows show title, consumer name, readiness, occupant count, bin count |
| Create instance for an eligible consumer | Eligible = live Families (`platform_status` not binned) with no instance. `tierInstanceModel.eligibleConsumers()` is pure and contract-tested. Creating for an ineligible consumer is not offered and is rejected server-side. |
| Open instance | Selects the instance; the existing Focus/Grid engine and lower deck re-render against it |
| Configure allowed/linked Rate Sheets | `PATCH …/tier-instances/{id}` with `allowed_rate_sheet_ids`; the Tier Overview editor's sheet options (`TierDrawerContent.tsx:224-227`) narrow to `allowed_rate_sheet_ids` when non-empty, else every active sheet **plus** the currently-bound sheet even if archived (rule preserved verbatim) |
| Display fixed slots | Always five, from `TIER_KEYS` (`vocabulary.ts:3`). Empty slots render as empty shells, **never as cards** — the `deriveTierOccupants` omission rule is preserved. |
| Operate occupant lifecycle | Unchanged `tier` drawer, dispatched by `occupant_id` |
| Show unassigned / migration state | An unassigned instance lists with an explicit "Not assigned to a consumer" state and one action: assign to an eligible Family. Its occupants are **fully visible and editable** — never hidden, never auto-adopted. |

**Storage changes.** None.

**Migration behaviour.** On first load after Phase 2, the tool shows `ti_primary`. If unassigned, the adoption action is the only route to a consumer, and it is user-initiated.

**Compatibility rules.** The `tier-workspace` kit key, the `tier` drawer key, the `package-tier-workspace` source key, and the Admin binding (`admin-station/register.ts:88-106`) all stay. Admin authors placement; Package changes only what it owns.

**Tests required.** `scripts/tier-instance-tool-contract.ts` (pure functions only):
1. `eligibleConsumers` excludes Families that already own an instance.
2. `eligibleConsumers` excludes archived/trashed Families.
3. An unassigned instance appears in the list with readiness `unassigned`.
4. Instance rows carry occupant counts derived from the loaded instance, never re-derived from provenance.
5. Allowed-sheet narrowing: with `allowed_rate_sheet_ids = ['rs_a']`, options are `rs_a` plus the bound sheet if different; with `[]`, all active sheets plus the bound one.
6. Slot display is always five keys in `TIER_KEYS` order regardless of occupancy.

**Documentation changes.** `docs/code-map/tiers.md` (rewrite the workspace section), `docs/code-map/tier-instances.md` (tool section), `resources/ts/package-station/CLAUDE.md` (new `surface/tierInstance/` entry).

**Completion criteria.** `npx tsc --noEmit`, `npm run build`, new contract, and all existing contracts pass. No new drawer template registered. No component outside `package-station/` gained Tier logic.

---

## Phase 6 — Family Group workspace integration

**Purpose.** When a Family is selected, resolve its Tier instance **explicitly**. Delete the provenance filter.

**Exact files**

| File | Action |
| --- | --- |
| `resources/ts/package-station/surface/packageTierWorkspace/projection.ts` | **rewrite the scoping half** |
| `resources/ts/package-station/surface/packageTierWorkspace/usePackageTierWorkspace.ts` | edit |
| `resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx` | edit — setup/activation state |
| `resources/ts/package-station/surface/packageTierWorkspace/familySummary.ts` | edit — fourth metric |
| `scripts/package-tier-workspace-contract.ts` | **rewrite** |

**Symbols to delete** — these exist only to power the obsolete filter:

```ts
buildRateItemServiceMap        // projection.ts:85
occupantSupplyingServiceIds    // projection.ts:112
WorkspaceOccupant.supplyingServiceIds   // projection.ts:52
```

`projectFamilyTierWorkspace` (`:131`) is replaced by:

```ts
export function resolveFamilyTierInstance(
  family: WorkspaceFamilyScope,
  instances: readonly TierInstanceSummary[],
): TierInstanceSummary | null;      // exact match on consumer {type:'package_family', id: family.id}
```

**Keep** `buildRateItemCategoryMap` (`deck.ts:107`) — it resolves Service *categories* for the Details lane, which is presentation enrichment, not scoping. Its two-hop chain is legitimate and unrelated to ownership.

**Family Group states (exactly three):**

| Condition | State |
| --- | --- |
| Family owns an instance | Render the engine + lower deck against that instance |
| Family owns no instance | **Setup/activation state**: "This Package Family has no Tier instance." One action → create an instance for this Family (Phase 5 capability). Never show another Family's Tiers. Never show the global set. |
| Instance exists but holds no occupants | The existing "no Tier selections" empty state, now honest — it means *this instance is empty*, not *nothing matched a filter* |

**Family Group must not become a Tier host.** No Tier storage, no Tier lifecycle action, no Tier editor, no Tier drawer inside `drawer/package-family/` or `surface/packageFamily/`. The Family workspace *references* its instance and opens the Package-owned Tier tool/drawer. Enforce with a contract scan.

**Compatibility rules.** The Admin binding, kit key, source key, and drawer key are unchanged. The kit's transient Family/Tier/view-mode state is preserved.

**Tests required.** Rewritten `scripts/package-tier-workspace-contract.ts`:
1. A Family resolves **only** its own instance, by consumer match.
2. A Family with no instance resolves `null` and yields the setup state — **not** another Family's occupants.
3. An occupant is **never** projected under two Families. *(This directly inverts the current line 88-92 assertion; the old one is deleted, not weakened.)*
4. Two Families with instances holding same-named slots project distinct occupants with distinct `occ_…` ids.
5. Rate Sheet row provenance has **zero** influence on which Family sees which Tier — same fixtures as today, opposite expectation.
6. An occupant with no selections is still projected under its owning Family (it is no longer invisible).
7. `familySummary` exposes four authoritative dependents in order: `services, rate-sheet-rows, tier-selections, tier-instances`.
8. Forbidden-symbol scan: `projection.ts` no longer exports `buildRateItemServiceMap` / `occupantSupplyingServiceIds`.
9. Forbidden-import scan: nothing under `drawer/package-family/` or `surface/packageFamily/` imports `usePackageStation`, `tierOccupants`, or `TIER_ENTITY`.

**Documentation changes.** `docs/code-map/tiers.md` — delete the provenance-filter paragraph (line 18) and the "Family is working scope only" line (line 24); replace with explicit consumer resolution. `docs/code-map/package-station.md:13`.

**Completion criteria.** Rewritten contract passes. No provenance-based Tier scoping remains anywhere — `rg "supplyingServiceIds" resources/` empty. `npx tsc --noEmit`, `npm run build` clean.

---

## Phase 7 — Public projection

**Purpose.** Project the correct consumer-owned instance. Fail closed.

**Exact files**

| File | Action |
| --- | --- |
| `src/Modules/SurfacePackages/Repositories/PackageRepository.php` | rewrite `findAllActiveIndexedByServiceId` (`:360`) |
| `src/Modules/SurfacePackages/Support/TierInstanceSchema.php` | add `resolveInstanceForService` |
| `src/Modules/SurfacePackages/Http/PackageStationReadController.php` | one row per instance |
| `tests/tier-instance-public-projection.php` | **create** |

**Resolution chain (the only one permitted):**

```
Service id
  → package_manager.sources[] where entity_id === serviceId
      → category_group_id                              (the Family)
  → tier_instances[] where consumer === {package_family, thatGroupId}
      → that instance's tiers{}
```

```php
public static function resolveInstanceForService(array $station, int $serviceId): ?array;
```

**Fail-closed rules — all four:**
1. Service has no source relationship → `null` → **no Tier data**; fall through to the existing legacy/disabled handling.
2. Source has `category_group_id === null` (unassigned) → `null`.
3. Family owns no instance → `null`.
4. Instance is not ready (`deriveInstanceStatus !== 'active'`) → `null`.

**Never fall back to another instance, to `ti_primary`, to the legacy `station['tiers']`, or to "the first instance".** A Service that resolves nothing must behave exactly as a Service with no package does today — which `PricingBuilder.php:240-251` already handles (`$package = $this->packageMap[$post->ID] ?? null`).

**Multi-Family services.** A Service can appear in several source relationships. If it resolves to more than one instance → return `null` and fail closed (ambiguous). Do not pick one. Record the decision in the code map.

**Visibility.** The station-level gates (`platform_status`, `valid_from`, `valid_until`, `PackageRepository.php:368-380`) stay as the outer gate. Per-instance readiness is the inner gate. Both must pass.

**Performance (R9).** `findAllActiveIndexedByServiceId` currently calls `projectTierRateSheet` per Tier, each rebuilding the read model. Hoist: build `$incPool`/`$faqPool` once (already done, `:385`) **and** `buildReadModel` once per request, then pass the resolved item index into a new `projectTierRateSheetWith(array $readModel, …)`. `projectTierRateSheet` keeps its current signature as a thin wrapper so `PackageStationController` and `PackageStationReadController` are unaffected.

**`PackageStationReadController::list()`** returns one row per instance (`post_id: 0` preserved, `title` from the instance, `service_refs` from the consumer Family's related Services). A station with no instances returns `{success: true, total: 0, packages: []}`.

**Compatibility rules.** `PricingBuilder` needs **no change** — it consumes `$this->packageMap[$post->ID]`, whose per-Service value simply becomes instance-resolved. `overlayPackage` (`:299`) and the `popular_tier` resolution (`:382-400`) are untouched. `PackageSchema::extractTierForCostBuilder` is untouched.

**Tests required.** `tests/tier-instance-public-projection.php`:
1. Service in Family A whose instance holds a live `basic` → that instance's `basic` in the projection.
2. Service in Family B → B's instance only. A's Tiers are **absent**.
3. Service with no source relationship → no Tier data (fail closed).
4. Service whose source has `category_group_id === null` → fail closed.
5. Family with no instance → fail closed.
6. Instance with no active occupant → fail closed.
7. Service in two Families with two instances → fail closed (ambiguous), **not** first-wins.
8. Station-level `valid_until` in the past → nothing projects, even for a ready instance.
9. Two instances with same-named slots project to their own Services with their own prices.
10. Occupant `rate_sheet_id` still resolves `(rate_sheet_id, item_id)` within the named sheet.

Re-run `tests/tier-pricing-parity.php` and `scripts/tier-pricing-parity-contract.ts` unchanged — pricing evaluation must not shift.

**Documentation changes.** `docs/code-map/cost-builder.md` (resolution + fail-closed), `docs/code-map/tier-instances.md` (public projection), `src/Modules/CostBuilder/CLAUDE.md`.

**Completion criteria.** New PHP test passes; pricing parity byte-identical. No fallback path exists — `rg "PRIMARY_INSTANCE_ID" src/Modules/CostBuilder src/Modules/SurfacePackages/Repositories` shows no use in resolution. **Plus the runtime acceptance gate below — Phase 7 is not complete without it.**

### Phase 7 runtime acceptance gate (mandatory, not a checklist item)

Static tests prove the resolution logic. They do not prove the real station behaves. Against a WordPress runtime carrying the production-shaped station, verify with the three real Package Families — **KAIROS, APTOS, OMNIA**:

| # | Check | Pass condition |
| --- | --- | --- |
| A1 | Each Family that owns an instance opens its **own** Tier set | KAIROS shows KAIROS occupants only; APTOS shows APTOS occupants only. No occupant appears under two Families. |
| A2 | Same-named slots are genuinely independent | KAIROS `basic` and APTOS `basic` display different `occ_…` ids and different configured values. |
| A3 | **Saving one never replaces another** | Edit + settle KAIROS `basic`; reload; APTOS `basic` is unchanged in label, price, billing cycle, selections, and `occ_…` id. Then reverse the direction and repeat. |
| A4 | Archive isolation | Archive an occupant in KAIROS; its bin entry appears in **KAIROS's** bin only. APTOS's bin count is unchanged. |
| A5 | Popular isolation | Set a popular Tier in KAIROS; APTOS's popular Tier is unchanged. |
| A6 | A Family with no instance shows setup, never borrowed data | OMNIA (the natural no-instance / no-connected-Service case — cf. the fixture at `scripts/package-tier-workspace-contract.ts:74`) renders the setup/activation state. It must **not** render KAIROS's or APTOS's Tiers, and must not render the legacy global set. |
| A7 | Unassigned instance is visible and operable | `ti_primary`, if still unassigned, lists with the unassigned state and its occupants remain readable and editable. |
| A8 | Public projection isolation | A Service in KAIROS returns KAIROS's Tiers in the Cost Builder payload; a Service in APTOS returns APTOS's; a Service in OMNIA (no instance) returns no Tier data and does not fall back. |
| A9 | Persistence across a hard refresh | Re-run A1–A3 after a full page reload — no state is transient. |

Record the outcome honestly. If no WordPress runtime is available, **Phase 7 does not sign off** — do not proceed to Phase 8 and do not report the phase complete. This gate exists because A3 is the exact regression the whole migration is for, and no static fixture can prove it against real stored data.

---

## Phase 8 — Contracts, migration proof and docs

**Purpose.** Prove the invariants, retire the legacy copy, update every affected document.

**Exact files**

| File | Action |
| --- | --- |
| `src/Modules/SurfacePackages/Repositories/PackageRepository.php` | drop `tiers` / `occupant_bin` / `popular_tier` / `popular_label` from `defaultStation()` |
| `src/Modules/SurfacePackages/Support/TierInstanceSchema.php` | `liftLegacyStation` prunes the legacy keys once the instance is persisted |
| `src/Modules/SurfacePackages/Http/PackageStationController.php` | remove the nine legacy unscoped routes |
| `tests/tier-instance-invariants.php` | **create** — the full matrix below |
| all Code Maps + local `CLAUDE.md` in §7 | update |

**Legacy retirement.** Only after Phase 7 ships and the instance shape is persisted (i.e. `station['tier_instances']` non-empty **and** `station['tiers']` has been observed identical). Prune in `liftLegacyStation` on the write path only — never on read.

**The invariant matrix.** `tests/tier-instance-invariants.php` — every item is a required assertion:

| # | Invariant | Assertion |
| --- | --- | --- |
| 1 | Migration preserves occupant ids | Full occupant arrays byte-identical pre/post lift, including `occ_…` ids |
| 2 | Migration preserves all lifecycle state | `drafts`, `module_status`, `history`, bin entries, `popular_tier`/`label`, `rate_sheet_id`, `rate_sheet_items` all identical |
| 3 | Two consumers, independent instances, same slot names | A and B both hold `basic`; distinct `occ_…`; both readable |
| 4 | Saving one instance never replaces another's occupant | Save A's `basic`; B's `basic` occupant byte-identical |
| 5 | Slot and occupant identity remain distinct | `occupant_id` never equals a slot key; slot key never appears as an entity id; `resolveOccupantSlot` returns the slot, not the occupant |
| 6 | Family scope is explicit | Family→instance resolution is a consumer match only; a fixture where provenance points one way and consumer the other resolves by **consumer** |
| 7 | Rate Sheet lookup remains `(rate_sheet_id, item_id)` | Two sheets with an identical `item_id`; each instance resolves only within its bound sheet |
| 8 | Archived / bin / history dependencies protected | The six-way `rateSheetIdsInUse` scan (Phase 4 tests 12–16) plus archive guard |
| 9 | Public projection resolves the correct instance | Phase 7 tests 1–10 |
| 10 | No platform-core Package rules introduced | Import scan: nothing under `station-manager/` or `admin-station/` references `tier_instance`, `TierInstanceSchema`, `consumer_type`, or `TIER_KEYS`; `station-manager/` imports remain Preact + its own type-only shell contract (existing boot invariant) |
| 11 | Occupant ids not re-minted | Run the full mutation suite; assert the id set is invariant |
| 12 | Empty slots are not cards | `deriveTierOccupants` still omits `occupant_id === null` |
| 13 | Legacy alias parity (pre-removal) | Each retired route's last recorded response equals its instance-scoped equivalent |

**Documentation update list** — see §7 below. All must be done in this phase.

**Completion criteria.**
- Full validation suite green (§5.4).
- Legacy routes removed; no caller remains (`rg "package-station/tiers/" resources/` empty).
- `npm run docs:check` clean; every Markdown link resolves.
- Ask the user whether a Project History document should be created (`013-…`). **Never create it automatically.**

---

# PART 5 — MIGRATION AND ROLLBACK STRATEGY

## 5.1 Migration properties

- **Read-time, in-memory, idempotent.** Same mechanism as `PackageManagerSchema::sanitizeRateSheets`'s `rs_primary` lift.
- **No write-on-read.** The lifted shape persists only when a mutation route calls `saveStation`.
- **No id reminting.** Occupant, bin, slot, and Rate Sheet ids are copied by reference.
- **Dual-write window.** Phases 2–7 keep the legacy copy present and identical. Phase 8 prunes.
- **Consumer link is never inferred silently.** Read-time lift always produces `consumer: null`; assignment is an explicit user or write-path action with the one-Family rule (§Phase 2).

## 5.2 Rollback per phase

| Phase | Rollback | Data risk |
| --- | --- | --- |
| 1 | `git revert`. Re-registering `cz_package` meta restores the (dead) registration. | None — schema only |
| 2 | `git revert`. Lift is in-memory; unwritten stations are untouched. Written stations carry a duplicate `tier_instances` key that reverted code ignores. | **None** — legacy keys still present and authoritative |
| 3 | `git revert`. Consumer assignments persist as an ignored key. | None |
| 4 | `git revert`. **Mutations made through instance routes wrote into `tier_instances`, not `tiers`** — those edits become invisible to reverted code. | **First lossy phase.** Take an option snapshot before deploying Phase 4 (below). |
| 5 | `git revert` — frontend only. | None |
| 6 | `git revert` — frontend only. | None |
| 7 | `git revert` — public projection returns to global fan-out. | None (read path) |
| 8 | `git revert` **and** restore the legacy keys from the Phase 4 snapshot. | Legacy keys pruned — snapshot required |

## 5.3 Required snapshots

**Hard gate: a production snapshot of `cz_package_station` must exist and be verified restorable BEFORE Phase 4 is deployed.** Phase 4 is the first phase where mutations land in `tier_instances` and become invisible to reverted code — a `git revert` alone no longer recovers the data. Do not deploy Phase 4 without it.

Before deploying **Phase 4** and again before **Phase 8**:

```sql
-- capture
SELECT option_value FROM wp_options WHERE option_name = 'cz_package_station';
-- restore
UPDATE wp_options SET option_value = '<snapshot>' WHERE option_name = 'cz_package_station';
```

The Health check (`SurfacePackagesModule.php:30-55`) validates the anchor after restore; extend it in Phase 1 to also sanitise `tier_instances` so a corrupt collection reports unhealthy.

## 5.4 Full validation suite (run once per phase, complete before Phase 8 sign-off)

From `wp-content/plugins/compuzign-platform/`:

```
php tests/tier-occupant-compatibility.php
php tests/tier-pricing-parity.php
php tests/package-manager-schema.php
php tests/package-category-groups.php
php tests/active-package-contract.php
php tests/service-route-baseline.php
php tests/tier-instance-schema.php            (new, P1)
php tests/tier-instance-migration.php         (new, P2)
php tests/tier-instance-consumer.php          (new, P3)
php tests/tier-instance-mutations.php         (new, P4)
php tests/tier-instance-guards.php            (new, P4)
php tests/tier-instance-public-projection.php (new, P7)
php tests/tier-instance-invariants.php        (new, P8)

npm run contract:package-tier-workspace       (rewritten, P6)
npm run contract:rate-sheet-tool
npm run contract:tier-occupant-admin
npx tsx scripts/tier-pricing-parity-contract.ts
npx tsx scripts/service-catalogue-projection-contract.ts
npx tsx scripts/tier-instance-tool-contract.ts    (new, P5)
npx tsx scripts/tier-instance-scope-contract.ts   (new, P4)
node scripts/module-state-snapshot.mjs
node scripts/mode-renderer-snapshot.mjs

npx tsc --noEmit
npm run build
npm run docs:check
```

New PHP tests must follow the existing standalone pattern — `require_once` the Support classes directly and shim `sanitize_text_field` / `sanitize_textarea_field` as `tests/tier-occupant-compatibility.php:5-7` does. No WordPress bootstrap.

**Browser verification was not available during this audit** (the same constraint recorded in 011/012). That does not make it optional here: the Phase 7 runtime acceptance gate (A1–A9, KAIROS / APTOS / OMNIA) is a required sign-off, not a deferred checklist. If no WordPress runtime is available when Phase 7 lands, stop at Phase 7, report it unverified, and do not begin Phase 8 — Phase 8 prunes the legacy Tier copy, which must not happen before independence is proven against real data.

---

# PART 6 — CONTRACT / TEST MATRIX

| Required proof | File | Phase |
| --- | --- | --- |
| Migration preserves occupant ids | `tests/tier-instance-migration.php` #2, #9 | 2 |
| Migration preserves all lifecycle state | `tests/tier-instance-migration.php` #3–6 | 2 |
| Migration is idempotent, never re-runs | `tests/tier-instance-migration.php` #7, #8 | 2 |
| No write-on-read | `tests/tier-instance-migration.php` #12 | 2 |
| Consumer link never guessed | `tests/tier-instance-migration.php` #10, #11 | 2 |
| Consumer type/id validated | `tests/tier-instance-consumer.php` #1–3 | 3 |
| One consumer, one instance | `tests/tier-instance-consumer.php` #4 | 3 |
| Consumer deletion guarded | `tests/tier-instance-consumer.php` #6–8 | 3 |
| Two consumers, independent instances, same slot names | `tests/tier-instance-mutations.php` #2; `tests/tier-instance-invariants.php` #3 | 4, 8 |
| Saving one instance never replaces another's occupant | `tests/tier-instance-mutations.php` #1, #3–7; invariants #4 | 4, 8 |
| Instance scoped before slot resolution | `tests/tier-instance-mutations.php` #8; `scripts/tier-instance-scope-contract.ts` | 4 |
| Slot vs occupant identity distinct | `tests/tier-instance-invariants.php` #5, #12 | 8 |
| Occupant ids never re-minted | `tests/tier-instance-invariants.php` #11 | 8 |
| Rate Sheet lookup stays `(rate_sheet_id, item_id)` | `tests/tier-instance-invariants.php` #7 | 8 |
| Archived / bin / history / draft / allow-list deps protected | `tests/tier-instance-guards.php` #12–16 | 4 |
| Instance deletion guarded | `tests/tier-instance-guards.php` #17, #18 | 4 |
| Family scope explicit, not inferred | `scripts/package-tier-workspace-contract.ts` #1–6; invariants #6 | 6, 8 |
| Provenance-filter symbols removed | `scripts/package-tier-workspace-contract.ts` #8 | 6 |
| Family Group hosts no Tier logic | `scripts/package-tier-workspace-contract.ts` #9 | 6 |
| Tool eligibility / allowed-sheet / five-slot rules | `scripts/tier-instance-tool-contract.ts` #1–6 | 5 |
| Public projection resolves the correct instance | `tests/tier-instance-public-projection.php` #1–2, #9–10 | 7 |
| Public projection fails closed | `tests/tier-instance-public-projection.php` #3–8 | 7 |
| Pricing evaluation unchanged | `tests/tier-pricing-parity.php`, `scripts/tier-pricing-parity-contract.ts` | 7 |
| No platform-core Package rules introduced | `tests/tier-instance-invariants.php` #10 | 8 |
| Legacy alias parity | `tests/tier-instance-invariants.php` #13 | 8 |

**Contracts to preserve unchanged:** `tests/tier-occupant-compatibility.php`, `tests/tier-pricing-parity.php` + fixtures, `tests/package-manager-schema.php`, `npm run contract:rate-sheet-tool`, `scripts/tier-occupant-admin-contract.ts` (extend only), both snapshot suites (must stay byte-identical).

**Contracts to rewrite:** `scripts/package-tier-workspace-contract.ts` — its lines 36–102 encode the obsolete provenance model, and line 88–92 asserts the exact behaviour now forbidden.

---

# PART 7 — DOCUMENTATION UPDATE LIST

## Create

| File | Content | Phase |
| --- | --- | --- |
| `docs/code-map/tier-instances.md` | Canonical schema, consumer contract, cardinality, migration, routes, guards, public resolution, validation. < 600 words. | 1, extended 2–8 |

## Index

| File | Change | Phase |
| --- | --- | --- |
| `docs/code-map/000-README.md` | Add `Tier Instances` under "Catalogue and commercial domains" — **exactly once** | 1 |

## Update

| File | What changes | Phase |
| --- | --- | --- |
| `docs/code-map/tiers.md` | Delete the provenance-filter sentence (line 18) and "A Package Family is working scope only…" (line 24). Replace with explicit consumer resolution. Add instance scoping to the mutation section. Update the Validation command list. | 4, 6 |
| `docs/code-map/package-station.md` | New Tier-instance route family; `surface/tierInstance/`; retirement of the `cz_package` meta registration | 1, 3, 5 |
| `docs/code-map/package-manager.md` | `PackageCategoryGroups::dependents` gains `tier_instances`; `TierInstanceSchema` in the Support inventory | 3 |
| `docs/code-map/rate-sheet.md` | Widened `rateSheetIdsInUse` guard; archive guard; `allowed_rate_sheet_ids`; `rs_primary`/`ti_primary` symmetry | 2, 4 |
| `docs/code-map/cost-builder.md` | Instance resolution chain, four fail-closed rules, ambiguity rule, read-model hoist | 7 |
| `docs/code-map/lifecycle-system.md` | `usePackageStation` is instance-scoped; per-instance readiness vs station aggregate | 4, 5 |
| `docs/code-map/admin-station-surface-binding.md` | Only if the `packages/tier-tool` binding changes (it should not) | 5 |
| `src/Modules/SurfacePackages/CLAUDE.md` | `TierInstanceSchema` in the ownership list; new routes; instance-scoping boundary; updated validation commands | 1, 3, 4 |
| `resources/ts/package-station/CLAUDE.md` | `surface/tierInstance/` entry; `usePackageStation` signature; boundary note that Family surfaces host no Tier logic | 5, 6 |
| `src/Modules/CostBuilder/CLAUDE.md` | Instance-resolved package map; fail-closed | 7 |

## Do not touch

- `docs/project-history/*` — immutable. 003, 011, 012 stay closed even though this work supersedes their decisions.
- `docs/architecture/*` — `CommercialModel-v1.md` §5 ("Tiers compose Commercial Groups… into customer-facing offers") remains true and is **not** contradicted by instances. `TierModuleL5MigrationSpec-v1.md` is already labelled superseded.
- `AGENTS.md`, `docs/ai-index.md`, `CLAUDE.md` — no repository-standard change is needed.

## Ask, never assume

At Phase 8 completion, ask whether a Project History document should be created. If approved: `docs/project-history/013-<slug>.md`, next sequential number, the required template, 300–1,000 words, linking 003/011/012 as Related History without editing them.

---

# PART 8 — THINGS THE IMPLEMENTATION AGENT MUST NOT DO

**Ownership and boundaries**

1. Do not move Tier lifecycle, validation, drawers, editors, or pricing into Family Group, Service Station, Admin Station, Station Manager, `drawer-kit/`, or `entity-drawers/`.
2. Do not store any Tier data on a Package Family record. `category_groups[]` gains **no** Tier field. The only new coupling is `dependents.tier_instances` (a derived count).
3. Do not register anything Tier-related with Station Manager beyond what already exists. Station Manager stays domain-agnostic; its boot invariants (`docs/code-map/station-manager.md`) are untouched.
4. Do not add Tier logic to `admin-station/`. Admin authors placement by string key only.
5. Do not resurrect the Command Centre, `DynamicStationManager`, `StepContext`, `ActionConfig`, or `components/admin/relations`.

**Identity**

6. Do not convert slot ids into Tier ids, or Tier-instance ids into occupant ids.
7. Do not re-mint, prefix, namespace, or hash any `occ_…` id. `PackageSchema::upsertOccupant:1218` is not to be edited.
8. Do not derive occupant ids from `tier_instance_id`.
9. Do not change the five fixed slot keys, their order, or `PackageSchema::ALLOWED_TIERS`.
10. Do not make empty slots into cards. `deriveTierOccupants`' omission of `occupant_id === null` stays.

**Migration**

11. Do not write during a read. `loadStation()` must not call `update_option` for the lift.
12. Do not run the lift more than once — a station with a non-empty `tier_instances` is returned unchanged.
13. Do not guess the primary instance's consumer. Zero or 2+ candidate Families ⇒ unassigned, full stop.
14. Do not delete, prune, or rewrite `station['tiers']`, `occupant_bin`, `popular_tier`, or `popular_label` before Phase 8.
15. Do not call `ensureTierLifecycle`, `ensureOccupantBin`, `normaliseTierSlot`, or `upsertOccupant` inside the lift.
16. Do not touch `history` beyond copying it. Do not build features on the assumption it contains data.

**Scope**

17. Do not build a generic CRUD engine, a generic ownership registry, a polymorphic consumer resolver interface, or a consumer-type plugin table.
18. Do not add a second `consumer_type` before a second consumer genuinely exists. `CONSUMER_TYPES` has exactly one member.
19. Do not add multi-instance-per-consumer. Cardinality is one; `title` exists so the rule can be relaxed later without a shape change.
20. Do not scope promotions per instance. `station['promotions']` and `ALLOWED_BASED_ON` are out of scope.
21. Do not touch `CostBuilder/Support/MetaSchema.php::ALLOWED_TIERS` — that is legacy Service-side XLSX pricing, not Package-owned.
22. Do not add a new drawer template, a second Tier composition, or a second Tier workspace kit.
23. Do not repurpose `useHostService` as consumer routing.

**Rate Sheets**

24. Do not infer Tier ownership from Rate Sheet selections, row provenance, or `source_service_id` — anywhere, for any purpose, including "just for the empty state".
25. Do not scan across sheets. Row identity stays `(rate_sheet_id, item_id)`; `findRateSheet` returning `null` must keep resolving nothing.
26. Do not remove or weaken clear-on-switch (`upsertOccupant:1208-1214`, `settleTierSlot:1713-1721`).
27. Do not turn `allowed_rate_sheet_ids` into exclusivity. Two instances may bind the same sheet.

**Public projection**

28. Do not fall back to `ti_primary`, to the legacy global set, to "the first instance", or to another consumer's instance when resolution fails.
29. Do not pick one when a Service resolves to multiple instances — fail closed.
30. Do not change `PricingBuilder::overlayPackage` or `PackageSchema::extractTierForCostBuilder`.

**Process**

31. Do not weaken or delete a preserved contract to make a new one pass. `scripts/package-tier-workspace-contract.ts` is *replaced* deliberately; nothing else is.
32. Do not change the module-state or mode-renderer snapshots. They must stay byte-identical.
33. Do not create a Project History document automatically — ask first.
34. Do not edit any file under `docs/project-history/`.
35. Do not claim PHP, browser, or integration verification that was not actually run.
36. Do not combine phases into one commit, and do not push.
37. Do not deploy Phase 4 without a verified, restorable production snapshot of `cz_package_station`.
38. Do not sign off Phase 7 without the A1–A9 runtime acceptance gate against KAIROS, APTOS, and OMNIA. Do not begin Phase 8 until it passes — Phase 8 prunes the legacy Tier copy.
39. Do not redesign. The canonical model, consumer contract, cardinality, migration rule, and phase boundaries in this document are settled decisions, not starting points. If something appears wrong, stop and raise it — do not resolve it by changing the design mid-phase.
