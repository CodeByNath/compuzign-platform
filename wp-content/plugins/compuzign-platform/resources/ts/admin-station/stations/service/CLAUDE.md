# Service Station — Frontend Boundary

## Audit metadata

Last audited: 2026-07-19 Australia/Brisbane
Audited commit: `6ff7bdb` (drawer-kit relocation + Admin Station Service/Tier integration)
Audited paths:
- `resources/ts/admin-station/stations/service/index.ts`
- `resources/ts/admin-station/stations/service/types.ts`
- `resources/ts/admin-station/stations/service/api.ts`
- `resources/ts/admin-station/stations/service/useServiceStation.ts`
- `resources/ts/api/types/admin.ts`
- `resources/ts/api/endpoints/admin.ts`
- `resources/ts/api/types/pools.ts`
Changes in audited revision: the Service UI phase landed, but **nothing moved into this folder** — the four files here are unchanged. The multi-entity `moduleStatus` / `moduleNotifications` utilities relocated to the neutral `drawer-kit/`, closing this station's last known boundary edge; the Service drawer, editors, schema and bindings relocated to `entity-drawers/`; and the Admin Station's Service card wall and drawer host adapter were added in the sibling `stations/serviceSurface/`. This station's public contract is unchanged.

Previously (Phase 7): the cutover completed. Every consumer now imports Service contracts, endpoints, and state from this station's barrel; the Service re-export blocks in `api/types/admin.ts` and `api/endpoints/admin.ts` and the `hooks/useServiceStation.ts` forwarder are deleted, as are the pre-extraction aliases. The shared pool contracts moved to the neutral `api/types/pools.ts`, and the editor draft types moved into `types.ts`. Code centralization only — no route, payload, runtime, state, or UI change, and no UI file moved.

## Entry guide

The frontend boundary for the `cz_service` entity, mirroring the backend module `src/Modules/Service`. `index.ts` is the public entry: import Service contracts, endpoints, and state from `@/admin-station/stations/service`, never from the files behind it.

- `types.ts` — the authoritative Service contracts. **Zero imports by design**: modules this station's own graph reaches (`moduleStatus`, `moduleNotifications`) import from this file, so importing back from them would create a cycle. Keep it self-contained.
- `api.ts` — the authoritative endpoint implementations. There is exactly one implementation of each call.
- `useServiceStation.ts` — the authoritative Service state layer: detail fetch, draft-preferred reads, module status/notes, publish gating, and the lifecycle/save/settle/revert actions. Moved verbatim; the public contract is unchanged.

**Anything inside this station's own dependency graph must target sibling modules, not this barrel.** The barrel exports `useServiceStation`, which imports `drawer-kit/utils/moduleStatus` and `moduleNotifications`; those two therefore import `./types` directly, and routing them through `index.ts` would close a real cycle. External consumers that this station does not reach — the editors, stations, schema bindings, and the other station hooks — import the barrel normally.

**Ownership test:** a function belongs here iff it calls one of the 14 routes owned by the backend `ServiceController`. Route path is not ownership. Endpoints under `/admin/services/{id}/package-station/...` are Package Station or Promotions routes, and several `*Service*`-named functions belong elsewhere — `createServiceCategory`/`updateServiceCategory` are Category-owned, `fetchServicePackageStation` is Package-owned, `fetchServicePromotionStation` is Promotions-owned. Do not adopt a symbol because its name says "Service".

## Scope

**This station holds contracts, endpoints, and state — no UI.** Do not create `ui/`, `home/`, `drawer/`, `selectors/`, or `providers/` here; the four files are flat because one hook does not justify a `state/` folder.

The Service UI phase has since happened, but **not into this folder**. The Service drawer composition, its editors, rendering schema, table and bindings moved to the neutral `entity-drawers/` (with the generic renderer kit in `drawer-kit/`), so both the Command Centre and the Admin Station mount one implementation. The Admin Station's own Service surface — card wall and drawer host adapter — lives in the sibling `stations/serviceSurface/`, deliberately outside this folder so this boundary still holds. `DynamicStationManager`'s transitional Service branches remain in `components/admin`.

Shared, entity-neutral infrastructure stays outside — Service uses it, it does not own it, and it must never import back:

