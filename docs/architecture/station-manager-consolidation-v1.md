# Station Manager Consolidation Blueprint — Final

**Status: LOCKED — READY FOR IMPLEMENTATION**

Every decision in this document is locked and authoritative. Do not revise the architecture, reopen ownership decisions, introduce alternatives, re-audit the repository, or reinterpret the Station Manager, Admin Station, Service Station, or Package Station boundaries. Locked items include: `station-manager/` as the coordinator location; no separate presentation-kit directory; Admin Station owns presentation and control tools; Station Manager is coordinator-only; Admin authors presentation policy through Station Manager; Service Station and Package Station retain full domain authority; Package Station owns Package Families, Rate Sheets, Sources, Relationships, Tiers, pricing, quantity, drawers, APIs and persistence; the generic Admin drawer is host-only; phases 0–6 with their commit messages, validation commands and rollback boundaries are final; no Rate Sheet feature work; no push.

This document is internally consistent and ready for an implementation agent to execute without re-auditing or reinterpreting the architecture. No code has been changed; nothing is committed or pushed.

Paths are relative to the plugin root `wp-content/plugins/compuzign-platform/` unless prefixed `docs/` (repo root).

---

# Part I — Locked architecture

## I.1 Locked decisions

1. The coordinator lives at **`station-manager/`**. (No other name; "station-core" does not exist in this architecture.)
2. **No separate shared presentation-kit directory exists.**
3. **Admin Station owns presentation** — Admin Station is itself a Station whose tools are presentation and control tools. These stay under Admin Station:
   - `resources/ts/admin-station/presentation/` — template shell (`StationPresentationShell`), template-kit implementations it owns (`CategoryGroupCardsKit`, `ServiceCategoryCarousel`), cards and grids (`category-groups/`), `StationStatusPill`, `StationMetricBlock`, `StationSplitAction`.
   - `resources/ts/admin-station/shell/` — `icons.tsx`, the generic drawer shell (`drawer/AdminStationDrawer.tsx` + `AdminStationDrawerContext.tsx`), layout and navigation chrome.
4. **Station Manager is coordinator-only.** It owns: registration APIs; station definitions; data-source registration and resolution; template-kit registration contracts and resolution; drawer-template registration contracts and resolution; surface-binding registration and resolution; ordering and availability coordination; boot/finalize; runtime coordination (`StationSurfaceHost`); record identity; retained-collection infrastructure. It does **not** own: UI primitives, presentation components, template implementations, domain data, business persistence, Service logic, Package logic, pricing rules, lifecycle rules, drawer editing logic.
5. **Admin Station authors presentation policy through Station Manager:** display location, display order, display conditions, selected template kit, default home destination.
6. **Service Station and Package Station register their owned capabilities** and remain the source of truth for their own data, IDs, lifecycle, validation and saves.
7. **Package Station owns:** Package Families, Rate Sheets, Sources, Relationships, Tiers, grouping, quantity, pricing, Package drawers and editors, Package APIs and persistence.
8. **The generic Admin drawer only hosts the owning Station's drawer contract.** It does not own or directly save Service or Package data.

Consequence of (3): peers importing Admin Station presentation modules (`@/admin-station/presentation/StationStatusPill`, `@/admin-station/presentation/category-groups/types`, `@/admin-station/shell/icons`) is **legal peer capability consumption** — Admin's presentation modules are its public capability surface. These imports are permanent, not transitional.

## I.2 Final ownership map

| Owner | Holds |
|---|---|
| **Station Manager** (`station-manager/`) | registration APIs + resolvers for station definitions (nav + destinations), data sources, template-kit contracts, drawer-template contracts, surface bindings; ordering/placement enforcement; availability coordination (`StationConditions` seam); boot/finalize assertions; `StationSurfaceHost` runtime coordination; `recordIdentity`; `useRetainedCollection`; default-home setting (value authored by Admin) |
| **Service Station** (`resources/ts/service-station/` + `src/Modules/Service/`) | all Service data, IDs, lifecycle, validation, persistence, editing; Service drawer, catalogue kit, surface adapters; public presentation contract (`serviceOverviewShell`, `ServiceOverviewShellData`, `serviceConnectionBinding`); its `register.ts`. (Future increment, out of scope here: Service Categories re-owned from Admin following the PackageFamiliesController pattern) |
| **Package Station** (`package-station/` + `src/Modules/SurfacePackages/`) | Package Families, Rate Sheets, Sources, Relationships, Tiers, grouping, quantity, pricing; Package contracts/endpoints/hooks/vocabulary; tier workspace surface + presentation; Package/Tier drawers, editors, schema; `PackageFamiliesController`, `PackageStationSchema`; its `register.ts`. The Package **Manager** (`PackageManagerSchema` + manager endpoints) is Package-internal supply configuration — never the platform engine |
| **Admin Station** (`resources/ts/admin-station/` + `src/Modules/AdminStation/`) | shell chrome, icons, generic drawer shell, home, theme, styles, boot entry; **its own presentation tools** (template shell, cards/grids/pills/metric/split-action, `CategoryGroupCardsKit`, `ServiceCategoryCarousel`); **presentation policy** (all surface-binding rows, conditions, kit selection, home default) authored through the Manager by string key; Category/Promotion residue until re-owned |
| **Unchanged shared infra** | `drawer-kit/**` (incl. per-entity module DNA with type-only deep imports of peer `types.ts`), `api/client.ts` + `types/{pools,cost-builder}.ts` + residual `admin.ts`, `hooks/{useApi,stationPrimitives,useInlineConfirm}.ts`, `entity-drawers/shared/drawerChrome.ts`, `utils/**`, `runtime/**`, `src/Core/**`, `src/Modules/Admin/Support/{StationLifecycle,CategoryMeta,PoolReferences}.php` |

## I.3 Final registration flow

```
resources/ts/modules/admin-station.ts  (entry — CSS imports, then, in order:)
  ├─ registerServiceStation()        ← service-station/register.ts
  │     nav 'services'(10) · destination 'services' · sources 'services','service-catalogue'
  │     kit 'service-catalogue' · drawer 'service'
  ├─ registerPackageStation()        ← package-station/register.ts
  │     nav 'packages'(20) · destination 'packages'
  │     sources 'package-families','service-tiers','package-tier-workspace'
  │     kit 'tier-workspace' · drawers 'package-family','tier'
  ├─ registerAdminStation()          ← admin-station/register.ts (Admin's OWN capabilities)
  │     nav 'promotions'(30) · destination 'promotions' · source 'service-categories'
  │     kits 'category-group-cards','service-category-carousel' · drawer 'category'
  ├─ registerPresentationPolicy()    ← admin-station/register.ts (Admin's DISPLAY POLICY, string keys only)
  │     binding services/package-families/presentation/0  (kit 'category-group-cards', drawer 'package-family')
  │     binding services/service-catalogue/presentation/1 (kit 'service-catalogue',   drawer 'service')
  │     binding packages/tier-tool/presentation/0         (kit 'tier-workspace',      drawer 'tier')
  │     setDefaultHomeStation('services')
  ├─ finalizeStationRegistry()       ← station-manager/registry/boot.ts
  │     locks registries · builds order-sorted indexes · asserts binding→source/kit resolvability
  │     (moved verbatim from StationSurfaceHost) · asserts nav activationKey → destination
  └─ registry.register({ id:'admin-station', component: AdminStation, conditions:[shortcode] })
```

