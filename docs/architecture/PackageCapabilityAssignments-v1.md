# Package Station Capability Architecture — Re-Audit and Execution Blueprint

**Status:** Current — accepted execution blueprint, not yet implemented.
**Supersedes:** [TierInstanceBlueprint-v1.md](TierInstanceBlueprint-v1.md) (the rejected consumer-field design, retained for the record).
**Date:** 2026-07-25 · **Audit tree:** `main` @ `aef0cf2`, clean.

**Scope of the name.** The settled architecture is about **Package-owned capability instances related to Package entities through explicit, Station-owned assignment records**. Tier is the first implementation, not the boundary of the pattern. No generic capability framework is built here — see B0 and D4.

Part A is the audit (verified facts carry path + symbol). Part B is the execution blueprint. Part C is the discard/keep ledger against the superseded document. Part D records the decisions, all resolved.

---

# PART A — AUDIT

## A1. The repository already named this exact case

`docs/ai-index.md` lines 27–36:

> **registered** with the platform → **available** to a Station → **activated** for an owning entity. *Activation records are stored by the owning Station, never in generic shared business storage.* … per-entity activation … are **reserved documentation seams. Do not build them before a real consumer exists.**

`docs/architecture/station-manager-consolidation-v1.md` — **Status: LOCKED** — Q6 item 4 (line 183):

> **"Per-entity activation ("Tier tool activated for KAIROS") — no ledger anywhere; when built, the mechanism is the Manager's, the records live in the owning Station's storage."**

**Verified: no activation code exists.** The only `activation*` symbols in `station-manager/` are `NavItem.activationKey` (`registry/navigation.ts:9`, `registry/boot.ts:59-62`) — navigation→destination routing, unrelated. `StationConditions` (`registry/destinations.ts:7`) has no evaluator; every registration sets only `scope: 'current'`.

## A2. Tier storage today

One option `cz_package_station` (`PackageRepository::OPTION_KEY`, line 42). `defaultStation()` (line 151) holds **global** `tiers`, `occupant_bin`, `popular_tier`, `popular_label`. Five fixed slots (`PackageSchema::ALLOWED_TIERS`, line 37). Occupant id `'occ_' . bin2hex(random_bytes(4))` minted once, preserved via `$existingId ??` (line 1218). `history` carried but never appended to. Public projection maps one station to every covered Service (lines 423–425).

## A3. Package Family is already independent — the source agrees with the new rule

`PackageCategoryGroups::sanitizeAll` (lines 68–77) emits exactly `group_id, label, description, platform_status, previous_platform_status, module_status.overview, overview_draft, sort_order`. **Zero Tier fields.**

Readiness is `packageFamilyOverviewModule.resolveStatus` (`moduleNotifications/packageFamily.ts:20-27`) — a function of name + module transition + platform status **only**. `packageFamilyRelationshipsModule` (lines 36–42) has `problems: () => []`; zero dependents renders an `emptyPrompt`, never an error.

**Rule 3 is already satisfied by the source.** The prior blueprint would have broken it.

## A4. Family lifecycle, traced

| Step | Backend | Frontend |
| --- | --- | --- |
| Create | `PackageFamiliesController::createGroup` (167) → `PackageCategoryGroups::create` (100). Born `disabled`, overview `pending`. | **`createPackageFamily` (`api.ts:35`) has ZERO callers.** |
| Draft | `saveOverview` → `saveOverviewDraft` (148) | `usePackageFamilyStation.saveOverview` (64) |
| Settle | `settleOverview` (162) | `settleOverview` (78) |
| Publish | no route — composed client-side | `publishFamily` (90) = settle **then** status→active |
| Archive/Trash/Restore | `updateStatus` (217), `restoreGroup` (225) | `applyStatus` (104), `restoreFamily` (116) |
| Delete | `permanentDeleteGroup` (238): trashed-only **and** `array_sum($dependents) === 0` → else 409 | `deleteFamily` (128) |
| Display | `listGroups` (137) + `projection()` + `related_service_ids` | `usePackageFamilyCards` → Admin `category-group-cards` kit, bound to **`stationId: 'services'`** (`admin-station/register.ts:61-74`), intents: `view` only |
| Select in workspace | — | `PackageFamilyScope.tsx`, transient `<select>`, writes nothing |

**Correction to an earlier statement in this audit.** An earlier draft said "Family creation never existed". That was wrong. Family creation authority, a mature create composition, its host adapter, its drawer registration and its action intent **all existed and worked** — KAIROS, APTOS and OMNIA were created through it and their records survive in `package_manager.category_groups[]`. What is true today is narrower and is the accurate finding:

> **The current Package/Admin Station has no *connected* Family creation surface, even though the creation authority and the earlier composition both still exist — the authority in the tree, the composition in git history.**

Full reconstruction in §A8.

## A5. The drawer already has the right panel with an empty action slot

`packageFamilyRelationshipsShell` (`drawer/schema/bindings/packageFamily.tsx:65-82`):

```ts
header: { title: 'Connected Records',
          subtitle: 'Live Package Station relationships using this Family.' }
content: [ services, rate-sheet-rows, tier-selections ]
footer: { actions: [] }     // empty
actions: {}                 // empty
```

Placed on the Connections tab (`entities/packageFamily.ts:35`). Module actions use `ShellActionSchema` with a `when` predicate — live precedent in the same file (lines 10–16): `'discard-draft': { …, when: (binding) => binding.hasDraft }`.

`CanonicalEntityFooter` (`drawer-kit/CanonicalEntityFooter.tsx`) is a **shared** grammar used by Package Family *and* Category (status split + overflow + Publish + Close). It has no extension slot and must not gain one.

## A6. The repository's assignment idiom

One idiom only — an explicit stored field on a join row, never on either endpoint entity:

```php
// PackageStationSchema::sanitizeSourceRelationships (44-79)
'relationship_id' => 'source_' . substr(hash('sha256', $identity), 0, 16),  // derived
'category_group_id' => $categoryGroupId !== '' ? $categoryGroupId : null,   // the assignment
```

with reassign-not-delete on an unknown Family (`PackageManagerSchema::sanitize` 107–113).

## A7. Drawer / intent contracts (verified, needed for Phase 6)

- `DrawerContentProps` (`station-manager/drawerTypes.ts`): `recordId: StationRecordId` **required**, `mode: 'view'|'edit'`, `onClose`, `onModeChange`, `onSaved`, `setFooter?`, `setCloseGuard?`.
- `AdminStationDrawer` clamps the requested mode to `template.supportedModes` (lines 117–121) and keys content by template + recordId.
- `StationSurfaceHost` dispatches `onIntent(recordId, intentId)` and passes the id through untouched.
- `TemplateKitProps` = `{ items, loading, error, onIntent }` — **kits cannot see which intents a binding declares.**
- `StationPresentationShell.tsx:49-52` **already holds the binding** and renders `binding.title` in a wall header before mounting `StationSurfaceHost`. This is the surface-level action seam.
- `StationActionIntent.drawerTemplateKey?` is an in-repo precedent for extending that interface with an optional per-intent coordination field.
- **No create sentinel exists today.** History 011 used a `'new'` sentinel that creation drawers ignored; those drawers are gone (`entity-drawers/` now holds only Category + shared).

## A8. The earlier Family creation path — what existed and exactly what disconnected it

### A8.1 It was built, committed, and then reverted

```text
e544aee  feat: add package tier workspace lower deck            ← Project History 011
c0eda40  fix: complete package tier workspace rate sheet flows  ← Project History 012
47fa2e9  Revert "fix: complete package tier workspace rate sheet flows"
edb5957  Revert "feat: add package tier workspace lower deck"   ← deletes the create composition
34c8175  chore: remove legacy Command Centre
…  peer-Station re-host (2859d9f, 85e4754, 10f5e32, 026db48)
39d8a3c  feat: add focused-Tier lower deck to the Tier Workspace Engine   ← re-implemented READ lanes only
ee96be4 / 6b2f3ca / 631b5fe  Rate Sheet authoring returns via a different route
```

**Both milestone 011 and milestone 012 were reverted in full.** The lower deck was later re-implemented (`39d8a3c`) with its Details/Connections read lanes, but **none of the three creation surfaces came back**. Rate Sheet authoring returned separately as the `rate-sheet` collection drawer. Package Family creation never did.

That is why `TierLowerDeck.tsx:340` reads *"Package Families are edited from the Services workspace; no creation action is registered here."* — an **honest placeholder for a reverted capability**, not a design decision.

