# Service Station

## Purpose and authority

Service Station is the Service peer. It owns `cz_service` posts, direct `cz_service_category` relationships, Service meta and drafts, inclusion/FAQ pools, lifecycle, validation, endpoints, client state, catalogue presentation, and drawer editing. The consolidation changes code placement and registration, not routes, payloads, permissions, storage, or runtime behavior.

Cost Builder separately owns `cz_service_pricing`. Package Station owns Package relationships, Package Families, Rate Sheets, and Tiers. A Service-shaped or Service-nested URL does not transfer authority.

## Frontend peer

[resources/ts/service-station/](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/CLAUDE.md) is the public frontend boundary:

- `types.ts` and `api.ts` own Service contracts and endpoint calls.
- [useServiceStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/useServiceStation.ts) owns detail state, draft-preferred reads, mutations, and lifecycle actions; [derive.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/derive.ts) holds pure projections. A complete pending Overview Save creates a persisted Pending Service record with its Overview draft and synchronously seeds authoritative detail; the controller then swaps to the returned ID without a loading reset. Storage records the fixed enum value `platform_status: 'disabled'` with no disable mask (`previous_platform_status: ''`) and `module_status.overview: 'pending'`; the UI renders that combination as full-opacity Pending, not Disabled. Inclusions and FAQs save against that ID, while Publish later settles pending modules and activates the existing record. Ordinary existing-record opens still fetch detail, and the one-shot handoff marker never suppresses that path.
- `surface/` owns catalogue/card adapters and the registered Service drawer adapter; `presentation/` owns the Service Catalogue kit.
- `drawer/` owns the Service composition, controller hooks, schema, bindings, and editors.
- [register.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/register.ts) registers Service navigation, destination, data sources, catalogue kit, and drawer with Station Manager. It is imported only by the admin-station bundle entry and is not public-barrel API.

Station Manager supplies host-engine contracts and resolution only. Admin Station authors placement policy and hosts the resolved presentation/drawer. Service imports of Admin-owned icons and presentation primitives are legal capability consumption, not transferred ownership. Other peers consume Service through [index.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/index.ts).

## Backend

[src/Modules/Service/](../../wp-content/plugins/compuzign-platform/src/Modules/Service/CLAUDE.md) is the backend owner:

- `ServiceModule.php` wires the module.
- [ServiceController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Http/ServiceController.php) owns 14 Service catalogue, detail, module, lifecycle, and pool routes.
- [ServiceSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Support/ServiceSchema.php) owns Service keys, module vocabulary, sanitization, and REST arguments.
- [ServicePools.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Support/ServicePools.php) is the public pool-write boundary used by Service and Package Tier saves.

WordPress post/meta access stays cohesive here; there is no pass-through repository. Core post-type/taxonomy registrars declare entities but do not own behavior.

## Module and lifecycle states

An empty or incomplete Overview is Pending dim with field guidance. Before Overview Save, child modules stay Pending dim, show Save-Overview guidance, and keep Edit locked because no Service ID exists. A complete Overview Save creates the record and shows Pending full with `Waiting for Service publication`; empty children then become editable Pending dim with their add-content prompt. A complete child save is Pending full with the same publication note. Publish settles every saved module draft, then activates the Service: settled configured modules become Active, while an empty/unconfigured child remains Pending dim.

Disable/Enable use `/status` with `action: disable|enable`; they never settle, activate, or rewrite module status. `previous_platform_status` is the explicit Disable mask: while stored `platform_status` is `disabled`, a non-empty value means Disabled; empty means unmasked Pending. Disable makes all module pills Disabled. Enable clears the mask and returns configured modules to visual Pending full, while empty children remain Pending dim; it creates no new drafts. Archive/Trash Restore is outside the drawer and follows the same unmasked Pending re-entry, preserving module status and drafts/data. Publish is the only activation action.

## Contract baseline

[service-route-baseline.php](../../wp-content/plugins/compuzign-platform/tests/service-route-baseline.php) snapshots 57 combined route contracts after including `PackageFamiliesController`. It covers paths, methods, permission callbacks, and arguments, not handler bodies, responses, PHP integration, or browser behavior.

## Related Code Maps

[Station Manager](station-manager.md), [Service Catalogue](service-catalogue.md), [Service Connections](service-connections.md), [Package Station](package-station.md), [Lifecycle](lifecycle-system.md), and [Drawer System](drawer-system.md).