Rules: `register.ts` files are imported **only** by the entry; no module anywhere calls a resolver at module scope (currently true — verified); Station Manager imports only preact, `@/drawer-kit` types, and itself — never a peer, never admin-station. ES-module evaluation is synchronous and depth-first, so all registration completes before finalize, and finalize before mount. A registration/finalize failure kills the entry pre-mount with a console error — identical failure surface to today's load-time asserts. No fallback renderer.

## I.4 Target directory tree (end state)

```
resources/ts/
  station-manager/                       # coordinator only — names no station, renders no UI primitive
    registry/
      navigation.ts                      # StationNavItem + registerNavItems / headerNavItems() / menuNavItems()
      destinations.ts                    # StationPlacement/StationConditions/StationDestination +
                                         #   registerDestinations / resolveDestination
      surfaceBindings.ts                 # AdminStationSurfaceBinding/StationActionIntent (keys: string) +
                                         #   registerSurfaceBindings / resolveSurfaceBindings +
                                         #   setDefaultHomeStation / defaultHomeStation
      dataSources.ts                     # SurfaceCollection/StationDataSource + registerDataSources / resolveDataSource
      templateKits.ts                    # StationIntentDispatch/TemplateKitProps/TemplateKit +
                                         #   registerTemplateKits / resolveTemplateKit
      drawerTemplates.ts                 # registerDrawerTemplates / resolveDrawerTemplate (re-exports ../drawerTypes)
      boot.ts                            # finalizeStationRegistry()
    drawerTypes.ts                       # DrawerMode/DrawerTemplateKey(string)/DrawerContentProps/…
    StationSurfaceHost.tsx               # runtime coordination (resolver-backed); exports ResolvedStationIntent
    recordIdentity.ts                    # StationRecordId
    useRetainedCollection.ts
  service-station/                       # Service peer (existing) + register.ts + public presentation contract
  package-station/                       # Package peer — full authority
    index.ts  register.ts  CLAUDE.md
    types.ts  api.ts  vocabulary.ts  tierOccupants.ts  rateSheetLabels.ts  evaluateTierPricing.ts
    usePackageStation.ts  usePackageFamilyStation.ts  useSurfacePackages.ts
    surface/ {packageFamily/, tierSurface/, packageTierWorkspace/}
    presentation/ package-tier-workspace/
    drawer/ {package-family/, tier/, editors/, schema/{bindings,entities}/}
  admin-station/                         # Admin Station — presentation & control Station + host shell
    AdminStation.tsx  AdminStationContext.tsx  register.ts
    presentation/
      StationPresentationShell.tsx       # template shell (moved from stations/)
      StationStatusPill.tsx  StationMetricBlock.tsx  StationSplitAction.tsx
      category-groups/ {types.ts, CategoryGroupCard.tsx, CategoryGroupCardGrid.tsx, CategoryGroupCardsKit.tsx}
      service-categories/ServiceCategoryCarousel.tsx
    shell/  {AdminStationLayout,Body,Header,Footer,SlideMenu,Dropdown}.tsx  icons.tsx
      drawer/ {AdminStationDrawer.tsx, AdminStationDrawerContext.tsx}
    stations/serviceCategory/            # Category residue (deferred re-owning)
    home/  theme/  styles/
  entity-drawers/                        # Category residue only: category/, editors/CategoryOverviewEditor.tsx,
                                         #   schema/{bindings,entities}/category.*, shared/drawerChrome.ts
  drawer-kit/  api/  hooks/  runtime/  utils/  components/  modules/    # unchanged ownership

src/Modules/
  SurfacePackages/                       # Package Station backend (complete peer)
    Http/ {PackageStationController, PackageStationReadController, PackageFamiliesController}.php
    Support/ {PackageCategoryGroups, PackageManagerSchema, PackageSchema, PackageStationSchema}.php
    Repositories/PackageRepository.php
  Admin/                                 # shared Support engines + Category/Requests/overview controllers only
  Service/  AdminStation/  …             # unchanged
```

---

# Part II — Architecture gap map (evidence and rationale)

Vocabulary: **Tool** = user-facing operational system. **Skill** = reusable deterministic operation. **AI capability** = reasoning-backed operation. **Connector** = integration boundary. Capability lifecycle: registered (platform) → available (to a Station) → activated (for an owning entity; record held by the owner).

## Q1 — Systems already behaving like parts of a Station Manager

| File | Current responsibility | Manager function |
|---|---|---|
| `resources/ts/runtime/registry.ts` (+`mount.ts`,`conditions.ts`) | app-module registry with conditional mount | registers definitions + runtime activation (app level) — the one true registration API today |
| `admin-station/stations/surfaceBindings.ts` | static wall table + uniqueness assert + order sort | ordering/placement + (dormant) availability |
| `admin-station/stations/dataSources.ts` | `key → hook` map | data-source capability registry (enumerated) |
| `admin-station/presentation/templateKits.tsx` | `key → kit` map + `TemplateKitProps` contract | kit capability registry (enumerated) |
| `admin-station/stations/drawers/drawerRegistry.tsx` (+`drawerTypes.ts`) | `key → drawer host` map + well-formedness assert | drawer capability registry (enumerated) |
| `admin-station/navigation/{destinations,stationNavigation}.ts` | destinations (asserted) + nav rows | station definitions (enumerated) |
| `admin-station/stations/StationSurfaceHost.tsx` + `StationPresentationShell.tsx` | binding→source→kit→intent composition + resolvability assert | runtime coordination |
| `src/Core/Plugin.php` | hard-coded module boot list | backend station definitions (static) |
| `src/Core/Health.php` | `Health::register(name, callable)` | cleanest existing self-registration precedent |
| `src/Core/PlatformAccess.php` | `manage_compuzign` cap/role/grant | permissions (platform-binary only) |
| `drawer-kit/utils/moduleNotifications/shared.ts` + `moduleStatus.tsx` | rule-evaluation engine with per-entity DNA | skill framework (enumeration, not registration) |

The mechanisms exist and are proven; missing everywhere is the inversion (peers push; today the host enumerates) and any notion of tool identity, availability evaluation, or per-entity activation.

## Q2 — Genuinely generic and reusable files

Move to Station Manager (entity-neutral coordination/infrastructure): `admin-station/stations/recordIdentity.ts` (zero imports), `stations/useRetainedCollection.ts` (consumed by Service, Package, Category hooks), `stations/StationSurfaceHost.tsx` (converted to resolver lookups), `stations/drawers/drawerTypes.ts` (cross-peer drawer contract; `DrawerTemplateKey` widens to `string`), plus the registry mechanisms extracted from the six table files. Risk: path repoints only; the host conversion carries the resolvability assert into `finalizeStationRegistry()`.

