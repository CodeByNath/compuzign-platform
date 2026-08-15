# Service Station

Service is one of the two current implementations of the locked [Station and
Drawer Lifecycle Contract](../architecture/StationDrawerLifecycleContract-v1.md).

## Purpose and authority

Service Station owns `cz_service` posts, Category relationships, meta/drafts,
inclusion/FAQ pools, lifecycle, endpoints, client state, catalogue presentation,
and drawer editing.

Cost Builder separately owns `cz_service_pricing`. Package Station owns Package relationships, Package Families, Rate Sheets, and Tiers. A Service-shaped or Service-nested URL does not transfer authority.

## Frontend peer

[resources/ts/service-station/](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/CLAUDE.md) is the public frontend boundary:

- `types.ts` and `api.ts` own Service contracts and endpoint calls.
- [useServiceStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/useServiceStation.ts) owns state, draft-preferred reads, mutations, lifecycle, and synchronous returned-ID seeding; [derive.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/derive.ts) holds pure projections. Overview Save creates unmasked Pending storage; child saves use that ID, and Publish later settles/activates it. Existing records still fetch detail.
- `surface/` owns catalogue/card adapters and the drawer adapter;
  `presentation/` owns the catalogue kit. `drawer/` owns composition,
  controller hooks, schema, bindings, and editors.
- [register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/register.ts) registers Service navigation, destination, data sources, catalogue kit, and drawer with Station Manager. It is imported only by the admin-station bundle entry and is not public-barrel API.

Station Manager supplies host-engine contracts and resolution only. Admin Station authors placement policy and hosts the resolved presentation/drawer. Service imports of Admin-owned icons and presentation primitives are legal capability consumption, not transferred ownership. Other peers consume Service through [index.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/index.ts).

## Backend

[src/Modules/Service/](../../wp-content/plugins/compuzign-platform/src/Modules/Service/CLAUDE.md) is the backend owner:

- `ServiceModule.php` wires the module.
- [ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php) owns Service catalogue, detail, module, lifecycle, and pool routes. Its authenticated Platform-ID GET resolves a bound Service, then calls the unchanged numeric `fetchDetail` projection.
- [ServiceSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Support/ServiceSchema.php) owns Service keys, module vocabulary, sanitization, and REST arguments.
- [ServicePools.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Support/ServicePools.php) is the public pool-write boundary used by Service and Package Tier saves.
- [Service Catalogue Admin Import Runbook](../service-catalogue-admin-import-runbook.md) records the proven temporary authenticated-Admin workflow for future catalogue batches. No import action remains mounted in the application.

WordPress post/meta access stays cohesive here; there is no pass-through repository. Core post-type/taxonomy registrars declare entities but do not own behavior.

`Core\Plugin` constructs one shared `PlatformIdentifierStation`, which
`ServiceModule` injects into `ServiceController`. Creation reserves `CZS`
identity before the existing insert. Service owns `cz_platform_id` post-meta
and response projection; the Station owns reservation, binding, lookup,
conflict, and deletion tombstone. Numeric routes and native IDs remain
unchanged. Adapters map backend `platform_id` to application `platformId`.
The drawer manifest exposes it through optional `identity.platformIdOf`;
`identity.idOf` still returns the numeric Service ID. Service Overview reads
that `CZS` directly beneath the Service's own **Name** — the term that replaced
"Title" in every label an admin reads or edits, matching Package Family
Overview, which likewise shows Platform ID alone and no native `group_id`.

## Module and lifecycle states

An incomplete Overview is Pending dim; child editors stay locked until Overview
Save creates the record. The returned ID is seeded into the mounted drawer and
Overview becomes Pending full. Child saves become Pending full; Publish settles
eligible drafts and activates them. Empty children remain Pending dim.

Disable/Enable use `/status` with `action: disable|enable`; they never settle, activate, or rewrite module status. `previous_platform_status` is the explicit Disable mask: while stored `platform_status` is `disabled`, a non-empty value means Disabled; empty means unmasked Pending. Disable makes all module pills Disabled. Enable clears the mask and returns configured modules to visual Pending full, while empty children remain Pending dim; it creates no new drafts. Archive/Trash Restore is outside the drawer and follows the same unmasked Pending re-entry, preserving module status and drafts/data. Publish is the only activation action.

## Contract baseline

[service-route-baseline.php](../../wp-content/plugins/compuzign-platform/tests/service-route-baseline.php) snapshots combined route registrations, not handler bodies or runtime behaviour. Its known Category status-argument drift remains deferred.

## Related Code Maps

[Station Manager](station-manager.md), [Service Catalogue](service-catalogue.md), [Service Connections](service-connections.md), [Package Station](package-station.md), [Lifecycle](lifecycle-system.md), and [Drawer System](drawer-system.md).
