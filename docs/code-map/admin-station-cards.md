# Admin Station Cards

The Admin Station presentation layer contains one entity-neutral card wall kit plus the compact Service Category carousel.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/presentation/`

## General card kit

- `category-groups/types.ts` — `CategoryGroupCardItem`: native `id`, identity copy, optional status/notifications, repeated metrics, and action descriptors.
- `category-groups/CategoryGroupCard.tsx` / `CategoryGroupCardGrid.tsx` — pure presentation and collection states.
- `StationMetricBlock.tsx` and `StationSplitAction.tsx` — repeated metric/action primitives.
- `StationStatusPill.tsx` — disclosure-state adapter over the shared `drawer-kit/ui/ModuleStatusPill` and `ModuleNotificationPanel`; it defines no status mapping or note renderer.

Adapters project Package Family, Service, and Tier records into the same card contract. Cards fetch nothing and dispatch `{ native recordId, actionId }`.

## Compact Category carousel

`presentation/service-categories/ServiceCategoryCarousel.tsx` renders Category Overview status/notes and assigned-Service count. Its View button dispatches the native numeric Category id. The `service-categories` surface binding resolves that action to the registered Category drawer and retains its own `refetch` for targeted mutation refresh.

## Sources and identity

| Wall | Source | Native identity | Drawer |
| --- | --- | --- | --- |
| Package Families | `stations/packageFamily/usePackageFamilyCards.ts` | string `group_id` | `package-family` |
| Service Categories | `stations/serviceCategory/useServiceCategoryCards.ts` | numeric Category id | `category` |
| Services | `stations/serviceSurface/useServiceCards.ts` | numeric Service id | `service` |
| Package Tiers | `stations/tierSurface/useServiceTierCards.ts` | string `occupant_id` | `tier` |

No adapter parses or converts identity. Package Family and Category status/notes come from the shared `evaluateModule` definitions. Tier cards use the same tier note generator as the drawer.

## Binding and refresh

`presentation/templateKits.tsx` registers the card grid and carousel. `stations/dataSources.ts` registers reads. `stations/surfaceBindings.ts` pairs source, kit, actions, and drawer key declaratively. `StationSurfaceHost` forwards the record id unchanged and passes that wall’s refresh handle to the drawer controller. `useRetainedCollection` keeps cards visible during a wall reload.

## Layout and style

The card grid is three across and becomes one across at the existing 767px shell breakpoint. The Category carousel is horizontal and shows six cards at desktop width. Styles live in `admin-station/styles/admin-station.css`; shared pill/panel component styling lives in `resources/css/modules/drawer-kit.css`.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Admin Station Drawer](admin-station-drawer.md), [Surface Binding](admin-station-surface-binding.md), [Styles](admin-station-styles.md).