Generic **and correctly Admin-owned by decision 3** (keep; peers consume them as Admin Station capabilities): `presentation/StationStatusPill.tsx`, `StationMetricBlock.tsx`, `StationSplitAction.tsx`, `presentation/category-groups/{types,CategoryGroupCard,CategoryGroupCardGrid}`, `shell/icons.tsx`, the generic drawer shell `shell/drawer/*`, `stations/StationPresentationShell.tsx` (relocates within Admin to `presentation/` as the template shell).

Keep in place (correct owners): `hooks/{useApi,stationPrimitives,useInlineConfirm}.ts`, `drawer-kit/**`, `api/client.ts` + `types/{pools,cost-builder}.ts`, `runtime/*`, `utils/*`, `entity-drawers/shared/drawerChrome.ts`, backend `Admin/Support/{StationLifecycle,CategoryMeta,PoolReferences}.php` (shared skills with five consumers; moving is churn with regression risk), `src/Core/**`.

## Q3 — Files fusing multiple owners (the actual mislocations)

| File | Problem | Action |
|---|---|---|
| `admin-station/stations/surfaceBindings.ts` | fuses the binding engine (Manager), the wall rows (Admin display policy), and `DEFAULT_HOME_STATION` (Admin policy) | **split** in phase 5: engine → `station-manager/registry/surfaceBindings.ts`; rows + home default → `registerPresentationPolicy()` in `admin-station/register.ts` |
| `stations/dataSources.ts` | registry mechanism + entries value-importing Service peer and Package/Category code | **split**: mechanism → Manager; entries → owners' `register()` |
| `presentation/templateKits.tsx` | kit contract + registry + `CategoryGroupCardsKit` implementation + entries | **split three ways**: contract + registry → Manager; `CategoryGroupCardsKit` → `admin-station/presentation/category-groups/CategoryGroupCardsKit.tsx` (Admin's own kit); entries → owners' `register()` |
| `stations/drawers/drawerRegistry.tsx` | registry + entries | **split**: mechanism → Manager; entries → owners' `register()` |
| `navigation/{destinations,stationNavigation}.ts` | definition types/resolvers + hard-coded rows | **split**: types/resolvers → Manager; rows → owners' `register()` |
| `admin-station/styles/admin-station.css` | carries peer visual systems (`.cz-tier-workspace__*`) | **keep** — style split is a later effort; high churn, no ownership gain now |
| `hooks/{useAdminCatalog,useAdminOverview}.ts` | legacy adapters, no station-shell consumers | **keep**, flagged deletion candidates for a later cleanup |

## Q4 — Package-specific assumptions and how the locked model neutralises them

1. Cross-station wall (`services/package-families`): placement is **Admin presentation policy** (decision 5) — no peer places itself on another station's page; Package still owns the family data, drawer, and saves (decision 7). Neutralised.
2. UI primitives and the coordinator: primitives are **Admin Station's owned tools** (decision 3); the Manager owns none (decision 4). Neutralised.
3. `category-group-cards` kit: an **Admin Station capability**, registered by `registerAdminStation()` — Admin is a Station whose tools are presentation tools; the kit is one of them. No longer residue. (It remains load-bearing for the Package Families wall — finalize throws loudly if unregistered; documented in the Manager code map.)
4. Tool identity: the Tier tool is still four correlated-by-convention registrations (source + kit + drawer + Admin's binding). A first-class tool record is a reserved seam, built only when a real consumer arrives.
5. Naming collision: backend "Package Station **Manager**" (`PackageManagerSchema`, `fetchPackageStationManager`) is Package-internal supply configuration, never the platform **Station Manager**. Phase 6 docs disambiguate explicitly.
6. Generic-sounding keys (`tier-workspace`, `service-tiers`) stay (behaviour); registry docs name the owner.
7. Service-scoped Package URLs (`/admin/services/{id}/package-station/...`): `{id}` is navigation context, never storage — docs note.

## Q5 — Manager capabilities present under other names

Station definitions → destinations/nav tables + `Plugin::boot()` + runtime registry. Tools → the source/kit/drawer/binding cluster. Skills → `StationLifecycle`, `CategoryMeta`, `PoolReferences`, `stationPrimitives`, `moduleNotifications/shared`, `moduleStatus`, `evaluateTierPricing`, `drawerChrome`. AI capabilities → **nothing exists** (verified: no AI/LLM/provider code; grep hits were substring false positives). Connectors → hard-wired: `api/client.ts`, `MailService` + `NotificationTemplates`, peer public barrels, `/health`. Permissions → `PlatformAccess::CAP` + `requireAdmin` (backend-binary). Ordering/placement → `binding.order` + stable sort. Availability → dormant `StationConditions` (only `scope:'current'` ever set; no evaluator). Runtime activation → load-time asserts + host resolution; `Health::register/run`.

## Q6 — Genuinely missing

1. **Registration API + boot/finalize contract** — the only missing piece with current consumers. Built in phase 5.
2. Tool identity records — reserved seam; no consumer yet.
3. Availability evaluation over `StationConditions` — reserved; no consumer.
4. Per-entity activation ("Tier tool activated for KAIROS") — no ledger anywhere; when built, the mechanism is the Manager's, the **records live in the owning Station's storage** (never generic shared business storage).
5. Frontend permission granularity (today: one shortcode gate) — anchored on `PlatformAccess` when needed.
6. Skill registry — deliberately absent (skills are healthy as direct imports; registration adds indirection with zero benefit; AGENTS.md abstraction-evidence rule).
7. AI capability registry / connector registry — nothing to register; must stay absent until a first real capability exists.

## Q7 — Remains inside Service Station

Everything in `resources/ts/service-station/**` + `src/Modules/Service/**`; the public presentation contract added in phase 4; its `register.ts` added in phase 5. **Service Categories** are Admin-hosted today (`AdminCategoriesController`, `AdminCategoryGroupsController`, `CategoryMeta`; frontend `stations/serviceCategory/`, `entity-drawers/category/`, `hooks/useCategoryStation.ts`, `useServiceCategoryGroupStation.ts`) — the model assigns them to Service Station; **re-owning is a separate future increment** following the PackageFamiliesController pattern (out of scope here; `CategoryMeta` has five consumers including CostBuilder and PackageRepository).

## Q8 — Remains inside Package Station

The full phases 1–4 inventory (Part III): backend `SurfacePackages` incl. `PackageFamiliesController` + `PackageStationSchema`; frontend `package-station/**` — contracts, endpoints, hooks, vocabulary, occupants, rate-sheet labels, `evaluateTierPricing`, surface, presentation, drawers/editors/schema. Package Families, Rate Sheets, Sources, Relationships, Tiers, grouping, quantity, pricing, persistence (decision 7).

## Q9 — Remains inside Admin Station

Shell chrome + icons + generic drawer shell (hosting the owning Station's drawer contract only — decision 8), home, theme, styles, boot entry; its presentation tools (decision 3); presentation policy authored through the Manager (decision 5); Category/Promotion residue until re-owned. Admin is never the source of truth for Service or Package data — enforced by phases 1–4.

## Q10 — Moves into Station Manager

Exactly decision 4's list, sourced from: `stations/surfaceBindings.ts` (engine + resolvers + default-home setting API), `stations/dataSources.ts` (contract + registry), `presentation/templateKits.tsx` (contract + registry only), `stations/drawers/{drawerRegistry,drawerTypes}` (contracts + registry), `navigation/{destinations,stationNavigation}` (types + resolvers), `stations/StationSurfaceHost.tsx`, `stations/recordIdentity.ts`, `stations/useRetainedCollection.ts`, plus the new `registry/boot.ts`. Nothing else.

## Q11 — Already correctly owned; move nothing

`drawer-kit/**`, `api/**` (residual `admin.ts` = Category/Promotion/Requests/overview), `hooks/{useApi,stationPrimitives,useInlineConfirm}`, `entity-drawers/shared/drawerChrome.ts`, `utils/**`, `runtime/**`, `components/**`, `src/Core/**`, `src/Modules/{Service,Requests,Promotions,CostBuilder,Homepage,AdminStation}/**`, `src/Modules/Admin/Support/*`, `src/Modules/SurfacePackages/**` (after phase 1), and — per decision 3 — Admin Station's presentation and shell primitives.

## Q12 — Former blueprint conflicts, now resolved by the locked decisions

| # | Location | Was | Resolution (locked) |
|---|---|---|---|
| 1 | phase 5 register design | Package registered the `services/package-families` wall | Admin authors all binding rows via `registerPresentationPolicy()`; peers register capabilities only |
| 2 | phase 5 coordinator layout | coordinator absorbed icons/pills/cards | primitives stay under Admin Station (decision 3); the Manager owns no UI |
| 3 | phase 5 residue design | `category-group-cards` registered as Category residue | it is an Admin Station capability registered by `registerAdminStation()` |
| 4 | naming | `station-core` / undecided | `resources/ts/station-manager/` (decision 1) |
| 5 | phase 0 doc | station-core framing | blueprint doc presents the Station Manager model |
| 6 | phase 6 docs | station-core vocabulary; no Package-Manager disambiguation | Manager vocabulary + explicit disambiguation + reserved seams |

Phases 1–4 never conflicted: they build the domain peers the Manager coordinates.

## Q13 — Verdict on the coordinator

The Manager as scoped in decision 4 is **not** another wrong abstraction: every registry it generalises has multiple live consumers today (Service peer, Package code, Admin/Category capabilities across six tables), the registration API changes dependency direction without inventing speculative capability types, and boot/finalize preserves the existing load-time assertions. The wrong-abstraction risks (UI in the coordinator, peers owning placement, empty tool/skill/AI/connector registries) are all excluded by the locked decisions; reserved seams are documented, not built.

## Q14 — Smallest safe sequence

Phases 0–6 in Part III. No restart; no working domain logic rewritten. Later, strictly consumer-driven (not scheduled): tool-identity records; availability evaluator; per-entity activation (records in the owning Station); frontend permission granularity; skill/AI/connector registries when the first real capability exists; Service Categories re-owned into Service Station.

## A — Engine pieces already present
The six static registries, the neutral hosts, the generic drawer shell, `recordIdentity`, `useRetainedCollection`, the runtime module registry with conditional mounting, load-time assertions; backend `Plugin::boot()`, `Health::register/run`, `PlatformAccess`, shared skill engines, the module-notification/status framework.

## B — Missing pieces
Registration API + boot/finalize (built in phase 5 — the only piece with live consumers); tool identity; availability evaluation; per-entity activation ledger (owner-stored); frontend permission granularity; skill/AI/connector registries (deliberately deferred until first real consumer).

## C — Conflicts
Six, all resolved by the locked decisions (Q12). None remain.

## D — Ownership map
Part I.2 (final).

## E — Phase order
Part III (final): 0 → 1 → 2 → 3 → 4 → 5 → 6, one commit each, never pushed.

## F — Stop/go
**GO.** All decisions locked; Part III is the execution contract.

---

# Part III — Implementation Agent Handoff

Execute phases in order. One commit per validated phase; never push; never rewrite history. Rebuild `dist/` with every frontend phase and stage it if changed (`emptyOutDir` is false — check for orphaned hashed chunks). Rollback boundary for every phase: revert that phase's single commit. Do not start Rate Sheet feature work. Update affected code maps within each phase (docs-check enforces path/link validity); the full peer-model rewrite lands in phase 6.

**Standard frontend validation suite** (from plugin root; run after phases 2–5; PHP-only subset after phase 1):

```
npx tsc --noEmit
npm run build
php tests/service-route-baseline.php && php tests/package-category-groups.php \
  && php tests/package-manager-schema.php && php tests/active-package-contract.php \
  && php tests/tier-occupant-compatibility.php && php tests/tier-pricing-parity.php
npm run docs:check
npx tsx scripts/service-catalogue-projection-contract.ts
npx tsx scripts/package-tier-workspace-contract.ts
npx tsx scripts/tier-occupant-admin-contract.ts
npx tsx scripts/tier-pricing-parity-contract.ts
```

## Phase 0 — blueprint document

- **Create** `docs/architecture/station-manager-consolidation-v1.md` (`**Status:** Active`): the Part I locked architecture + Part II summary + Part III phases. docs-check rule: not-yet-existing paths (`station-manager/`, `package-station/`) go in fenced code blocks or without the `resources/` prefix; existing paths cited normally.
- **Validation:** `npm run docs:check`.
- **Commit:** `docs: add Station Manager consolidation blueprint`

## Phase 1 — backend Package ownership

- **Move + rename:** `src/Modules/Admin/Http/AdminPackageCategoryGroupsController.php` → `src/Modules/SurfacePackages/Http/PackageFamiliesController.php` — class `PackageFamiliesController`, namespace `CompuZign\Platform\Modules\SurfacePackages\Http`; keep `use CompuZign\Platform\Modules\Admin\Support\StationLifecycle`; keep sub-namespace `use` lines (`Repositories\PackageRepository`, `Support\PackageCategoryGroups`, `Support\PackageManagerSchema`); update docblock.
- **Move:** `src/Modules/Packages/Support/PackageStationSchema.php` → `src/Modules/SurfacePackages/Support/PackageStationSchema.php`; namespace → `...\SurfacePackages\Support`.
- **Delete:** `src/Modules/Packages/` (empty after the move).
- **Edit:** `src/Modules/Admin/AdminModule.php` (remove `use` + instantiation; drop "Package Families" from docblock). `src/Modules/SurfacePackages/SurfacePackagesModule.php` (add `use` + `(new PackageFamiliesController())->register();`). `src/Modules/SurfacePackages/Support/PackageManagerSchema.php` (remove now-same-namespace `use ...Packages\Support\PackageStationSchema`). `src/Modules/SurfacePackages/Http/PackageStationController.php` (`use` → `...\SurfacePackages\Support\PackageStationSchema`). Tests `tests/{active-package-contract,package-category-groups,package-manager-schema,tier-pricing-parity}.php` (`require_once` path + `use` alias → SurfacePackages). Run `composer dump-autoload -o`; stage `vendor/composer/autoload_classmap.php` + `autoload_static.php`.
- **Docs:** repoint markdown links in `docs/code-map/package-manager.md` (~27), `service-catalogue.md` (~24), `service-connections.md` (~21). Correct the two backtick paths in `docs/architecture/service-station-consolidation-v1.md` (~25, ~95). `src/Modules/Admin/CLAUDE.md` (drop Package Families claims). `src/Modules/SurfacePackages/CLAUDE.md` (add both files; add `php tests/package-category-groups.php`, `active-package-contract.php`, `tier-pricing-parity.php` to validation). `docs/project-history/PackageCategoryGroups-v1.md` untouched (immutable; exempt).
- **Behaviour unchanged:** all 8 routes `/admin/package-category-groups...` (paths/methods/args/permissions `PlatformAccess::CAP`), payloads, `cz_package_station` storage, health checks. Do **not** touch `PackageStationReadController`'s `manage_options` permission (known inconsistency — observation only).
- **Validation:** `php -l` on every changed PHP file; all six `php tests/*.php`; baseline still 49 routes; `npm run docs:check`.
- **Commit:** `refactor: move Package Family controller and Package schema into SurfacePackages`

## Phase 2 — Package Station peer: contracts + data

- **Create `resources/ts/package-station/`:**
  - `types.ts` — move from `resources/ts/api/types/admin.ts`: `BinnedOccupant`, `OccupantBinEntry`, `ServicePackageStationData`, `ServicePackageStationResponse`, `ServiceTierSaveResponse`, `PackageManagerSourceType`, `PackageManagerModuleTransition`, `PackageManagerGroup`, `PackageManagerItem`, `PackageFamilyStatus`, `PackageFamilyDependents`, `PackageFamilyItem`, `PackageFamilyListItem`, `PackageFamilyListResponse`, `PackageFamilyMutationResponse`, `PackageFamilyDeleteResponse`, `PackageManagerProjectionInclusion`, `PackageManagerProjectionFaq`, `PACKAGE_RATE_SHEET_UNITS`, `PackageRateSheetUnit`, `PackageRateSheetItem`, `PackageRateSheet`, `PackageManagerReadModel`, `PackageSourceRelationship`, `PackageManagerResponse`, `PackageManagerItemDecision`, `PackageManagerSavePayload`, `PackageManagerSaveResponse`, `SurfaceTierSummary`, `SurfaceServiceRef`, `SurfacePackageSummary`, `SurfacePackagesResponse`, `SurfaceTierDetail`, `TierOverviewDraft`, `TierRateSheetSelection`, `TierResolvedRateSheetSelection`, `TierDrafts`, `TierModuleKey`, `TierModuleSavePayload`, `TierLifecycleResponse`, `TierArchiveResponse`, `BinRestoreResponse`, `BinTrashResponse`, `BinDeleteResponse`, `TierSavePayload`. Type-only imports limited to `@/api/types/pools` / `@/api/types/cost-builder`. **Not moved:** Promotion types (`BasedOnTier`, `PromotionTier`, `PromotionTierPayload`, `ServicePromotion*`), Category, Requests, `AdminOverview`.
  - `api.ts` — move from `resources/ts/api/endpoints/admin.ts` (verbatim, incl. the four currently-unconsumed ones): `fetchPackageFamilies`, `createPackageFamily`, `savePackageFamilyOverview`, `settlePackageFamilyOverview`, `revertPackageFamilyOverview`, `updatePackageFamilyStatus`, `restorePackageFamily`, `permanentDeletePackageFamily`, `fetchServicePackageStation`, `fetchPackageStationManager`, `savePackageStationManager`, `saveServicePackageStationTier`, `setServicePackageStationTierEnabled`, `saveServicePackageStationTierModule`, `revertServicePackageStationTierModule`, `settleServicePackageStationTier`, `archiveServicePackageStationTierOccupant`, `restoreServicePackageStationBinEntry`, `trashServicePackageStationBinEntry`, `deleteServicePackageStationBinEntry`, `setServicePackageStationPopular`, `fetchSurfacePackages`.
  - **Move files:** `resources/ts/hooks/usePackageStation.ts`, `hooks/usePackageFamilyStation.ts`, `hooks/useSurfacePackages.ts` → station root; `resources/ts/entity-drawers/shared/tierOccupants.ts`, `entity-drawers/shared/rateSheetLabels.ts` → station root; `resources/ts/modules/packages/evaluateTierPricing.ts` → `package-station/evaluateTierPricing.ts`.
  - `index.ts` — public barrel: all contracts, all endpoints, the three hooks + their public types.
  - `CLAUDE.md` — modeled on `resources/ts/service-station/CLAUDE.md` (data boundary; externals import only the barrel; siblings import `./types`/`./api`, never the barrel; route ownership, not URL shape, decides endpoint placement).
- **Delete:** the six moved source files + `resources/ts/modules/packages/`.
- **Edit (imports):**
  - `api/types/admin.ts` + `api/endpoints/admin.ts`: remove moved items + now-unused imports; add note "Package contracts/endpoints are owned by Package Station and are NOT re-exported here. Import them from '@/package-station'." (mirrors the Service note).
  - Moved hooks internals: `usePackageStation` — `./stationPrimitives` → `@/hooks/stationPrimitives`; occupants/labels → `./tierOccupants`/`./rateSheetLabels`; endpoints/types → `./api`/`./types`; keep `@/service-station` + `@/drawer-kit` imports. `useSurfacePackages` — `./useApi` → `@/hooks/useApi`. `usePackageFamilyStation` — endpoints/types → `./api`/`./types`.
  - Old-tree consumers → `@/package-station`: `admin-station/stations/tierSurface/{useServiceTierCards,tierOccupantCard,useHostService}.ts`; `stations/packageTierWorkspace/usePackageTierWorkspace.ts`; `stations/packageFamily/{cardAdapter,relationships,usePackageFamilyCards,usePackageFamilyRecord,usePackageFamilyRelationships}.ts`; `entity-drawers/tier/{TierDrawerContent.tsx,tierDrawerTypes.ts,tierDetailModel.ts,useTierDrawerController.ts,useTierBinTravel.ts,useTierModuleEditing.ts}`; `entity-drawers/package-family/{usePackageFamilyDrawerController.ts,packageFamilyDrawerTypes.ts}`; `entity-drawers/schema/bindings/{tier,packageFamily}.tsx`; `entity-drawers/schema/entities/{tier,packageFamily}.ts`; `entity-drawers/editors/{PackageFamilyOverviewEditor,TierOverviewEditor,PoolInclusionsEditor}.tsx`.
  - `service-station/surface/ServiceDrawerHost.tsx`: `@/hooks/useSurfacePackages` → `@/package-station`.
  - `drawer-kit/utils/moduleNotifications/package.ts` + `drawer-kit/utils/moduleStatus.tsx`: `@/api/types/admin` → type-only `@/package-station/types` with the cycle-avoidance comment (mirror `moduleNotifications/service.ts:5-7`).
  - Scripts: `scripts/tier-occupant-admin-contract.ts` (tierOccupants path); `scripts/tier-pricing-parity-contract.ts` (evaluateTierPricing path).
- **Docs:** repoint paths in `docs/code-map/{package-manager,tiers,rate-sheet,service-connections,drawer-system,entity-drawer-recovery,admin-station-drawer}.md`.
- **Behaviour unchanged:** identical REST calls and UI.
- **Validation:** standard suite. **Commit:** `refactor: establish Package Station as a top-level peer (contracts + data)`

## Phase 3 — Package surface + presentation

- **git mv (folder names preserved):** `admin-station/stations/packageFamily/` (7 files) → `resources/ts/package-station/surface/packageFamily/`; `stations/tierSurface/` (4) → `surface/tierSurface/`; `stations/packageTierWorkspace/` (3) → `surface/packageTierWorkspace/`; `admin-station/presentation/package-tier-workspace/` (5) → `package-station/presentation/package-tier-workspace/`.
- **Edit (imports in moved files):** host-relative imports become absolute: `../useRetainedCollection` → `@/admin-station/stations/useRetainedCollection`; `../recordIdentity` → `@/admin-station/stations/recordIdentity`; `../drawers/drawerTypes` → `@/admin-station/stations/drawers/drawerTypes`; `../templateKits` (type) → `@/admin-station/presentation/templateKits` (these four repoint again to `@/station-manager/...` in phase 5); `../../shell/icons` → `@/admin-station/shell/icons`; `../../presentation/category-groups/{types,CategoryGroupCardGrid}` → `@/admin-station/presentation/category-groups/...`; `../StationStatusPill`/`StationMetricBlock`/`StationSplitAction` → `@/admin-station/presentation/...` (these are **permanent** — Admin Station capabilities). Sibling imports within `surface/` stay relative.
- **Edit (registries):** `admin-station/stations/dataSources.ts` — `package-families` → `@/package-station/surface/packageFamily`; `service-tiers` → `@/package-station/surface/tierSurface/useServiceTierCards`; `package-tier-workspace` → `@/package-station/surface/packageTierWorkspace/usePackageTierWorkspace`. `admin-station/presentation/templateKits.tsx` — `tier-workspace` → `@/package-station/presentation/package-tier-workspace/PackageTierWorkspace`. `admin-station/stations/drawers/drawerRegistry.tsx` — `package-family` → `@/package-station/surface/packageFamily/PackageFamilyDrawerContent`; `tier` → `@/package-station/surface/tierSurface/TierDrawerHost`.
- **Edit (peers/scripts):** `service-station/surface/{useServiceCatalogue,serviceCatalogueAdapter}.ts`: `@/admin-station/stations/packageFamily` → `@/package-station` (add `usePackageFamilyRelationships`, `packageFamiliesForService`, type `PackageFamilyRelationship` to the barrel). `scripts/service-catalogue-projection-contract.ts` + `scripts/package-tier-workspace-contract.ts` → new `package-station/surface/...` paths.
- **Delete:** the four moved directories under `admin-station/`.
- **Docs:** repoint `docs/code-map/{admin-station-cards,tiers,package-manager,service-station,service-catalogue,drawer-system,admin-station-drawer}.md`.
- **Behaviour unchanged:** registry keys, binding rows, wall order, all UI.
- **Validation:** standard suite. **Commit:** `refactor: move Package surface and presentation into Package Station`

## Phase 4 — Package drawer, editors, schema + vocabulary

- **Move:** `entity-drawers/package-family/` (4 files) → `package-station/drawer/package-family/`; `entity-drawers/tier/` (9) → `drawer/tier/`; `entity-drawers/editors/{PackageFamilyOverviewEditor,TierOverviewEditor,PoolFaqsEditor,PoolInclusionsEditor}.tsx` (Pool editors verified Tier-only) → `drawer/editors/`; `entity-drawers/schema/bindings/{packageFamily,tier}.tsx` → `drawer/schema/bindings/`; `entity-drawers/schema/entities/{packageFamily,tier}.ts` → `drawer/schema/entities/`.
- **Create:** `package-station/vocabulary.ts` — `TIER_KEYS`, `TIER_LABELS` (from `entity-drawers/shared/serviceDrawerShared.ts`); export from the barrel.
- **Edit (Service Station — connection work):** relocate `serviceConnectionBinding` into `service-station/drawer/schema/bindings/service.tsx` (its `decodeHtml` use → `@/utils/format`); `service-station/index.ts` gains a public-presentation-contract section exporting `serviceOverviewShell`, type `ServiceOverviewShellData`, `serviceConnectionBinding`; repoint `service-station/drawer/ServiceDrawerContent.tsx` + `drawer/schema/tables/service.tsx` tier-vocab imports → `@/package-station`; repoint `drawer/useServiceDrawerController.ts` + `ServiceDrawerDialogs.tsx` `decodeHtml` → `@/utils/format`.
- **Edit (Package side):** `drawer/tier/TierDrawerContent.tsx` + `drawer/schema/entities/tier.ts`: deep `@/service-station/drawer/schema/bindings/service` → `@/service-station` barrel; `drawer/tier/useTierDrawerController.ts`: `serviceConnectionBinding` → `@/service-station`; all former `serviceDrawerShared` vocab imports (tier drawer files + `surface/tierSurface/tierOccupantCard.ts`) → relative `../../vocabulary`; drawer hosts: `surface/packageFamily/PackageFamilyDrawerContent.tsx` → `../../drawer/package-family/PackageFamilyDrawerContent`, `surface/tierSurface/TierDrawerHost.tsx` → `../../drawer/tier/TierDrawerContent`; `@/entity-drawers/shared/drawerChrome` imports stay (shared with Category and Service).
- **Delete:** `entity-drawers/shared/serviceDrawerShared.ts` + all moved paths. Remaining `entity-drawers/`: `category/*`, `editors/CategoryOverviewEditor.tsx`, `schema/{bindings,entities}/category.*`, `shared/drawerChrome.ts`.
- **Docs:** repoint `docs/code-map/{tiers,drawer-system,entity-drawer-recovery,service-connections,package-manager}.md`; update `service-station/CLAUDE.md` (serviceDrawerShared gone; drawerChrome remains shared).
- **Behaviour unchanged:** all four drawers render identically; Tier Connections tab renders the Service overview shell via the barrel.
- **Validation:** standard suite. **Commit:** `refactor: move Package drawer, editors, and schema into Package Station`

## Phase 5 — Station Manager extraction + registration inversion

Rules restated: the Manager imports only preact, `@/drawer-kit` types, itself; `register.ts` files imported only by the entry (never re-exported from a peer barrel); no module-scope resolver calls anywhere.

- **Create `resources/ts/station-manager/`** (per Part I.4 tree):
  - `registry/navigation.ts` — `StationNavItem` (unchanged shape) + `registerNavItems(items)` (throws: finalized; duplicate id) + `headerNavItems()` / `menuNavItems()` (filtered + order-sorted arrays built once at finalize; throw pre-finalize).
  - `registry/destinations.ts` — types `StationPlacement`/`StationConditions`/`StationDestination` (moved; keeps type-only `ShellMode` import from `@/drawer-kit/schema/types`) + `registerDestinations(list)` (throws: finalized; duplicate id; duplicate projection) + `resolveDestination(activation)` (unchanged null-for-unmapped semantics; index built at finalize).
  - `registry/surfaceBindings.ts` — types `AdminStationSurfaceBinding`/`StationActionIntent` (names unchanged); `DataSourceKey`/`TemplateKitKey` become `string` aliases + `registerSurfaceBindings(list)` (throws: finalized; duplicate `stationId::surfaceId::placement`) + `resolveSurfaceBindings(stationId, placement)` (stable-sorted by `order` at finalize; ties = boot invocation order) + `setDefaultHomeStation(id)` (throws if set twice or post-finalize) + `defaultHomeStation()`.
  - `registry/dataSources.ts` — `SurfaceCollection`/`StationDataSource` + `registerDataSources(record)` (throws: finalized; duplicate key) + `resolveDataSource(key)` (throws unknown — post-finalize this means the registry was bypassed).
  - `registry/templateKits.ts` — `StationIntentDispatch`/`TemplateKitProps`/`TemplateKit` + `registerTemplateKits(record)` + `resolveTemplateKit(key)` (same throw rules).
  - `registry/drawerTemplates.ts` — `registerDrawerTemplates(list)` (throws: finalized; duplicate key; empty `supportedModes`) + `resolveDrawerTemplate(key)` (**unchanged**: null for unknown → the drawer shell's `UnresolvedDrawer`); re-exports types from `../drawerTypes`.
  - `registry/boot.ts` — `finalizeStationRegistry()`: throws on second call; locks all axes; builds derived indexes; runs the binding→source/kit resolvability assert **moved verbatim from `StationSurfaceHost.tsx` (~lines 40–58, message text preserved)**; asserts every nav `activationKey` resolves to a registered destination (the one new assert); sets a finalized-ok flag resolvers require.
  - `drawerTypes.ts` — moved from `admin-station/stations/drawers/drawerTypes.ts`; `DrawerTemplateKey` widens to `string`; everything else verbatim.
  - `StationSurfaceHost.tsx` — moved + converted: `DATA_SOURCES[...]`/`TEMPLATE_KITS[...]` become `resolveDataSource(...)`/`resolveTemplateKit(...)`; module-scope assert deleted; still exports `ResolvedStationIntent`.
  - `recordIdentity.ts`, `useRetainedCollection.ts` — moved verbatim from `admin-station/stations/`.
- **Move within Admin Station:** `admin-station/stations/StationPresentationShell.tsx` → `admin-station/presentation/StationPresentationShell.tsx` (the template shell; imports `resolveSurfaceBindings` + `StationSurfaceHost` from `@/station-manager/...`). Extract `CategoryGroupCardsKit` from `presentation/templateKits.tsx` → `admin-station/presentation/category-groups/CategoryGroupCardsKit.tsx` (imports `TemplateKitProps` type from `@/station-manager/registry/templateKits`, grid/types locally).
- **Create registration files:**
  - `service-station/register.ts` — `registerServiceStation()`: nav `{id:'services', order:10, icon:ServicesIcon}` (icon from `@/admin-station/shell/icons` — Admin capability); destination `services/services/catalog/body/table {scope:'current'}`; sources `services`→`./surface/useServiceCards`, `service-catalogue`→`./surface/useServiceCatalogue`; kit `service-catalogue`→`./presentation/ServiceCatalogue`; drawer `{key:'service', title:'Service', modes:['view','edit'], content: ./surface/ServiceDrawerHost}`.
  - `package-station/register.ts` — `registerPackageStation()`: nav `{id:'packages', order:20, icon:PackagesIcon}`; destination `packages/...`; sources `package-families`, `service-tiers` (registered-but-unbound, as today), `package-tier-workspace`; kit `tier-workspace`→`./presentation/package-tier-workspace/PackageTierWorkspace`; drawers `package-family` (`./surface/packageFamily/PackageFamilyDrawerContent`) + `tier` (`./surface/tierSurface/TierDrawerHost`, title 'Package Tier').
  - `admin-station/register.ts` — `registerAdminStation()`: nav `{id:'promotions', order:30, icon:PromotionsIcon}`; destination `promotions/...`; source `service-categories`→`./stations/serviceCategory/useServiceCategoryCards`; kits `category-group-cards`→`./presentation/category-groups/CategoryGroupCardsKit`, `service-category-carousel`→`./presentation/service-categories/ServiceCategoryCarousel`; drawer `category`→`./stations/serviceCategory/CategoryDrawerHost`. And `registerPresentationPolicy()`: the three binding rows transcribed 1:1 from today's `SURFACE_BINDINGS` (`services/package-families/presentation/0` title 'Package Families', intents `[view→drawer/view]`, kit `category-group-cards`, drawer `package-family`; `services/service-catalogue/presentation/1`, intents `[view→drawer/view]`, drawer `service`; `packages/tier-tool/presentation/0` title 'Tier Workspace Engine', intents `[view→drawer/view, edit→drawer/edit]`, drawer `tier`; all `{scope:'current'}`) + `setDefaultHomeStation('services')`. String keys only — no peer value imports in the policy function.
- **Edit (boot):** `resources/ts/modules/admin-station.ts` — CSS imports unchanged; then `registerServiceStation(); registerPackageStation(); registerAdminStation(); registerPresentationPolicy(); finalizeStationRegistry();` then the existing `registry.register({...})` call.
- **Edit (consumer repoints — Admin):** `AdminStationContext.tsx` (`resolveDestination` + `StationDestination` → `@/station-manager/registry/destinations`); `shell/AdminStationBody.tsx` (`StationPresentationShell` → `../presentation/StationPresentationShell`; `DEFAULT_HOME_STATION` const → `defaultHomeStation()` from `@/station-manager/registry/surfaceBindings`); `shell/AdminStationHeader.tsx` + `shell/AdminStationSlideMenu.tsx` (`headerNavItems()`/`menuNavItems()` become function calls from `@/station-manager/registry/navigation`; icon imports stay `./icons`); `shell/drawer/AdminStationDrawer.tsx` (`resolveDrawerTemplate` → `@/station-manager/registry/drawerTemplates`; `DrawerMode` → `@/station-manager/drawerTypes`); `shell/drawer/AdminStationDrawerContext.tsx` (`ResolvedStationIntent` → `@/station-manager/StationSurfaceHost`; `DrawerMode`/`StationRecordId` → `@/station-manager/...`); `presentation/service-categories/ServiceCategoryCarousel.tsx` (`TemplateKitProps` → `@/station-manager/registry/templateKits`; pill/icons imports unchanged); `presentation/category-groups/types.ts` (`StationRecordId` → `@/station-manager/recordIdentity`); `stations/serviceCategory/useServiceCategoryCards.ts` (`useRetainedCollection` → `@/station-manager/useRetainedCollection`); `stations/serviceCategory/CategoryDrawerHost.tsx` (`DrawerContentProps` → `@/station-manager/drawerTypes`).
- **Edit (consumer repoints — Service Station):** `presentation/ServiceCatalogue.tsx` (`TemplateKitProps` → Manager; `StationStatusPill` + icons imports **unchanged** — Admin capabilities); `surface/useServiceCards.ts` + `surface/useServiceCatalogue.ts` (`useRetainedCollection` → Manager; `category-groups/types` unchanged); `surface/ServiceDrawerHost.tsx` (`DrawerContentProps` → Manager); `surface/serviceCardAdapter.ts` + `presentation/types.ts` **unchanged** (icons + card contract stay Admin).
- **Edit (consumer repoints — Package Station):** `surface/packageFamily/usePackageFamilyCards.ts`, `surface/tierSurface/useServiceTierCards.ts`, `surface/packageTierWorkspace/usePackageTierWorkspace.ts` (`useRetainedCollection` → Manager); `surface/packageFamily/usePackageFamilyRecord.ts` (`StationRecordId` → Manager); `surface/packageFamily/PackageFamilyDrawerContent.tsx` + `surface/tierSurface/TierDrawerHost.tsx` (`DrawerContentProps` → Manager); `presentation/package-tier-workspace/PackageTierWorkspace.tsx` (`TemplateKitProps` → Manager); all `@/admin-station/presentation/...` + `@/admin-station/shell/icons` imports **unchanged** (permanent Admin capabilities).
- **Delete from `admin-station/`:** `navigation/destinations.ts`, `navigation/stationNavigation.ts` (and the empty `navigation/`), `stations/surfaceBindings.ts`, `stations/dataSources.ts`, `stations/StationSurfaceHost.tsx`, `stations/StationPresentationShell.tsx` (moved), `stations/recordIdentity.ts`, `stations/useRetainedCollection.ts`, `stations/drawers/drawerRegistry.tsx`, `stations/drawers/drawerTypes.ts` (and empty `stations/drawers/`), `presentation/templateKits.tsx` (dissolved), `presentation/category-groups/mockCategoryGroups.ts` (dead — zero importers, verified). `admin-station/stations/` then contains only `serviceCategory/`.
- **Behaviour unchanged:** same single bundle (register calls value-import exactly what the static tables imported); wall order 0-before-1 on the services home; nav pills; drawer open/mode/close/save flows; `StationRecordId` uncoerced end-to-end; hook identity stable (registries lock at finalize, before mount); `resolveDrawerTemplate` null-semantics.
- **Docs:** repoint `docs/code-map/{admin-station-surface-binding,admin-station-navigation,admin-station-drawer,admin-station-cards,admin-station,admin-station-home-shell,service-station,service-catalogue}.md` path citations (full rewrite in phase 6); update `service-station/CLAUDE.md` (host-engine couplings → Station Manager; Admin presentation imports = declared capability consumption, not transitional).
- **Validation:** standard suite + runtime smoke: Services home shows the Package Families wall above the catalogue, Packages shows the Tier Workspace, Promotions shows the neutral empty state, no-selection falls back to the services home, all four drawers open in both modes, a drawer save refreshes its originating wall.
- **Commit:** `refactor: extract Station Manager and invert station registration`

## Phase 6 — docs + coverage

- **Code maps:** create `docs/code-map/package-station.md` and `docs/code-map/station-manager.md` (registration API, boot order, invariants, the load-bearing `category-group-cards` note, reserved seams: tools/skills/AI/connectors/permissions/availability/activation); index both exactly once in `000-README.md`. Rewrite to the final model: `admin-station.md` (Admin as presentation & control Station + host), `admin-station-surface-binding.md` (registration + policy authoring + finalize), `admin-station-navigation.md`, `admin-station-cards.md`, `admin-station-drawer.md` (drawer shell hosts the owning Station's contract), `package-manager.md` (explicit: "the Package Manager is Package-internal supply configuration, not the platform Station Manager"), `tiers.md`, `rate-sheet.md`, `service-station.md`, `service-catalogue.md`, `service-connections.md`, `drawer-system.md`, `entity-drawer-recovery.md`, `lifecycle-system.md`. Each ≤600 words; verify links.
- **`docs/ai-index.md`:** ownership rewrite — Station Manager (coordinator), Service Station and Package Station peers, Admin Station as presentation/control Station and thin host, capability vocabulary (tool/skill/AI capability/connector) and lifecycle (registered → available → activated, records owner-stored).
- **Coverage:** add `PackageFamiliesController` to `tests/service-route-baseline.php`'s controller list; regenerate `tests/fixtures/service-route-baseline.json` (49 → 57 routes; inspect the test for its snapshot/regeneration mechanism first).
- **CLAUDE.md sweep:** `package-station/`, `service-station/`, `src/Modules/Admin/`, `src/Modules/SurfacePackages/` — boundaries match end state.
- **Ask the user** whether to create a project-history document for the milestone (never auto-create).
- **Validation:** `npm run docs:check`; `php tests/service-route-baseline.php` (57); full standard suite once.
- **Commit:** `docs: rewrite peer-Station code maps and AI index; test: extend route baseline to Package Family routes`

## Locked ownership rules (for the implementation agent)

1. Station Manager is coordinator-only: registration APIs, contracts, resolvers, ordering/availability coordination, boot/finalize, `StationSurfaceHost`, `recordIdentity`, `useRetainedCollection`. It never contains UI primitives, template implementations, domain data, persistence, Service/Package logic, pricing, lifecycle rules, or drawer editing logic — and never imports a peer or admin-station.
2. Admin Station owns presentation and control tools (`presentation/`, `shell/` incl. icons and the generic drawer shell) and authors presentation policy (binding rows, conditions, kit selection, home default) through the Manager **by string key only**.
3. Service Station and Package Station register their capabilities in their own `register.ts` and remain sole source of truth for their data, IDs, lifecycle, validation and saves. Peer→peer consumption goes through public barrels (`@/service-station`, `@/package-station`); peer→Admin presentation imports (`@/admin-station/presentation/...`, `@/admin-station/shell/icons`) are legal capability consumption.
4. The generic Admin drawer hosts the owning Station's registered drawer contract; it never saves Service or Package data itself.
5. `register.ts` files are imported only by `resources/ts/modules/admin-station.ts`; no module-scope resolver calls; registration completes before `finalizeStationRegistry()`, which completes before mount.
6. No generic shared business storage. Per-entity activation records, when they exist, live in the owning Station's storage.
7. Build no tool/skill/AI-capability/connector registries in these phases — reserved seams are documentation only until a first real consumer exists.
8. Do not change: route paths, REST payloads, permission callbacks (including `PackageStationReadController`'s `manage_options` inconsistency — observation only), storage keys, persisted records, or `dist/` behaviour beyond rebuilds.

## Residual risks

- Phase 5 is the highest-risk step; mitigations are structural (synchronous registration → finalize → mount; assertion text preserved; loud boot failure identical to today's load-time asserts).
- Open key space: unions widen to `string`; runtime guards (duplicate throw at register, resolvability throw at finalize) are the sole check. An optional finalize assert on `drawerTemplateKey` resolvability is **off** (would strengthen behaviour).
- The `category-group-cards` kit (Admin capability) is load-bearing for the Package Families wall — finalize throws if unregistered; documented.
- `category-groups` symbol names are kept (rename deferred as churn); the contract is generic, the owner is Admin.
- Orphaned Package endpoints moved verbatim (capability preserved); future audit candidate.
- `dist/` expected byte-identical on pure moves (Service precedent); if hashes shift, stage and check for orphaned chunks.
