# Admin Station Presentation Kits

The Admin Station presentation layer contains the browse-first Service Catalogue, an entity-neutral card wall, the compact Service Category carousel, and a Tier collection kit.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/presentation/`

## General card kit

- `category-groups/types.ts` — `CategoryGroupCardItem`: native `id`, identity copy, optional status/notifications, repeated metrics, and action descriptors.
- `category-groups/CategoryGroupCard.tsx` / `CategoryGroupCardGrid.tsx` — pure presentation and collection states.
- `StationMetricBlock.tsx` and `StationSplitAction.tsx` — repeated metric/action primitives.
- `StationStatusPill.tsx` — disclosure-state adapter over the shared `drawer-kit/ui/ModuleStatusPill` and `ModuleNotificationPanel`; it defines no status mapping or note renderer.

Adapters project Package Family, Service, and Tier records into the same card contract. Cards fetch nothing and dispatch `{ native recordId, actionId }`.

## Compact Category carousel

`presentation/service-categories/ServiceCategoryCarousel.tsx` renders Category Overview status/notes and assigned-Service count. Its View button dispatches the native numeric Category id. The `service-categories` surface binding resolves that action to the registered Category drawer and retains its own `refetch` for targeted mutation refresh.

## Service Catalogue

`presentation/service-catalogue/ServiceCatalogue.tsx` is the Service-specific template kit used on Home. It renders four operational metrics, client-side search/status/direct-Category/Package-Family filters, creation-time/name sorting, the current-Service table, shared status pills, pagination, and native numeric View intents. Family options use native string Package Family IDs, and each row renders all related Family names as neutral labels rather than lifecycle pills. `types.ts` is its presentation contract.

`stations/serviceSurface/useServiceCatalogue.ts` reads current Services plus archived Services for the overview count, joins `stations/packageFamily/usePackageFamilyRelationships.ts`, and retains the collection through drawer-triggered refresh. `serviceCatalogueAdapter.ts` projects direct Service Categories plus multi-value Package Families without redefining status. Service Category Group taxonomy parents do not enter this flow. Archived Service records never render as Home rows or pills; their registered travel surfaces retain that responsibility.

## Sources and identity

| Registered surface | Source | Native identity | Drawer |
| --- | --- | --- | --- |
| Package Families | `stations/packageFamily/usePackageFamilyCards.ts` | string `group_id` | `package-family` |
| Service Categories | `stations/serviceCategory/useServiceCategoryCards.ts` | numeric Category id | `category` |
| Service Catalogue | `stations/serviceSurface/useServiceCatalogue.ts` | numeric Service id | `service` |
| Service cards | `stations/serviceSurface/useServiceCards.ts` | numeric Service id | `service` |
| Package Tiers | `stations/tierSurface/usePackageTierCollection.ts` | string `occupant_id` | `tier` |

No adapter parses or converts identity. Package Family and Category status/notes come from the shared `evaluateModule` definitions. Tier cards use the same tier note generator as the drawer. Tier collection conditions may filter by Service or Package Family through Package relationship/Rate Sheet provenance; `slotId` and parent Service remain context only. An enabled empty collection renders `No tiers configured` plus `Create first tier`, which dispatches into existing Tier authority rather than mutating in presentation.

## Binding and refresh

`presentation/templateKits.tsx` registers presentation kits, including `TierCollectionKit`. `stations/dataSources.ts` registers reads. `stations/surfaceBindings.ts` pairs source, kit, actions, drawer, conditions, and order; Package capability definitions generate ordinary rows there. `StationPresentationShell.tsx` remains the one ordered loop. `StationSurfaceHost` forwards native identity/context and that wall’s refresh handle. `useRetainedCollection` keeps records visible during reload.

## Layout and style

The card grid is three across and becomes one across at the existing 767px shell breakpoint. The Category carousel is horizontal and shows six cards at desktop width. The Service Catalogue uses the same station breakpoints for its summary and responsive table. Styles live in `admin-station/styles/admin-station.css`; shared pill/panel component styling lives in `resources/css/modules/drawer-kit.css`.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.

## Related Code Maps

[Admin Station Drawer](admin-station-drawer.md), [Surface Binding](admin-station-surface-binding.md), [Styles](admin-station-styles.md).