### A8.2 What existed (recoverable verbatim from `c0eda40`)

| Artefact | Path at `c0eda40` | Status now |
| --- | --- | --- |
| Create composition | `resources/ts/entity-drawers/package-family/PackageFamilyCreateContent.tsx` | deleted by `edb5957` |
| Host adapter | `resources/ts/admin-station/stations/packageFamily/PackageFamilyCreateDrawerHost.tsx` | deleted by `edb5957` |
| Drawer registration | `drawerRegistry.tsx` → `'package-family-create'` | deleted |
| Action intent | `surfaceBindings.ts` → `{ id: 'create-package-family', target: 'drawer', mode: 'edit', drawerTemplateKey: 'package-family-create' }` | deleted |
| Creation authority | `createPackageFamily()` → `PackageFamiliesController::createGroup` | **alive and unchanged** |

The composition's own header records its lineage: *"The mature create form behaviour (previously `CreatePackageFamilyDrawerStep` in the Command Centre's `serviceManagerDrawers`) recovered against the neutral bridge."* So the flow survived one re-host already (Command Centre → entity-drawers) before being lost to a revert.

Its shape:

```tsx
PackageFamilyCreateContent({ create, bridge })
  // name + description; footer Cancel / "Create Package Family"
  // on success: bridge.onMutationComplete?.() then bridge.close()   ← silent auto-close
```

The host adapter injects the command and nothing else:

```tsx
const create = async (draft) => {
  try { await createPackageFamily({ name: draft.name, description: draft.description || undefined });
        return { ok: true }; }
  catch (cause) { return { ok: false, message: … }; }
};
return <PackageFamilyCreateContent create={create} bridge={bridge} />;
```

Registration, with its rationale preserved in the comment:

```ts
// Creation surfaces … Each names no existing record — the content ignores the
// dispatched recordId — and supports only 'edit' because a create form has no
// read-only tab.
'package-family-create': { key, title: 'New Package Family', supportedModes: ['edit'], content: … }
```

### A8.3 The dispatch mechanism — and why no Station Manager change is needed

The binding comment at `c0eda40` states it exactly:

> *"Lower deck (Settings): manager-level creation surfaces. Creation names no existing record; **the kit dispatches the stable `'new'` sentinel and the create drawers ignore it**."*

So creation was dispatched **from inside the tier-workspace kit** via its own `onIntent('new', 'create-package-family')`, routed by the per-intent `drawerTemplateKey`. **The kit needed no knowledge of the binding, and Station Manager needed no new contract.**

`StationActionIntent.drawerTemplateKey` still exists in today's `station-manager/registry/surfaceBindings.ts` and is already in live use for the `rate-sheet` intent (`admin-station/register.ts:104`). **The entire routing mechanism the old flow used is intact.**

### A8.4 Can it be safely re-hosted? Yes

| Dependency of the old composition | Available today? |
| --- | --- |
| `createPackageFamily` endpoint | ✅ `package-station/api.ts:35`, unchanged |
| `PackageFamiliesController::createGroup` | ✅ unchanged |
| `EntityDrawerHostBridge` | ✅ `drawer-kit/entityDrawerHost.ts` |
| `DrawerContentProps` → bridge mapping | ✅ same pattern live in `TierDrawerHost.tsx:37-44` and `PackageFamilyDrawerContent.tsx:27-32` |
| Drawer registration with `supportedModes: ['edit']` | ✅ `registerDrawerTemplates`; shell clamps mode (`AdminStationDrawer.tsx:117-121`) |
| Per-intent `drawerTemplateKey` routing | ✅ in use today |
| `'new'` sentinel passed through untouched | ✅ `StationSurfaceHost` passes `recordId` through without inspection |
| CSS classes (`cz-tf-form`, `cz-tf-field`, `cz-tf-input`, `cz-tf-footer`) | ✅ still present in `admin-station.css` |

**No blocker.** Phase 6 is a **re-host of an existing composition into the Package Station peer**, plus one genuinely new capability: the success stage that carries the optional Tier prompt. It is not a new creation system, and `PackageFamilyOverviewEditor` already covers the same two fields if the form is consolidated.

### A8.5 Documentation-accuracy finding (needs your decision)

Project History **011** and **012** describe milestones whose code was **reverted in full** (`47fa2e9`, `edb5957`). Both documents state at their own creation that the work existed only as an uncommitted working tree; it was later committed and then reverted. They therefore describe capability the tree does not have — notably the three creation surfaces, the rate-sheet-row drawer, and `rateSheetProjection.ts`.

`docs/project-history/000-README.md:59` requires explicit user approval to correct a factual error in a closed record, so I have changed nothing. See **D5**.

---

# PART B — EXECUTION BLUEPRINT

## B0. Settled model

### Final architectural shape

```text
Package Station
├─ category_groups[]
├─ rate_sheets[]
├─ tier_instances[]
└─ tier_assignments[]
```

```text
Tier instance
→ owns Tier configuration and occupant lifecycle

Tier assignment
→ records that a Family currently uses that instance

Family
→ remains valid without either
```

### HARD ARCHITECTURE INVARIANT — peer-to-peer relation

```text
Package Family  ← tier_assignment →  Tier Instance
```

**Neither side becomes the child of the other.**

> **Package entities and Package capability instances relate peer-to-peer through explicit Station-owned relationship records. Capability use must not create parent-child storage ownership between them.**

```text
Package Family
→ remains an independent Package entity

Tier Instance
→ remains an independent Package-owned capability record

Tier Assignment
→ records the direct relationship between those two peers
```

Consequences, each individually enforced by contract (see B0.1):

- Tier data is **not** embedded inside the Family.
- Family data is **not** embedded inside the Tier instance.
- Removing the assignment leaves **both** records intact.
- Archiving one record does not silently mutate the other.
- The assignment can be inspected, guarded and removed **independently**.
- Future Package tools can establish their own direct relationships **without turning the Family into a tool container**.
- Public resolution follows the **assignment edge** — never ownership inference, never nesting.

This invariant is what the `tier_assignments[]` ledger exists to preserve. Any change that would satisfy a requirement by adding a field to `category_groups[]` or to `tier_instances[]` violates it and must be rejected, however convenient.

### B0.1 Peer-isolation contract set

Three checks, run as one suite and referenced by the phase that first makes each reachable. New file `tests/package-capability-peer-isolation.php`, introduced in Phase 3 and extended in Phases 4 and 6.

| Check | Assertion | Introduced |
| --- | --- | --- |
| **P1** `delete assignment` | Deep-equal the Family record and the Tier instance record before and after `unassign()`. **Both byte-identical.** Only the `tier_assignments[]` array differs, by exactly one removed row. | Phase 3 |
| **P2** `edit Tier instance` | Run every instance mutation (occupant save, settle, revert, enabled toggle, popular, archive, restore, trash, bin delete, `allowed_rate_sheet_ids` change, title/status change). Deep-equal the Family record before and after each. **Unchanged in all cases.** | Phase 4 |
| **P3** `edit Family` | Run every Family mutation (overview draft save, settle, revert, publish, status change, archive, trash, restore). Deep-equal the Tier instance record before and after each. **Unchanged in all cases**, including `tiers{}`, `occupant_bin[]`, `popular_*` and `allowed_rate_sheet_ids`. | Phase 6 |

Two structural scans accompany them:

- **P4** `PackageCategoryGroups::sanitizeAll` emits no key matching `/^tier/` and no key matching `/assignment/`.
- **P5** `TierInstanceSchema::sanitizeInstance` emits no key matching `/^consumer/`, `/family/`, or `/group/`.

P4 and P5 are the storage-level statement of the invariant: neither peer's sanitiser can even represent the other.

### Storage detail

```text
cz_package_station
├─ package_manager { sources[], groups[], category_groups[], items[], rate_sheets[] }
├─ tier_instances[]        ← capability INSTANCE. Knows nothing about consumers.
│   ├─ tier_instance_id    'ti_…'  ('ti_primary' migrated)
│   ├─ title · status · allowed_rate_sheet_ids[]
│   ├─ popular_tier · popular_label
│   ├─ tiers { basic|standard|premium|enterprise|ultimate }   ← slot shape UNCHANGED
│   └─ occupant_bin[]                                         ← entry shape UNCHANGED
└─ tier_assignments[]      ← the removable USAGE edge (the activation ledger)
    ├─ assignment_id       derived 'tasg_' . sha256("{type}:{id}:{instance}")[0:16]
    ├─ consumer_type       ∈ TIER_CONSUMER_TYPES = ['package_family']
    ├─ consumer_id
    └─ tier_instance_id
```

