# Service Station — Frontend Peer

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

Service is a current conformance implementation of the locked [Station and
Drawer Lifecycle Contract](../../../../../../docs/architecture/StationDrawerLifecycleContract-v1.md).
Preserve its Overview-Save → returned-ID mounted handoff, child lock before a
real ID, pending-dim/full notification states, explicit Disable mask, and
Publish-as-settle/activate boundary when editing this peer.

## Ownership and entry points

`resources/ts/service-station/` is the top-level Service peer's data, surface, presentation, and drawer boundary: it owns Service TypeScript contracts, endpoint implementations, station state, pure derivations, surface adapters, the catalogue kit, and Service drawer composition. It is not part of the Admin Station host — Service registers its capabilities with Station Manager, the Admin Station thin host renders the resolved presentation, and other peers consume Service only through `index.ts`.

- `types.ts` — zero-import Service contracts; keep it cycle-safe. Catalogue summaries carry direct Service Categories only.
- `api.ts` — the single implementation of Service-owned endpoint calls.
- `useServiceStation.ts` — detail fetch, draft-preferred state, mutations, and lifecycle actions. Accepts `service: ServiceItem | null`; `null` (the Settings launcher's `'new'` sentinel) is represented by its own local pending Overview draft, never a fabricated ServiceItem — only Overview is editable until its complete Save creates a persisted Pending Service record with its Overview draft and final-seeds detail before the controller swaps to the returned identity; the unmasked `disabled` storage enum plus `overview: pending` renders as Pending, while explicit Disable is the separate masked action. Publish later settles and activates that real record.
- `surface/serviceHomeConnections.ts` — the Connections lane's own data hook and row projection, reading the same authoritative Category list source the Admin-owned category carousel reads. No second Category endpoint, no derived counts.
- `derive.ts` — stateless module status, publish gate, Package summary, and modal projections.
- `presentation/ServiceLowerDeck.tsx` — the bound presentation kit for Service Home: composition only. It selects a lane and hands `ServiceCatalogue.tsx` the template-kit props unchanged, so the catalogue keeps its own hooks, filters, table, pagination, and drawer intent. `Connections` (`presentation/ServiceConnectionsLane.tsx`) is a read-only projection of Categories connected to at least one Service, via `surface/serviceHomeConnections.ts`'s own authoritative-Category-list read; `Settings` (`presentation/ServiceSettingsLane.tsx`) is exactly two launchers, Create Service and Create Category, each opening its mature drawer at the `'new'` recordId sentinel. Lane semantics come from `@/admin-station/presentation/StationTabSet`; no `cz-tier-*` class and no Package presentation module may appear here.
- `register.ts` — registers Service navigation, destination, sources, the lower-deck kit, and drawer with Station Manager. It is imported only by `resources/ts/modules/admin-station.ts` and is never re-exported from `index.ts`.

## Boundaries

External consumers import only `index.ts`; sibling files import `./types` / `./api` directly, never the barrel. Presentation must not call `api.ts`. Route ownership — not a Service-shaped name or URL — decides whether an endpoint belongs here. Shared pool contracts remain in `api/types/pools.ts`.

Host-engine contracts and helpers come from `@/station-manager`. Imports from `@/admin-station/presentation/` and `@/admin-station/shell/icons` are legal consumption of Admin Station presentation/control capabilities, not transitional coupling. `register.ts` remains an entry-only module and must not enter the public barrel.

This peer owns Service data (`.`), surface adapters (`surface/`), the lower deck and catalogue presentation kit (`presentation/`), and the Service drawer, editors, and schema (`drawer/`). `serviceConnectionBinding` lives in `drawer/schema/bindings/service.tsx` and is exported through the public barrel; `serviceDrawerShared.ts` no longer exists. Service consumes the shared `resources/ts/entity-drawers/shared/drawerChrome.ts` chrome and module-notification framework in `resources/ts/drawer-kit/` without transferring Service authority to those shared renderer contracts.

Read [Service Station](../../../../../../docs/code-map/service-station.md) and [Service Catalogue](../../../../../../docs/code-map/service-catalogue.md).

## Validation

From the plugin root: `npm run contract:station-tabset`, `npm run contract:service-home-connections`, `npm run regression:service-create`, `npm run regression:category-create`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
