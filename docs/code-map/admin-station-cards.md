# Admin Station Presentation Tools

Admin Station owns the reusable presentation tools rendered inside its host: the generic card-wall kit, status disclosure, metrics, split actions, and section shell. Service Station and Package Station own their domain-specific sources and kits and may consume these Admin capabilities.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/presentation/`

## Admin-owned capabilities

- `category-groups/types.ts` defines `CategoryGroupCardItem` with native identity, display copy, optional status/notifications, metrics, and action descriptors.
- `CategoryGroupCard.tsx` and `CategoryGroupCardGrid.tsx` are pure presentation and collection-state components.
- `CategoryGroupCardsKit.tsx` adapts Station Manager's generic template-kit contract to that grid. It is registered as `category-group-cards` and is load-bearing for the Package Families wall.
- `StationStatusPill.tsx` adapts shared module status/notification UI without defining domain status rules. `StationMetricBlock.tsx` and `StationSplitAction.tsx` provide repeated presentation patterns.
- `StationPresentationShell.tsx` renders the ordered presentation bindings for one station and delegates each live surface to Station Manager.

These components fetch and save nothing. Kits receive `{ items, loading, error, onIntent }` and emit native record ids plus action ids.

## Current live presentations

| Wall | Owning source / kit | Identity |
| --- | --- | --- |
| Package Families on Services | Package source + Admin `category-group-cards` kit | string `group_id` |
| Service Catalogue on Services | Service source + Service `service-catalogue` kit | numeric Service id |
| Tier Workspace on Packages | Package source + Package `tier-workspace` kit | string `occupant_id` for drawer actions |

Service cards and standalone Service Tier cards are registered but unbound. Promotions therefore has no presentation wall and renders the shell's neutral empty state.

## Peer presentation

`service-station/presentation/ServiceCatalogue.tsx` owns the searchable, filterable, paginated Service table and its Service projection. It consumes Admin status and icon capabilities but retains Service semantics.

`package-station/presentation/package-tier-workspace/` owns the Tier Workspace. Its source joins Package Families, host Service context, and Package Station data; Family selection is transient view state, the summary is read-only, and Tier actions preserve `occupant_id`. Package grouping, pricing, and drawer behavior remain Package-owned.

Package Family, Service, Category, and Tier adapters preserve their native ids; no presentation adapter substitutes a display key or converts identity. `station-manager/useRetainedCollection.ts` keeps the last successful collection visible during wall refetches. A drawer save invokes only the refetch handle supplied by the opening wall.

## Styling

Admin presentation styles live in `admin-station/styles/admin-station.css` and its responsive companion. Shared drawer-kit component styles live in `resources/css/modules/drawer-kit.css`.

## Related Code Maps

[Station Manager](station-manager.md), [Admin Station](admin-station.md), [Surface Binding](admin-station-surface-binding.md), [Drawer](admin-station-drawer.md), [Service Catalogue](service-catalogue.md), and [Tiers](tiers.md).