**Settled rules** (implementer chooses nothing):

1. `TIER_CONSUMER_TYPES = ['package_family']`. No `capability_key`. No generic ledger.
2. At most one assignment per `(consumer_type, consumer_id)`.
3. At most one assignment per `tier_instance_id`. Sharing is *representable* and *denied* — the audit found no case requiring it.
4. Unassigned instances are valid and fully operable.
5. Deleting an assignment never touches the instance.
6. Deleting a Family is blocked while an assignment exists; remedy is "Remove Tier capability".
7. Deleting a Tier instance is blocked while any assignment references it.
8. **Archiving or trashing a Family leaves the assignment dormant** — see B1.
9. Assignment is never inferred from Rate Sheet provenance or Service provenance.
10. `allowed_rate_sheet_ids` stays on the **instance** (verified instance configuration — `TierDrawerContent.tsx:224-227` filters by sheet status + current binding, with no consumer input).

## B1. Archive rule and its rationale

**Decision: archiving or trashing a Family keeps its assignment dormant. Only permanent deletion requires removal.**

Grounded in three existing conventions:

- `PackageCategoryGroups::applyStatus` (219) changes only status; it never touches `package_manager.sources[]`, so **archiving a Family already preserves its Service assignments**. Tier assignment behaves the same way.
- Only `delete` (261) enforces the dependency guard. Archive and trash are reversible; delete is terminal.
- `StationLifecycle::restore` lands archived|trashed → `disabled`, so a restored Family returns inactive and its Tiers stay unpublished until it is re-activated.

Public safety is automatic: projection requires the Family to be active (§B10), so a dormant assignment publishes nothing. Forcing a detach on archive would destroy the decision and make restore lossy.

## B2. Phase list

| # | Phase | Commit |
| --- | --- | --- |
| 1 | Tier Instance canonical schema (+ retire the duplicate `cz_package` schema) | `feat(packages): Tier Instance canonical schema` |
| 2 | Legacy Tier migration to `ti_primary` | `feat(packages): migrate the global Tier system to ti_primary` |
| 3 | Tier Assignment schema and authority | `feat(packages): Tier assignment ledger` |
| 4 | Instance-scoped backend mutations and guards | `feat(packages): scope Tier mutations by instance` |
| 5 | Package-owned Tier Tool and assignment management | `feat(packages): Tier tool instance + assignment management` |
| 6 | **Package Family creation surface and optional-capability UX** | `feat(packages): Package Family creation and optional Tier capability` |
| 7 | Family workspace explicit assignment resolution | `feat(packages): resolve Family Tier by assignment` |
| 8 | Public projection | `feat(packages): consumer-resolved public Tier projection` |
| 9 | Runtime acceptance, compatibility retirement, documentation | `docs(packages): Tier capability model — maps and retirement` |

One commit per phase. No push. Snapshot gate before Phase 4; runtime gate after Phase 8.

---

## Phase 1 — Tier Instance canonical schema

**Purpose.** Define the instance schema and remove the competing Tier schema before any data moves.

**Files**

| File | Action |
| --- | --- |
| `src/Modules/SurfacePackages/Support/TierInstanceSchema.php` | create (< 400 lines) |
| `src/Modules/SurfacePackages/Support/PackageSchema.php` | edit — retire `registerPostMeta()`, `sanitize()`, `defaultPackage()`, `sanitizeTiers()`, `sanitizeType()`, `sanitizeServiceRefs()`, `sanitizeContexts()`, `sanitizeBundle()`, `sanitizeDatetime()`, `sanitizeFaqRefs()`, `sanitizePopularTier()`, `sanitizePopularLabel()`; update FILE INDEX |
| `src/Modules/SurfacePackages/SurfacePackagesModule.php` | edit — drop `(new PackageSchema())->register();` (line 25); extend the Health check to sanitise `tier_instances` |
| `resources/ts/package-station/types.ts` | add `TierInstanceSummary` |
| `tests/tier-instance-schema.php` | create |

**Symbols**

```php
public const PRIMARY_INSTANCE_ID = 'ti_primary';
public const ALLOWED_STATUSES    = StationLifecycle::STATUSES;   // reuse

public static function defaultInstances(): array;
public static function sanitizeInstances(mixed $instances): array;
public static function sanitizeInstance(mixed $instance): ?array;
public static function mintInstanceId(): string;                 // 'ti_' . bin2hex(random_bytes(6))
public static function findInstance(array $instances, ?string $id): ?array;
public static function upsertInstance(array $instances, array $instance): array;
public static function removeInstance(array $instances, string $id): array;
public static function emptyTierMap(): array;
public static function sanitizeAllowedRateSheetIds(mixed $ids, array $rateSheets): array;
public static function deriveInstanceStatus(array $instance): string;
public static function deriveStationStatusFromInstances(array $instances): string;
```

**Note the absence:** no `consumer`, no `sanitizeConsumer`, no `consumerRegistryFor`. The instance schema has no consumer vocabulary at all.

**Retirement guard.** Retire only after all four greps are empty outside the file itself: `rg "PackageSchema::sanitize\(" src/ tests/`, `rg "defaultPackage" src/ resources/ tests/`, `rg "cz_package'" src/`, `rg "registerPostMeta" src/`. `ALLOWED_TIERS`, `TIER_MODULES`, `ALLOWED_MODULE_STATUSES`, `ALLOWED_PLATFORM_STATUSES`, `ALLOWED_BASED_ON`, `PROMOTION_MODULES` and the `TIER_OCCUPANTS`/`TIER_LIFECYCLE`/`OCCUPANT_BIN`/`PROMOTION_SCHEMA` sections **stay**. `cz_surface_package` stays registered in `PostTypeRegistrar.php:14`.

**Tests** (`tests/tier-instance-schema.php`): empty → `[]`; instance without id dropped; duplicate ids first-wins; `emptyTierMap()` returns the five `ALLOWED_TIERS` keys in order; `sanitizeAllowedRateSheetIds` drops unknown ids, dedupes, preserves order; `deriveInstanceStatus` active iff a slot holds a live active occupant; idempotence; `mintInstanceId()` matches `/^ti_[0-9a-f]{12}$/` and is never called by a sanitiser; **no key named `consumer*` is ever emitted**.

**Docs.** Create `docs/code-map/tier-capability.md`; index once in `docs/code-map/000-README.md`. Update `src/Modules/SurfacePackages/CLAUDE.md`.

**Completion.** New test passes; all pre-existing tests unchanged; `rg "register_post_meta\('cz_surface_package'" src/` empty; `npx tsc --noEmit`, `npm run build`, `npm run docs:check` clean. Nothing reads or writes `tier_instances` yet.

---

## Phase 2 — Legacy Tier migration to `ti_primary`

**Purpose.** Lift the global Tier system into one instance, byte-for-byte, with **no usage decision written**.

**Files:** `TierInstanceSchema.php` (add `liftLegacyStation`), `PackageRepository.php` (`loadStation()` applies the lift; `defaultStation()` gains `'tier_instances' => []`), `tests/tier-instance-migration.php` (create).

```php
/** In-memory lift. Never mints an occupant/bin/slot id. Never writes. Idempotent. */
public static function liftLegacyStation(array $station): array;
```

1. If `$station['tier_instances']` is a non-empty array → return unchanged. The lift runs once, ever.
2. Otherwise build one instance: `tier_instance_id => 'ti_primary'`, `title => 'Primary Tier Set'`, `status => $station['platform_status'] ?? 'disabled'`, `allowed_rate_sheet_ids => []`, `popular_tier`/`popular_label` copied, `tiers => $station['tiers'] ?? []` **verbatim**, `occupant_bin => $station['occupant_bin'] ?? []` **verbatim**.
3. Legacy keys stay in place until Phase 9.

**Preservation.** Assign `tiers`/`occupant_bin` by copy, never rebuild. **Do not call** `ensureTierLifecycle`, `ensureOccupantBin`, `normaliseTierSlot`, or `upsertOccupant` during the lift. That mechanically preserves slot keys, `occ_…` ids, occupant field order, `history`, `drafts`, `module_status`, `bin_id`, `origin_tier`, `previous_enabled`, `displaced_at`, `rate_sheet_id`, and every `rate_sheet_items` entry.

