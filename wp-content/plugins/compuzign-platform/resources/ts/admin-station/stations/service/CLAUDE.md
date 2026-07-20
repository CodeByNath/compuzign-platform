# Service Frontend Boundary

Global policy is defined by [AGENTS.md](../../../../../../../../AGENTS.md).

## Ownership and entry points

This folder owns Service TypeScript contracts, endpoint implementations, station state, and pure derivations. External consumers import only `index.ts`.

- `types.ts` — zero-import Service contracts; keep it cycle-safe. Catalogue summaries carry direct Service Categories only; Package Family relationships join at the `serviceSurface` read adapter.
- `api.ts` — the single implementation of Service-owned endpoint calls.
- `useServiceStation.ts` — detail fetch, draft-preferred state, mutations, and lifecycle actions.
- `derive.ts` — stateless module status, publish gate, Package summary, and modal projections.

## Boundaries

This folder owns no UI. Host-neutral Service composition lives in `resources/ts/entity-drawers/service/`; generic presentation lives in `resources/ts/drawer-kit/`; the Admin Station surface adapter lives in `stations/serviceSurface/`.

Modules inside this station's dependency graph import sibling `types.ts` directly, not the barrel. Presentation must not call `api.ts`. Route ownership—not a Service-shaped name or URL—decides whether an endpoint belongs here. Shared pool contracts remain in `api/types/pools.ts`.

Read [Service Station](../../../../../../../../docs/code-map/service-station.md) and [Service Catalogue](../../../../../../../../docs/code-map/service-catalogue.md).

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
