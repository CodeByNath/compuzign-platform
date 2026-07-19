# Station Lifecycle Engine — v1

**Status:** Superseded subsystem specification; preserved for implementation history
**Scope:** Lifecycle authority, participation models, travel, and visibility at the recorded migration milestone
**Current navigation:** [Lifecycle and Module-State Code Map](../code-map/lifecycle-system.md)

> The shared engine remains current, but the recorded controller paths,
> Promotion storage, participating entity set, and drawer hosts predate later
> relocations. Use the Code Map and source for current ownership.

Canonical specification for the shared station lifecycle engine
(`src/Modules/Admin/Support/StationLifecycle.php`) and the three station
participation models built on it. Written at the close of the lifecycle
engine migration (Stages A–E, 2026-07); the engine is live for Service,
Promotion and Tier.

Recorded companion documents:
- [ServiceDrawerModuleArchitecture-v1.md](ServiceDrawerModuleArchitecture-v1.md) — historical drawer module template.
- [AdminWorkstationDrawerPrinciples-v1.md](AdminWorkstationDrawerPrinciples-v1.md) — historical drawer state and presentation contract.

---

## 1. Engine boundary

**One engine, transitions only.** `StationLifecycle` owns the status
vocabulary and the legality/computation of every travel transition. It never
touches meta keys, payloads, or business rules. Each station owns its own
schema and persistence; it calls the engine to validate and compute a
transition, then persists the result itself (Service:
`AdminServicesController`; Promotion/Tier: pure `PackageSchema` operations
invoked by thin controllers).

Status vocabulary (a station may use a subset — Service never uses `draft`):

| Status | Meaning |
|---|---|
| `draft` | never published (pre-live authoring instance) |
| `active` | live |
| `disabled` | published-capable but off — also the universal restore landing state |
| `archived` | in the bin, restorable |
| `trashed` | in the bin, restorable, permanently deletable |

These are **operational states** — storage and transition vocabulary. They are
never rendered directly as status pills: the drawer shows derived
**presentation states** (Active / Pending / Disabled — `draft` presents as
Pending; `archived`/`trashed` appear only on travel surfaces, never as module
pills). Canonical rule, vocabulary and derivation:
AdminWorkstationDrawerPrinciples-v1 → *Presentation Status Contract*.

Transition table — the only legal status writes anywhere:

| Transition | From → To | Notes |
|---|---|---|
| publish | `draft` \| `disabled` → `active` | station decides settle semantics; publish composes settle + activate |
| toggle | `active` ⇄ `disabled` | |
| archive | `active` \| `disabled` → `archived` | captures `previous_status`. Drafts are NOT archivable — archive preserves published work; drafts have none |
| trash | `draft` \| `active` \| `disabled` \| `archived` → `trashed` | drafts are authoring instances, removable without publishing (decision, 2026-07-05); archived→trashed preserves the original `previous_status` |
| restore | `archived` \| `trashed` → `disabled` | **never to active**; clears `previous_status`; a trashed draft restores to `disabled` — restore does not resurrect draft-ness |
| delete | legal only from `trashed` | engine validates; the station performs the removal — the sole array/entry remover |

The module layer is orthogonal to travel:
`not-configured → pending (draft saved) → settled`, with revert
(`pending →` re-derived prior state). Stations own it; the engine only
defines the shared vocabulary.

## 2. Three participation models

- **Service — canonical station.** The whole record travels; its behaviour is
  the engine's reference implementation (`applyStatus` preserves the
  historical permissive `/status` endpoint; restore and delete use the strict
  rules).
- **Promotion — travelling instance.** Each instance in
  `cz_service_promotion_station` carries the full lifecycle envelope
  (`status`, `previous_status`, `drafts`, `module_status`), lazily backfilled
  by `ensurePromotionLifecycle`. Module drafts own content writes; the C3
  transition endpoints own every status write (the whole-record save and the
  `reactivate` alias were retired at E2). Instances are always born `draft`.