**No write-on-read.** `loadStation()` mutates only the returned array and `$stationCache`; it must **not** call `update_option`. (Deliberately unlike `ensurePromotions`, `PackageRepository.php:138`, which does write.) The lifted shape persists on the next mutation.

**No consumer inference at all.** `ti_primary` is created **unassigned**, and unassigned is a first-class valid state. The prior blueprint's `inferPrimaryConsumer` is deleted, not relocated. A *suggestion* is offered in the Tier tool (Phase 5) and requires an explicit click.

**Tests:** one legacy station lifts to exactly one `ti_primary`; occupant arrays byte-identical including `occ_…`; drafts/`module_status`/`history` preserved per slot including `null` drafts; bin entries preserved field-for-field; `popular_*` carried; each occupant's `rate_sheet_id` + `rate_sheet_items` preserved; `lift(lift(x)) === lift(x)`; a station that already has `tier_instances` is returned unchanged; empty station lifts to one instance with `emptyTierMap()`; **the lifted station contains no `tier_assignments` entries**; no-write proof via an `update_option` double.

**Completion.** New test passes; `tests/service-route-baseline.php` shows no endpoint response change.

---

## Phase 3 — Tier Assignment schema and authority

**Purpose.** The removable usage edge, as its own Package-owned collection.

**Files**

| File | Action |
| --- | --- |
| `src/Modules/SurfacePackages/Support/TierAssignmentSchema.php` | create |
| `src/Modules/SurfacePackages/Http/PackageStationController.php` | add the assignment route family |
| `src/Modules/SurfacePackages/Repositories/PackageRepository.php` | `defaultStation()` gains `'tier_assignments' => []` |
| `src/Modules/SurfacePackages/Support/PackageCategoryGroups.php` | add a **separate** `tierAssignmentCount()` helper — **not** folded into `dependents()` |
| `src/Modules/SurfacePackages/Http/PackageFamiliesController.php` | delete guard consults the assignment count |
| `src/Modules/SurfacePackages/SurfacePackagesModule.php` | add the D1 health assertion (read-only; see below) |
| `resources/ts/package-station/api.ts`, `types.ts` | typed calls + contracts |
| `tests/tier-assignment-schema.php` | create |
| `tests/package-capability-peer-isolation.php` | create — **P1, P4, P5** (B0.1); extended in Phases 4 and 6 |

**Symbols**

```php
final class TierAssignmentSchema {
  public const CONSUMER_TYPES = ['package_family'];

  public static function deriveAssignmentId(string $type, string $id, string $instanceId): string;
      // 'tasg_' . substr(hash('sha256', "{$type}:{$id}:{$instanceId}"), 0, 16)   ← relationship_id precedent
  public static function sanitizeAssignments(mixed $rows, array $consumerRegistry, array $instances): array;
  public static function findForConsumer(array $rows, string $type, string $id): ?array;
  public static function findForInstance(array $rows, string $instanceId): ?array;
  public static function assign(array $rows, string $type, string $id, string $instanceId, array $registry, array $instances): array;
      // errors: unknown_consumer_type | unknown_consumer | unknown_tier_instance
      //       | consumer_already_assigned | instance_already_assigned
  public static function unassign(array $rows, string $assignmentId): array;   // error: unknown_assignment
  public static function consumerRegistryFor(string $type, array $manager): array;
      // 'package_family' → PackageCategoryGroups::idSet($manager['category_groups'])
}
```

**Sanitisation rule (deliberately different from `category_group_id`):** an assignment whose consumer or instance no longer resolves is **dropped**. It is a pure join row with nothing to preserve. `category_group_id` reassigns to null instead because it hangs off a source relationship that must survive.

**Routes**

```
GET    …/package-station/tier-assignments
POST   …/package-station/tier-assignments            { consumer_type, consumer_id, tier_instance_id }
DELETE …/package-station/tier-assignments/(?P<assignment>[a-z0-9_]+)
```

`[a-z0-9_]+` matches the existing bin route pattern. `permission_callback` = `requireAdmin`.

**Family deletion guard.** `PackageFamiliesController::permanentDeleteGroup` (238) gains, **before** the existing dependents check:

```php
if (TierAssignmentSchema::findForConsumer($station['tier_assignments'] ?? [], 'package_family', $gid) !== null) {
    return new \WP_REST_Response([
        'success' => false,
        'code'    => 'family_in_use_by_capability',
        'message' => 'This Package Family uses the Tier capability. Remove it first.',
    ], 409);
}
```

**Not** added to `dependents()` and **not** inside `array_sum($dependents)` — folding it in would make a capability part of Family readiness. The count is surfaced separately for display.

**D1 health assertion (added here, consumed by the Phase 8 gate).** Extend `Health::register('package_station')`:

```php
// Read-only. Reports; never repairs. MUST NOT auto-assign, mint, or mutate.
// Unhealthy when active legacy Tier data exists but no valid assignment resolves it.
$hasLiveLegacyTiers = /* any instance slot holds a live active occupant */;
$resolvable         = /* at least one assignment resolves to an existing instance
                         AND to an existing, active consumer */;
return !$hasLiveLegacyTiers || $resolvable;
```

Landing it in Phase 3 lets the team watch this turn green before Phase 8 is scheduled, instead of discovering the state at cutover.

**Tests:** assign to a live Family → row created with the derived id; unknown Family → `unknown_consumer`; unsupported type → `unknown_consumer_type`; unknown instance → `unknown_tier_instance`; second assignment for the same Family → `consumer_already_assigned`; second assignment to the same instance → `instance_already_assigned`; `deriveAssignmentId` is deterministic and stable across calls; unassign removes exactly one row and leaves instance + Family byte-identical; sanitise drops rows whose consumer or instance vanished; **deleting a Family with an assignment → 409 `family_in_use_by_capability`**; deleting a Family with no assignment and zero dependents → succeeds; **archiving a Family keeps its assignment (B1)**; `dependents()` output shape is unchanged (still three keys).

---

## Phase 4 — Instance-scoped backend mutations and guards

**Purpose.** Scope every Tier operation by `tier_instance_id` **before** slot resolution. Close the four guard gaps.

**Files:** `PackageStationController.php` (re-scope all Tier/bin handlers), `TierInstanceSchema.php` (`withInstance`), `PackageRepository.php` (`rateSheetIdsInUse`), `api.ts` / `usePackageStation.ts` / `types.ts` (thread `tierInstanceId`), `tests/tier-instance-mutations.php`, `tests/tier-instance-guards.php`, `scripts/tier-instance-scope-contract.ts`.

**Routes.** Every Tier/bin route gains `tier-instances/(?P<instance>[a-z0-9_]+)/` before `tiers/…` / `bin/…` / `popular`. The 11 legacy unscoped routes stay one release and **alias to `ti_primary`**, removed in Phase 9.

**Mandatory handler order**

```php
1. $instanceId = sanitize_text_field((string) $request->get_param('instance'));
2. $station    = $this->packages()->loadStation();
3. $instance   = TierInstanceSchema::findInstance($station['tier_instances'], $instanceId);
   if ($instance === null) return ['success'=>false,'code'=>'unknown_tier_instance', …];   // BEFORE slot lookup
4. $slot       = PackageSchema::ensureTierLifecycle($instance['tiers'][$tierId] ?? []);
5. …existing PackageSchema operation, byte-for-byte unchanged…
6. $station    = TierInstanceSchema::withInstance($station, $instanceId, $updatedInstance);
7. $station['platform_status'] = TierInstanceSchema::deriveStationStatusFromInstances($station['tier_instances']);
8. $this->packages()->saveStation($station);
```

**No handler may read `$station['tiers']` after this phase** (contract-scanned).

**Occupant identity untouched.** `upsertOccupant`'s `$existingId ?? mint` (line 1218) is not edited. Do not prefix, namespace, or re-mint `occ_…`. Resolution is always `(tier_instance_id, slot_id) → occupant`.

**Instance deletion guard.** Refuse when: an assignment references it (`instance_in_use`); it holds any live occupant (`instance_has_occupants`); its bin is non-empty (`instance_has_bin_entries`); any slot holds a non-null draft (`instance_has_drafts`).

**Rate Sheet guard, widened.** Replace `PackageStationController::rateSheetIdsReferencedByTiers` (438) with `PackageRepository::rateSheetIdsInUse(array $station): array`, scanning across **every** instance (and the legacy copy while present):

