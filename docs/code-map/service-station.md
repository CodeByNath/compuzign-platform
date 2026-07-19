# Service Station

## Purpose

The ownership boundary for the Service entity. Its extraction is **code centralization, not data migration**: no data, route, payload, permission, or persistence authority changed, and no UI moved. For the implementation and UI, read [Service Catalogue](service-catalogue.md).

## Service authority

`cz_service` posts and the `cz_service_category` taxonomy are the source of truth. The Station owns the entity: lifecycle, the meta keys `cz_service_meta`, `cz_service_inclusions`, `cz_service_faqs`, the `*_draft` keys, and the category relationships its handlers write.

**Registration is not ownership.** The post type and taxonomy are declared by the shared [PostTypeRegistrar.php](../../wp-content/plugins/compuzign-platform/src/Core/PostTypeRegistrar.php) and [TaxonomyRegistrar.php](../../wp-content/plugins/compuzign-platform/src/Core/TaxonomyRegistrar.php), which register every platform entity in one place. They intentionally stay there: splitting `cz_service` out would fragment a centralized registrar for no behavioural gain.

**Nor every meta key on that post.** Cost Builder owns `cz_service_pricing` — [MetaSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Support/MetaSchema.php), its [importer.php](../../wp-content/plugins/compuzign-platform/app/modules/cost-builder/includes/importer.php), [ServiceRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/CostBuilder/Repositories/ServiceRepository.php) — never proxied through Service, which imports `MetaSchema` only for the shared `platform_status` vocabulary.

## Backend module (complete)

The `AdminServicesController` god-file began at 2705 lines with four tenants. All are evicted; it is **deleted**.

| Tenant | Routes | Owner |
| --- | --- | --- |
| Service + pools | 14 | **moved** → [ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php) |
| Package Station | 13 | **moved** → [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) |
| Promotions | 11 | **moved** → [PromotionsController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Promotions/Http/PromotionsController.php) |
| Service Categories | 2 | **moved** → [AdminCategoriesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminCategoriesController.php) |

[src/Modules/Service/](../../wp-content/plugins/compuzign-platform/src/Modules/Service/CLAUDE.md) is the single backend owner: `ServiceModule.php` (registered from `Core/Plugin.php`), `Http/ServiceController.php`, `Support/`. No repository — persistence is WordPress post/meta. Storage keys and route arguments live in `Support/ServiceSchema.php`, lifted verbatim.

`Support/ServicePools.php` is the module's **one public contract**: the Service-owned inclusion/FAQ pool write path, shared by Service's pool endpoints and Package Station tier saves. `Package Station → ServicePools` is legitimate — it writes references into Service-owned pools, so it must not touch `cz_service_*` meta directly. Nothing outside may import `ServiceController`.

## Route compatibility

Package Station and Promotions lived there only because their data once lived on the Service post. That data moved to the `cz_package_station` option ([PackageRepository.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Repositories/PackageRepository.php)) and the handlers followed, but their URLs stayed **Service-nested** (`/admin/services/{id}/package-station/...`). Route path is not code ownership: those URLs are permanent compatibility contracts owned by other modules.

## Transitional legacy dependencies

All preserved deliberately: Service branches in [DynamicStationManager.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/DynamicStationManager.tsx) (until UI cutover); Cost Builder's direct `get_post_meta` reads of Service; and the legacy `cz_service_package_station` / `cz_service_promotion_station` migration (until Package cutover).

The frontend Service re-exports are **gone**. The Phase 7 cutover redirected every consumer to `@/admin-station/stations/service`, then removed the Service blocks from `api/types/admin.ts` and `api/endpoints/admin.ts` and deleted the `hooks/useServiceStation.ts` forwarder. The pre-extraction aliases (`AdminServiceDetailResponse`, `StationSummary`, `AdminCatalogResponse`) were removed with them; consumers use the canonical names. No compatibility path into Service remains.

## Route baseline harness

[tests/service-route-baseline.php](../../wp-content/plugins/compuzign-platform/tests/service-route-baseline.php) and [its fixture](../../wp-content/plugins/compuzign-platform/tests/fixtures/service-route-baseline.json) capture 49 routes: path, method, permission callback, args. Run it; drift exits 1. Add each new owning controller. **Class-agnostic by design** — callbacks record method name only, so handlers move without fixture churn.

**It proves the request contract, nothing else.** Not response bodies (no local WordPress runtime; `npx tsc --noEmit` covers them via the Service Station types, pricing via [tier-pricing-parity.php](../../wp-content/plugins/compuzign-platform/tests/tier-pricing-parity.php) — **do not fabricate response fixtures**), not handler bodies, not module wiring (it constructs controllers directly; verify `Plugin::boot()` separately). Same-named callbacks are indistinguishable: `updateStatus` exists on both Categories and Service, so **verify the destination class per route** — re-verified after the Service move.

## Target boundary

Backend `src/Modules/Service/` — **complete**. Frontend `resources/ts/admin-station/stations/service/` — **contracts, API, and state complete, and every consumer now imports through `index.ts`**, the sole public entry. The state layer is `useServiceStation.ts` (fetch/state/actions) plus `derive.ts` (pure projections); contract unchanged. Only UI remains: every Service component, editor, schema, and `DynamicStationManager`'s branches stay in `components/admin`. See [its boundary doc](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/stations/service/CLAUDE.md).

Entity-neutral infrastructure stays shared: `StationLifecycle.php`, `PoolReferences.php`, `CategoryMeta.php`, `apiClient`, the relations framework. Service uses them; it does not own them. The shared inclusion/FAQ pool item contracts (`InclusionItem`, `FaqItem`, and the two pool-creation responses) are owned by the neutral [api/types/pools.ts](../../wp-content/plugins/compuzign-platform/resources/ts/api/types/pools.ts) — Service, Package, Tier, and Promotion all consume them, so Service must not claim them.

## Related Code Maps

[Service Catalogue](service-catalogue.md), [Package Manager](package-manager.md), [Promotions](promotions.md), [Categories](categories.md), [Cost Builder](cost-builder.md), [Lifecycle and Module State](lifecycle-system.md), [Admin Station](admin-station.md).