- `api/client.ts` (`apiClient`) — transport: base URL, headers, parsing, errors. Never duplicate it here.
- `hooks/stationPrimitives.ts` (`patchModuleDraft`) — also used by `usePackageStation` / `usePromotionStation`.
- `drawer-kit/utils/moduleStatus.tsx`, `moduleNotifications.ts` — multi-entity module status and notes, used across Category, Service Category Group, Promotion, Package, and Tier.

## Naming

Only canonical names exist: `ServiceDetail`, `ServiceSummary`, `ServiceCatalogResponse`. The pre-extraction aliases (`AdminServiceDetailResponse`, `StationSummary`, `AdminCatalogResponse`) were removed at the Phase 7 cutover and every consumer renamed. Do not reintroduce them.

`types.ts` holds two draft families that read alike but are not interchangeable. The `*Data` shapes (`OverviewDraftData`) are what the server stores and returns; the edit drafts (`OverviewDraft`, `InclusionsDraft`, `FaqsDraft`) are what an editor holds mid-edit. `OverviewDraft` carries a single `category_id`; `OverviewDraftData` carries `category_ids`. `useServiceStation` converts between them on save — do not merge them.

## Ownership boundaries

Shared inclusion/FAQ pool contracts — `InclusionItem`, `FaqItem`, `CreateInclusionPoolItemResponse`, `CreateFaqPoolItemResponse` — are owned by the neutral `api/types/pools.ts`, which imports nothing so any station may depend on it. **Do not move them into Service**: Package, Tier, and Promotion depend on them, and claiming them here would invert the dependency for the whole tier/promotion model. `api.ts` consumes them from there.

Service's own `ServiceInclusionItem` / `ServiceFaqItem` are deliberately separate from the shared pool items — they are the module-draft shapes and carry no `missing?` flag. They overlap structurally with `InclusionItem` / `FaqItem` but are not the same contract; merging them would be a contract change, not a move.

`useServiceStation.ts` also imports `SurfacePackageSummary` from `@/api/types/admin`: Package-owned and correctly left there.

## Known boundary debt

The state → UI-directory edge is **resolved**, and in the prescribed way — by relocation, not by copying.

**`useServiceStation.ts` → `@/drawer-kit/utils/{moduleStatus,moduleNotifications}`.** These are genuine multi-entity utilities (Category, Service Category Group, Promotion, Package, and Tier all use them) and were never Service UI to move here. They previously sat in `components/admin/utils/`, which left a state hook importing out of a UI directory. They now live in the neutral `drawer-kit/`, which both bundles import, so the edge points at shared infrastructure. They remain value imports; that is fine now that the target is neutral. Do not copy them here.

The editor draft-type edge is **resolved**: `OverviewDraft` / `InclusionsDraft` / `FaqsDraft` are pure data with no rendering knowledge, so they moved into `types.ts` and the editors import them back. The `init*Draft` builders stay in the editors — they need the DOM.

## Validation

`npx tsc --noEmit` is the response-shape contract — there is no local WordPress runtime, so these types are what guard response drift. Run the production build too.

**Always check cycles** after changing an import or a re-export target: `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular resources/ts`. Expect exactly **four**: three in `components/admin` and one in `admin-station/presentation` (templateKits ↔ ServiceCategoryCarousel). The earlier "four, all inside `components/admin`" was a miscount — the real baseline was five, and the drawer-kit relocation removed one of them (`schema/types ↔ relations/types`) by giving `ManagerEntityRef` / `StationConnectionDescriptor` a single declaration in the kit. Anything naming `stations/service` is new and must be fixed, not accepted. To prove a relocation changed no behaviour, diff the emitted declaration (`npx tsc -p tsconfig.json --declaration --emitDeclarationOnly --noEmit false --outDir <tmp>`) and compare bundle bytes. A type-only move leaves `dist/js/admin.js` byte-identical; adding or removing a *module* (even a pure re-export) reorders Rollup's output, so expect the same size and a different hash — **save a copy of the bundle before you start** if you want a byte-diff, because it is not reconstructible afterwards.

Read [Service Station](../../../../../../../../docs/code-map/service-station.md) for the ownership boundary and [Service Catalogue](../../../../../../../../docs/code-map/service-catalogue.md) for the implementation and UI.

## Exit guide

After relevant changes, replace audit metadata and stale current-state information. Update related Code Maps and, with user approval, create a new history milestone for significant ownership or architecture decisions. Verify every path; never append audit logs.