1. `instance.tiers[*].current_occupant.rate_sheet_id` — **regardless of selections** (gap 3)
2. `instance.tiers[*].drafts.overview.rate_sheet_id`
3. `instance.tiers[*].drafts.features` non-empty → its bound sheet
4. `instance.tiers[*].history[*].rate_sheet_id` (gap 2)
5. `instance.occupant_bin[*].occupant.rate_sheet_id` (gap 1)
6. `instance.allowed_rate_sheet_ids[*]`

`rs_primary` legacy default applies at every site. Enforced at `savePackageStationManager` (382–392) as `rate_sheet_in_use`; **archiving** a bound sheet returns `rate_sheet_in_use_archive` naming the instances (gap 4).

**Tests** — mutations: save `basic` in A leaves B's `basic` byte-identical; two instances hold `basic` with different `occ_…`; settle in A leaves B's drafts untouched; archive in A touches only A's bin; swap inside A displaces only A's occupant; a bin id from another instance → `unknown_bin_entry`; popular on A does not change B; unknown instance → `unknown_tier_instance` before slot resolution with the station bytes unchanged; occupant ids invariant across all of it; legacy alias route ≡ `ti_primary`-scoped route.
Guards: the six `rateSheetIdsInUse` cases; archive guard; four instance-deletion codes; `instance_in_use` when an assignment exists; a fully-empty unassigned instance deletes.
Scope contract: `PackageStationController.php` contains zero `$station['tiers']` outside the legacy alias block.
**Peer isolation (B0.1):** extend `tests/package-capability-peer-isolation.php` with **P2** — run every instance mutation listed above and deep-equal the Family record before and after each; unchanged in all cases.

---

## Phase 5 — Package-owned Tier Tool and assignment management

**Purpose.** One Package-owned tool managing instances and assignments as **separate acts**.

**Files:** `surface/tierInstance/useTierInstances.ts` (create), `surface/tierInstance/tierInstanceModel.ts` (create, pure), `usePackageStation.ts` (accept `tierInstanceId` as the 2nd positional arg; `null` holds the unloaded state exactly as `serviceId === 0` does today), `presentation/package-tier-workspace/TierInstancePanel.tsx` (create), `surface/tierSurface/TierDrawerHost.tsx` + `drawer/tier/{tierDrawerTypes,useTierDrawerController,TierDrawerContent}` (thread the instance id only), `scripts/tier-instance-tool-contract.ts` (create).

**Reuse unchanged:** `TierDrawerContent`, `useTierDrawerController`, `useTierModuleEditing`, `useTierBinTravel`, `tierDetailModel`, `TierBinList`, `TierDrawerFooter`, `TierDrawerDialogs`, `TIER_ENTITY`, all `drawer/editors/*`, `TierNavigation`, `TierDetailPanel`, `TierLowerDeck`, `deck.ts`, `tierOccupantCard.ts`, `evaluateTierPricing.ts`. They change only by receiving the instance id.

**Capabilities (exactly these):** list instances (title, assigned consumer name or "Unassigned", readiness, occupant count, bin count); **create instance** (no consumer involved); **assign** an instance to an eligible consumer; **unassign**; open instance; configure `allowed_rate_sheet_ids`; display the five fixed slots always; operate the existing occupant lifecycle; show unassigned instances as fully operable.

**Migration suggestion (explicit, never automatic).** `tierInstanceModel.suggestConsumerForInstance()` computes candidate Families exactly as `PackageCategoryGroups::dependents` does (`tier_selections > 0`). Exactly one candidate → render *"Assign this Tier set to KAIROS?"* with an explicit button. Zero or 2+ → render nothing. **The system never writes an assignment on its own.**

**Eligibility.** `tierInstanceModel.eligibleConsumers()` = live Families (not archived/trashed) with no existing assignment.

**Contract tests:** eligible consumers exclude already-assigned and binned Families; an unassigned instance lists as operable, not as an error; instance rows carry counts from the loaded instance, never from provenance; allowed-sheet narrowing (`['rs_a']` → `rs_a` + bound sheet; `[]` → all active + bound); slots always five in `TIER_KEYS` order; `suggestConsumerForInstance` returns exactly one candidate or none, never a default pick.

**Correction (2026-08-15).** The allowed-sheet narrowing rule above is reversed. A Tier system is independent Package-owned capability; Rate Sheet access is a deliberate later admin decision, not something creation or Family assignment grants implicitly. The corrected rule is `['rs_a']` → `rs_a` + bound sheet (unchanged); `[]` → **only** the bound sheet, never every active one. `selectableRateSheets()` (`tierInstanceModel.ts`) and `projectTierRateSheetAccess()` (`tierRateSheetAccessModel.ts`) carry this correction; see [Package Home Settings](../code-map/package-settings.md).

---

## Phase 6 — Re-host the Package Family creation surface + optional-capability UX

**Purpose (bounded).** **Re-host an existing, previously-working creation flow** into the Package Station peer and add one new thing: the success stage that carries the optional Tier prompt.

```text
Existing Family creation authority (alive)
→ re-host the reverted composition into Package Station
→ Family saves independently and is complete
→ optional next step:  [ Not now ]  |  [ Add Tier capability ]
```

**This is not a new creation system.** Per §A8 the composition, host adapter, registration shape and intent wiring all existed at `c0eda40` and were lost to a revert, not to a design decision.

### 6.0 The recovered code is a REFERENCE IMPLEMENTATION, not a byte-for-byte restore

Treat `c0eda40` as the reference. Keep its structure, its command injection, its neutral bridge, its validation and its registration shape. **One behaviour must change:**

```text
old:
create Family
→ bridge.onMutationComplete()
→ bridge.close()                    ← silent auto-close

new:
create Family
→ Family saved successfully         ← the Family is COMPLETE here
→ show optional capability step
     [ Not now ]  |  [ Add Tier capability ]
```

**The Family is already complete at the saved stage.** The optional step is strictly after the save, never part of it.

Binding rules for the implementer:

- The optional step **must not be part of the Family's validation transaction**. `createPackageFamily` succeeds or fails on its own; no capability state participates in its validation, its response, or its error handling.
- `onSaved()` fires at the saved stage — the originating wall refreshes with a complete Family, whatever the user does next.
- `Not now` performs **zero** writes: no instance, no assignment, no placeholder, no flag.
- Closing the drawer at the saved stage by any route (Escape, backdrop, header close) is equivalent to `Not now`. No close guard may be installed at that stage — the work is done.
- A failure in the optional step must never roll back, invalidate, or re-open the created Family.

Everything else about the recovered composition stays as written.

### 6.1 Exact files and symbols

Recovery command for each reverted file: `git show c0eda40:<path>`.

