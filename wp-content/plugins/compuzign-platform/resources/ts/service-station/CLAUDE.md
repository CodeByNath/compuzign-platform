# Service Station — Frontend Peer

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

`resources/ts/service-station/` is the top-level Service peer's data boundary: it owns Service TypeScript contracts, endpoint implementations, station state, and pure derivations. It is not part of the Admin Station host — the Admin Station discovers and renders the Service surfaces through registries, and other peers consume Service only through `index.ts`.

- `types.ts` — zero-import Service contracts; keep it cycle-safe. Catalogue summaries carry direct Service Categories only.
- `api.ts` — the single implementation of Service-owned endpoint calls.
- `useServiceStation.ts` — detail fetch, draft-preferred state, mutations, and lifecycle actions.
- `derive.ts` — stateless module status, publish gate, Package summary, and modal projections.

## Boundaries

External consumers import only `index.ts`; sibling files import `./types` / `./api` directly, never the barrel. Presentation must not call `api.ts`. Route ownership — not a Service-shaped name or URL — decides whether an endpoint belongs here. Shared pool contracts remain in `api/types/pools.ts`.

Service presentation, surface adapters, and the Service drawer are being consolidated into this peer in later phases; until then some live under `resources/ts/admin-station/` and `resources/ts/entity-drawers/service/`.

Read [Service Station](../../../../../../docs/code-map/service-station.md) and [Service Catalogue](../../../../../../docs/code-map/service-catalogue.md).

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
