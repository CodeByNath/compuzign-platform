# Admin Station Surface Binding

Surface binding is the Station Manager coordination seam that maps a station placement to a registered read source, template kit, drawer contract, and action intents. Admin Station authors the display policy; domain Stations own and register the capabilities named by that policy.

Roots: `wp-content/plugins/compuzign-platform/resources/ts/station-manager/` and `resources/ts/admin-station/register.ts`.

## Registration and policy

`station-manager/registry/surfaceBindings.ts` accepts binding rows, rejects duplicate `stationId::surfaceId::placement` keys, preserves registration order as the stable tie-breaker, and builds order-sorted placement indexes at finalization. It also stores the one default-home station id.

`admin-station/register.ts::registerPresentationPolicy()` declares the current rows:

| Station / surface | Order | Source | Kit | Drawer |
| --- | ---: | --- | --- | --- |
| `services/package-families` | 0 | `package-families` | `category-group-cards` | `package-family` |
| `services/service-lower-deck` | 1 | `service-catalogue` | `service-lower-deck` | `service` |
| `packages/tier-tool` | 0 | `package-tier-workspace` | `tier-workspace` | `tier` |

All use `placement: 'presentation'` and `conditions.scope: 'current'`. The policy also sets `services` as the default home. These are string-key references: Admin does not import peer data or business implementations into its policy function.

Service Categories, Service cards, and standalone Service Tier cards have registered sources, and the Category carousel is a registered kit, but none is currently bound to a presentation wall.

`service-lower-deck` is a Service-owned kit that composes lanes rather than a list: it reads the same `service-catalogue` source and opens the same `service` drawer, and renders the existing Service Catalogue inside its `Details` lane. Composition inside one kit is not a second binding; Connections and Settings hold declared empty states with no source, kit, or drawer of their own.

## Finalization and rendering

`station-manager/registry/boot.ts` locks every registry before mount. It verifies that each binding resolves to a registered data source and template kit; unresolved keys fail boot. Drawer resolvability intentionally retains the existing null behavior and is not asserted at finalize.

At runtime:

```text
active station + presentation placement
  → resolveSurfaceBindings() in declared order
  → Admin-owned StationPresentationShell
  → StationSurfaceHost resolves the source hook and kit
  → kit emits { native recordId, actionId }
  → binding resolves the drawer intent
  → Admin drawer shell hosts the owning Station's contract
```

`StationSurfaceHost` mounts with a key containing the data-source key so the selected hook stays stable for that mount. It passes record identity through without parsing or coercion. Its dispatch carries that wall's `refetch` handle; a successful save therefore refreshes only the originating wall.

## Invariants

- Station Manager owns registration, ordering, lookup, finalization, and runtime composition—not UI or domain behavior.
- Admin owns section chrome and display policy, not the capabilities named by peer keys.
- A bound source and kit must exist before finalization. The Admin-owned `category-group-cards` kit is load-bearing for the Package Families wall.
- Registered but unbound capabilities remain available without appearing on a wall.
- Adding or reordering a wall changes policy and real registrations, never an entity branch in the shell.

## Related Code Maps

[Station Manager](station-manager.md), [Admin Station](admin-station.md), [Navigation](admin-station-navigation.md), [Cards](admin-station-cards.md), and [Drawer](admin-station-drawer.md).