- **Tier — permanent shell.** The shell never travels; only the occupant
  does. Archive moves the settled occupant into the station-level
  `occupant_bin` (entry: `bin_id`, `origin_tier`, `occupant`, `status`,
  `previous_enabled`, `displaced_at`) and empties the shell to
  not-configured. Restore returns the occupant to its origin shell when
  empty; an occupied target demands an explicit mode — `swap` (the shell's
  current content is displaced into the bin as a new archived entry; the
  whole exchange is composed in memory and persisted in ONE meta write,
  never two) or `retarget` (an explicit empty shell). Restored occupants
  land `platform_status: disabled` — the occupant translation of the
  engine's restore landing state — with modules settled and drafts cleared.

## 3. Guard decisions (binding)

1. **Pending drafts block destructive writes, everywhere.** Archive (D2) and
   restore (D3) refuse to write into a shell holding pending drafts unless
   the caller confirms `discard_drafts: true`. This includes restoring into
   an *empty* shell where someone has started authoring a fresh occupant —
   restore never silently destroys authoring work. Failures carry `code:
   pending_drafts` so the UI can confirm and retry.
2. **Legacy flat shells count as occupied.** A Phase-1 flat-format tier slot
   with content blocks plain restore (`target_occupied`) and, when
   swap-displaced, is first minted into canonical occupant form via
   `upsertOccupant` — pre-migration data is never silently clobbered.

Client-side occupancy checks are heuristics over settled fields; the backend
is authoritative and re-rejects when they misjudge.

## 4. Shared pools & references

Features (inclusions) and FAQs are owned exclusively by the Service. Tier
occupants and promotion instances persist **references only** (ids);
transitions carry refs untouched, and content resolves at read time
(`PoolReferences::refreshInclusionLabels` — id authoritative, labels are a
read-refreshed display cache, danglers flagged `missing` but never pruned).
Labels cannot be dropped from storage: the public cost-builder reads the
embedded labels. Pool settle warns (`pool_warnings`, additive, never blocks)
when removing an item still referenced anywhere in the graph — **including
archived/trashed holders** (bin entries are exactly the refs no admin looks
at).

## 5. Public visibility

Lifecycle status and "currently visible" are separate derived values:

- Promotions: public output requires `status === 'active'` AND an open
  instance-level `starts_at`/`ends_at` window
  (`PackageSchema::promotionWindowOpen`, UTC, boundary-inclusive,
  null/'' = open-ended).
- Stations: visible iff `platform_status` is `active`, or empty (legacy
  tolerance for records predating the field); any other value is hidden —
  fail-closed as of E2. Station `valid_from`/`valid_until` are stored UTC
  (`sanitizeDatetime` → `gmdate`) and compared against UTC now
  (`current_time('mysql', true)`) — E2 fixed the former site-local
  comparison.
- Station-level status is derived from occupants (`deriveStationStatus`) and
  its vocabulary is `active | disabled` only; station-level `archived` was
  retired at E2.

Admin summaries are lifecycle-derived (`resolvePromotionSummary`): the pill
reflects the instances' own travel states — never the parent package status —
and binned instances neither colour the pill nor count as configured.

## 6. File map

| Concern | Location |
|---|---|
| Engine | `src/Modules/Admin/Support/StationLifecycle.php` |
| Station schemas & pure travel ops | `src/Modules/SurfacePackages/Support/PackageSchema.php` |
| Pool reference resolution | `src/Modules/Admin/Support/PoolReferences.php` |
| Routes & persistence | `src/Modules/Service/Http/ServiceController.php`, `src/Modules/SurfacePackages/Http/PackageStationController.php`, `src/Modules/Promotions/Http/PromotionsController.php`, Category controllers under `src/Modules/Admin/Http/` |
| Public visibility | `src/Modules/SurfacePackages/Repositories/PackageRepository.php`, `src/Modules/CostBuilder/Services/PricingBuilder.php` |
| Station hooks | `resources/ts/admin-station/stations/service/useServiceStation.ts`, `resources/ts/hooks/usePackageStation.ts`, `usePromotionStation.ts`, `useCategoryStation.ts` (+ `stationPrimitives.ts`) |
| Summary resolvers | `resources/ts/drawer-kit/utils/moduleStatus.tsx` |
| Drawer UIs | `ServiceViewStep.tsx`, `ServiceTierStep.tsx`, `ServicePromotionStep.tsx` |
