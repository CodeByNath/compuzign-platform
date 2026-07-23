# Service Station Consolidation Blueprint

**Status:** Active
**Date:** 2026-07-23
**Scope:** Frontend station ownership; Service backend responsibility split. Establishes the peer-Station model with Service Station as the reference implementation.

## 1. Architecture model (authoritative)

The platform is **station-owned authority**, not Admin-Station ownership. Each Station is a peer that owns its domain end to end — data, IDs, lifecycle, validation, editing, presentation, drawers, and station contracts.

- **Service Station** owns everything `cz_service`: data, IDs, lifecycle, validation, editing, presentation, drawers, and its public station contract.
- **Package Station** owns everything Package: Package data, Package Families, Tiers, Rate Sheets, Rate Sheet Groups, Rate Sheet Rows, lifecycle, composition, validation, editing, presentation, drawers, and its public station contract. When Service data is selected into a Package, the resulting composition and pricing records are **Package Station storage**.
- **Admin Station** is only a control-centre host. It discovers and renders peer Stations and permits authorised operations **through their public contracts**. It must not contain or own Service/Package implementation.
- A **thin shared station host/core** provides the entity-neutral shell, the surface/source/kit/drawer registration seam, and navigation. Genuinely generic rendering primitives stay in the drawer kit; transport stays in the api client. There is **no generic shared business storage**.

Non-negotiable constraints: do not move Service under the Admin Station tree; do not place Rate Sheet authority in Admin Station; do not create generic shared business storage; do not preserve current ownership merely because the repo is arranged that way today.

## 2. Audit of the current repository against the model

### 2.1 Backend — already largely peer-structured

- `src/Modules/Service/` is the sole `cz_service` backend owner (`ServiceModule.php`, `Http/ServiceController.php`, `Support/ServiceSchema.php`, `Support/ServicePools.php`). Correct peer.
- `src/Modules/SurfacePackages/` owns Package Station, including Rate Sheet authority (`Http/PackageStationController.php`, `Http/PackageStationReadController.php`, `Repositories/PackageRepository.php`, `Support/PackageManagerSchema.php`, `Support/PackageCategoryGroups.php`). Correct peer.
- `src/Modules/AdminStation/AdminStationModule.php` is already a thin mount host (shortcode + capability gate only). Correct.
- **Misplacements:** `src/Modules/Admin/Http/AdminPackageCategoryGroupsController.php` (Package Family list + related-Service identity) lives in the Admin module but is Package-owned; it belongs to `SurfacePackages`. There is no Service controller left in the Admin module — Service is already extracted.
- **Weight:** `src/Modules/Service/Http/ServiceController.php` is ~1128 lines carrying catalogue, detail, module drafts, settle/revert, lifecycle, and pool routes — above the responsibility-audit threshold and a legitimate split.

### 2.2 Frontend — authority is misplaced under the Admin Station tree

The Admin Station shell is a genuinely generic engine: a destination resolver, a surface-binding table, source/kit registries, a surface host, and a drawer registry that all resolve entities **by string key** and name no entity in the shell. That engine is the thin host/core the model calls for. The problem is **location and dependency direction**:

- The engine's registries **value-import station internals** (`stations/dataSources.ts` imports the Service and Package read hooks; `presentation/templateKits.tsx` imports the Service catalogue and tier-workspace kits; `stations/drawers/drawerRegistry.tsx` imports the Service, Tier, Category, and Package-Family drawer hosts). Admin Station therefore *contains* the station implementations.
- Service implementation is scattered across `resources/ts/service-station/` (data), `resources/ts/service-station/surface/` (adapters + drawer host), `resources/ts/service-station/presentation/` (kit), `resources/ts/service-station/drawer/` (drawer composition), `resources/ts/entity-drawers/editors/` (Service editors), `resources/ts/entity-drawers/schema/` (Service entity/binding/table), and `resources/ts/drawer-kit/utils/moduleNotifications/service.ts` (module DNA).
- Package/Tier implementation is likewise scattered under `resources/ts/admin-station/stations/packageFamily/`, `resources/ts/admin-station/stations/tierSurface/`, `resources/ts/admin-station/stations/packageTierWorkspace/`, `resources/ts/admin-station/presentation/package-tier-workspace/`, `resources/ts/entity-drawers/tier/`, `resources/ts/entity-drawers/package-family/`, and `resources/ts/hooks/usePackageStation.ts` / `usePackageFamilyStation.ts`.

### 2.3 Already complete (do not redo)

