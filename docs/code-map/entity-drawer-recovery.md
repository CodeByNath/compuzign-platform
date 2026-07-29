# Entity Drawer Compositions

## Architecture

Package Family, Service, Tier, and Category drawers are host-neutral domain compositions. Registration and hosting do not transfer their data or mutation authority.

```text
registered Station drawer adapter
              ↓
Station Manager contract resolution
              ↓
Admin Station generic drawer shell
              ↓
EntityDrawerHostBridge
              ↓
owning composition → owning hook/API/REST boundary
```

[StationSurfaceHost.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/station-manager/StationSurfaceHost.tsx) dispatches the opening record identity and registered drawer key. [AdminStationDrawer.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/admin-station/shell/drawer/AdminStationDrawer.tsx) resolves and mounts the owner adapter. `EntityDrawerHostBridge` carries only close, footer, close guard, and optional mutation-complete callbacks.

## Shared rendering layer

[drawer-kit/](../../wp-content/plugins/compuzign-platform/resources/ts/drawer-kit/EntityDrawer.tsx) provides schema placements, Overview/Connections tabs, module notifications, inline editing, action footers, and lifecycle-footer presentation. Related-record shells with `view` remain View-only in Connections; an owning relationship shell without `view` uses its declared actions. The kit contains no entity persistence. Controllers coordinate state/actions without JSX; presentation calls no endpoints.

## Owned compositions

- [package-station/drawer/package-family/](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/package-family/PackageFamilyDrawerContent.tsx) owns Package Family overview, connected-record and capability relationships, lifecycle, dialogs, and close guards. Its recovered create composition saves the Family before offering optional Tier capability. Package-owned Family and capability hooks are its write boundaries.
- [package-station/drawer/tier/](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/drawer/tier/TierDrawerContent.tsx) owns Tier overview/features/FAQs, Service connections, occupant-bin flows, lifecycle, dialogs, and footer. [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/package-station/usePackageStation.ts) is its write boundary.
- [service-station/drawer/](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/drawer/ServiceDrawerContent.tsx) owns Service overview/features/FAQs, pricing connections, lifecycle, and guarded exit flows. [useServiceStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/service-station/useServiceStation.ts) is its write boundary and also absorbs the `'new'` pending state (Overview-only, `createService()` as the sole authoritative creation) without a fabricated ServiceItem.
- `entity-drawers/category/` and `entity-drawers/schema/` retain Category composition and schema. [useCategoryStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCategoryStation.ts) remains its write boundary and also absorbs the `'new'` pending state (`createCategory(groupId)` as the sole authoritative creation) without a fabricated CategoryStationItem.
- [drawerChrome.ts](../../wp-content/plugins/compuzign-platform/resources/ts/entity-drawers/shared/drawerChrome.ts) contains shared guarded-close, lifecycle-runner, auto-dismiss, and outside-click helpers.

Schema and editor ownership follows the entity: Package under `package-station/drawer/`, Service under `service-station/drawer/`, and Category under `entity-drawers/`.

## Identity and bundle boundary

Package Family uses `group_id` (string), Tier uses `occupant_id` (string), and Category/Service use numeric IDs. The Manager and host pass identities unchanged; adapters reject incompatible shapes. Admin Station remains the single JS host entry and enqueues shared drawer styling.

## Validation

Run `node scripts/module-state-snapshot.mjs`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check` from the plugin root.

## Related Code Maps

[Drawer System](drawer-system.md), [Admin Station Drawer](admin-station-drawer.md), [Package Station](package-station.md), [Service Station](service-station.md), and [Lifecycle](lifecycle-system.md).
