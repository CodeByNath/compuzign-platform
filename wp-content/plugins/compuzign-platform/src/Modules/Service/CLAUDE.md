# Service Backend Boundary

## Audit metadata

Last audited: 2026-07-16 Australia/Brisbane
Audited commit: `a9f765f` (current working-tree changes reviewed)
Audited paths:
- `wp-content/plugins/compuzign-platform/src/Modules/Service/ServiceModule.php`
- `wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php`
- `wp-content/plugins/compuzign-platform/src/Modules/Service/Support/ServiceSchema.php`
- `wp-content/plugins/compuzign-platform/src/Modules/Service/Support/ServicePools.php`
Changes in audited revision: Module created. The Service handlers, helpers, and `ServicePools` moved here from the deleted `Admin\Http\AdminServicesController` and `Admin\Support\ServicePools`. Code centralization only — no route, payload, persistence, validation, permission, lifecycle, or UI change, and no data migration.

## Entry guide

This module is the single backend owner of the `cz_service` entity. `ServiceModule.php` is the boundary and wires one controller, registered from `Core\Plugin` immediately before `AdminModule` — the slot the Service routes previously registered from. `Http/ServiceController.php` owns all 14 Service routes: catalogue list, create, detail, the overview/inclusions/faqs draft saves, per-module and bulk settle, revert, status, restore, permanent delete, and the two immediate pool-creation endpoints.

There is no repository: persistence is WordPress post/meta, so a repository would only wrap `get_post_meta`. `Support/ServiceSchema.php` owns the entity's shape — the `cz_service_*` meta and draft keys, the module vocabulary (`overview`/`inclusions`/`faqs`), and the 14 routes' REST argument definitions, all lifted verbatim. Route *paths* stay as literals in the controller so a URL is greppable from its registration.

`Support/ServicePools.php` is the module's **one public contract**: the Service-owned inclusion/FAQ pool write path. `SurfacePackages\Http\PackageStationController` imports it because tier saves may carry `new_inclusions`/`new_faqs` and must write through Service rather than touch `cz_service_*` meta. That dependency direction is correct and intended. Nothing outside this module may import `ServiceController`, its private helpers, or its route registration.

## Ownership boundaries

Owned: `cz_service` lifecycle, `cz_service_meta`, `cz_service_inclusions`, `cz_service_faqs`, the three `*_draft` keys, the inclusion/FAQ pools, and the `cz_service_category` relationships these handlers write.

**Not owned:**
- `cz_service_pricing` — Cost Builder is the sole authority. Never move, wrap, intercept, or proxy its read/write path. `MetaSchema` is imported only for the shared `platform_status` vocabulary, not pricing.
- Post type and taxonomy registration — `Core\PostTypeRegistrar` and `Core\TaxonomyRegistrar` declare every platform entity in one place and intentionally keep `cz_service`/`cz_service_category`.
- `StationLifecycle`, `PoolReferences`, `CategoryMeta`, `AdminRouter::CAP` — entity-neutral infrastructure in `Admin\Support`. This module uses them; it must not absorb them.
- The `/admin/services/{id}/package-station/...` route family — Service-nested URLs owned by `SurfacePackages` and `Promotions`. Route path is not code ownership.

`PackageRepository` is a dependency of the settle guard only (`poolSettleWarnings` reads the station graph to report still-referenced pool items). It is resolved lazily and must not become a general Service dependency.

## Validation

`php tests/service-route-baseline.php` must report 49 routes matching the unchanged fixture. It proves the request contract only — not response bodies, not handler bodies, and not that the module is wired. Verify `Plugin::boot()` separately when changing registration. Response shapes stay covered by `npx tsc --noEmit` against `resources/ts/api/types/admin.ts`.

Read [Service Station](../../../../../../docs/code-map/service-station.md) for the ownership boundary and [Service Catalogue](../../../../../../docs/code-map/service-catalogue.md) for the implementation and UI.

## Exit guide

After relevant changes, replace audit metadata and stale current-state information. Update related Code Maps and, with user approval, create a new history milestone for significant architecture, behavior, ownership, migration, lifecycle, or design decisions. Verify every path; never append audit logs.

The frontend Service station (`resources/ts/admin-station/stations/service/`) now owns the Service contracts and endpoint functions — see its own boundary doc. It holds no state or UI: `useServiceStation` and every Service component are unmoved. Do not move them as a side effect of backend work.