A prior effort extracted the Service **data/API boundary**. Service contracts, endpoints, and state live in `resources/ts/service-station/` and are **not** re-exported from `resources/ts/api/types/admin.ts` or `resources/ts/api/endpoints/admin.ts` (both files explicitly say so). The only residue is **stale header comments** in the Service data files claiming the re-exports still exist. So "remove borrowed Service API contracts and endpoints" is now a comment/scaffolding cleanup plus relocation of the boundary out of the Admin tree — not a contract migration.

### 2.4 Cross-peer coupling (must be preserved as public-contract consumption)

- Package Station's **Tier** drawer reuses Service's overview presentation: `entity-drawers/tier/TierDrawerContent.tsx` imports `serviceOverviewShell` from `service-station/drawer/schema/bindings/service.tsx`, and `entity-drawers/shared/serviceDrawerShared.ts` (exporting `serviceConnectionBinding`, `TIER_KEYS`, `TIER_LABELS`, `decodeHtml`) is consumed by Tier, the Service table, and `tierSurface`.
- Under the peer model this is legal **peer→peer consumption through public contracts**: the Service overview shell is part of Service Station's public presentation contract; Package Station consumes it via the Service Station barrel. `TIER_KEYS`/`TIER_LABELS` are Package Station's tier vocabulary and move to Package Station. `decodeHtml` is generic and already re-exported from `resources/ts/utils/format.ts`.
- Service reads a Package/Surface summary (`SurfacePackageSummary`) for its drawer Connections tab. That is Service consuming Package Station's public contract — allowed, not a borrowed Service contract.

## 3. Ownership map (target)

**Service Station (peer, top-level `service-station/`)** — Service contracts/state/derivations, Service catalogue read + card/surface adapters, Service catalogue presentation kit, Service drawer composition + controllers + dialogs + footer, Service editors, Service entity/binding/table schema, Service module DNA, and a `register()` that plugs Service surfaces/sources/kits/drawer into the host/core.

**Package Station (peer, top-level `package-station/`)** — Package/Family/Tier/Rate-Sheet state, their reads/adapters, the tier-workspace and family/category-group presentation, the Tier and Package-Family drawer compositions + editors + schema, tier vocabulary, and a `register()`.

**Admin Station (thin host)** — the shell, home, header/nav chrome, theme, and the drawer shell. It boots the host/core, invokes each peer's `register()` for discovery, and renders. It imports no station internals.

**Thin shared station host/core (`station-core/`)** — destination resolver, surface-binding table + registration API, data-source and template-kit registries, the surface host, the drawer registry, record identity, retained-collection helper. Entity-neutral; names no station.

**Genuinely generic (stays shared, unchanged ownership)** — `resources/ts/drawer-kit/` rendering primitives and the schema/mode-renderer framework; `resources/ts/api/client.ts` transport; `resources/ts/api/types/pools.ts` shared pool item contracts; `resources/ts/api/types/cost-builder.ts`; `resources/ts/runtime/`; `resources/ts/utils/`.

## 4. Target frontend structure

```
resources/ts/
  station-core/                 # thin, entity-neutral host/core
    navigation/                 # destinations, stationNavigation
    registry/                   # surface bindings + source/kit/drawer registration API
    StationSurfaceHost.tsx
    StationPresentationShell.tsx
    recordIdentity.ts
    useRetainedCollection.ts
  service-station/              # Service peer — full authority
    index.ts                    # public contract barrel (types + public presentation shell + register)
    register.ts                 # registers surfaces/sources/kits/drawer with station-core
    contracts.ts                # was stations/service/types.ts
    data/                       # api.ts, derive.ts, useServiceStation.ts  (was stations/service/*)
    surface/                    # was service-station/surface/*  (+ ServiceDrawerHost)
    presentation/               # was service-station/presentation/*
    drawer/                     # was service-station/drawer/*
      editors/                  # was service-station/drawer/editors/Service*
      schema/                   # was entity-drawers/schema/{entities,bindings,tables}/service*
    notifications.ts            # was drawer-kit/utils/moduleNotifications/service.ts
  package-station/              # Package peer — full authority (later phases)
    ...                         # packageFamily, tierSurface, packageTierWorkspace, tier + family drawers,
                                # usePackageStation/usePackageFamilyStation, tier vocabulary, schema, register
  admin-station/                # thin control-centre host: shell + home + boots core + peer registers
  drawer-kit/                   # generic primitives (unchanged ownership)
  api/                          # client + pools + cost-builder types (shared transport/contracts)
```

Peer→peer rule: a Station may import another Station's `index.ts` public barrel only. It may never reach into another Station's `data/`, `drawer/`, or `presentation/` internals. The host/core imports no Station; Stations import the host/core registration API.

