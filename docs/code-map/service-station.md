# Service Station

## Purpose and authority

Service Station is the Service peer. It owns `cz_service` posts, direct `cz_service_category` relationships, Service meta and drafts, inclusion/FAQ pools, lifecycle, validation, endpoints, client state, catalogue presentation, and drawer editing. The consolidation changes code placement and registration, not routes, payloads, permissions, storage, or runtime behavior.

Cost Builder separately owns `cz_service_pricing`. Package Station owns Package relationships, Package Families, Rate Sheets, and Tiers. A Service-shaped or Service-nested URL does not transfer authority.

## Frontend peer

[resources/ts/service-station/](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/CLAUDE.md) is the public frontend boundary:

- `types.ts` and `api.ts` own Service contracts and endpoint calls.
- [useServiceStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/useServiceStation.ts) owns detail state, draft-preferred reads, mutations, and lifecycle actions; [derive.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/derive.ts) holds pure projections. `createService()` seeds `adminDetail` synchronously from the create response — every module save patches `adminDetail` via `prev ? patch(prev) : prev`, a no-op while `prev` is null, so the seed closes the create-hand-off window instead of leaving the first post-creation save racing the follow-up detail fetch.
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

## Disable/Enable mask

Save stores module work; Publish (`/status` with `platform_status=active`, after settling) activates or settles it. Disable/Enable are a separate, distinct request shape — `/status` with `action: disable|enable` — that never settles a draft or writes `module_status`; they only mask/unmask the Service's platform-visible presentation. `ServiceController::updateDisabledMask` reuses `previous_platform_status` as the mask signal: while `platform_status` is `disabled`, a non-empty `previous_platform_status` means Disable was explicitly applied and captured what to restore; empty means the Service is `disabled` only because it has never been published. Enable restores exactly the captured value and clears the mask — it never manufactures `active`. Frontend: `useServiceStation`'s `resolveOverviewStatus`/`resolveInclusionsStatus`/`resolveFaqsStatus` and the shared `evaluateModule` notification engine (`drawer-kit/utils/moduleNotifications/shared.ts`) accept an opt-in `disabled` fact that renders every module pill as Disabled — including not-configured ones — ahead of any other state, mirroring `PackageManagerItem.disabled`'s explicit-fact pattern. Other stations never set this flag and are unaffected.

## Contract baseline

[service-route-baseline.php](../../wp-content/plugins/compuzign-platform/tests/service-route-baseline.php) snapshots 57 combined route contracts after including `PackageFamiliesController`. It covers paths, methods, permission callbacks, and arguments, not handler bodies, responses, PHP integration, or browser behavior.

## Related Code Maps

[Station Manager](station-manager.md), [Service Catalogue](service-catalogue.md), [Service Connections](service-connections.md), [Package Station](package-station.md), [Lifecycle](lifecycle-system.md), and [Drawer System](drawer-system.md).
