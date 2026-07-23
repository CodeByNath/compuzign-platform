# Service Station

## Purpose and authority

The ownership boundary for `cz_service`. WordPress Service posts, `cz_service_category` relationships, Service lifecycle, `cz_service_meta`, inclusions, FAQs, and their drafts belong here. The extraction was code centralization, not a data, route, payload, permission, or persistence migration.

Central post-type/taxonomy registrars declare entities but do not own their behaviour. Cost Builder separately owns `cz_service_pricing`; Service must not proxy it.

## Backend

[src/Modules/Service/](../../wp-content/plugins/compuzign-platform/src/Modules/Service/CLAUDE.md) is the backend owner:

- `ServiceModule.php` wires the module from `Core/Plugin.php`.
- `Http/ServiceController.php` owns 14 catalogue/detail/module/lifecycle/pool routes.
- `Support/ServiceSchema.php` owns Service meta keys, module vocabulary, and REST argument definitions.
- `Support/ServicePools.php` is the one public write contract for Service-owned inclusion/FAQ pools. Package Tier saves use it rather than writing Service meta directly.

There is no Service repository because WordPress post/meta access remains cohesive in this boundary; a pass-through wrapper would add no authority.

Package Station and Promotion compatibility URLs remain Service-nested, but their handlers/persistence belong to SurfacePackages and Promotions. Route path is not ownership.

## Frontend boundary

[resources/ts/service-station/](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/CLAUDE.md) owns Service contracts, endpoints, state, and pure derivations. Its catalogue summary includes settled browse copy, creation time, pool counts, and direct Service Category labels. It exposes no taxonomy-parent or Package Family fields. External consumers import its `index.ts`; modules inside its own graph import siblings to avoid cycles.

`service-station/surface/useServiceCatalogue.ts` and `serviceCatalogueAdapter.ts` own the Home read/projection. They join the Service summaries to the Package-owned multi-family relationship read from `stations/packageFamily/usePackageFamilyRelationships.ts`. The Home kit lives at `service-station/presentation/`; it renders current rows and uses the archived read only for its overview count.

Host-neutral Service UI lives under [entity-drawers/service/](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/service/ServiceDrawerContent.tsx), with manifests/bindings/editors under `entity-drawers/schema/` and `entity-drawers/editors/`. The Admin Station adapter [ServiceDrawerHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/surface/ServiceDrawerHost.tsx) mounts that one composition; it is not the UI authority.

Entity-neutral transport, station primitives, drawer-kit presentation, and pool item contracts remain shared. Service consumes them and must not absorb them.

## Contract baseline

[service-route-baseline.php](../../wp-content/plugins/compuzign-platform/tests/service-route-baseline.php) and its fixture record 49 route contracts. It checks paths, methods, permission callbacks, and args—not response bodies, handler bodies, module boot, PHP runtime integration, or browser behavior. TypeScript guards response shape.

## Validation

From the plugin root: `php tests/service-route-baseline.php`, bundle/run `scripts/service-catalogue-projection-contract.ts`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Service Catalogue](service-catalogue.md), [Package Manager](package-manager.md), [Categories](categories.md), [Cost Builder](cost-builder.md), [Lifecycle](lifecycle-system.md), and [Drawer System](drawer-system.md).