| Concern | File | Action |
| --- | --- | --- |
| **Existing creation authority** | `resources/ts/package-station/api.ts` — `createPackageFamily` (line 35); `PackageFamiliesController::createGroup` (line 167) | **unchanged** — gains its caller back |
| Assignment API | `resources/ts/package-station/api.ts` | add `createTierInstance`, `createTierAssignment`, `deleteTierAssignment`, `fetchTierAssignments` (Phase 3 routes) |
| **Create composition** | recover `entity-drawers/package-family/PackageFamilyCreateContent.tsx` **→** `resources/ts/package-station/drawer/package-family/PackageFamilyCreateContent.tsx` | **re-host** — Package-owned per the peer model; keep the `create`-command injection and the neutral bridge exactly as written; **replace the auto-close with the stage machine in §6.2** |
| **Host adapter** | recover `admin-station/stations/packageFamily/PackageFamilyCreateDrawerHost.tsx` **→** `resources/ts/package-station/surface/packageFamily/PackageFamilyCreateDrawerHost.tsx` | **re-host** — repoint the import to `../../api`; the `DrawerContentProps` → `EntityDrawerHostBridge` mapping is already identical to today's `TierDrawerHost.tsx:37-44` |
| **Stage/mutation state** | `resources/ts/package-station/surface/packageFamily/usePackageFamilyCreate.ts` | **create** — the one genuinely new module: stage machine `form → saved → capability-added`; owns `createPackageFamily`, then on explicit action `createTierInstance` → `createTierAssignment` |
| **Drawer registration** | `resources/ts/package-station/register.ts` | re-add verbatim: `{ key: 'package-family-create', title: 'New Package Family', supportedModes: ['edit'], content: PackageFamilyCreateDrawerHost }` |
| **Mode contract** | — | `supportedModes: ['edit']` only — the recovered registration's own comment: *"a create form has no read-only tab."* `AdminStationDrawer` clamps the requested mode (lines 117–121). |
| **Action intent** | `resources/ts/admin-station/register.ts`, `packages / tier-tool` binding | re-add verbatim: `{ id: 'create-package-family', target: 'drawer', mode: 'edit', drawerTemplateKey: 'package-family-create' }` — **the per-intent `drawerTemplateKey` mechanism is already live for `rate-sheet` (line 104)** |
| **Dispatch site** | `resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx` — `SETTINGS_TOOLS` `family-groups` entry (line 336-341) and `SettingsLane` | replace the `unavailable` note with `route: { label: 'Create Package Family' }` dispatching `onIntent('create-package-family')`; the kit already owns `onIntent` |
| **Zero-Family first-use** | `resources/ts/package-station/presentation/package-tier-workspace/PackageTierWorkspace.tsx` — `NO_FAMILY_MESSAGE` branch (line 131-132) | restore 012's first-use panel: when `families.length === 0`, one panel whose single action is the same create intent (012 fixed exactly this — *"previously unreachable because the deck was hidden"*) |
| **Sentinel** | — | the kit dispatches the stable `'new'` string; the create drawer ignores it. **No Station Manager change** — `StationSurfaceHost` passes `recordId` through without inspection. |
| **Family editor** | `resources/ts/package-station/drawer/editors/PackageFamilyOverviewEditor.tsx` | **unchanged** — optionally reused for the form's two fields |
| **Relationship shell** | `resources/ts/package-station/drawer/schema/bindings/packageFamily.tsx` | add `packageFamilyCapabilitiesShell` as a **sibling** export; `packageFamilyRelationshipsShell` unchanged |
| **New Capabilities module** | `resources/ts/package-station/drawer/schema/entities/packageFamily.ts` | add `capabilities: packageFamilyCapabilitiesShell` to `shells`, and `{ module: 'capabilities', mode: 'connections' }` to `placements.drawer.connections` **after** `relationships` |
| Capability state | `resources/ts/package-station/surface/packageFamily/usePackageFamilyCapabilities.ts` | **create** — reads assignments for one Family, exposes `assignment`, `instance`, `addTier()`, `removeTier()` |
| Controller wiring | `resources/ts/package-station/drawer/package-family/usePackageFamilyDrawerController.ts` | add `capabilitiesBinding`; **do not touch** `isNewNeverPublished` / `hasBeenPublished` / `canPublish` |
| Drawer wiring | `resources/ts/package-station/drawer/package-family/PackageFamilyDrawerContent.tsx` | pass `capabilities: c.capabilitiesBinding` in `bindings` |
| Module DNA | `resources/ts/drawer-kit/utils/moduleNotifications/packageFamily.ts` | add `packageFamilyCapabilitiesModule` with `problems: () => []` and `resolveStatus` keyed on `platformStatus` only — **mirrors `packageFamilyRelationshipsModule` so capability absence can never read as a problem** |
| Barrel | `resources/ts/package-station/surface/packageFamily/index.ts` | export the two new hooks + the create host |
| Contracts | `scripts/package-family-capability-contract.ts` | **create** |
| Tests | `tests/tier-assignment-family-flow.php` | **create** |

### 6.2 The optional post-create transition

`usePackageFamilyCreate` is a three-stage machine. Precedent: Project History 012 — *"A creation surface whose success changes visible state must show that result; setup's success stage is the template — no silent auto-close."*

```text
stage 'form'
  fields: name (required), description        → createPackageFamily({name, description})
  on success → stage 'saved'; onSaved() refreshes the originating wall

stage 'saved'
  "KAIROS created. It is ready to use."
  "Optional — does this Family need Tier pricing? You can add it later."
     [ Not now ]            → close. NOTHING is written.
     [ Add Tier capability ]→ createTierInstance({ title: `${name} Tiers` })
                              then createTierAssignment({ consumer_type:'package_family',
                                                          consumer_id, tier_instance_id })
  [ Done ]

stage 'capability-added'
  "Tier capability added — <instance title> (ti_…)."
     [ Open Tier tool ]  [ Done ]
```

**Partial-failure honesty.** If instance creation succeeds and assignment fails, the stage reports exactly that: *"Tier instance created but not yet attached to this Family. Attach it from the Family's Capabilities panel."* No silent rollback and no hidden orphan — an unassigned instance is a **valid** state in this model, which is precisely why two explicit writes are acceptable here.

**Invariants:** `Not now` writes nothing — no empty instance, no placeholder assignment. The Family is complete at the end of stage `form`; every later stage is optional. The capability decision is never a side effect of the save.

### 6.3 The Capabilities module

```ts
export interface PackageFamilyCapabilitiesShellData {
  tier: { enabled: false }
      | { enabled: true; instanceId: string; instanceTitle: string; readiness: string };
}
```

Rendered states, exactly as specified:

```text
Tier capability · Not enabled                 [ Add Tier capability ]

Tier capability · Enabled
  Tier instance: KAIROS Tiers
  Readiness: Ready                            [ Open Tier tool ]  [ Remove Tier capability ]
```

`Remove Tier capability` calls `deleteTierAssignment(assignment_id)` behind an inline confirm (`hooks/useInlineConfirm.ts`) and **deletes the assignment row only** — the Tier instance is never deleted or mutated.

**"Change assignment" is deliberately NOT offered** — see D2.

**Placement rationale:** the Connections tab already hosts *"Connected Records — Live Package Station relationships using this Family"*. A Capabilities module is its natural sibling. **Not** the footer: `CanonicalEntityFooter` is shared with Category and its grammar must stay fixed (rule honoured explicitly).

**Extension seam (documented, not built):** a second Package capability adds one more row to this module's `content` and one more field to `PackageFamilyCapabilitiesShellData`. **The Family record does not change.**

### 6.4 Tests

`scripts/package-family-capability-contract.ts` (pure):
1. A Family with no assignment yields `tier: { enabled: false }` and the module's status resolves from `platformStatus` alone.
2. `packageFamilyCapabilitiesModule.problems()` returns `[]` for every input — capability absence is never a problem.
3. Overview readiness is byte-identical with and without an assignment (call `packageFamilyOverviewModule.resolveStatus` both ways).
4. The create machine's `saved` stage exposes both actions, and `Not now` produces **zero** mutation calls (spy).
5. `Add Tier capability` produces exactly two calls, in order, only after the explicit action.
5a. `onSaved()` fires at the `saved` stage — before any capability action — so the wall refreshes with a complete Family regardless of what follows.
5b. Closing at the `saved` stage by any route is equivalent to `Not now`: zero mutation calls, and **no close guard is installed** at that stage.
5c. A forced failure of `createTierInstance` or `createTierAssignment` leaves the created Family untouched and still reported as saved — no rollback, no re-open, no invalidation.
5d. The capability actions are absent from the `form` stage entirely — nothing capability-shaped participates in the Family's validation transaction.
5e. Only three capability actions exist in the surface — `Add Tier capability`, `Remove Tier capability`, `Open Tier tool`. A scan proves no reassign/move/change action exists in the UI or the API.
6. Removing an assignment leaves the instance object untouched (deep-equal before/after).
7. A second capability row can be added to `PackageFamilyCapabilitiesShellData` without touching `PackageFamilyItem` (type-level assertion).
8. Forbidden-symbol scan: no `capability_key`, no `capabilities[]` collection, no `capability_assignments` anywhere in `src/` or `resources/ts/`.
9. Forbidden-field scan: `PackageCategoryGroups::sanitizeAll` emits no `tier_*` key (PHP-side mirror in the test below).

`tests/tier-assignment-family-flow.php`:
10. Create a Family → it is valid, `module_status.overview` pending, **no assignment row exists**.
11. Settle + publish that Family with no assignment → `platform_status = active`, overview settled. **Family readiness does not depend on Tier.**
12. Assign, then remove → Family record byte-identical to before the assign; instance byte-identical.
13. `PackageCategoryGroups::sanitizeAll` output contains no key matching `/^tier/`.
14. Delete a Family with an assignment → 409 `family_in_use_by_capability`; after removal → deletes.

**Peer isolation (B0.1):** extend `tests/package-capability-peer-isolation.php` with **P3** — run every Family mutation (overview draft save, settle, revert, publish, status change, archive, trash, restore) and deep-equal the Tier instance record before and after each, including `tiers{}`, `occupant_bin[]`, `popular_*` and `allowed_rate_sheet_ids`. Unchanged in all cases. This is the check that proves archiving a Family leaves its assigned instance untouched (B1).