## 5. Phase plan

Each phase is independently green (typecheck, build, PHP tests, PHP lint, docs check), behaviour-preserving, and a single focused commit. Frontend phases rebuild and commit `dist/`. Nothing is pushed.

1. **docs: add Service Station consolidation blueprint** — this document.
2. **refactor: split Service backend responsibilities** — split `Http/ServiceController.php` along its existing route groups (catalogue/detail, module drafts + settle/revert, lifecycle, pools) into cohesive controllers wired by `ServiceModule.php`; move `AdminPackageCategoryGroupsController.php` ownership to `SurfacePackages`. Routes, paths, methods, permissions, payloads, and persistence unchanged — verified by `tests/service-route-baseline.php` (49 routes) and `tests/package-category-groups.php`.
3. **refactor: establish Service Station peer — contracts and data** — create top-level `service-station/`; move the Service data boundary (`stations/service/` → `service-station/contracts.ts` + `data/`), repoint the ~4 external consumers and the registries; drop the stale re-export comments. Public barrel `index.ts`.
4. **refactor: move Service surface and presentation into Service Station** — move `service-station/surface/*` and `service-station/presentation/*` into `service-station/surface/` and `service-station/presentation/`; repoint the host/core registries (`dataSources`, `templateKits`, `drawerRegistry`) at the new locations.
5. **refactor: move Service drawer, editors, and schema into Service Station** — move `service-station/drawer/*`, the Service editors, and the Service entity/binding/table schema into `service-station/drawer/`; export `serviceOverviewShell` + `serviceConnectionBinding` as Service Station public presentation contract; repoint Tier’s consumption to the Service Station barrel; move Service module DNA to `service-station/notifications.ts`.
6. **refactor: extract thin station host/core and invert registration** — move the entity-neutral engine out of `admin-station/` into `station-core/`; convert the static source/kit/drawer/binding tables into a registration API; have Service Station `register()` populate them; reduce Admin Station to booting the core and rendering. Admin Station stops importing Service internals. (Package registrations remain via a temporary Package register shim until phase 8.)
7. **chore: remove obsolete Service paths and stale imports** — delete the empty `resources/ts/components/admin/**` tree and any dead Service re-export scaffolding, stale comments, and now-unused shims.
8. **refactor: establish Package Station peer** — move Package/Family/Tier/Rate-Sheet frontend implementation into `package-station/` with its own `register()`; remove the last station internals from the Admin tree so Admin Station contains no Service or Package implementation. (May be delivered as sub-phases per entity.)
9. **docs: update architecture and code maps; test: Service Station coverage** — rewrite the Service Station / Service Catalogue / Admin Station code maps and `ai-index` ownership to the peer model, add a station-core map, update local `CLAUDE.md` boundary notes, and update/add the projection and route-baseline contracts to the new structure.

Phases 2–7 fully establish Service Station as the reference peer and thin Admin Station of Service. Phase 8 generalises the pattern to Package Station. Category Station and Promotion Station follow the same reference pattern as separate future milestones and are out of scope here.

## 6. Validation, data safety, and reversibility

- Per phase, from the plugin root: `npx tsc --noEmit`; `npm run build`; every `php tests/*.php`; `php -l` on changed PHP; `npm run docs:check`; `npx tsx scripts/service-catalogue-projection-contract.ts` for Service surface phases.
- `dist/` is git-tracked and rebuilt by Vite (`emptyOutDir` is false); rebuild and stage bundles with each frontend phase and confirm no orphaned hashed chunks remain.
- Every phase preserves runtime behaviour and existing data: these are code-location and dependency-direction changes plus a backend responsibility split. No route path, REST payload, permission callback, storage key, or persisted record changes. The route baseline and schema contracts are the guardrails.
- One commit per completed, validated phase; automatic continuation to the next; no pushes, no history rewrites.

## 7. Risks and open items

- **Registration inversion (phase 6)** is the highest-risk step: it changes load-time wiring. The static well-formedness/resolvability guards must be preserved as registration-time assertions so a missing or duplicate registration still fails loudly at boot.
- **Bundle-boundary discipline:** Service and Package stations are mounted by the same Admin Station bundle; peer→peer imports must stay type-only or public-contract to avoid pulling a whole station's renderer graph across a boundary unintentionally.
- **Backend split (phase 2)** must keep route registration identical; the baseline test asserts 49 routes by path/method/permission/args, which is the safety net.
- Category Station and Promotion Station remain under the Admin/entity-drawer trees after this effort; they are explicitly deferred, not endorsed, and follow the Service reference pattern later.
