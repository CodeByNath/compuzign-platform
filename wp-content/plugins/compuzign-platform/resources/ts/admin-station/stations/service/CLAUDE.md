# Service Station — Frontend Boundary

## Audit metadata

Last audited: 2026-07-16 Australia/Brisbane
Audited commit: `a9f765f` (current working-tree changes reviewed)
Audited paths:
- `resources/ts/admin-station/stations/service/index.ts`
- `resources/ts/admin-station/stations/service/types.ts`
- `resources/ts/admin-station/stations/service/api.ts`
- `resources/ts/admin-station/stations/service/useServiceStation.ts`
- `resources/ts/api/types/admin.ts`
- `resources/ts/api/endpoints/admin.ts`
- `resources/ts/api/types/pools.ts`
Changes in audited revision: Phase 7 completed the cutover. Every consumer now imports Service contracts, endpoints, and state from this station's barrel; the Service re-export blocks in `api/types/admin.ts` and `api/endpoints/admin.ts` and the `hooks/useServiceStation.ts` forwarder are deleted, as are the pre-extraction aliases. The shared pool contracts moved to the neutral `api/types/pools.ts`, and the editor draft types moved into `types.ts`. Code centralization only — no route, payload, runtime, state, or UI change, and no UI file moved.

## Entry guide

The frontend boundary for the `cz_service` entity, mirroring the backend module `src/Modules/Service`. `index.ts` is the public entry: import Service contracts, endpoints, and state from `@/admin-station/stations/service`, never from the files behind it.

- `types.ts` — the authoritative Service contracts. **Zero imports by design**: modules this station's own graph reaches (`moduleStatus`, `moduleNotifications`) import from this file, so importing back from them would create a cycle. Keep it self-contained.
- `api.ts` — the authoritative endpoint implementations. There is exactly one implementation of each call.
- `useServiceStation.ts` — the authoritative Service state layer: detail fetch, draft-preferred reads, module status/notes, publish gating, and the lifecycle/save/settle/revert actions. Moved verbatim; the public contract is unchanged.

**Anything inside this station's own dependency graph must target sibling modules, not this barrel.** The barrel exports `useServiceStation`, which imports `components/admin/utils/moduleStatus` and `moduleNotifications`; those two therefore import `./types` directly, and routing them through `index.ts` would close a real cycle. External consumers that this station does not reach — the editors, stations, schema bindings, and the other station hooks — import the barrel normally.

**Ownership test:** a function belongs here iff it calls one of the 14 routes owned by the backend `ServiceController`. Route path is not ownership. Endpoints under `/admin/services/{id}/package-station/...` are Package Station or Promotions routes, and several `*Service*`-named functions belong elsewhere — `createServiceCategory`/`updateServiceCategory` are Category-owned, `fetchServicePackageStation` is Package-owned, `fetchServicePromotionStation` is Promotions-owned. Do not adopt a symbol because its name says "Service".

## Scope

**This station holds contracts, endpoints, and state — no UI.** Every Service component, drawer, editor, rendering schema, table, and binding stays in `components/admin`, along with `DynamicStationManager`'s transitional Service branches. They now import this station's barrel directly from where they are, and they move in a later phase. Do not create `ui/`, `home/`, `drawer/`, `selectors/`, or `providers/` here; the four files are flat because one hook does not justify a `state/` folder.

Shared, entity-neutral infrastructure stays outside — Service uses it, it does not own it, and it must never import back:

- `api/client.ts` (`apiClient`) — transport: base URL, headers, parsing, errors. Never duplicate it here.
- `hooks/stationPrimitives.ts` (`patchModuleDraft`) — also used by `usePackageStation` / `usePromotionStation`.
- `components/admin/utils/moduleStatus.tsx`, `moduleNotifications.ts` — multi-entity module status and notes, used across Category, Service Category Group, Promotion, Package, and Tier.

## Naming

Only canonical names exist: `ServiceDetail`, `ServiceSummary`, `ServiceCatalogResponse`. The pre-extraction aliases (`AdminServiceDetailResponse`, `StationSummary`, `AdminCatalogResponse`) were removed at the Phase 7 cutover and every consumer renamed. Do not reintroduce them.

`types.ts` holds two draft families that read alike but are not interchangeable. The `*Data` shapes (`OverviewDraftData`) are what the server stores and returns; the edit drafts (`OverviewDraft`, `InclusionsDraft`, `FaqsDraft`) are what an editor holds mid-edit. `OverviewDraft` carries a single `category_id`; `OverviewDraftData` carries `category_ids`. `useServiceStation` converts between them on save — do not merge them.

## Ownership boundaries

Shared inclusion/FAQ pool contracts — `InclusionItem`, `FaqItem`, `CreateInclusionPoolItemResponse`, `CreateFaqPoolItemResponse` — are owned by the neutral `api/types/pools.ts`, which imports nothing so any station may depend on it. **Do not move them into Service**: Package, Tier, and Promotion depend on them, and claiming them here would invert the dependency for the whole tier/promotion model. `api.ts` consumes them from there.

Service's own `ServiceInclusionItem` / `ServiceFaqItem` are deliberately separate from the shared pool items — they are the module-draft shapes and carry no `missing?` flag. They overlap structurally with `InclusionItem` / `FaqItem` but are not the same contract; merging them would be a contract change, not a move.

`useServiceStation.ts` also imports `SurfacePackageSummary` from `@/api/types/admin`: Package-owned and correctly left there.

## Known boundary debt

One accepted edge remains, resolved when the Service UI moves:

**`useServiceStation.ts` → `@/components/admin/utils/{moduleStatus,moduleNotifications}`** for status resolution and note text. These are genuine multi-entity utilities (Category, Service Category Group, Promotion, Package, and Tier all use them), so they are not Service UI to be moved — but they sit in a UI directory, which leaves a state → UI-directory edge open. They are value imports, so they cannot be erased at compile time. Resolve by relocating them to neutral shared infrastructure during the UI phase, never by copying them here.

The editor draft-type edge is **resolved**: `OverviewDraft` / `InclusionsDraft` / `FaqsDraft` are pure data with no rendering knowledge, so they moved into `types.ts` and the editors import them back. The `init*Draft` builders stay in the editors — they need the DOM.

## Validation

`npx tsc --noEmit` is the response-shape contract — there is no local WordPress runtime, so these types are what guard response drift. Run the production build too.

**Always check cycles** after changing an import or a re-export target: `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular resources/ts`. Expect exactly four, all pre-existing and inside `components/admin`; anything naming `stations/service` is new and must be fixed, not accepted. To prove a relocation changed no behaviour, diff the emitted declaration (`npx tsc -p tsconfig.json --declaration --emitDeclarationOnly --noEmit false --outDir <tmp>`) and compare bundle bytes. A type-only move leaves `dist/js/admin.js` byte-identical; adding or removing a *module* (even a pure re-export) reorders Rollup's output, so expect the same size and a different hash — **save a copy of the bundle before you start** if you want a byte-diff, because it is not reconstructible afterwards.

Read [Service Station](../../../../../../../../docs/code-map/service-station.md) for the ownership boundary and [Service Catalogue](../../../../../../../../docs/code-map/service-catalogue.md) for the implementation and UI.

## Exit guide

After relevant changes, replace audit metadata and stale current-state information. Update related Code Maps and, with user approval, create a new history milestone for significant ownership or architecture decisions. Verify every path; never append audit logs.