### 6.5 Completion criteria

`createPackageFamily` has exactly one caller. A Family can be created, published, archived, restored and deleted with no Tier involvement. `npx tsc --noEmit`, `npm run build`, both new contracts, and every pre-existing contract pass. `CanonicalEntityFooter.tsx` is unmodified. `PackageCategoryGroups.php` gained no Tier field.

---

## Phase 7 — Family workspace explicit assignment resolution

**Purpose.** Resolve the workspace Tier by assignment. Delete the provenance filter.

**Files:** `surface/packageTierWorkspace/projection.ts` (rewrite the scoping half), `usePackageTierWorkspace.ts`, `presentation/package-tier-workspace/PackageTierWorkspace.tsx`, `surface/packageTierWorkspace/familySummary.ts`, `scripts/package-tier-workspace-contract.ts` (**rewrite**).

**Delete** (they exist only to power the obsolete filter): `buildRateItemServiceMap` (line 85), `occupantSupplyingServiceIds` (line 112), `WorkspaceOccupant.supplyingServiceIds` (line 52), `projectFamilyTierWorkspace` (line 131).

**Add:** `resolveFamilyTierAssignment(family, assignments, instances): TierInstanceSummary | null` — exact consumer match, no inference.

**Keep** `buildRateItemCategoryMap` (`deck.ts:107`) — it resolves Service *categories* for the Details lane. Presentation enrichment, not scoping.

**Three states:**

| Condition | State |
| --- | --- |
| Family has an assignment | Engine + lower deck against that instance |
| Family has no assignment | *"This Package Family does not use the Tier capability."* + `Add Tier capability`. **Neutral, not an error, not "incomplete".** |
| Assignment exists, instance empty | Existing "no Tier selections" empty state — now honest |

**Rewritten contract:** a Family resolves only its assigned instance; no assignment → `null` and the neutral state, never another Family's occupants; **an occupant is never projected under two Families** (inverts the current lines 88–92 assertion, which is deleted); two Families with same-named slots project distinct `occ_…`; Rate Sheet provenance has zero influence (same fixtures, opposite expectation); an occupant with no selections is still projected under its assigned Family; forbidden-symbol scan for the four deleted exports; forbidden-import scan — nothing under `drawer/package-family/` or `surface/packageFamily/` imports `usePackageStation`, `tierOccupants`, or `TIER_ENTITY` (the Capabilities module reads assignments only).

`familySummary` keeps **three** dependents metrics. Capability usage is not a dependency metric.

---

## Phase 8 — Public projection

> ### ⛔ DEPLOY GATE — all five must hold in the real environment before this phase ships
>
> ```text
> 1. ti_primary has an explicit, valid assignment
> 2. the assigned Family resolves correctly
> 3. Cost Builder returns the expected Tiers for that Family's Services
> 4. KAIROS / APTOS isolation passes
> 5. an unassigned Family fails closed
> ```
>
> Phase 8 replaces the legacy every-covered-Service fan-out with assignment resolution. Deploying it while `ti_primary` is unassigned takes public pricing down. The Phase 3 health assertion must report healthy, and conditions 3–5 must be verified against the running site. **Do not resolve a failing gate by auto-assigning anything** — the assignment is always an explicit human action through the Phase 5 tool.

**Purpose.** Resolve through the assignment. Fail closed.

```text
Service id
  → package_manager.sources[] where entity_id === serviceId → category_group_id
  → tier_assignments[] where consumer === {package_family, thatGroupId}
      → tier_instance_id → tier_instances[] → readiness gate → tiers{}
```

**Files:** `PackageRepository.php` (rewrite `findAllActiveIndexedByServiceId`, line 360), `TierInstanceSchema.php` (+`resolveInstanceForService`), `PackageStationReadController.php` (one row per **assigned** instance), `tests/tier-instance-public-projection.php`.

**Fail closed** on: no source relationship; `category_group_id === null`; **no assignment**; unknown instance; instance not ready; **Family not active**. Result is exactly the existing no-package path (`PricingBuilder.php:240-251`). Never `ti_primary`, never the legacy global set, never another consumer's instance. A Service resolving to two assigned instances → fail closed, do not pick.

**Performance.** Hoist `buildReadModel` once per request and add `projectTierRateSheetWith(array $readModel, …)`; keep `projectTierRateSheet` as a thin wrapper so the two admin controllers are unaffected.

**PricingBuilder needs no change** — `overlayPackage` (299) and the popular-tier resolution (382–400) are untouched.

**Consumer boundary.** Cost Builder is one downstream consumer of the Package-owned public projection; it does not resolve assignments, own Tier/Family rules, or become a general commercial authority. Its existing cart, quote-total and printable/PDF proposal calculations continue to operate on the resolved public payload and selected `QuoteItem` snapshots. Phase 8 may prevent an unresolved Service from offering new selections, but it must not move assignment, pricing, persistence, quote or PDF authority into Cost Builder or change established quote arithmetic.

**Tests:** Service in assigned Family A → A's Tiers; Service in B → B's only, A's absent; no source relationship / null group / **no assignment** / unready instance / **archived Family** → fail closed; two assigned Families → fail closed; station `valid_until` past → nothing; two instances project independently; `(rate_sheet_id, item_id)` resolution preserved. `tests/tier-pricing-parity.php` and the TS parity contract must stay byte-identical.

---

## Phase 9 — Runtime acceptance, retirement, documentation

> ### ⛔ PRE-PHASE GUIDANCE HOLD — customer-facing Cost / Price Builder
>
> **Do not start Phase 9 without explicit user guidance for the customer-facing Cost Builder / Price Builder experience.** Before any Phase 9 implementation, runtime acceptance, compatibility retirement or UI adjustment, review the live customer frontend with the user and agree the intended behaviour for assigned and unassigned Families, Tier presentation, comparison, selection, quote flow and hard-refresh persistence. Do not infer a redesign from the admin experience. Any guidance may refine presentation and acceptance only; it must preserve the settled peer-to-peer assignment architecture and Phase 8 fail-closed public projection.

**Retirement** (only after Phase 8 ships and the instance shape is persisted): drop `tiers`/`occupant_bin`/`popular_*` from `defaultStation()`; prune the legacy keys in `liftLegacyStation` **on the write path only**; remove the 11 legacy alias routes.

**Invariant matrix** — `tests/tier-capability-invariants.php`:

| # | Invariant |
| --- | --- |
| 1 | Migration preserves occupant ids and every lifecycle field |
| 2 | Two consumers, independent instances, same slot names |
| 3 | Saving one instance never replaces another's occupant |
| 4 | Slot and occupant identity remain distinct; ids never re-minted |
| 5 | Family scope is explicit — consumer match, never provenance |
| 6 | Rate Sheet lookup remains `(rate_sheet_id, item_id)` |
| 7 | Archived / bin / history / draft / allow-list dependencies protected |
| 8 | Public projection resolves the correct instance and fails closed |
| 9 | **A Family is valid, publishable and deletable with no assignment** |
| 10 | **Removing an assignment leaves Family and instance intact** (P1) |
| 10a | **Peer-to-peer invariant holds in both directions** — editing the instance never changes the Family (P2); editing the Family never changes the instance (P3); neither sanitiser can represent the other (P4, P5). No parent-child storage ownership exists between a Package entity and a Package capability instance. |
| 11 | **No `capability_key`, generic ledger, or activation framework exists** (symbol scan over `src/` and `resources/ts/`) |
| 12 | **No Tier field exists on any Family record** (`sanitizeAllTypes` scan) |
| 13 | No platform-core Package rules: `station-manager/` references no assignment, capability, instance or eligibility symbol |
| 14 | Legacy alias parity before removal |

**Runtime acceptance gate (blocks Phase 9 completion).** Against a WordPress runtime with production-shaped data, using KAIROS, APTOS, OMNIA:

| # | Check |
| --- | --- |
| A1 | Each assigned Family opens its own Tier set; no occupant appears under two Families |
| A2 | Same-named slots are independent (different `occ_…`, different values) |
| A3 | **Edit + settle KAIROS `basic`; reload; APTOS `basic` unchanged in label, price, cycle, selections and `occ_…`. Then reverse and repeat.** |
| A4 | Archive in KAIROS touches KAIROS's bin only |
| A5 | Popular in KAIROS does not change APTOS |
| A6 | **OMNIA with no assignment renders the neutral no-capability state**, never borrowed Tiers |
| A7 | **Create a new Family, choose "Not now" → it publishes and behaves normally; no instance and no assignment were written** |
| A8 | **Add Tier capability from the Family drawer later, then Remove it → Family and instance both intact** |
| A9 | Public payload: Service in KAIROS → KAIROS Tiers; in APTOS → APTOS; in OMNIA → no Tier data, no fallback |
| A10 | Re-run A1–A3 after a hard refresh |

