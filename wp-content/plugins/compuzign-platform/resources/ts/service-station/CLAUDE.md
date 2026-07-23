# Service Station — Frontend Peer

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

`resources/ts/service-station/` is the top-level Service peer's data, surface, presentation, and drawer boundary: it owns Service TypeScript contracts, endpoint implementations, station state, pure derivations, surface adapters, the catalogue kit, and Service drawer composition. It is not part of the Admin Station host — Service registers its capabilities with Station Manager, the Admin Station thin host renders the resolved presentation, and other peers consume Service only through `index.ts`.

- `types.ts` — zero-import Service contracts; keep it cycle-safe. Catalogue summaries carry direct Service Categories only.
- `api.ts` — the single implementation of Service-owned endpoint calls.
- `useServiceStation.ts` — detail fetch, draft-preferred state, mutations, and lifecycle actions.
- `derive.ts` — stateless module status, publish gate, Package summary, and modal projections.
- `register.ts` — registers Service navigation, destination, sources, catalogue kit, and drawer with Station Manager. It is imported only by `resources/ts/modules/admin-station.ts` and is never re-exported from `index.ts`.

## Boundaries

External consumers import only `index.ts`; sibling files import `./types` / `./api` directly, never the barrel. Presentation must not call `api.ts`. Route ownership — not a Service-shaped name or URL — decides whether an endpoint belongs here. Shared pool contracts remain in `api/types/pools.ts`.

Host-engine contracts and helpers come from `@/station-manager`. Imports from `@/admin-station/presentation/` and `@/admin-station/shell/icons` are legal consumption of Admin Station presentation/control capabilities, not transitional coupling. `register.ts` remains an entry-only module and must not enter the public barrel.

This peer owns Service data (`.`), surface adapters (`surface/`), the catalogue presentation kit (`presentation/`), and the Service drawer, editors, and schema (`drawer/`). `serviceConnectionBinding` lives in `drawer/schema/bindings/service.tsx` and is exported through the public barrel; `serviceDrawerShared.ts` no longer exists. Service consumes the shared `resources/ts/entity-drawers/shared/drawerChrome.ts` chrome and module-notification framework in `resources/ts/drawer-kit/` without transferring Service authority to those shared renderer contracts.

Read [Service Station](../../../../../../docs/code-map/service-station.md) and [Service Catalogue](../../../../../../docs/code-map/service-catalogue.md).

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