If no WordPress runtime is available, stop at Phase 8, report it unverified, and **do not begin Phase 9** — Phase 9 prunes the legacy Tier copy.

**Snapshot gate (retained).** A verified restorable production snapshot of `cz_package_station` must exist **before Phase 4 is deployed** — the first phase where mutations land in `tier_instances` and `git revert` alone no longer recovers them. Repeat before Phase 9.

**Documentation.** Create `docs/code-map/tier-capability.md` (indexed once). Update `docs/code-map/tiers.md` (delete the provenance-filter line 18 and the "working scope only" line 24), `package-station.md`, `package-manager.md`, `rate-sheet.md`, `cost-builder.md`, `lifecycle-system.md`, `admin-station-surface-binding.md` (the new `scope` field), `station-manager.md` (the `scope` field + sentinel), plus `src/Modules/SurfacePackages/CLAUDE.md`, `resources/ts/package-station/CLAUDE.md`, `src/Modules/CostBuilder/CLAUDE.md`. Ask before creating a Project History record (`013-`).

### Future reminder — dedicated legacy XLSX Import Station

After the capability rollout and customer-facing guidance are settled, write a separate approved blueprint for a proper Import Station and retire import ownership from Cost Builder. The Station should own legacy XLSX upload, mapping, validation, dry-run/error reporting, provenance and explicit commits into the authoritative Service and Package Stations. Cost Builder must remain a read-only consumer of their public projections. This is a later milestone, not Phase 8 or Phase 9 work.

---

# PART C — DISCARD / KEEP LEDGERS

## C1. Discard from `TierInstanceBlueprint-v1.md`

| Section | Reason |
| --- | --- |
| Part 3 §3.3 "Consumer contract — the smallest controlled form" | Consumer reference belongs on the assignment, not the instance |
| Part 3 §3.2 — the `consumer { type, id }` line in the storage diagram | Instance must not know its consumer |
| **Phase 3 in full** ("Consumer ownership contract") | Replaced by the assignment ledger |
| Phase 2's `'consumer' => self::inferPrimaryConsumer(...)` and the "one candidate ⇒ link it" rule | Lift writes no usage decision; inference becomes a user-confirmed suggestion |
| Phase 3's `dependents` gaining `tier_instances` inside `array_sum` | Would make a capability part of Family readiness |
| Phase 3's `assignConsumer` / `clearConsumer` / `consumer_already_owns_instance` on the instance | Assignment operations, not instance operations |
| Phase 6's "Family owns no instance ⇒ Setup/activation state" | A Family without Tier is complete |
| Phase 6 test #7 (four dependents metrics) | Capability usage is not a dependency metric |
| Phase 5's "create instance for an eligible consumer" as one act | Two explicit acts |
| Part 8 items 18–19 as written | Re-expressed against the assignment model |
| Part 2 R11's `allowed_rate_sheet_ids` framing | Right conclusion, consumer-scoped reasoning removed |
| Runtime gate A6/A7 wording | Reworded — no-capability is a valid state |

## C2. Keep from `TierInstanceBlueprint-v1.md`

All of Part 1 (§1.1–§1.7): global Tier storage; slot/occupant separation; `occ_…` minting and preservation; `history` carried but never written; bin shapes and ops; global `deriveStationStatus`; the provenance-filter finding and its four consequences; Rate Sheet mechanics and `(rate_sheet_id, item_id)`; the **four delete-guard gaps**; Package/Manager/Admin boundaries; the `/admin/services/{id}/…` navigation-context quirk and the `useHostService` heuristic; public projection fan-out; contract and documentation inventories.
Risks R2, R4, R6, R7, R8, R9, R10, R12. All migration mechanics (`ti_primary`, read-time lift, idempotence, no re-minting, no write-on-read, dual-write window, snapshot gate). All preservation rules (five slots, `occ_…` identity, empty shells are not cards, clear-on-switch). Most of Part 8's don't-do list.

---

# PART D — DECISIONS (all resolved 2026-07-25)

No open questions remain. D1, D2 and D5 are approved; D3 was withdrawn on source evidence; D4 was settled by the audit. Recorded here so the implementation agent inherits the reasoning, not just the rule.

## D1 — **APPROVED: operational gate before Phase 8**

Today `findAllActiveIndexedByServiceId` (lines 423–425) maps the station to **every covered Service**, so the global Tiers are live everywhere. After Phase 8, resolution requires an assignment, and migration deliberately leaves `ti_primary` unassigned (Phase 2, rule 9).

**Phase 8 must not remove the legacy projection until all five conditions hold in the real environment:**

```text
Before Phase 8 may deploy:
1. ti_primary has an explicit, valid assignment
2. the assigned Family resolves correctly
3. Cost Builder returns the expected Tiers for that Family's Services
4. KAIROS / APTOS isolation passes
5. an unassigned Family fails closed
```

Sequencing: Phases 1–7 ship; an admin performs the assignment through the Phase 5 tool; conditions 1–5 are verified against the running site; **only then** does Phase 8 deploy.

**Health assertion — reports, never repairs.** Extend `Health::register('package_station')` (`SurfacePackagesModule.php:30-55`):

```text
Unhealthy when:  active legacy Tier data exists
                 AND no valid assignment resolves it
```

It **must never auto-assign `ti_primary`**, never mint an assignment, and never mutate the station. It is a read-only report. Added in **Phase 3** (as soon as assignments are representable) so the team can watch it turn green before Phase 8 is scheduled, rather than discovering the state at cutover.

## D2 — **APPROVED: defer "Change assignment"**

First version exposes exactly three actions:

```text
Add Tier capability
Remove Tier capability
Open Tier tool
```

Reassignment is excluded because it raises avoidable questions about existing occupants, public projection, accidental reassignment, and audit history. A move remains possible as two explicit acts — Remove, then Add — and **both must be guarded**: `Remove` behind an inline confirm naming the instance, `Add` behind the eligible-consumer check. No implicit move path may exist anywhere in the UI or the API.

## D3 — ~~`StationActionIntent.scope`~~ **WITHDRAWN — resolved by source**

An earlier draft of this document proposed adding `scope?: 'record' | 'surface'` to `StationActionIntent` plus a sentinel constant, so a surface-level "New Package Family" action could render in the wall header.

**Not needed.** §A8.3 shows the proven mechanism: the old flow dispatched creation **from inside the tier-workspace kit** using its own `onIntent`, with the per-intent `drawerTemplateKey` doing the routing and a plain `'new'` sentinel as the record id. That mechanism is fully intact today and already in live use for the `rate-sheet` intent.

**No Station Manager contract change. No Admin kit change. No new sentinel constant.** Rule 8 is preserved untouched.

## D4 — Confirmed settled, listed so nothing is silently assumed

- **Family archive keeps the assignment dormant** (B1) — decided from existing conventions, not open.
- **One instance, one Family** — the audit found no case requiring intentional sharing, so sharing stays representable and denied.
- **No `capability_key`** — one capability has a proven assignment need; Rate Sheets are consumed by Tier occupants via `rate_sheet_id` and are never activated by a Family.
- **Phase 6 is a re-host, not a new build** (§A8.4) — the source proves the old flow can be reused, so no new creation system is designed.

## D5 — **APPROVED: forward record, do not edit 011 or 012**

011 and 012 stay closed and unedited. They accurately describe what shipped at that moment, even though later commits reverted it.

After implementation completes, create **`docs/project-history/013-tier-capability-assignments.md`** stating:

1. 011 and 012 introduced the Package Family creation composition.
2. Later revert commits (`47fa2e9`, `edb5957`) removed it; `39d8a3c` re-implemented the lower deck's read lanes only.
3. The current work re-hosted that composition into the Package Station peer.
4. The new optional-capability flow **differs from the earlier automatic close-on-success behaviour**.
5. Tier usage is now represented by explicit `tier_assignments[]`.

Standard rules apply: next sequential number, required template, 300–1,000 words, `Related History` links to 011 and 012 without modifying them. **Ask before creating it** (`docs/project-history/000-README.md:48`).
